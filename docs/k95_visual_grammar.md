# K95 Visual Grammar — Evidence-Backed Alignment

## Purpose

This document is the alignment contract for KALEIDO. It describes the original
software's observed visual grammar without copying its code, assets, presets,
dialog text, or branding into the application.

## Confidence levels

| Level | Meaning | Implementation treatment |
| --- | --- | --- |
| Verified | Direct static evidence from the supplied executable. | Eligible for an original re-expression. |
| Corroborated | Independent contemporary description agrees with static evidence. | Use as a visual target, not a formula. |
| Hypothesis | A plausible mapping pending captures or code tracing. | Keep isolated and easy to replace. |

## Core grammar

| Behavior | Evidence | KALEIDO expression |
| --- | --- | --- |
| Stateful line and Bézier construction | Verified: GDI line and `PolyBezier` imports. | Wedge-local, continuously sampled line paths. |
| Symmetry and reflection | Verified configuration concepts; corroborated by period review. | Geometry-space rotation and optional mirror copies. |
| Indexed palette animation | Verified palette API imports. | 256-entry GPU palette texture, cycle rate, and discrete band count. |
| Timer-driven evolution | Verified timer/multimedia timing imports. | Delta-time simulation with a separate renewal cadence. |
| Distinct visual designs | Corroborated: review describes numerous presets. | Separate KALEIDO scene families rather than one parameter soup. |
| Exact formula for any named design | Not established. | Do not claim fidelity or encode guessed legacy rules. |

## First family: line lattice

The first aligned family is now implemented as **Line Weave**. It uses groups of
smooth wedge-local paths and turns adjacent samples into ribbon segments before
rotation/mirroring. It intentionally avoids the current scene's former
particle-cloud appearance.

Tuning target after captures arrive:

- Reduce or increase source path density before changing symmetry.
- Prefer sparse, legible line history over fully filled radial mandalas.
- Treat palette bands, cycle rate, renewal, and trails as separate controls.
- Keep a fixed logical coordinate system and seed for capture comparisons.

## Do not infer

- XOR/inversion rendering: it is not supported by the K95 import evidence.
- Exact meanings of historical configuration labels: these require caller
  tracing and visual captures.
- Audio behavior: it remains outside the deterministic visual-core milestone.
