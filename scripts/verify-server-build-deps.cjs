#!/usr/bin/env node
const { createRequire } = require('module');

const requireFromRoot = createRequire(`${process.cwd()}/package.json`);
const requiredPackages = [
  'express',
  'cookie-parser',
  'jsonwebtoken',
  'pg',
  'jimp',
];

const missing = requiredPackages.filter((pkg) => {
  try {
    requireFromRoot.resolve(pkg);
    return false;
  } catch {
    return true;
  }
});

if (missing.length) {
  console.error('[verify-server-build-deps] Missing root server dependencies:');
  for (const pkg of missing) console.error(`- ${pkg}`);
  console.error('Run `npm install` from the repository root before `npm run build:server`.');
  process.exit(1);
}

console.log('[verify-server-build-deps] OK');
