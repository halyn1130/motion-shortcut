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
const navigationPaths: Record<Page, string> = {
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  settings:
    "m9 3 .5-2h5L15 3l2 1 2-.5 2.5 4-1.5 1.5v3l1.5 1.5-2.5 4-2-.5-2 1-.5 2h-5L9 18l-2-1-2 .5-2.5-4L4 12V9L2.5 7.5l2.5-4L7 4Z",
  guide:
    "M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z",
  developer: "m7 6-6 6 6 6m10-12 6 6-6 6M14 4l-4 16",
};
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
    <div className={`presenter-app is-${page}`}>
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
        <a href="#/home" className="brand" aria-label="Adam 홈">
          <img src="./assets/adam-header-stacked-02.png" alt="Adam" />
        </a>
        <nav className="page-nav" aria-label="주 메뉴">
          {Object.entries(pages).map(([id, [label]]) => (
            <a
              key={id}
              href={`#/${id}`}
              aria-label={label}
              aria-current={page === id ? "page" : undefined}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d={navigationPaths[id as Page]}
                  transform={id === "settings" ? "translate(0 1.5)" : undefined}
                />
                {id === "settings" && <circle cx="12" cy="12" r="3.2" />}
              </svg>
              <span className="nav-tooltip" aria-hidden="true">
                {label}
              </span>
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
      <footer>Adam · 카메라 영상은 이 기기에서 처리됩니다.</footer>
    </div>
  );
}
