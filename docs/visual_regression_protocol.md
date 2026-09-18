# Visual Regression Protocol

## Fixture shape

Each accepted KALEIDO family receives a JSON preset, fixed seed, fixed logical
canvas size, and four capture times. The resulting PNGs are generated locally
and not committed if they could contain third-party reference imagery.

## Review checks

- Symmetry order and mirror behavior are stable.
- Line topology remains continuous across adjacent samples.
- Palette advances while geometry is static when drift and spin are zero.
- Trails fade by elapsed time, not refresh rate.
- Renewal changes the pattern gradually rather than popping to a new frame.
- Same seed and preset produce identical initial geometry.

## Comparison posture

Use a side-by-side human review against private K95 captures. Numerical pixel
similarity is not a pass condition: KALEIDO has original code and may use a
different rasterization pipeline. The test is preservation of visual grammar.
