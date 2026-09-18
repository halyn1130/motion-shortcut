import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  FIXED_MAPPINGS,
  loadProfile,
  saveProfile,
} from "./profile";
import { formatShortcut, supportedKey } from "./shortcuts";

describe("발표 프로필 커스텀키", () => {
  beforeEach(() => localStorage.clear());
  it("기존 프로필과 자료를 보존하며 커스텀키를 마이그레이션한다", () => {
    const legacy = {
      ...DEFAULT_PROFILE,
      name: "기존 발표",
      shortcuts: undefined,
      resources: [
        {
          id: "saved",
          name: "자료",
          kind: "url",
          value: "https://example.com",
        },
      ],
    };
    localStorage.setItem(
      "flickey.presentation-profile.v1",
      JSON.stringify(legacy),
    );
    const profile = loadProfile();
    expect(profile.name).toBe("기존 발표");
    expect(profile.resources).toEqual(legacy.resources);
    expect(profile.shortcuts).toEqual({});
    expect(profile.mappings).toEqual(FIXED_MAPPINGS);
  });
  it("조합키를 저장하고 다시 불러온다", () => {
    saveProfile({
      ...DEFAULT_PROFILE,
      shortcuts: { "next-slide": { key: "k", modifiers: ["Meta", "Shift"] } },
    });
    expect(loadProfile().shortcuts["next-slide"]).toEqual({
      key: "k",
      modifiers: ["Meta", "Shift"],
    });
  });
  it("키 이름을 표시하고 지원하지 않는 키는 거부한다", () => {
    expect(formatShortcut({ key: "k", modifiers: ["Meta", "Shift"] })).toBe(
      "⌘ + ⇧ + K",
    );
    expect(supportedKey("ArrowRight")).toBe(true);
    expect(supportedKey("F99")).toBe(false);
  });
});
