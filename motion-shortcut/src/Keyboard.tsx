import { useState } from "react";

const rows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export default function Keyboard() {
  const [shift, setShift] = useState(false);

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
        <small>왼손 세 손가락 1.5초로 닫기</small>
        <button
          onClick={() => void window.motionAPI?.setKeyboardVisible(false)}
        >
          닫기
        </button>
      </header>
      {rows.map((row, rowIndex) => (
        <div className="keyboard-row" key={rowIndex}>
          {row.map((key) => (
            <button key={key} onClick={() => type(key)}>
              {shift ? key.toUpperCase() : key}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard-row controls">
        <button
          className={shift ? "active" : ""}
          onClick={() => setShift(!shift)}
        >
          Shift
        </button>
        <button className="space" onClick={() => type(" ")}>
          Space
        </button>
        <button onClick={() => type("Backspace")}>⌫</button>
        <button onClick={() => type("Enter")}>Enter</button>
      </div>
    </main>
  );
}
