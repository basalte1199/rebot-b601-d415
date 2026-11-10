# reBot B601-DM / custom base + D415

開いていた Fusion「reBot_B601_DM_v1.1_20260425 v10」の表示形状を反映したURDFです。

## 使うファイル
- `urdf/ReBot_B601_DM_D415.urdf`：相対パス。urdfとmeshesのフォルダ構造を保って読み込みます。
- `urdf/ReBot_B601_DM_D415.ros.urdf`：ROS 2用のpackage://参照。パッケージ名はrebot_b601_description。colcon build後にsourceして使用します。
- `preview_iso.png` / `preview_side.png`：納品URDFから生成したゼロ姿勢の確認画像。
- `source/ReBot_Arm_DM.original.urdf`：比較用の公式原本。
- `validation.json`：構造・参照・関節保存・CAD座標復元・30姿勢のカメラ追従検証結果。

## 変更
根元：非表示の純正台座と長い固定ねじを除外し、表示中のBase一式と100×140×3 mmの取付板を実形状で置き換えました。
カメラ：D435_Gemini2_Mount v3の現在形状とD415_Solid v1の4ボディを追加。end_linkに固定され、手首と一緒に動きます。
アームの6回転関節、2指の直動関節、mimic、可動範囲、軸、原点、既存リンクの質量・慣性・衝突形状を保持しました（置換したbase_linkを除く）。
ROS 2 Jazzy RVizの複数material描画問題を避けるため、各リンクの追加visualを原点一致の固定子リンクに移しています。メッシュ配置・衝突形状は同じです。

## 座標
長さはm、角度はrad。STLもmなので追加scaleは不要です。
base_linkは公式URDFの座標を保持。Fusion座標からX/Y反転、Zを-3.3 mm移動しています。
mounting_plate_frameは変更後の取付板下面中心です。ロボット台車との接続の基準にできます。位置はvalidation.json参照。
camera_linkは前面中央を基準としたX前・Y左・Z上、camera_optical_frameはX右・Y下・Z前です。
カメラ光学フレームは形状に基づく公称座標です。RGB/Depth各センサーの実測・工場校正済み外部パラメータではありません。

## 適用範囲
CADは読み取りのみで、元Fusionファイルは変更していません。
変更した根元・マウント・カメラは実測質量が不明で、CAD材料も汎用の鋼のため、誤った値を入れずinertialを省略しています。表示・運動学・形状による衝突確認用です。動力学や重力補償に使う場合は追加部分の実測慣性を設定してください。
カメラ・マウント・根元のcollisionには高精細の実形状を使っています。リアルタイム計画や接触シミュレータには用途に応じた簡略化が必要です。全可動域での干渉無しを保証する検証は含みません。

## 出典
https://github.com/Seeed-Projects/reBot-DevArm
Commit b98bee1d6c55d041e08e0f2035d888ad19fff1ee
Rebot_Arm_description/DM/urdf/ReBot_Arm_DM.urdf
公式データのライセンスはLICENSE.upstreamを参照。追加形状は現在のユーザーCADから書き出しています。
