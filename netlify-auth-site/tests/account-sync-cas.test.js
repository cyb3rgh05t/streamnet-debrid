const assert = require("node:assert/strict");
const test = require("node:test");

const { _test } = require("../netlify/functions/_backend");

class FakeSnapshotClient {
  constructor() {
    this.row = null;
  }

  async query(sql, params) {
    if (sql.includes("SELECT payload")) {
      return { rows: this.row ? [structuredClone(this.row)] : [] };
    }
    if (sql.includes("INSERT INTO public.account_sync_snapshots")) {
      this.row = {
        payload: JSON.parse(params[1]),
        payload_version: params[2],
        restore_rank: params[3],
        profile_count: params[4],
        scoped_coverage: params[5],
        payload_updated_at: params[6],
        source: params[7],
        revision: params[8],
        updated_at: "2026-08-17T10:00:00.000Z",
      };
      return { rows: [structuredClone(this.row)] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }
}

test("account snapshot compare-and-set rejects stale revisions", async () => {
  const client = new FakeSnapshotClient();
  const compareAndSet = _test.compareAndSetDatabaseSnapshot;

  const first = await compareAndSet(client, "account-1", { payload: { value: "first" } }, 0);
  assert.equal(first.saved, true);
  assert.equal(first.snapshot.revision, 1);

  const second = await compareAndSet(client, "account-1", { payload: { value: "second" } }, 1);
  assert.equal(second.saved, true);
  assert.equal(second.snapshot.revision, 2);

  const stale = await compareAndSet(client, "account-1", { payload: { value: "stale" } }, 1);
  assert.equal(stale.saved, false);
  assert.equal(stale.current.revision, 2);
  assert.deepEqual(stale.current.payload, { value: "second" });
  assert.deepEqual(client.row.payload, { value: "second" });
});