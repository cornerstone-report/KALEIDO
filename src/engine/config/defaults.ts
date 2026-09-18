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
  chordsPerLayer: 72,
  aperture: 0.34,
  ringWidth: 0.42,
  chordSkip: 11,
  trailGenerations: 6,
});

/** Hairline annular string-art aligned to the K95 still grammar. */
export const defaultChordLattice = (): DihedralFieldConfig => ({
  ...defaultDihedralField(),
  family: "chord-lattice",
  foldOrder: 16,
  mirror: false,
  layerCount: 3,
  chordsPerLayer: 72,
  aperture: 0.34,
  ringWidth: 0.44,
  chordSkip: 11,
  trailGenerations: 5,
  speed: 0.07,
  spin: 0.01,
  curvature: 0.2,
  transitionSeconds: 16,
  ribbonWidth: 0.00105,
});

export const createDefaultPreset = (): PresetEnvelope<"dihedral-field"> => ({
  schemaVersion: 1,
  sceneId: "dihedral-field",
  seed: 0x4b414c45,
  global: {
    ...defaultGlobalConfig(),
    background: [0, 0, 0],
    inkIntensity: 0.92,
    paletteBands: 5,
    paletteSpeed: 0.03,
    evolution: { enabled: false, speed: 0.1, amount: 0.12 },
    feedback: { enabled: false, decayPerSecond: 4.5, smear: 0 },
  },
  scene: defaultChordLattice(),
});
