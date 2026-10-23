import type { DesignConfig, FrameKind, OverlayItem } from "../constants";
import type { FrameGeometry, Rect } from "./geometry";
import { layoutDesign, type DesignLayout, type TextBlock } from "./layout";

export interface RenderFonts {
  /** CSS font-family list, without weight/size. */
  family: string;
  headlineWeight: number;
  subWeight: number;
}

export interface RenderAssets {
  screenshot: CanvasImageSource | null;
  /** Natural size of `screenshot`. */
  screenshotSize: { width: number; height: number } | null;
  /** Decoded overlay images keyed by `OverlayItem.id`. */
  overlays: Map<string, CanvasImageSource & { width: number; height: number }>;
  fonts: RenderFonts;
}

/** Where each overlay landed, in canvas pixels — used for hit-testing in the editor. */
export interface OverlayHit {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotation: number;
}

export interface RenderResult {
  layout: DesignLayout;
  overlays: OverlayHit[];
}

type Ctx = CanvasRenderingContext2D;

const EMOJI_FALLBACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function fontString(size: number, weight: number, family: string) {
  return `${weight} ${size}px ${family}, ${EMOJI_FALLBACK}`;
}

export function renderDesign(
  ctx: Ctx,
  width: number,
  height: number,
  config: DesignConfig,
  frame: FrameKind,
  assets: RenderAssets,
): RenderResult {
  const { fonts } = assets;
  const shot = assets.screenshotSize;

  const layout = layoutDesign({
    width,
    height,
    config,
    frame,
    screenAspect: shot ? shot.width / shot.height : 0,
    headlineWeight: fonts.headlineWeight,
    subWeight: fonts.subWeight,
    measure: (text, size, weight) => {
      ctx.font = fontString(size, weight, fonts.family);
      return ctx.measureText(text).width;
    },
  });

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, config);

  if (layout.device) {
    drawDevice(ctx, layout.device, config, assets);
  } else {
    drawFullBleed(ctx, width, height, config, assets, layout.text?.box ?? null);
  }

  if (layout.text) drawText(ctx, layout.text, config, fonts);
  const overlays = drawOverlays(ctx, width, height, config.overlays, assets.overlays);
  ctx.restore();

  return { layout, overlays };
}

// ─── Background ──────────────────────────────────────────────────────────────

