import type { DesignConfig, FrameKind } from "../constants";
import { frameGeometry, rotatedBounds, type FrameGeometry, type Rect } from "./geometry";

/** Returns the rendered width of `text` at `size` px and `weight`. */
export type MeasureFn = (text: string, size: number, weight: number) => number;

export const HEADLINE_LINE_HEIGHT = 1.08;
export const SUB_LINE_HEIGHT = 1.3;
const MAX_HEADLINE_LINES = 3;
const MAX_SUB_LINES = 3;
/** Font sizes in the config are authored against a canvas this wide. */
export const REFERENCE_WIDTH = 1290;

export interface TextBlock {
  lines: string[];
  size: number;
  lineHeight: number; // px
}

export interface DesignLayout {
  width: number;
  height: number;
  text: {
    box: Rect;
    headline: TextBlock | null;
    sub: TextBlock | null;
    gap: number;
  } | null;
  /** null for full-bleed, where the screenshot covers the canvas. */
  device: {
    cx: number;
    cy: number;
    /** Draw the upright device rotated -90° (landscape screenshot on a phone/tablet). */
    sideways: boolean;
    geometry: FrameGeometry;
  } | null;
}

/** Splits on spaces; words wider than `maxWidth` are broken between characters. */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      // Hard-break an over-long word (URLs, CJK runs without spaces).
      line = "";
      for (const ch of Array.from(word)) {
        if (line && measure(line + ch) > maxWidth) {
          lines.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Wraps `text`, shrinking the size until it fits in `maxLines`. */
export function fitText(
  text: string,
  preferredSize: number,
  maxWidth: number,
  maxLines: number,
  lineHeight: number,
  weight: number,
  measure: MeasureFn,
): TextBlock | null {
  if (!text.trim()) return null;
  const minSize = preferredSize * 0.45;
  const words = text.split(/\s+/).filter(Boolean);
  let size = preferredSize;
  let lines = wrapText(text, maxWidth, (s) => measure(s, size, weight));
  // Shrink until it fits the line budget and no single word has to be split mid-word.
  const tooBig = () =>
    lines.length > maxLines || words.some((w) => measure(w, size, weight) > maxWidth);
  while (tooBig() && size > minSize) {
    size = Math.max(minSize, size * 0.92);
    lines = wrapText(text, maxWidth, (s) => measure(s, size, weight));
  }
  return { lines: balanceLines(text, lines.length, maxWidth, (s) => measure(s, size, weight)), size, lineHeight: size * lineHeight };
}

/**
 * Re-wraps into the narrowest width that keeps the same line count, so a
 * caption reads "The calm to-do list / that plans your week" instead of
 * leaving a single orphaned word on the last line.
 */
export function balanceLines(text: string, lineCount: number, maxWidth: number, measure: (s: string) => number): string[] {
  const wrap = (w: number) => wrapText(text, w, measure);
  if (lineCount < 2) return wrap(maxWidth);
  // Never narrower than the widest word, or balancing would split it mid-word.
  const widest = Math.max(...text.split(/\s+/).filter(Boolean).map(measure));
  let lo = Math.max(maxWidth * 0.4, Math.min(widest, maxWidth));
  let hi = maxWidth;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (wrap(mid).length > lineCount) lo = mid;
    else hi = mid;
  }
  return wrap(hi);
}

function blockHeight(b: TextBlock | null) {
  return b ? b.lines.length * b.lineHeight : 0;
}

/** Natural screen size for the frame when the screenshot aspect is `aspect` (w / h). */
function screenAspectFor(frame: FrameKind, aspect: number) {
  // Laptops show landscape content; portrait screenshots are cropped to 16:10.
  if (frame === "laptop") return aspect >= 1 ? aspect : 16 / 10;
  return aspect;
}

export interface LayoutInput {
  width: number;
  height: number;
  config: DesignConfig;
  frame: FrameKind;
  /** Screenshot width / height. */
  screenAspect: number;
  headlineWeight: number;
  subWeight: number;
  measure: MeasureFn;
}

export function layoutDesign(input: LayoutInput): DesignLayout {
  const { width: W, height: H, config, measure } = input;
  const unit = Math.min(W, H) / REFERENCE_WIDTH;
  const landscapeCanvas = W > H * 1.2;
  const pad = Math.min(W, H) * 0.07;

  const frame: FrameKind = config.deviceStyle === "frame" ? input.frame : "none";

  // ── Text column ────────────────────────────────────────────────────────────
  const textW = landscapeCanvas ? W * 0.3 : W - pad * 2;
  const headline = fitText(
    config.headline, config.fontSize * unit, textW,
    MAX_HEADLINE_LINES, HEADLINE_LINE_HEIGHT, input.headlineWeight, measure,
  );
  const sub = fitText(
    config.subheading, config.subSize * unit, textW,
    MAX_SUB_LINES, SUB_LINE_HEIGHT, input.subWeight, measure,
  );
  const gap = headline && sub ? Math.max(headline.size * 0.32, 12 * unit) : 0;
  const textH = blockHeight(headline) + gap + blockHeight(sub);
  const hasText = textH > 0;

  const top = config.textPosition === "top";

  if (config.deviceStyle === "fullbleed") {
    const marginY = Math.max(pad * 1.2, H * 0.05);
    const box: Rect = {
      x: pad,
      y: top ? marginY : H - marginY - textH,
      w: W - pad * 2,
      h: textH,
    };
    return {
      width: W, height: H,
      text: hasText ? { box: { ...box, w: textW }, headline, sub, gap } : null,
      device: null,
    };
  }

  // ── Text box + region left for the device ──────────────────────────────────
  let textBox: Rect | null = null;
  let region: Rect;
  // Which edge the device sticks to when it is scaled past 100%.
  let anchor: "top" | "bottom" | "left" | "right" | "center";

  if (landscapeCanvas) {
    const colX = top ? pad * 1.4 : W - pad * 1.4 - textW;
    if (hasText) textBox = { x: colX, y: (H - textH) / 2, w: textW, h: textH };
    const regionX = hasText ? (top ? colX + textW + pad : pad) : pad;
    const regionW = hasText ? W - textW - pad * 3.4 : W - pad * 2;
    region = { x: regionX, y: pad, w: regionW, h: H - pad * 2 };
    anchor = hasText ? (top ? "left" : "right") : "center";
  } else {
    const marginY = Math.max(pad * 1.3, H * 0.055);
    const gapTD = H * 0.04;
    if (hasText) {
      const y = top ? marginY : H - marginY - textH;
      textBox = { x: pad, y, w: textW, h: textH };
      region = top
        ? { x: pad, y: y + textH + gapTD, w: W - pad * 2, h: H - (y + textH + gapTD) - H * 0.04 }
        : { x: pad, y: H * 0.04, w: W - pad * 2, h: y - gapTD - H * 0.04 };
      anchor = top ? "top" : "bottom";
    } else {
      region = { x: pad, y: H * 0.05, w: W - pad * 2, h: H * 0.9 };
      anchor = "center";
    }
  }

  // ── Fit the device into the region ─────────────────────────────────────────
  const rawAspect = input.screenAspect > 0 ? input.screenAspect : 9 / 19.5;
  const uprightFrame = frame !== "laptop" && frame !== "none";
  const sideways = uprightFrame && rawAspect > 1;
  const aspect = screenAspectFor(frame, rawAspect);
  // Measure an upright device for sideways frames, then swap its box.
  const unitW = sideways ? 1 / aspect : 1;
  const unitH = sideways ? 1 : 1 / aspect;
  const unitGeo = frameGeometry(frame, unitW, unitH);
  const boxW = sideways ? unitGeo.box.h : unitGeo.box.w;
  const boxH = sideways ? unitGeo.box.w : unitGeo.box.h;
  const rotated = rotatedBounds(boxW, boxH, config.tilt);

  const fit = Math.min(region.w / rotated.w, Math.max(region.h, 1) / rotated.h);
  const scale = fit * (config.deviceScale / 100);
  const geometry = frameGeometry(frame, unitW * scale, unitH * scale);
  const drawnW = rotated.w * scale;
  const drawnH = rotated.h * scale;

  let cx = region.x + region.w / 2;
  let cy = region.y + region.h / 2;
  if (config.deviceScale > 100) {
    if (anchor === "top") cy = region.y + drawnH / 2;
    if (anchor === "bottom") cy = region.y + region.h - drawnH / 2;
    if (anchor === "left") cx = region.x + drawnW / 2;
    if (anchor === "right") cx = region.x + region.w - drawnW / 2;
  }

  return {
    width: W, height: H,
    text: textBox ? { box: textBox, headline, sub, gap } : null,
    device: { cx, cy, sideways, geometry },
  };
}
