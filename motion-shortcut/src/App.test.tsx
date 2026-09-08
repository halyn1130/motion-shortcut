import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("모션 앱 런처", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("모션 인식 상태를 켠다", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "모션 OFF" }));
    expect(
      await screen.findByRole("button", { name: "모션 ON" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("Electron 브리지로 허용된 앱을 실행한다", async () => {
    const launchApp = vi
      .fn()
      .mockResolvedValue({ ok: true, appName: "계산기" });
    window.motionAPI = {
      launchApp,
      setOverlayMode: vi.fn().mockResolvedValue(true),
      onOverlayMode: vi.fn(),
      setOverlayColor: vi.fn().mockResolvedValue(true),
      onOverlayColor: vi.fn(),
      getMotionEnabled: vi.fn().mockResolvedValue(true),
      setMotionEnabled: vi.fn().mockResolvedValue(true),
      toggleMotion: vi.fn().mockResolvedValue(false),
      onMotionChanged: vi.fn(),
      getCursorEnabled: vi.fn().mockResolvedValue(false),
      setCursorEnabled: vi.fn().mockResolvedValue({ ok: true, enabled: false }),
      toggleCursor: vi.fn().mockResolvedValue({ ok: true, enabled: true }),
      moveCursor: vi.fn(),
      onCursorChanged: vi.fn(),
    };
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "계산기 열기" }));
    expect(launchApp).toHaveBeenCalledWith("calculator");
    expect(await screen.findByText(/계산기 실행 성공/)).toBeInTheDocument();
    delete window.motionAPI;
  });
});
