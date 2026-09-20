import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ getDocument, GlobalWorkerOptions: {} }));
vi.mock("./DemoPresentation", () => ({ DemoPresentation: ({ pdf }: { pdf: { numPages: number } }) => <div>Loaded {pdf.numPages} pages</div> }));
import PdfPresentation from "./PdfPresentation";
afterEach(() => { window.history.replaceState(null, "", "/"); vi.clearAllMocks(); });
it("loads a PDF and destroys its loading task on close", async () => {
  window.history.replaceState(null, "", "/?pdf=blob:test&name=slides.pdf");
  const destroy = vi.fn().mockResolvedValue(undefined);
  getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 12 }), destroy });
  const view = render(<PdfPresentation />);
  expect(await screen.findByText("Loaded 12 pages")).toBeVisible();
  expect(document.title).toBe("slides.pdf");
  view.unmount();
  expect(destroy).toHaveBeenCalledTimes(1);
});
it.each([ ["PasswordException", "암호로 보호된 PDF"], ["InvalidPDFException", "PDF를 열지 못했습니다"] ])("explains %s", async (name, message) => {
  window.history.replaceState(null, "", "/?pdf=blob:test");
  getDocument.mockReturnValue({ promise: Promise.reject(Object.assign(new Error("bad PDF"), { name })), destroy: vi.fn() });
  render(<PdfPresentation />);
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
});
it("rejects missing local PDF URLs", () => {
  render(<PdfPresentation />);
  expect(screen.getByRole("alert")).toHaveTextContent("발표 준비에서 PDF를 선택");
  expect(getDocument).not.toHaveBeenCalled();
});
