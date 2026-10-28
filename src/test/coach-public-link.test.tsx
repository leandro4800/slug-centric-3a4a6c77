import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyCoachPublicLink, getCoachPublicLink, getCoachWhatsAppUrl, sendCoachPublicLink } from "@/lib/coach-public-link";
import { LinkDivulgacaoContent } from "@/pages/coach/LinkDivulgacao";

const state = vi.hoisted(() => ({
  native: false,
  share: vi.fn(),
  tenant: { id: "jackson-id", slug: "jackson", nome: "Jackson" } as { id: string; slug: string; nome: string } | null,
  loading: false,
  error: null as string | null,
}));
vi.mock("@/lib/native-platform", () => ({ isNativeApp: () => state.native }));
vi.mock("@capacitor/share", () => ({ Share: { share: state.share } }));
vi.mock("@/hooks/use-site-tenant", () => ({
  useSiteTenant: () => ({ tenant: state.tenant, loading: state.loading, error: state.error, reload: vi.fn() }),
  SiteTenantProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  state.native = false;
  state.tenant = { id: "jackson-id", slug: "jackson", nome: "Jackson" };
  state.loading = false;
  state.error = null;
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("coach promotion link", () => {
  it("preserves the existing production acquisition URL for each tenant", () => {
    expect(getCoachPublicLink({ slug: "jackson" })).toBe("https://alpha-coach.app/jackson");
    expect(getCoachPublicLink({ slug: "jussara" })).toBe("https://alpha-coach.app/jussara");
    expect(getCoachPublicLink(null)).toBe("");
  });

  it("copies the exact same link through the panel clipboard helper", async () => {
    await copyCoachPublicLink("https://alpha-coach.app/jackson");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://alpha-coach.app/jackson");
  });

  it("uses the owner-resolved tenant rather than the route slug and updates when the coach changes", async () => {
    const view = render(<MemoryRouter initialEntries={["/jussara/admin/link-divulgacao"]}><LinkDivulgacaoContent /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://alpha-coach.app/jackson"));
    state.tenant = { id: "jussara-id", slug: "jussara", nome: "Jussara" };
    view.rerender(<MemoryRouter><LinkDivulgacaoContent /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("https://alpha-coach.app/jussara"));
  });

  it("does not copy or share cached tenant links during loading or after a resolution error", () => {
    state.loading = true;
    const view = render(<MemoryRouter><LinkDivulgacaoContent /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Copiar link" })).not.toBeInTheDocument();
    state.loading = false;
    state.error = "offline";
    view.rerender(<MemoryRouter><LinkDivulgacaoContent /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Enviar pelo WhatsApp" })).not.toBeInTheDocument();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("opens WhatsApp externally with the same encoded link on the web, not the landing page", async () => {
    const popup = { opener: window };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    await sendCoachPublicLink("https://alpha-coach.app/jackson");
    expect(open).toHaveBeenCalledWith(getCoachWhatsAppUrl("https://alpha-coach.app/jackson"), "_blank");
    expect(new URL(open.mock.calls[0][0] as string).searchParams.get("text")).toBe("Oi! Esse é o meu link: https://alpha-coach.app/jackson");
    expect(popup.opener).toBeNull();
    expect(state.share).not.toHaveBeenCalled();
  });

  it.each(["ios", "android"])("shares the exact link with the native sheet on %s without opening any webview", async () => {
    state.native = true;
    state.share.mockResolvedValue({});
    const open = vi.spyOn(window, "open");
    render(<MemoryRouter><LinkDivulgacaoContent /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Enviar pelo WhatsApp" }));
    await waitFor(() => expect(state.share).toHaveBeenCalledWith({
      title: "Link de divulgação",
      text: "Oi! Esse é o meu link: https://alpha-coach.app/jackson",
      dialogTitle: "Enviar link para o aluno",
    }));
    expect(open).not.toHaveBeenCalled();
  });

  it("treats native cancellation as cancellation, without opening a fallback page", async () => {
    state.native = true;
    state.share.mockRejectedValue(new Error("Share canceled"));
    const open = vi.spyOn(window, "open");
    await expect(sendCoachPublicLink("https://alpha-coach.app/jackson")).resolves.toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });

  it("reports clipboard failures instead of confirming a copy that did not happen", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("denied"));
    await expect(copyCoachPublicLink("https://alpha-coach.app/jackson")).rejects.toThrow("denied");
  });
});