# K95 look alignment (2026-09-18)

Private reference stills show circular string-art annuli, hard palette bands,
and an optional outer fan ring. They are not liquid ribbons and they are not
widescreen ellipses.

Implemented:

- aspect-correct contain so a unit circle stays circular on a wide canvas
- full-circle string-art chords with a discrete integer skip (`chordSkip`)
- concentric layers with one palette band per layer
- history stamps that change *k*, *N*, and radius instead of cloning a rose
- incommensurate layer spin rates (1, φ⁻¹, √2−1, …)
- discrete *k* ← *k* ± 1 on the renewal window
- palette phase on its own clock (`paletteSpeed`), independent of spin
- nearest-neighbor palette indexing
- an outer fan ring driven by fold order

`k` is never a float. Motion comes from detuned layer phase, stamp topology,
and occasional integer gear changes.

Do not add Simplex flow fields or Catmull-Rom silk ribbons to this family.
