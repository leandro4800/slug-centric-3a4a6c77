import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AtletaAccountGuard from "@/pages/atleta/AtletaAccountGuard";

const mocks = vi.hoisted(() => ({ user: { id: "athlete" } as { id: string } | null, rpc: vi.fn() }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: mocks.user, sessionReady: true }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
const show = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/wrong/atleta"]}><Routes><Route path="/:slug/atleta" element={<AtletaAccountGuard><p>account content</p></AtletaAccountGuard>} /><Route path="/jackson/atleta" element={<p>correct account</p>} /><Route path="/login" element={<p>login</p>} /></Routes></MemoryRouter></QueryClientProvider>);
describe("athlete panel account", () => {
  beforeEach(() => { mocks.user = { id: "athlete" }; mocks.rpc.mockReset(); });
  it("resolves the correct tenant on the server before rendering data", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ tenant_slug: "jackson" }], error: null });
    show();
    await waitFor(() => expect(screen.getByText("correct account")).toBeInTheDocument());
    expect(screen.queryByText("account content")).not.toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("get_my_app_destination");
  });
  it("requires the existing sign-in when signed out", async () => {
    mocks.user = null;
    show();
    expect(await screen.findByText("login")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});