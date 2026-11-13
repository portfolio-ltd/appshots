import { expect, it } from "vitest";
import { isBorrowed, withFallbacks } from "../lib/shots";

it("lends the first phone screenshot to the feature graphic", () => {
  const shots = { "play-phone": ["p1", "p2"], "ios-iphone-6.9": ["i1"] };
  const out = withFallbacks(shots, ["play-phone", "play-feature-graphic"]);
  expect(out["play-feature-graphic"]).toEqual(["p1"]);
  expect(isBorrowed(shots, "play-feature-graphic")).toBe(true);
});

it("falls back to an iPhone screenshot when there is no Play phone", () => {
  expect(withFallbacks({ "ios-iphone-6.9": ["i1"] }, ["play-feature-graphic"])["play-feature-graphic"]).toEqual(["i1"]);
});

it("keeps the feature graphic's own upload", () => {
  const shots = { "play-phone": ["p1"], "play-feature-graphic": ["own"] };
  expect(withFallbacks(shots, ["play-feature-graphic"])["play-feature-graphic"]).toEqual(["own"]);
  expect(isBorrowed(shots, "play-feature-graphic")).toBe(false);
});

it("leaves devices without fallbacks alone", () => {
  expect(withFallbacks({}, ["play-phone"])["play-phone"]).toBeUndefined();
});
