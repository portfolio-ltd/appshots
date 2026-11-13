"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StepIndicator } from "@/components/StepIndicator";
import { DesignCanvas } from "@/components/DesignCanvas";
import { FileThumb } from "@/components/FileThumb";
import { MissingDraft } from "@/components/MissingDraft";
import { ColorField, Section, Segmented, Slider } from "@/components/controls";
import { useHydrated } from "@/hooks/useHydrated";
import { useShots } from "@/hooks/useShots";
import { aiAutoDesign, AUTODESIGN_MODEL, describeAiError, localAutoDesign } from "@/lib/autodesign";
import {
  BUILTIN_OVERLAYS,
  DEVICE_SPECS,
  EMOJI_SHORTCUTS,
  FONT_OPTIONS,
  TEMPLATE_PRESETS,
  THEME_PRESETS,
  getDevice,
  isLandscapeOutput,
  outputSize,
  newOverlayId,
  templateStyle,
  numberBadgeDataUri,
  type AppInfo,
  type DesignConfig,
  type OverlayItem,
  type Template,
} from "@/lib/constants";
import { toJpegBase64 } from "@/lib/assets";
import { saveOverlayFile } from "@/lib/files";
import { isBorrowed, withFallbacks } from "@/lib/shots";
import {
  designKey,
  loadApiKey,
  loadAppInfo,
  loadCaptionNotes,
  loadDesigns,
  resolveDesign,
  saveApiKey,
  saveCaptionNotes,
  saveDesigns,
  type DesignMap,
} from "@/lib/persist";

/** Style fields — everything except per-screenshot copy and stickers. */
const STYLE_KEYS = [
  "bgColor", "bgColor2", "gradientAngle", "fontId", "fontSize", "subSize", "fontColor",
  "textAlign", "textPosition", "deviceStyle", "deviceScale", "deviceFit", "tilt", "orientation",
  "glowColor", "glowStrength", "glowAt",
] as const satisfies readonly (keyof DesignConfig)[];

function pickStyle(c: DesignConfig): Partial<DesignConfig> {
  return Object.fromEntries(STYLE_KEYS.map((k) => [k, c[k]]));
}

export default function CustomisePage() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const info = loadAppInfo();
  return info && info.deviceIds.length ? <Editor appInfo={info} /> : <MissingDraft />;
}

