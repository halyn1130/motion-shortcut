import { useEffect, useState } from "react";

const rows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export default function Keyboard() {
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
