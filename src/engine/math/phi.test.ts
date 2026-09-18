import { describe, expect, it } from "vitest";
import { PHI, circularFieldScale } from "./phi";

describe("circular field scale", () => {
  it("inscribes a circle on a wide framebuffer", () => {
    const [x, y] = circularFieldScale(1920, 1080, 0);
    expect(y / x).toBeCloseTo(1920 / 1080, 6);
    expect(y).toBeCloseTo(1, 6);
  });

  it("covers the long axis at bleed 1", () => {
    const [x, y] = circularFieldScale(1920, 1080, 1);
    expect(x).toBeCloseTo(1, 6);
    expect(y).toBeCloseTo(1920 / 1080, 6);
  });

  it("uses φ as extra overflow past cover", () => {
    const cover = circularFieldScale(1600, 900, 1);
    const bleed = circularFieldScale(1600, 900, PHI);
    expect(bleed[0] / cover[0]).toBeCloseTo(PHI, 6);
  });
});
