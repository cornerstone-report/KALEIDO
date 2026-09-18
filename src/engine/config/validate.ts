import { createDefaultPreset, defaultDihedralField, defaultGlobalConfig } from "./defaults";
import type { DihedralFieldConfig, GlobalConfig, PresetEnvelope } from "./types";
import { isApertureMask } from "../math/aperture-mask";
import { PHI } from "../math/phi";

const finite = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp = (value: unknown, min: number, max: number, fallback: number): number =>
  Math.min(max, Math.max(min, finite(value, fallback)));

export const clampDihedral = (value: Partial<DihedralFieldConfig>): DihedralFieldConfig => {
  const fallback = defaultDihedralField();
  return {
    family: value.family === "chord-lattice" ? "chord-lattice" : "line-weave",
    foldOrder: Math.round(clamp(value.foldOrder, 2, 21, fallback.foldOrder)),
    mirror: typeof value.mirror === "boolean" ? value.mirror : fallback.mirror,
    pathCount: Math.round(clamp(value.pathCount, 2, 80, fallback.pathCount)),
    segmentsPerPath: Math.round(clamp(value.segmentsPerPath, 2, 32, fallback.segmentsPerPath)),
    lineLength: clamp(value.lineLength, 0.05, 0.8, fallback.lineLength),
    speed: clamp(value.speed, 0, 2, fallback.speed),
    spin: clamp(value.spin, -1, 1, fallback.spin),
    curvature: clamp(value.curvature, 0, 1, fallback.curvature),
    transitionSeconds: clamp(value.transitionSeconds, 3, 60, fallback.transitionSeconds),
    ribbonWidth: clamp(value.ribbonWidth, 0.001, 0.02, fallback.ribbonWidth),
    layerCount: Math.round(clamp(value.layerCount, 1, 6, fallback.layerCount)),
    chordsPerLayer: Math.round(clamp(value.chordsPerLayer, 8, 160, fallback.chordsPerLayer)),
    aperture: clamp(value.aperture, 0, 0.7, fallback.aperture),
    ringWidth: clamp(value.ringWidth, 0.12, 0.82, fallback.ringWidth),
    chordSkip: Math.round(clamp(value.chordSkip, 1, 64, fallback.chordSkip)),
    trailGenerations: Math.round(clamp(value.trailGenerations, 1, 12, fallback.trailGenerations)),
    apertureMask: isApertureMask(value.apertureMask) ? value.apertureMask : fallback.apertureMask,
  };
};

export const clampGlobal = (value: Partial<GlobalConfig>): GlobalConfig => {
  const fallback = defaultGlobalConfig();
  const background = Array.isArray(value.background) ? value.background : fallback.background;
  const feedback = value.feedback ?? fallback.feedback;
  const evolution = value.evolution ?? fallback.evolution;
  const quality = value.quality ?? fallback.quality;
  return {
    palette: value.palette === "ember" || value.palette === "ultraviolet" || value.palette === "mineral"
      ? value.palette
      : "aurora",
    paletteSpeed: clamp(value.paletteSpeed, -0.5, 0.5, fallback.paletteSpeed),
    paletteBands: Math.round(clamp(value.paletteBands, 2, 32, fallback.paletteBands)),
    background: [
      clamp(background[0], 0, 1, fallback.background[0]),
      clamp(background[1], 0, 1, fallback.background[1]),
      clamp(background[2], 0, 1, fallback.background[2]),
    ],
    inkIntensity: clamp(value.inkIntensity, 0, 1, fallback.inkIntensity),
    fieldBleed: clamp(value.fieldBleed, 0, PHI * PHI, fallback.fieldBleed),
    feedback: {
      enabled: typeof feedback.enabled === "boolean" ? feedback.enabled : fallback.feedback.enabled,
      decayPerSecond: clamp(feedback.decayPerSecond, 0, 8, fallback.feedback.decayPerSecond),
      smear: clamp(feedback.smear, 0, 1, fallback.feedback.smear),
    },
    evolution: {
      enabled: typeof evolution.enabled === "boolean" ? evolution.enabled : fallback.evolution.enabled,
      speed: clamp(evolution.speed, 0, 2, fallback.evolution.speed),
      amount: clamp(evolution.amount, 0, 1, fallback.evolution.amount),
    },
    quality: {
      preferredRenderScale: clamp(quality.preferredRenderScale, 0.5, 1, fallback.quality.preferredRenderScale),
      minRenderScale: clamp(quality.minRenderScale, 0.5, 1, fallback.quality.minRenderScale),
      targetFrameMs: clamp(quality.targetFrameMs, 8, 50, fallback.quality.targetFrameMs),
      dprCap: clamp(quality.dprCap, 1, 3, fallback.quality.dprCap),
    },
  };
};

export const normalizePreset = (value: Partial<PresetEnvelope>): PresetEnvelope<"dihedral-field"> => {
  const fallback = createDefaultPreset();
  if (value.schemaVersion !== 1 || value.sceneId !== "dihedral-field") return fallback;
  return {
    schemaVersion: 1,
    sceneId: "dihedral-field",
    seed: finite(value.seed, fallback.seed) >>> 0,
    global: clampGlobal(value.global ?? fallback.global),
    scene: clampDihedral((value.scene as Partial<DihedralFieldConfig>) ?? fallback.scene),
  };
};
