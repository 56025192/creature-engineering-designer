#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const specPath = path.join(skillDir, "references", "sample-creature-spec.json");

const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function runNode(args) {
  return execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ced-selftest-"));
const outDir = path.join(workDir, "abyssal_watcher");

try {
  const buildOutput = runNode([
    path.join(scriptDir, "bbmodel_builder.mjs"),
    "--spec",
    specPath,
    "--out",
    outDir,
    "--zip",
  ]);

  const bbmodelPath = path.join(outDir, "abyssal_watcher.bbmodel");
  const pngPath = path.join(outDir, "textures", "abyssal_watcher.png");
  const readmePath = path.join(outDir, "MODEL_README.md");
  const zipPath = path.join(workDir, "abyssal_watcher-bbmodel.zip");

  check(fs.existsSync(bbmodelPath), "Missing generated .bbmodel");
  check(fs.existsSync(pngPath), "Missing generated texture PNG");
  check(fs.existsSync(readmePath), "Missing generated MODEL_README.md");
  check(fs.existsSync(zipPath), "Missing generated ZIP package");
  check(buildOutput.includes("Generated:"), "Builder did not report generated files");

  if (failures.length === 0) {
    const model = JSON.parse(fs.readFileSync(bbmodelPath, "utf8"));
    check(model.meta.format_version === "4.5", `Unexpected format_version: ${model.meta.format_version}`);
    check(model.meta.box_uv === false, "meta.box_uv must be false for per-face UV");
    check(model.elements.every((element) => element.box_uv === false), "Every cube must set box_uv: false");
    check(Array.isArray(model.groups) && model.groups.length > 0, "Missing top-level groups table (5.0 readers)");
    check(model.textures.length === 1, "Bedrock-compatible models must use a single texture");

    const pngHeader = fs.readFileSync(pngPath).subarray(0, 8);
    check(
      pngHeader.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      "Texture file is not a valid PNG"
    );

    let validationOutput = "";
    try {
      validationOutput = runNode([path.join(scriptDir, "validate_bbmodel.mjs"), bbmodelPath]);
    } catch (err) {
      failures.push(`Validator failed:\n${err.stderr || err.stdout || err.message}`);
    }
    check(validationOutput.includes("VALID:"), "Validator did not return VALID");
  }
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("SELFTEST FAILED");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("SELFTEST PASSED");
