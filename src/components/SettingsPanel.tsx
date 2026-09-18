import { Download, PanelRightClose, PanelRightOpen, RefreshCw, Sparkles } from "lucide-react";
import type { ChangeEvent } from "react";
import type { PresetEnvelope } from "../engine/config/types";

interface SettingsPanelProps {
  preset: PresetEnvelope<"dihedral-field">;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onPresetChange: (preset: PresetEnvelope<"dihedral-field">) => void;
  onRegenerate: () => void;
  onExportPng: () => void;
  onExportPreset: () => void;
}

const number = (event: ChangeEvent<HTMLInputElement>): number => Number(event.target.value);

export const SettingsPanel = ({ preset, collapsed, onCollapsedChange, onPresetChange, onRegenerate, onExportPng, onExportPreset }: SettingsPanelProps) => {
  const scene = preset.scene;
  const global = preset.global;
  const updateScene = (change: Partial<typeof scene>): void => onPresetChange({ ...preset, scene: { ...scene, ...change } });
  const updateGlobal = (change: Partial<typeof global>): void => onPresetChange({ ...preset, global: { ...global, ...change } });
  const selectFamily = (family: typeof scene.family): void => {
    const lattice = family === "chord-lattice";
    onPresetChange({
      ...preset,
      scene: { ...scene, family },
      global: lattice ? {
        ...global,
        background: [0, 0, 0],
        inkIntensity: 0.92,
        paletteBands: 5,
        feedback: { ...global.feedback, enabled: false, decayPerSecond: 4.5 },
        evolution: { ...global.evolution, enabled: false },
      } : global,
    });
  };

  return (
    <aside className={`panel${collapsed ? " panel--collapsed" : ""}`} aria-label="Visual controls">
      <button
        className="panel-toggle"
        type="button"
        aria-label={collapsed ? "Show visual controls" : "Minimize visual controls"}
        aria-expanded={!collapsed}
        title={collapsed ? "Show controls" : "Minimize controls"}
        onClick={() => onCollapsedChange(!collapsed)}
      >
        {collapsed ? <PanelRightOpen size={18} aria-hidden="true" /> : <PanelRightClose size={18} aria-hidden="true" />}
      </button>
      {collapsed ? null : <>
      <div className="brand">
        <Sparkles size={17} aria-hidden="true" />
        <div><h1>KALEIDO</h1><p>Visual instrument · v0.1</p></div>
      </div>

      <section>
        <h2>Visual family</h2>
        <label className="control">Pattern
          <select value={scene.family} onChange={(event) => selectFamily(event.target.value as typeof scene.family)}>
            <option value="chord-lattice">Chord Lattice</option>
            <option value="line-weave">Line Weave</option>
          </select>
        </label>
        <label className="control">Fold order <output>{scene.foldOrder}</output>
          <input type="range" min="2" max="21" step="1" value={scene.foldOrder} onChange={(event) => updateScene({ foldOrder: number(event) })} />
        </label>
        <label className="switch"><input type="checkbox" checked={scene.mirror} onChange={(event) => updateScene({ mirror: event.target.checked })} /> Mirror each fold</label>
        {scene.family === "chord-lattice" ? <>
          <label className="control">Aperture mask
            <select value={scene.apertureMask} onChange={(event) => updateScene({ apertureMask: event.target.value as typeof scene.apertureMask })}>
              <option value="string">Open ring</option>
              <option value="wedge">Wedge</option>
              <option value="heart">Heart</option>
              <option value="figure8">Figure-8</option>
              <option value="teardrop">Tear</option>
            </select>
          </label>
          <label className="control">Radial layers <output>{scene.layerCount}</output>
            <input type="range" min="1" max="6" step="1" value={scene.layerCount} onChange={(event) => updateScene({ layerCount: number(event) })} />
          </label>
          <label className="control">Chords / layer <output>{scene.chordsPerLayer}</output>
            <input type="range" min="8" max="160" step="1" value={scene.chordsPerLayer} onChange={(event) => updateScene({ chordsPerLayer: number(event) })} />
          </label>
          <label className="control">Chord skip <output>{scene.chordSkip}</output>
            <input type="range" min="1" max="48" step="1" value={scene.chordSkip} onChange={(event) => updateScene({ chordSkip: number(event) })} />
          </label>
          <label className="control">Trail stamps <output>{scene.trailGenerations}</output>
            <input type="range" min="1" max="12" step="1" value={scene.trailGenerations} onChange={(event) => updateScene({ trailGenerations: number(event) })} />
          </label>
          <label className="control">Center aperture <output>{scene.aperture.toFixed(2)}</output>
            <input type="range" min="0" max="0.70" step="0.01" value={scene.aperture} onChange={(event) => updateScene({ aperture: number(event) })} />
          </label>
          <label className="control">Ring span <output>{scene.ringWidth.toFixed(2)}</output>
            <input type="range" min="0.12" max="0.82" step="0.01" value={scene.ringWidth} onChange={(event) => updateScene({ ringWidth: number(event) })} />
          </label>
          <label className="control">Orbit <output>{scene.speed.toFixed(2)}</output>
            <input type="range" min="0" max="1" step="0.01" value={scene.speed} onChange={(event) => updateScene({ speed: number(event) })} />
          </label>
          <label className="control">Spin <output>{scene.spin.toFixed(3)}</output>
            <input type="range" min="-0.25" max="0.25" step="0.005" value={scene.spin} onChange={(event) => updateScene({ spin: number(event) })} />
          </label>
          <label className="control">Line width <output>{scene.ribbonWidth.toFixed(4)}</output>
            <input type="range" min="0.001" max="0.004" step="0.0001" value={scene.ribbonWidth} onChange={(event) => updateScene({ ribbonWidth: number(event) })} />
          </label>
        </> : <>
        <label className="control">Line groups <output>{scene.pathCount}</output>
          <input type="range" min="2" max="48" step="1" value={scene.pathCount} onChange={(event) => updateScene({ pathCount: number(event) })} />
        </label>
        <label className="control">Samples / line <output>{scene.segmentsPerPath}</output>
          <input type="range" min="2" max="24" step="1" value={scene.segmentsPerPath} onChange={(event) => updateScene({ segmentsPerPath: number(event) })} />
        </label>
        <label className="control">Line length <output>{scene.lineLength.toFixed(2)}</output>
          <input type="range" min="0.05" max="0.8" step="0.01" value={scene.lineLength} onChange={(event) => updateScene({ lineLength: number(event) })} />
        </label>
        <label className="control">Drift <output>{scene.speed.toFixed(2)}</output>
          <input type="range" min="0" max="1" step="0.01" value={scene.speed} onChange={(event) => updateScene({ speed: number(event) })} />
        </label>
        <label className="control">Spin <output>{scene.spin.toFixed(2)}</output>
          <input type="range" min="-1" max="1" step="0.01" value={scene.spin} onChange={(event) => updateScene({ spin: number(event) })} />
        </label>
        <label className="control">Curvature <output>{scene.curvature.toFixed(2)}</output>
          <input type="range" min="0" max="1" step="0.01" value={scene.curvature} onChange={(event) => updateScene({ curvature: number(event) })} />
        </label>
        <label className="control">Renewal <output>{scene.transitionSeconds.toFixed(0)} sec</output>
          <input type="range" min="3" max="30" step="1" value={scene.transitionSeconds} onChange={(event) => updateScene({ transitionSeconds: number(event) })} />
        </label>
        <label className="control">Ribbon width <output>{scene.ribbonWidth.toFixed(3)}</output>
          <input type="range" min="0.001" max="0.025" step="0.001" value={scene.ribbonWidth} onChange={(event) => updateScene({ ribbonWidth: number(event) })} />
        </label>
        </>}
      </section>

      <section>
        <h2>Atmosphere</h2>
        <label className="control">Field bleed <output>{global.fieldBleed.toFixed(3)}</output>
          <input type="range" min="0" max="2.618" step="0.001" value={global.fieldBleed} onChange={(event) => updateGlobal({ fieldBleed: number(event) })} />
        </label>
        <p className="hint">0 keeps a circle. 1 covers the window. φ ≈ 1.618 bleeds past the frame.</p>
        <label className="control">Palette
          <select value={global.palette} onChange={(event) => updateGlobal({ palette: event.target.value as typeof global.palette })}>
            <option value="aurora">Aurora</option><option value="ember">Ember</option><option value="ultraviolet">Ultraviolet</option><option value="mineral">Mineral</option>
          </select>
        </label>
        <label className="switch"><input type="checkbox" checked={global.feedback.enabled} onChange={(event) => updateGlobal({ feedback: { ...global.feedback, enabled: event.target.checked } })} /> Persistent trails</label>
        <label className="control">Trail fade <output>{global.feedback.decayPerSecond.toFixed(2)} / sec</output>
          <input type="range" min="0" max="4" step="0.05" value={global.feedback.decayPerSecond} onChange={(event) => updateGlobal({ feedback: { ...global.feedback, decayPerSecond: number(event) } })} />
        </label>
        <label className="control">Palette cycle <output>{global.paletteSpeed.toFixed(3)} / sec</output>
          <input type="range" min="-0.2" max="0.2" step="0.005" value={global.paletteSpeed} onChange={(event) => updateGlobal({ paletteSpeed: number(event) })} />
        </label>
        <label className="control">Palette bands <output>{global.paletteBands}</output>
          <input type="range" min="2" max="24" step="1" value={global.paletteBands} onChange={(event) => updateGlobal({ paletteBands: number(event) })} />
        </label>
        <label className="switch"><input type="checkbox" checked={global.evolution.enabled} onChange={(event) => updateGlobal({ evolution: { ...global.evolution, enabled: event.target.checked } })} /> Gentle evolution</label>
      </section>

      <div className="actions">
        <button type="button" onClick={onRegenerate}><RefreshCw size={15} /> New seed</button>
        <button type="button" onClick={onExportPng}><Download size={15} /> PNG</button>
        <button type="button" onClick={onExportPreset}><Download size={15} /> Preset</button>
      </div>
      </>}
    </aside>
  );
};
