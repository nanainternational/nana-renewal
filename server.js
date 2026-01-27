// server.js (entry)
// - Root is ESM("type":"module")
// - Server bundle is built as CJS to avoid ESM bundling issues (dynamic require)
import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("./server/index.cjs");
