import { describe, expect, it } from "vitest";
import { clipSegmentToMask, pointInsideMask } from "./aperture-mask";

describe("aperture masks", () => {
  it("keeps the open ring unclipped", () => {
    expect(pointInsideMask(0.4, 0, "string", 8, 0.2, 0)).toBe(true);
    expect(clipSegmentToMask(-0.4, 0, 0.4, 0, "string", 8, 0.2, 0)).toHaveLength(1);
  });

  it("rejects the origin for every shaped mask", () => {
    expect(pointInsideMask(0, 0, "heart", 8, 0.2, 0)).toBe(false);
    expect(pointInsideMask(0, 0, "figure8", 8, 0.2, 0)).toBe(false);
    expect(pointInsideMask(0, 0, "teardrop", 8, 0.2, 0)).toBe(false);
  });

  it("accepts a figure-8 lobe and rejects the waist", () => {
    expect(pointInsideMask(0, 0.45, "figure8", 8, 0.12, 0)).toBe(true);
    expect(pointInsideMask(0.45, 0, "figure8", 8, 0.12, 0)).toBe(false);
  });

  it("clips a crossing chord into interior runs", () => {
    const runs = clipSegmentToMask(-0.8, 0.45, 0.8, 0.45, "figure8", 8, 0.12, 0);
    expect(runs.length).toBeGreaterThan(0);
    for (const [x0, y0, x1, y1] of runs) {
      expect(pointInsideMask((x0 + x1) * 0.5, (y0 + y1) * 0.5, "figure8", 8, 0.12, 0)).toBe(true);
    }
  });
});
