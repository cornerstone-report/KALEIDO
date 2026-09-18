import type { DihedralFieldConfig } from "../config/types";
import { createPrng } from "../math/prng";

const PATH_STRIDE = 6; // radius, wedge angle, radial velocity, angular velocity, phase, ink
const INSTANCE_STRIDE = 6; // x, y, heading, ink, half length, width
const TAU = Math.PI * 2;

export interface DihedralFieldState {
  paths: Float32Array;
  pathCount: number;
  elapsed: number;
  palettePhase: number;
}

export interface DihedralInstances {
  /** Per segment: center x/y, heading, palette index, half length, thickness. */
  data: Float32Array<ArrayBufferLike>;
  count: number;
}

export const initializeDihedral = (seed: number, config: DihedralFieldConfig): DihedralFieldState => {
  const random = createPrng(seed);
  const paths = new Float32Array(config.pathCount * PATH_STRIDE);
  const wedge = TAU / config.foldOrder;
  for (let index = 0; index < config.pathCount; index += 1) {
    const offset = index * PATH_STRIDE;
    paths[offset] = 0.18 + random() * 0.62;
    paths[offset + 1] = wedge * (0.08 + random() * 0.84);
    paths[offset + 2] = (random() * 2 - 1) * 0.08;
    paths[offset + 3] = (random() * 2 - 1) * 0.28;
    paths[offset + 4] = random() * TAU;
    paths[offset + 5] = random();
  }
  return { paths, pathCount: config.pathCount, elapsed: 0, palettePhase: 0 };
};

export const updateDihedral = (state: DihedralFieldState, dt: number, config: DihedralFieldConfig, paletteSpeed: number): void => {
  state.elapsed += dt;
  state.palettePhase = (state.palettePhase + dt * paletteSpeed) % 1;
  const wedge = TAU / config.foldOrder;
  const transition = Math.sin((state.elapsed / config.transitionSeconds) * TAU) * 0.5 + 0.5;
  for (let index = 0; index < state.pathCount; index += 1) {
    const offset = index * PATH_STRIDE;
    let radius = state.paths[offset];
    let angle = state.paths[offset + 1];
    let radialVelocity = state.paths[offset + 2];
    let angularVelocity = state.paths[offset + 3];
    const phase = state.paths[offset + 4];
    radialVelocity = Math.max(-0.11, Math.min(0.11, radialVelocity + Math.sin(state.elapsed * 0.43 + phase) * config.speed * dt * 0.025));
    angularVelocity = Math.max(-0.36, Math.min(0.36, angularVelocity + Math.cos(state.elapsed * 0.31 + phase) * config.speed * dt * 0.035));
    radius += radialVelocity * config.speed * dt;
    angle += (angularVelocity + config.spin * 0.12) * config.speed * dt;
    if (radius < 0.1 || radius > 0.9) { radius = Math.max(0.1, Math.min(0.9, radius)); radialVelocity *= -1; }
    if (angle < wedge * 0.035 || angle > wedge * 0.965) { angle = Math.max(wedge * 0.035, Math.min(wedge * 0.965, angle)); angularVelocity *= -1; }
    state.paths[offset] = radius;
    state.paths[offset + 1] = angle;
    state.paths[offset + 2] = radialVelocity;
    state.paths[offset + 3] = angularVelocity;
    state.paths[offset + 4] = phase + transition * config.curvature * dt * 0.025;
  }
};

const pointOnPath = (state: DihedralFieldState, path: number, sample: number, config: DihedralFieldConfig): readonly [number, number] => {
  const offset = path * PATH_STRIDE;
  const t = sample / config.segmentsPerPath - 0.5;
  const radius = state.paths[offset] + t * config.lineLength * 0.58;
  const bend = Math.sin(state.paths[offset + 4] + t * Math.PI * 2) * config.curvature * 0.22;
  const angle = state.paths[offset + 1] + bend + Math.sin(state.elapsed * 0.2 + path) * 0.018;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
};

export const buildDihedralInstances = (state: DihedralFieldState, config: DihedralFieldConfig, target?: Float32Array<ArrayBufferLike>): DihedralInstances => {
  const paths = Math.min(state.pathCount, config.pathCount);
  const copies = config.foldOrder * (config.mirror ? 2 : 1);
  const total = paths * config.segmentsPerPath * copies;
  const data = target && target.length >= total * INSTANCE_STRIDE ? target : new Float32Array(total * INSTANCE_STRIDE);
  let write = 0;
  for (let fold = 0; fold < config.foldOrder; fold += 1) {
    const rotation = (fold / config.foldOrder) * TAU;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (let path = 0; path < paths; path += 1) {
      const ink = (state.paths[path * PATH_STRIDE + 5] + state.palettePhase) % 1;
      for (let sample = 0; sample < config.segmentsPerPath; sample += 1) {
        const [x0, y0] = pointOnPath(state, path, sample, config);
        const [x1, y1] = pointOnPath(state, path, sample + 1, config);
        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.hypot(dx, dy);
        const x = (x0 + x1) * 0.5;
        const y = (y0 + y1) * 0.5;
        const heading = Math.atan2(dy, dx);
        const addCopy = (sign: number): void => {
          data[write] = (x * cos - y * sin) * sign;
          data[write + 1] = x * sin + y * cos;
          data[write + 2] = sign === 1 ? heading + rotation : Math.PI - (heading + rotation);
          data[write + 3] = ink + sample / config.segmentsPerPath * 0.13;
          data[write + 4] = Math.max(0.002, length * 0.5);
          data[write + 5] = config.ribbonWidth;
          write += INSTANCE_STRIDE;
        };
        addCopy(1);
        if (config.mirror) addCopy(-1);
      }
    }
  }
  return { data, count: total };
};
