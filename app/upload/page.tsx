"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/StepIndicator";
import { FileThumb } from "@/components/FileThumb";
import { MissingDraft } from "@/components/MissingDraft";
import { useHydrated } from "@/hooks/useHydrated";
import { useShots } from "@/hooks/useShots";
import { DEVICE_SPECS, type AppInfo, type DeviceSpec } from "@/lib/constants";
import { designKey, loadAppInfo, loadDesigns, saveDesigns } from "@/lib/persist";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_INPUT_MB = 30;

export default function UploadPage() {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const info = loadAppInfo();
  return info ? <UploadForm appInfo={info} /> : <MissingDraft />;
}

function UploadForm({ appInfo }: { appInfo: AppInfo }) {
  const router = useRouter();
  const { shots, setShots } = useShots(appInfo.deviceIds);
  const [error, setError] = useState<string | null>(null);

  const selectedSpecs = DEVICE_SPECS.filter((d) => appInfo.deviceIds.includes(d.id));
  const totalFiles = Object.values(shots ?? {}).reduce((n, f) => n + f.length, 0);

  function handleFiles(spec: DeviceSpec, fileList: FileList | null) {
    if (!fileList || !shots) return;
    const incoming = Array.from(fileList);
    const problems: string[] = [];
    const accepted = incoming.filter((f) => {
      if (!ACCEPTED.includes(f.type)) {
        problems.push(`${f.name}: only PNG, JPEG or WebP`);
        return false;
      }
      if (f.size > MAX_INPUT_MB * 1024 * 1024) {
        problems.push(`${f.name}: larger than ${MAX_INPUT_MB} MB`);
        return false;
      }
      return true;
    });
    const existing = shots[spec.id] ?? [];
    const room = spec.maxCount - existing.length;
    if (accepted.length > room) {
      problems.push(`${spec.label} takes at most ${spec.maxCount} screenshots — extra files were skipped`);
    }
    setError(problems.length ? problems.join(" · ") : null);
    if (room > 0) setShots(spec.id, [...existing, ...accepted.slice(0, room)]);
  }

  function removeFile(spec: DeviceSpec, index: number) {
    const files = shots?.[spec.id] ?? [];
    setShots(spec.id, files.filter((_, i) => i !== index));
    // Shift the per-screenshot designs so each one stays with its screenshot.
    const designs = loadDesigns();
    for (let i = index; i < files.length; i++) {
      const next = designs[designKey(spec.id, i + 1)];
      if (next) designs[designKey(spec.id, i)] = next;
      else delete designs[designKey(spec.id, i)];
    }
    saveDesigns(designs);
  }

  const groups = [
    { store: "play-store", title: "Google Play", dot: "bg-green-500" },
    { store: "app-store", title: "Apple App Store", dot: "bg-blue-500" },
  ] as const;

  return (
    <main className="min-h-screen bg-background">
      <StepIndicator currentStep={2} />

      <div className="bg-gradient-to-r from-primary to-chart-2 text-primary-foreground px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{appInfo.name}</h1>
            <p className="text-primary-foreground/80 text-sm mt-0.5">
              Add raw screenshots for each device, in the order they should appear.
            </p>
          </div>
          {totalFiles > 0 && (
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-2xl font-bold">{totalFiles}</p>
              <p className="text-xs text-primary-foreground/80">file{totalFiles !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div role="alert" className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {groups.map((g) => {
          const specs = selectedSpecs.filter((s) => s.store === g.store);
          if (specs.length === 0) return null;
          return (
            <section key={g.store} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${g.dot}`} />
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{g.title}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {specs.map((spec) => (
                  <DeviceCard
                    key={spec.id}
                    spec={spec}
                    files={shots?.[spec.id] ?? []}
                    loading={!shots}
                    onFiles={(fl) => handleFiles(spec, fl)}
                    onRemove={(i) => removeFile(spec, i)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <div className="flex justify-between pt-2 pb-10">
          <Button variant="outline" size="lg" onClick={() => router.push("/onboarding")}>
            ← Back
          </Button>
          <Button size="lg" disabled={totalFiles === 0} onClick={() => router.push("/customise")} className="px-8">
            Continue to design →
          </Button>
        </div>
      </div>
    </main>
  );
}

interface DeviceCardProps {
  spec: DeviceSpec;
  files: File[];
  loading: boolean;
  onFiles: (fl: FileList | null) => void;
  onRemove: (index: number) => void;
}

function DeviceCard({ spec, files, loading, onFiles, onRemove }: DeviceCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const countLabel = spec.minCount > 0
    ? `${files.length} / ${spec.minCount}–${spec.maxCount}`
    : `${files.length} / up to ${spec.maxCount}`;
  const countOk = files.length >= spec.minCount && files.length > 0;
  const full = files.length >= spec.maxCount;

  return (
    <div className={`bg-card rounded-2xl border-2 p-4 space-y-3 transition-colors ${countOk ? "border-primary/35" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{spec.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
            Exports at {spec.output.width}×{spec.output.height}
          </p>
        </div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 border ${
            countOk ? "bg-green-100 text-green-800 border-green-200" : "bg-muted text-muted-foreground border-border"
          }`}
        >
          {countLabel}
        </span>
      </div>

      {files.length > 0 && (
        <ol className="flex flex-wrap gap-1.5">
          {files.map((file, i) => (
            <li key={`${file.name}-${file.lastModified}-${i}`} className="relative group">
              <FileThumb file={file} alt={`${spec.label} screenshot ${i + 1}`} className="h-16 w-auto rounded-lg border object-cover" />
              <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold bg-black/60 text-white rounded px-1">{i + 1}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove screenshot ${i + 1}`}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        disabled={loading || full}
        className={`w-full border-2 border-dashed rounded-xl py-5 px-3 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          dragging ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-primary/5"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
      >
        <span className="block text-xs text-muted-foreground">
          {full ? "Maximum reached" : <>Drop files or <span className="text-primary font-semibold underline underline-offset-2">browse</span></>}
        </span>
        <span className="block text-[10px] text-muted-foreground mt-0.5">PNG, JPEG or WebP · any resolution</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="hidden"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
