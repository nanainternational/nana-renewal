const fs = require("fs");

const runtimeDependencies = [
  "express",
  "cookie-parser",
  "jsonwebtoken",
  "pg",
  "firebase-admin",
  "playwright",
  "jimp",
  "drizzle-orm",
  "drizzle-zod",
  "zod",
];

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));

const dependencies = pkg.dependencies || {};
const devDependencies = pkg.devDependencies || {};
const lockRootDependencies = lock.packages?.[""]?.dependencies || {};

const failures = [];

for (const dependency of runtimeDependencies) {
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

if (failures.length > 0) {
  console.error("[verify-runtime-dependencies] Runtime dependency placement is invalid:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[verify-runtime-dependencies] OK");
