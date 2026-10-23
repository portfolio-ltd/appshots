"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EducationModal } from "@/components/EducationModal";
import { StepIndicator } from "@/components/StepIndicator";
import {
  IOS_CATEGORIES,
  ANDROID_CATEGORIES,
  PLAY_DEVICES,
  IOS_DEVICES,
  type Store,
  type AppInfo,
} from "@/lib/constants";
import { saveAppInfo, loadAppInfo, clearDraft } from "@/lib/persist";

const DEFAULT_FORM: AppInfo = {
  name: "",
  subtitle: "",
  descriptionShort: "",
  descriptionFull: "",
  categoryPrimary: "",
  categorySecondary: "",
  stores: [],
  deviceIds: [],
};

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span
      className={`text-xs ${over ? "text-destructive font-semibold" : "text-muted-foreground"}`}
    >
      {value}/{max}
    </span>
  );
}

export default function OnboardingPage() {
  // Draft lives in localStorage, so render only after hydration.
  return useHydrated() ? <OnboardingForm /> : null;
}

function OnboardingForm() {
  const router = useRouter();
  const [form, setForm] = useState<AppInfo>(() => loadAppInfo() ?? DEFAULT_FORM);
  const [showModal, setShowModal] = useState(false);
  const [restored, setRestored] = useState(() => Boolean(loadAppInfo()?.name));

  // Auto-save on every change
  useEffect(() => {
    if (form.name || form.stores.length || form.deviceIds.length) {
      saveAppInfo(form);
    }
  }, [form]);

  function set<K extends keyof AppInfo>(key: K, value: AppInfo[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleStore(store: Store) {
    setForm((prev) => {
      const has = prev.stores.includes(store);
      const stores = has
        ? prev.stores.filter((s) => s !== store)
        : [...prev.stores, store];
      const validIds = [
        ...(stores.includes("play-store") ? PLAY_DEVICES : []),
        ...(stores.includes("app-store") ? IOS_DEVICES : []),
      ].map((d) => d.id);
      return { ...prev, stores, deviceIds: prev.deviceIds.filter((id) => validIds.includes(id)) };
    });
  }

  function toggleDevice(id: string) {
    setForm((prev) => {
      const has = prev.deviceIds.includes(id);
      return { ...prev, deviceIds: has ? prev.deviceIds.filter((d) => d !== id) : [...prev.deviceIds, id] };
    });
  }

  function toggleAllForStore(store: Store, select: boolean) {
    const ids = (store === "play-store" ? PLAY_DEVICES : IOS_DEVICES).map((d) => d.id);
    setForm((prev) => {
      const without = prev.deviceIds.filter((id) => !ids.includes(id));
      return { ...prev, deviceIds: select ? [...without, ...ids] : without };
    });
  }

  const canContinue =
    form.name.trim() !== "" &&
    form.name.length <= 30 &&
    form.stores.length > 0 &&
    form.deviceIds.length > 0;

  function handleContinue() {
    if (!canContinue) return;
    saveAppInfo(form);
    setShowModal(true);
  }

  async function handleStartFresh() {
    await clearDraft();
    setForm(DEFAULT_FORM);
    setRestored(false);
  }

  function handleModalClose() {
    setShowModal(false);
    router.push("/upload");
  }

  const categories = form.stores.includes("play-store") ? ANDROID_CATEGORIES : IOS_CATEGORIES;

  return (
    <main className="min-h-screen bg-background">
      <StepIndicator currentStep={1} />

      {/* Draft restored banner */}
      {restored && (
        <div className="bg-primary/5 border-b border-primary/10">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-primary/90">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Draft restored — your previous progress has been loaded.
            </div>
            <button
              type="button"
              onClick={handleStartFresh}
              className="text-xs text-primary hover:text-primary/90 underline underline-offset-2 flex-shrink-0"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-primary via-chart-2 to-chart-2/90 text-white px-4 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-3 py-1 text-xs font-semibold mb-4 tracking-wide uppercase">
            ✦ Store-ready screenshots
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            AppShots
          </h1>
          <p className="text-white/80 text-base">
            Generate compliant screenshots for Google Play and App Store in minutes.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* App Info card */}
        <section className="bg-card rounded-2xl border shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary/90 flex items-center justify-center text-xs font-bold">1</span>
            App information
          </h2>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="name">App name <span className="text-destructive">*</span></Label>
              <Counter value={form.name.length} max={30} />
            </div>
            <Input
              id="name"
              placeholder="My Awesome App"
              value={form.name}
              maxLength={50}
              onChange={(e) => set("name", e.target.value)}
              className="bg-muted/40"
            />
            {form.name.length > 30 && (
              <p className="text-xs text-destructive">Play Store requires ≤ 30 characters</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="subtitle">Subtitle <span className="text-xs text-muted-foreground">(App Store only)</span></Label>
              <Counter value={form.subtitle.length} max={30} />
            </div>
            <Input
              id="subtitle"
              placeholder="Your tagline"
              value={form.subtitle}
              maxLength={50}
              onChange={(e) => set("subtitle", e.target.value)}
              className="bg-muted/40"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="short-desc">Short description</Label>
              <Counter value={form.descriptionShort.length} max={80} />
            </div>
            <Textarea
              id="short-desc"
              placeholder="One-line pitch (Play Store)"
              rows={2}
              value={form.descriptionShort}
              maxLength={120}
              onChange={(e) => set("descriptionShort", e.target.value)}
              className="bg-muted/40"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="full-desc">Full description</Label>
              <Counter value={form.descriptionFull.length} max={4000} />
            </div>
            <Textarea
              id="full-desc"
              placeholder="Detailed description for both stores"
              rows={5}
              value={form.descriptionFull}
              maxLength={4200}
              onChange={(e) => set("descriptionFull", e.target.value)}
              className="bg-muted/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Primary category</Label>
              <Select value={form.categoryPrimary} onValueChange={(v) => set("categoryPrimary", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Secondary category</Label>
              <Select value={form.categorySecondary} onValueChange={(v) => set("categorySecondary", v)}>
                <SelectTrigger className="bg-muted/40"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Store selection card */}
        <section className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary/90 flex items-center justify-center text-xs font-bold">2</span>
            Where are you publishing? <span className="text-destructive text-sm">*</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(["play-store", "app-store"] as Store[]).map((store) => {
              const checked = form.stores.includes(store);
              return (
                <label
                  key={store}
                  className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                    checked
                      ? "border-primary bg-primary/5 text-primary/90"
                      : "border-border hover:border-primary/20 hover:bg-primary/30"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleStore(store)}
                    className={checked ? "border-primary" : ""}
                  />
                  <div>
                    <p className="text-sm font-semibold">{store === "play-store" ? "Google Play" : "App Store"}</p>
                    <p className="text-xs text-muted-foreground">{store === "play-store" ? "Android" : "iOS / iPadOS"}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Device selection card */}
        {form.stores.length > 0 && (
          <section className="bg-card rounded-2xl border shadow-sm p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary/90 flex items-center justify-center text-xs font-bold">3</span>
              Which devices? <span className="text-destructive text-sm">*</span>
            </h2>

            {form.stores.includes("play-store") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Android</p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-primary/90 font-medium underline underline-offset-2"
                    onClick={() =>
                      toggleAllForStore("play-store", !PLAY_DEVICES.every((d) => form.deviceIds.includes(d.id)))
                    }
                  >
                    {PLAY_DEVICES.every((d) => form.deviceIds.includes(d.id)) ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PLAY_DEVICES.map((dev) => {
                    const checked = form.deviceIds.includes(dev.id);
                    return (
                      <label
                        key={dev.id}
                        className={`flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border transition-all ${
                          checked ? "border-primary/60 bg-primary/60" : "border-border hover:border-primary/20"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleDevice(dev.id)} className="mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">{dev.label}</span>
                          {dev.minCount > 0 && <Badge variant="outline" className="ml-2 text-[10px]">min {dev.minCount}</Badge>}
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{dev.acceptedDimensions}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {form.stores.includes("app-store") && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">iOS / iPadOS / watchOS</p>
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-primary/90 font-medium underline underline-offset-2"
                    onClick={() =>
                      toggleAllForStore("app-store", !IOS_DEVICES.every((d) => form.deviceIds.includes(d.id)))
                    }
                  >
                    {IOS_DEVICES.every((d) => form.deviceIds.includes(d.id)) ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {IOS_DEVICES.map((dev) => {
                    const checked = form.deviceIds.includes(dev.id);
                    return (
                      <label
                        key={dev.id}
                        className={`flex items-start gap-2.5 cursor-pointer p-3 rounded-xl border transition-all ${
                          checked ? "border-primary/60 bg-primary/60" : "border-border hover:border-primary/20"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleDevice(dev.id)} className="mt-0.5" />
                        <div>
                          <span className="text-sm font-medium">{dev.label}</span>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{dev.acceptedDimensions}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end pb-10">
          <Button
            size="lg"
            disabled={!canContinue}
            onClick={handleContinue}
            className="gap-2 bg-gradient-to-r from-primary to-chart-2 hover:from-primary/90 hover:to-chart-2/90 shadow-lg shadow-primary/20 px-8"
          >
            Continue to upload
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>

      <EducationModal open={showModal} onClose={handleModalClose} stores={form.stores} />
    </main>
  );
}
