import { clampDihedral, clampGlobal, normalizePreset } from "./config/validate";
import type {
  DihedralFieldConfig,
  EngineCallbacks,
  GlobalConfig,
  PresetEnvelope,
  RendererCapabilities,
} from "./config/types";
import { EvolutionScheduler } from "./evolution";
import { QualityController } from "./quality-controller";
import { buildDihedralInstances, initializeDihedral, updateDihedral, type DihedralFieldState } from "./scenes/dihedral-field";
import { buildChordLatticeInstances, initializeChordLattice, updateChordLattice, type ChordLatticeState } from "./scenes/chord-lattice";
import { WebglRenderer } from "./webgl-renderer";

const MAX_DT_SECONDS = 0.05;

/** Framework-independent KALEIDO runtime. React never participates in its frame loop. */
export class KaleidoEngine {
  private renderer: WebglRenderer | undefined;
  private nextPreset: PresetEnvelope<"dihedral-field">;
  private framePreset: PresetEnvelope<"dihedral-field">;
  private state: DihedralFieldState | ChordLatticeState;
  private scheduler: EvolutionScheduler;
  private readonly quality = new QualityController();
  private instanceScratch: Float32Array<ArrayBufferLike> = new Float32Array(0);
  private animationFrame: number | undefined;
  private lastTimestamp = 0;
  private cssWidth = 0;
  private cssHeight = 0;
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private configDirty = false;
  private contextLost = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialPreset: PresetEnvelope<"dihedral-field">,
    private readonly callbacks: EngineCallbacks = {},
  ) {
    this.nextPreset = normalizePreset(initialPreset);
    this.framePreset = normalizePreset(initialPreset);
    this.state = this.initializeScene(this.framePreset.seed, this.framePreset.scene);
    this.scheduler = new EvolutionScheduler(this.framePreset.seed);
    this.quality.configure(this.framePreset.global.quality);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.createRenderer();
  }

  start(): void {
    if (this.animationFrame === undefined && this.renderer) this.animationFrame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
  }

  resize(width: number, height: number, dpr = window.devicePixelRatio): void {
    if (width <= 0 || height <= 0) return;
    this.cssWidth = width;
    this.cssHeight = height;
    const cap = this.framePreset.global.quality.dprCap;
    const actualDpr = Math.min(Math.max(1, dpr), cap);
    this.resizeRenderer(actualDpr);
    // A visible composition must not depend on the first RAF being scheduled.
    // Browsers can throttle RAF before a newly-mounted tab receives focus.
    this.renderFrame(0);
  }

  setPreset(preset: PresetEnvelope<"dihedral-field">): void {
    this.nextPreset = normalizePreset(preset);
    this.configDirty = true;
  }

  updateGlobalConfig(change: Partial<GlobalConfig>): void {
    const current = this.nextPreset.global;
    this.nextPreset = {
      ...this.nextPreset,
      global: clampGlobal({
        ...current,
        ...change,
        feedback: { ...current.feedback, ...change.feedback },
        evolution: { ...current.evolution, ...change.evolution },
        quality: { ...current.quality, ...change.quality },
      }),
    };
    this.configDirty = true;
  }

  updateSceneConfig(change: Partial<DihedralFieldConfig>): void {
    this.nextPreset = { ...this.nextPreset, scene: clampDihedral({ ...this.nextPreset.scene, ...change }) };
    this.configDirty = true;
  }

  regenerate(seed?: number): void {
    const replacement = seed === undefined ? this.randomSeed() : seed >>> 0;
    this.nextPreset = { ...this.nextPreset, seed: replacement };
    this.configDirty = true;
  }

  getCapabilities(): RendererCapabilities {
    return this.renderer?.capabilities ?? {
      maxTextureSize: 0,
      maxRenderbufferSize: 0,
      renderScale: 0,
      webgl2: false,
    };
  }

  exportPng(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export was unavailable.")), "image/png");
    });
  }

  destroy(): void {
    this.stop();
    this.renderer?.destroy();
    this.renderer = undefined;
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  private readonly tick = (timestamp: number): void => {
    this.animationFrame = undefined;
    if (!this.renderer || this.contextLost) return;
    if (document.hidden) {
      this.lastTimestamp = timestamp;
      this.animationFrame = requestAnimationFrame(this.tick);
      return;
    }
    const dt = this.lastTimestamp === 0 ? 1 / 60 : Math.min(MAX_DT_SECONDS, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    this.renderFrame(dt);
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private renderFrame(dt: number): void {
    if (!this.renderer || this.contextLost) return;
    this.applyFrameConfig();
    const evolution = this.scheduler.step(dt, this.framePreset.global.evolution, this.reducedMotion);
    const scene: DihedralFieldConfig = {
      ...this.framePreset.scene,
      spin: Math.max(-1, Math.min(1, this.framePreset.scene.spin + (evolution.spin ?? 0))),
      curvature: Math.max(0, Math.min(1, this.framePreset.scene.curvature + (evolution.curvature ?? 0))),
      ribbonWidth: Math.max(0.001, this.framePreset.scene.ribbonWidth + (evolution.ribbonWidth ?? 0)),
      pathCount: Math.max(2, Math.floor(this.framePreset.scene.pathCount * this.quality.budget)),
    };
    const instances = scene.family === "chord-lattice"
      ? this.updateChordLattice(dt, scene)
      : this.updateLineWeave(dt, scene);
    try {
      this.renderer.render(instances, this.framePreset.global, dt);
    } catch (error) {
      this.callbacks.onFallback?.(error instanceof Error ? error.message : "WebGL rendering failed.");
      return;
    }
    const action = this.quality.sample(dt * 1000, this.framePreset.global.feedback.enabled, this.framePreset.global.quality);
    if (action === "scale") this.resizeRenderer(Math.min(window.devicePixelRatio, this.framePreset.global.quality.dprCap));
  }

  private applyFrameConfig(): void {
    if (!this.configDirty) return;
    const previous = this.framePreset;
    this.framePreset = normalizePreset(this.nextPreset);
    this.configDirty = false;
    if (
      previous.seed !== this.framePreset.seed
      || previous.scene.family !== this.framePreset.scene.family
      || previous.scene.pathCount !== this.framePreset.scene.pathCount
      || previous.scene.foldOrder !== this.framePreset.scene.foldOrder
      || previous.scene.layerCount !== this.framePreset.scene.layerCount
      || previous.scene.chordsPerLayer !== this.framePreset.scene.chordsPerLayer
    ) {
      this.state = this.initializeScene(this.framePreset.seed, this.framePreset.scene);
      this.scheduler = new EvolutionScheduler(this.framePreset.seed);
      this.instanceScratch = new Float32Array(0);
    }
    this.renderer?.setPalette(this.framePreset.global.palette);
    this.quality.configure(this.framePreset.global.quality);
    this.resizeRenderer(Math.min(window.devicePixelRatio, this.framePreset.global.quality.dprCap));
  }

  private createRenderer(): void {
    const gl = this.canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      this.callbacks.onFallback?.("WebGL2 is unavailable in this browser.");
      return;
    }
    try {
      this.renderer = new WebglRenderer(gl);
      this.renderer.setPalette(this.framePreset.global.palette);
      if (this.cssWidth > 0 && this.cssHeight > 0) this.resizeRenderer(Math.min(window.devicePixelRatio, this.framePreset.global.quality.dprCap));
    } catch (error) {
      this.renderer?.destroy();
      this.renderer = undefined;
      this.callbacks.onFallback?.(error instanceof Error ? error.message : "WebGL2 renderer initialization failed.");
    }
  }

  private resizeRenderer(dpr: number): void {
    if (!this.renderer || this.cssWidth <= 0 || this.cssHeight <= 0) return;
    let scale = this.quality.scale;
    while (scale >= this.framePreset.global.quality.minRenderScale - 0.001) {
      if (this.renderer.resize(this.cssWidth, this.cssHeight, dpr, scale)) return;
      scale = Number((scale - 0.1).toFixed(2));
    }
    this.callbacks.onFallback?.("The GPU could not allocate a render target at the minimum quality tier.");
  }

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.stop();
    this.callbacks.onContextStateChange?.("lost");
  };

  private readonly onContextRestored = (): void => {
    this.contextLost = false;
    this.createRenderer();
    this.callbacks.onContextStateChange?.("restored");
    this.lastTimestamp = performance.now();
    this.start();
  };

  private readonly onVisibilityChange = (): void => {
    if (!document.hidden) this.lastTimestamp = performance.now();
  };

  private randomSeed(): number {
    const cryptoSeed = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(cryptoSeed)[0];
    return Date.now() >>> 0;
  }

  private initializeScene(seed: number, scene: DihedralFieldConfig): DihedralFieldState | ChordLatticeState {
    return scene.family === "chord-lattice" ? initializeChordLattice(seed, scene) : initializeDihedral(seed, scene);
  }

  private updateLineWeave(dt: number, scene: DihedralFieldConfig) {
    const state = this.state as DihedralFieldState;
    updateDihedral(state, dt, scene, this.framePreset.global.paletteSpeed);
    const instances = buildDihedralInstances(state, scene, this.instanceScratch);
    this.instanceScratch = instances.data;
    return instances;
  }

  private updateChordLattice(dt: number, scene: DihedralFieldConfig) {
    const state = this.state as ChordLatticeState;
    updateChordLattice(state, dt, scene, this.framePreset.global.paletteSpeed);
    const instances = buildChordLatticeInstances(state, scene, this.instanceScratch);
    this.instanceScratch = instances.data;
    return instances;
  }
}
