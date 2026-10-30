import { describe, expect, it } from "vitest";
import { isAthletePanelPath, toAthletePanelDestination } from "@/lib/athlete-panel";
import { resolveBrandingSlug } from "@/lib/tenant-slug";

describe("athlete web panel", () => {
  it("uses the authenticated account destination, not another coach's slug", () => {
    expect(toAthletePanelDestination("/jackson/app")).toBe("/jackson/atleta");
    expect(toAthletePanelDestination("/jussara/app")).toBe("/jussara/atleta");
  });
  it("preserves incomplete registration destinations", () => {
    expect(toAthletePanelDestination("/jackson/onboarding")).toBe("/jackson/onboarding");
  });
  it("does not rewrite unrelated or external destinations", () => {
    expect(toAthletePanelDestination("https://example.com/jackson/app")).toBe("https://example.com/jackson/app");
    expect(toAthletePanelDestination("/jackson/application")).toBe("/jackson/application");
  });
  it("reserves /atleta instead of loading a coach named atleta", () => {
    expect(resolveBrandingSlug("/atleta")).toBeNull();
    expect(resolveBrandingSlug("/atleta/evolucao")).toBeNull();
    expect(resolveBrandingSlug("/jackson/atleta/evolucao")).toBe("jackson");
  });
  it("keeps app navigation distinct from panel navigation", () => {
    expect(isAthletePanelPath("/jackson/atleta/evolucao")).toBe(true);
    expect(isAthletePanelPath("/atleta")).toBe(true);
    expect(isAthletePanelPath("/jackson/app")).toBe(false);
  });
});