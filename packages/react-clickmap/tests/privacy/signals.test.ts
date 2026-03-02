import { describe, expect, it } from "vitest";
import { isDoNotTrackEnabled, isGlobalPrivacyControlEnabled } from "../../src/privacy/signals";

describe("isDoNotTrackEnabled", () => {
  it("returns true for navigator.doNotTrack = '1'", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: "1" })).toBe(true);
  });

  it("returns true for navigator.doNotTrack = 'yes' (case insensitive)", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: "yes" })).toBe(true);
    expect(isDoNotTrackEnabled({ doNotTrack: "Yes" })).toBe(true);
    expect(isDoNotTrackEnabled({ doNotTrack: "YES" })).toBe(true);
  });

  it("returns true for msDoNotTrack = 'yes'", () => {
    expect(isDoNotTrackEnabled({ msDoNotTrack: "yes" })).toBe(true);
  });

  it("returns true for msDoNotTrack = '1'", () => {
    expect(isDoNotTrackEnabled({ msDoNotTrack: "1" })).toBe(true);
  });

  it("returns false for doNotTrack = '0'", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: "0" })).toBe(false);
  });

  it("returns false for doNotTrack = null", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: null } as never)).toBe(false);
  });

  it("returns false for doNotTrack = undefined (unset)", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: undefined } as never)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: "" })).toBe(false);
  });

  it("returns false when no navigator is provided and global navigator is unavailable", () => {
    expect(isDoNotTrackEnabled(undefined)).toBe(false);
  });

  it("prefers navigator.doNotTrack over msDoNotTrack", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: "1", msDoNotTrack: "0" })).toBe(true);
  });
});

describe("isGlobalPrivacyControlEnabled", () => {
  it("returns true when globalPrivacyControl is true", () => {
    expect(isGlobalPrivacyControlEnabled({ globalPrivacyControl: true })).toBe(true);
  });

  it("returns false when globalPrivacyControl is false", () => {
    expect(isGlobalPrivacyControlEnabled({ globalPrivacyControl: false })).toBe(false);
  });

  it("returns false when globalPrivacyControl is undefined", () => {
    expect(isGlobalPrivacyControlEnabled({} as never)).toBe(false);
  });

  it("returns false when no navigator provided", () => {
    expect(isGlobalPrivacyControlEnabled(undefined)).toBe(false);
  });
});
