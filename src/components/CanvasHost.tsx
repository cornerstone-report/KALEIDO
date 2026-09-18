import { useEffect, useRef, useState } from "react";
import type { PresetEnvelope } from "../engine/config/types";
import { KaleidoEngine } from "../engine/KaleidoEngine";

interface CanvasHostProps {
  preset: PresetEnvelope<"dihedral-field">;
  onReady: (engine: KaleidoEngine) => void;
}

const drawFallback = (canvas: HTMLCanvasElement, preset: PresetEnvelope<"dihedral-field">): (() => void) => {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;
  let frame = 0;
  const start = performance.now();
  const render = (now: number): void => {
    const width = canvas.width;
    const height = canvas.height;
    if (width > 0 && height > 0) {
      const time = (now - start) / 1000;
      context.fillStyle = `rgb(${preset.global.background.map((part) => Math.round(part * 255)).join(",")})`;
      context.fillRect(0, 0, width, height);
      context.save();
      context.translate(width / 2, height / 2);
      context.globalCompositeOperation = "lighter";
      for (let index = 0; index < preset.scene.foldOrder * 2; index += 1) {
        const angle = (Math.PI * 2 * index) / (preset.scene.foldOrder * 2) + time * preset.scene.spin * 0.1;
        context.rotate(angle);
        context.strokeStyle = `hsla(${(index * 360) / preset.scene.foldOrder}, 90%, 70%, .55)`;
        context.lineWidth = Math.max(1, preset.scene.ribbonWidth * width * 0.6);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(width * 0.35, Math.sin(time + index) * height * 0.14);
        context.stroke();
        context.rotate(-angle);
      }
      context.restore();
    }
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  return () => cancelAnimationFrame(frame);
};

export const CanvasHost = ({ preset, onReady }: CanvasHostProps) => {
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<KaleidoEngine | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string>();

  useEffect(() => {
    const canvas = webglCanvasRef.current;
    if (!canvas) return undefined;
    const engine = new KaleidoEngine(canvas, preset, { onFallback: setFallbackReason });
    engineRef.current = engine;
    onReady(engine);
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // The engine owns changes through the imperative effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setPreset(preset);
  }, [preset]);

  useEffect(() => {
    const host = webglCanvasRef.current?.parentElement;
    if (!host) return undefined;
    const resize = (): void => {
      const bounds = host.getBoundingClientRect();
      engineRef.current?.resize(bounds.width, bounds.height);
      const fallback = fallbackCanvasRef.current;
      if (fallback) {
        const dpr = Math.min(window.devicePixelRatio || 1, preset.global.quality.dprCap);
        fallback.width = Math.max(1, Math.floor(bounds.width * dpr));
        fallback.height = Math.max(1, Math.floor(bounds.height * dpr));
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return () => observer.disconnect();
  }, [preset.global.quality.dprCap]);

  useEffect(() => {
    if (!fallbackReason || !fallbackCanvasRef.current) return undefined;
    return drawFallback(fallbackCanvasRef.current, preset);
  }, [fallbackReason, preset]);

  return (
    <section className="stage" aria-label="KALEIDO visual canvas">
      <canvas ref={webglCanvasRef} className={fallbackReason ? "canvas canvas--hidden" : "canvas"} />
      <canvas ref={fallbackCanvasRef} className={fallbackReason ? "canvas" : "canvas canvas--hidden"} />
      {fallbackReason && <p className="fallback-notice">Canvas fallback: {fallbackReason}</p>}
    </section>
  );
};
