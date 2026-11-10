from pathlib import Path
import json, hashlib, struct, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
def canonical(e):
    return (e.tag, sorted(e.attrib.items()), [canonical(c) for c in e])
for name, expected in json.loads((ROOT / "SHA256SUMS.json").read_text()).items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == expected, name
robot = ET.parse(ROOT / "urdf/ReBot_B601_DM_D415.urdf").getroot()
original = ET.parse(ROOT / "source/ReBot_Arm_DM.original.urdf").getroot()
links = {l.attrib["name"] for l in robot.findall("link")}
children = [j.find("child").attrib["link"] for j in robot.findall("joint")]
assert len(children) == len(set(children)) == len(links) - 1
assert links - set(children) == {"base_link"}
reachable = {"base_link"}
while True:
    added = {j.find("child").attrib["link"] for j in robot.findall("joint") if j.find("parent").attrib["link"] in reachable} - reachable
    if not added: break
    reachable |= added
assert reachable == links
for j in original.findall("joint"):
    assert canonical(j) == canonical(robot.find("joint[@name='%s']" % j.attrib['name']))
for mesh in robot.findall('.//mesh'):
    path = (ROOT / 'urdf' / mesh.attrib['filename']).resolve()
    assert path.is_relative_to(ROOT)
    data = path.read_bytes()
    assert len(data) == 84 + struct.unpack_from('<I', data, 80)[0] * 50, str(path)
ros = ET.parse(ROOT / 'urdf/ReBot_B601_DM_D415.ros.urdf').getroot()
for mesh in ros.findall('.//mesh'):
    prefix = 'package://rebot_b601_description/'
    assert mesh.attrib['filename'].startswith(prefix)
    assert (ROOT / mesh.attrib['filename'][len(prefix):]).is_file()
print('PASS: content hashes, connected URDF tree, preserved original joints, STL references, ROS paths')
