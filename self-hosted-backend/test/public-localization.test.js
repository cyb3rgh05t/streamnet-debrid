import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("account pages localize raw backend errors", async () => {
  const [accountPage, deletionPage] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/delete-account.html", import.meta.url), "utf8"),
  ]);

  assert.match(accountPage, /function localizeApiError/);
  assert.match(accountPage, /E-Mail-Adresse oder Passwort ist falsch/);
  assert.match(deletionPage, /function localizeApiError/);
  assert.match(deletionPage, /Gib zum Bestaetigen DELETE ein/);
});

test("Discord pages provide German authorization errors", async () => {
  const [startPage, callbackScript] = await Promise.all([
    readFile(new URL("../public/discord/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/discord/callback.js", import.meta.url), "utf8"),
  ]);

  assert.match(startPage, /Ungueltige Autorisierungsanfrage/);
  assert.match(callbackScript, /Autorisierung fehlgeschlagen/);
  assert.match(callbackScript, /TV konnte nicht benachrichtigt werden/);
});

test("public pages share the responsive StreamNet portal style", async () => {
  const pages = await Promise.all(
    [
      "../public/privacy.html",
      "../public/delete-account.html",
      "../public/discord/index.html",
      "../public/discord/callback.html",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

  for (const page of pages) {
    assert.match(page, /streamnet-club-logo\.svg/);
    assert.match(page, /linear-gradient\(160deg, var\(--bg-1\)/);
    assert.match(page, /"Inter"/);
    assert.match(page, /@media \(max-width:/);
  }

  assert.match(pages[0], /overflow-x: auto/);
  assert.match(pages[0], /streamnet:lang/);
  assert.match(pages[1], /streamnet:lang/);
});

test("admin dashboard keeps secrets in session scope and renders untrusted data as text", async () => {
  const [page, script, stylesheet] = await Promise.all([
    readFile(new URL("../public/admin.html", import.meta.url), "utf8"),
    readFile(new URL("../public/admin.js", import.meta.url), "utf8"),
    readFile(new URL("../public/admin.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /noindex,nofollow,noarchive/);
  assert.match(page, /\/admin\/admin\.js/);
  assert.match(script, /sessionStorage/);
  assert.doesNotMatch(script, /localStorage|innerHTML/);
  assert.match(script, /textContent/);
  assert.match(stylesheet, /@media \(max-width: 720px\)/);
});
