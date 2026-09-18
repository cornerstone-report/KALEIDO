import type { DihedralFieldConfig, GlobalConfig, PresetEnvelope } from "./types";

export const defaultGlobalConfig = (): GlobalConfig => ({
  palette: "aurora",
  paletteSpeed: 0.045,
  paletteBands: 8,
  background: [0.025, 0.027, 0.055],
  inkIntensity: 0.72,
  feedback: { enabled: true, decayPerSecond: 1.15, smear: 0 },
  evolution: { enabled: true, speed: 0.16, amount: 0.22 },
  quality: {
    preferredRenderScale: 1,
    minRenderScale: 0.5,
    targetFrameMs: 16.7,
    dprCap: 2,
  },
});

export const defaultDihedralField = (): DihedralFieldConfig => ({
  family: "line-weave",
  foldOrder: 8,
  mirror: true,
  pathCount: 18,
  segmentsPerPath: 10,
  lineLength: 0.38,
  speed: 0.18,
  spin: 0.12,
  curvature: 0.48,
  transitionSeconds: 10,
  ribbonWidth: 0.0035,
  layerCount: 3,
  chordsPerLayer: 42,
  aperture: 0.28,
  ringWidth: 0.5,
});

/** A clean, hairline-first family based on the observed radial lattice grammar. */
export const defaultChordLattice = (): DihedralFieldConfig => ({
  ...defaultDihedralField(),
  family: "chord-lattice",
  foldOrder: 12,
  mirror: true,
  layerCount: 3,
  chordsPerLayer: 44,
  aperture: 0.31,
  ringWidth: 0.48,
  speed: 0.11,
  spin: 0.025,
  curvature: 0.62,
  transitionSeconds: 16,
  ribbonWidth: 0.00115,
});

export const createDefaultPreset = (): PresetEnvelope<"dihedral-field"> => ({
  schemaVersion: 1,
  sceneId: "dihedral-field",
  seed: 0x4b414c45,
  global: {
    ...defaultGlobalConfig(),
    background: [0, 0, 0],
    inkIntensity: 0.9,
    paletteBands: 4,
    feedback: { enabled: false, decayPerSecond: 4.5, smear: 0 },
  },
  scene: defaultChordLattice(),
});
