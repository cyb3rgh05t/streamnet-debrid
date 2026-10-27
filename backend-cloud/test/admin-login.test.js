import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { registerAdminRoutes } from "../src/admin-routes.js";
import { normalizeAdminUsername } from "../src/admin-username.js";
import { hashScryptPassword } from "../src/passwords.js";

const key = new TextEncoder().encode("test-admin-key-not-for-production");

test("admin usernames are normalized and emails are rejected", () => {
  assert.equal(normalizeAdminUsername("  Admin  "), "admin");
  assert.equal(normalizeAdminUsername("cyb3r.ghost_01-x"), "cyb3r.ghost_01-x");
  assert.equal(normalizeAdminUsername("admin@example.com"), null);
  assert.equal(normalizeAdminUsername("ab"), null);
  assert.equal(normalizeAdminUsername("-admin"), null);
  assert.equal(normalizeAdminUsername("admin."), null);
  assert.equal(normalizeAdminUsername("a b c"), null);
  assert.equal(normalizeAdminUsername("a".repeat(65)), null);
  assert.equal(normalizeAdminUsername(""), null);
  assert.equal(normalizeAdminUsername(undefined), null);
});

test("admin login accepts a username and rejects an email", async (t) => {
  const passwordHash = await hashScryptPassword("a-long-test-password");
  const lookups = [];
  const pool = {
    async query(sql, values) {
      if (sql.includes("from admin_accounts") && sql.includes("password_hash")) {
        lookups.push(values[0]);
        return values[0] === "boss"
          ? { rows: [{ id: "admin-1", email: "boss", email_normalized: "boss", password_hash: passwordHash }] }
          : { rows: [] };
      }
      return { rows: [] };
    },
  };
  const app = Fastify();
  registerAdminRoutes(app, { pool, jwtKey: key, publicDirectory: "" });
  t.after(() => app.close());
  const login = (body) =>
    app.inject({ method: "POST", url: "/admin-api/login", payload: body });

  const ok = await login({ username: " Boss ", password: "a-long-test-password" });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().admin.username, "boss");
  assert.ok(ok.json().access_token);
  assert.deepEqual(lookups, ["boss"]);

  const wrongPassword = await login({ username: "boss", password: "wrong-password-123" });
  assert.equal(wrongPassword.statusCode, 401);

  const emailLogin = await login({ username: "boss@example.com", password: "a-long-test-password" });
  assert.equal(emailLogin.statusCode, 401);
  const legacyField = await login({ email: "boss", password: "a-long-test-password" });
  assert.equal(legacyField.statusCode, 401);
  assert.deepEqual(lookups, ["boss", "boss"]);
});
