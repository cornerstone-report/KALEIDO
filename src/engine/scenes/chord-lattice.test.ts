import { describe, expect, it } from "vitest";
import { defaultChordLattice } from "../config/defaults";
import {
  LAYER_SPIN_RATES,
  buildChordLatticeInstances,
  expectedChordLatticeCount,
  initializeChordLattice,
  stampSkipDelta,
  updateChordLattice,
} from "./chord-lattice";

describe("Chord Lattice", () => {
  it("initializes deterministically from a seed", () => {
    const config = defaultChordLattice();
    expect(Array.from(initializeChordLattice(42, config).layers)).toEqual(
      Array.from(initializeChordLattice(42, config).layers),
    );
  });

  it("emits full-circle string-art without a polygon fan frame", () => {
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
    expect(instances.count).toBe(2 * 10);
    expect(instances.count).toBe(expectedChordLatticeCount(config));
    expect(instances.data[5]).toBeCloseTo(config.ribbonWidth);
  });

  it("stays inside a bounded field", () => {
    const config = { ...defaultChordLattice(), trailGenerations: 1, layerCount: 1, chordsPerLayer: 24, foldOrder: 4 };
    const instances = buildChordLatticeInstances(initializeChordLattice(3, config), config);
    let maxR = 0;
    for (let index = 0; index < instances.count; index += 1) {
      const x = instances.data[index * 6];
      const y = instances.data[index * 6 + 1];
      maxR = Math.max(maxR, Math.hypot(x, y));
    }
    expect(maxR).toBeGreaterThan(0.15);
    expect(maxR).toBeLessThan(1.2);
  });

  it("counter-rotates adjacent layers", () => {
    const config = { ...defaultChordLattice(), layerCount: 2, spin: 1, trailGenerations: 1 };
    const state = initializeChordLattice(9, config);
    const before0 = state.layers[0];
    const before1 = state.layers[4];
    updateChordLattice(state, 0.5, config, 0);
    expect(state.layers[0] - before0).toBeCloseTo(0.5 * LAYER_SPIN_RATES[0] * 2.6, 5);
    expect(state.layers[4] - before1).toBeCloseTo(-0.5 * LAYER_SPIN_RATES[1] * 2.6, 5);
  });

  it("shifts instance positions across a two-second step", () => {
    const config = { ...defaultChordLattice(), trailGenerations: 1, layerCount: 2, foldOrder: 8 };
    const state = initializeChordLattice(11, config);
    const first = buildChordLatticeInstances(state, config).data.slice(0, 12);
    updateChordLattice(state, 2, config, 0.1);
    const second = buildChordLatticeInstances(state, config).data.slice(0, 12);
    expect(Array.from(first)).not.toEqual(Array.from(second));
  });

  it("walks k by a whole integer on renewal", () => {
    const config = { ...defaultChordLattice(), transitionSeconds: 3, chordsPerLayer: 24, chordSkip: 11 };
    const state = initializeChordLattice(4, config);
    const start = state.walkSkip;
    updateChordLattice(state, 3, config, 0);
    expect(Number.isInteger(state.walkSkip)).toBe(true);
    expect(state.walkSkip).not.toBe(start);
  });

  it("gives history stamps a different integer skip than the live rose", () => {
    expect(stampSkipDelta(0)).toBe(0);
    expect(stampSkipDelta(1)).not.toBe(0);
  });
});
