---
name: creature-engineering-designer
description: Universal 3D creature and character engineering designer covering visual concept sheets, full 7-tier engineering blueprints (turnaround, details, exploded modules, material/UV concept, bone rig, 7 poses, keyframes/hitboxes, dossier), and real Blockbench (.bbmodel) + PNG texture + animation package generation. Use for creature/character modeling blueprints, modular structure planning, or Blockbench model creation across animals, mythical beasts, humanoids, eldritch, alien, undead, elemental, mechanical, and hybrid species. Do not use for a single standalone illustration or simple bestiary card without engineering structure.
metadata:
  short-description: "Universal 3D creature engineering sheets and Blockbench models"
---

# 生物工程设计大师 (Creature Engineering Designer)

将用户的生物创意、文字设定或参考图转化为具备专业工程逻辑的设计方案，并在需要时通过脚本生成真正可导入 Blockbench 的 `.bbmodel` 模型、PNG 贴图、骨骼层级与关键帧动画包。

## 最高设计原则

1. **先定物种与拓扑，再定结构**
   支持全类型生物与幻想角色（动物/神话、人形/职业角色、克苏鲁/维度畸变、外星/虫族、亡灵/怪物、元素/能量、机械/生化及交叉融合体）。严禁套用固定模板；每次必须先识别解剖原型。
2. **只借视觉语言，不借物种结构**
   用户提供的工程参考图（无论是麒麟、机甲还是人形模板）仅用于复用版式、暗色工程底纹、暗金分区线、渲染质感与信息布局，绝不得把参考生物的角、鬃、鳞、蹄、尾或装备强加到目标生物上。
3. **跨视图几何与配色绝对一致**
   正/左/背/右/45°五视图、局部特写、爆炸拆解、动作姿态与关键帧必须属于同一套几何零件、比例关系和调色板。严禁不同视图长出不同部位，或为凑数虚构不存在的器官。
4. **真实交付边界清晰**
   - 工程图（模式 B）中的 UV 展开、贴图色板和骨骼轴向属于**建模参考示意**，不得冒充可导入模型。
   - 只有在模式 C 下通过脚本或工具生成并校验通过的 `.bbmodel`、PNG 与动画数据，才能称为真实工程文件。
   - 所有用户交付产物输出到**当前工作目录的 `./packages/<creature-slug>/`**（或用户指定路径），禁止写入 Skill 安装目录。
5. **命名与尺度诚实**
   展示图面板使用清晰中文标签；Blockbench 工程内骨骼/Group 与文件统一使用英文 `snake_case`（如 `left_upper_arm`、`tail_01`）。未知尺寸/体重标注为“参考”或省略，不伪造精确数值。

## 拓扑原型分类

设计结构前先将目标归类到以下一种或组合拓扑原型：

- **双足人形**（人类、精灵、恶魔、天使、机甲人、人形克苏鲁等）
- **四足兽形**（狮虎狼鹿、麒麟、四足机械兽等）
- **多节长条/蛇形**（东方龙、海蛇、多段虫体、蠕虫等）
- **翼展/飞禽形**（凤凰、西方巨龙、天使翼、翼手异星生物等）
- **辐射/多肢/触手形**（克苏鲁、章鱼古神、蜘蛛虫族、漂浮异形等）
- **模块化机械/能量浮游形**（悬浮核心、分体装甲、纳米集群等）

## 三种工作模式

### 模式 A：高清视觉设定图

适用：用户只需先敲定外观造型、材质配色与背景设定。
输出内容：五视图（正/左/背/右/45°）、3–5 处物种专属局部细节、材质与颜色索引、右侧角色/生物档案。

### 模式 B：完整工程构造图（默认）

适用：用户要求“工程构造图”“拆解图”“建模参考”或只提供生物名称/设定未指定模式。
输出内容：
- **默认版式**：`3:4` 或 `4:5` 纵向专业工程板（左侧 `78%–80%` 七排工程内容 + 右侧 `20%–22%` 贯通档案栏），深蓝黑或深青黑工程底纹 + 暗金细线分区。
- **防过载备选**：若生物零件极多或用户明确要求横向宽幅（`16:9` / `21:9`），可改为横向分区排版，或拆分为“视图与拆解板 + 骨骼/UV/动作/碰撞板”两张高清晰子图，避免文字糊成乱码或模块挤压。
- 完整版式规范、七排内容清单与生图母提示词见 [references/sheet-layout-and-prompts.md](references/sheet-layout-and-prompts.md)。
- 各拓扑原型的骨骼层级、关节旋转轴、活动范围、动作集与碰撞区设计见 [references/topology-and-rigging.md](references/topology-and-rigging.md)。

