/** Golden ratio and fit helpers. The figure stays a circle in pixel space. */
export const PHI = 1.618033988749895;
export const INV_PHI = PHI - 1;
export const INV_PHI2 = INV_PHI * INV_PHI;

/**
 * Map a unit circle onto a rectangular framebuffer.
 * bleed = 0 inscribed (letterbox), 1 cover (fills the long axis), >1 extra overflow.
 */
export const circularFieldScale = (width: number, height: number, bleed = 0): readonly [number, number] => {
  const aspect = width / Math.max(height, 1e-6);
  const contain: readonly [number, number] = aspect >= 1 ? [1 / aspect, 1] : [1, aspect];
  const coverFactor = Math.max(aspect, 1 / Math.max(aspect, 1e-6));
  const t = Math.min(1, Math.max(0, bleed));
  const extra = bleed > 1 ? bleed : 1;
  return [
    (contain[0] + (contain[0] * coverFactor - contain[0]) * t) * extra,
    (contain[1] + (contain[1] * coverFactor - contain[1]) * t) * extra,
  ];
};
