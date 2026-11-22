# Creature Engineering Designer（生物工程设计大师）

[![validate](https://github.com/56025192/creature-engineering-designer/actions/workflows/validate.yml/badge.svg)](https://github.com/56025192/creature-engineering-designer/actions/workflows/validate.yml)

面向 **Codex** 的全类型 3D 生物与角色工程设计 Skill：既能生成跨视图一致的生物工程构造图，也能通过内置零依赖 Node.js 工具链，生成并校验**真实可导入 Blockbench 的 `.bbmodel` 工程包、PNG 贴图与骨骼动画**。

## 核心特性

- **全物种拓扑适配**：双足人形、四足兽形、多节长条/蛇形、翼展飞禽/巨龙、辐射/多肢/克苏鲁触手体、模块化机械与交叉融合生物。
- **视觉语言与物种结构解耦**：复用深蓝黑 + 暗金工程展示语言，但禁止把参考图生物的角、鬃毛、鳞甲或蹄足强加给其他物种。
- **三种工作模式**：
  - 模式 A：高清视觉设定图（五视图、核心细节、材质配色）。
  - 模式 B：完整工程构造图（默认 `3:4` 纵向七排工程板 + 右侧档案栏，复杂生物可拆双板）。
  - 模式 C：Blockbench 真实模型交付（`.bbmodel` + PNG 贴图 + 骨骼 + 关键帧动画 + ZIP）。
- **零第三方依赖**：仅使用 Node.js 标准库（`node:fs`、`node:zlib`、`node:crypto`、`node:child_process`），无需 `npm install`。
- **可验证**：内置 UV 重叠检测、孤立件检测、动画骨骼引用校验与端到端自测。

## 目录结构

```text
creature-engineering-designer/
├── SKILL.md                                # Skill 主指令与模式路由
├── README.md
├── .gitignore
├── agents/
│   └── openai.yaml                         # Codex UI 展示与默认提示
├── references/
│   ├── sheet-layout-and-prompts.md         # 工程板排版、防过载策略与母提示词
│   ├── topology-and-rigging.md             # 六大拓扑骨架、关节轴与动作规范
│   ├── blockbench-spec.md                  # .bbmodel 规范与 Spec JSON 结构
│   ├── blockbench-pitfalls.md              # Blockbench 实测踩坑清单
│   └── sample-creature-spec.json           # 示例：深渊凝视者
├── scripts/
│   ├── bbmodel_builder.mjs                 # 生成 .bbmodel + PNG + README + ZIP
│   ├── validate_bbmodel.mjs                # 结构 / UV / 骨骼 / 动画校验
│   ├── check_skill.mjs                     # SKILL.md frontmatter 与链接校验
│   └── selftest.mjs                        # 端到端自测
└── .github/workflows/validate.yml          # CI：frontmatter + 模型自测
```

## 安装到 Codex

把 Skill 运行所需文件复制到 `~/.codex/skills/creature-engineering-designer`（Windows 通常为 `C:\Users\<用户名>\.codex\skills\creature-engineering-designer`）：

- 必需：`SKILL.md`、`agents/`、`references/`、`scripts/`
- 可选：`README.md`、`.gitignore`、`.github/`（仅仓库展示/CI 使用）

```powershell
$src = ".\creature-engineering-designer"
$dst = "$env:USERPROFILE\.codex\skills\creature-engineering-designer"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\SKILL.md", "$src\agents", "$src\references", "$src\scripts" -Destination $dst -Recurse -Force
```

调用方式：

- 显式：`$creature-engineering-designer`
- 自然语言：“用工程模式设计一只深海机械克苏鲁，包含触手骨骼和拆解图。”
- 建模：“为人形恶魔剑士生成可导入 Blockbench 的 `.bbmodel`、贴图和待机/攻击动画。”

## 本地构建与验证

前置条件：**Node.js >= 18**（本仓库在 Node 20/24 上验证）。

```bash
# 1. 检查 SKILL.md 格式与相对链接
node scripts/check_skill.mjs

# 2. 端到端自测（构建示例 → 校验 → 检查 ZIP/PNG）
node scripts/selftest.mjs

# 3. 手动构建示例模型
node scripts/bbmodel_builder.mjs --spec references/sample-creature-spec.json --out ./packages/abyssal_watcher --zip

# 4. 单独校验某个 .bbmodel
node scripts/validate_bbmodel.mjs ./packages/abyssal_watcher/abyssal_watcher.bbmodel
```

`validate_bbmodel.mjs` 检查项：

- `meta.model_format` / `format_version` / `resolution` 合法性
- 每个 cube 的 `from < to`、六面 UV 边界与**矩形重叠**
- `outliner` 与 `elements` 一一对应（无孤立方块、无重复 UUID）
- 贴图索引是否越界、内嵌 Base64 是否为有效 PNG、磁盘纹理是否存在
- 动画 `animators` 引用的骨骼 UUID 是否真实存在

## Blockbench 兼容性

| 项目 | 约定 |
| --- | --- |
| 文件版本 | 写 `meta.format_version = "4.5"`，同时输出 5.0 顶层 `groups` 表 |
| UV 模式 | 工程级与每个 cube 的 `box_uv` 均为 `false`（逐面 UV） |
| 贴图 | `bedrock` 实体格式单贴图，全模型只引用 `texture 0` |
| 动画 | 只键组，不键方块；静息角放在 cube 上 |
| 尺度 | 16 单位 = 1 格；方块尺寸整数，关节位置对齐 0.5 网格 |
| 朝向 | 正面朝 `-Z`（north），`+Y` 向上 |

更完整的实测约束见 `references/blockbench-pitfalls.md`。

## 设计原则

1. 先定物种与拓扑，再定结构；不为凑模板虚构器官。
2. 只借参考图的视觉语言，不借物种解剖。
3. 五视图、特写、拆解、动作必须共用同一套几何与配色。
4. 工程图里的 UV/骨骼是**参考示意**；只有校验通过的 `.bbmodel` 才算真实模型。
5. 用户产物输出到 `./packages/<creature-slug>/`，不写入 Skill 安装目录。

## 已知限制

- 工程设定图的质量取决于宿主是否具备图像生成能力；本仓库不内置绘图模型。
- 本仓库不包含 Blockbench 应用本体，`.bbmodel` 的最终视觉确认仍需在 Blockbench 中打开一次。
- 自动生成的是模块化方块/骨骼模型，不替代手工雕刻级高模与精细权重绘制。

## 许可

当前仓库未声明开源许可证；如需对外分发，请先补充 `LICENSE`。
