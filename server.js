// server.js (entry)
// - Root is ESM ("type":"module").
// - Server bundle is built as CJS to avoid ESM bundling issues (dynamic require).
// - The bundle must be created during install/build, not during app startup.
import { existsSync } from "fs";
import { createRequire } from "module";
import { execFileSync } from "child_process";

const require = createRequire(import.meta.url);

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

function missingRuntimeDependencies() {
  return runtimeDependencies.filter((dependency) => {
    try {
      require.resolve(dependency);
      return false;
    } catch {
      return true;
    }
  });
}

let missing = missingRuntimeDependencies();
if (missing.length > 0) {
  console.warn(
    `[server.js] Missing runtime dependencies (${missing.join(", ")}); reinstalling production dependencies before startup.`,
  );
  execFileSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
    stdio: "inherit",
  });
  missing = missingRuntimeDependencies();
}

if (missing.length > 0) {
  throw new Error(`[server.js] Missing runtime dependencies after install: ${missing.join(", ")}`);
}

require("./server/index.cjs");
