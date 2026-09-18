import { describe, expect, it } from "vitest";
import { defaultChordLattice } from "../config/defaults";
import { buildChordLatticeInstances, initializeChordLattice, updateChordLattice } from "./chord-lattice";

describe("Chord Lattice", () => {
  it("initializes deterministically from a seed", () => {
    const config = defaultChordLattice();
    expect(Array.from(initializeChordLattice(42, config).layers)).toEqual(Array.from(initializeChordLattice(42, config).layers));
  });

  it("emits one thin chord for every layer, sample, and dihedral copy", () => {
    const config = { ...defaultChordLattice(), foldOrder: 3, mirror: true, layerCount: 2, chordsPerLayer: 9 };
    const state = initializeChordLattice(7, config);
    updateChordLattice(state, 1 / 60, config, 0);
    const instances = buildChordLatticeInstances(state, config);
    expect(instances.count).toBe(108);
    expect(instances.data[5]).toBeCloseTo(config.ribbonWidth);
  });
});
