#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function fail(errors, message) {
  errors.push(message);
}

function rectsOverlap(left, right) {
  return left[0] < right[2] && right[0] < left[2] && left[1] < right[3] && right[1] < left[3];
}

function validateBbmodel(filePath) {
  const errors = [];
  const warnings = [];
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    return { ok: false, errors: [`File not found: ${resolvedPath}`], warnings };
  }

  let model;
  try {
    model = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (err) {
    return { ok: false, errors: [`Invalid JSON: ${err.message}`], warnings };
  }

  if (!model.meta || !model.meta.model_format) {
    fail(errors, "Missing meta.model_format.");
  }
  if (!model.resolution || !model.resolution.width || !model.resolution.height) {
    fail(errors, "Missing resolution.width or resolution.height.");
  }

  const resWidth = Number(model.resolution?.width || 0);
  const resHeight = Number(model.resolution?.height || 0);
  const textureCount = (model.textures || []).length;
  const uvRects = [];

  const elementMap = new Map();
  for (const element of model.elements || []) {
    if (!element.uuid) {
      fail(errors, `Element '${element.name || "unnamed"}' is missing uuid.`);
      continue;
    }
    if (elementMap.has(element.uuid)) {
      fail(errors, `Duplicate element uuid: ${element.uuid}`);
    }
    elementMap.set(element.uuid, element);

    if (Array.isArray(element.from) && Array.isArray(element.to)) {
      for (let axis = 0; axis < 3; axis += 1) {
        if (element.from[axis] >= element.to[axis]) {
          fail(errors, `Element '${element.name}' has from >= to on axis ${axis}.`);
        }
      }
    } else {
      fail(errors, `Element '${element.name}' is missing from/to coordinates.`);
    }

    for (const [faceName, faceData] of Object.entries(element.faces || {})) {
      if (!Array.isArray(faceData.uv) || faceData.uv.length !== 4) {
        fail(errors, `Element '${element.name}' face '${faceName}' has invalid uv array.`);
        continue;
      }
      const [u1, v1, u2, v2] = faceData.uv;
      if (u1 < 0 || v1 < 0 || u2 > resWidth || v2 > resHeight || u1 > u2 || v1 > v2) {
        fail(
          errors,
          `Element '${element.name}' face '${faceName}' UV [${faceData.uv.join(", ")}] is out of bounds for ${resWidth}x${resHeight}.`
        );
      }
      if (u1 === u2 || v1 === v2) {
        fail(errors, `Element '${element.name}' face '${faceName}' has a zero-area UV rect.`);
      }
      if (typeof faceData.texture === "number" && faceData.texture >= textureCount) {
        fail(
          errors,
          `Element '${element.name}' face '${faceName}' references texture index ${faceData.texture}, but only ${textureCount} texture(s) exist.`
        );
      }
      uvRects.push({ uv: faceData.uv, label: `${element.name}/${faceName}` });
    }

    const faceCount = Object.keys(element.faces || {}).length;
    if (faceCount !== 6) {
      warnings.push(`Element '${element.name}' defines ${faceCount} face(s) instead of the usual 6.`);
    }
  }

  uvRects.sort((left, right) => left.uv[0] - right.uv[0]);
  for (let idx = 0; idx < uvRects.length; idx += 1) {
    const current = uvRects[idx];
    for (let next = idx + 1; next < uvRects.length; next += 1) {
      const candidate = uvRects[next];
      if (candidate.uv[0] >= current.uv[2]) {
        break;
      }
      if (rectsOverlap(current.uv, candidate.uv)) {
        fail(
          errors,
          `UV overlap between '${current.label}' ${JSON.stringify(current.uv)} and '${candidate.label}' ${JSON.stringify(candidate.uv)}.`
        );
      }
    }
  }

  const referencedElements = new Set();
  const boneMap = new Map();

  function walkOutliner(nodes) {
    for (const node of nodes || []) {
      if (typeof node === "string") {
        if (!elementMap.has(node)) {
          fail(errors, `Outliner references missing element uuid: ${node}`);
        }
        referencedElements.add(node);
      } else if (node && typeof node === "object") {
        if (!node.uuid) {
          fail(errors, `Group '${node.name || "unnamed"}' is missing uuid.`);
        } else if (boneMap.has(node.uuid)) {
          fail(errors, `Duplicate group uuid: ${node.uuid}`);
        } else {
          boneMap.set(node.uuid, node);
        }
        walkOutliner(node.children || []);
      }
    }
  }

  walkOutliner(model.outliner || []);

  if (Array.isArray(model.groups)) {
    for (const group of model.groups) {
      if (!group.uuid) {
        fail(errors, `Top-level group '${group.name || "unnamed"}' is missing uuid.`);
      } else if (!boneMap.has(group.uuid)) {
        fail(errors, `Top-level group table lists uuid ${group.uuid} that is absent from outliner.`);
      }
    }
  }

  for (const elementUuid of elementMap.keys()) {
    if (!referencedElements.has(elementUuid)) {
      fail(errors, `Orphan element not attached to outliner: ${elementUuid}`);
    }
  }

  const textures = model.textures || [];
  if (textures.length === 0) {
    warnings.push("No textures defined in model.");
  }
  for (const texture of textures) {
    if (typeof texture.source === "string" && texture.source.startsWith("data:image/png;base64,")) {
      const pngBuf = Buffer.from(texture.source.slice("data:image/png;base64,".length), "base64");
      const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      if (!pngBuf.subarray(0, 8).equals(pngSig)) {
        fail(errors, `Embedded texture '${texture.name}' is not a valid PNG.`);
      }
    }
    if (texture.relative_path) {
      const diskPath = path.join(path.dirname(resolvedPath), texture.relative_path);
      if (!fs.existsSync(diskPath)) {
        warnings.push(`Linked texture file not found on disk: ${diskPath}`);
      }
    }
  }

  for (const anim of model.animations || []) {
    if (!anim.name) {
      fail(errors, "Animation missing name.");
    }
    for (const [boneUuid, animator] of Object.entries(anim.animators || {})) {
      if (!boneMap.has(boneUuid)) {
        fail(errors, `Animation '${anim.name}' targets unknown bone uuid: ${boneUuid}`);
      }
      for (const keyframe of animator.keyframes || []) {
        if (typeof keyframe.time !== "number" || keyframe.time < 0) {
          fail(errors, `Animation '${anim.name}' has invalid keyframe time.`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      format: model.meta?.model_format,
      formatVersion: model.meta?.format_version,
      resolution: `${resWidth}x${resHeight}`,
      cubes: elementMap.size,
      bones: boneMap.size,
      textures: textures.length,
      animations: (model.animations || []).length,
    },
  };
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node validate_bbmodel.mjs <path-to-model.bbmodel>");
    process.exit(1);
  }

  const result = validateBbmodel(target);
  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`WARN: ${warning}`);
    }
  }
  if (!result.ok) {
    for (const err of result.errors) {
      console.error(`ERROR: ${err}`);
    }
    process.exit(1);
  }

  console.log("VALID:", JSON.stringify(result.stats));
}

main();
