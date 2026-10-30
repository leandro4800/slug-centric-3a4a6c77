import { describe, expect, it } from "vitest";
import { ATHLETE_PANEL_URL, formatVipAccess } from "@/lib/athlete-access";
import { ATHLETE_PANEL_URL as emailPanelUrl } from "../../supabase/functions/_shared/athlete-panel-link";

describe("athlete access delivery", () => {
  it("uses the same account-resolved production URL for VIPs and credential emails", () => {
    expect(ATHLETE_PANEL_URL).toBe("https://alpha-coach.app/atleta");
    expect(emailPanelUrl).toBe(ATHLETE_PANEL_URL);
  });
  it("includes the panel without dropping the existing VIP app access or credentials", () => {
    const result = formatVipAccess("atleta@example.test", "example-only");
    expect(result).toContain("Login: atleta@example.test");
    expect(result).toContain("Senha: example-only");
    expect(result).toContain("Link do app: https://alpha-coach.app/alphateam");
    expect(result).toContain("Painel do atleta: https://alpha-coach.app/atleta");
  });
});