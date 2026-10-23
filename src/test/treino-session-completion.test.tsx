import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  sessions: [] as any[], series: [] as any[], writes: [] as any[], failUpdate: false,
  countOverride: null as number | null,
}));
const auth = { user: { id: "student", user_metadata: {} } };
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => auth }));
const branding = { tenant: { id: "tenant" } };
vi.mock("@/contexts/BrandingProvider", () => ({ useBranding: () => branding }));
vi.mock("react-router-dom", () => ({ useParams: () => ({ slug: "coach" }) }));
vi.mock("@/hooks/use-avatar-variant", () => ({ useAvatarVariant: () => null }));
vi.mock("@/components/aluno/PageHeader", () => ({ PageHeader: () => null }));
vi.mock("@/components/TenantSymbol", () => ({ TenantSymbol: () => null }));
vi.mock("@/components/aluno/TreinoConclusaoCard", () => ({ TreinoConclusaoCard: () => null }));
vi.mock("@/components/aluno/ExerciseCard", () => ({ ExerciseCard: ({ sessaoId, onSeriesSaved }: any) => (
  <button onClick={() => { if (sessaoId) db.series.push({ sessao_id: sessaoId, aluno_id: "student", volume_kg: 100 }); onSeriesSaved(); }}>Salvar série</button>
) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const filters: Array<[string, any]> = [];
    let operation = "select";
    let payload: any;
    let single = false;
    const query: any = {
      select: () => query,
      eq: (key: string, value: any) => { filters.push([key, value]); return query; },
      gt: (key: string, value: any) => { filters.push([`gt:${key}`, value]); return query; }, gte: () => query, lte: () => query, order: () => query, limit: () => query,
      maybeSingle: () => { single = true; return query; },
      single: () => { single = true; return query; },
      insert: (value: any) => { operation = "insert"; payload = value; return query; },
      update: (value: any) => { operation = "update"; payload = value; return query; },
      then: (resolve: any, reject: any) => Promise.resolve().then(() => {
        let rows: any[] = [];
        if (table === "sessoes_treino") {
          if (operation === "insert") {
            const row = { ...payload, id: `session-${payload.dia_semana}`, created_at: new Date().toISOString() };
            db.sessions.unshift(row);
          }
          rows = db.sessions;
        } else if (table === "series_executadas") rows = db.series;
        else if (table === "treinos_prescritos") rows = [
          { id: "exercise-thursday", aluno_id: "student", tenant_id: "tenant", dia_semana: "quinta", dia_ordem: 1, exercicio: "Supino" },
          { id: "exercise-friday", aluno_id: "student", tenant_id: "tenant", dia_semana: "sexta", dia_ordem: 2, exercicio: "Remada" },
        ];
        else if (table === "anamnese_aluno") rows = [{ disponibilidade_dias: [] }];
        rows = rows.filter((row) => filters.every(([key, value]) => key.startsWith("gt:") ? row[key.slice(3)] > value : row[key] === value));
        if (operation === "update") {
          db.writes.push({ table, filters, payload });
          if (db.failUpdate) return { data: null, error: { message: "failed" } };
          rows.forEach((row) => Object.assign(row, payload));
        }
        return { data: single ? rows[0] ?? null : rows, count: table === "series_executadas" ? db.countOverride ?? rows.length : rows.length, error: null };
      }).then(resolve, reject),
    };
    return query;
  },
  rpc: vi.fn(async () => ({ data: {}, error: null })),
  functions: { invoke: vi.fn(async () => ({ data: { ok: true }, error: null })) },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: vi.fn(),
} }));

import { PersonalTreino } from "@/pages/aluno/Treino";
import { supabase } from "@/integrations/supabase/client";

const session = (id: string, day: string, hours = 0) => ({ id, dia_semana: day, aluno_id: "student", tenant_id: "tenant", duracao_min: 0, created_at: new Date(Date.now() - hours * 3600000).toISOString() });
const open = async () => { render(<PersonalTreino />); await screen.findByText("Salvar série"); };
const finish = () => screen.getByRole("button", { name: "CONCLUIR TREINO" });
const selectDay = (day: "QUI" | "SEX") => fireEvent.click(screen.getByRole("button", { name: day }));

