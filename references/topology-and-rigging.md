# 全类型拓扑、骨骼层级与动作参考

设计任何生物时，先匹配下表中的基础拓扑（可组合），再按真实解剖增减附属骨骼。工程图内骨链统一使用英文 `snake_case` 标注，展示面板使用中文标签。

本文件中的骨骼、关节与动作内容只用于工程展示图的表达，不生成绑定文件、动画数据或可导入模型。

## 1. 双足人形（人类 / 精灵 / 恶魔 / 战士 / 人形机甲 / 人形克苏鲁）

- **标准骨骼树**：
  `root` -> `pelvis` -> [`spine` -> `chest` -> (`neck` -> `head` -> `jaw/horns/hair`, `left_shoulder` -> `left_upper_arm` -> `left_lower_arm` -> `left_hand`, `right_shoulder` -> ...), `left_thigh` -> `left_shin` -> `left_foot`, `right_thigh` -> `right_shin` -> `right_foot`]
- **核心枢轴与旋转轴**：
  - `pelvis`：质心升降与整体朝向（Y 轴上下、XYZ 旋转）。
  - `spine` / `chest`：前倾/后仰（X ±35°）、左右扭转（Y ±40°）、侧倾（Z ±20°）。
  - `left/right_lower_arm`（肘）、`left/right_shin`（膝）：主要单轴弯曲（X 轴 0°–135°），避免反关节。
- **适配动作**：`idle` / `walk` / `run` / `jump` / `attack`（挥砍/施法）/ `hurt` / `death`。
- **碰撞与受击**：主碰撞盒覆盖全身；受击区分 `head`（暴击）、`torso`、四肢及持械判定区。

## 2. 四足兽形（麒麟 / 狮虎狼鹿 / 四足机械兽）

- **标准骨骼树**：
  `root` -> `body` -> [`chest` -> (`neck` -> `head` -> `jaw/ears/horns`, `front_left_leg` -> `front_left_lower` -> `front_left_paw`, `front_right_leg` -> ...), `pelvis` -> (`back_left_leg` -> `back_left_lower` -> `back_left_paw`, `back_right_leg` -> ..., `tail_01` -> `tail_02` -> `tail_03`)]
- **核心枢轴与运动逻辑**：
  - 区分**蹄行**（直立腕踝）、**趾行**（猫犬类高脚踝折角）与**跖行**（熊类全掌着地），后肢膝踝折叠方向不可画反。
  - `tail_01..03`：多节链式延迟摆动（X/Y 轴各 ±25°–45°）。
- **适配动作**：`idle` / `walk`（对角步态）/ `run`（飞奔腾空）/ `jump` / `pounce_attack` / `hurt` / `death`。

## 3. 多节长条 / 蛇形（东方龙 / 海蛇 / 巨虫 / 蠕虫）

- **标准骨骼树**：
  `root` -> `head` -> (`jaw`, `whiskers/antennas`), `spine_01` -> `spine_02` -> ... -> `spine_0n` -> `tail_tip`；若为东方龙，在 `spine_02` 与 `spine_05` 左右挂接四肢骨骼链。
- **核心枢轴与运动逻辑**：
  - 每段 `spine_0i` 的枢轴置于该段前端与上一段的衔接处，靠相邻节 15°–30° 相位差形成 S 形或波浪游动。
- **适配动作**：`idle`（盘踞/浮游）/ `slither`（游动）/ `coil_charge` / `dash_attack` / `roar` / `hurt` / `death`。

## 4. 翼展 / 飞禽 / 西方巨龙

- **在双足或四足骨架的 `chest` 上增挂翼骨链**：
  `left_wing_root` -> `left_wing_inner` -> `left_wing_outer` -> `left_wing_tip`（对应翼膜或初级飞羽分区）。
- **核心枢轴与运动逻辑**：
  - `wing_root` 负责上下扑翼（Z 轴 -55°~+65°）与前后扫掠（Y 轴）。
  - `wing_outer` 负责折叠收翼，着陆态翼尖收拢不穿地。
- **适配动作**：`idle`（收翼/半展）/ `walk` / `takeoff` / `fly` / `dive_attack` / `hurt` / `death`。

## 5. 辐射 / 多肢 / 克苏鲁与虫族

- **主干骨骼树**：
  `root` -> `mantle/core_body` -> [`head_complex` -> (`eyes_cluster`, `mandibles/beak`), `tentacle_01_a` -> `tentacle_01_b` -> `tentacle_01_c`, ..., `limb_01_coxa` -> `limb_01_femur` -> `limb_01_tibia` ...]
- **核心枢轴与运动逻辑**：
  - 触手至少 3 段（基段控制朝向、中段控制卷曲、末段控制鞭梢延迟），不对称物种允许左右触手数量和长度不同。
  - 节肢步足使用三段式（基节 `coxa` 水平转、股节 `femur` 抬升、胫节 `tibia` 落地），交替三角步态。
- **适配动作**：`idle`（浮空/蠕动）/ `crawl` / `swim` / `tentacle_lash` / `psychic_cast` / `hurt` / `death`。

## 6. 模块化机械 / 能量浮游体

- **主干骨骼树**：
  `root` -> `chassis` -> [`core_reactor`（可独立自转）, `head_sensor`, `turret_mount`, `thruster_left`, `thruster_right`, `floating_shield_01..0n`（独立悬停位移枢轴）]
- **核心枢轴与运动逻辑**：
  - 机械关节明确区分**单轴铰链**（只转 X 或 Z）、**柱塞伸缩**（沿局部轴平移 `position`）与**浮游悬停**（无实体连杆但保留父子跟随偏移）。
- **适配动作**：`idle`（核心脉动/浮游）/ `hover_move` / `boost` / `transform` / `beam_attack` / `overload_hurt` / `shutdown`。

## 7. 动作清单生成规则

动作清单按拓扑生成，不套用固定动作数量。

- 每个拓扑先给 3–5 个基础动作，再加入 2–4 个物种专属动作。
- 每个动作分配唯一编号：`A01`、`A02`、`A03`……
- 用户指定动作数量时，清单数量必须与要求一致，不得静默删减。
- 复杂动作（攻击、变形、觉醒）需要多阶段关键帧，可独占更大版面。
- 不适用动作标记为“不适用”，不要用相似动作凑数。

示例：

| 拓扑 | 基础动作 | 专属动作 |
| --- | --- | --- |
| 蛇形 / 烛龙 | 休眠、苏醒、游动、盘绕 | 睁眼为昼、闭目为夜、吐息、神性显现 |
| 双足人形 | 待机、行走、奔跑、攻击 | 施法、格挡、受击硬直、处决 |
| 四足兽形 | 待机、行走、奔跑、扑击 | 咆哮、甩尾、践踏 |
| 翼展 / 飞禽 | 待机、起飞、飞行、俯冲 | 收翼、滑翔、翼击 |
| 触手 / 克苏鲁 | 浮动、爬行、触手摆动 | 精神冲击、缠绕、多眼凝视 |
| 机械 / 浮游 | 待机、悬浮移动、加速 | 变形、过载、护盾展开 |
