import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { type RefObject, useEffect, useRef, useState } from "react";
import type {
  GesturePattern,
  TrackingFrameSample,
} from "../presentation/types";

const CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

type TrackerState = "idle" | "loading" | "tracking" | "no-hand" | "error";
export type MotionGestureId = GesturePattern | "toggle-motion";

const GESTURE_LABELS: Record<MotionGestureId, string> = {
  "swipe-right": "오른쪽으로 밀기",
  "swipe-left": "왼쪽으로 밀기",
  index: "검지 하나",
  victory: "V 사인",
  "open-palm": "손바닥 펼치기",
  fist: "주먹 쥐기",
  "toggle-motion": "전화 모양",
};

const GESTURE_HOLD_MS = 1500;
const CURSOR_TOGGLE_HOLD_MS = 2000;

export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  petCanvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  color: string,
  onGesture: (gesture: MotionGestureId) => void,
  onCursorToggle?: () => void,
  onCursorMove?: (point: { x: number; y: number }) => void,
  onCursorClick?: () => void,
  cursorSensitivity = 1,
  onKeyboardToggle?: () => void,
  onKeyboardPointer?: (sample: {
    hand: "Left" | "Right";
    x: number;
    y: number;
    tap: boolean;
  }) => void,
  onKeyboardHands?: (
    hands: Array<{
      handedness: "Left" | "Right";
      landmarks: Array<{ x: number; y: number }>;
    }>,
  ) => void,
  onTrackingFrame?: (sample: TrackingFrameSample) => void,
) {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const smoothedRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const candidateRef = useRef<{ id: MotionGestureId | null; since: number }>({
    id: null,
    since: 0,
  });
  const triggeredRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const onGestureRef = useRef(onGesture);
  const onCursorToggleRef = useRef(onCursorToggle);
  const onCursorMoveRef = useRef(onCursorMove);
  const onCursorClickRef = useRef(onCursorClick);
  const onKeyboardToggleRef = useRef(onKeyboardToggle);
  const onKeyboardPointerRef = useRef(onKeyboardPointer);
  const onKeyboardHandsRef = useRef(onKeyboardHands);
  const onTrackingFrameRef = useRef(onTrackingFrame);
  const swipeHistoryRef = useRef<
    Record<"Left" | "Right", Array<{ x: number; y: number; at: number }>>
  >({ Left: [], Right: [] });
  const swipeCooldownRef = useRef(0);
  const cursorToggleRef = useRef({ since: 0, triggered: false });
  const keyboardToggleRef = useRef({ since: 0, triggered: false });
  const leftClickRef = useRef({ armedAt: 0, fist: false });
  const airTapRef = useRef<
    Record<
      "Left" | "Right",
      { minY: number; lastY: number; armed: boolean; cooldown: number }
    >
  >({
    Left: { minY: 1, lastY: 1, armed: true, cooldown: 0 },
    Right: { minY: 1, lastY: 1, armed: true, cooldown: 0 },
  });
  const [state, setState] = useState<TrackerState>("idle");
  const [confidence, setConfidence] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [gesture, setGesture] = useState<MotionGestureId | null>(null);

  useEffect(() => {
    onGestureRef.current = onGesture;
    onCursorToggleRef.current = onCursorToggle;
    onCursorMoveRef.current = onCursorMove;
    onCursorClickRef.current = onCursorClick;
    onKeyboardToggleRef.current = onKeyboardToggle;
    onKeyboardPointerRef.current = onKeyboardPointer;
    onKeyboardHandsRef.current = onKeyboardHands;
    onTrackingFrameRef.current = onTrackingFrame;
  }, [
    onCursorClick,
    onCursorMove,
    onCursorToggle,
    onGesture,
    onKeyboardPointer,
    onKeyboardHands,
    onKeyboardToggle,
    onTrackingFrame,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled) {
      clearCanvas(canvas);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setState("loading");
        if (!landmarkerRef.current) {
          const vision = await FilesetResolver.forVisionTasks(
            new URL("./mediapipe/wasm", document.baseURI).href,
          );
          const options = {
            baseOptions: {
              modelAssetPath: new URL(
                "./mediapipe/models/hand_landmarker.task",
                document.baseURI,
              ).href,
            },
            runningMode: "VIDEO" as const,
            numHands: 2,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
          };
          try {
            landmarkerRef.current = await HandLandmarker.createFromOptions(
              vision,
              {
                ...options,
                baseOptions: { ...options.baseOptions, delegate: "GPU" },
              },
            );
          } catch {
            landmarkerRef.current = await HandLandmarker.createFromOptions(
              vision,
              options,
            );
          }
        }
        if (!cancelled) detect();
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "손 추적 모델을 시작하지 못했습니다.",
          );
          setState("error");
        }
      }
    };

    const detect = () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (
        video &&
        canvas &&
        landmarker &&
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTimeRef.current
      ) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        const hand = result.landmarks[0];
        const score = result.handedness[0]?.[0]?.score ?? 0;
        if (hand) {
          const smoothed = hand.map((landmark, index) => {
            const previous = smoothedRef.current?.[index];
            return previous
              ? {
                  x: previous.x * 0.62 + landmark.x * 0.38,
                  y: previous.y * 0.62 + landmark.y * 0.38,
                }
              : { x: landmark.x, y: landmark.y };
          });
          smoothedRef.current = smoothed;
          const hands = [smoothed, ...result.landmarks.slice(1)];
          const trackedHands = hands.map((landmarks, index) => ({
            landmarks,
            handedness: result.handedness[index]?.[0]?.categoryName ?? "",
          }));
          drawHands(canvas, hands, video.videoWidth / video.videoHeight, color);
          if (petCanvasRef.current)
            drawHands(
              petCanvasRef.current,
              hands,
              video.videoWidth / video.videoHeight,
              color,
            );
          const now = performance.now();
          onTrackingFrameRef.current?.({
            timestamp: now,
            hands: trackedHands
              .filter(
                (tracked) =>
                  tracked.handedness === "Left" ||
                  tracked.handedness === "Right",
              )
              .map((tracked) => ({
                handedness: tracked.handedness as "Left" | "Right",
                wrist: {
                  x: 1 - tracked.landmarks[0].x,
                  y: tracked.landmarks[0].y,
                },
                pose: classifyStaticPose(tracked.landmarks),
              })),
          });
          const swipeGesture = detectSwipeGesture(
            trackedHands,
            now,
            swipeHistoryRef.current,
            swipeCooldownRef,
          );
          if (swipeGesture) onGestureRef.current(swipeGesture);
          const cursorToggleCandidate = isCrossedIndexGesture(hands);
          updateCursorToggle(
            cursorToggleCandidate,
            now,
            cursorToggleRef,
            onCursorToggleRef.current,
          );
          const moveHand = trackedHands.find(
            (tracked) =>
              tracked.handedness === "Right" &&
              (isCursorMovePose(tracked.landmarks) ||
                isIndexOnlyPose(tracked.landmarks)),
          )?.landmarks;
          if (moveHand && !cursorToggleCandidate) {
            const tip = {
              x: 1 - (moveHand[8].x + moveHand[12].x) / 2,
              y: (moveHand[8].y + moveHand[12].y) / 2,
            };
            onCursorMoveRef.current?.({
              x: applySensitivity(
                clamp((tip.x - 0.08) / 0.84),
                cursorSensitivity,
              ),
              y: applySensitivity(
                clamp((tip.y - 0.08) / 0.84),
                cursorSensitivity,
              ),
            });
          }
          const leftHand = trackedHands.find(
            (tracked) => tracked.handedness === "Left",
          )?.landmarks;
          const keyboardToggleCandidate = Boolean(
            leftHand && isKeyboardTogglePose(leftHand),
          );
          updateHeldToggle(
            keyboardToggleCandidate,
            now,
            1500,
            keyboardToggleRef,
            onKeyboardToggleRef.current,
          );
          onKeyboardHandsRef.current?.(
            trackedHands
              .filter(
                (tracked) =>
                  tracked.handedness === "Left" ||
                  tracked.handedness === "Right",
              )
              .map((tracked) => ({
                handedness: tracked.handedness as "Left" | "Right",
                landmarks: tracked.landmarks.map((landmark) => ({
                  x: applySensitivity(
                    clamp((1 - landmark.x - 0.08) / 0.84),
                    cursorSensitivity,
                  ),
                  y: applySensitivity(
                    clamp((landmark.y - 0.08) / 0.84),
                    cursorSensitivity,
                  ),
                })),
              })),
          );
          for (const tracked of trackedHands) {
            if (
              (tracked.handedness === "Left" ||
                tracked.handedness === "Right") &&
              fingerExtended(tracked.landmarks, 8, 6)
            ) {
              const point = {
                x: applySensitivity(
                  clamp((1 - tracked.landmarks[8].x - 0.08) / 0.84),
                  cursorSensitivity,
                ),
                y: applySensitivity(
                  clamp((tracked.landmarks[8].y - 0.08) / 0.84),
                  cursorSensitivity,
                ),
              };
              onKeyboardPointerRef.current?.({
                hand: tracked.handedness,
                ...point,
                tap: detectAirTap(
                  tracked.handedness,
                  point.y,
                  now,
                  airTapRef.current,
                ),
              });
            }
          }
          updateLeftHandClick(
            leftHand,
            cursorToggleCandidate || keyboardToggleCandidate,
            now,
            leftClickRef,
            onCursorClickRef.current,
          );
          const detectedGestures = hands.map(classifyGesture);
          const detected =
            cursorToggleCandidate || keyboardToggleCandidate
              ? null
              : swipeGesture
                ? null
                : detectedGestures.includes("toggle-motion")
                  ? "toggle-motion"
                  : hands.length === 1
                    ? (detectedGestures[0] ?? null)
                    : null;
          updateGestureCandidate(
            detected,
            now,
            candidateRef,
            triggeredRef,
            cooldownUntilRef,
            onGestureRef.current,
          );
          setGesture(detected);
          setState("tracking");
          setConfidence(Math.round(score * 100));
        } else {
          smoothedRef.current = null;
          swipeHistoryRef.current = { Left: [], Right: [] };
          cursorToggleRef.current = { since: 0, triggered: false };
          keyboardToggleRef.current = { since: 0, triggered: false };
          leftClickRef.current = { armedAt: 0, fist: false };
          candidateRef.current = { id: null, since: 0 };
          triggeredRef.current = false;
          setGesture(null);
          clearCanvas(canvas);
          clearCanvas(petCanvasRef.current);
          setState("no-hand");
          setConfidence(0);
        }
      }
      frameRef.current = requestAnimationFrame(detect);
    };

    void run();
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearCanvas(canvas);
    };
  }, [canvasRef, color, cursorSensitivity, enabled, petCanvasRef, videoRef]);

  return enabled
    ? {
        state,
        confidence,
        errorMessage,
        gesture,
        gestureLabel: gesture ? GESTURE_LABELS[gesture] : "",
      }
    : {
        state: "idle" as const,
        confidence: 0,
        errorMessage: "",
        gesture: null,
        gestureLabel: "",
      };
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function applySensitivity(value: number, sensitivity: number) {
  return clamp(0.5 + (value - 0.5) * sensitivity);
}

