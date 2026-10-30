import { getCalendarDays } from "./calendar";

describe("getCalendarDays", () => {
  it("returns a 42-day Sunday-to-Saturday grid that includes adjacent months", () => {
    const days = getCalendarDays("2026-08");

    expect(days).toHaveLength(42);
    expect(days[0].format("YYYY-MM-DD")).toBe("2026-07-26");
    expect(days[0].format("ddd")).toBe("Sun");
    expect(days[41].format("YYYY-MM-DD")).toBe("2026-09-05");
    expect(days[41].format("ddd")).toBe("Sat");
    expect(days[6].add(1, "day").isSame(days[7], "day")).toBe(true);
  });
});
