export type SceneId = "dihedral-field" | "advection-grains" | "spline-drift";

export type PaletteId = "aurora" | "ember" | "ultraviolet" | "mineral";
export type VisualFamily = "line-weave" | "chord-lattice";
export type ApertureMask = "string" | "wedge" | "heart" | "figure8" | "teardrop";

export interface FeedbackConfig {
  enabled: boolean;
  decayPerSecond: number;
  smear: number;
}

export interface EvolutionConfig {
  enabled: boolean;
  speed: number;
  amount: number;
}

export interface QualityPolicy {
  preferredRenderScale: number;
  minRenderScale: number;
  targetFrameMs: number;
  dprCap: number;
}

export interface GlobalConfig {
  palette: PaletteId;
  paletteSpeed: number;
  paletteBands: number;
  background: readonly [number, number, number];
  inkIntensity: number;
  fieldBleed: number;
  feedback: FeedbackConfig;
  evolution: EvolutionConfig;
  quality: QualityPolicy;
}

export interface DihedralFieldConfig {
  family: VisualFamily;
  foldOrder: number;
  mirror: boolean;
  pathCount: number;
  segmentsPerPath: number;
  lineLength: number;
  speed: number;
  spin: number;
  curvature: number;
  transitionSeconds: number;
  ribbonWidth: number;
  layerCount: number;
  chordsPerLayer: number;
  aperture: number;
  ringWidth: number;
  chordSkip: number;
  trailGenerations: number;
  apertureMask: ApertureMask;
}

export interface AdvectionGrainsConfig {
  particleCount: number;
  viscosity: number;
  turbulence: number;
  style: "pixel" | "disc" | "ring" | "sparkle" | "bar" | "soft";
}

export interface SplineDriftConfig {
  curveCount: number;
  curvature: number;
  ribbonWidth: number;
  migrationRate: number;
  foldOrder?: number;
}

export interface SceneConfigMap {
  "dihedral-field": DihedralFieldConfig;
  "advection-grains": AdvectionGrainsConfig;
  "spline-drift": SplineDriftConfig;
}

export interface PresetEnvelope<Id extends SceneId = SceneId> {
  schemaVersion: 1;
  sceneId: Id;
  seed: number;
  global: GlobalConfig;
  scene: SceneConfigMap[Id];
}

export interface RendererCapabilities {
  maxTextureSize: number;
  maxRenderbufferSize: number;
  renderScale: number;
  webgl2: boolean;
}

export interface EngineCallbacks {
  onFallback?: (reason: string) => void;
  onContextStateChange?: (state: "lost" | "restored") => void;
}