function detectAirTap(
  hand: "Left" | "Right",
  y: number,
  now: number,
  states: Record<
    "Left" | "Right",
    { minY: number; lastY: number; armed: boolean; cooldown: number }
  >,
) {
  const state = states[hand];
  if (state.lastY === 1) {
    state.minY = y;
    state.lastY = y;
    return false;
  }
  if (!state.armed && state.lastY - y > 0.018) {
    state.armed = true;
    state.minY = y;
  }
  if (state.armed) state.minY = Math.min(state.minY, y);
  const tapped = state.armed && now >= state.cooldown && y - state.minY > 0.042;
  if (tapped) {
    state.armed = false;
    state.cooldown = now + 320;
    state.minY = y;
  }
  state.lastY = y;
  return tapped;
}

function fingerExtended(
  landmarks: Array<{ x: number; y: number }>,
  tip: number,
  pip: number,
) {
  const wristDistance = (index: number) =>
    Math.hypot(
      landmarks[0].x - landmarks[index].x,
      landmarks[0].y - landmarks[index].y,
    );
  const palmScale = Math.max(wristDistance(9), 0.001);
  return wristDistance(tip) > wristDistance(pip) + palmScale * 0.16;
}

function isCursorMovePose(landmarks: Array<{ x: number; y: number }>) {
  const palmScale = Math.max(
    Math.hypot(
      landmarks[0].x - landmarks[9].x,
      landmarks[0].y - landmarks[9].y,
    ),
    0.001,
  );
  const tipsTogether =
    Math.hypot(
      landmarks[8].x - landmarks[12].x,
      landmarks[8].y - landmarks[12].y,
    ) <
    palmScale * 0.42;
  return (
    fingerExtended(landmarks, 8, 6) &&
    fingerExtended(landmarks, 12, 10) &&
    !fingerExtended(landmarks, 16, 14) &&
    !fingerExtended(landmarks, 20, 18) &&
    tipsTogether
  );
}

