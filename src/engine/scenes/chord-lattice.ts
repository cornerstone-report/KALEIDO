import type { DihedralFieldConfig } from "../config/types";
import { createPrng } from "../math/prng";

const LAYER_STRIDE = 4; // phase, skip jitter, ink band, reserved
const INSTANCE_STRIDE = 6; // x, y, heading, ink, half length, thickness
const TAU = Math.PI * 2;

export interface ChordLatticeState {
  layers: Float32Array;
  elapsed: number;
  palettePhase: number;
  injectCarry: number;
  stampPhases: Float32Array;
}

export interface ChordLatticeInstances {
  data: Float32Array<ArrayBufferLike>;
  count: number;
}

const skipForLayer = (config: DihedralFieldConfig, layer: number): number => {
  const points = Math.max(3, config.chordsPerLayer);
  const raw = Math.round(config.chordSkip + layer * 3);
  return Math.max(1, Math.min(points - 1, raw));
};

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
  const stamps = Math.max(1, config.trailGenerations);
  const stampPhases = new Float32Array(stamps);
  return { layers, elapsed: 0, palettePhase: 0, injectCarry: 0, stampPhases };
};

export const updateChordLattice = (state: ChordLatticeState, dt: number, config: DihedralFieldConfig, paletteSpeed: number): void => {
  state.elapsed += dt;
  state.palettePhase = (state.palettePhase + dt * paletteSpeed) % 1;
  const interval = 0.055 + (1 - Math.min(1, config.speed)) * 0.09;
  state.injectCarry += dt;
  while (state.injectCarry >= interval) {
    state.injectCarry -= interval;
    for (let index = state.stampPhases.length - 1; index > 0; index -= 1) {
      state.stampPhases[index] = state.stampPhases[index - 1];
    }
    state.stampPhases[0] += TAU / Math.max(24, config.chordsPerLayer);
  }
  for (let layer = 0; layer < config.layerCount; layer += 1) {
    state.layers[layer * LAYER_STRIDE] += dt * config.spin;
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
  return config.layerCount * config.chordsPerLayer * generations + config.foldOrder * (config.chordsPerLayer + 1);
};

/**
 * Full-circle string-art per radial layer, plus an outer fan ring.
 * Geometry is circular in unit space; the renderer applies aspect contain.
 */
export const buildChordLatticeInstances = (
  state: ChordLatticeState,
  config: DihedralFieldConfig,
  target?: Float32Array<ArrayBufferLike>,
): ChordLatticeInstances => {
  const generations = Math.max(1, config.trailGenerations);
  const total = expectedChordLatticeCount(config);
  const data = target && target.length >= total * INSTANCE_STRIDE ? target : new Float32Array(total * INSTANCE_STRIDE);
  let write = 0;
  const spin = state.elapsed * config.spin;

  for (let generation = 0; generation < generations; generation += 1) {
    const stamp = state.stampPhases[Math.min(generation, state.stampPhases.length - 1)] ?? 0;
    const generationShift = generation * (TAU / Math.max(8, config.chordsPerLayer));
    for (let layer = 0; layer < config.layerCount; layer += 1) {
      const layerOffset = layer * LAYER_STRIDE;
      const points = Math.max(3, config.chordsPerLayer);
      const skip = skipForLayer(config, layer);
      const inner = config.aperture + config.ringWidth * (layer / Math.max(1, config.layerCount));
      const outer = config.aperture + config.ringWidth * ((layer + 1) / Math.max(1, config.layerCount));
      const radius = (inner + outer) * 0.5;
      const phase = state.layers[layerOffset] + stamp + generationShift + spin;
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
    const hubAngle = spin + (fold / config.foldOrder) * TAU;
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
