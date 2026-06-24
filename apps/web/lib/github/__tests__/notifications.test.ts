import { describe, it, expect } from "bun:test";
import { inQuietHours } from "../notifications";

const at = (utc: string) => new Date(`2026-01-01T${utc}:00Z`);

describe("notification quiet hours", () => {
  it("no window configured -> never suppresses", () => {
    expect(inQuietHours(null, "08:00", "UTC", at("23:00"))).toBe(false);
    expect(inQuietHours("22:00", null, "UTC", at("23:00"))).toBe(false);
  });

  it("start === end -> never suppresses (was ambiguous and could suppress forever)", () => {
    expect(inQuietHours("09:00", "09:00", "UTC", at("09:00"))).toBe(false);
    expect(inQuietHours("00:00", "00:00", "UTC", at("12:00"))).toBe(false);
  });

  it("same-day window", () => {
    expect(inQuietHours("09:00", "17:00", "UTC", at("12:00"))).toBe(true);
    expect(inQuietHours("09:00", "17:00", "UTC", at("20:00"))).toBe(false);
    expect(inQuietHours("09:00", "17:00", "UTC", at("08:59"))).toBe(false);
  });

  it("overnight window (22:00 -> 08:00)", () => {
    expect(inQuietHours("22:00", "08:00", "UTC", at("23:30"))).toBe(true);
    expect(inQuietHours("22:00", "08:00", "UTC", at("03:00"))).toBe(true);
    expect(inQuietHours("22:00", "08:00", "UTC", at("12:00"))).toBe(false);
  });

  it("respects the configured timezone", () => {
    // 12:00 UTC is 04:00 in America/Los_Angeles (UTC-8 in January).
    expect(inQuietHours("22:00", "08:00", "America/Los_Angeles", at("12:00"))).toBe(true);
  });
});
