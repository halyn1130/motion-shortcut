export {};

declare global {
  interface Window {
    motionAPI?: {
      launchApp(
        appId: string,
      ): Promise<{ ok: boolean; appName?: string; error?: string }>;
      setOverlayMode(mode: string): Promise<boolean>;
      onOverlayMode(callback: (mode: "person-pet" | "hand-pet") => void): void;
      setOverlayColor(color: string): Promise<boolean>;
      onOverlayColor(callback: (color: string) => void): void;
      getMotionEnabled(): Promise<boolean>;
      setMotionEnabled(enabled: boolean): Promise<boolean>;
      toggleMotion(): Promise<boolean>;
      onMotionChanged(callback: (enabled: boolean) => void): void;
      getCursorEnabled(): Promise<boolean>;
      setCursorEnabled(
        enabled: boolean,
      ): Promise<{ ok: boolean; enabled: boolean; error?: string }>;
      toggleCursor(): Promise<{
        ok: boolean;
        enabled: boolean;
        error?: string;
      }>;
      moveCursor(point: { x: number; y: number }): void;
      clickCursor(): void;
      getCursorSensitivity(): Promise<number>;
      setCursorSensitivity(value: number): Promise<number>;
      onCursorSensitivityChanged(callback: (value: number) => void): void;
      onCursorChanged(callback: (enabled: boolean) => void): void;
      getKeyboardVisible(): Promise<boolean>;
      setKeyboardVisible(visible: boolean): Promise<boolean>;
      toggleKeyboard(): Promise<boolean>;
      typeKey(key: string): void;
      sendKeyboardPointer(sample: {
        hand: "Left" | "Right";
        x: number;
        y: number;
        tap: boolean;
      }): void;
      onKeyboardPointer(
        callback: (sample: {
          hand: "Left" | "Right";
          x: number;
          y: number;
          tap: boolean;
        }) => void,
      ): void;
      sendKeyboardHands(
        hands: Array<{
          handedness: "Left" | "Right";
          landmarks: Array<{ x: number; y: number }>;
        }>,
      ): void;
      onKeyboardHands(
        callback: (
          hands: Array<{
            handedness: "Left" | "Right";
            landmarks: Array<{ x: number; y: number }>;
          }>,
        ) => void,
      ): void;
      onKeyboardChanged(callback: (visible: boolean) => void): void;
    };
  }
}
