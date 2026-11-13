import { describe, expect, it } from "vitest";
import { SAMPLE_CONFIG, planJobs, validateConfig, type AppShotsConfig } from "../cli/src/config";

const config: AppShotsConfig = {
  template: "night-glow",
  style: { fontId: "serif" },
  devices: {
    "ios-iphone-6.9": "raw/phone-{key}.png",
    "play-feature-graphic": { files: "raw/phone-{key}.png", headline: "MyApp" },
    "play-wear": "raw/wear-{key}.png",
  },
  shots: [
    { key: "home", headline: "One", subheading: "First" },
    { key: "stats", headline: "Two", style: { glowColor: "#ff0000" } },
  ],
};

describe("validateConfig", () => {
  it("accepts the sample config", () => {
    expect(validateConfig(SAMPLE_CONFIG)).toEqual([]);
    expect(validateConfig(config)).toEqual([]);
  });

  it("explains each problem", () => {
    const errors = validateConfig({ template: "nope", devices: { bad: "x" }, shots: [{ key: "a", style: { colour: 1 } }, { key: "a" }] });
    expect(errors.join("\n")).toMatch(/Unknown template "nope"/);
    expect(errors.join("\n")).toMatch(/Unknown device "bad"/);
    expect(errors.join("\n")).toMatch(/Unknown style option "colour"/);
    expect(errors.join("\n")).toMatch(/repeats the key "a"/);
  });

  it("requires devices and shots", () => {
    expect(validateConfig({})).toHaveLength(2);
    expect(validateConfig(null)).toHaveLength(1);
  });
});

describe("planJobs", () => {
  const jobs = planJobs(config);

  it("renders every shot per device and fills the file pattern", () => {
    const phone = jobs.filter((j) => j.spec.id === "ios-iphone-6.9");
    expect(phone.map((j) => j.file)).toEqual(["raw/phone-home.png", "raw/phone-stats.png"]);
  });

  it("layers template variant, global style and shot style", () => {
    const [first, second] = jobs.filter((j) => j.spec.id === "ios-iphone-6.9");
    expect(first.design.fontId).toBe("serif");
    expect(first.design.deviceFit).toBe("fill");
    expect(first.design.glowColor).not.toBe(second.design.glowColor);
    expect(second.design.glowColor).toBe("#ff0000");
    expect(first.design.headline).toBe("One");
  });

  it("gives single-image devices the first shot and their own caption", () => {
    const fg = jobs.filter((j) => j.spec.id === "play-feature-graphic");
    expect(fg).toHaveLength(1);
    expect(fg[0].design.headline).toBe("MyApp");
    expect(fg[0].design.subheading).toBe("First");
    expect(fg[0].design.deviceFit).toBe("fill");
  });

  it("keeps UI-only devices bare", () => {
    const wear = jobs.filter((j) => j.spec.id === "play-wear");
    expect(wear[0].design.deviceStyle).toBe("fullbleed");
    expect(wear[0].design.headline).toBe("");
  });

  it("filters by device", () => {
    expect(planJobs(config, ["play-wear"]).every((j) => j.spec.id === "play-wear")).toBe(true);
  });
});
