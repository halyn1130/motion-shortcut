export type PresentationMode = "slide" | "cursor" | "laser";

export type PresentationApp = "powerpoint" | "keynote" | "google-slides";

export type GesturePattern =
  "swipe-right" | "swipe-left" | "index" | "victory" | "open-palm" | "fist";

export type PresentationAction =
  | "next-slide"
  | "previous-slide"
  | "black-screen"
  | "exit-presentation"
  | "resource-1"
  | "resource-2";

export type ResourceKind = "url" | "file";

export interface PresentationResource {
  id: "resource-1" | "resource-2";
  name: string;
  kind: ResourceKind;
  value: string;
}

export interface PresentationProfile {
  id: string;
  name: string;
  app: PresentationApp;
  mappings: Record<PresentationAction, GesturePattern>;
  resources: PresentationResource[];
}

export const GESTURE_OPTIONS: Array<{ id: GesturePattern; label: string }> = [
  { id: "swipe-right", label: "오른쪽으로 밀기" },
  { id: "swipe-left", label: "왼쪽으로 밀기" },
  { id: "index", label: "검지 하나" },
  { id: "victory", label: "V 사인" },
  { id: "open-palm", label: "손바닥 펼치기" },
  { id: "fist", label: "주먹 쥐기" },
];

export const ACTION_LABELS: Record<PresentationAction, string> = {
  "next-slide": "다음 슬라이드",
  "previous-slide": "이전 슬라이드",
  "black-screen": "화면 가리기",
  "exit-presentation": "발표 종료",
  "resource-1": "자료 1 열기",
  "resource-2": "자료 2 열기",
};
