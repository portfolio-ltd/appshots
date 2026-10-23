import JSZip from "jszip";
import { decodeFile, loadOverlayImages } from "./assets";
import { getDevice, outputSize, type DesignConfig, type DeviceSpec } from "./constants";
import { ensureFontsLoaded, renderFonts } from "./fonts";
import { renderDesign } from "./render/draw";

export interface ExportItem {
  deviceId: string;
  index: number;
  file: File | null;
  config: DesignConfig;
}

export interface RenderedShot {
  deviceId: string;
  index: number;
  path: string;
  blob: Blob;
  width: number;
  height: number;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), type, quality),
  );
}

export function exportPath(spec: DeviceSpec, index: number, ext: "png" | "jpg") {
  return `${spec.store}/${spec.slug}/${String(index + 1).padStart(2, "0")}.${ext}`;
}

/** Renders one screenshot at full store resolution. */
export async function renderFullSize(item: ExportItem): Promise<RenderedShot> {
  const spec = getDevice(item.deviceId);
  if (!spec) throw new Error(`Unknown device ${item.deviceId}`);
  const orientation = item.config.orientation ?? spec.defaultOrientation;
  const { width, height } = outputSize(spec, orientation);

  await ensureFontsLoaded(item.config.fontId);
  const [bitmap, overlays] = await Promise.all([
    item.file ? decodeFile(item.file) : Promise.resolve(null),
    loadOverlayImages(item.config.overlays),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available in this browser");

  renderDesign(ctx, width, height, item.config, spec.frame, {
    screenshot: bitmap,
    screenshotSize: bitmap ? { width: bitmap.width, height: bitmap.height } : null,
    overlays,
    fonts: renderFonts(item.config.fontId),
  });

  let blob = await canvasToBlob(canvas, "image/png");
  let ext: "png" | "jpg" = "png";
  // Busy screenshots can exceed Play's per-file limit as PNG; JPEG keeps them under.
  if (spec.maxFileMB && blob.size > spec.maxFileMB * 1024 * 1024) {
    for (const q of [0.92, 0.85, 0.75]) {
      blob = await canvasToBlob(canvas, "image/jpeg", q);
      ext = "jpg";
      if (blob.size <= spec.maxFileMB * 1024 * 1024) break;
    }
  }

  // Release the backing store early; exports can be dozens of 4K canvases.
  canvas.width = 0;
  canvas.height = 0;

  return { deviceId: item.deviceId, index: item.index, path: exportPath(spec, item.index, ext), blob, width, height };
}

export async function buildZip(shots: RenderedShot[]): Promise<Blob> {
  const zip = new JSZip();
  for (const s of shots) zip.file(s.path, s.blob);
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
}
