import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ exercises: [] as any[], inserts: [] as any[] }));
const tenant = { id: "tenant", nome: "Coach", vertical: "personal" };
vi.mock("@/contexts/BrandingProvider", () => ({ useBranding: () => ({ tenant }) }));
vi.mock("@/hooks/use-site-tenant", () => ({ useSiteTenant: () => ({ tenant: null }) }));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ slug: "coach" }),
  useSearchParams: () => [new URLSearchParams("aluno=student&edit=true")],
}));
vi.mock("@/components/admin/AdminBackButton", () => ({ AdminBackButton: () => null }));
vi.mock("@/components/admin/ImportPlanoIA", () => ({ ImportPlanoIA: () => null }));
vi.mock("@/components/admin/DivisaoPresetCard", () => ({ DivisaoPresetCard: () => null }));
vi.mock("@/components/admin/ExerciseVideoButton", () => ({ ExerciseVideoButton: () => null }));
vi.mock("@/components/admin/TecnicaAvancadaPicker", () => ({
  TecnicaAvancadaPicker: () => null,
  useTecnicasAvancadas: () => ({ tecnicas: [], reloadTecnicas: vi.fn() }),
}));
vi.mock("@/lib/exerciseLink", () => ({ resolveExercicioIds: async () => new Map(), linkIdPara: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: async () => ({ data: { skipped: true }, error: null }) },
  from: (table: string) => {
    let operation = "select";
    let payload: any;
    let single = false;
    const query: any = {
      select: () => query, eq: () => query, order: () => query, limit: () => query,
      maybeSingle: () => { single = true; return query; },
      delete: () => { operation = "delete"; return query; },
      insert: (rows: any[]) => { operation = "insert"; payload = rows; return query; },
      then: (resolve: any, reject: any) => Promise.resolve().then(() => {
        let rows: any[] = [];
        if (table === "perfis") rows = [{ id: "student", nome_completo: "Aluno", tenant_id: "tenant", sexo: "masculino" }];
        if (table === "anamnese_aluno") rows = [{ disponibilidade_dias: [] }];
        if (table === "treinos_prescritos") {
          if (operation === "delete") db.exercises = [];
          if (operation === "insert") { db.inserts.push(payload); db.exercises = payload; }
          rows = db.exercises;
        }
        return { data: single ? rows[0] ?? null : rows, error: null };
      }).then(resolve, reject),
    };
    return query;
  },
} }));

import AdminMontarTreino from "@/pages/admin/AdminMontarTreino";

describe("descanso definido pelo coach por exercício", () => {
  beforeEach(() => {
    localStorage.clear();
    db.inserts = [];
    db.exercises = [
      { dia_semana: "Treino A", ordem: 0, exercicio: "Supino", series: "3", repeticoes: "10", tempo_descanso_segundos: 60 },
      { dia_semana: "Treino A", ordem: 1, exercicio: "Remada", series: "3", repeticoes: "10", tempo_descanso_segundos: 120 },
    ];
  });
  afterEach(cleanup);

  it("salva descansos independentes e os mantém ao reabrir o treino", async () => {
    const view = render(<AdminMontarTreino />);
    const fields = await screen.findAllByLabelText("Descanso (segundos)");
    expect(fields[0]).toHaveValue(60);
    expect(fields[1]).toHaveValue(120);
    fireEvent.change(fields[0], { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e enviar" }));
    await waitFor(() => expect(db.inserts).toHaveLength(1));
    expect(db.inserts[0].map((e: any) => e.tempo_descanso_segundos)).toEqual([45, 120]);
    view.unmount();
    render(<AdminMontarTreino />);
    const reopened = await screen.findAllByLabelText("Descanso (segundos)");
    expect(reopened[0]).toHaveValue(45);
    expect(reopened[1]).toHaveValue(120);
  });
});