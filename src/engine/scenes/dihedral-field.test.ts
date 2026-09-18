import { describe, expect, it } from "vitest";
import { defaultDihedralField } from "../config/defaults";
import { buildDihedralInstances, initializeDihedral, updateDihedral } from "./dihedral-field";

describe("Dihedral Field", () => {
  it("initializes deterministically", () => {
    const config = defaultDihedralField();
    expect(Array.from(initializeDihedral(42, config).paths)).toEqual(Array.from(initializeDihedral(42, config).paths));
  });

  it("builds the requested geometric fold copies", () => {
    const config = { ...defaultDihedralField(), pathCount: 4, segmentsPerPath: 3, foldOrder: 3, mirror: true };
    const state = initializeDihedral(7, config);
    updateDihedral(state, 1 / 60, config, 0.05);
    expect(buildDihedralInstances(state, config).count).toBe(72);
  });
});
