import { describe, expect, it } from "vitest";
import { isDoNotTrackEnabled, isGlobalPrivacyControlEnabled } from "../../src/privacy/signals";

describe("privacy signals", () => {
  it("detects do-not-track truthy values", () => {
    expect(isDoNotTrackEnabled({ doNotTrack: "1" })).toBe(true);
    expect(isDoNotTrackEnabled({ msDoNotTrack: "yes" })).toBe(true);
    expect(isDoNotTrackEnabled({ doNotTrack: "0" })).toBe(false);
  });

  it("detects global privacy control", () => {
    expect(isGlobalPrivacyControlEnabled({ globalPrivacyControl: true })).toBe(true);
    expect(isGlobalPrivacyControlEnabled({ globalPrivacyControl: false })).toBe(false);
  });
});
