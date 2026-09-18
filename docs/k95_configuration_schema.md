# Kaleidoscope 95 configuration schema — static evidence pass

This is a static-analysis record for KALEIDO development. `KALEID95.SCR` was
read as data only and was not launched. It describes historical behavior for
research; public KALEIDO UI must retain original names and copy.

## Strong evidence: serialized design records

The executable embeds named, comma-delimited favorite records. One complete
record is:

```text
Abstract Shapes,3,-4,253,3,81,2,3,0,2,33,4,1,1,0,1,1,2
```

The configuration dialog contains 17 persisted controls in the same visual
order. The matching field order below is a **high-confidence schema**: it is
supported by that record, multiple shorter backward-compatible records, the
resource dialog, and literal storage-key strings. Numeric units and formulas
still require code-path tracing.

| Position after name | Historical setting concept | Evidence | KALEIDO direction |
| ---: | --- | --- | --- |
| 1 | symmetry | dialog control; `Symmetry` storage key | `foldOrder` / mirror policy |
| 2 | signed spin | dialog control; `Spin` storage key; negative record values | angular velocity |
| 3 | line size | dialog control; `LineSize` storage key | line-set geometry scale |
| 4 | trail length | dialog control; `TrailLength` storage key | history duration, not opacity |
| 5 | speed | dialog control; `Speed` storage key | simulation clock multiplier |
| 6 | rotations | dialog control; `Rotations` storage key | number of independently phased orbit families |
| 7 | cheese size | dialog control; `Cheese` storage key | central-aperture / void modulation |
| 8 | cheese type | dialog control; `CheeseType` storage key | aperture mask family |
| 9 | width | dialog control | radial span or angular sweep |
| 10 | splitting | dialog control; also audio setting | line-set subdivision / branching |
| 11 | color rotation | dialog list; `ColorRotation` storage key | palette-index motion policy |
| 12 | snazziness | dialog list; `Snazziness` storage key | palette construction profile |
| 13 | bands | dialog control; `ColorBands` storage key | discrete palette band count |
| 14 | band width | dialog control; `ColorBandWidth` storage key | palette-band spatial frequency |
| 15 | free floating | dialog checkbox | unbounded versus wedge-clamped anchors |
| 16 | migrating depths | dialog checkbox; `Migrating` storage key | layer-radius migration |
| 17 | depth | dialog radios 1–4; `Depth` storage key | number of active depth layers |

## Other verified control relationships

The separate System Speed dialog provides a direct timing relation:

- `Sets of Lines per Interval`: range **1–50**;
- `Update Interval`: range **10–100 ms**;
- a display string reports `%d sets of lines will be drawn per second`;
- a `Divisor`: range **1–50**.

This supports a discrete **line-set injection scheduler**, rather than treating
the visual as one continuously redrawn Bezier mesh. The exact divisor position
in the update formula remains unverified.

## Important implementation implications

1. Replace the current single continuous chord field with a future
   `LineSetScheduler`: generate a bounded set, retain it for the configured
   history window, then inject the next set at a deterministic interval.
2. Make `depth`, radial migration, and free-floating anchor behavior explicit
   scene capabilities. They explain the layered rings and changing voids seen
   in the supplied captures more directly than feedback blur does.
3. Treat `Cheese Type` as a family of original aperture masks, not as a copied
   control or a literal legacy name. The screenshots establish that the void is
   compositional, not an accidental empty center.
4. Implement palette behavior as an indexed, banded color policy. The imported
   `CreatePalette`, `SetPaletteEntries`, and `AnimatePalette` functions support
   this more strongly than modern additive glow.

## What is not known yet

- exact numeric scales and defaults for the slider values;
- which historical `Cheese Type` maps to which mask algorithm;
- the exact formula using speed-dialog divisor;
- whether a particular favorite uses an older, shorter serialization version.

Those questions require call-site tracing from the settings storage/read paths
to `LineTo`, `PolyBezier`, and palette calls. No disassembler is installed in
this workspace, so that trace is not claimed here. The supplied visualization
captures are the appropriate visual regression oracle while static analysis
continues.
