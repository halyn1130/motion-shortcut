import { describe, expect, it } from "vitest";
import { classifyGesture } from "./useHandTracking";

type Point = { x: number; y: number };

function thumbPose(direction: "up" | "down") {
  const points: Point[] = Array.from({ length: 21 }, () => ({
    x: 0.5,
    y: 0.72,
  }));
  points[0] = { x: 0.5, y: 0.9 };
  points[2] = { x: 0.43, y: 0.56 };
  points[3] = { x: 0.42, y: 0.58 };
  points[4] = { x: 0.32, y: direction === "up" ? 0.2 : 1.0 };
  points[9] = { x: 0.5, y: 0.6 };
  for (const [pip, tip] of [
    [6, 8],
    [10, 12],
    [14, 16],
    [18, 20],
  ]) {
    points[pip] = { x: 0.5, y: 0.62 };
    points[tip] = { x: 0.5, y: 0.76 };
  }
  return points;
}

describe("정적 슬라이드 제스처", () => {
  it("엄지를 위로 세우면 다음 슬라이드로 분류한다", () => {
    expect(classifyGesture(thumbPose("up"))).toBe("thumb-up");
  });

  it("엄지를 아래로 내리면 이전 슬라이드로 분류한다", () => {
    expect(classifyGesture(thumbPose("down"))).toBe("thumb-down");
  });
});
