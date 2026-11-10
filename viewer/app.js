import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from 'urdf-loader';

const viewport = document.getElementById('viewport');
const status = document.getElementById('status');
const panel = document.getElementById('controls');
const fitButton = document.getElementById('fit');
const homeButton = document.getElementById('home');
const inputs = new Map();
let robot;
let failed = false;

function showError(error) {
  failed = true;
  status.classList.add('error');
  status.textContent = `読み込みエラー：${error.message || error}`;
  console.error(error);
}

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#17222d');
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.setAttribute('aria-label', 'reBot B601-DM + D415 の3Dモデル');
  viewport.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.005, 100);
  camera.up.set(0, 0, 1);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.minDistance = 0.12;
  orbit.maxDistance = 15;
  const hemisphere = new THREE.HemisphereLight(0xeaf6ff, 0x657585, 1.0);
  hemisphere.position.set(0, 0, 3);
  scene.add(hemisphere);
  for (const [position, intensity] of [[[2,-3,4],1.3],[[-2,1,2],0.6]]) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.fromArray(position);
    scene.add(light);
  }
  const grid = new THREE.GridHelper(1, 20, 0x536b7f, 0x2e4354);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = 0.0169;
  scene.add(grid);
  scene.add(new THREE.AxesHelper(0.07));

  function resize() {
    const {width, height} = viewport.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(viewport);
  resize();
  function fit() {
    if (!robot) return;
    const bounds = new THREE.Box3().setFromObject(robot);
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
    const halfFov = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    const distance = radius / Math.sin(halfFov) * 1.13;
    orbit.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(0.5, -1.8, 1.1).normalize().multiplyScalar(distance));
    orbit.update();
  }
  fitButton.addEventListener('click', fit);

  function addSlider(parent, name, label) {
    const joint = robot.joints[name];
    if (!joint || joint.mimicJoint) throw new Error(`操作対象の関節がありません: ${name}`);
    const linear = joint.jointType === 'prismatic';
    const scale = linear ? 1000 : 180 / Math.PI;
    const lower = joint.jointType === 'continuous' ? -Math.PI : joint.limit.lower;
    const upper = joint.jointType === 'continuous' ? Math.PI : joint.limit.upper;
    const row = document.createElement('div');
    row.className = 'joint';
    const top = document.createElement('div');
    top.className = 'joint-top';
    const title = document.createElement('label');
    title.htmlFor = name;
    title.textContent = label;
    const output = document.createElement('output');
    output.htmlFor = name;
    const input = document.createElement('input');
    Object.assign(input, {type:'range', id:name, min:String(Number((lower * scale).toFixed(6))), max:String(Number((upper * scale).toFixed(6))), step:'any', value:'0'});
    input.setAttribute('aria-label', label);
    function update(value) {
      input.value = String(value);
      robot.setJointValue(name, value / scale);
      const display = `${Number(value).toFixed(1)} ${linear ? 'mm' : '°'}`;
      output.textContent = display;
      input.setAttribute('aria-valuetext', display);
    }
    input.addEventListener('input', () => update(Number(input.value)));
    top.append(title, output);
    row.append(top, input);
    parent.append(row);
    inputs.set(name, {input, update});
    update(0);
  }
  function group(title, items, subtitle='') {
    const heading = document.createElement('h2');
    heading.textContent = title;
    if (subtitle) {
      const sub = document.createElement('span');
      sub.textContent = subtitle;
      heading.append(sub);
    }
    panel.append(heading);
    for (const [name,label] of items) addSlider(panel,name,label);
  }
  homeButton.addEventListener('click', () => {
    for (const {update} of inputs.values()) update(0);
  });

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    if (!failed) status.textContent = `メッシュを読み込み中… ${loaded} / ${total}`;
  };
  manager.onError = url => showError(new Error(`ファイルを取得できません: ${url}`));
  manager.onLoad = () => {
    if (failed || !robot) return;
    robot.traverse(object => {
      if (object.isMesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          material.side = THREE.DoubleSide;
          if ('roughness' in material) material.roughness = 0.65;
        }
      }
    });
    group('アーム · 6軸', [
      ['joint1','J1 · 根元の旋回'], ['joint2','J2 · 肩'],
      ['joint3','J3 · 肘'], ['joint4','J4 · 手首ピッチ'],
      ['joint5','J5 · 手首'], ['joint6','J6 · 手首ロール']
    ]);
    group('グリッパー', [['finger_left','指の開閉 · 片側移動量']]);
    fitButton.disabled = homeButton.disabled = false;
    status.textContent = `${Object.keys(robot.links).length} links · ${Object.keys(robot.joints).length} joints · 読み込み完了`;
    fit();
  };
  const loader = new URDFLoader(manager);
  loader.parseCollision = false;
  loader.load('/description/urdf/ReBot_B601_DM_D415.urdf', loaded => {
    robot = loaded;
    scene.add(robot);
  }, undefined, showError);
  renderer.setAnimationLoop(() => {
    orbit.update();
    renderer.render(scene, camera);
  });
} catch (error) {
  showError(error);
}

