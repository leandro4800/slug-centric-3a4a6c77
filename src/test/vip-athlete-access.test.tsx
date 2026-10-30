import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Vips from "@/pages/site-admin/Vips";

const invoke = vi.hoisted(() => vi.fn().mockResolvedValue({ password: "example-only" }));
vi.mock("@/hooks/use-site-tenant", () => ({ useSiteTenant: () => ({ tenant: { id: "test-team", slug: "alphateam" } }) }));
vi.mock("@/lib/invoke-edge-function", () => ({ invokeEdgeFunction: invoke }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: () => query, order: () => Promise.resolve({ data: [] }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [] }).then(resolve) };
  return query;
} } }));
afterEach(cleanup);

describe("VIP athlete access", () => {
  it("copies both app and panel access after creating a VIP", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<Vips />);
    fireEvent.change(screen.getByPlaceholderText("Ex: João Silva"), { target: { value: "Atleta Exemplo" } });
    fireEvent.change(screen.getByPlaceholderText("vip@email.com"), { target: { value: "atleta@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Liberar acesso VIP" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("site-create-vip", expect.objectContaining({ email: "atleta@example.test" })));
    fireEvent.click(await screen.findByRole("button", { name: "Copiar credenciais e link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Login: atleta@example.test\nSenha: example-only\nLink do app: https://alpha-coach.app/alphateam\nPainel do atleta: https://alpha-coach.app/atleta"));
  });
});