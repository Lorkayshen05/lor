import { describe, expect, it } from "vitest";
import { directionsUrl, formatDistance, haversineKm, isValidLatLng } from "@/lib/geo";

describe("geo", () => {
  it("computes ~ known distance (KLCC ↔ Sri Petaling ≈ 10-13 km)", () => {
    const d = haversineKm({ lat: 3.1579, lng: 101.7116 }, { lat: 3.072, lng: 101.696 });
    expect(d).toBeGreaterThan(9);
    expect(d).toBeLessThan(13);
  });
  it("is zero for the same point and symmetric", () => {
    const a = { lat: 3.1, lng: 101.6 };
    const b = { lat: 3.2, lng: 101.7 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
  it("formats approximate distances", () => {
    expect(formatDistance(0.4)).toBe("< 1 km");
    expect(formatDistance(3.44)).toBe("~3.4 km");
    expect(formatDistance(23.7)).toBe("~24 km");
  });
  it("validates coordinates", () => {
    expect(isValidLatLng(3, 101)).toBe(true);
    expect(isValidLatLng(91, 101)).toBe(false);
    expect(isValidLatLng("3", 101)).toBe(false);
  });
  it("encodes addresses in directions URLs", () => {
    const u = directionsUrl("No. 52-G, Jalan Radin Anum 1 & co");
    expect(u).toContain("destination=No.%2052-G%2C%20Jalan%20Radin%20Anum%201%20%26%20co");
  });
});