describe("Conclusão por sessão e dia", () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("treino:diaAtual", "sexta");
    db.sessions = []; db.series = []; db.writes = []; db.failUpdate = false; db.countOverride = null;
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("não finaliza quinta ao visualizar sexta e permite ir diretamente para quinta", async () => {
    db.sessions = [session("thursday", "quinta")];
    db.series = [{ sessao_id: "thursday", aluno_id: "student", volume_kg: 100 }];
    await open();
    expect(finish()).toBeDisabled();
    fireEvent.click(finish()); expect(db.writes).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Ir para quinta" }));
    await waitFor(() => expect(finish()).toBeEnabled());
    fireEvent.click(finish());
    await waitFor(() => expect(db.writes).toHaveLength(1));
    expect(db.writes[0].filters).toContainEqual(["id", "thursday"]);
    expect(db.writes[0].filters).toContainEqual(["dia_semana", "quinta"]);
  });

  it("quinta antiga com séries não permite concluir uma nova sexta vazia", async () => {
    db.sessions = [session("old-thursday", "quinta", 30)];
    db.series = [{ sessao_id: "old-thursday", aluno_id: "student", volume_kg: 100 }];
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Treino" }));
    await waitFor(() => expect(db.sessions).toHaveLength(2));
    expect(finish()).toBeDisabled();
    selectDay("QUI"); expect(finish()).toBeDisabled();
    selectDay("SEX"); fireEvent.click(finish()); expect(db.writes).toHaveLength(0);
    fireEvent.click(screen.getByText("Salvar série"));
    await waitFor(() => expect(finish()).toBeEnabled());
    fireEvent.click(finish());
    await waitFor(() => expect(db.writes).toHaveLength(1));
    expect(db.writes[0].filters).toContainEqual(["id", "session-sexta"]);
    expect(db.sessions.find((row) => row.id === "old-thursday").duracao_min).toBe(0);
  });

  it("reconfere as séries gravadas mesmo quando o contador em memória é positivo", async () => {
    db.sessions = [session("friday", "sexta")];
    db.series = [{ sessao_id: "friday", aluno_id: "student", volume_kg: 100 }];
    await open(); await waitFor(() => expect(finish()).toBeEnabled());
    db.series = []; fireEvent.click(finish());
    await waitFor(() => expect(finish()).toBeDisabled());
    expect(db.writes).toHaveLength(0);
    expect(supabase.rpc).not.toHaveBeenCalledWith("registrar_sessao_treino", expect.anything());
  });

  it("permite retomar a mesma sessão com mais de 24h sem criar outra linha", async () => {
    db.sessions = [session("old-thursday", "quinta", 30)];
    await open(); fireEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(finish()).toBeDisabled();
    fireEvent.click(screen.getByText("Salvar série"));
    await waitFor(() => expect(finish()).toBeEnabled());
    fireEvent.click(finish());
    await waitFor(() => expect(db.writes).toHaveLength(1));
    expect(db.sessions).toHaveLength(1);
    expect(db.writes[0].filters).toContainEqual(["id", "old-thursday"]);
  });

  it("não marca o dia concluído quando a atualização falha", async () => {
    db.sessions = [session("friday", "sexta")];
    db.series = [{ sessao_id: "friday", aluno_id: "student", volume_kg: 100 }]; db.failUpdate = true;
    await open(); await waitFor(() => expect(finish()).toBeEnabled()); fireEvent.click(finish());
    await waitFor(() => expect(db.writes).toHaveLength(1));
    await waitFor(() => expect(finish()).toBeEnabled());
    expect(db.sessions[0].duracao_min).toBe(0);
    expect(Object.keys(localStorage).filter((key) => key.startsWith("treino:completed:student:"))).toHaveLength(0);
  });
});