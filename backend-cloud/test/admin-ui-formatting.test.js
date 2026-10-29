import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/admin.js", import.meta.url), "utf8");
const context = vm.createContext({});
for (const name of ["formatBytes", "formatAuditOperation"]) {
  const definition = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(definition, `Missing ${name}`);
  vm.runInContext(definition[0], context);
}

test("memory formatting uses readable units and German decimals", () => {
  for (const [bytes, expected] of [
    [0, "0 B"], [1024, "1 KB"], [116.4 * 1024 ** 2, "116,4 MB"],
    [118921.4 * 1024 ** 2, "116,1 GB"], [128719.4 * 1024 ** 2, "125,7 GB"],
    [1024 ** 4, "1 TB"],
  ]) {
    assert.equal(context.formatBytes(bytes), expected);
  }
});

test("audit operation labels are readable and retain global scope", () => {
  assert.equal(context.formatAuditOperation("clear_streamnet_host_override"), "StreamNet-TV-Server zurückgesetzt");
  assert.equal(context.formatAuditOperation("change_streamnet_host"), "StreamNet-TV-Server geändert");
  assert.equal(context.formatAuditOperation("global_add_catalog"), "Global: Katalog hinzugefügt / aktualisiert");
  assert.equal(context.formatAuditOperation("global_set_catalog_enabled"), "Global: Katalogaktivierung geändert");
  assert.equal(context.formatAuditOperation("revoke_sessions"), "Alle Logins widerrufen");
  assert.equal(context.formatAuditOperation("unknown_operation"), "unknown_operation");
  assert.equal(context.formatAuditOperation("global_future_operation"), "global_future_operation");
  assert.equal(context.formatAuditOperation("constructor"), "constructor");
  assert.equal(context.formatAuditOperation(null), null);
});
