import { useEffect, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DemoPresentation } from "./DemoPresentation";

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPresentation() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get("pdf")?.startsWith("blob:") ? "" : "발표 준비에서 PDF를 선택하고 다시 시작하세요.");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    document.title = params.get("name") || "PDF 발표";
    const url = params.get("pdf") || "";
    if (!url.startsWith("blob:")) {
      return;
    }
    let cancelled = false;
    const task = getDocument({ url, cMapUrl: "./pdfjs/cmaps/", cMapPacked: true, standardFontDataUrl: "./pdfjs/standard_fonts/", wasmUrl: "./pdfjs/wasm/" });
    task.promise.then((loaded) => {
      if (!cancelled) setPdf(loaded);
    }).catch((reason: unknown) => {
      if (cancelled) return;
      setError(reason instanceof Error && reason.name === "PasswordException"
        ? "암호로 보호된 PDF입니다. 암호를 해제한 PDF를 선택하세요."
        : "PDF를 열지 못했습니다. 원래 창에서 정상적인 PDF 파일을 선택하고 다시 시작하세요.");
    });
    return () => { cancelled = true; void task.destroy(); };
  }, []);
  if (pdf) return <DemoPresentation pdf={pdf} />;
  return <div className="demo-presentation"><main className="demo-slide">
    {error ? <><p role="alert">{error}</p><button onClick={() => window.close()}>발표 창 닫기</button></> : <p role="status">PDF를 불러오는 중…</p>}
  </main></div>;
}
