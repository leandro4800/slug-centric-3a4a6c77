import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { stashAuthRolesPrefetch } from "@/lib/auth-roles-prefetch";

const SESSION = {
  user: { id: "3c40d11c-1560-462f-8918-a924cfe8686c", email: "alphacoachapp@gmail.com" },
} as any;

const dbRoles = vi.fn();

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@capacitor/app", () => ({ App: { addListener: vi.fn() } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        cb("INITIAL_SESSION", SESSION);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({ data: { session: SESSION }, error: null }),
      signOut: async () => ({ error: null }),
      startAutoRefresh: async () => {},
      stopAutoRefresh: async () => {},
    },
    from: () => ({
      select: () => ({
        eq: () => dbRoles(),
      }),
    }),
  },
}));

const { AuthProvider, useAuth } = await import("@/hooks/use-auth");

const Probe = () => {
  const { rolesReady, hasRole } = useAuth();
  if (!rolesReady) return <span>carregando</span>;
  return (
    <span data-testid="result">
      {`admin:${hasRole("admin")}|coach:${hasRole("coach", "6c4ff89c-3d9f-4225-ae95-5bf1dbf35886")}`}
    </span>
  );
};

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe("AuthProvider — resolução de permissões do superadmin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    dbRoles.mockReset();
  });

  it("não deixa o prefetch de login esconder o admin global gravado em user_roles", async () => {
    // Cenário do bug: o login guardou apenas o papel do destino (coach).
    stashAuthRolesPrefetch([{ role: "coach", tenant_id: "6c4ff89c-3d9f-4225-ae95-5bf1dbf35886" }]);
    dbRoles.mockResolvedValue({
      data: [
        { role: "admin", tenant_id: null },
        { role: "coach", tenant_id: "6c4ff89c-3d9f-4225-ae95-5bf1dbf35886" },
      ],
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("result").textContent).toBe("admin:true|coach:true");
    });
  });

  it("mantém as permissões conhecidas quando a consulta falha, em vez de bloquear a conta", { timeout: 30000 }, async () => {
    stashAuthRolesPrefetch([{ role: "admin", tenant_id: null }]);
    dbRoles.mockResolvedValue({ data: null, error: { message: "network" } });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("result").textContent).toBe("admin:true|coach:false");
    }, { timeout: 15000 });
  });

  it("bloqueia conta sem nenhuma permissão", async () => {
    dbRoles.mockResolvedValue({ data: [], error: null });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("result").textContent).toBe("admin:false|coach:false");
    }, { timeout: 15000 });
  }, 30000);

  it("conta apenas de aluno não recebe acesso admin", async () => {
    dbRoles.mockResolvedValue({
      data: [{ role: "aluno", tenant_id: "6c4ff89c-3d9f-4225-ae95-5bf1dbf35886" }],
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("result").textContent).toBe("admin:false|coach:false");
    });
  });
});
