# K95 look alignment (2026-09-18)

Private reference stills show circular string-art annuli, hard palette bands,
and an optional outer fan ring. They are not liquid ribbons and they are not
widescreen ellipses.

This pass implements:

- aspect-correct fit so a unit circle stays circular on a wide canvas
- full-circle string-art chords with a discrete skip
- a generation ring buffer instead of a continuously slithering mesh
- nearest-neighbor palette indexing
- an outer fan ring driven by fold order

Do not add Simplex flow fields or Catmull-Rom silk ribbons to this family.
Those belong to later original scenes, not this grammar.
