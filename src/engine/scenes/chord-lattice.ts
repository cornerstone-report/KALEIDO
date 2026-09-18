import type { DihedralFieldConfig } from "../config/types";
import { createPrng } from "../math/prng";
import { INV_PHI } from "../math/phi";
import { clipSegmentToMask } from "../math/aperture-mask";

const LAYER_STRIDE = 4;
const INSTANCE_STRIDE = 6;
const STAMP_STRIDE = 4;
const TAU = Math.PI * 2;

export const LAYER_SPIN_RATES = [1, 0.6180339887, 0.41421356237, 1 / 3, 0.57735026919, 0.301699434] as const;
const STAMP_RADIUS = [1, 1.22, 0.74, 1.38, 0.58, 1.12] as const;

export interface ChordLatticeState {
  layers: Float32Array;
  elapsed: number;
  palettePhase: number;
  injectCarry: number;
  renewCarry: number;
  walkSkip: number;
  walkSign: number;
  stamps: Float32Array;
}

export interface ChordLatticeInstances {
  data: Float32Array<ArrayBufferLike>;
  count: number;
}

export const stampSkipDelta = (generation: number): number => {
  if (generation <= 0) return 0;
  return [-2, 3, -4, 5, -3, 2][(generation - 1) % 6] ?? 0;
};

export const stampPointDelta = (generation: number): number => {
  if (generation <= 0) return 0;
  return [8, -6, 13, -8, 5, -3][(generation - 1) % 6] ?? 0;
};

export const stampRadiusScale = (generation: number): number =>
  STAMP_RADIUS[generation % STAMP_RADIUS.length] ?? 1;

const wrapSkip = (skip: number, points: number): number => {
  const max = Math.max(1, points - 1);
  let value = ((Math.round(skip) - 1) % max + max) % max + 1;
  if (value === points) value = 1;
  return value;
};

const pointsForStamp = (base: number, generation: number): number =>
  Math.max(8, Math.min(160, base + stampPointDelta(generation)));

export const skipForLayer = (walkSkip: number, layer: number, points: number): number =>
  wrapSkip(walkSkip + layer * 5, points);

const layerRadius = (config: DihedralFieldConfig, layer: number): number => {
  const count = Math.max(1, config.layerCount);
  const curve = (1 - INV_PHI ** (layer + 1)) / (1 - INV_PHI ** count);
  return config.aperture + config.ringWidth * curve;
};

const layerSign = (layer: number): number => (layer % 2 === 0 ? 1 : -1);

export const initializeChordLattice = (seed: number, config: DihedralFieldConfig): ChordLatticeState => {
  const random = createPrng(seed ^ 0x4c415454);
  const layers = new Float32Array(config.layerCount * LAYER_STRIDE);
  for (let layer = 0; layer < config.layerCount; layer += 1) {
    const offset = layer * LAYER_STRIDE;
    layers[offset] = random() * TAU;
    layers[offset + 1] = Math.floor(random() * 3);
    layers[offset + 2] = (layer + 0.5) / Math.max(1, config.layerCount);
    layers[offset + 3] = 0;
  }
  const generations = Math.max(1, config.trailGenerations);
  const stamps = new Float32Array(generations * STAMP_STRIDE);
  for (let generation = 0; generation < generations; generation += 1) {
    const offset = generation * STAMP_STRIDE;
    stamps[offset] = generation * 0.41;
    stamps[offset + 1] = stampSkipDelta(generation);
    stamps[offset + 2] = stampPointDelta(generation);
    stamps[offset + 3] = stampRadiusScale(generation);
  }
  return {
    layers,
    elapsed: 0,
    palettePhase: 0,
    injectCarry: 0,
    renewCarry: 0,
    walkSkip: config.chordSkip,
    walkSign: random() < 0.5 ? -1 : 1,
    stamps,
  };
};

export const updateChordLattice = (state: ChordLatticeState, dt: number, config: DihedralFieldConfig, paletteSpeed: number): void => {
  state.elapsed += dt;
  state.palettePhase = (state.palettePhase + dt * paletteSpeed) % 1;

  const injectInterval = 0.028 + (1 - Math.min(1, config.speed)) * 0.04;
  state.injectCarry += dt;
  while (state.injectCarry >= injectInterval) {
    state.injectCarry -= injectInterval;
    for (let index = state.stamps.length / STAMP_STRIDE - 1; index > 0; index -= 1) {
      const dest = index * STAMP_STRIDE;
      const src = (index - 1) * STAMP_STRIDE;
      state.stamps[dest] = state.stamps[src];
      state.stamps[dest + 1] = state.stamps[src + 1];
      state.stamps[dest + 2] = state.stamps[src + 2];
      state.stamps[dest + 3] = state.stamps[src + 3];
    }
    state.stamps[0] += TAU / Math.max(8, config.chordsPerLayer / 4);
    state.stamps[1] = 0;
    state.stamps[2] = 0;
    state.stamps[3] = 1;
    for (let generation = 1; generation < state.stamps.length / STAMP_STRIDE; generation += 1) {
      const offset = generation * STAMP_STRIDE;
      state.stamps[offset + 1] = stampSkipDelta(generation);
      state.stamps[offset + 2] = stampPointDelta(generation);
      state.stamps[offset + 3] = stampRadiusScale(generation);
    }
  }

  const renewal = Math.max(3, config.transitionSeconds);
  state.renewCarry += dt;
  if (state.renewCarry >= renewal) {
    state.renewCarry -= renewal;
    const points = Math.max(8, config.chordsPerLayer);
    state.walkSkip = wrapSkip(state.walkSkip + state.walkSign * Math.max(2, Math.round(points / 14)), points);
    if (state.walkSkip <= 2 || state.walkSkip >= points - 2) state.walkSign *= -1;
  }

  for (let layer = 0; layer < config.layerCount; layer += 1) {
    const rate = LAYER_SPIN_RATES[layer % LAYER_SPIN_RATES.length] ?? 1;
    state.layers[layer * LAYER_STRIDE] += dt * config.spin * rate * 2.6 * layerSign(layer);
  }
};

