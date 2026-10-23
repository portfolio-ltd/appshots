import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, DEVICE_SPECS, outputSize, type DesignConfig } from "../lib/constants";
import { frameGeometry, rotatedBounds } from "../lib/render/geometry";
import { balanceLines, fitText, layoutDesign, wrapText, type MeasureFn } from "../lib/render/layout";
import { hitTestOverlay, withAlpha } from "../lib/render/draw";

/** Monospace stand-in for canvas measureText: every glyph is 0.5em wide. */
const measure: MeasureFn = (text, size) => Array.from(text).length * size * 0.5;
const at = (size: number) => (s: string) => measure(s, size, 400);

function layout(overrides: Partial<DesignConfig>, width = 1320, height = 2868, screenAspect = 1320 / 2868) {
  return layoutDesign({
    width, height, frame: "iphone", screenAspect,
    config: { ...DEFAULT_DESIGN, ...overrides },
    headlineWeight: 800, subWeight: 500, measure,
  });
}

describe("wrapText", () => {
  it("wraps on spaces without exceeding the width", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog", 100, at(20));
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(at(20)(l)).toBeLessThanOrEqual(100);
    expect(lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
  });

  it("hard-breaks words longer than a line", () => {
    const lines = wrapText("supercalifragilisticexpialidocious", 100, at(20));
    for (const l of lines) expect(at(20)(l)).toBeLessThanOrEqual(100);
    expect(lines.join("")).toBe("supercalifragilisticexpialidocious");
  });

  it("keeps emoji intact when hard-breaking", () => {
    const lines = wrapText("🚀🚀🚀🚀🚀🚀", 30, at(20));
    expect(lines.join("")).toBe("🚀🚀🚀🚀🚀🚀");
    expect(lines.every((l) => !l.includes("�"))).toBe(true);
  });

  it("respects explicit newlines", () => {
    expect(wrapText("one\ntwo", 1000, at(20))).toEqual(["one", "two"]);
  });
});

describe("balanceLines", () => {
  it("avoids an orphaned last word", () => {
    const text = "The calm to-do list that plans your week for you";
    const greedy = wrapText(text, 470, at(20));
    const balanced = balanceLines(text, greedy.length, 470, at(20));
    expect(balanced.length).toBe(greedy.length);
    const shortest = (ls: string[]) => Math.min(...ls.map((l) => l.length));
    expect(shortest(balanced)).toBeGreaterThan(shortest(greedy));
  });
});

describe("fitText", () => {
  it("shrinks long headlines to the line limit", () => {
    const long = "A long headline that needs a smaller size to fit";
    const block = fitText(long, 120, 600, 3, 1.1, 800, measure)!;
    expect(block.lines.length).toBeLessThanOrEqual(3);
    expect(block.size).toBeLessThan(120);
  });

  it("shrinks rather than splitting a word that is wider than the column", () => {
    // "Everything" is 10 glyphs → 600px at 120px; the column is 500px.
    const block = fitText("Everything in one place", 120, 500, 3, 1.1, 800, measure)!;
    expect(block.lines).toContain("Everything");
    expect(block.size).toBeLessThan(120);
  });

  it("never shrinks below the legibility floor", () => {
    const essay = "This caption is far too long for any screenshot and keeps going well past what fits on three lines";
    const block = fitText(essay, 120, 600, 3, 1.1, 800, measure)!;
    expect(block.size).toBeGreaterThanOrEqual(120 * 0.45);
    expect(block.lines.length).toBeGreaterThan(3);
  });

  it("returns null for empty text", () => {
    expect(fitText("   ", 120, 600, 3, 1.1, 800, measure)).toBeNull();
  });
});

