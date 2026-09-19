import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { usePresentationController } from "./usePresentationController";
const tracking = vi.hoisted(() => ({ args: [] as unknown[] }));
vi.mock("../camera/useHandTracking", () => ({
  useHandTracking: (...args: unknown[]) => {
    tracking.args = args;
    return {
      state: "idle",
      confidence: 0,
      errorMessage: "",
      gestureLabel: "",
      modeGestureLabel: "",
    };
  },
}));
describe("web and desktop runtime boundaries", () => {
  beforeEach(() => {
    delete window.motionAPI;
    localStorage.clear();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
      },
    });
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: "prompt" }) },
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.motionAPI;
  });
  it("web motion toggles without a desktop bridge and gestures update only the sample", async () => {
    const { result } = renderHook(usePresentationController);
    await act(async () => {
      await result.current.toggleMotion();
    });
    expect(result.current.motionOn).toBe(true);
    await act(async () => {
      (tracking.args[5] as (s: string) => void)("swipe-right");
    });
    expect(result.current.rehearsalSlide).toBe(2);
    await act(async () => {
      await result.current.toggleMotion();
    });
    await act(async () => {
      (tracking.args[5] as (s: string) => void)("swipe-right");
    });
    expect(result.current.rehearsalSlide).toBe(2);
    expect(result.current.cameraState).toBe("active");
  });
  it("web session starts without presentation material and supports pointer hit testing", async () => {
    const { result } = renderHook(usePresentationController);
    await act(async () => {
      await result.current.startPresentationSession();
    });
    expect(result.current.sessionStartedAt).not.toBeNull();
    await act(async () => {
      await result.current.setPresentationMode("cursor");
    });
    act(() => {
      (tracking.args[7] as (p: { x: number; y: number }) => void)({
        x: 0.5,
        y: 0.5,
      });
    });
    act(() => {
      (tracking.args[8] as () => void)();
    });
    expect(result.current.rehearsalClicks).toBe(1);
    act(() => {
      (tracking.args[7] as (p: { x: number; y: number }) => void)({
        x: 0.1,
        y: 0.1,
      });
    });
    act(() => {
      (tracking.args[8] as () => void)();
    });
    expect(result.current.rehearsalClicks).toBe(1);
    act(() => {
      (tracking.args[10] as () => void)();
    });
    expect(result.current.motionOn).toBe(false);
  });
  it("web link opening validates protocols and does not claim external control", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { result } = renderHook(usePresentationController);
    act(() =>
      result.current.updateProfile({
        ...result.current.profile,
        presentationUrl: "javascript:alert(1)",
      }),
    );
    await act(async () => {
      await result.current.openResource({
        id: "resource-1",
        name: "추가 자료",
        kind: "url",
        value: result.current.profile.presentationUrl,
        returnAfterMs: 0,
      });
    });
    expect(open).not.toHaveBeenCalled();
    act(() =>
      result.current.updateProfile({
        ...result.current.profile,
        presentationUrl: "https://example.com/slides",
      }),
    );
    await act(async () => {
      await result.current.openResource({
        id: "resource-1",
        name: "추가 자료",
        kind: "url",
        value: result.current.profile.presentationUrl,
        returnAfterMs: 0,
      });
    });
    expect(open).toHaveBeenCalledWith(
      "https://example.com/slides",
      "_blank",
      "noopener,noreferrer",
    );
    expect(result.current.presentationLinkStatus).toContain(
      "추가 자료는 제어하지 않습니다",
    );
  });
  it("browser permission refresh distinguishes prompt/denied and desktop-only permissions", async () => {
    const { result } = renderHook(usePresentationController);
    await act(async () => {
      await result.current.refreshSystemStatus();
    });
    expect(result.current.permissions.camera).toBe("not-determined");
    expect(result.current.permissions.accessibility).toBe("unsupported");
    vi.mocked(navigator.permissions.query).mockResolvedValue({
      state: "denied",
    } as PermissionStatus);
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(result.current.permissions.camera).toBe("denied"),
    );
  });
  it("desktop refresh still updates permissions when display enumeration fails", async () => {
    const { result, unmount } = renderHook(usePresentationController);
    const getPermissions = vi.fn().mockResolvedValue({
      camera: "granted",
      screen: "restricted",
      accessibility: "granted",
    });
    const getDisplays = vi
      .fn()
      .mockRejectedValue(new Error("display unavailable"));
    window.motionAPI = {
      getPermissions,
      getDisplays,
    } as unknown as NonNullable<typeof window.motionAPI>;
    await act(async () => {
      await result.current.refreshSystemStatus();
    });
    expect(result.current.permissions.camera).toBe("granted");
    expect(result.current.permissions.screen).toBe("restricted");
    expect(result.current.systemStatusError).toContain("일부");
    getPermissions.mockResolvedValue({
      camera: "denied",
      screen: "granted",
      accessibility: "denied",
    });
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(result.current.permissions.camera).toBe("denied"),
    );
    unmount();
    const calls = getPermissions.mock.calls.length;
    window.dispatchEvent(new Event("focus"));
    expect(getPermissions).toHaveBeenCalledTimes(calls);
  });
});
