// Game-controller navigation (HTPC mode). An Xbox/PlayStation pad drives the
// whole app the way Plex HTPC does: the D-pad / left stick move focus through
// the existing spatial-navigation layer (tvNav), A activates, B backs out, and
// the shoulder buttons seek inside the player.
//
// Browsers never turn gamepad input into key events, so this polls the Gamepad
// API each frame and translates state changes into the SAME synthetic keydowns
// tvNav and the player overlay already consume. Two subtleties drive the
// design:
//   - Synthetic (untrusted) key events run our JS handlers but never trigger
//     browser default actions — so "A" cannot be a synthetic Enter on a
//     focused button; it calls element.click() directly.
//   - Events are dispatched on document.activeElement (bubbling to window), so
//     tvNav's text-field guard sees the real target, exactly as with a
//     hardware keyboard.
//
// The poll loop only runs while a pad is connected and the tab is visible.

import { enterKbdNav } from "./hoverParity";
import { FOCUS_SELECTOR, playerIsOpen } from "./tvNav";

/** Standard-mapping button indices (w3c.github.io/gamepad/#remapping). */
const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  SELECT: 8,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
} as const;

/** Stick tilt below this is ignored — resting sticks drift. */
const DEADZONE = 0.5;
/** Hold a direction this long before it starts repeating… */
const REPEAT_DELAY_MS = 400;
/** …then repeat at this rate. Matches TV remote feel. */
const REPEAT_INTERVAL_MS = 110;

export type Intent =
  | "up"
  | "down"
  | "left"
  | "right"
  | "accept"
  | "back"
  | "playpause"
  | "fullscreen"
  | "seekBack"
  | "seekForward";

/** Which intents auto-repeat while held. Face buttons fire once per press. */
const REPEATING: ReadonlySet<Intent> = new Set([
  "up",
  "down",
  "left",
  "right",
  "seekBack",
  "seekForward",
]);

export type PadSnapshot = {
  buttons: boolean[];
  axes: number[];
};

export type IntentClock = Map<Intent, number>; // intent -> next allowed fire time

/** Read one gamepad into a plain snapshot (also what tests construct). */
export function snapshotPad(pad: Gamepad): PadSnapshot {
  return {
    buttons: pad.buttons.map((b) => b.pressed),
    axes: [...pad.axes],
  };
}

function wantsIntent(pads: PadSnapshot[], intent: Intent): boolean {
  const pressed = (index: number) => pads.some((p) => p.buttons[index] === true);
  const axis = (index: number) => pads.reduce((max, p) => {
    const v = p.axes[index] ?? 0;
    return Math.abs(v) > Math.abs(max) ? v : max;
  }, 0);
  switch (intent) {
    case "up": return pressed(BTN.DPAD_UP) || axis(1) < -DEADZONE;
    case "down": return pressed(BTN.DPAD_DOWN) || axis(1) > DEADZONE;
    case "left": return pressed(BTN.DPAD_LEFT) || axis(0) < -DEADZONE;
    case "right": return pressed(BTN.DPAD_RIGHT) || axis(0) > DEADZONE;
    case "accept": return pressed(BTN.A);
    case "back": return pressed(BTN.B) || pressed(BTN.SELECT);
    case "playpause": return pressed(BTN.X);
    case "fullscreen": return pressed(BTN.Y);
    case "seekBack": return pressed(BTN.LB);
    case "seekForward": return pressed(BTN.RB);
  }
}

const ALL_INTENTS: readonly Intent[] = [
  "up", "down", "left", "right",
  "accept", "back", "playpause", "fullscreen",
  "seekBack", "seekForward",
];

/**
 * Pure core: given current pad state, the per-intent repeat clock and "now",
 * return the intents that fire THIS frame and update the clock. Kept free of
 * DOM access so it can be exercised without a physical controller.
 */
export function computeFiredIntents(
  pads: PadSnapshot[],
  clock: IntentClock,
  now: number
): Intent[] {
  const fired: Intent[] = [];
  for (const intent of ALL_INTENTS) {
    if (!wantsIntent(pads, intent)) {
      clock.delete(intent);
      continue;
    }
    const nextAt = clock.get(intent);
    if (nextAt === undefined) {
      // Rising edge: fire immediately, arm the initial repeat delay.
      fired.push(intent);
      clock.set(intent, now + REPEAT_DELAY_MS);
    } else if (REPEATING.has(intent) && now >= nextAt) {
      fired.push(intent);
      clock.set(intent, now + REPEAT_INTERVAL_MS);
    }
    // Held non-repeating intents stay armed but silent until released.
  }
  return fired;
}

