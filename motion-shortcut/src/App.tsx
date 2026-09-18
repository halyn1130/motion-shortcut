import { useEffect, useRef, useState } from "react";
import "./App.css";
import { usePresentationController } from "./features/presentation/usePresentationController";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { GuidePage } from "./pages/GuidePage";
import { DeveloperPage } from "./pages/DeveloperPage";
const pages = {
  home: ["홈", "발표 준비와 실시간 제어"],
  settings: ["설정", "권한과 입력 설정"],
  guide: ["가이드", "사용법과 기능 설명"],
  developer: ["개발", "손 추적 표시와 실행 로그"],
} as const;
type Page = keyof typeof pages;
function readPage(): Page {
  const value = window.location.hash.replace("#/", "");
  return value in pages ? (value as Page) : "home";
}
export default function App() {
  const c = usePresentationController();
  const [page, setPage] = useState<Page>(readPage);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const change = () => {
      setPage(readPage());
      requestAnimationFrame(() => heading.current?.focus());
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return (
    <div className={`presenter-app ${page === "home" ? "is-home" : ""}`}>
      <a
        className="skip-link"
        href="#page-title"
        onClick={(e) => {
          e.preventDefault();
          heading.current?.focus();
        }}
      >
        본문으로 이동
      </a>
      <header className="presenter-topbar">
        <a href="#/home" className="brand" aria-label="Flickey 홈">
          <img src="./assets/flickey-logo.png" alt="Flickey" />
        </a>
        <span className="product-title">발표의 흐름을 잇다</span>
        <nav className="page-nav" aria-label="주 메뉴">
          {Object.entries(pages).map(([id, [label]]) => (
            <a
              key={id}
              href={`#/${id}`}
              aria-current={page === id ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main>
        <div
          className={`page-heading ${page === "home" ? "home-page-heading" : ""}`}
        >
          <div>
            <h1 id="page-title" ref={heading} tabIndex={-1}>
              {pages[page][0]}
            </h1>
            <p>{pages[page][1]}</p>
          </div>
        </div>
        <div
          className={page === "home" ? "" : "inactive-home"}
          inert={page !== "home"}
          aria-hidden={page !== "home"}
        >
          <HomePage controller={c} />
        </div>
        {page === "settings" && <SettingsPage controller={c} />}
        {page === "guide" && <GuidePage />}
        {page === "developer" && <DeveloperPage controller={c} />}
      </main>
      <footer>Flickey · 카메라 영상은 이 기기에서 처리됩니다.</footer>
    </div>
  );
}
