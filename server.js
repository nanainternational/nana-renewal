// server.js (entry)
// - Root is ESM ("type":"module").
// - Server bundle is built as CJS to avoid ESM bundling issues (dynamic require).
// - The bundle must be created during install/build, not during app startup.
import { existsSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const rootDir = dirname(fileURLToPath(import.meta.url));
const serverBundle = join(rootDir, "server", "index.cjs");

if (!existsSync(serverBundle)) {
  throw new Error(
    "server/index.cjs is missing. Run `npm run build:server` during the Render build step before starting the app.",
  );
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
