import type { DihedralFieldConfig, GlobalConfig, PresetEnvelope } from "./types";
import { INV_PHI, INV_PHI2 } from "../math/phi";

export const defaultGlobalConfig = (): GlobalConfig => ({
  palette: "aurora",
  paletteSpeed: 0.08,
  paletteBands: 8,
  background: [0.025, 0.027, 0.055],
  inkIntensity: 0.72,
  fieldBleed: 0.85,
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
  chordsPerLayer: 96,
  aperture: INV_PHI2,
  ringWidth: INV_PHI,
  chordSkip: 11,
  trailGenerations: 6,
  apertureMask: "string",
});

export const defaultChordLattice = (): DihedralFieldConfig => ({
  ...defaultDihedralField(),
  family: "chord-lattice",
  foldOrder: 13,
  mirror: false,
  layerCount: 4,
  chordsPerLayer: 89,
  aperture: 0.18,
  ringWidth: 0.72,
  chordSkip: 13,
  trailGenerations: 4,
  speed: 0.22,
  spin: 0.11,
  curvature: 0.2,
  transitionSeconds: 5,
  ribbonWidth: 0.00115,
  apertureMask: "figure8",
});

export const createDefaultPreset = (): PresetEnvelope<"dihedral-field"> => ({
  schemaVersion: 1,
  sceneId: "dihedral-field",
  seed: 0x4b414c45,
  global: {
    ...defaultGlobalConfig(),
    background: [0, 0, 0],
    inkIntensity: 0.78,
    paletteBands: 8,
    paletteSpeed: 0.08,
    fieldBleed: 0.85,
    evolution: { enabled: false, speed: 0.1, amount: 0.12 },
    feedback: { enabled: false, decayPerSecond: 4.5, smear: 0 },
  },
  scene: defaultChordLattice(),
});
