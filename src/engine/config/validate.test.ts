import { describe, expect, it } from "vitest";
import { clampDihedral, normalizePreset } from "./validate";

describe("preset validation", () => {
  it("clamps public dihedral controls", () => {
    expect(clampDihedral({ foldOrder: 99, pathCount: -1, ribbonWidth: 3 })).toMatchObject({
      foldOrder: 21,
      pathCount: 2,
      ribbonWidth: 0.02,
    });
  });

  it("preserves the selected visual family and clamps lattice controls", () => {
    expect(clampDihedral({ family: "chord-lattice", layerCount: 20, chordsPerLayer: 1, aperture: 9 })).toMatchObject({
      family: "chord-lattice",
      layerCount: 6,
      chordsPerLayer: 8,
      aperture: 0.7,
    });
  });

  it("rejects an unsupported schema", () => {
    expect(normalizePreset({ schemaVersion: 2 } as never).sceneId).toBe("dihedral-field");
  });
});
