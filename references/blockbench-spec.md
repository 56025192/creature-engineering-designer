# Blockbench (.bbmodel) 模式 C 制作与脚本规范

模式 C 通过 `scripts/bbmodel_builder.mjs` 生成真实可导入 Blockbench 的项目包，并通过 `scripts/validate_bbmodel.mjs` 完成结构自检。

## 一、核心工程基准

- **单位尺度**：Blockbench 默认 `16` 像素单位 = 1 米/1 标准方块高度。
  - 人形常规身高约 `28–36` 单位（约 1.8–2.25 格）；小型宠物约 `10–18` 单位；巨兽可达 `48–96` 单位。
- **坐标系**：`+Y` 向上，`+Z` 朝南；本技能约定**正面朝向 `-Z`（north）**，头朝 `+Y`，左右命名严格自洽。
- **目标格式**：
  - `free`（通用自由网格/骨骼格式，支持任意角度旋转与多层嵌套，适合通用 3D/展示/引擎导出）
  - `bedrock`（Minecraft 基岩版实体格式，规范骨骼绑定与 `animations` 动画导出）
- **文件版本**：脚本写 `meta.format_version = "4.5"`（内联组变换），同时输出顶层 `groups` 表以兼容只认 5.0 布局的读取器。
- **UV 模式**：脚本默认使用 `per_face_uv`（工程级与每个 cube 的 `box_uv` 均为 `false`），为每个 cube 的六个面在 `64×64`、`128×128` 或 `256×256` 图集上自动排布**互不重叠**的整数像素矩形，矩形之间留 2 像素 gutter 并做边缘 clamp 扩边，避免闭区间采样渗色。
- **单贴图约束**：`bedrock` 实体格式只支持一张贴图，脚本始终只输出 `texture 0`；不要手工追加第二张。

## 二、输入 Spec JSON 结构

编写 JSON 配置文件时遵循以下结构（完整可运行示例见 `references/sample-creature-spec.json`）：

```json
{
  "name": "abyssal_sentinel",
  "displayName": "深渊哨卫",
  "format": "free",
  "resolution": 128,
  "palette": {
    "obsidian": "#1c2230",
    "gold": "#c9a34e",
    "cyan_glow": "#3ef2e6",
    "slate": "#38455c"
  },
  "groups": [
    {
      "name": "root",
      "origin": [0, 0, 0],
      "cubes": [],
      "children": [
        {
          "name": "torso",
          "origin": [0, 12, 0],
          "cubes": [
            {
              "name": "core_shell",
              "from": [-4, 10, -3],
              "to": [4, 22, 3],
              "origin": [0, 16, 0],
              "rotation": [0, 0, 0],
              "material": "obsidian",
              "trim": "gold",
              "pattern": "bevel"
            }
          ],
          "children": []
        }
      ]
    }
  ],
  "animations": {
    "idle": {
      "loop": "loop",
      "length": 2.0,
      "bones": {
        "torso": {
          "position": [
            { "time": 0, "value": [0, 0, 0] },
            { "time": 1.0, "value": [0, 0.8, 0] },
            { "time": 2.0, "value": [0, 0, 0] }
          ]
        }
      }
    }
  }
}
```

### Cube 字段说明
- `from` / `to`：`[x, y, z]` 必须满足 `from[i] < to[i]`（至少留出 `0.01` 厚度以免零体积面片异常，薄片如翼膜可用 `0.2` 厚度）。
- `origin`：`[ox, oy, oz]`，单个 cube 旋转中心。
- `rotation`：`[rx, ry, rz]` 角度（度）。
- `material`：引用 `palette` 中的颜色键或直接写 `#RRGGBB`。
- `trim`（可选）：边框高光/金属描边颜色键，用于增强模块化立体感。
- `pattern`（可选）：`"solid"` | `"bevel"`（默认，带边缘明暗框）| `"scales"` | `"stripe"` | `"glow"`。
- `faceOverrides`（可选）：针对 `"north" | "south" | "east" | "west" | "up" | "down"` 指定独立 `material` 或 `pattern`（例如正面画眼睛/面部纹样）。

### Animation 字段说明
- `loop`：`"loop"` | `"once"` | `"hold"`。
- `length`：动画总时长（秒）。
- `bones.<bone_name>`：支持 `rotation`、`position`、`scale` 三个通道，每个关键帧含 `time`（秒）、`value`（`[x, y, z]`）和可选 `interpolation`（`"linear"` / `"catmullrom"` / `"step"`）。

## 三、构建与校验命令

1. **生成工程目录与 ZIP 包**：
   ```bash
   node "<skill-dir>/scripts/bbmodel_builder.mjs" --spec "<spec.json>" --out "./packages/<creature-slug>" --zip
   ```
   输出文件：
   - `<creature-slug>.bbmodel`（内嵌 Base64 PNG 并关联相对纹理路径）
   - `textures/<creature-slug>.png`（真实 RGBA PNG 贴图）
   - `MODEL_README.md`（骨骼清单、尺寸、贴图分辨率与动画说明）
   - `../<creature-slug>-bbmodel.zip`（当指定 `--zip` 时自动打包）

2. **执行工程结构校验**：
   ```bash
   node "<skill-dir>/scripts/validate_bbmodel.mjs" "./packages/<creature-slug>/<creature-slug>.bbmodel"
   ```
   校验通过条件：退出码为 `0`，无孤立 element、无重复 UUID、所有 UV 坐标在图集分辨率范围内、所有动画目标骨骼均可解析。
