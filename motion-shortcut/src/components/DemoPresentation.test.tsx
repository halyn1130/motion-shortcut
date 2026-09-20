import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { DemoPresentation } from "./DemoPresentation";
import { PresentationPreparation } from "./PresentationPreparation";
import { usePresentationController } from "../features/presentation/usePresentationController";
vi.mock("../features/camera/useHandTracking", () => ({ useHandTracking: () => ({ state: "idle", errorMessage: "" }) }));
vi.mock("./PdfPage", () => ({ PdfPage: ({ pageNumber }: { pageNumber: number }) => <div>PDF page {pageNumber}</div> }));
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

it("starts the control center camera and reuses it when the demo is already open", async () => {
  const stop = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  vi.spyOn(window, "open").mockReturnValue({ closed: false, focus: vi.fn() } as unknown as Window);
  const { result } = renderHook(() => usePresentationController());
  expect(result.current.cameraState).toBe("idle");
  render(<PresentationPreparation controller={result.current} />);
  await userEvent.click(screen.getByRole("button", { name: "발표 시작" }));
  await waitFor(() => expect(result.current.cameraState).toBe("active"));
  await userEvent.click(screen.getByRole("button", { name: "발표 시작" }));
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  expect(stop).not.toHaveBeenCalled();
  expect(result.current.cameraState).toBe("active");
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

it("opens an uploaded PDF in a named popup and reuses it", async () => {
  const create = vi.fn().mockReturnValue("blob:http://localhost/test-pdf");
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  const focus = vi.fn();
  const open = vi.spyOn(window, "open").mockReturnValue({ closed: false, focus } as unknown as Window);
  render(<Preparation />);
  await userEvent.click(screen.getByRole("button", { name: "내 PDF 업로드" }));
  const start = screen.getByRole("button", { name: "발표 시작" });
  expect(start).toBeDisabled();
  const file = new File(["%PDF-1.7 test"], "발표.pdf", { type: "application/pdf" });
  await userEvent.upload(screen.getByLabelText("발표 PDF 파일 선택"), file);
  expect(start).toBeEnabled();
  await userEvent.click(start);
  const url = new URL(open.mock.calls[0][0] as string);
  expect(url.searchParams.get("pdf")).toBe("blob:http://localhost/test-pdf");
  expect(url.searchParams.get("name")).toBe("발표.pdf");
  expect(open.mock.calls[0][1]).toBe("adam-pdf-presentation");
  await userEvent.click(start);
  expect(open).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(file);
  expect(focus).toHaveBeenCalledTimes(2);
});

it("rejects invalid dropped files and releases a PDF URL when the popup is blocked", async () => {
  const revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn().mockReturnValue("blob:test") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
  vi.spyOn(window, "open").mockReturnValue(null);
  render(<Preparation />);
  await userEvent.click(screen.getByRole("button", { name: "내 PDF 업로드" }));
  const drop = screen.getByText("PDF를 여기로 끌어 놓으세요").parentElement!;
  fireEvent.drop(drop, { dataTransfer: { files: [new File(["x"], "bad.txt")] } });
  expect(screen.getByRole("alert")).toHaveTextContent("PDF 파일을 선택");
  expect(screen.getByRole("button", { name: "발표 시작" })).toBeDisabled();
  fireEvent.drop(drop, { dataTransfer: { files: [new File(["%PDF"], "slides.pdf")] } });
  await userEvent.click(screen.getByRole("button", { name: "발표 시작" }));
  expect(screen.getByRole("alert")).toHaveTextContent("팝업이 차단");
  expect(revoke).toHaveBeenCalledWith("blob:test");
});


it("uses the PDF page count for navigation beyond the demo deck", async () => {
  render(<DemoPresentation pdf={{ numPages: 12 } as PDFDocumentProxy} />);
  expect(screen.getByText("1 / 12")).toBeVisible();
  expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
  fireEvent.keyDown(window, { key: "End" });
  expect(screen.getByText("PDF page 12")).toBeVisible();
  expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "이전" }));
  expect(screen.getByText("11 / 12")).toBeVisible();
  fireEvent.keyDown(window, { key: "Home" });
  expect(screen.getByText("PDF page 1")).toBeVisible();
});