function dispatchKey(key: string) {
  const target = document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

function isTextField(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement
    && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

/**
 * Step a focused <select> the way its native picker would. Untrusted arrow
 * events never run the browser's option-change default action, so without
 * this a select is a dead end for a controller.
 */
function stepSelect(select: HTMLSelectElement, delta: number) {
  const options = Array.from(select.options);
  let index = select.selectedIndex;
  do {
    index += delta;
  } while (options[index] && options[index].disabled);
  if (index < 0 || index >= options.length || index === select.selectedIndex) return;
  select.selectedIndex = index;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function activate() {
  const el = document.activeElement;
  // While the player overlay covers the app, focus can still sit on the
  // (hidden) control that launched playback — clicking it would restart the
  // stream. A during playback means play/pause on every HTPC player.
  const overlay = document.querySelector(".player-overlay");
  if (overlay && !(el && overlay.contains(el))) {
    dispatchKey(" ");
    return;
  }
  if (el instanceof HTMLElement && el.matches(FOCUS_SELECTOR)) {
    // An untrusted click() on a target="_blank" anchor is popup-blocked
    // (needs user activation, which pads never mint) — navigate in place.
    if (el instanceof HTMLAnchorElement && el.target === "_blank" && el.href) {
      window.location.href = el.href;
      return;
    }
    // A synthetic Enter would reach our handlers but never the browser's
    // default button activation — click() is the reliable path.
    el.click();
    return;
  }
  dispatchKey("Enter");
}

function goBack() {
  const el = document.activeElement;
  // First press frees a focused field; the next one navigates.
  if (isTextField(el) || el instanceof HTMLSelectElement) {
    el.blur();
    return;
  }
  // Layers that consume Escape (player, dialogs) get it. Everything else —
  // details drawer, non-home tabs, double-press exit — lives in BackHandler's
  // popstate ladder, which a synthetic Escape can never reach.
  if (playerIsOpen() || document.querySelector('[role="dialog"]')) {
    dispatchKey("Escape");
    return;
  }
  window.history.back();
}

export function fireIntent(intent: Intent) {
  // A controller can't hover; every pad input keeps hover-parity mode lit.
  enterKbdNav();
  // A focused <select> owns up/down (value stepping); left/right fall through
  // to spatial navigation so the pad can leave it.
  const active = document.activeElement;
  if (active instanceof HTMLSelectElement && (intent === "up" || intent === "down")) {
    stepSelect(active, intent === "down" ? 1 : -1);
    return;
  }
  switch (intent) {
    case "up": dispatchKey("ArrowUp"); break;
    case "down": dispatchKey("ArrowDown"); break;
    case "left": dispatchKey("ArrowLeft"); break;
    case "right": dispatchKey("ArrowRight"); break;
    case "accept": activate(); break;
    case "back": goBack(); break;
    // The player overlay's keydown handler owns these when it is open;
    // outside the player, space and "f" are harmless no-ops…
    case "playpause": dispatchKey(" "); break;
    case "fullscreen": dispatchKey("f"); break;
    // …but the seek arrows would double as left/right navigation, so the
    // shoulder buttons only act inside the player.
    case "seekBack": if (playerIsOpen()) dispatchKey("ArrowLeft"); break;
    case "seekForward": if (playerIsOpen()) dispatchKey("ArrowRight"); break;
  }
}

let installed = false;
let rafId = 0;
// Indices, not a counter: the initial scan and the gamepadconnected event can
// both observe the same pad (Blink even dispatches the event synchronously
// from addEventListener), and a double-counted pad would keep the poll loop
// alive forever after disconnect. Set.add is idempotent.
const padIndices = new Set<number>();
const clock: IntentClock = new Map();

// Only standard-mapping pads: wheels, HOTAS sticks and pedals report mapping
// "" with scrambled button indices, and their throttle axes REST beyond the
// deadzone — polling one would machine-gun navigation without any input.
function isUsablePad(pad: Gamepad | null): pad is Gamepad {
  return pad !== null && pad.connected && pad.mapping === "standard";
}

function poll() {
  rafId = 0;
  if (padIndices.size === 0 || document.hidden) return;
  const pads: PadSnapshot[] = [];
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (isUsablePad(pad)) pads.push(snapshotPad(pad));
  }
  for (const intent of computeFiredIntents(pads, clock, performance.now())) {
    fireIntent(intent);
  }
  rafId = requestAnimationFrame(poll);
}

function startLoop() {
  if (rafId === 0 && padIndices.size > 0 && !document.hidden) rafId = requestAnimationFrame(poll);
}

function stopLoop() {
  if (rafId !== 0) cancelAnimationFrame(rafId);
  rafId = 0;
  clock.clear();
}

export function installGamepadNav() {
  if (installed || typeof window === "undefined" || !("getGamepads" in navigator)) return;
  installed = true;
  window.addEventListener("gamepadconnected", (event) => {
    const pad = (event as GamepadEvent).gamepad;
    if (!pad || pad.mapping !== "standard") return;
    padIndices.add(pad.index);
    startLoop();
  });
  window.addEventListener("gamepaddisconnected", (event) => {
    const pad = (event as GamepadEvent).gamepad;
    if (pad) padIndices.delete(pad.index);
    if (padIndices.size === 0) stopLoop();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else startLoop();
  });
  // A pad connected before page load fires no event until its first input in
  // some browsers; a cheap initial scan catches the already-connected case.
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (isUsablePad(pad)) padIndices.add(pad.index);
  }
  startLoop();
}