function Editor({ appInfo }: { appInfo: AppInfo }) {
  const router = useRouter();
  const { shots: ownShots } = useShots(appInfo.deviceIds);
  // The feature graphic borrows a phone screenshot until it has its own.
  const shots = ownShots ? withFallbacks(ownShots, appInfo.deviceIds) : null;
  const [designs, setDesigns] = useState<DesignMap>(() => loadDesigns());
  // `?device=…&i=…` deep-links from the export page to one screenshot.
  const [deviceId, setDeviceId] = useState(() => {
    const d = new URLSearchParams(window.location.search).get("device");
    return d && appInfo.deviceIds.includes(d) ? d : appInfo.deviceIds[0];
  });
  const [idx, setIdx] = useState(() => Number(new URLSearchParams(window.location.search).get("i")) || 0);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emojiTarget, setEmojiTarget] = useState<"headline" | "subheading">("headline");
  const [applyToAll, setApplyToAll] = useState(true);
  const [numbered, setNumbered] = useState(false);
  const headlineRef = useRef<HTMLTextAreaElement>(null);
  const subheadingRef = useRef<HTMLInputElement>(null);
  const overlayUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveDesigns(designs); }, [designs]);

  const devices = DEVICE_SPECS.filter((d) => appInfo.deviceIds.includes(d.id));
  const spec = getDevice(deviceId)!;
  const files = shots?.[deviceId] ?? [];
  const safeIdx = Math.min(idx, Math.max(0, files.length - 1));
  const key = designKey(deviceId, safeIdx);
  const config = resolveDesign(designs, deviceId, safeIdx);
  const file = files[safeIdx] ?? null;

  /** Every (device, index) that has a screenshot, in export order. */
  const allTargets = devices.flatMap((d) =>
    (shots?.[d.id] ?? []).map((_, i) => ({ deviceId: d.id, idx: i })),
  );

  function update(patch: Partial<DesignConfig>) {
    setDesigns((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function updateMany(fn: (current: DesignConfig, t: { deviceId: string; idx: number }) => Partial<DesignConfig>) {
    setDesigns((prev) => {
      const next = { ...prev };
      for (const t of allTargets) {
        const k = designKey(t.deviceId, t.idx);
        next[k] = { ...next[k], ...fn(resolveDesign(prev, t.deviceId, t.idx), t) };
      }
      return next;
    });
  }

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 3000);
  }

  // ── Templates ──────────────────────────────────────────────────────────────

  function templateOverlays(base: OverlayItem[], t: Template, step: number | null, textTop: boolean): OverlayItem[] {
    const kept = base.filter((o) => o.tag !== "accent" && o.tag !== "step");
    // Sit in the margin above (or below) the headline so accents never cover text.
    const y = textTop ? 3.5 : 96.5;
    const z = Math.max(0, ...kept.map((o) => o.zIndex)) + 1;
    const accent = BUILTIN_OVERLAYS.find((b) => b.id === t.accentOverlayId);
    if (accent) {
      kept.push({ id: newOverlayId(), kind: "builtin", src: accent.src, tag: "accent", x: 88, y, scale: 0.24, rotation: 12, opacity: 1, zIndex: z });
    }
    if (step !== null) {
      kept.push({ id: newOverlayId(), kind: "builtin", src: numberBadgeDataUri(step), tag: "step", x: 10, y, scale: 0.22, rotation: 0, opacity: 1, zIndex: z + 1 });
    }
    return kept;
  }

  /** The template's look for screenshot `index`, keeping its stickers and re-placing generated ones. */
  function templatePatch(t: Template, current: DesignConfig, index: number): Partial<DesignConfig> {
    const style = templateStyle(t, index);
    const textTop = (style.textPosition ?? current.textPosition) === "top";
    return { ...style, overlays: templateOverlays(current.overlays, t, numbered ? index + 1 : null, textTop) };
  }

  function applyTemplate(t: Template) {
    if (applyToAll) {
      updateMany((current, target) => templatePatch(t, current, target.idx));
      flash(`Applied “${t.label}” to all ${allTargets.length} screenshots`);
    } else {
      update(templatePatch(t, config, safeIdx));
    }
  }

  function applyStyleToAll() {
    const style = pickStyle(config);
    updateMany(() => style);
    flash(`Style copied to all ${allTargets.length} screenshots`);
  }

  // ── AI captions ────────────────────────────────────────────────────────────

  const [apiKeyState, setApiKeyState] = useState(() => loadApiKey());
  const [aiBusy, setAiBusy] = useState(false);
  const [applySuggestedTemplate, setApplySuggestedTemplate] = useState(true);
  // Each press of "Write captions" without a key cycles to different suggestions.
  const [localSeed, setLocalSeed] = useState(0);
  const [notes, setNotes] = useState(() => loadCaptionNotes());

  /** One screenshot per position for Claude to look at: the first device that has one, phones first. */
  async function screensForClaude(count: number): Promise<(string | null)[]> {
    const order = [...devices].sort((a, b) => Number(/phone|iphone/.test(b.id)) - Number(/phone|iphone/.test(a.id)));
    return Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const f = order.map((d) => ownShots?.[d.id]?.[i]).find(Boolean);
        return f ? toJpegBase64(f).catch(() => null) : null;
      }),
    );
  }

  async function writeCaptions() {
    const count = Math.max(1, ...devices.map((d) => shots?.[d.id]?.length ?? 0));
    setAiBusy(true);
    setError(null);
    let result;
    try {
      const key = apiKeyState.key.trim();
      result = key
        ? await aiAutoDesign(appInfo, count, key, { screens: await screensForClaude(count), notes })
        : localAutoDesign(appInfo, count, localSeed);
      setLocalSeed((s) => s + 1);
    } catch (e) {
      setError(`AI captions failed: ${describeAiError(e)}`);
      setAiBusy(false);
      return;
    }
    const template = TEMPLATE_PRESETS.find((t) => t.id === result.templateId);
    // Caption i goes on screenshot i of every device — the same screen across devices.
    updateMany((current, target) => {
      const copy = result.shots[target.idx] ?? result.shots[0];
      const patch: Partial<DesignConfig> = { headline: copy.headline, subheading: copy.subheading };
      if (applySuggestedTemplate && template) Object.assign(patch, templatePatch(template, current, target.idx));
      return patch;
    });
    flash(result.source === "ai" ? "Captions written by Claude" : "Captions filled with built-in suggestions");
    setAiBusy(false);
  }

  // ── Text ───────────────────────────────────────────────────────────────────

  function insertEmoji(emoji: string) {
    const field = emojiTarget;
    const el = (field === "headline" ? headlineRef : subheadingRef).current;
    const value = config[field];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    update({ [field]: value.slice(0, start) + emoji + value.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  // ── Overlays ───────────────────────────────────────────────────────────────

  function addOverlay(o: Omit<OverlayItem, "x" | "y" | "scale" | "rotation" | "opacity" | "zIndex">) {
    const zIndex = Math.max(0, ...config.overlays.map((x) => x.zIndex)) + 1;
    update({ overlays: [...config.overlays, { ...o, x: 50, y: 50, scale: 0.6, rotation: 0, opacity: 1, zIndex }] });
    setSelectedOverlayId(o.id);
  }

  async function handleOverlayUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(f.type)) {
      setError("Stickers must be PNG, JPEG, WebP or SVG.");
      return;
    }
    const id = newOverlayId();
    await saveOverlayFile(id, f);
    addOverlay({ id, kind: "upload", src: "" });
  }

  function updateOverlay(id: string, patch: Partial<OverlayItem>) {
    update({ overlays: config.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  }

  function removeOverlay(id: string) {
    setSelectedOverlayId(null);
    update({ overlays: config.overlays.filter((o) => o.id !== id) });
  }

  function copyOverlaysToAll() {
    const overlays = config.overlays;
    updateMany(() => ({ overlays: overlays.map((o) => ({ ...o })) }));
    flash("Stickers copied to all screenshots");
  }

  const selectedOverlay = config.overlays.find((o) => o.id === selectedOverlayId) ?? null;
  const solid = config.bgColor2.toLowerCase() === config.bgColor.toLowerCase();
  const totalFiles = allTargets.length;

  return (
    <main className="min-h-screen bg-background">
      <StepIndicator currentStep={3} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_440px] gap-6 items-start">
          {/* ── Controls ─────────────────────────────────────────────────── */}
          <div className="space-y-4 order-2 lg:order-1">
            <Section
              title="✨ Captions for the whole set"
              description="Writes a headline and subheading for every screenshot. With your key, Claude looks at each screen."
              action={
                <Button size="sm" onClick={writeCaptions} disabled={aiBusy || totalFiles === 0}>
                  {aiBusy ? (apiKeyState.key.trim() ? "Reading your screens…" : "Writing…") : "Write captions"}
                </Button>
              }
            >
              <div className="space-y-2">
                <label htmlFor="api-key" className="text-xs font-medium">Anthropic API key (optional)</label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-ant-…"
                  autoComplete="off"
                  value={apiKeyState.key}
                  onChange={(e) => {
                    const next = { ...apiKeyState, key: e.target.value };
                    setApiKeyState(next);
                    saveApiKey(next.key.trim(), next.remembered);
                  }}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={apiKeyState.remembered}
                      onCheckedChange={(v) => {
                        const next = { ...apiKeyState, remembered: !!v };
                        setApiKeyState(next);
                        saveApiKey(next.key.trim(), next.remembered);
                      }}
                    />
                    Remember key on this device
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={applySuggestedTemplate} onCheckedChange={(v) => setApplySuggestedTemplate(!!v)} />
                    Also apply the suggested template
                  </label>
                </div>
                {apiKeyState.key.trim() && (
                  <div className="space-y-1.5 pt-1">
                    <label htmlFor="caption-notes" className="text-xs font-medium">More context for Claude (optional)</label>
                    <Textarea
                      id="caption-notes"
                      rows={3}
                      placeholder="Paste your README, feature list or release notes. Captions get more specific."
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); saveCaptionNotes(e.target.value); }}
                      className="text-xs"
                    />
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {apiKeyState.key.trim()
                    ? `Uses ${AUTODESIGN_MODEL}, billed to your key. Your key and downscaled copies of your screenshots go only to api.anthropic.com, straight from your browser.`
                    : "Without a key, we use built-in suggestions. Add your own key for captions written by Claude."}
                </p>
              </div>
            </Section>

            <Section
              title="Templates"
              description="A complete look in one click. Some give each screenshot its own colour."
              action={
                <div className="flex flex-col items-end gap-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none">
                    <Checkbox checked={applyToAll} onCheckedChange={(v) => setApplyToAll(!!v)} />
                    All screenshots
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none">
                    <Checkbox checked={numbered} onCheckedChange={(v) => setNumbered(!!v)} />
                    Step numbers
                  </label>
                </div>
              }
            >
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {TEMPLATE_PRESETS.map((t) => {
                  const look = templateStyle(t, 0);
                  const glow = look.glowColor
                    ? `radial-gradient(ellipse 90% 45% at 50% ${look.glowAt === "device" ? "75%" : "0%"}, ${look.glowColor}aa, transparent), `
                    : "";
                  return (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t)} className="group flex flex-col items-center gap-1" title={t.variants ? `${t.label}: a different colour per screenshot` : t.label}>
                      <span
                        className="w-full aspect-[3/4] rounded-xl border-2 border-border group-hover:border-primary/60 transition-colors flex flex-col items-center justify-start pt-2 gap-1 overflow-hidden relative"
                        style={{ background: `${glow}linear-gradient(${look.gradientAngle}deg, ${look.bgColor}, ${look.bgColor2})` }}
                      >
                        <span className="w-3/5 h-1.5 rounded-full" style={{ backgroundColor: look.fontColor }} />
                        <span className="w-2/5 h-1 rounded-full opacity-60" style={{ backgroundColor: look.fontColor }} />
                        <span
                          className={`mt-1 ${look.deviceFit === "fill" ? "w-3/5" : "w-2/5"} flex-1 rounded-t-lg border-2 border-b-0`}
                          style={{ borderColor: look.deviceStyle === "frame" ? "#2a2a2d" : "transparent", backgroundColor: "rgba(255,255,255,0.35)" }}
                        />
                        {t.variants && (
                          <span className="absolute bottom-1 right-1 flex gap-0.5" aria-hidden>
                            {t.variants.slice(0, 4).map((v, i) => {
                              const c = v.glowColor ?? v.bgColor ?? look.bgColor;
                              return <span key={i} className="w-1.5 h-1.5 rounded-full ring-1 ring-white/60" style={{ backgroundColor: c }} />;
                            })}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Text">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="headline" className="text-xs font-medium">Headline</label>
                  <span className="text-[11px] text-muted-foreground">Enter starts a new line</span>
                </div>
                <Textarea
                  id="headline"
                  ref={headlineRef}
                  rows={2}
                  placeholder={"e.g. Tap once.\nKeep the chain."}
                  value={config.headline}
                  onChange={(e) => update({ headline: e.target.value })}
                  onFocus={() => setEmojiTarget("headline")}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="subheading" className="text-xs font-medium">Subheading</label>
                <Input
                  id="subheading"
                  ref={subheadingRef}
                  placeholder="e.g. Streaks, stats and gentle reminders"
                  value={config.subheading}
                  onChange={(e) => update({ subheading: e.target.value })}
                  onFocus={() => setEmojiTarget("subheading")}
                />
              </div>
              <div className="flex flex-wrap gap-0.5" aria-label={`Insert emoji into ${emojiTarget}`}>
                {EMOJI_SHORTCUTS.map((em) => (
                  <button key={em} type="button" onClick={() => insertEmoji(em)} className="text-lg w-8 h-8 rounded-md hover:bg-muted">
                    {em}
                  </button>
                ))}
              </div>
              <Segmented
                label="Font"
                value={config.fontId}
                options={FONT_OPTIONS.map((f) => ({ value: f.id, label: f.label }))}
                onChange={(fontId) => update({ fontId })}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Slider label="Headline size" value={config.fontSize} min={60} max={200} onChange={(fontSize) => update({ fontSize })} />
                <Slider label="Subheading size" value={config.subSize} min={28} max={110} onChange={(subSize) => update({ subSize })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Segmented
                  label="Alignment"
                  value={config.textAlign}
                  options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]}
                  onChange={(textAlign) => update({ textAlign })}
                />
                <Segmented
                  label={isLandscapeOutput(spec, config.orientation) ? "Text side" : "Text position"}
                  value={config.textPosition}
                  options={isLandscapeOutput(spec, config.orientation)
                    ? [{ value: "top", label: "Left" }, { value: "bottom", label: "Right" }]
                    : [{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }]}
                  onChange={(textPosition) => update({ textPosition })}
                />
              </div>
              <ColorField label="Text colour" value={config.fontColor} onChange={(fontColor) => update({ fontColor })} />
            </Section>

            <Section title="Background">
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => update({ bgColor: t.bgColor, bgColor2: t.bgColor2, fontColor: t.fontColor })}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border hover:scale-105 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${t.bgColor}, ${t.bgColor2})`, color: t.fontColor }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <ColorField
                  label={solid ? "Colour" : "Gradient start"}
                  value={config.bgColor}
                  onChange={(bgColor) => update(solid ? { bgColor, bgColor2: bgColor } : { bgColor })}
                />
                {!solid && <ColorField label="Gradient end" value={config.bgColor2} onChange={(bgColor2) => update({ bgColor2 })} />}
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={!solid}
                  onCheckedChange={(v) => update({ bgColor2: v ? shade(config.bgColor) : config.bgColor })}
                />
                Gradient
              </label>
              {!solid && (
                <Slider label="Gradient angle" value={config.gradientAngle} min={0} max={360} step={5} format={(v) => `${v}°`} onChange={(gradientAngle) => update({ gradientAngle })} />
              )}
              <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                <Checkbox
                  checked={Boolean(config.glowColor)}
                  onCheckedChange={(v) => update({ glowColor: v ? "#8b5cf6" : "" })}
                />
                Glow (a soft pool of light)
              </label>
              {config.glowColor && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <ColorField label="Glow colour" value={config.glowColor} onChange={(glowColor) => update({ glowColor })} />
                    <Segmented
                      label="Behind"
                      value={config.glowAt}
                      options={[{ value: "text", label: "Caption" }, { value: "device", label: "Device" }]}
                      onChange={(glowAt) => update({ glowAt })}
                    />
                  </div>
                  <Slider label="Glow strength" value={config.glowStrength} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(glowStrength) => update({ glowStrength })} />
                </>
              )}
            </Section>

            <Section title="Device">
              <Segmented
                label="Style"
                value={config.deviceStyle}
                options={[
                  { value: "frame", label: "Device frame" },
                  { value: "flat", label: "Floating card" },
                  { value: "fullbleed", label: "Full-bleed" },
                ]}
                onChange={(deviceStyle) => update({ deviceStyle })}
              />
              {spec.allowLandscape && (
                <Segmented
                  label="Canvas orientation"
                  value={config.orientation ?? spec.defaultOrientation}
                  options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]}
                  onChange={(orientation) => update({ orientation })}
                />
              )}
              {config.deviceStyle !== "fullbleed" && (
                <Segmented
                  label="Fit"
                  value={config.deviceFit}
                  options={[
                    { value: "contain", label: "Whole device" },
                    { value: "fill", label: "Fill & run off edge" },
                  ]}
                  onChange={(deviceFit) => update(deviceFit === "fill" ? { deviceFit, deviceScale: 86 } : { deviceFit, deviceScale: 100 })}
                />
              )}
              {config.deviceStyle !== "fullbleed" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Slider
                    label="Size"
                    value={config.deviceScale}
                    min={60}
                    max={130}
                    format={(v) => (config.deviceFit === "fill" ? `${v}% of width` : v > 100 ? `${v}% (bleeds off edge)` : `${v}%`)}
                    onChange={(deviceScale) => update({ deviceScale })}
                    onReset={config.deviceScale !== 100 ? () => update({ deviceScale: 100 }) : undefined}
                  />
                  <Slider
                    label="Tilt"
                    value={config.tilt}
                    min={-20}
                    max={20}
                    format={(v) => `${v > 0 ? "+" : ""}${v}°`}
                    onChange={(tilt) => update({ tilt })}
                    onReset={config.tilt !== 0 ? () => update({ tilt: 0 }) : undefined}
                  />
                </div>
              )}
            </Section>

            <Section
              title="Stickers & images"
              description="Drag stickers on the preview to position them."
              action={config.overlays.length > 0 && (
                <button type="button" onClick={copyOverlaysToAll} className="text-[11px] text-primary font-medium underline underline-offset-2 whitespace-nowrap">
                  Copy to all
                </button>
              )}
            >
              <div className="flex flex-wrap gap-2">
                {BUILTIN_OVERLAYS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    title={`Add ${b.label}`}
                    onClick={() => addOverlay({ id: newOverlayId(), kind: "builtin", src: b.src })}
                    className="w-11 h-11 rounded-xl border-2 hover:border-primary/50 flex items-center justify-center p-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.src} alt={b.label} className="max-w-full max-h-full" />
                  </button>
                ))}
                <input ref={overlayUploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleOverlayUpload} />
                <button
                  type="button"
                  title="Upload your own image (logo, badge…)"
                  onClick={() => overlayUploadRef.current?.click()}
                  className="w-11 h-11 rounded-xl border-2 border-dashed hover:border-primary/50 text-muted-foreground text-xl"
                >
                  +
                </button>
              </div>

              {selectedOverlay && (
                <div className="space-y-3 pt-3 border-t">
                  <Slider label="Size" value={Math.round(selectedOverlay.scale * 100)} min={10} max={300} step={5} format={(v) => `${v}%`} onChange={(v) => updateOverlay(selectedOverlay.id, { scale: v / 100 })} />
                  <Slider label="Rotation" value={selectedOverlay.rotation} min={-180} max={180} format={(v) => `${v}°`} onChange={(rotation) => updateOverlay(selectedOverlay.id, { rotation })} />
                  <Slider label="Opacity" value={Math.round(selectedOverlay.opacity * 100)} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => updateOverlay(selectedOverlay.id, { opacity: v / 100 })} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => updateOverlay(selectedOverlay.id, { zIndex: Math.min(0, ...config.overlays.map((o) => o.zIndex)) - 1 })}>
                      Send back
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => updateOverlay(selectedOverlay.id, { zIndex: Math.max(0, ...config.overlays.map((o) => o.zIndex)) + 1 })}>
                      Bring front
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => removeOverlay(selectedOverlay.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Section>

            <div className="flex justify-between pt-2 pb-10">
              <Button variant="outline" size="lg" onClick={() => router.push("/upload")}>← Back to upload</Button>
              <Button size="lg" className="px-8" disabled={totalFiles === 0} onClick={() => router.push("/export")}>
                Review &amp; export {totalFiles} →
              </Button>
            </div>
          </div>

          {/* ── Preview ──────────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-20 space-y-3 order-1 lg:order-2">
            <div className="flex flex-wrap gap-1.5">
              {devices.map((d) => {
                const count = shots?.[d.id]?.length ?? 0;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setDeviceId(d.id); setIdx(0); setSelectedOverlayId(null); }}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      deviceId === d.id ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/40 text-muted-foreground"
                    }`}
                  >
                    {d.label} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border bg-muted/30 p-4 flex justify-center">
              <DesignCanvas
                deviceId={deviceId}
                config={config}
                file={file}
                className="max-h-[68vh] w-auto max-w-full rounded-lg shadow-lg cursor-default"
                selectedOverlayId={selectedOverlayId}
                onSelectOverlay={setSelectedOverlayId}
                onOverlayMove={(id, x, y) => updateOverlay(id, { x, y })}
              />
            </div>

            {ownShots && isBorrowed(ownShots, deviceId) && (
              <p className="text-[11px] text-center text-muted-foreground">
                Using your first phone screenshot. Add one for {spec.label} on the Upload page to use a different image.
              </p>
            )}
            {files.length > 0 ? (
              <div className="flex gap-1.5 flex-wrap justify-center">
                {files.map((f, i) => (
                  <button
                    key={`${f.name}-${i}`}
                    type="button"
                    aria-label={`Edit screenshot ${i + 1}`}
                    onClick={() => { setIdx(i); setSelectedOverlayId(null); }}
                    className={`rounded-md border-2 overflow-hidden transition ${safeIdx === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <FileThumb file={f} className="h-14 w-auto" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">
                {shots ? `No screenshots for ${spec.label} yet. Go back to upload some.` : "Loading screenshots…"}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                Exports at {(() => {
                  const { width, height } = outputSize(spec, config.orientation ?? spec.defaultOrientation);
                  return `${width}×${height}`;
                })()}
              </p>
              <Button variant="outline" size="sm" onClick={applyStyleToAll} disabled={totalFiles < 2}>
                Apply this style to all
              </Button>
            </div>

            {notice && <p role="status" className="text-xs text-center text-primary">{notice}</p>}
            {error && (
              <p role="alert" className="text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/** A darker/lighter companion colour for one-click gradients. */
function shade(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#000000";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const light = (r * 299 + g * 587 + b * 114) / 1000 > 128;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(light ? c * 0.8 : c + (255 - c) * 0.25)));
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
