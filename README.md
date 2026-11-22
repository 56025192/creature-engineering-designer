# Creature Engineering Designer（生物工程设计大师）

面向 **Codex** 的全类型生物与角色**视觉设计 Skill**：输出 **Minecraft / Blockbench 体素风格**的高清视觉设定图与完整生物工程构造图（五视图、局部细节、爆炸拆解、材质与 UV 示意、骨骼关节、动作集、关键帧与碰撞、右侧档案）。

本 Skill **只出图**，不生成三维模型文件、贴图文件、骨骼绑定文件或动画文件。

## 两种模式

| 模式 | 用途 | 输出 |
| --- | --- | --- |
| **A 高清视觉设定图** | 先敲定外观、材质与设定 | 五视图 + 局部细节 + 色板 + 档案 |
| **B 完整工程构造图（默认）** | 建模参考、结构评审、提案 | `3:4` 纵向七排工程板 + 右侧档案栏 |

超复杂生物或需要宽幅时，可改为 `16:9` / `21:9`，或拆成两张高清晰子板。

## 目录结构

```text
creature-engineering-designer/
├── SKILL.md                              # 技能主指令与模式路由
├── SKILL_PROMPT.md                       # 创建本 Skill 的完整提示词
├── README.md
├── agents/
│   └── openai.yaml                       # Codex UI 展示与默认提示
└── references/
    ├── sheet-layout-and-prompts.md       # 工程板版式、七排比例与母提示词
    └── topology-and-rigging.md           # 六大拓扑的骨链、关节轴与动作规范
```

## 安装到 Codex

复制到 `~/.codex/skills/creature-engineering-designer`（Windows 通常为 `C:\Users\<用户名>\.codex\skills\creature-engineering-designer`）：

```powershell
$src = ".\creature-engineering-designer"
$dst = "$env:USERPROFILE\.codex\skills\creature-engineering-designer"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\SKILL.md", "$src\agents", "$src\references" -Destination $dst -Recurse -Force
```

需要重新生成同类 Skill 时，可直接使用 `SKILL_PROMPT.md` 中的整段提示词。

## 使用示例

- `使用 $creature-engineering-designer，为烛龙出一张完整工程构造图。`
- `用模式 A 设计一只人形恶魔战士的高清视觉设定图。`
- `按模式 B 设计一只深海机械克苏鲁，包含触手骨骼和爆炸拆解。`
- `按照这张参考图的版式风格，为新物种出一张工程图。`

## 设计原则

1. 先识别物种与拓扑原型，再决定身体结构。
2. 只借参考图的视觉语言，不借物种解剖。
3. 五视图、特写、拆解、动作必须共用同一套几何与配色。
4. UV、骨骼与碰撞均为**设计示意**，不表述为可导入模型。
5. 未知尺寸标注“参考”，不伪造精确数据。

## 视觉风格

所有图像强制为 Minecraft / Blockbench 体素风：

- 几何只由立方体、长方体与阶梯模块构成，禁止平滑曲面与有机流线。
- `16×16` / `32×32` 像素贴图质感，每材质 3–4 阶明暗，硬边像素轮廓。
- 正/左/背/右用正交投影，45° 用等距投影；禁止自由透视与景深。
- 禁止写实皮肤、镜面反射、柔和体积光与摄影棚渲染。
- 每个生物 8–14 个主色，能量件可用 1–2 个高饱和发光色。
- 每个模块必须有可区分底色与深色接缝，关节留缝；禁止头身不分、触手糊成一团或零件融成剪影。
- 术语全图锁定，文字逐项校对；禁止乱码、错字、错译与未替换占位符。

## 明确不做

- 不生成 `.bbmodel`、glTF、OBJ 等三维模型文件。
- 不生成贴图 PNG、UV 数据、骨骼绑定或动画文件。
- 不打包 ZIP 工程交付物。
- 不把工程图宣称为“可直接导入”的模型。

如果用户需要三维模型文件，应说明本 Skill 只提供设计图与建模参考。
