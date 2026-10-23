"use client";

import Link from "next/link";
import { REPO_URL, SITE_NAME } from "@/lib/site";

const STEPS = [
  { label: "App info", href: "/onboarding" },
  { label: "Upload", href: "/upload" },
  { label: "Design", href: "/customise" },
  { label: "Export", href: "/export" },
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
      <div className="relative h-0.5 bg-border overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-chart-2 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-4 py-3">
        <Link href="/" className="text-sm font-extrabold text-primary tracking-tight hidden sm:block flex-shrink-0">
          {SITE_NAME}
        </Link>

        <ol className="flex items-center flex-1 justify-center">
          {STEPS.map((step, i) => {
            const num = i + 1;
            const completed = num < currentStep;
            const active = num === currentStep;
            const circle = (
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  completed
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {completed ? "✓" : num}
              </span>
            );
            return (
              <li key={step.label} className="flex items-center">
                {/* Completed steps are links so users can jump back. */}
                {completed ? (
                  <Link href={step.href} className="flex flex-col items-center gap-1" aria-label={`Back to ${step.label}`}>
                    {circle}
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 hidden sm:block">{step.label}</span>
                  </Link>
                ) : (
                  <span className="flex flex-col items-center gap-1" aria-current={active ? "step" : undefined}>
                    {circle}
                    <span className={`text-[10px] font-semibold uppercase tracking-wide hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </span>
                )}
                {i < STEPS.length - 1 && (
                  <span className={`mx-2 sm:mx-4 h-px w-6 sm:w-12 ${completed ? "bg-primary/50" : "bg-border"}`} />
                )}
              </li>
            );
          })}
        </ol>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex-shrink-0 hidden sm:block"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
