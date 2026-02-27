const fs = require('fs');
const path = require('path');

const target = path.resolve(process.cwd(), 'server', 'routes.ts');
const src = fs.readFileSync(target, 'utf8');

const checks = [
  'function shiftSheetRowsDown(',
  'function cloneTemplateRowInSheetXml(',
  'function cloneMergeCellsForRowInSheetXml(',
];

let failed = false;
for (const token of checks) {
  const count = src.split(token).length - 1;
  if (count !== 1) {
    failed = true;
    console.error(`[verify-routes-helper-uniqueness] Expected exactly 1 declaration for: ${token}. Found: ${count}`);
  }
}

if (failed) process.exit(1);
console.log('[verify-routes-helper-uniqueness] OK');