const writeStroke = (
  data: Float32Array<ArrayBufferLike>,
  write: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ink: number,
  width: number,
): number => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  data[write] = (x0 + x1) * 0.5;
  data[write + 1] = (y0 + y1) * 0.5;
  data[write + 2] = Math.atan2(dy, dx);
  data[write + 3] = ink;
  data[write + 4] = Math.max(0.0012, Math.hypot(dx, dy) * 0.5);
  data[write + 5] = width;
  return write + INSTANCE_STRIDE;
};

export const expectedChordLatticeCount = (config: DihedralFieldConfig): number => {
  const generations = Math.max(1, config.trailGenerations);
  let chords = 0;
  for (let generation = 0; generation < generations; generation += 1) {
    chords += config.layerCount * pointsForStamp(config.chordsPerLayer, generation);
  }
  return chords;
};

export const buildChordLatticeInstances = (
  state: ChordLatticeState,
  config: DihedralFieldConfig,
  target?: Float32Array<ArrayBufferLike>,
): ChordLatticeInstances => {
  const generations = Math.max(1, config.trailGenerations);
  const total = expectedChordLatticeCount(config) * 3;
  const data = target && target.length >= total * INSTANCE_STRIDE ? target : new Float32Array(total * INSTANCE_STRIDE);
  let write = 0;
  const petals = Math.max(2, config.foldOrder);

  for (let generation = 0; generation < generations; generation += 1) {
    const stampOffset = Math.min(generation, state.stamps.length / STAMP_STRIDE - 1) * STAMP_STRIDE;
    const stampPhase = state.stamps[stampOffset] ?? 0;
    const skipDelta = state.stamps[stampOffset + 1] ?? stampSkipDelta(generation);
    const radiusScale = state.stamps[stampOffset + 3] ?? stampRadiusScale(generation);
    const points = pointsForStamp(config.chordsPerLayer, generation);
    for (let layer = 0; layer < config.layerCount; layer += 1) {
      const layerOffset = layer * LAYER_STRIDE;
      const rate = LAYER_SPIN_RATES[layer % LAYER_SPIN_RATES.length] ?? 1;
      const skip = wrapSkip(skipForLayer(state.walkSkip, layer, points) + skipDelta, points);
      const pulse = 1 + 0.06 * Math.sin(state.elapsed * (0.7 + rate) + layer * 1.2);
      const baseRadius = layerRadius(config, layer) * radiusScale * pulse;
      const scallop = 0.11 + layer * 0.015;
      const drift = 0.05 + layer * 0.012;
      const cx = drift * Math.sin(state.elapsed * rate * 0.47 + layer * 1.7);
      const cy = drift * Math.cos(state.elapsed * rate * 0.31 + layer * 2.3);
      const phase = state.layers[layerOffset] + stampPhase;
      const inkBase = (state.layers[layerOffset + 2] + state.palettePhase + generation * 0.13) % 1;
      const maskPhase = -state.elapsed * config.spin * 0.55;
      for (let chord = 0; chord < points; chord += 1) {
        const a0 = phase + (chord / points) * TAU;
        const a1 = phase + ((chord + skip) / points) * TAU;
        const r0 = Math.min(0.98, baseRadius * (1 + scallop * Math.cos(petals * a0)));
        const r1 = Math.min(0.98, baseRadius * (1 + scallop * Math.cos(petals * a1)));
        const x0 = cx + Math.cos(a0) * r0;
        const y0 = cy + Math.sin(a0) * r0;
        const x1 = cx + Math.cos(a1) * r1;
        const y1 = cy + Math.sin(a1) * r1;
        const ink = (inkBase + (chord / points) * 0.18) % 1;
        const runs = clipSegmentToMask(x0, y0, x1, y1, config.apertureMask, petals, config.aperture, maskPhase);
        for (const [ax, ay, bx, by] of runs) {
          if (write + INSTANCE_STRIDE > data.length) break;
          write = writeStroke(data, write, ax, ay, bx, by, ink, config.ribbonWidth);
        }
      }
    }
  }

  return { data, count: write / INSTANCE_STRIDE };
};
