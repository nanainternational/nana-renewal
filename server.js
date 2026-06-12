// server.js (entry)
// - Root is ESM ("type":"module").
// - Server bundle is built as CJS to avoid ESM bundling issues (dynamic require).
// - Render can sometimes start the app after a client-only build. In that case,
//   build the server bundle once before requiring it so startup does not fail
//   with a bare MODULE_NOT_FOUND for ./server/index.cjs.
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const rootDir = dirname(fileURLToPath(import.meta.url));
const serverBundle = join(rootDir, "server", "index.cjs");

if (!existsSync(serverBundle)) {
  console.warn("server/index.cjs not found. Building the server bundle before startup...");
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  try {
    execFileSync(npmCommand, ["run", "build:server"], {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "production" },
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to build server/index.cjs before startup.");
    throw error;
  }
}

try {
  require(serverBundle);
} catch (error) {
  if (error && error.code === "MODULE_NOT_FOUND") {
    console.error("Failed to load the server bundle or one of its runtime dependencies.");
    console.error(error.message);
  }
  throw error;
}