### 模式 C：实际 Blockbench 模型制作

适用：用户明确要求 `.bbmodel`、Blockbench 工程、可导入 3D 模型、真实纹理/骨骼/动画包。
执行流程：
1. 先阅读 [references/blockbench-spec.md](references/blockbench-spec.md) 与 [references/topology-and-rigging.md](references/topology-and-rigging.md)。
2. 编写结构化模型描述 JSON（可参考 [references/sample-creature-spec.json](references/sample-creature-spec.json)），定义：
   - 目标格式（`free` 通用或 `bedrock` 基岩版）、贴图分辨率（默认 `128×128`，轻量用 `64×64`，高精度用 `256×256`）
   - 骨骼层级（`groups` / `bones`，含枢轴 `origin` 与嵌套子级）
   - 几何体 `cubes`（1 格 = 16 像素单位，含 `from`/`to`/`origin`/`rotation`/材质区颜色与像素纹理规则）
   - 关键帧动画 `animations`（按物种选用 `idle`、`walk`、`attack`、`hurt`、`death` 或 `swim`/`fly`/`tentacle_sway` 等）
3. 运行自动打包脚本在用户工作区生成真实工程文件与自动无重叠 UV PNG 贴图：
   ```bash
   node "<skill-dir>/scripts/bbmodel_builder.mjs" --spec "<spec.json>" --out "./packages/<creature-slug>" --zip
   ```
4. 运行校验脚本验证文件可打开且无结构/UV/骨骼错误：
   ```bash
   node "<skill-dir>/scripts/validate_bbmodel.mjs" "./packages/<creature-slug>/<creature-slug>.bbmodel"
   ```
5. 向用户交付生成路径：`<creature-slug>.bbmodel`、`textures/<creature-slug>.png`、`MODEL_README.md` 及 `.zip` 工程包。

### Blockbench 导入硬约束

生成或修改任何 `.bbmodel` 时必须满足以下实测约束（详见 [references/blockbench-pitfalls.md](references/blockbench-pitfalls.md)）：

- 工程 `meta.box_uv` 与**每个 cube 自身的 `box_uv`** 都为 `false`，否则 Blockbench 会忽略逐面 UV，改按 `uv_offset` 采样。
- `bedrock` 实体格式是单贴图：全模型只引用 `texture 0`，不得追加第二张贴图。
- 动画只键**组**，绝不键方块；方块级 rotation/scale 会绕模型原点执行，直接把零件甩飞。
- 待机静息角放在 **cube** 上，组保持 0 旋转；动画关键帧会整体替换组旋转，抹掉写在组上的初始姿态。
- 同一旋转轴上的相邻链段必须错开厚度/宽度，避免共面重叠导致 z-fighting；旋转关节落在 0.5 网格，方块尺寸保持整数。
- 同时写出 4.5 内联 outliner 组与 5.0 顶层 `groups` 表；只写其中一种会让另一类读取器丢失组变换。

## 标准交互流程

1. **识别物种与拓扑**：确定物种特征、文化/生态语言与所属拓扑原型。
2. **锁定工程模式**：未说明时默认模式 B；明确要求工程文件/导入模型时进入模式 C（必要时先简要确认设计草案再生成，避免反复无效返工）。
3. **锁定九项设计锚点**：生物名称与分类、独有轮廓与比例、关键可动模块、材质配色、5 处专属细节、拆解模块清单、骨骼树与枢轴、动作名称清单、档案设定。
4. **执行与自检**：按当前模式产出设定图或 `.bbmodel` 工程包，并完成质检。若环境缺少生图能力或某项能力受限，如实告知限制，不伪造产出。

## 交付前质检

- 物种辨识度是否鲜明，未混入无关参考物种的解剖特征？
- 五视图、特写、爆炸拆解、动作之间是否保持零件、比例与配色完全一致？
- 骨骼是否全部对应真实可动部件，父子层级与枢轴位置是否符合运动力学？
- 模式 B 是否明确区分了“UV/工程示意”与“真实 `.bbmodel`”？
- 模式 C 是否通过 `validate_bbmodel.mjs` 校验（无孤立元素、无 UV 越界、动画引用骨骼全部有效）？
