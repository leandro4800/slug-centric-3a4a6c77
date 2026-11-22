import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  sessions: [] as any[], series: [] as any[], writes: [] as any[], failUpdate: false,
  countOverride: null as number | null, canceladas: [] as string[],
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
      gt: (key: string, value: any) => { filters.push([`gt:${key}`, value]); return query; },
      is: (key: string, value: any) => { filters.push([`is:${key}`, value]); return query; }, gte: () => query, lte: () => query, order: () => query, limit: () => query,
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
        rows = rows.filter((row) => filters.every(([key, value]) => key.startsWith("gt:") ? row[key.slice(3)] > value
          : key.startsWith("is:") ? (row[key.slice(3)] ?? null) === value : row[key] === value));
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
  rpc: vi.fn(async (fn: string, args: any) => {
    const abertas = () => db.sessions.filter((r) => r.duracao_min === 0 && !r.cancelada_em);
    const concluido = (dia: string) => db.sessions.some((r) => r.dia_semana === dia && r.duracao_min > 0);
    if (fn === "limpar_sessoes_treino_invalidas") {
      const limite = Date.now() - 12 * 3600000;
      const invalidas = abertas().filter((r) => new Date(r.created_at).getTime() < limite || concluido(r.dia_semana));
      invalidas.forEach((r) => { r.cancelada_em = new Date().toISOString(); });
      return { data: invalidas.length, error: null };
    }
    if (fn === "iniciar_sessao_treino") {
      if (concluido(args._dia_semana)) return { data: null, error: { message: "Este treino já foi concluído nesta semana." } };
      if (abertas().length) return { data: null, error: { message: "Você já tem um treino em andamento." } };
      const row = { id: `session-${args._dia_semana}`, aluno_id: "student", tenant_id: args._tenant_id, dia_semana: args._dia_semana, duracao_min: 0, created_at: new Date().toISOString() };
      db.sessions.unshift(row);
      return { data: [{ id: row.id, created_at: row.created_at }], error: null };
    }
    if (fn === "cancelar_sessao_treino") {
      db.canceladas.push(args._sessao_id);
      const temSeries = db.series.some((s) => s.sessao_id === args._sessao_id);
      if (temSeries) db.sessions.forEach((r) => { if (r.id === args._sessao_id) r.cancelada_em = new Date().toISOString(); });
      else db.sessions = db.sessions.filter((r) => r.id !== args._sessao_id);
      return { data: { ok: true }, error: null };
    }
    return { data: {}, error: null };
  }),
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
    // Relógio travado numa sexta-feira: os casos abaixo comparam quinta x sexta
    // e precisam funcionar em qualquer dia real da semana.
    vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date("2026-11-20T12:00:00Z") });
    localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("treino:diaAtual", "sexta");
    db.sessions = []; db.series = []; db.writes = []; db.failUpdate = false; db.countOverride = null; db.canceladas = [];
    vi.clearAllMocks();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("reabre no dia em que o treino foi iniciado", async () => {
    db.sessions = [session("tuesday-started", "quinta")];
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: "QUI" }).className).toContain("bg-primary"));
  });

  it("não finaliza quinta ao visualizar sexta e permite ir diretamente para quinta", async () => {
    db.sessions = [session("thursday", "quinta")];
    db.series = [{ sessao_id: "thursday", aluno_id: "student", volume_kg: 100 }];
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: "QUI" }).className).toContain("bg-primary"));
    selectDay("SEX");
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

  it("encerra sessão aberta há mais de 12h sem concluir e libera iniciar outro treino", async () => {
    db.sessions = [session("old-thursday", "quinta", 30)];
    db.series = [{ sessao_id: "old-thursday", aluno_id: "student", volume_kg: 100 }];
    await open();
    expect(screen.queryByRole("button", { name: "Retomar" })).toBeNull();
    const antiga = db.sessions.find((row) => row.id === "old-thursday");
    expect(antiga.cancelada_em).toBeTruthy();
    expect(antiga.duracao_min).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Treino" }));
    await waitFor(() => expect(db.sessions.some((row) => row.id === "session-sexta")).toBe(true));
  });

  it("treino concluído na semana mostra Concluído e não deixa iniciar de novo", async () => {
    db.sessions = [{ ...session("done-friday", "sexta"), duracao_min: 45 }];
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: /Concluído ✓/ })).toBeDisabled());
    expect(screen.queryByRole("button", { name: "Iniciar Treino" })).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalledWith("iniciar_sessao_treino", expect.anything());
  });

  it("sessão aberta em cima de treino já concluído na semana é encerrada sozinha", async () => {
    db.sessions = [session("phantom-friday", "sexta"), { ...session("done-friday", "sexta"), duracao_min: 45, data_treino: "2026-11-16" }];
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: /Concluído ✓/ })).toBeDisabled());
    expect(screen.queryByText("Treino em andamento")).toBeNull();
    expect(db.sessions.find((row) => row.id === "done-friday").duracao_min).toBe(45);
    expect(db.writes).toHaveLength(0);
  });

  it("cancelar treino descarta a sessão sem concluir e libera outro dia", async () => {
    db.sessions = [session("thursday", "quinta")];
    await open();
    await screen.findByText("Treino em andamento");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar treino" }));
    await screen.findByText("Cancelar treino?");
    fireEvent.click(screen.getAllByRole("button", { name: "Cancelar treino" }).at(-1)!);
    await waitFor(() => expect(db.canceladas).toEqual(["thursday"]));
    await waitFor(() => expect(screen.queryByText("Treino em andamento")).toBeNull());
    expect(db.writes).toHaveLength(0);
    selectDay("SEX");
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Treino" }));
    await waitFor(() => expect(db.sessions.some((row) => row.id === "session-sexta")).toBe(true));
  });

  it("sessão válida em andamento não é encerrada ao reabrir", async () => {
    db.sessions = [session("thursday", "quinta", 1)];
    db.series = [{ sessao_id: "thursday", aluno_id: "student", volume_kg: 100 }];
    await open();
    await screen.findByText("Treino em andamento");
    await waitFor(() => expect(screen.getByRole("button", { name: "Finalizar treino" })).toBeEnabled());
    expect(db.canceladas).toHaveLength(0);
    expect(db.sessions[0].cancelada_em).toBeUndefined();
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