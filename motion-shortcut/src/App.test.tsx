import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

// UI lifecycle tests do not request a real camera model or WASM runtime.
vi.mock("./features/camera/useHandTracking", () => ({
  useHandTracking: () => ({
    state: "idle",
    confidence: 0,
    errorMessage: "",
    gestureLabel: "",
    modeGestureLabel: "",
  }),
}));

describe("Flickey 발표 인터페이스", () => {
  beforeEach(() => {
    delete window.motionAPI;
    localStorage.clear();
    window.location.hash = "#/home";
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("모션을 기본 OFF 상태로 시작한다", () => {
    render(<App />);
    expect(
      screen.queryByRole("button", { name: "MOTION OFF" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "발표 시작" })).toBeVisible();
    expect(screen.getByRole("button", { name: "모션 OFF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "전체 화면" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "손만 보기" })).toBeDisabled();
    expect(screen.getByText("발표 제어 센터")).toBeVisible();
  });

  it("카메라·모션을 독립 제어하고 발표 명령을 전달한다", async () => {
    const executePresentationCommand = vi.fn().mockResolvedValue({ ok: true });
    window.motionAPI = {
      launchApp: vi.fn(),
      executePresentationCommand,
      pickPresentationFile: vi.fn().mockResolvedValue(null),
      openPresentationResource: vi.fn().mockResolvedValue({ ok: true }),
      restorePresentation: vi.fn().mockResolvedValue({ ok: true }),
      openPresentationUrl: vi.fn().mockResolvedValue({ ok: true }),
      goToSlide: vi.fn().mockResolvedValue({ ok: true }),
      getPresentationMode: vi.fn().mockResolvedValue("slide"),
      setPresentationMode: vi
        .fn()
        .mockResolvedValue({ ok: true, mode: "slide" }),
      cyclePresentationMode: vi
        .fn()
        .mockResolvedValue({ ok: true, mode: "cursor" }),
      onPresentationModeChanged: vi.fn(),
      onPresentationActivity: vi.fn(),
      moveLaser: vi.fn(),
      getLaserSettings: vi.fn().mockResolvedValue({
        color: "#9fe9ff",
        size: 24,
        trail: true,
        shareCompatible: false,
      }),
      setLaserSettings: vi.fn().mockResolvedValue({
        color: "#9fe9ff",
        size: 24,
        trail: true,
        shareCompatible: false,
      }),
      onLaserSettingsChanged: vi.fn(),
      onLaserMoved: vi.fn(),
      getOverlayMode: vi.fn().mockResolvedValue("camera"),
      setOverlayMode: vi.fn().mockResolvedValue(true),
      onOverlayMode: vi.fn(),
      setOverlayColor: vi.fn().mockResolvedValue(true),
      onOverlayColor: vi.fn(),
      getOverlayLayout: vi.fn().mockResolvedValue({ scale: 1, editing: false }),
      setOverlayScale: vi.fn().mockResolvedValue(1),
      setOverlayEditing: vi.fn().mockResolvedValue(false),
      onOverlayEditing: vi.fn(),
      sendOverlayTracking: vi.fn(),
      onOverlayTracking: vi.fn(),
      getMotionEnabled: vi.fn().mockResolvedValue(false),
      setMotionEnabled: vi.fn().mockResolvedValue(true),
      toggleMotion: vi.fn().mockResolvedValue(false),
      onMotionChanged: vi.fn(),
      getCameraEnabled: vi.fn().mockResolvedValue(false),
      setCameraEnabled: vi.fn().mockResolvedValue(true),
      onCameraChanged: vi.fn(),
      getPermissions: vi.fn().mockResolvedValue({
        camera: "granted",
        accessibility: "granted",
        screen: "granted",
      }),
      openPermissionSettings: vi.fn().mockResolvedValue(true),
      getDisplays: vi.fn().mockResolvedValue({
        selectedId: null,
        displays: [{ id: "1", label: "모니터 1", primary: true }],
      }),
      setDisplay: vi.fn().mockResolvedValue("1"),
      getCursorEnabled: vi.fn().mockResolvedValue(false),
      setCursorEnabled: vi.fn().mockResolvedValue({ ok: true, enabled: false }),
      toggleCursor: vi.fn().mockResolvedValue({ ok: true, enabled: true }),
      moveCursor: vi.fn(),
      clickCursor: vi.fn(),
      getCursorSensitivity: vi.fn().mockResolvedValue(1),
      setCursorSensitivity: vi.fn().mockResolvedValue(1),
      onCursorSensitivityChanged: vi.fn(),
      getKeyboardVisible: vi.fn().mockResolvedValue(false),
      setKeyboardVisible: vi.fn().mockResolvedValue(true),
      toggleKeyboard: vi.fn().mockResolvedValue(true),
      getTypingSensitivity: vi.fn().mockResolvedValue(0.35),
      setTypingSensitivity: vi.fn().mockResolvedValue(0.35),
      onTypingSensitivityChanged: vi.fn(),
      typeKey: vi.fn(),
      sendKeyboardPointer: vi.fn(),
      onKeyboardPointer: vi.fn(),
      sendKeyboardHands: vi.fn(),
      onKeyboardHands: vi.fn(),
      onKeyboardChanged: vi.fn(),
      onCursorChanged: vi.fn(),
    };
    const stopTrack = vi.fn();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream);
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "카메라 켜기" }));
    expect(screen.getByRole("button", { name: "전체 화면" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "모션 OFF" }));
    expect(screen.getByRole("button", { name: "모션 ON" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "모션 ON" }));
    expect(screen.getByRole("button", { name: "카메라 끄기" })).toBeEnabled();
    expect(stopTrack).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "손만 보기" }));
    await userEvent.click(screen.getByRole("button", { name: "카메라 끄기" }));
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "손만 보기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "모션 OFF" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "카메라 켜기" }));
    expect(screen.getByRole("button", { name: "손만 보기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "카메라 끄기" }));
    await userEvent.click(screen.getByRole("link", { name: "설정" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "다음 슬라이드 테스트" }),
    );
    expect(executePresentationCommand).toHaveBeenCalledWith(
      "next-slide",
      "google-slides",
      "",
      undefined,
    );
    await userEvent.click(screen.getByRole("link", { name: "개발" }));
    expect(await screen.findByText(/다음 슬라이드 실행/)).toBeInTheDocument();
    delete window.motionAPI;
  });

  it("발표 자료 슬롯을 추가할 수 있다", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "+ 자료 추가" }));
    expect(screen.getByRole("textbox", { name: "자료 3 이름" })).toHaveValue(
      "자료 3",
    );
  });
  it("첫 실행은 전체 화면이고 앱을 다시 열어도 마지막 표시 방식을 기억한다", async () => {
    const initial = render(<App />);
    expect(screen.getByRole("button", { name: "전체 화면" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "손만 보기" }));
    expect(localStorage.getItem("flickey.camera-view.v1")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "카메라 켜기" }));
    await userEvent.click(screen.getByRole("button", { name: "손만 보기" }));
    await userEvent.click(screen.getByRole("button", { name: "카메라 끄기" }));
    initial.unmount();
    render(<App />);
    expect(screen.getByRole("button", { name: "손만 보기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "손만 보기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(screen.getByRole("button", { name: "카메라 켜기" }));
    expect(screen.getByRole("button", { name: "손만 보기" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "손만 보기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
