import type { DihedralFieldConfig } from "../config/types";
import { createPrng } from "../math/prng";

const LAYER_STRIDE = 4; // phase, radial offset, angular offset, ink band
const INSTANCE_STRIDE = 6; // x, y, heading, ink, half length, thickness
const TAU = Math.PI * 2;

export interface ChordLatticeState {
  layers: Float32Array;
  elapsed: number;
  palettePhase: number;
}

export interface ChordLatticeInstances {
  data: Float32Array<ArrayBufferLike>;
  count: number;
}

/**
 * Generates ruled surfaces from pairs of evolving polar orbits. The GPU only
 * draws the resulting hairline quads; all visual structure stays seedable.
 */
export const initializeChordLattice = (seed: number, config: DihedralFieldConfig): ChordLatticeState => {
  const random = createPrng(seed ^ 0x4c415454);
  const layers = new Float32Array(config.layerCount * LAYER_STRIDE);
  for (let layer = 0; layer < config.layerCount; layer += 1) {
    const offset = layer * LAYER_STRIDE;
    layers[offset] = random() * TAU;
    layers[offset + 1] = (random() * 2 - 1) * 0.035;
    layers[offset + 2] = (random() * 2 - 1) * 0.06;
    layers[offset + 3] = layer / Math.max(1, config.layerCount - 1);
  }
  return { layers, elapsed: 0, palettePhase: 0 };
};

export const updateChordLattice = (state: ChordLatticeState, dt: number, config: DihedralFieldConfig, paletteSpeed: number): void => {
  state.elapsed += dt;
  state.palettePhase = (state.palettePhase + dt * paletteSpeed) % 1;
  for (let layer = 0; layer < config.layerCount; layer += 1) {
    const offset = layer * LAYER_STRIDE;
    state.layers[offset] += dt * config.speed * (0.38 + layer * 0.15);
  }
};

const polar = (radius: number, angle: number): readonly [number, number] => [Math.cos(angle) * radius, Math.sin(angle) * radius];

export const buildChordLatticeInstances = (
  state: ChordLatticeState,
  config: DihedralFieldConfig,
  target?: Float32Array<ArrayBufferLike>,
): ChordLatticeInstances => {
  const copies = config.foldOrder * (config.mirror ? 2 : 1);
  const total = config.layerCount * config.chordsPerLayer * copies;
  const data = target && target.length >= total * INSTANCE_STRIDE ? target : new Float32Array(total * INSTANCE_STRIDE);
  const wedge = TAU / config.foldOrder;
  let write = 0;

  for (let fold = 0; fold < config.foldOrder; fold += 1) {
    const rotation = fold * wedge + state.elapsed * config.spin;
    for (let layer = 0; layer < config.layerCount; layer += 1) {
      const layerOffset = layer * LAYER_STRIDE;
      const phase = state.layers[layerOffset];
      const baseRadius = config.aperture + config.ringWidth * ((layer + 0.58) / config.layerCount) + state.layers[layerOffset + 1];
      const amplitude = config.ringWidth * (0.14 + layer * 0.035);
      for (let chord = 0; chord < config.chordsPerLayer; chord += 1) {
        const t = config.chordsPerLayer === 1 ? 0.5 : chord / (config.chordsPerLayer - 1);
        // Counter-moving endpoints make fans and mesh cells, not a continuous ribbon.
        const leftAngle = wedge * (0.035 + t * 0.93) + state.layers[layerOffset + 2];
        const rightAngle = wedge * (0.965 - t * 0.93) - state.layers[layerOffset + 2];
        const wave = Math.sin(phase + t * TAU * (1.2 + layer * 0.35));
        const crossWave = Math.cos(phase * 0.83 - t * TAU * (0.76 + layer * 0.21));
        const [x0, y0] = polar(baseRadius + amplitude * wave, leftAngle);
        const [x1, y1] = polar(baseRadius + amplitude * crossWave, rightAngle);
        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.hypot(dx, dy);
        const x = (x0 + x1) * 0.5;
        const y = (y0 + y1) * 0.5;
        const heading = Math.atan2(dy, dx);
        const ink = (state.layers[layerOffset + 3] * 0.72 + t * 0.28 + state.palettePhase) % 1;
        const append = (mirror: boolean): void => {
          data[write] = mirror ? -(x * Math.cos(rotation) - y * Math.sin(rotation)) : x * Math.cos(rotation) - y * Math.sin(rotation);
          data[write + 1] = x * Math.sin(rotation) + y * Math.cos(rotation);
          data[write + 2] = mirror ? Math.PI - (heading + rotation) : heading + rotation;
          data[write + 3] = ink;
          data[write + 4] = Math.max(0.0015, length * 0.5);
          data[write + 5] = config.ribbonWidth;
          write += INSTANCE_STRIDE;
        };
        append(false);
        if (config.mirror) append(true);
      }
    }
  }
  return { data, count: total };
};
