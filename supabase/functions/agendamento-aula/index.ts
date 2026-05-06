// Edge function pública para o fluxo de agendamento de aula avulsa pós-pagamento.
// Usa apenas o token UUID — não exige login.
// Ações:
//   GET   ?token=...                              -> retorna dados do agendamento + slots disponíveis
//   POST  { token, slot_id }                      -> reserva o slot (decrementa vaga, marca confirmado)
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) return json({ error: "token required" }, 400);

      const { data: agend, error } = await supabase
        .from("agendamentos_aula_avulsa")
        .select("id, tenant_id, slot_id, nome, email, telefone, status, valor_centavos")
        .eq("token", token)
        .maybeSingle();
      if (error || !agend) return json({ error: "agendamento not found" }, 404);

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, slug, nome, logo_url")
        .eq("id", agend.tenant_id)
        .maybeSingle();

      let slot: any = null;
      if (agend.slot_id) {
        const { data } = await supabase
          .from("agenda_aula_avulsa_slots")
          .select("*")
          .eq("id", agend.slot_id)
          .maybeSingle();
        slot = data;
      }

      // Slots disponíveis (futuros, ativos, com vaga)
      const today = new Date().toISOString().split("T")[0];
      const { data: slots } = await supabase
        .from("agenda_aula_avulsa_slots")
        .select("*")
        .eq("tenant_id", agend.tenant_id)
        .eq("ativo", true)
        .gte("data", today)
        .order("data")
        .order("hora_inicio");

      const availableSlots = (slots || []).filter((s: any) => s.reservados < s.capacidade);

      return json({ agendamento: agend, tenant, slot, slots: availableSlots });
    }

    if (req.method === "POST") {
      const { token, slot_id } = await req.json();
      if (!token || !slot_id) return json({ error: "token and slot_id required" }, 400);

      const { data: agend } = await supabase
        .from("agendamentos_aula_avulsa")
        .select("id, status, slot_id, tenant_id")
        .eq("token", token)
        .maybeSingle();
      if (!agend) return json({ error: "agendamento not found" }, 404);
      if (agend.status === "cancelado") return json({ error: "agendamento cancelado" }, 400);
      if (agend.status === "pendente") return json({ error: "pagamento ainda nao confirmado" }, 400);
      if (agend.slot_id) return json({ error: "ja existe slot" }, 400);

      const { data: slot } = await supabase
        .from("agenda_aula_avulsa_slots")
        .select("*")
        .eq("id", slot_id)
        .eq("tenant_id", agend.tenant_id)
        .maybeSingle();
      if (!slot) return json({ error: "slot not found" }, 404);
      if (!slot.ativo) return json({ error: "slot inativo" }, 400);
      if (slot.reservados >= slot.capacidade) return json({ error: "slot esgotado" }, 400);

      // Reserva
      const { error: upSlotErr } = await supabase
        .from("agenda_aula_avulsa_slots")
        .update({ reservados: slot.reservados + 1 })
        .eq("id", slot_id)
        .eq("reservados", slot.reservados); // optimistic lock
      if (upSlotErr) return json({ error: "erro reservando slot" }, 500);

      const { error: upAgendErr } = await supabase
        .from("agendamentos_aula_avulsa")
        .update({ slot_id, status: "confirmado" })
        .eq("id", agend.id);
      if (upAgendErr) {
        // rollback
        await supabase.from("agenda_aula_avulsa_slots").update({ reservados: slot.reservados }).eq("id", slot_id);
        return json({ error: "erro confirmando agendamento" }, 500);
      }

      return json({ ok: true });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    console.error("[agendamento-aula]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
