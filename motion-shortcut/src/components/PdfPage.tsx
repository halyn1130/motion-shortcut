import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export function PdfPage({ document: pdf, pageNumber }: { document: PDFDocumentProxy; pageNumber: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let generation = 0;
    let task: RenderTask | undefined;
    setError("");
    const render = async () => {
      const current = ++generation;
      task?.cancel();
      try {
        const page = await pdf.getPage(pageNumber);
        if (disposed || current !== generation) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(container.clientWidth / base.width, container.clientHeight / base.height);
        if (scale <= 0) return;
        const viewport = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        // Each render gets its own canvas so cancelled pages cannot overwrite newer ones.
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `PDF ${pageNumber}페이지`);
        task = page.render({ canvas, viewport, transform: [pixelRatio, 0, 0, pixelRatio, 0, 0] });
        await task.promise;
        if (!disposed && current === generation) container.replaceChildren(canvas);
      } catch (reason) {
        if (!disposed && current === generation && !(reason instanceof Error && reason.name === "RenderingCancelledException"))
          setError("이 페이지를 표시하지 못했습니다. 다른 페이지로 이동하거나 PDF를 다시 열어주세요.");
      }
    };
    const observer = new ResizeObserver(() => { void render(); });
    observer.observe(container);
    void render();
    return () => { disposed = true; task?.cancel(); observer.disconnect(); container.replaceChildren(); };
  }, [pdf, pageNumber]);
  return <><div ref={host} className="pdf-page" />{error && <p role="alert" className="demo-error">{error}</p>}</>;
}
