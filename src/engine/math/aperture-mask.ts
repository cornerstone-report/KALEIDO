import type { ApertureMask } from "../config/types";

const TAU = Math.PI * 2;

export const isApertureMask = (value: unknown): value is ApertureMask =>
  value === "string" || value === "wedge" || value === "heart" || value === "figure8" || value === "teardrop";

/** Polar scale 0–1. Shapes warp the lattice; they do not cookie-cut it. */
export const maskRadius = (theta: number, mask: ApertureMask, petals: number): number => {
  if (mask === "string") return 1;
  const angle = ((theta % TAU) + TAU) % TAU;
  if (mask === "wedge") {
    const slice = TAU / Math.max(2, petals);
    const local = angle % slice;
    return local < slice * 0.62 ? 1 : 0;
  }
  if (mask === "figure8") {
    const lobe = Math.cos(2 * (angle - Math.PI / 2));
    return lobe > 0 ? Math.sqrt(lobe) : 0;
  }
  if (mask === "heart") {
    const cardioid = 0.55 + 0.45 * (1 - Math.sin(angle));
    return Math.min(1, cardioid * 0.72);
  }
  return Math.min(1, 0.38 * (1.15 + 0.85 * Math.cos(angle + Math.PI / 2)) / 0.76);
};
