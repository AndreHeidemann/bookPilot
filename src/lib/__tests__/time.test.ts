import { describe, expect, it } from "vitest";

import { minutesToTime, parseTimeToMinutes } from "../time";

describe("time utilities", () => {
  it("converts time string to minutes and back", () => {
    const minutes = parseTimeToMinutes("09:30");
    expect(minutes).toBe(570);
    expect(minutesToTime(minutes)).toBe("09:30");
  });

  it("handles midnight", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(minutesToTime(5)).toBe("00:05");
  });
});
