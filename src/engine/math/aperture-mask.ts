import type { ApertureMask } from "../config/types";

const TAU = Math.PI * 2;

export const isApertureMask = (value: unknown): value is ApertureMask =>
  value === "string" || value === "wedge" || value === "heart" || value === "figure8" || value === "teardrop";

const rotate = (x: number, y: number, phase: number): readonly [number, number] => {
  const cosine = Math.cos(phase);
  const sine = Math.sin(phase);
  return [x * cosine + y * sine, -x * sine + y * cosine];
};

export const pointInsideMask = (
  x: number,
  y: number,
  mask: ApertureMask,
  petals: number,
  aperture: number,
  phase: number,
): boolean => {
  const [px, py] = rotate(x, y, phase);
  const radius = Math.hypot(px, py);
  if (radius < aperture * 0.88) return false;
  if (radius > 0.99) return false;
  if (mask === "string") return true;

  const theta = Math.atan2(py, px);
  if (mask === "wedge") {
    const slice = TAU / Math.max(2, petals);
    const local = ((theta % slice) + slice) % slice;
    return local < slice * 0.58;
  }
  if (mask === "heart") {
    const sx = px / 0.62;
    const sy = -py / 0.62;
    const first = sx * sx + sy * sy - 1;
    return first * first * first - sx * sx * sy * sy * sy <= 0;
  }
  if (mask === "figure8") {
    const aa = 0.56 * 0.56;
    const r2 = px * px + py * py;
    return r2 * r2 <= 2 * aa * (py * py - px * px);
  }
  const drop = 0.38 * (1.2 + 0.8 * Math.cos(theta + Math.PI / 2));
  return radius <= Math.max(0.08, drop);
};

export const clipSegmentToMask = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mask: ApertureMask,
  petals: number,
  aperture: number,
  phase: number,
): Array<readonly [number, number, number, number]> => {
  if (mask === "string") return [[x0, y0, x1, y1]];
  const samples = 14;
  const runs: Array<readonly [number, number, number, number]> = [];
  let runStart = -1;
  for (let step = 0; step <= samples; step += 1) {
    const t = step / samples;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const inside = pointInsideMask(x, y, mask, petals, aperture, phase);
    if (inside && runStart < 0) runStart = step;
    if ((!inside || step === samples) && runStart >= 0) {
      const end = inside && step === samples ? step : step - 1;
      if (end > runStart) {
        const ta = runStart / samples;
        const tb = end / samples;
        runs.push([
          x0 + (x1 - x0) * ta,
          y0 + (y1 - y0) * ta,
          x0 + (x1 - x0) * tb,
          y0 + (y1 - y0) * tb,
        ]);
      }
      runStart = inside ? step : -1;
    }
  }
  return runs;
};
