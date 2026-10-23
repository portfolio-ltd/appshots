"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { DesignCanvas } from "@/components/DesignCanvas";
import { MissingDraft } from "@/components/MissingDraft";
import { useHydrated } from "@/hooks/useHydrated";
import { useShots } from "@/hooks/useShots";
import { DEVICE_SPECS, outputSize, type AppInfo } from "@/lib/constants";
import { buildZip, downloadBlob, renderFullSize, slugify, type ExportItem } from "@/lib/export";
import { loadAppInfo, loadDesigns, resolveDesign } from "@/lib/persist";

export default function ExportPage() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const info = loadAppInfo();
  return info ? <Exporter appInfo={info} /> : <MissingDraft />;
}

function Exporter({ appInfo }: { appInfo: AppInfo }) {
  const { shots } = useShots(appInfo.deviceIds);
  const [designs] = useState(() => loadDesigns());
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const devices = DEVICE_SPECS.filter((d) => appInfo.deviceIds.includes(d.id));
  const checks = devices.map((d) => {
    const count = shots?.[d.id]?.length ?? 0;
    const ok = count >= d.minCount && count <= d.maxCount;
    return { spec: d, count, ok, empty: count === 0 };
  });
  const items: ExportItem[] = devices.flatMap((d) =>
    (shots?.[d.id] ?? []).map((file, index) => ({ deviceId: d.id, index, file, config: resolveDesign(designs, d.id, index) })),
  );
  const blocking = checks.filter((c) => !c.ok && !c.empty);
  const missingText = items.filter((i) => !i.config.headline.trim() && i.config.deviceStyle !== "fullbleed").length;

  async function exportAll() {
    setError(null);
    setDone(false);
    setProgress(0);
    try {
      const rendered = [];
      for (let i = 0; i < items.length; i++) {
        rendered.push(await renderFullSize(items[i]));
        setProgress(Math.round(((i + 1) / (items.length + 1)) * 100));
      }
      const zip = await buildZip(rendered);
      setProgress(100);
      downloadBlob(zip, `${slugify(appInfo.name)}-screenshots.zip`);
      setDone(true);
    } catch (e) {
      setError(`Export failed: ${(e as Error).message}`);
    } finally {
      setProgress(null);
    }
  }

  async function exportOne(item: ExportItem) {
    try {
      const shot = await renderFullSize(item);
      downloadBlob(shot.blob, shot.path.replaceAll("/", "_"));
    } catch (e) {
      setError(`Export failed: ${(e as Error).message}`);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <StepIndicator currentStep={4} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{appInfo.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {items.length} screenshot{items.length !== 1 ? "s" : ""}, rendered at exact store sizes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="lg"><Link href="/customise">← Edit designs</Link></Button>
            <Button size="lg" className="px-8" disabled={progress !== null || items.length === 0} onClick={exportAll}>
              {progress !== null ? "Rendering…" : "Download ZIP"}
            </Button>
          </div>
        </div>

        {progress !== null && <Progress value={progress} className="h-2" aria-label="Export progress" />}
        {error && <p role="alert" className="text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-xl px-4 py-3">{error}</p>}
        {done && (
          <p role="status" className="text-sm bg-green-50 text-green-800 border border-green-200 rounded-xl px-4 py-3">
            Download started. Each store folder in the ZIP is ready to drag into App Store Connect or the Play Console.
          </p>
        )}

        <section className="bg-card rounded-2xl border p-5 space-y-2" aria-label="Store requirements">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Store checklist</h2>
          {checks.map((c) => (
            <div key={c.spec.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${c.ok ? "bg-green-50 text-green-900" : c.empty ? "bg-muted/50" : "bg-amber-50 text-amber-900"}`}>
              <span className="font-medium">
                {c.ok ? "✓" : c.empty ? "–" : "!"} {c.spec.store === "app-store" ? "App Store" : "Google Play"} · {c.spec.label}
              </span>
              <span className="text-xs">
                {c.count} of {c.spec.minCount > 0 ? `${c.spec.minCount}–${c.spec.maxCount}` : `up to ${c.spec.maxCount}`}
                {c.empty && " · skipped"}
              </span>
            </div>
          ))}
          {blocking.length > 0 && (
            <p className="text-xs text-amber-800 pt-1">
              Some devices are below the store minimum. You can still export, but the store will ask for more before you can submit.
            </p>
          )}
          {missingText > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              {missingText} screenshot{missingText !== 1 ? "s have" : " has"} no headline. Captions noticeably improve conversion.
            </p>
          )}
        </section>

        {devices.map((d) => {
          const deviceItems = items.filter((i) => i.deviceId === d.id);
          if (deviceItems.length === 0) return null;
          return (
            <section key={d.id} className="space-y-3">
              <h2 className="text-base font-semibold">
                {d.label}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {d.store}/{d.slug}/ ·{" "}
                  {(() => { const s = outputSize(d, deviceItems[0].config.orientation ?? d.defaultOrientation); return `${s.width}×${s.height}`; })()}
                </span>
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {deviceItems.map((item) => (
                  <figure key={item.index} className="flex-shrink-0 space-y-1.5">
                    <Link href={`/customise?device=${encodeURIComponent(d.id)}&i=${item.index}`} title="Edit this screenshot">
                      <DesignCanvas
                        deviceId={d.id}
                        config={item.config}
                        file={item.file}
                        renderHeight={420}
                        className={`${(item.config.orientation ?? d.defaultOrientation) === "landscape" && d.allowLandscape ? "h-40" : "h-72"} w-auto rounded-lg border shadow-sm hover:ring-2 hover:ring-primary/50 transition`}
                      />
                    </Link>
                    <figcaption className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>#{item.index + 1}</span>
                      <button type="button" className="underline hover:text-foreground" onClick={() => exportOne(item)}>
                        Download
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          );
        })}

        {shots && items.length === 0 && (
          <div className="text-center space-y-3 py-10">
            <p className="text-muted-foreground">No screenshots uploaded yet.</p>
            <Button asChild><Link href="/upload">Upload screenshots</Link></Button>
          </div>
        )}
      </div>
    </main>
  );
}
