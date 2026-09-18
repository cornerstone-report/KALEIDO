# KALEIDO

KALEIDO is an original, GPU-accelerated visual instrument for the browser. It
draws from the broad vocabulary of generative visualizers without distributing,
emulating, or incorporating legacy binaries, assets, presets, or product copy.

## Current foundation

- React 19 + Vite shell used only for settings and layout.
- A framework-independent WebGL2 `KaleidoEngine` with time-based RGBA8 feedback.
- Deterministic `Dihedral Field`: typed-array motion state, geometric fold copies,
  instanced ribbon geometry, analytic anti-aliasing, palette LUTs, and PNG export.
- Versioned JSON preset envelope with strict clamping and deterministic Mulberry32 seeds.
- Adaptive render scale/budget policy and a separate Canvas2D fallback canvas.

The historical reference binaries remain locally under `Original/` and are
intentionally ignored by Git. They are research material, not application input.

## Run locally

```powershell
npm install
npm run dev
```

Validate with `npm test` and `npm run build`.

## Next modules

The engine contract reserves typed built-in modules for **Advection Grains** and
**Spline Drift**. The global evolution scheduler is already separate from the
Dihedral Field, so those scenes can share it without inheriting renderer logic.
