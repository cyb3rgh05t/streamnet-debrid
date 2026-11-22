export type HomeTipId = "rows" | "addons" | "live_tv" | "cloud";

export const HOME_TIP_ORDER: HomeTipId[] = ["rows", "addons", "live_tv", "cloud"];

export interface HomeTipsState {
  dismissed: string[];
}

export const HOME_TIPS_KEY = "streamnet.homeTips.v1";

// The next tip to show, or null. Closed tips stay closed; the add-on and Live TV
// tips only appear while they still apply.
export function selectHomeTip(
  state: HomeTipsState,
  context: { hasUserAddon: boolean; hasIptvSource: boolean },
): HomeTipId | null {
  return (
    HOME_TIP_ORDER.find((tip) => {
      if (state.dismissed.includes(tip)) return false;
      if (tip === "addons") return !context.hasUserAddon;
      if (tip === "live_tv") return !context.hasIptvSource;
      return true;
    }) ?? null
  );
}