function isIndexOnlyPose(landmarks: Array<{ x: number; y: number }>) {
  return (
    fingerExtended(landmarks, 8, 6) &&
    !fingerExtended(landmarks, 12, 10) &&
    !fingerExtended(landmarks, 16, 14) &&
    !fingerExtended(landmarks, 20, 18)
  );
}

function isOpenHand(landmarks: Array<{ x: number; y: number }>) {
  return [8, 12, 16, 20].every((tip, index) =>
    fingerExtended(landmarks, tip, [6, 10, 14, 18][index]),
  );
}

function isFist(landmarks: Array<{ x: number; y: number }>) {
  return [8, 12, 16, 20].every(
    (tip, index) => !fingerExtended(landmarks, tip, [6, 10, 14, 18][index]),
  );
}

function isKeyboardTogglePose(landmarks: Array<{ x: number; y: number }>) {
  return (
    fingerExtended(landmarks, 8, 6) &&
    fingerExtended(landmarks, 12, 10) &&
    fingerExtended(landmarks, 16, 14) &&
    !fingerExtended(landmarks, 20, 18)
  );
}

function updateHeldToggle(
  detected: boolean,
  now: number,
  holdMs: number,
  stateRef: { current: { since: number; triggered: boolean } },
  onToggle?: () => void,
) {
  if (!detected) {
    stateRef.current = { since: 0, triggered: false };
    return;
  }
  if (!stateRef.current.since) stateRef.current.since = now;
  if (!stateRef.current.triggered && now - stateRef.current.since >= holdMs) {
    stateRef.current.triggered = true;
    onToggle?.();
  }
}

