import { describe, expect, it } from "vitest";
import { defaultChordLattice } from "../config/defaults";
import {
  buildChordLatticeInstances,
  expectedChordLatticeCount,
  initializeChordLattice,
  updateChordLattice,
} from "./chord-lattice";

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
    expect(instances.count).toBe(expectedChordLatticeCount(config));
    expect(instances.data[5]).toBeCloseTo(config.ribbonWidth);
  });

  it("keeps a circular envelope instead of a wedge scribble", () => {
    const config = { ...defaultChordLattice(), trailGenerations: 1, layerCount: 1, chordsPerLayer: 24, foldOrder: 4 };
    const instances = buildChordLatticeInstances(initializeChordLattice(3, config), config);
    let maxR = 0;
    for (let index = 0; index < instances.count; index += 1) {
      const x = instances.data[index * 6];
      const y = instances.data[index * 6 + 1];
      maxR = Math.max(maxR, Math.hypot(x, y));
    }
    expect(maxR).toBeGreaterThan(0.4);
    expect(maxR).toBeLessThan(1.05);
  });
});
