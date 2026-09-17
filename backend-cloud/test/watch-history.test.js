import assert from "node:assert/strict";
import test from "node:test";
import { isValidWatchHistoryIdentity } from "../src/watch-history.js";

test("accepts positive TMDB watch-history IDs", () => {
  assert.equal(
    isValidWatchHistoryIdentity({ media_type: "movie", show_tmdb_id: 123 }),
    true,
  );
});

test("accepts stable negative IDs only for Xtream VOD", () => {
  assert.equal(
    isValidWatchHistoryIdentity({
      media_type: "tv",
      show_tmdb_id: -123,
      stream_addon_id: "iptv_xtream_vod",
    }),
    true,
  );
  assert.equal(
    isValidWatchHistoryIdentity({
      media_type: "movie",
      show_tmdb_id: -123,
      stream_addon_id: "other_addon",
    }),
    false,
  );
});

test("rejects zero and incomplete watch-history identities", () => {
  assert.equal(
    isValidWatchHistoryIdentity({
      media_type: "movie",
      show_tmdb_id: 0,
      stream_addon_id: "iptv_xtream_vod",
    }),
    false,
  );
  assert.equal(isValidWatchHistoryIdentity({ show_tmdb_id: 123 }), false);
});
