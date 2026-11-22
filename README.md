# Creature Engineering Designer（生物工程设计大师）V2.2

面向 **Codex** 的全类型生物与角色**视觉设计 Skill**：输出 **Minecraft / Blockbench 体素风格**的高清视觉设定图与生物工程展示图，包括多角度视图、局部细节、特殊器官、模块拆解、骨骼与关节、材质配色、UV 示意、动作集、关键帧、碰撞范围与生物档案。

本 Skill **只出图**，不生成 `.bbmodel`、glTF、OBJ、贴图、骨骼绑定、动画数据或 ZIP 工程包。

## 核心特性

- **动态工程展示**：不固定工程板数量与排版，按生物结构、内容容量和用户要求决定单张或多张、横向或纵向。
- **主体设计锁定**：主体确认后建立统一设计基准，保证多角度、拆解、骨骼、材质与动画使用同一设计版本。
- **动作完整交付**：每个动作使用 `A01`、`A02` 等唯一编号；用户要求多少动作，就交付多少动作，容量不足时自动分板。
- **交付清单核对**：使用 `P01`、`A01`、`U01` 等编号逐项核对，禁止静默删减或把未生成内容标记为完成。
- **文字与模型分离**：按“模型 → 标注 → 排版 → 校对”四阶段制作，优先后期叠加准确文字，减少图中复杂中文。
- **模块分离硬约束**：相邻模块使用可区分底色、深色接缝和关节留缝，禁止不同零件糊成一团。
- **Minecraft / Blockbench 体素风**：轴对齐方块、像素贴图质感、正交 / 等距视角、硬边光影，禁止写实渲染与平滑曲面。
- **全类型覆盖**：动物、神话生物、人形角色、克苏鲁异形、外星生命、亡灵、元素生命、机械与生化生命、原创融合生物。

## 目录结构

```text
creature-engineering-designer/
├── SKILL.md                              # 技能主指令：定位、原则、硬约束、流程与验收
├── SKILL_PROMPT.md                       # 创建 / 升级本 Skill 的完整提示词
├── README.md
├── agents/
│   └── openai.yaml                       # Codex UI 展示与默认提示
└── references/
    ├── sheet-layout-and-prompts.md       # 动态版式、分板决策、母提示词与文字降级
    ├── topology-and-rigging.md           # 各拓扑的骨链、关节轴、动作集与碰撞区
    ├── subject-baseline-template.md      # 主体设计基准模板
    └── delivery-checklist-template.md    # 交付清单与状态模板
```

## 安装到 Codex

复制到 `~/.codex/skills/creature-engineering-designer`（Windows 通常为 `C:\Users\<用户名>\.codex\skills\creature-engineering-designer`）：

```powershell
$src = ".\creature-engineering-designer"
$dst = "$env:USERPROFILE\.codex\skills\creature-engineering-designer"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\SKILL.md", "$src\SKILL_PROMPT.md", "$src\README.md" -Destination $dst -Force
Copy-Item "$src\agents" -Destination $dst -Recurse -Force
Copy-Item "$src\references" -Destination $dst -Recurse -Force
```

如果本地已经安装旧版本，先删除旧目录再复制，避免残留旧版参考文件。

## 使用示例

- `使用 $creature-engineering-designer，为烛龙设计一套完整工程展示图。`
- `为这只深海机械克苏鲁出图，要求触手、动力核心和模块拆解都能看清。`
- `设计一只人形恶魔战士，先出高清视觉设定图，再补 6 个动作的动画展示。`
- `按照这张麒麟工程图的精细度和版式质量，为新的原创神兽出一套图，但不要照搬麒麟的身体结构。`
- `这套图主体需要修改，请同步更新所有受影响的视图、拆解和动画。`

## 工作方式

1. 先理解生物身份、来源、拓扑、特殊器官、运动方式与用户参考图。
2. 建立主体设计基准，记录轮廓、比例、器官、模块、颜色和材质。
3. 建立交付清单，按实际内容判断单张还是多张。
4. 生成统一主体，再制作工程图、细节图、拆解图、骨骼图、材质图和动画图。
5. 按“模型 → 标注 → 排版 → 校对”完成文字，避免文字覆盖模型。
6. 按清单逐项验收，未展示的项目继续补充。

## 设计原则

1. 先理解创意，再决定结构，不套固定生物模板。
2. 只借参考图的视觉语言，不复制参考生物的解剖结构。
3. 多图必须使用同一设计版本、同一比例、同一材质与同一模块。
4. UV、骨骼、关节与碰撞线框均为**设计示意**，不表述为可导入数据。
5. 未知尺寸标注“参考”，不伪造精确参数。
6. 宁可少写文字，也不使用错误文字破坏展示效果。

## 视觉风格

所有图像强制为 Minecraft / Blockbench 体素风：

- 几何只由立方体、长方体与阶梯模块构成，禁止平滑曲面与有机流线。
- `16×16` / `32×32` 像素贴图质感，每材质 3–4 阶明暗，硬边像素轮廓。
- 正 / 左 / 背 / 右使用正交投影，45° 使用等距投影；禁止自由透视与景深。
- 禁止写实皮肤、镜面反射、柔和体积光与摄影棚渲染。
- 每个生物 8–14 个主色，能量件可用 1–2 个高饱和发光色。
- 每个模块必须有可区分底色与深色接缝，关节留缝；禁止头身不分、触手糊成一团或零件融成剪影。
- 术语全图锁定，文字逐项校对；禁止乱码、错字、错译与未替换占位符。

## 明确不做

- 不生成 `.bbmodel`、glTF、OBJ、FBX 等三维模型文件。
- 不生成贴图 PNG、真实 UV 数据、骨骼绑定或动画数据文件。
- 不打包 ZIP 工程交付物。
- 不把工程图、UV 示意图或骨骼图宣称为“可直接导入”的模型。

如果用户需要三维模型文件，应说明本 Skill 只提供设计图与建模参考。

## 版本

- 当前版本：`2.2`
- GitHub：<https://github.com/56025192/creature-engineering-designer>
