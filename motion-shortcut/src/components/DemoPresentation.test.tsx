import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DemoPresentation } from "./DemoPresentation";
import { PresentationPreparation } from "./PresentationPreparation";
import { usePresentationController } from "../features/presentation/usePresentationController";
vi.mock("../features/camera/useHandTracking", () => ({ useHandTracking: () => ({ state: "idle", errorMessage: "" }) }));
beforeEach(() => { localStorage.clear(); delete window.motionAPI; });
afterEach(() => vi.restoreAllMocks());
function Preparation() { return <PresentationPreparation controller={usePresentationController()} />; }
it("opens one named demo window and focuses an existing popup", async () => {
  const focus = vi.fn();
  const open = vi.spyOn(window, "open").mockReturnValue({ closed: false, focus } as unknown as Window);
  render(<Preparation />);
  await userEvent.click(screen.getByRole("button", { name: "발표 시작" }));
  expect(open).toHaveBeenCalledWith(expect.stringContaining("?demo"), "adam-demo-presentation", expect.stringContaining("popup"));
  await userEvent.click(screen.getByRole("button", { name: "발표 시작" }));
  expect(open).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledTimes(2);
});
it("explains popup blocking and keeps PDF presentation disabled", async () => {
  vi.spyOn(window, "open").mockReturnValue(null);
  render(<Preparation />);
  await userEvent.click(screen.getByRole("button", { name: "발표 시작" }));
  expect(screen.getByRole("alert")).toHaveTextContent("팝업을 허용");
  await userEvent.click(screen.getByRole("button", { name: "내 PDF 업로드" }));
  expect(screen.getByRole("button", { name: "발표 시작" })).toBeDisabled();
});
it("navigates six slides with accessible icon buttons and keys", async () => {
  render(<DemoPresentation />);
  expect(screen.getByText("1 / 6")).toBeVisible();
  fireEvent.keyDown(window, { key: "End" });
  expect(screen.getByText("6 / 6")).toBeVisible();
  fireEvent.keyDown(window, { key: "ArrowLeft" });
  expect(screen.getByText("5 / 6")).toBeVisible();
  fireEvent.keyDown(window, { key: "Home" });
  expect(screen.getByText("1 / 6")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "다음" }));
  expect(screen.getByLabelText("데모 슬라이드")).not.toHaveClass("is-black");
  expect(screen.getByText("2 / 6")).toBeVisible();
  expect(document.querySelector("video")?.closest("[aria-hidden=true]")).not.toBeNull();
  expect(screen.queryByText("모션 진단")).not.toBeInTheDocument();
});
it("uses Fullscreen API and reports a rejected request", async () => {
  const request = vi.fn().mockRejectedValue(new Error("denied"));
  Object.defineProperty(HTMLElement.prototype, "requestFullscreen", { configurable: true, value: request });
  render(<DemoPresentation />);
  await userEvent.click(screen.getByRole("button", { name: "전체 화면" }));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith({ navigationUI: "hide" });
  expect(screen.getByRole("alert")).toHaveTextContent("전체 화면 권한");
  request.mockResolvedValue(undefined);
  await userEvent.click(screen.getByRole("button", { name: "전체 화면" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("retains camera permission errors with the compact controls", async () => {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) } });
  render(<DemoPresentation />);
  await userEvent.click(screen.getByRole("button", { name: "모션 시작" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("카메라 권한"));
  expect(screen.queryByRole("button", { name: "발표 종료" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("button")).toHaveLength(4);
});

it("releases the active home stream before the demo takes the camera", async () => {
  const stop = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  vi.spyOn(window, "open").mockReturnValue({ closed: false, focus: vi.fn() } as unknown as Window);
  const { result } = renderHook(() => usePresentationController());
  await act(async () => { await result.current.toggleMotion(); });
  expect(result.current.motionOn).toBe(true);
  render(<PresentationPreparation controller={result.current} />);
  await userEvent.click(screen.getByRole("button", { name: "발표 시작" }));
  expect(stop).toHaveBeenCalled();
  expect(result.current.cameraState).toBe("idle");
  expect(result.current.motionOn).toBe(false);
});
it("synchronizes fullscreen exit with the browser and supports keys while a control is focused", async () => {
  const exit = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exit });
  const { container } = render(<DemoPresentation />);
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: container.firstElementChild });
  fireEvent(document, new Event("fullscreenchange"));
  const control = screen.getByRole("button", { name: "전체 화면 종료" });
  fireEvent.keyDown(control, { key: "End" });
  expect(screen.getByText("6 / 6")).toBeVisible();
  await userEvent.click(control);
  expect(exit).toHaveBeenCalled();
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  fireEvent(document, new Event("fullscreenchange"));
  expect(screen.getByRole("button", { name: "전체 화면" })).toBeVisible();
});
