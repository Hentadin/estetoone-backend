import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const required = [
  "docs/BRANCHING.md",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-staging.yml",
  ".github/workflows/deploy-prod.yml",
];

for (const file of required) {
  if (!existsSync(join(ROOT, file))) {
    console.error(`Missing: ${file}`);
    process.exit(1);
  }
}

const ci = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");
const deployStaging = readFileSync(join(ROOT, ".github/workflows/deploy-staging.yml"), "utf8");
const deployProd = readFileSync(join(ROOT, ".github/workflows/deploy-prod.yml"), "utf8");

for (const [name, content, branch] of [
  ["ci.yml", ci, "develop"],
  ["deploy-staging.yml", deployStaging, "staging"],
  ["deploy-prod.yml", deployProd, "main"],
]) {
  if (!content.includes(`branches: [${branch}]`)) {
    console.error(`${name} must target branch ${branch}`);
    process.exit(1);
  }
}

console.log("validate-branch-model: OK");
