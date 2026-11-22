#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

function parseArgs(argv) {
  const args = { zip: false };
  for (let idx = 2; idx < argv.length; idx += 1) {
    const token = argv[idx];
    if (token === "--spec") {
      args.spec = argv[idx + 1];
      idx += 1;
    } else if (token === "--out") {
      args.out = argv[idx + 1];
      idx += 1;
    } else if (token === "--zip") {
      args.zip = true;
    }
  }
  return args;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let byteVal = 0; byteVal < 256; byteVal += 1) {
    let current = byteVal;
    for (let bit = 0; bit < 8; bit += 1) {
      current = (current & 1) !== 0 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[byteVal] = current >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let idx = 0; idx < buffer.length; idx += 1) {
    crc = CRC_TABLE[(crc ^ buffer[idx]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const rawOffset = row * (stride + 1);
    raw[rawOffset] = 0;
    rgbaBuffer.copy(raw, rawOffset + 1, row * stride, (row + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function parseHexColor(colorValue, palette) {
  const resolved = palette[colorValue] ?? colorValue ?? "#6b7280";
  const clean = resolved.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(clean)) {
    return [120, 130, 150, 255];
  }
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  const alpha = clean.length === 8 ? Number.parseInt(clean.slice(6, 8), 16) : 255;
  return [red, green, blue, alpha];
}

function clampByte(num) {
  return Math.max(0, Math.min(255, Math.round(num)));
}

function shadeColor(rgba, factor) {
  return [
    clampByte(rgba[0] * factor),
    clampByte(rgba[1] * factor),
    clampByte(rgba[2] * factor),
    rgba[3],
  ];
}

function setPixel(buffer, atlasWidth, px, py, rgba) {
  const offset = (py * atlasWidth + px) * 4;
  buffer[offset] = rgba[0];
  buffer[offset + 1] = rgba[1];
  buffer[offset + 2] = rgba[2];
  buffer[offset + 3] = rgba[3];
}

function paintFaceRect(buffer, atlasWidth, atlasHeight, rect, faceStyle, palette) {
  const base = parseHexColor(faceStyle.material, palette);
  const trim = faceStyle.trim ? parseHexColor(faceStyle.trim, palette) : null;
  const pattern = faceStyle.pattern ?? "bevel";

  for (let localY = -1; localY <= rect.height; localY += 1) {
    for (let localX = -1; localX <= rect.width; localX += 1) {
      const px = rect.u + localX;
      const py = rect.v + localY;
      if (px < 0 || py < 0 || px >= atlasWidth || py >= atlasHeight) {
        continue;
      }

      const sampleX = Math.max(0, Math.min(rect.width - 1, localX));
      const sampleY = Math.max(0, Math.min(rect.height - 1, localY));
      const isEdge =
        sampleX === 0 ||
        sampleY === 0 ||
        sampleX === rect.width - 1 ||
        sampleY === rect.height - 1;

      let color = base;
      if (pattern === "bevel") {
        if (isEdge && rect.width >= 3 && rect.height >= 3) {
          color = trim ?? shadeColor(base, sampleY === 0 || sampleX === 0 ? 1.18 : 0.78);
        }
      } else if (pattern === "scales") {
        if (isEdge && trim) {
          color = trim;
        } else if ((sampleX + (sampleY % 2)) % 2 === 0) {
          color = shadeColor(base, 0.86);
        }
      } else if (pattern === "stripe") {
        if (sampleY % 3 === 1) {
          color = trim ?? shadeColor(base, 1.25);
        }
      } else if (pattern === "glow") {
        const centerX = (rect.width - 1) / 2;
        const centerY = (rect.height - 1) / 2;
        const dist = Math.hypot(sampleX - centerX, sampleY - centerY);
        const maxDist = Math.max(1, Math.hypot(centerX, centerY));
        if (isEdge && trim) {
          color = trim;
        } else {
          const boost = 1.35 - 0.55 * (dist / maxDist);
          color = shadeColor(base, boost);
        }
      }

      setPixel(buffer, atlasWidth, px, py, color);
    }
  }
}

function packFaceRects(faceRequests, initialResolution) {
  const gutter = 2;
  let resolution = initialResolution;
  while (resolution <= 1024) {
    const sorted = [...faceRequests].sort((left, right) => right.height - left.height);
    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    let fits = true;

    for (const item of sorted) {
      if (item.width > resolution || item.height > resolution) {
        fits = false;
        break;
      }
      if (cursorX + item.width + gutter > resolution) {
        cursorX = 0;
        cursorY += rowHeight;
        rowHeight = 0;
      }
      if (cursorY + item.height + gutter > resolution) {
        fits = false;
        break;
      }
      item.u = cursorX;
      item.v = cursorY;
      cursorX += item.width + gutter;
      rowHeight = Math.max(rowHeight, item.height + gutter);
    }

    if (fits) {
      return resolution;
    }
    resolution *= 2;
  }
  throw new Error("UV atlas exceeds maximum supported 1024x1024 resolution.");
}

function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const compressed = zlib.deflateRawSync(entry.data);
    const checksum = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);

    centralParts.push(centralHeader, nameBuf);
    localOffset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function buildModel(spec) {
  const slug = String(spec.name || "creature_model")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_");
  const palette = spec.palette || {};
  const elements = [];
  const faceRequests = [];
  const boneMap = new Map();
  const boneOrigins = new Map();
  const boneRotations = new Map();
  const boneSummaries = [];
  const cubeNames = new Set();
  const warnings = [];

  function processGroup(groupSpec, depth) {
    const boneUuid = crypto.randomUUID();
    if (boneMap.has(groupSpec.name)) {
      throw new Error(`Duplicate bone/group name '${groupSpec.name}'.`);
    }
    boneMap.set(groupSpec.name, boneUuid);
    boneOrigins.set(groupSpec.name, groupSpec.origin || [0, 0, 0]);
    boneRotations.set(groupSpec.name, groupSpec.rotation || [0, 0, 0]);
    boneSummaries.push(`${"  ".repeat(depth)}- ${groupSpec.name}`);

    const children = [];
    for (const cubeSpec of groupSpec.cubes || []) {
      if (cubeNames.has(cubeSpec.name)) {
        throw new Error(`Duplicate cube name '${cubeSpec.name}'. Cube names must be unique.`);
      }
      cubeNames.add(cubeSpec.name);
      const from = cubeSpec.from;
      const to = cubeSpec.to;
      if (!Array.isArray(from) || !Array.isArray(to) || from.length !== 3 || to.length !== 3) {
        throw new Error(`Cube '${cubeSpec.name}' requires 3D from/to coordinates.`);
      }
      for (let axis = 0; axis < 3; axis += 1) {
        if (from[axis] >= to[axis]) {
          throw new Error(`Cube '${cubeSpec.name}' has invalid bounds on axis ${axis}.`);
        }
      }

      const cubeUuid = crypto.randomUUID();
      const dimX = Math.max(1, Math.round(to[0] - from[0]));
      const dimY = Math.max(1, Math.round(to[1] - from[1]));
      const dimZ = Math.max(1, Math.round(to[2] - from[2]));
      const faceDims = {
        north: [dimX, dimY],
        south: [dimX, dimY],
        east: [dimZ, dimY],
        west: [dimZ, dimY],
        up: [dimX, dimZ],
        down: [dimX, dimZ],
      };

      const faces = {};
      for (const [faceName, [faceWidth, faceHeight]] of Object.entries(faceDims)) {
        const override = cubeSpec.faceOverrides?.[faceName] || {};
        const faceStyle = {
          material: override.material ?? cubeSpec.material ?? "default",
          trim: override.trim ?? cubeSpec.trim ?? null,
          pattern: override.pattern ?? cubeSpec.pattern ?? "bevel",
        };
        const request = {
          cubeUuid,
          faceName,
          width: faceWidth,
          height: faceHeight,
          faceStyle,
          u: 0,
          v: 0,
        };
        faceRequests.push(request);
        faces[faceName] = { request };
      }

      elements.push({
        name: cubeSpec.name,
        box_uv: false,
        rescale: false,
        locked: false,
        light_emission: 0,
        render_order: "default",
        allow_mirror_modeling: true,
        from,
        to,
        autouv: 0,
        color: 0,
        origin: cubeSpec.origin || groupSpec.origin || [0, 0, 0],
        rotation: cubeSpec.rotation || [0, 0, 0],
        faces,
        type: "cube",
        uuid: cubeUuid,
      });
      children.push(cubeUuid);
    }

    for (const childGroup of groupSpec.children || []) {
      children.push(processGroup(childGroup, depth + 1));
    }

    return {
      name: groupSpec.name,
      origin: groupSpec.origin || [0, 0, 0],
      rotation: groupSpec.rotation || [0, 0, 0],
      bedrock_binding: "",
      color: 0,
      uuid: boneUuid,
      export: true,
      mirror_uv: false,
      isOpen: true,
      locked: false,
      visibility: true,
      autouv: 0,
      children,
    };
  }

  const outliner = (spec.groups || []).map((groupSpec) => processGroup(groupSpec, 0));
  const requestedRes = Number(spec.resolution) || 128;
  const resolution = packFaceRects(faceRequests, requestedRes);

  const rgbaBuffer = Buffer.alloc(resolution * resolution * 4, 0);
  for (const request of faceRequests) {
    paintFaceRect(rgbaBuffer, resolution, resolution, request, request.faceStyle, palette);
  }

  for (const element of elements) {
    for (const [faceName, faceMeta] of Object.entries(element.faces)) {
      const rect = faceMeta.request;
      element.faces[faceName] = {
        uv: [rect.u, rect.v, rect.u + rect.width, rect.v + rect.height],
        texture: 0,
      };
    }
  }

  const pngBuffer = encodePng(resolution, resolution, rgbaBuffer);
  const textureUuid = crypto.randomUUID();
  const textureRelativePath = `textures/${slug}.png`;

  const animations = [];
  for (const [animName, animSpec] of Object.entries(spec.animations || {})) {
    const animators = {};
    for (const [boneName, channels] of Object.entries(animSpec.bones || {})) {
      const boneUuid = boneMap.get(boneName);
      if (!boneUuid) {
        throw new Error(`Animation '${animName}' references unknown bone '${boneName}'.`);
      }
      const restRotation = boneRotations.get(boneName) || [0, 0, 0];
      if (channels.rotation && restRotation.some((value) => Number(value) !== 0)) {
        warnings.push(
          `Bone '${boneName}' has a non-zero rest rotation on the group and is animated by '${animName}'. ` +
            "Blockbench replaces group rotation with keyframes, so move the rest angle onto the cubes instead."
        );
      }
      const keyframes = [];
      for (const channelName of ["rotation", "position", "scale"]) {
        for (const frame of channels[channelName] || []) {
          const [valX, valY, valZ] = frame.value;
          keyframes.push({
            channel: channelName,
            data_points: [{ x: String(valX), y: String(valY), z: String(valZ) }],
            uuid: crypto.randomUUID(),
            time: Number(frame.time),
            color: -1,
            interpolation: frame.interpolation || "linear",
          });
        }
      }
      keyframes.sort((left, right) => left.time - right.time);
      animators[boneUuid] = {
        name: boneName,
        type: "bone",
        keyframes,
      };
    }

    animations.push({
      uuid: crypto.randomUUID(),
      name: animName,
      loop: animSpec.loop || "loop",
      override: false,
      length: Number(animSpec.length) || 1.0,
      snapping: 24,
      selected: false,
      saved: true,
      anim_time_update: "",
      blend_weight: "",
      start_delay: "",
      loop_delay: "",
      animators,
    });
  }

  const bbmodel = {
    meta: {
      format_version: "4.5",
      model_format: spec.format === "bedrock" ? "bedrock" : "free",
      box_uv: false,
    },
    name: slug,
    model_identifier: slug,
    visible_box: [1, 1, 0],
    variable_placeholders: "",
    variable_placeholder_buttons: [],
    resolution: { width: resolution, height: resolution },
    elements,
    outliner,
    groups: [...boneMap.entries()].map(([name, uuid]) => ({
      uuid,
      name,
      origin: boneOrigins.get(name) || [0, 0, 0],
      rotation: boneRotations.get(name) || [0, 0, 0],
    })),
    textures: [
      {
        path: textureRelativePath,
        name: `${slug}.png`,
        folder: "",
        namespace: "",
        id: "0",
        width: resolution,
        height: resolution,
        uv_width: resolution,
        uv_height: resolution,
        particle: false,
        use_as_default: true,
        layers_enabled: false,
        sync_to_project: "",
        render_mode: "default",
        render_sides: "auto",
        frame_time: 1,
        frame_order_type: "loop",
        frame_order: "",
        frame_interpolate: false,
        visible: true,
        saved: true,
        uuid: textureUuid,
        relative_path: textureRelativePath,
        source: `data:image/png;base64,${pngBuffer.toString("base64")}`,
      },
    ],
    animations,
  };

  return {
    slug,
    displayName: spec.displayName || slug,
    resolution,
    requestedRes,
    bbmodel,
    pngBuffer,
    boneSummaries,
    elementCount: elements.length,
    animationNames: animations.map((anim) => anim.name),
    warnings,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.spec || !args.out) {
    console.error("Usage: node bbmodel_builder.mjs --spec <spec.json> --out <output-dir> [--zip]");
    process.exit(1);
  }

  const specRaw = fs.readFileSync(args.spec, "utf8");
  const spec = JSON.parse(specRaw);
  const result = buildModel(spec);

  const outDir = path.resolve(args.out);
  const texturesDir = path.join(outDir, "textures");
  fs.mkdirSync(texturesDir, { recursive: true });

  const bbmodelPath = path.join(outDir, `${result.slug}.bbmodel`);
  const pngPath = path.join(texturesDir, `${result.slug}.png`);
  const readmePath = path.join(outDir, "MODEL_README.md");

  const bbmodelBuffer = Buffer.from(JSON.stringify(result.bbmodel, null, 2), "utf8");
  const readmeText = [
    `# ${result.displayName} (${result.slug})`,
    "",
    `- **Format**: \`${result.bbmodel.meta.model_format}\` (Blockbench v${result.bbmodel.meta.format_version})`,
    `- **Texture Resolution**: \`${result.resolution}x${result.resolution}\` (per-face non-overlapping UV)`,
    `- **Cubes**: ${result.elementCount}`,
    `- **Animations**: ${result.animationNames.length > 0 ? result.animationNames.join(", ") : "None"}`,
    "",
    "## Bone Hierarchy",
    ...result.boneSummaries,
    "",
    "## Files",
    `- \`${result.slug}.bbmodel\``,
    `- \`textures/${result.slug}.png\``,
  ].join("\n");
  const readmeBuffer = Buffer.from(readmeText, "utf8");

  fs.writeFileSync(bbmodelPath, bbmodelBuffer);
  fs.writeFileSync(pngPath, result.pngBuffer);
  fs.writeFileSync(readmePath, readmeBuffer);

  for (const warning of result.warnings) {
    console.warn(`WARN: ${warning}`);
  }

  if (result.resolution !== result.requestedRes) {
    console.warn(
      `Notice: Atlas auto-expanded from ${result.requestedRes} to ${result.resolution} to fit all UV faces cleanly.`
    );
  }

  console.log(`Generated: ${bbmodelPath}`);
  console.log(`Generated: ${pngPath}`);
  console.log(`Generated: ${readmePath}`);

  if (args.zip) {
    const zipPath = path.join(path.dirname(outDir), `${result.slug}-bbmodel.zip`);
    const zipBuffer = createZipBuffer([
      { name: `${result.slug}/${result.slug}.bbmodel`, data: bbmodelBuffer },
      { name: `${result.slug}/textures/${result.slug}.png`, data: result.pngBuffer },
      { name: `${result.slug}/MODEL_README.md`, data: readmeBuffer },
    ]);
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`Generated: ${zipPath}`);
  }
}

main();
