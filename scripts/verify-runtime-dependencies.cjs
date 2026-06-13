const fs = require("fs");
const { execFileSync } = require("child_process");

const requiredRuntimeDependencies = {
  express: "^4.21.2",
  "cookie-parser": "^1.4.7",
  jsonwebtoken: "^9.0.3",
  pg: "^8.11.5",
  "firebase-admin": "^13.6.0",
  playwright: "^1.57.0",
  jimp: "^0.22.12",
  "drizzle-orm": "^0.39.1",
  "drizzle-zod": "^0.7.0",
  zod: "^3.24.2",
};

const shouldFix = process.argv.includes("--fix");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function syncPackageJson() {
  const pkg = readJson("package.json");
  pkg.dependencies = pkg.dependencies || {};
  pkg.devDependencies = pkg.devDependencies || {};

  let changed = false;

  for (const [dependency, version] of Object.entries(requiredRuntimeDependencies)) {
    if (!pkg.dependencies[dependency]) {
      pkg.dependencies[dependency] = pkg.devDependencies[dependency] || version;
      changed = true;
    }

    if (pkg.devDependencies[dependency]) {
      delete pkg.devDependencies[dependency];
      changed = true;
    }
  }

  if (Object.keys(pkg.devDependencies).length === 0) {
    delete pkg.devDependencies;
  }

  if (changed) {
    writeJson("package.json", pkg);
    console.log("[verify-runtime-dependencies] Updated package.json runtime dependency placement");
  }

  return changed;
}

function collectFailures() {
  const pkg = readJson("package.json");
  const lock = readJson("package-lock.json");

  const dependencies = pkg.dependencies || {};
  const devDependencies = pkg.devDependencies || {};
  const lockRootDependencies = lock.packages?.[""]?.dependencies || {};
  const failures = [];

  for (const dependency of Object.keys(requiredRuntimeDependencies)) {
    if (!dependencies[dependency]) {
      failures.push(`${dependency} must be listed in package.json dependencies`);
    }

    if (devDependencies[dependency]) {
      failures.push(`${dependency} must not be listed in package.json devDependencies`);
    }

    if (!lockRootDependencies[dependency]) {
      failures.push(`${dependency} must be listed in package-lock.json root dependencies`);
    }

    if (!lock.packages?.[`node_modules/${dependency}`]) {
      failures.push(`${dependency} must have a package-lock.json node_modules entry`);
    }
  }

  return failures;
}

if (shouldFix) {
  const packageJsonChanged = syncPackageJson();

  if (packageJsonChanged || collectFailures().length > 0) {
    execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
      stdio: "inherit",
    });
  }
}

const failures = collectFailures();

if (failures.length > 0) {
  console.error("[verify-runtime-dependencies] Runtime dependency placement is invalid:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[verify-runtime-dependencies] OK");
