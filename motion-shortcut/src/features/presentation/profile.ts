import { GESTURE_OPTIONS, type PresentationAction, type PresentationProfile } from "./types";

const STORAGE_KEY = "flickey.presentation-profile.v1";

export const FIXED_MAPPINGS: PresentationProfile["mappings"] = {
  "next-slide": "swipe-right",
  "previous-slide": "swipe-left",
  "black-screen": "open-palm",
  "exit-presentation": "fist",
  "resource-1": "victory",
  "resource-2": "index",
};

export const DEFAULT_PROFILE: PresentationProfile = {
  id: "default",
  name: "나의 발표",
  app: "google-slides",
  presentationUrl: "",
  mappings: FIXED_MAPPINGS,
  shortcuts: {},
  resources: [
    { id: "resource-1", name: "자료 1", kind: "url", value: "" },
    { id: "resource-2", name: "자료 2", kind: "url", value: "" },
  ],
};

// Resource gestures are handled separately by the controller and remain reserved.
function normalizeMappings(saved: unknown): PresentationProfile["mappings"] {
  const mappings = { ...FIXED_MAPPINGS };
  const used = new Set(["victory", "index"]);
  const values = saved && typeof saved === "object" ? saved as Record<string, unknown> : {};
  const actions: PresentationAction[] = ["next-slide", "previous-slide", "black-screen", "exit-presentation"];
  for (const action of actions) {
    const value = values[action];
    const gesture = value === "" || GESTURE_OPTIONS.some((option) => option.id === value)
      ? value as PresentationProfile["mappings"][PresentationAction]
      : FIXED_MAPPINGS[action];
    mappings[action] = gesture && used.has(gesture) ? "" : gesture;
    if (mappings[action]) used.add(mappings[action]);
  }
  return mappings;
}

export function loadProfile(): PresentationProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PROFILE;
    const parsed = JSON.parse(saved);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      shortcuts: parsed.shortcuts ?? {},
      resources: Array.isArray(parsed.resources)
        ? parsed.resources
            .filter((r: { kind?: string }) => r.kind === "url")
            .map((r: object) => ({ ...r, returnAfterMs: 0 }))
        : DEFAULT_PROFILE.resources,
      mappings: normalizeMappings(parsed.mappings),
    } as PresentationProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: PresentationProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