function updateLeftHandClick(
  landmarks: Array<{ x: number; y: number }> | undefined,
  blocked: boolean,
  now: number,
  stateRef: { current: { armedAt: number; fist: boolean } },
  onClick?: () => void,
) {
  if (!landmarks || blocked) {
    stateRef.current = { armedAt: 0, fist: false };
    return;
  }
  if (isOpenHand(landmarks)) {
    stateRef.current = { armedAt: now, fist: false };
    return;
  }
  const fist = isFist(landmarks);
  if (
    fist &&
    !stateRef.current.fist &&
    stateRef.current.armedAt > 0 &&
    now - stateRef.current.armedAt <= 3000
  ) {
    onClick?.();
    stateRef.current.armedAt = 0;
  }
  stateRef.current.fist = fist;
  if (stateRef.current.armedAt && now - stateRef.current.armedAt > 3000) {
    stateRef.current.armedAt = 0;
  }
}

function isCrossedIndexGesture(hands: Array<Array<{ x: number; y: number }>>) {
  if (hands.length < 2) return false;
  const [a, b] = hands;
  if (!fingerExtended(a, 8, 6) || !fingerExtended(b, 8, 6)) return false;
  if (
    fingerExtended(a, 12, 10) ||
    fingerExtended(b, 12, 10) ||
    fingerExtended(a, 16, 14) ||
    fingerExtended(b, 16, 14) ||
    fingerExtended(a, 20, 18) ||
    fingerExtended(b, 20, 18)
  )
    return false;

  const tipDistance = Math.hypot(a[8].x - b[8].x, a[8].y - b[8].y);
  const palmScale =
    (Math.hypot(a[0].x - a[9].x, a[0].y - a[9].y) +
      Math.hypot(b[0].x - b[9].x, b[0].y - b[9].y)) /
    2;
  const vectorA = { x: a[8].x - a[6].x, y: a[8].y - a[6].y };
  const vectorB = { x: b[8].x - b[6].x, y: b[8].y - b[6].y };
  const cross = Math.abs(vectorA.x * vectorB.y - vectorA.y * vectorB.x);
  const lengths = Math.max(
    Math.hypot(vectorA.x, vectorA.y) * Math.hypot(vectorB.x, vectorB.y),
    0.001,
  );
  return tipDistance < palmScale * 0.72 && cross / lengths > 0.42;
}

