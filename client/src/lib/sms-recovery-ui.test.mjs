import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
test("recovery dialog is mounted outside tab-specific panels so bulk and device actions both open it", () => {
  const source = readFileSync(new URL("../pages/CustomerManagement.tsx", import.meta.url), "utf8");
  const file = ts.createSourceFile("CustomerManagement.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let dialog;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(file) === "Dialog" && node.attributes.getText(file).includes("recoveryDevice")) dialog = node;
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(dialog, "Recovery dialog must exist");
  for (let parent = dialog.parent; parent; parent = parent.parent) {
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
      assert.doesNotMatch(parent.left.getText(file), /\btab\s*===/, "Recovery dialog must be accessible from every tab");
  }
});

