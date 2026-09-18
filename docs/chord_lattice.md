# Chord Lattice visual family

Chord Lattice is an original KALEIDO visual family informed by radial
late-90s line visualizers. It does not recover or reproduce any original
program's implementation.

## Visual contract

- opaque black background and no framebuffer feedback by default
- a configurable central aperture; set it to 0 to allow a filled core
- 1–6 concentric string-art rings, each with a discrete palette band
- every ring connects *N* points on a circle to point *i + k*
- an outer fan ring, counted by fold order, forms petal envelopes
- retained stamps (`trailGenerations`) are older rigid line-sets, not blur
- the state is CPU-side typed arrays, seeded, and deterministic
- the renderer applies aspect contain so the figure stays circular

The renderer draws each chord as a hairline instanced quad. WebGL line
width is not used.

## Controls

`Radial layers`, `Chords / layer`, `Chord skip`, `Center aperture`, and
`Ring span` set the static composition. `Orbit` advances the stamp clock.
`Spin` rotates the rings. Persistent framebuffer trails remain optional
atmosphere and are off in the default comparison preset.
