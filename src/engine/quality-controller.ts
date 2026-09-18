import type { QualityPolicy } from "./config/types";

export type QualityAction = "none" | "scale" | "budget" | "smear";

/** Quality policy changes renderer resources and scene budgets, never presets. */
export class QualityController {
  private averageMs = 16.7;
  private samples = 0;
  private renderScale = 1;
  private budgetScale = 1;
  private smearEnabled = true;

  configure(policy: QualityPolicy): void {
    this.renderScale = Math.min(policy.preferredRenderScale, 1);
    this.budgetScale = 1;
    this.smearEnabled = true;
    this.samples = 0;
  }

  get scale(): number { return this.renderScale; }
  get budget(): number { return this.budgetScale; }

  sample(frameMs: number, feedbackEnabled: boolean, policy: QualityPolicy): QualityAction {
    this.averageMs += (frameMs - this.averageMs) * 0.08;
    this.samples += 1;
    if (this.samples < 45 || this.averageMs <= policy.targetFrameMs * 1.18) return "none";
    this.samples = 0;
    const lowerScale = (): boolean => {
      if (this.renderScale <= policy.minRenderScale + 0.001) return false;
      this.renderScale = Math.max(policy.minRenderScale, Number((this.renderScale - 0.1).toFixed(2)));
      return true;
    };
    const lowerBudget = (): boolean => {
      if (this.budgetScale <= 0.5) return false;
      this.budgetScale = Math.max(0.5, Number((this.budgetScale - 0.1).toFixed(2)));
      return true;
    };
    // Full-screen feedback is pixel-bound; without it, geometry budget wins.
    if (feedbackEnabled ? lowerScale() : lowerBudget()) return feedbackEnabled ? "scale" : "budget";
    if (feedbackEnabled ? lowerBudget() : lowerScale()) return feedbackEnabled ? "budget" : "scale";
    if (this.smearEnabled) {
      this.smearEnabled = false;
      return "smear";
    }
    return "none";
  }
}
