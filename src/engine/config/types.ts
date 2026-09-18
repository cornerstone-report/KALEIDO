export type SceneId = "dihedral-field" | "advection-grains" | "spline-drift";

export type PaletteId = "aurora" | "ember" | "ultraviolet" | "mineral";
export type VisualFamily = "line-weave" | "chord-lattice";

export interface FeedbackConfig {
  enabled: boolean;
  /** Exponential fade coefficient in reciprocal seconds. */
  decayPerSecond: number;
  /** Extra frame-to-frame blur. Kept at zero in the initial renderer. */
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
  /** Palette-ring advance in cycles per second, independent of geometry. */
  paletteSpeed: number;
  paletteBands: number;
  background: readonly [number, number, number];
  inkIntensity: number;
  feedback: FeedbackConfig;
  evolution: EvolutionConfig;
  quality: QualityPolicy;
}

export interface DihedralFieldConfig {
  /** Original visual family; both families share the same dihedral renderer. */
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
  /** Chord Lattice controls. Ignored by Line Weave. */
  layerCount: number;
  chordsPerLayer: number;
  aperture: number;
  ringWidth: number;
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
  /** An unsigned 32-bit deterministic seed. */
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
