import type {
  PresentationProfile,
  RehearsalBaseline,
  TrackingFrameSample,
} from "./types";

const STORAGE_KEY = "flickey.presentation-profile.v1";

export const DEFAULT_PROFILE: PresentationProfile = {
  id: "default",
  name: "나의 발표",
  app: "google-slides",
  mappings: {
    "next-slide": "swipe-right",
    "previous-slide": "swipe-left",
    "black-screen": "open-palm",
    "exit-presentation": "fist",
    "resource-1": "victory",
    "resource-2": "index",
  },
  resources: [
    { id: "resource-1", name: "자료 1", kind: "url", value: "" },
    { id: "resource-2", name: "자료 2", kind: "file", value: "" },
  ],
};

export function loadProfile(): PresentationProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(saved) } as PresentationProfile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: PresentationProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function analyzeRehearsal(
  samples: TrackingFrameSample[],
  durationMs: number,
): RehearsalBaseline | null {
  const hands = samples.flatMap((sample) => sample.hands);
  if (!hands.length) return null;

  const leftCount = hands.filter((hand) => hand.handedness === "Left").length;
  const rightCount = hands.length - leftCount;
  const xs = hands.map((hand) => hand.wrist.x);
  const ys = hands.map((hand) => hand.wrist.y);
  const poseFrequency = {
    index: 0,
    victory: 0,
    "open-palm": 0,
    fist: 0,
  };
  for (const hand of hands) {
    if (hand.pose !== "other") poseFrequency[hand.pose] += 1;
  }
  for (const pose of Object.keys(poseFrequency) as Array<
    keyof typeof poseFrequency
  >) {
    poseFrequency[pose] = poseFrequency[pose] / hands.length;
  }

  let distance = 0;
  let transitions = 0;
  const previous = new Map<string, { x: number; y: number }>();
  for (const sample of samples) {
    for (const hand of sample.hands) {
      const last = previous.get(hand.handedness);
      if (last) {
        distance += Math.hypot(hand.wrist.x - last.x, hand.wrist.y - last.y);
        transitions += 1;
      }
      previous.set(hand.handedness, hand.wrist);
    }
  }

  return {
    completedAt: new Date().toISOString(),
    durationMs,
    frameCount: samples.length,
    dominantHand:
      Math.abs(leftCount - rightCount) < hands.length * 0.12
        ? "Balanced"
        : leftCount > rightCount
          ? "Left"
          : "Right",
    activityBounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    },
    poseFrequency,
    averageSpeed: transitions ? distance / transitions : 0,
  };
}

export function conflictLevel(
  baseline: RehearsalBaseline | undefined,
  gesture: PresentationProfile["mappings"][keyof PresentationProfile["mappings"]],
) {
  if (!baseline) return "미측정";
  if (gesture === "swipe-left" || gesture === "swipe-right") {
    return baseline.averageSpeed > 0.025 ? "주의" : "안전";
  }
  const frequency = baseline.poseFrequency[gesture];
  if (frequency >= 0.24) return "위험";
  if (frequency >= 0.08) return "주의";
  return "안전";
}
