import { describe, expect, it } from "vitest";
import { createAnonymousSessionId } from "../../src/capture/session";

describe("session", () => {
  it("creates stable-looking anonymous ids", () => {
    const sessionA = createAnonymousSessionId();
    const sessionB = createAnonymousSessionId();

    expect(sessionA).not.toEqual(sessionB);
    expect(sessionA.length).toBeGreaterThan(10);
  });
});
