import { useCallback, useRef, useState } from "react";
import { CanvasHost } from "./components/CanvasHost";
import { SettingsPanel } from "./components/SettingsPanel";
import { createDefaultPreset } from "./engine/config/defaults";
import type { PresetEnvelope } from "./engine/config/types";
import { KaleidoEngine } from "./engine/KaleidoEngine";

const download = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const App = () => {
  const [preset, setPreset] = useState<PresetEnvelope<"dihedral-field">>(createDefaultPreset);
  const [panelOpen, setPanelOpen] = useState(true);
  const engineRef = useRef<KaleidoEngine | null>(null);
  const setEngine = useCallback((engine: KaleidoEngine) => { engineRef.current = engine; }, []);

  const regenerate = (): void => {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
    setPreset((current) => ({ ...current, seed }));
  };
  const exportPng = (): void => {
    engineRef.current?.exportPng().then((blob) => download(blob, "kaleido.png"));
  };
  const exportPreset = (): void => download(new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" }), "kaleido-preset.json");

  return (
    <main className="app-shell">
      <CanvasHost preset={preset} onReady={setEngine} />
      <SettingsPanel
        preset={preset}
        collapsed={!panelOpen}
        onCollapsedChange={(collapsed) => setPanelOpen(!collapsed)}
        onPresetChange={setPreset}
        onRegenerate={regenerate}
        onExportPng={exportPng}
        onExportPreset={exportPreset}
      />
    </main>
  );
};
