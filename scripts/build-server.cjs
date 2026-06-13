const esbuild = require("esbuild");

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

const runtimeDependencyGuard = `
(() => {
  const { createRequire } = require("module");
  const { execFileSync } = require("child_process");
  const runtimeDependencies = ${JSON.stringify(runtimeDependencies)};
  const localRequire = createRequire(__filename);
  const missingRuntimeDependencies = () => runtimeDependencies.filter((dependency) => {
    try {
      localRequire.resolve(dependency);
      return false;
    } catch {
      return true;
    }
  });

  let missing = missingRuntimeDependencies();
  if (missing.length > 0) {
    console.warn("[server/index.cjs] Missing runtime dependencies (" + missing.join(", ") + "); reinstalling production dependencies before startup.");
    execFileSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], { stdio: "inherit" });
    missing = missingRuntimeDependencies();
  }

  if (missing.length > 0) {
    throw new Error("[server/index.cjs] Missing runtime dependencies after install: " + missing.join(", "));
  }
})();
`;

esbuild.buildSync({
  entryPoints: ["server/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "server/index.cjs",
  external: [
    ...runtimeDependencies,
    "drizzle-orm/*",
  ],
  banner: {
    js: runtimeDependencyGuard,
  },
});
