import { describe, expect, it } from "vitest";
import { TEMPLATE_PRESETS, type AppInfo } from "../lib/constants";
import { localAutoDesign, TEMPLATE_IDS } from "../lib/autodesign";

const app: AppInfo = {
  name: "Taskly",
  subtitle: "Plan your week",
  descriptionShort: "The calm to-do list that plans your week for you.",
  descriptionFull: "",
  categoryPrimary: "Productivity",
  categorySecondary: "",
  stores: ["app-store"],
  deviceIds: ["ios-iphone-6.9"],
};

describe("localAutoDesign", () => {
  it("returns one caption per screenshot within length limits", () => {
    const r = localAutoDesign(app, 6);
    expect(r.shots).toHaveLength(6);
    for (const s of r.shots) {
      expect(s.headline.length).toBeLessThanOrEqual(40);
      expect(s.subheading.length).toBeLessThanOrEqual(70);
      expect(s.headline).not.toBe("");
    }
    expect(r.source).toBe("local");
  });

  it("leads with the developer's own description", () => {
    expect(localAutoDesign(app, 2).shots[0].subheading).toBe(app.descriptionShort);
  });

  it("picks a mood-appropriate template", () => {
    expect(["ocean-calm", "slate-editorial"]).toContain(localAutoDesign(app, 1).templateId);
  });

  it("varies with the seed", () => {
    expect(localAutoDesign(app, 3, 0).shots).not.toEqual(localAutoDesign(app, 3, 1).shots);
  });
});

it("template ids match the presets", () => {
  expect([...TEMPLATE_IDS].sort()).toEqual(TEMPLATE_PRESETS.map((t) => t.id).sort());
});
