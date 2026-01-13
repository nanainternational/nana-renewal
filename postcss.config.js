import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// client/node_modules 에 설치된 플러그인을 강제로 로드
const tailwindcss = require(path.resolve("client/node_modules/tailwindcss"));
const autoprefixer = require(path.resolve("client/node_modules/autoprefixer"));

export default {
  plugins: [tailwindcss, autoprefixer],
};