function updateCursorToggle(
  detected: boolean,
  now: number,
  stateRef: { current: { since: number; triggered: boolean } },
  onToggle?: () => void,
) {
  updateHeldToggle(detected, now, CURSOR_TOGGLE_HOLD_MS, stateRef, onToggle);
}

function classifyGesture(
  landmarks: Array<{ x: number; y: number }>,
): MotionGestureId | null {
  const distance = (a: number, b: number) =>
    Math.hypot(
      landmarks[a].x - landmarks[b].x,
      landmarks[a].y - landmarks[b].y,
    );
  const palmScale = Math.max(distance(0, 9), 0.001);
  const extended = (tip: number, pip: number) =>
    distance(0, tip) > distance(0, pip) + palmScale * 0.16;
  const index = extended(8, 6);
  const middle = extended(12, 10);
  const ring = extended(16, 14);
  const pinky = extended(20, 18);
  const thumb = distance(4, 9) > distance(3, 9) + palmScale * 0.12;
  const phoneSpread = distance(4, 20) > palmScale * 1.25;
  if (thumb && phoneSpread && !index && !middle && !ring && pinky)
    return "toggle-motion";
  if (index && middle && ring && pinky) return "open-palm";
  if (index && middle && !ring && !pinky) return "victory";
  if (index && !middle && !ring && !pinky) return "index";
  if (!index && !middle && !ring && !pinky) return "fist";
  return null;
}

function classifyStaticPose(
  landmarks: Array<{ x: number; y: number }>,
): TrackingFrameSample["hands"][number]["pose"] {
  const gesture = classifyGesture(landmarks);
  return gesture === "index" ||
    gesture === "victory" ||
    gesture === "open-palm" ||
    gesture === "fist"
    ? gesture
    : "other";
}

function detectSwipeGesture(
  hands: Array<{
    landmarks: Array<{ x: number; y: number }>;
    handedness: string;
  }>,
  now: number,
  histories: Record<
    "Left" | "Right",
    Array<{ x: number; y: number; at: number }>
  >,
  cooldownRef: { current: number },
): GesturePattern | null {
  for (const tracked of hands) {
    if (tracked.handedness !== "Left" && tracked.handedness !== "Right")
      continue;
    const history = histories[tracked.handedness];
    const wrist = tracked.landmarks[0];
    history.push({ x: 1 - wrist.x, y: wrist.y, at: now });
    while (history.length && now - history[0].at > 520) history.shift();
    if (now < cooldownRef.current || history.length < 4) continue;
    const first = history[0];
    const last = history[history.length - 1];
    const dx = last.x - first.x;
    const dy = Math.abs(last.y - first.y);
    if (Math.abs(dx) > 0.2 && dy < 0.12 && now - first.at < 520) {
      cooldownRef.current = now + 1600;
      histories.Left = [];
      histories.Right = [];
      return dx > 0 ? "swipe-right" : "swipe-left";
    }
  }
  return null;
}

