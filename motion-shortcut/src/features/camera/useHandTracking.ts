import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { type RefObject, useEffect, useRef, useState } from "react";

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
type GestureId = "calculator" | "notes" | "chrome" | "spotlight";
export type MotionGestureId = GestureId | "toggle-motion";

const GESTURE_LABELS: Record<MotionGestureId, string> = {
  calculator: "검지 하나",
  notes: "V 사인",
  chrome: "손바닥 펼치기",
  spotlight: "주먹 쥐기",
  "toggle-motion": "전화 모양",
};

const GESTURE_HOLD_MS = 1500;

export function useHandTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  petCanvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  color: string,
  onGesture: (gesture: MotionGestureId) => void,
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
  const [state, setState] = useState<TrackerState>("idle");
  const [confidence, setConfidence] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [gesture, setGesture] = useState<MotionGestureId | null>(null);

  useEffect(() => {
    onGestureRef.current = onGesture;
  }, [onGesture]);

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
          const vision =
            await FilesetResolver.forVisionTasks("/mediapipe/wasm");
          const options = {
            baseOptions: {
              modelAssetPath: "/mediapipe/models/hand_landmarker.task",
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
          drawHands(canvas, hands, video.videoWidth / video.videoHeight, color);
          if (petCanvasRef.current)
            drawHands(
              petCanvasRef.current,
              hands,
              video.videoWidth / video.videoHeight,
              color,
            );
          const detectedGestures = hands.map(classifyGesture);
          const detected = detectedGestures.includes("toggle-motion")
            ? "toggle-motion"
            : (detectedGestures.find((value) => value !== null) ?? null);
          updateGestureCandidate(
            detected,
            performance.now(),
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
  }, [canvasRef, color, enabled, petCanvasRef, videoRef]);

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
  if (index && middle && ring && pinky) return "chrome";
  if (index && middle && !ring && !pinky) return "notes";
  if (index && !middle && !ring && !pinky) return "calculator";
  if (!index && !middle && !ring && !pinky) return "spotlight";
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
