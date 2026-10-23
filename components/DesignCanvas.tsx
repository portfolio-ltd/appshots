"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeFile, loadOverlayImages, type Drawable } from "@/lib/assets";
import { getDevice, outputSize, type DesignConfig } from "@/lib/constants";
import { ensureFontsLoaded, renderFonts } from "@/lib/fonts";
import { hitTestOverlay, renderDesign, type OverlayHit } from "@/lib/render/draw";

interface DesignCanvasProps {
  deviceId: string;
  config: DesignConfig;
  file: File | null;
  /** Internal render height in px; the canvas is scaled to its container with CSS. */
  renderHeight?: number;
  className?: string;
  selectedOverlayId?: string | null;
  onSelectOverlay?: (id: string | null) => void;
  onOverlayMove?: (id: string, x: number, y: number) => void;
}

/**
 * Live preview using the exact renderer the export uses — what you see here is
 * what ends up in the ZIP, just at a lower resolution.
 */
export function DesignCanvas({
  deviceId,
  config,
  file,
  renderHeight = 900,
  className,
  selectedOverlayId,
  onSelectOverlay,
  onOverlayMove,
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitsRef = useRef<OverlayHit[]>([]);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const [bitmap, setBitmap] = useState<{ file: File; image: ImageBitmap } | null>(null);
  const [overlayImages, setOverlayImages] = useState<Map<string, Drawable>>(new Map());
  const [fontsTick, setFontsTick] = useState(0);

  const spec = getDevice(deviceId);
  const orientation = config.orientation ?? spec?.defaultOrientation ?? "portrait";
  const full = spec ? outputSize(spec, orientation) : { width: 1290, height: 2796 };
  const scale = Math.min(1, renderHeight / full.height);
  const width = Math.round(full.width * scale);
  const height = Math.round(full.height * scale);

  useEffect(() => {
    if (!file) return;
    let live = true;
    decodeFile(file).then((image) => { if (live) setBitmap({ file, image }); }).catch(() => undefined);
    return () => { live = false; };
  }, [file]);

  const overlayKey = config.overlays.map((o) => `${o.id}|${o.src}`).join(",");
  const overlays = config.overlays;
  useEffect(() => {
    let live = true;
    loadOverlayImages(overlays).then((m) => { if (live) setOverlayImages(m); });
    return () => { live = false; };
    // Reload only when the set of images changes, not on every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayKey]);

  useEffect(() => {
    let live = true;
    ensureFontsLoaded(config.fontId).then(() => { if (live) setFontsTick((t) => t + 1); });
    return () => { live = false; };
  }, [config.fontId]);

  const image = bitmap && bitmap.file === file ? bitmap.image : null;
  const fonts = useMemo(() => renderFonts(config.fontId), [config.fontId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !spec) return;
    const frame = requestAnimationFrame(() => {
      const result = renderDesign(ctx, width, height, config, spec.frame, {
        screenshot: image,
        screenshotSize: image ? { width: image.width, height: image.height } : null,
        overlays: overlayImages,
        fonts,
      });
      hitsRef.current = result.overlays;
      const sel = result.overlays.find((o) => o.id === selectedOverlayId);
      if (sel) drawSelection(ctx, sel, width);
    });
    return () => cancelAnimationFrame(frame);
  }, [config, spec, width, height, image, overlayImages, fonts, fontsTick, selectedOverlayId]);

  function toCanvas(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    };
  }

  const interactive = Boolean(onSelectOverlay || onOverlayMove);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ aspectRatio: `${width} / ${height}`, touchAction: interactive ? "none" : undefined }}
      aria-label={config.headline ? `Screenshot preview: ${config.headline}` : "Screenshot preview"}
      role="img"
      onPointerDown={interactive ? (e) => {
        const p = toCanvas(e);
        const id = hitTestOverlay(hitsRef.current, p.x, p.y);
        onSelectOverlay?.(id);
        if (!id || !onOverlayMove) return;
        const hit = hitsRef.current.find((h) => h.id === id)!;
        dragRef.current = { id, dx: hit.cx - p.x, dy: hit.cy - p.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      } : undefined}
      onPointerMove={interactive ? (e) => {
        const drag = dragRef.current;
        if (!drag || !onOverlayMove) return;
        const p = toCanvas(e);
        const x = Math.min(100, Math.max(0, ((p.x + drag.dx) / width) * 100));
        const y = Math.min(100, Math.max(0, ((p.y + drag.dy) / height) * 100));
        onOverlayMove(drag.id, x, y);
      } : undefined}
      onPointerUp={interactive ? () => { dragRef.current = null; } : undefined}
      onPointerCancel={interactive ? () => { dragRef.current = null; } : undefined}
    />
  );
}

function drawSelection(ctx: CanvasRenderingContext2D, o: OverlayHit, canvasWidth: number) {
  const pad = canvasWidth * 0.008;
  ctx.save();
  ctx.translate(o.cx, o.cy);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.setLineDash([canvasWidth * 0.012, canvasWidth * 0.008]);
  ctx.lineWidth = Math.max(1.5, canvasWidth * 0.004);
  ctx.strokeStyle = "#6366f1";
  ctx.strokeRect(-o.w / 2 - pad, -o.h / 2 - pad, o.w + pad * 2, o.h + pad * 2);
  ctx.restore();
}
