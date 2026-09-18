import type { DihedralFieldConfig } from "../config/types";
import { createPrng } from "../math/prng";

const LAYER_STRIDE = 4;
const INSTANCE_STRIDE = 6;
const STAMP_STRIDE = 4;
const TAU = Math.PI * 2;

/** Incommensurate layer clocks. Integers stay on k; time stays a float. */
export const LAYER_SPIN_RATES = [1, 0.6180339887, 0.41421356237, 1 / 3, 0.57735026919, 0.301699434] as const;

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
  return [-1, 1, -2, 2, -1, 1][(generation - 1) % 6] ?? 0;
};

export const stampPointDelta = (generation: number): number => {
  if (generation <= 0) return 0;
  return [2, -2, 4, -3, 1, 0][(generation - 1) % 6] ?? 0;
};

export const stampRadiusScale = (generation: number): number => 1 - generation * 0.014;

const wrapSkip = (skip: number, points: number): number => {
  const max = Math.max(1, points - 1);
  let value = ((Math.round(skip) - 1) % max + max) % max + 1;
  if (value === points) value = 1;
  return value;
};

const pointsForStamp = (base: number, generation: number): number =>
  Math.max(8, Math.min(160, base + stampPointDelta(generation)));

export const skipForLayer = (walkSkip: number, layer: number, points: number): number =>
  wrapSkip(walkSkip + layer * 3, points);

export const initializeChordLattice = (seed: number, config: DihedralFieldConfig): ChordLatticeState => {
  const random = createPrng(seed ^ 0x4c415454);
  const layers = new Float32Array(config.layerCount * LAYER_STRIDE);
  for (let layer = 0; layer < config.layerCount; layer += 1) {
    const offset = layer * LAYER_STRIDE;
    layers[offset] = random() * TAU;
    layers[offset + 1] = Math.floor(random() * 3);
    layers[offset + 2] = config.layerCount <= 1 ? 0 : layer / (config.layerCount - 1);
    layers[offset + 3] = 0;
  }
  const generations = Math.max(1, config.trailGenerations);
  const stamps = new Float32Array(generations * STAMP_STRIDE);
  for (let generation = 0; generation < generations; generation += 1) {
    const offset = generation * STAMP_STRIDE;
    stamps[offset] = generation * 0.17;
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

  const injectInterval = 0.055 + (1 - Math.min(1, config.speed)) * 0.09;
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
    state.stamps[0] += TAU / Math.max(24, config.chordsPerLayer);
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
    state.walkSkip = wrapSkip(state.walkSkip + state.walkSign, points);
    if (state.walkSkip <= 1 || state.walkSkip >= points - 1) state.walkSign *= -1;
  }

  for (let layer = 0; layer < config.layerCount; layer += 1) {
    const rate = LAYER_SPIN_RATES[layer % LAYER_SPIN_RATES.length] ?? 1;
    state.layers[layer * LAYER_STRIDE] += dt * config.spin * rate;
  }
};

const polar = (radius: number, angle: number): readonly [number, number] => [Math.cos(angle) * radius, Math.sin(angle) * radius];

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
  return chords + config.foldOrder * (config.chordsPerLayer + 1);
};

export const buildChordLatticeInstances = (
  state: ChordLatticeState,
  config: DihedralFieldConfig,
  target?: Float32Array<ArrayBufferLike>,
): ChordLatticeInstances => {
  const generations = Math.max(1, config.trailGenerations);
  const total = expectedChordLatticeCount(config);
  const data = target && target.length >= total * INSTANCE_STRIDE ? target : new Float32Array(total * INSTANCE_STRIDE);
  let write = 0;
  const fanPhase = state.layers[0] ?? 0;

  for (let generation = 0; generation < generations; generation += 1) {
    const stampOffset = Math.min(generation, state.stamps.length / STAMP_STRIDE - 1) * STAMP_STRIDE;
    const stampPhase = state.stamps[stampOffset] ?? 0;
    const skipDelta = state.stamps[stampOffset + 1] ?? stampSkipDelta(generation);
    const radiusScale = state.stamps[stampOffset + 3] ?? stampRadiusScale(generation);
    const points = pointsForStamp(config.chordsPerLayer, generation);
    for (let layer = 0; layer < config.layerCount; layer += 1) {
      const layerOffset = layer * LAYER_STRIDE;
      const skip = wrapSkip(skipForLayer(state.walkSkip, layer, points) + skipDelta, points);
      const inner = config.aperture + config.ringWidth * (layer / Math.max(1, config.layerCount));
      const outer = config.aperture + config.ringWidth * ((layer + 1) / Math.max(1, config.layerCount));
      const radius = (inner + outer) * 0.5 * radiusScale;
      const phase = state.layers[layerOffset] + stampPhase;
      const ink = (state.layers[layerOffset + 2] + state.palettePhase) % 1;
      for (let chord = 0; chord < points; chord += 1) {
        const a0 = phase + (chord / points) * TAU;
        const a1 = phase + ((chord + skip) / points) * TAU;
        const [x0, y0] = polar(radius, a0);
        const [x1, y1] = polar(radius, a1);
        write = writeStroke(data, write, x0, y0, x1, y1, ink, config.ribbonWidth);
      }
    }
  }

  const fanRadius = Math.min(0.98, config.aperture + config.ringWidth + 0.08);
  const hubRadius = Math.max(config.aperture + config.ringWidth * 0.72, fanRadius * 0.74);
  const fanCount = config.chordsPerLayer + 1;
  for (let fold = 0; fold < config.foldOrder; fold += 1) {
    const hubAngle = fanPhase + (fold / config.foldOrder) * TAU;
    const [hx, hy] = polar(fanRadius, hubAngle);
    const spread = TAU / config.foldOrder;
    const ink = (0.82 + state.palettePhase) % 1;
    for (let spoke = 0; spoke < fanCount; spoke += 1) {
      const t = fanCount === 1 ? 0.5 : spoke / (fanCount - 1);
      const rimAngle = hubAngle + (t - 0.5) * spread * 0.92;
      const [rx, ry] = polar(hubRadius, rimAngle);
      write = writeStroke(data, write, hx, hy, rx, ry, ink, config.ribbonWidth);
    }
  }

  return { data, count: total };
};
