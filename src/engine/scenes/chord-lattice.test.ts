import { describe, expect, it } from "vitest";
import { defaultChordLattice } from "../config/defaults";
import { buildChordLatticeInstances, initializeChordLattice, updateChordLattice } from "./chord-lattice";

describe("Chord Lattice", () => {
  it("initializes deterministically from a seed", () => {
    const config = defaultChordLattice();
    expect(Array.from(initializeChordLattice(42, config).layers)).toEqual(
      Array.from(initializeChordLattice(42, config).layers),
    );
  });

  it("emits full-circle string-art plus an outer fan ring", () => {
    const config = {
      ...defaultChordLattice(),
      foldOrder: 8,
      layerCount: 2,
      chordsPerLayer: 10,
      trailGenerations: 1,
    };
    const state = initializeChordLattice(7, config);
    updateChordLattice(state, 1 / 60, config, 0);
    const instances = buildChordLatticeInstances(state, config);
    expect(instances.count).toBe(2 * 10 + 8 * 11);
    expect(instances.data[5]).toBeCloseTo(config.ribbonWidth);
  });
});
