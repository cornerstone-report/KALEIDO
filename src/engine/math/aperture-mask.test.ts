import { describe, expect, it } from "vitest";
import { maskRadius } from "./aperture-mask";

describe("aperture masks", () => {
  it("leaves the open ring at full radius", () => {
    expect(maskRadius(0, "string", 8)).toBe(1);
    expect(maskRadius(Math.PI, "string", 8)).toBe(1);
  });

  it("collapses the figure-8 waist and keeps the lobes", () => {
    expect(maskRadius(Math.PI / 2, "figure8", 8)).toBeGreaterThan(0.8);
    expect(maskRadius(0, "figure8", 8)).toBe(0);
  });

  it("keeps wedge sectors and drops the gaps", () => {
    expect(maskRadius(0.01, "wedge", 8)).toBe(1);
    expect(maskRadius(Math.PI / 8 + 0.2, "wedge", 8)).toBe(0);
  });
});
