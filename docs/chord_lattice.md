# Chord Lattice visual family

Chord Lattice is an original KALEIDO visual family informed by the user-supplied
comparison captures of a radial, late-90s line visualization. It does not
recover or reproduce the original program's implementation.

## Visual contract

- opaque black background and no feedback by default;
- a configurable central aperture preserves negative space;
- 1–6 independent radial layers use short, discrete palette bands;
- every layer is a ruled surface: straight chords connect counter-moving polar
  orbits inside a single symmetry wedge;
- dihedral copies and optional mirrors expand that wedge into the full field;
- the state is CPU-side typed arrays, seeded, and deterministic.

The renderer draws each chord as a very thin instanced quad. WebGL line width
is intentionally not used because implementations commonly restrict it to a
single device-dependent width. Shader edge smoothing keeps the thin strokes
legible without turning them into luminous ribbons.

## Controls

`Radial layers`, `Chords / layer`, `Center aperture`, and `Ring span` determine
the static composition. `Orbit` and `Spin` only evolve the polar anchors; they
do not alter symmetry, seed, or palette membership. Persistent trails remain an
optional atmosphere setting, not part of the family definition.

## Relationship to Line Weave

Line Weave remains available as KALEIDO's expressive, continuous-ribbon
family. Chord Lattice is deliberately separate so visual-reference work cannot
erase the earlier instrument.
