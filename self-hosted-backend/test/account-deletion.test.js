import assert from "node:assert/strict";
import test from "node:test";
import { deleteAccountData } from "../src/account-deletion.js";

test("deletes all account-linked and email-linked data", async () => {
  const queries = [];
  const client = {
    async query(text, values) {
      queries.push({ text, values });
      return text.includes("returning id")
        ? { rows: [{ id: "account-1" }] }
        : { rows: [] };
    },
  };

  await deleteAccountData(client, {
    id: "account-1",
    email_normalized: "owner@example.com",
  });

  assert.deepEqual(queries, [
    {
      text: "delete from tv_device_auth_sessions where account_id = $1",
      values: ["account-1"],
    },
    {
      text: "delete from app_usage_events where account_id = $1 or lower(email) = $2",
      values: ["account-1", "owner@example.com"],
    },
    {
      text: "delete from accounts where id = $1 returning id",
      values: ["account-1"],
    },
  ]);
});

test("fails instead of reporting success when no account was deleted", async () => {
  const client = { query: async () => ({ rows: [] }) };

  await assert.rejects(
    deleteAccountData(client, {
      id: "missing-account",
      email_normalized: "missing@example.com",
    }),
    /did not remove the account/,
  );
});
