# KALEIDO GPU Engine v0.1

## Runtime boundary

`KaleidoEngine` owns the frame loop, WebGL resources, simulation state, quality
policy, and exports. React sends validated preset changes imperatively and never
updates state per animation frame.

The public preset envelope is versioned:

```ts
PresetEnvelope {
  schemaVersion: 1;
  sceneId: "dihedral-field" | "advection-grains" | "spline-drift";
  seed: number;
  global: { palette, background, inkIntensity, feedback, evolution, quality };
  scene: SceneConfigMap[sceneId];
}
```

All initialization derives from an unsigned Mulberry32 seed. Scene modules do
not call `Math.random`.

## Rendering path

1. A Dihedral Field state stores source strokes in `Float32Array` records:
   `x, y, heading, ink`.
2. Each frame expands those records into geometric rotational and mirrored
   copies, then renders them as instanced, triangulated ribbon quads.
3. Analytic `smoothstep` edge coverage anti-aliases the ribbon in the fragment
   shader; offscreen framebuffer MSAA is intentionally not required.
4. RGBA8 ping-pong textures retain trails. Decay is exponential in seconds,
   not frames. The presented canvas contains the final background composite,
   so PNG export is faithful to the visible output.

The renderer has no XOR emulation. Ribbons use an intentional original,
alpha-composited ink treatment.

## Reliability and quality

- Rendering delta time is capped at 50 ms; shader phases are wrapped.
- `0 x 0` resizes are ignored.
- Persistence textures are limited by both `MAX_TEXTURE_SIZE` and
  `MAX_RENDERBUFFER_SIZE`.
- Resize allocation is transactional: a complete new pair is made before the
  old pair is destroyed.
- When feedback is enabled, quality first lowers internal render scale (floor
  0.5), then source budget, then smear. With feedback disabled, budget comes
  before scale. Palette, seed, fold order, and decay time constant are stable.
- WebGL context loss stops the loop; restoration reconstructs resources. A
  separate Canvas2D element is used when WebGL2 cannot initialize.

## Deliberately deferred

Advection Grains, Spline Drift, preset import/gallery UI, PWA packaging, and
the Tauri desktop wrapper are not hidden partial implementations. They are the
next discrete modules on this clean engine contract.
