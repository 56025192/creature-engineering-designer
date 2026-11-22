#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.dirname(scriptDir);
const skillPath = path.join(skillDir, "SKILL.md");
const content = fs.readFileSync(skillPath, "utf8");
const errors = [];

const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!match) {
  errors.push("SKILL.md must start with YAML frontmatter.");
}

const frontmatter = match ? match[1] : "";
const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
const descriptionMatch = frontmatter.match(/^description:\s*(.+)$/m);

const name = nameMatch ? nameMatch[1].trim() : "";
const description = descriptionMatch ? descriptionMatch[1].trim() : "";

if (!name) {
  errors.push("Missing 'name' in frontmatter.");
} else {
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push(`Name '${name}' must be hyphen-case.`);
  }
  if (name.length > 64) {
    errors.push(`Name is too long (${name.length} > 64).`);
  }
  if (path.basename(skillDir) !== name) {
    errors.push(`Skill folder '${path.basename(skillDir)}' must match frontmatter name '${name}'.`);
  }
}

if (!description) {
  errors.push("Missing 'description' in frontmatter.");
} else {
  if (description.length > 1024) {
    errors.push(`Description is too long (${description.length} > 1024).`);
  }
  if (/[<>]/.test(description)) {
    errors.push("Description cannot contain angle brackets.");
  }
}

for (const link of content.matchAll(/\]\((\.[^)#]+)\)/g)) {
  const target = path.resolve(skillDir, link[1]);
  if (!fs.existsSync(target)) {
    errors.push(`Broken relative link: ${link[1]}`);
  }
}

if (errors.length > 0) {
  console.error("SKILL CHECK FAILED");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`SKILL OK: ${name} (description ${description.length} chars)`);