describe("layoutDesign", () => {
  it("keeps the device inside the canvas at 100% scale for every frame and tilt", () => {
    for (const spec of DEVICE_SPECS) {
      for (const orientation of ["portrait", "landscape"] as const) {
        for (const tilt of [0, -20, 20]) {
          const { width, height } = outputSize(spec, orientation);
          const l = layoutDesign({
            width, height, frame: spec.frame, screenAspect: 9 / 19.5,
            config: { ...DEFAULT_DESIGN, headline: "Plan your week", subheading: "Simple and fast", tilt, orientation },
            headlineWeight: 800, subWeight: 500, measure,
          });
          const d = l.device!;
          const box = rotatedBounds(d.sideways ? d.geometry.box.h : d.geometry.box.w, d.sideways ? d.geometry.box.w : d.geometry.box.h, tilt);
          expect(d.cx - box.w / 2, `${spec.id} ${orientation} ${tilt}`).toBeGreaterThanOrEqual(-0.5);
          expect(d.cx + box.w / 2).toBeLessThanOrEqual(width + 0.5);
          expect(d.cy - box.h / 2).toBeGreaterThanOrEqual(-0.5);
          expect(d.cy + box.h / 2).toBeLessThanOrEqual(height + 0.5);
        }
      }
    }
  });

  it("places the device below a top headline without overlap", () => {
    const l = layout({ headline: "Track every workout", subheading: "Streaks and stats" });
    const textBottom = l.text!.box.y + l.text!.box.h;
    expect(l.device!.cy - l.device!.geometry.box.h / 2).toBeGreaterThan(textBottom);
  });

  it("bleeds an over-scaled device off the edge opposite the text", () => {
    const l = layout({ headline: "Hello", deviceScale: 125 });
    expect(l.device!.cy + l.device!.geometry.box.h / 2).toBeGreaterThan(l.height);
  });

  it("turns phones sideways for landscape screenshots", () => {
    expect(layout({}, 1320, 2868, 2868 / 1320).device!.sideways).toBe(true);
    expect(layout({}).device!.sideways).toBe(false);
  });

  it("scales type with the canvas", () => {
    const small = layout({ headline: "Hi" }, 660, 1434);
    const big = layout({ headline: "Hi" }, 1320, 2868);
    expect(big.text!.headline!.size / small.text!.headline!.size).toBeCloseTo(2, 5);
  });

  it("has no device in full-bleed mode", () => {
    expect(layout({ deviceStyle: "fullbleed", headline: "Hi" }).device).toBeNull();
  });
});

describe("frameGeometry", () => {
  it("wraps the screen in the body", () => {
    for (const kind of ["iphone", "ipad", "watch", "android-phone", "android-tablet", "laptop", "none"] as const) {
      const g = frameGeometry(kind, 300, 600);
      expect(g.screen.w).toBe(300);
      expect(g.screen.x).toBeGreaterThanOrEqual(g.body.x);
      expect(g.screen.x + g.screen.w).toBeLessThanOrEqual(g.body.x + g.body.w);
      expect(g.box.w).toBeGreaterThanOrEqual(g.body.w);
    }
  });
});

describe("store specs", () => {
  it("only exports sizes the stores accept", () => {
    for (const spec of DEVICE_SPECS) {
      const { width, height } = spec.output;
      if (spec.store === "play-store") {
        // Play: 16:9 or 9:16, sides within 320–7680.
        expect(Math.max(width, height) / Math.min(width, height)).toBeCloseTo(16 / 9, 2);
        expect(Math.min(width, height)).toBeGreaterThanOrEqual(320);
      } else {
        expect(spec.acceptedDimensions).toContain(`${width}×${height}`);
      }
    }
  });

  it("swaps dimensions for landscape where allowed", () => {
    const iphone = DEVICE_SPECS.find((d) => d.id === "ios-iphone-6.9")!;
    expect(outputSize(iphone, "landscape")).toEqual({ width: 2868, height: 1320 });
    const watch = DEVICE_SPECS.find((d) => d.id === "ios-watch")!;
    expect(outputSize(watch, "landscape")).toEqual({ width: 422, height: 514 });
  });
});

describe("helpers", () => {
  it("withAlpha converts hex", () => {
    expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    expect(withAlpha("#0f0", 1)).toBe("rgba(0, 255, 0, 1)");
    expect(withAlpha("nope", 0.2)).toBe("rgba(0, 0, 0, 0.2)");
  });

  it("hit-tests rotated overlays, topmost first", () => {
    const hits = [
      { id: "a", cx: 100, cy: 100, w: 100, h: 20, rotation: 0 },
      { id: "b", cx: 100, cy: 100, w: 100, h: 20, rotation: 90 },
    ];
    expect(hitTestOverlay(hits, 100, 140)).toBe("b");
    expect(hitTestOverlay(hits, 140, 100)).toBe("a");
    expect(hitTestOverlay(hits, 300, 300)).toBeNull();
  });
});
