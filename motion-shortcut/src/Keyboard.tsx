import { useEffect, useRef, useState } from "react";

const connections: Array<[number, number]> = [
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

const rows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export default function Keyboard() {
  const handCanvasRef = useRef<HTMLCanvasElement>(null);
  const [shift, setShift] = useState(false);
  const [pointers, setPointers] = useState({
    Left: { x: -100, y: -100, key: "" },
    Right: { x: -100, y: -100, key: "" },
  });

  useEffect(() => {
    window.motionAPI?.onKeyboardPointer((sample) => {
      const element = document.elementFromPoint(sample.x, sample.y);
      const keyButton = element?.closest<HTMLButtonElement>("button[data-key]");
      setPointers((current) => ({
        ...current,
        [sample.hand]: {
          x: sample.x,
          y: sample.y,
          key: keyButton?.dataset.key ?? "",
        },
      }));
      if (sample.tap) keyButton?.click();
    });
    window.motionAPI?.onKeyboardHands((hands) => {
      drawKeyboardHands(handCanvasRef.current, hands);
    });
  }, []);

  const isHovered = (key: string) =>
    pointers.Left.key === key || pointers.Right.key === key;

  const type = (key: string) => {
    window.motionAPI?.typeKey(
      shift && key.length === 1 ? key.toUpperCase() : key,
    );
    if (shift && key.length === 1) setShift(false);
  };

  return (
    <main className="virtual-keyboard" aria-label="모션 가상 키보드">
      <header>
        <span>모션 키보드</span>
        <small>검지를 아래로 톡 내려 입력 · 왼손 세 손가락으로 닫기</small>
        <button
          onClick={() => void window.motionAPI?.setKeyboardVisible(false)}
        >
          닫기
        </button>
      </header>
      {rows.map((row, rowIndex) => (
        <div className="keyboard-row" key={rowIndex}>
          {row.map((key) => (
            <button
              key={key}
              data-key={key}
              className={isHovered(key) ? "air-hover" : ""}
              onClick={() => type(key)}
            >
              {shift ? key.toUpperCase() : key}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard-row controls">
        <button
          data-key="Shift"
          className={`${shift ? "active" : ""} ${isHovered("Shift") ? "air-hover" : ""}`}
          onClick={() => setShift(!shift)}
        >
          Shift
        </button>
        <button
          data-key="Space"
          className={`space ${isHovered("Space") ? "air-hover" : ""}`}
          onClick={() => type(" ")}
        >
          Space
        </button>
        <button
          data-key="Backspace"
          className={isHovered("Backspace") ? "air-hover" : ""}
          onClick={() => type("Backspace")}
        >
          ⌫
        </button>
        <button
          data-key="Enter"
          className={isHovered("Enter") ? "air-hover" : ""}
          onClick={() => type("Enter")}
        >
          Enter
        </button>
      </div>
      <canvas ref={handCanvasRef} className="keyboard-hands" />
      {(["Left", "Right"] as const).map((hand) => (
        <i
          key={hand}
          className={`air-pointer ${hand.toLowerCase()}`}
          style={{ left: pointers[hand].x, top: pointers[hand].y }}
        >
          {hand === "Left" ? "L" : "R"}
        </i>
      ))}
    </main>
  );
}

function drawKeyboardHands(
  canvas: HTMLCanvasElement | null,
  hands: Array<{
    handedness: "Left" | "Right";
    landmarks: Array<{ x: number; y: number }>;
  }>,
) {
  if (!canvas) return;
  const scale = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width * scale || canvas.height !== height * scale) {
    canvas.width = width * scale;
    canvas.height = height * scale;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, width, height);
  for (const hand of hands) {
    const color = hand.handedness === "Left" ? "#65f6dc" : "#78b5ff";
    const point = (index: number) => ({
      x: hand.landmarks[index].x * width,
      y: hand.landmarks[index].y * height,
    });
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineCap = "round";
    context.lineWidth = 3;
    context.globalAlpha = 0.72;
    context.shadowColor = color;
    context.shadowBlur = 14;
    for (const [from, to] of connections) {
      const a = point(from);
      const b = point(to);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
    for (let index = 0; index < hand.landmarks.length; index += 1) {
      const p = point(index);
      context.beginPath();
      context.arc(p.x, p.y, index === 8 ? 6 : 3, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}