function updateGestureCandidate(
  gesture: MotionGestureId | null,
  now: number,
  candidateRef: { current: { id: MotionGestureId | null; since: number } },
  triggeredRef: { current: boolean },
  cooldownUntilRef: { current: number },
  onGesture: (gesture: MotionGestureId) => void,
) {
  if (!gesture) {
    candidateRef.current = { id: null, since: 0 };
    triggeredRef.current = false;
    return;
  }
  if (candidateRef.current.id !== gesture) {
    candidateRef.current = { id: gesture, since: now };
    triggeredRef.current = false;
    return;
  }
  if (
    !triggeredRef.current &&
    now >= cooldownUntilRef.current &&
    now - candidateRef.current.since >= GESTURE_HOLD_MS
  ) {
    triggeredRef.current = true;
    cooldownUntilRef.current = now + 2500;
    onGesture(gesture);
  }
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
}

function drawHands(
  canvas: HTMLCanvasElement,
  hands: Array<Array<{ x: number; y: number }>>,
  sourceRatio: number,
  color: string,
) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scale = window.devicePixelRatio || 1;
  if (canvas.width !== width * scale || canvas.height !== height * scale) {
    canvas.width = width * scale;
    canvas.height = height * scale;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, width, height);
  hands.forEach((landmarks) =>
    drawSingleHand(context, width, height, landmarks, sourceRatio, color),
  );
}

function drawSingleHand(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: Array<{ x: number; y: number }>,
  sourceRatio: number,
  color: string,
) {
  const canvasRatio = width / height;
  const drawnWidth = canvasRatio > sourceRatio ? width : height * sourceRatio;
  const drawnHeight = canvasRatio > sourceRatio ? width / sourceRatio : height;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  const point = (index: number) => ({
    x: offsetX + (1 - landmarks[index].x) * drawnWidth,
    y: offsetY + landmarks[index].y * drawnHeight,
  });

  context.save();
  context.lineCap = "round";
  context.shadowColor = color;
  context.shadowBlur = 12;
  const palm = [0, 5, 9, 13, 17].map(point);
  const minX = Math.min(...palm.map((p) => p.x));
  const maxX = Math.max(...palm.map((p) => p.x));
  const minY = Math.min(...palm.map((p) => p.y));
  const maxY = Math.max(...palm.map((p) => p.y));
  for (let y = minY; y <= maxY; y += 7) {
    for (let x = minX; x <= maxX; x += 7) {
      if (!insidePolygon(x, y, palm)) continue;
      context.beginPath();
      context.arc(x, y, 1.1, 0, Math.PI * 2);
      context.globalAlpha = 0.48;
      context.fillStyle = color;
      context.fill();
    }
  }
  for (const [from, to] of CONNECTIONS) {
    const a = point(from);
    const b = point(to);
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.globalAlpha = 0.55;
    context.strokeStyle = color;
    context.lineWidth = 2.2;
    context.stroke();
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const dots = Math.max(2, Math.floor(distance / 7));
    for (let i = 0; i <= dots; i += 1) {
      const ratio = i / dots;
      context.beginPath();
      context.arc(
        a.x + (b.x - a.x) * ratio,
        a.y + (b.y - a.y) * ratio,
        1.35,
        0,
        Math.PI * 2,
      );
      context.globalAlpha = 0.45 + ratio * 0.35;
      context.fillStyle = color;
      context.fill();
    }
  }

  landmarks.forEach((_landmark, index) => {
    const p = point(index);
    context.beginPath();
    context.arc(p.x, p.y, index === 0 ? 4 : 2.5, 0, Math.PI * 2);
    context.globalAlpha = 1;
    context.fillStyle = index === 0 ? "#ffffff" : color;
    context.fill();
  });
  context.restore();
}

function insidePolygon(
  x: number,
  y: number,
  polygon: Array<{ x: number; y: number }>,
) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
