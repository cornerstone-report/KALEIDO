# K95 look alignment (2026-09-18)

Private reference stills show circular string-art annuli, hard palette bands,
and an optional outer fan ring. They are not liquid ribbons and they are not
widescreen ellipses.

Implemented in this pass:

- aspect-correct contain so a unit circle stays circular on a wide canvas
- full-circle string-art chords with a discrete skip (`chordSkip`)
- concentric layers with one palette band per layer
- a generation stamp buffer (`trailGenerations`) instead of a slithering mesh
- nearest-neighbor palette indexing
- an outer fan ring driven by fold order (petal / teardrop envelopes)

`chordSkip` is the string-art step *k*: each of *N* points on a ring connects
to point *i + k*. Small *k* makes a zigzag crown. Mid *k* fills a scalloped
annulus. Fold order only fans the outer ring; it does not wedge-copy the
lattice, which was the source of the oval scribble.

Do not add Simplex flow fields or Catmull-Rom silk ribbons to this family.
Those belong to later original scenes, not this grammar.