function drawBackground(ctx: Ctx, W: number, H: number, config: DesignConfig) {
  if (!config.bgColor2 || config.bgColor2.toLowerCase() === config.bgColor.toLowerCase()) {
    ctx.fillStyle = config.bgColor;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  // CSS-style angle: 0° points up, the gradient runs towards that direction.
  const a = ((config.gradientAngle - 90) * Math.PI) / 180;
  const half = (Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a))) / 2;
  const dx = Math.cos(a) * half;
  const dy = Math.sin(a) * half;
  const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
  g.addColorStop(0, config.bgColor);
  g.addColorStop(1, config.bgColor2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ─── Device ──────────────────────────────────────────────────────────────────

function roundRect(ctx: Ctx, r: Rect, radius: number) {
  const rad = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
}

/** Draws `img` covering `r` (centre crop). */
function drawCover(ctx: Ctx, img: CanvasImageSource, iw: number, ih: number, r: Rect) {
  const s = Math.max(r.w / iw, r.h / ih);
  const w = iw * s;
  const h = ih * s;
  ctx.drawImage(img, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
}

function drawDevice(
  ctx: Ctx,
  device: NonNullable<DesignLayout["device"]>,
  config: DesignConfig,
  assets: RenderAssets,
) {
  const g = device.geometry;
  ctx.save();
  ctx.translate(device.cx, device.cy);
  ctx.rotate((config.tilt * Math.PI) / 180);
  if (device.sideways) ctx.rotate(-Math.PI / 2);

  const flat = g.kind === "none";
  const shadowSize = Math.max(g.body.w, g.body.h);

  // Drop shadow, cast by the body silhouette.
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = shadowSize * 0.06;
  ctx.shadowOffsetY = shadowSize * 0.025 * (device.sideways ? 0 : 1);
  ctx.shadowOffsetX = device.sideways ? -shadowSize * 0.025 : 0;
  roundRect(ctx, g.body, g.bodyRadius);
  ctx.fillStyle = flat ? "#000" : "#111113";
  ctx.fill();
  ctx.restore();

  if (!flat) {
    drawButtons(ctx, g);
    drawBody(ctx, g);
  }

  drawScreen(ctx, g, device.sideways, assets);

  if (!flat) drawCameras(ctx, g);
  if (g.base) drawLaptopBase(ctx, g);

  if (flat) {
    // Hairline so light screenshots don't melt into light backgrounds.
    roundRect(ctx, g.screen, g.screenRadius);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = Math.max(1, g.screen.w * 0.003);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBody(ctx: Ctx, g: FrameGeometry) {
  const { body } = g;
  // Titanium-ish rim: lighter outer band, near-black bezel inside it.
  const rim = ctx.createLinearGradient(body.x, body.y, body.x + body.w, body.y + body.h);
  rim.addColorStop(0, "#5b5b60");
  rim.addColorStop(0.5, "#2a2a2d");
  rim.addColorStop(1, "#4a4a4f");
  roundRect(ctx, body, g.bodyRadius);
  ctx.fillStyle = rim;
  ctx.fill();

  const inset = Math.max(1, g.bezel * 0.18);
  const inner: Rect = { x: body.x + inset, y: body.y + inset, w: body.w - inset * 2, h: body.h - inset * 2 };
  roundRect(ctx, inner, g.bodyRadius - inset);
  ctx.fillStyle = "#0b0b0c";
  ctx.fill();
}

function drawButtons(ctx: Ctx, g: FrameGeometry) {
  const { body, kind } = g;
  const t = Math.max(1.5, g.bezel * 0.3);
  ctx.fillStyle = "#3c3c40";
  const button = (side: "left" | "right" | "top", at: number, len: number) => {
    const r = side === "top"
      ? { x: body.x + body.w * at, y: body.y - t, w: body.w * len, h: t * 2 }
      : {
          x: side === "left" ? body.x - t : body.x + body.w - t,
          y: body.y + body.h * at,
          w: t * 2,
          h: body.h * len,
        };
    roundRect(ctx, r, t);
    ctx.fill();
  };

  if (kind === "iphone") {
    button("left", 0.16, 0.035);
    button("left", 0.23, 0.065);
    button("left", 0.31, 0.065);
    button("right", 0.26, 0.1);
  } else if (kind === "android-phone") {
    button("right", 0.2, 0.08);
    button("right", 0.31, 0.12);
  } else if (kind === "ipad") {
    button("top", 0.8, 0.07);
    button("right", 0.08, 0.05);
    button("right", 0.14, 0.05);
  } else if (kind === "android-tablet") {
    button("top", 0.15, 0.08);
    button("top", 0.28, 0.06);
  } else if (kind === "watch") {
    // Digital crown + side button.
    const crown = { x: body.x + body.w - t, y: body.y + body.h * 0.24, w: t * 3.2, h: body.h * 0.2 };
    roundRect(ctx, crown, t);
    ctx.fill();
    button("right", 0.55, 0.18);
  }
}

function drawScreen(ctx: Ctx, g: FrameGeometry, sideways: boolean, assets: RenderAssets) {
  const { screen } = g;
  ctx.save();
  roundRect(ctx, screen, g.screenRadius);
  ctx.clip();

  ctx.fillStyle = "#1c1c1f";
  ctx.fillRect(screen.x, screen.y, screen.w, screen.h);

  if (assets.screenshot && assets.screenshotSize) {
    const { width: iw, height: ih } = assets.screenshotSize;
    if (sideways) {
      // Undo the device rotation so the landscape screenshot reads upright.
      ctx.save();
      ctx.translate(screen.x + screen.w / 2, screen.y + screen.h / 2);
      ctx.rotate(Math.PI / 2);
      drawCover(ctx, assets.screenshot, iw, ih, { x: -screen.h / 2, y: -screen.w / 2, w: screen.h, h: screen.w });
      ctx.restore();
    } else {
      drawCover(ctx, assets.screenshot, iw, ih, screen);
    }
  } else {
    drawPlaceholder(ctx, screen, sideways, assets.fonts);
  }

  // Soft glass reflection.
  const gloss = ctx.createLinearGradient(screen.x, screen.y, screen.x + screen.w * 0.7, screen.y + screen.h * 0.5);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.10)");
  gloss.addColorStop(0.45, "rgba(255, 255, 255, 0.02)");
  gloss.addColorStop(0.46, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gloss;
  ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
  ctx.restore();
}

function drawPlaceholder(ctx: Ctx, screen: Rect, sideways: boolean, fonts: RenderFonts) {
  ctx.save();
  ctx.translate(screen.x + screen.w / 2, screen.y + screen.h / 2);
  if (sideways) ctx.rotate(Math.PI / 2);
  const size = Math.min(screen.w, screen.h) * 0.07;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = fontString(size, fonts.subWeight, fonts.family);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Your screenshot", 0, 0);
  ctx.restore();
}

function drawCameras(ctx: Ctx, g: FrameGeometry) {
  const { screen, body, kind } = g;
  const short = Math.min(screen.w, screen.h);
  ctx.fillStyle = "#000";
  if (kind === "iphone") {
    // Dynamic Island.
    const w = short * 0.29;
    const h = short * 0.085;
    roundRect(ctx, { x: -w / 2, y: screen.y + short * 0.026, w, h }, h / 2);
    ctx.fill();
  } else if (kind === "android-phone") {
    const d = short * 0.045;
    ctx.beginPath();
    ctx.arc(0, screen.y + short * 0.035, d / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "ipad" || kind === "android-tablet" || kind === "laptop") {
    const d = Math.max(2, g.bezel * 0.3);
    ctx.fillStyle = "#26262a";
    ctx.beginPath();
    ctx.arc(0, body.y + g.bezel / 2, d / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLaptopBase(ctx: Ctx, g: FrameGeometry) {
  const base = g.base!;
  const grad = ctx.createLinearGradient(0, base.y, 0, base.y + base.h);
  grad.addColorStop(0, "#d4d4d8");
  grad.addColorStop(1, "#8e8e93");
  ctx.save();
  ctx.beginPath();
  const r = base.h * 0.5;
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(base.x + base.w, base.y);
  ctx.lineTo(base.x + base.w - r * 0.4, base.y + base.h - r * 0.3);
  ctx.quadraticCurveTo(base.x + base.w - r, base.y + base.h, base.x + base.w - r * 2, base.y + base.h);
  ctx.lineTo(base.x + r * 2, base.y + base.h);
  ctx.quadraticCurveTo(base.x + r, base.y + base.h, base.x + r * 0.4, base.y + base.h - r * 0.3);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  // Thumb notch.
  const nw = base.w * 0.12;
  roundRect(ctx, { x: -nw / 2, y: base.y, w: nw, h: base.h * 0.3 }, base.h * 0.15);
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fill();
  ctx.restore();
}

// ─── Full-bleed ──────────────────────────────────────────────────────────────

function drawFullBleed(ctx: Ctx, W: number, H: number, config: DesignConfig, assets: RenderAssets, textBox: Rect | null) {
  if (assets.screenshot && assets.screenshotSize) {
    drawCover(ctx, assets.screenshot, assets.screenshotSize.width, assets.screenshotSize.height, { x: 0, y: 0, w: W, h: H });
  } else {
    drawPlaceholder(ctx, { x: 0, y: 0, w: W, h: H }, false, assets.fonts);
  }
  if (!textBox) return;

  // Scrim in the theme colour: solid behind the text block, then a soft fade,
  // so the caption stays legible over any screenshot.
  const top = config.textPosition === "top";
  const solidTo = top ? textBox.y + textBox.h + H * 0.02 : textBox.y - H * 0.02;
  const fadeTo = top ? solidTo + H * 0.14 : solidTo - H * 0.14;
  const edge = top ? 0 : H;
  const g = ctx.createLinearGradient(0, edge, 0, fadeTo);
  const solidStop = Math.abs(solidTo - edge) / Math.abs(fadeTo - edge);
  g.addColorStop(0, withAlpha(config.bgColor, 0.94));
  g.addColorStop(solidStop, withAlpha(config.bgColor, 0.88));
  g.addColorStop(1, withAlpha(config.bgColor, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(0, 0, 0, ${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ─── Text ────────────────────────────────────────────────────────────────────

function drawText(
  ctx: Ctx,
  text: NonNullable<DesignLayout["text"]>,
  config: DesignConfig,
  fonts: RenderFonts,
) {
  const { box } = text;
  const x = config.textAlign === "left" ? box.x : config.textAlign === "right" ? box.x + box.w : box.x + box.w / 2;
  ctx.save();
  ctx.fillStyle = config.fontColor;
  ctx.textAlign = config.textAlign;
  ctx.textBaseline = "top";

  let y = box.y;
  const draw = (block: TextBlock, weight: number, tracking: string, alpha: number) => {
    ctx.font = fontString(block.size, weight, fonts.family);
    if ("letterSpacing" in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = tracking;
    ctx.globalAlpha = alpha;
    // Centre each line's glyphs inside its line box.
    const lead = (block.lineHeight - block.size) / 2;
    for (const line of block.lines) {
      ctx.fillText(line, x, y + lead);
      y += block.lineHeight;
    }
  };

  if (text.headline) draw(text.headline, fonts.headlineWeight, "-0.01em", 1);
  y += text.gap;
  if (text.sub) draw(text.sub, fonts.subWeight, "0em", 0.85);
  ctx.restore();
}

// ─── Overlays ────────────────────────────────────────────────────────────────

/** Overlay width before `scale`, as a fraction of the canvas's shorter side. */
export const OVERLAY_BASE = 0.22;

function drawOverlays(
  ctx: Ctx,
  W: number,
  H: number,
  overlays: OverlayItem[],
  images: RenderAssets["overlays"],
): OverlayHit[] {
  const hits: OverlayHit[] = [];
  for (const o of [...overlays].sort((a, b) => a.zIndex - b.zIndex)) {
    const img = images.get(o.id);
    if (!img || !img.width) continue;
    const w = Math.min(W, H) * OVERLAY_BASE * o.scale;
    const h = w * (img.height / img.width);
    const cx = (W * o.x) / 100;
    const cy = (H * o.y) / 100;
    ctx.save();
    ctx.globalAlpha = o.opacity;
    ctx.translate(cx, cy);
    ctx.rotate((o.rotation * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    hits.push({ id: o.id, cx, cy, w, h, rotation: o.rotation });
  }
  return hits;
}

/** Topmost overlay under canvas point (`px`, `py`), honouring rotation. */
export function hitTestOverlay(hits: OverlayHit[], px: number, py: number): string | null {
  for (let i = hits.length - 1; i >= 0; i--) {
    const o = hits[i];
    const a = (-o.rotation * Math.PI) / 180;
    const dx = px - o.cx;
    const dy = py - o.cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= o.w / 2 && Math.abs(ly) <= o.h / 2) return o.id;
  }
  return null;
}
