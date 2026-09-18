import { useRef, useState } from "react";
import { PresentationTools } from "./PresentationTools";
import type { PresentationController } from "../features/presentation/usePresentationController";
import { APP_LABELS } from "../features/presentation/usePresentationController";
import type {
  PresentationProfile,
  PresentationResource,
} from "../features/presentation/types";

const RESOURCE_LABELS = { url: "웹 링크", file: "파일", app: "앱" };

export function PresentationPreparation({
  controller: c,
}: {
  controller: PresentationController;
}) {
  const {
    profile,
    updateProfile,
    setPresentationLink,
    presentationLinkStatus,
    addResource,
    openResource,
    selectedResource,
  } = c;
  const [editingId, setEditingId] = useState<string | null>(null);
  const resource =
    profile.resources.find((item) => item.id === editingId) ??
    profile.resources[0];
  const resourceIndex = profile.resources.findIndex(
    (item) => item.id === resource?.id,
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const focusEditor = () =>
    requestAnimationFrame(() => {
      activeItemRef.current?.scrollIntoView?.({ block: "nearest" });
      nameRef.current?.focus();
    });
  const updateResource = (changes: Partial<PresentationResource>) => {
    if (!resource) return;
    updateProfile({
      ...profile,
      resources: profile.resources.map((item) =>
        item.id === resource.id ? { ...item, ...changes } : item,
      ),
    });
  };
  const pickFile = async () => {
    if (!resource) return;
    const value = await window.motionAPI?.pickPresentationFile(
      resource.kind === "app",
    );
    if (value) updateResource({ value });
  };
  const addAndEdit = () => {
    setEditingId(addResource());
    focusEditor();
  };
  return (
    <section className="preparation-panel" aria-labelledby="preparation-title">
      <div className="preparation-heading">
        <h2 id="preparation-title">발표 준비</h2>
        <span>프로필과 자료를 한곳에서 관리합니다.</span>
        <button onClick={addAndEdit}>+ 자료 추가</button>
      </div>
      <div className="preparation-body">
        <section
          className="preparation-profile"
          aria-labelledby="profile-title"
        >
          <h3 id="profile-title">발표 프로필</h3>
          <div className="preparation-fields">
            <label>
              프로필 이름
              <input
                value={profile.name}
                onChange={(e) =>
                  updateProfile({ ...profile, name: e.target.value })
                }
              />
            </label>
            <label>
              발표 프로그램
              <select
                value={profile.app}
                onChange={(e) =>
                  updateProfile({
                    ...profile,
                    app: e.target.value as PresentationProfile["app"],
                  })
                }
              >
                {Object.entries(APP_LABELS).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="preparation-link-row">
            <label>
              웹 슬라이드 링크
              <input
                type="url"
                placeholder="https://docs.google.com/presentation/..."
                value={profile.presentationUrl}
                onChange={(e) =>
                  updateProfile({ ...profile, presentationUrl: e.target.value })
                }
              />
            </label>
            <button
              aria-label={
                c.isDesktop
                  ? "링크 열기·제어 대상으로 지정"
                  : "발표 링크 새 탭에서 열기"
              }
              onClick={() => void setPresentationLink()}
            >
              {c.isDesktop ? "연결" : "링크 열기"}
            </button>
          </div>
          {presentationLinkStatus && (
            <p className="preparation-status" role="status">
              {presentationLinkStatus}
            </p>
          )}
        </section>
        <section
          className="preparation-resources"
          aria-labelledby="resources-title"
        >
          <h3 id="resources-title">
            발표 자료 <span>{profile.resources.length}</span>
          </h3>
          <div className="resource-browser">
            <div
              className="resource-picker"
              role="group"
              aria-label="편집할 자료 선택"
              tabIndex={0}
            >
              {profile.resources.map((item, index) => (
                <button
                  key={item.id}
                  ref={resource?.id === item.id ? activeItemRef : undefined}
                  className="resource-picker-item"
                  aria-pressed={resource?.id === item.id}
                  aria-label={`자료 ${index + 1} 편집: ${item.name || "이름 없음"}`}
                  onClick={() => setEditingId(item.id)}
                >
                  <span className="resource-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="resource-summary">
                    <strong>{item.name || "이름 없음"}</strong>
                    <small>
                      {RESOURCE_LABELS[item.kind]}
                      {!item.value ? " · 미등록" : ""}
                      {selectedResource?.id === item.id ? " · 실행 대기" : ""}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            {resource ? (
              <div
                className="resource-editor"
                key={resource.id}
                role="group"
                aria-label={`${resource.name || "자료"} 편집`}
              >
                <div className="preparation-fields">
                  <label>
                    자료 이름
                    <input
                      ref={nameRef}
                      aria-label={`자료 ${resourceIndex + 1} 이름`}
                      value={resource.name}
                      onChange={(e) => updateResource({ name: e.target.value })}
                    />
                  </label>
                  <label>
                    유형
                    <select
                      aria-label={`자료 ${resourceIndex + 1} 유형`}
                      value={resource.kind}
                      onChange={(e) =>
                        updateResource({
                          kind: e.target.value as PresentationResource["kind"],
                          value: "",
                        })
                      }
                    >
                      <option value="url">웹 링크</option>
                      <option value="file">로컬 파일</option>
                      <option value="app">애플리케이션</option>
                    </select>
                  </label>
                </div>
                <div className="resource-location">
                  <label>
                    {resource.kind === "url" ? "주소" : "경로"}
                    <input
                      aria-label={`자료 ${resourceIndex + 1} 경로`}
                      placeholder={
                        resource.kind === "url"
                          ? "https://example.com"
                          : resource.kind === "app"
                            ? "애플리케이션을 선택하세요"
                            : "파일을 선택하세요"
                      }
                      readOnly={resource.kind !== "url"}
                      value={resource.value}
                      onChange={(e) =>
                        updateResource({ value: e.target.value })
                      }
                    />
                  </label>
                  {resource.kind !== "url" && (
                    <button onClick={() => void pickFile()}>
                      {resource.kind === "app" ? "앱 선택" : "파일 선택"}
                    </button>
                  )}
                </div>
                <div className="resource-editor-actions">
                  <label className="return-option">
                    <input
                      type="checkbox"
                      disabled={!c.isDesktop}
                      checked={Boolean(resource.returnAfterMs)}
                      onChange={(e) =>
                        updateResource({
                          returnAfterMs: e.target.checked ? 5000 : 0,
                        })
                      }
                    />
                    5초 후 발표 복귀{!c.isDesktop && " · 앱 전용"}
                  </label>
                  <button onClick={() => void openResource(resource)}>
                    자료 열기
                  </button>
                  {profile.resources.length > 2 && (
                    <button
                      aria-label={`${resource.name || "자료"} 삭제`}
                      onClick={() => {
                        const remaining = profile.resources.filter(
                          (item) => item.id !== resource.id,
                        );
                        updateProfile({ ...profile, resources: remaining });
                        setEditingId(
                          remaining[
                            Math.min(resourceIndex, remaining.length - 1)
                          ]?.id ?? null,
                        );
                        focusEditor();
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="resource-editor-empty">
                <p>발표 중 열 자료를 추가하세요.</p>
                <button onClick={addAndEdit}>첫 자료 추가</button>
              </div>
            )}
          </div>
        </section>
      </div>
      <PresentationTools controller={c} />
    </section>
  );
}
