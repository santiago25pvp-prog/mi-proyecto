const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const tsconfigPaths = ["tsconfig.json", "frontend/tsconfig.json"];

const errors = [];

for (const relativePath of tsconfigPaths) {
  const absolutePath = path.join(rootDir, relativePath);
  let parsed;

  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: cannot parse JSON (${error.message})`);
    continue;
  }

  const compilerOptions = parsed && parsed.compilerOptions ? parsed.compilerOptions : {};
  const moduleResolution = compilerOptions.moduleResolution;

  if (moduleResolution === "node" || moduleResolution === "node10") {
    errors.push(
      `${relativePath}: compilerOptions.moduleResolution must not be \"node\" or \"node10\"`
    );
  }

  if (Object.prototype.hasOwnProperty.call(compilerOptions, "baseUrl")) {
    errors.push(`${relativePath}: compilerOptions.baseUrl is not allowed`);
  }

  if (Object.prototype.hasOwnProperty.call(compilerOptions, "ignoreDeprecations")) {
    errors.push(`${relativePath}: compilerOptions.ignoreDeprecations is not allowed`);
  }
}

if (errors.length > 0) {
  console.error("TS config guard failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("TS config guard passed.");
