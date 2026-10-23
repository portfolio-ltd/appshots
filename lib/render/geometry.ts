import type { FrameKind } from "../constants";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Device chrome measured around a screen of `screenW × screenH`, in a local
 * coordinate system centred on the whole device box (body + laptop base).
 *
 * Phones, tablets and watches are always described upright; the renderer
 * rotates them by -90° for landscape screenshots. Laptops are always landscape.
 */
export interface FrameGeometry {
  kind: FrameKind;
  /** Bounding box of everything that gets drawn (before tilt). */
  box: { w: number; h: number };
  body: Rect;
  screen: Rect;
  screenRadius: number;
  bodyRadius: number;
  bezel: number;
  /** Laptop keyboard deck, drawn under the body. */
  base: Rect | null;
}

interface FrameRatios {
  bezel: number;        // × short side of the screen
  screenRadius: number; // × short side of the screen
  chin?: number;        // extra bottom bezel (laptop), × screen width
}

const RATIOS: Record<FrameKind, FrameRatios> = {
  iphone: { bezel: 0.04, screenRadius: 0.13 },
  ipad: { bezel: 0.05, screenRadius: 0.04 },
  watch: { bezel: 0.1, screenRadius: 0.24 },
  "android-phone": { bezel: 0.032, screenRadius: 0.08 },
  "android-tablet": { bezel: 0.045, screenRadius: 0.03 },
  laptop: { bezel: 0.022, screenRadius: 0.012, chin: 0.03 },
  none: { bezel: 0, screenRadius: 0.035 },
};

export function frameGeometry(kind: FrameKind, screenW: number, screenH: number): FrameGeometry {
  const r = RATIOS[kind];
  const short = Math.min(screenW, screenH);
  const bezel = r.bezel * (kind === "laptop" ? screenW : short);
  const chin = (r.chin ?? 0) * screenW;
  const screenRadius = r.screenRadius * (kind === "laptop" ? screenW : short);

  const bodyW = screenW + bezel * 2;
  const bodyH = screenH + bezel * 2 + chin;

  let base: Rect | null = null;
  let boxW = bodyW;
  let boxH = bodyH;
  if (kind === "laptop") {
    const baseW = bodyW * 1.16;
    const baseH = bodyW * 0.032;
    boxW = baseW;
    boxH = bodyH + baseH;
    base = { x: -baseW / 2, y: boxH / 2 - baseH, w: baseW, h: baseH };
  }

  const body: Rect = { x: -bodyW / 2, y: -boxH / 2, w: bodyW, h: bodyH };
  const screen: Rect = { x: body.x + bezel, y: body.y + bezel, w: screenW, h: screenH };

  return {
    kind,
    box: { w: boxW, h: boxH },
    body,
    screen,
    screenRadius,
    bodyRadius: kind === "none" ? screenRadius : screenRadius + bezel * 0.85,
    bezel,
    base,
  };
}

/** Axis-aligned size of a `w × h` box rotated by `deg`. */
export function rotatedBounds(w: number, h: number, deg: number) {
  const a = (Math.abs(deg) * Math.PI) / 180;
  return {
    w: w * Math.cos(a) + h * Math.sin(a),
    h: w * Math.sin(a) + h * Math.cos(a),
  };
}
