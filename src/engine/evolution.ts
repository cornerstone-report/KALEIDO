import { createPrng } from "./math/prng";
import type { DihedralFieldConfig, EvolutionConfig } from "./config/types";

const TAU = Math.PI * 2;

/**
 * A global scheduler. It produces ephemeral offsets and never mutates a preset.
 */
export class EvolutionScheduler {
  private phase = 0;
  private readonly phaseOffset: number;

  constructor(seed: number) {
    this.phaseOffset = createPrng(seed ^ 0xa341316c)() * TAU;
  }

  reset(seed: number): void {
    this.phase = createPrng(seed ^ 0xc8013ea4)() * TAU;
  }

  step(dt: number, config: EvolutionConfig, reducedMotion: boolean): Partial<DihedralFieldConfig> {
    if (!config.enabled || reducedMotion || config.amount === 0 || config.speed === 0) return {};
    this.phase = (this.phase + dt * config.speed) % TAU;
    const drift = Math.sin(this.phase + this.phaseOffset) * config.amount;
    return {
      spin: drift * 0.18,
      curvature: drift * 0.08,
      ribbonWidth: drift * 0.0015,
    };
  }
}
