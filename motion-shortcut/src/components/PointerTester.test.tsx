import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { SettingsPage } from "../pages/SettingsPage";
import { usePresentationController } from "../features/presentation/usePresentationController";
const tracking = vi.hoisted(() => ({ args: [] as unknown[] }));
vi.mock("../features/camera/useHandTracking", () => ({ useHandTracking: (...args: unknown[]) => { tracking.args = args; return { state: "tracking", errorMessage: "" }; } }));
function Settings() { return <SettingsPage controller={usePresentationController()} />; }
beforeEach(() => { localStorage.clear(); delete window.motionAPI; });
it.each(["button", "Escape", "q", "outside"])("closes via %s and releases its camera", async (method) => {
  const stop = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  render(<StrictMode><Settings /></StrictMode>);
  const trigger = screen.getByRole("button", { name: "감도 설정" });
  await userEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "포인터 감도 테스트" });
  await waitFor(() => expect(screen.getByLabelText("테스트 포인터")).toBeInTheDocument());
  act(() => { (tracking.args[7] as (point: { x: number; y: number }) => void)({ x: .8, y: .2 }); });
  expect(screen.getByLabelText("테스트 포인터")).toHaveStyle({ left: "80%", top: "20%" });
  fireEvent.change(screen.getByLabelText("테스터 포인터 감도"), { target: { value: "1.5" } });
  expect(screen.getByLabelText("테스터 포인터 감도")).toHaveValue("1.5");
  if (method === "button") await userEvent.click(screen.getByRole("button", { name: "포인터 테스터 닫기" }));
  else if (method === "outside") fireEvent.click(dialog, { clientX: -10, clientY: -10 });
  else fireEvent.keyDown(dialog, { key: method });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(stop).toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});
it("shows camera permission guidance and allows retry", async () => {
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  render(<Settings />);
  await userEvent.click(screen.getByRole("button", { name: "감도 설정" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("카메라 권한");
  await userEvent.click(screen.getByRole("button", { name: "카메라 연결 다시 시도" }));
  expect(getUserMedia).toHaveBeenCalledTimes(2);
});
