"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";

// The web app is a single-page app with no URL routing, so the browser history
// stack holds one entry — any Back gesture/button pops straight out of the app
// (on an installed iOS/Android PWA this quits it entirely). This handler keeps
// a synthetic history entry in place and, on Back, unwinds the app's own
// navigation in priority order instead of leaving:
//   player → details → non-home tab → (root) double-press to exit.
export function BackHandler() {
  const {
    view,
    section,
    setSection,
    selected,
    closeDetails,
    activeStream,
    closePlayer,
    setToast
  } = useApp();

  // Keep the latest state in a ref so the single popstate listener always sees
  // current values without re-subscribing on every render.
  const stateRef = useRef({ view, section, selected: Boolean(selected), activeStream: Boolean(activeStream) });
  stateRef.current = { view, section, selected: Boolean(selected), activeStream: Boolean(activeStream) };

  const actionsRef = useRef({ setSection, closeDetails, closePlayer, setToast });
  actionsRef.current = { setSection, closeDetails, closePlayer, setToast };

  const exitArmedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    // Seed a guard entry so the first Back has something to pop instead of the
    // page itself. We always re-push after handling so one guard entry remains.
    const pushGuard = () => {
      try {
        window.history.pushState({ arvioGuard: true }, "");
      } catch {
        /* history API unavailable — nothing we can do */
      }
    };
    pushGuard();

    const onPopState = () => {
      const { view: v, section: s, selected: hasDetails, activeStream: hasPlayer } = stateRef.current;
      const { setSection: setSec, closeDetails: closeDet, closePlayer: closePlay, setToast: toast } = actionsRef.current;

      // Only manage Back inside the main app; login/profile screens keep native
      // behavior (their own back navigation is intentional).
      if (v !== "app") {
        return;
      }

      // 1) Player overlay open → close it, stay in app.
      if (hasPlayer) {
        closePlay();
        exitArmedRef.current = false;
        pushGuard();
        return;
      }
      // 2) Details drawer open → close it.
      if (hasDetails) {
        closeDet();
        exitArmedRef.current = false;
        pushGuard();
        return;
      }
      // 3) On a non-home tab → go home.
      if (s !== "home") {
        setSec("home");
        exitArmedRef.current = false;
        pushGuard();
        return;
      }
      // 4) At the root (home, nothing open). Require a second Back within 2s to
      //    actually leave, so a single accidental swipe never quits the app.
      if (!exitArmedRef.current) {
        exitArmedRef.current = true;
        toast("Press back again to exit");
        pushGuard();
        window.setTimeout(() => {
          exitArmedRef.current = false;
        }, 2000);
        return;
      }
      // Second Back at root within the window → let it through (no re-push):
      // the guard entry is already consumed, so the next native pop exits.
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
