import type { KeyShortcut, PresentationAction } from "./types";
export const DEFAULT_KEYS: Partial<Record<PresentationAction, string>> = {
  "next-slide": "ArrowRight",
  "previous-slide": "ArrowLeft",
  "black-screen": "b",
  "exit-presentation": "Escape",
};
const labels: Record<string, string> = {
  Meta: "⌘",
  Control: "⌃",
  Alt: "⌥",
  Shift: "⇧",
  ArrowRight: "→",
  ArrowLeft: "←",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "Space",
  Enter: "Enter",
  Escape: "Esc",
};
export function formatShortcut(shortcut: KeyShortcut) {
  return [...shortcut.modifiers, shortcut.key]
    .map((key) => labels[key] ?? key.toUpperCase())
    .join(" + ");
}
export function supportedKey(key: string) {
  return (
    /^[a-z0-9]$/.test(key) ||
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Space",
      "Enter",
      "Escape",
      "Backspace",
      "Tab",
    ].includes(key)
  );
}
