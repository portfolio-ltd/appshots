import type { OverlayItem } from "./constants";
import { loadOverlayFile } from "./files";

export type Drawable = CanvasImageSource & { width: number; height: number };

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load image ${src.slice(0, 60)}`));
      img.src = src;
    });
    p.catch(() => imageCache.delete(src));
    imageCache.set(src, p);
  }
  return p;
}

const bitmapCache = new WeakMap<Blob, Promise<ImageBitmap>>();

/** Decodes an uploaded screenshot once and reuses it for every render. */
export function decodeFile(file: Blob): Promise<ImageBitmap> {
  let p = bitmapCache.get(file);
  if (!p) {
    p = createImageBitmap(file);
    bitmapCache.set(file, p);
  }
  return p;
}

const overlayUrls = new Map<string, string>();

/** Image URL for an overlay: the static asset for built-ins, an object URL for uploads. */
export async function overlaySrc(o: OverlayItem): Promise<string | null> {
  if (o.kind === "builtin") return o.src;
  const cached = overlayUrls.get(o.id);
  if (cached) return cached;
  const blob = await loadOverlayFile(o.id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  overlayUrls.set(o.id, url);
  return url;
}

export async function loadOverlayImages(overlays: OverlayItem[]): Promise<Map<string, Drawable>> {
  const out = new Map<string, Drawable>();
  await Promise.all(
    overlays.map(async (o) => {
      try {
        const src = await overlaySrc(o);
        if (src) out.set(o.id, await loadImage(src));
      } catch {
        // A broken overlay is skipped rather than failing the whole render.
      }
    }),
  );
  return out;
}
