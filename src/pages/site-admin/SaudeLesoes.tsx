import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { invokeEdgeFunction } from "@/lib/invoke-edge-function";
import { fetchTenantBranding, getTenantPrimaryRgb, loadImageDataUrl, renderPdfHeader } from "@/lib/pdf-branding";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import { toast } from "sonner";
import {
  HeartPulse, Loader2, Send, FileDown, ShieldAlert, Stethoscope, Info, ExternalLink, AlertTriangle,
} from "lucide-react";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface RestricoesMeta {
  detectadas: boolean;
  gravidade: string;
  regioes: string[];
  proibidos: string[];
  substitutos: string[];
}

const SUGESTOES = [
  "Aluno com hérnia de disco L5-S1: quais exercícios de perna posso prescrever?",
  "Como treinar peito e ombro em quem tem impacto no manguito rotador?",
  "Hipertenso controlado: quais técnicas de intensificação devo evitar?",
  "Condromalácia patelar: substitutos seguros para agachamento livre.",
];

const uniq = (arr: (string | null | undefined)[]) =>
  Array.from(new Set(arr.map((s) => (s || "").trim()).filter((s) => s.length > 1 && !/^(nenhum|nenhuma|não|nao|n\/a)$/i.test(s))));

// Remove repetições em loop (linhas de tabela vazias/duplicadas) que o modelo às vezes gera.
const limparLoop = (texto: string) => {
  const linhas = texto.split("\n");
  const out: string[] = [];
  let repet = 0;
  let anterior = "";
  for (const l of linhas) {
    const t = l.trim();
    const lixo = /^[\s|:_—–-]*$/.test(t) && t.length > 2;
    if ((lixo && repet >= 1) || (t.length > 0 && t === anterior)) {
      repet++;
      if (repet >= 2) continue;
    } else {
      repet = lixo ? 1 : 0;
    }
    anterior = t;
    out.push(l);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
};

const SaudeLesoes = () => {
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [alunoId, setAlunoId] = useState<string>("");
  const [relato, setRelato] = useState("");
  const [contexto, setContexto] = useState<Record<string, unknown> | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [laudo, setLaudo] = useState("");
  const [gerandoLaudo, setGerandoLaudo] = useState(false);
  const [meta, setMeta] = useState<RestricoesMeta | null>(null);
  const fimChat = useRef<HTMLDivElement>(null);
  const laudoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email, avatar_url")
        .eq("tenant_id", tenant.id)
        .order("nome_completo");
      setAlunos((data as Aluno[]) || []);
    })();
  }, [tenant?.id]);

  useEffect(() => {
    fimChat.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  useEffect(() => {
    if (gerandoLaudo || laudo) {
      laudoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [gerandoLaudo]);


  const alunoSelecionado = useMemo(() => alunos.find((a) => a.id === alunoId) || null, [alunos, alunoId]);

  useEffect(() => {
    if (!alunoId) {
      setContexto(null);
      return;
    }
    (async () => {
      const [{ data: anam }, { data: perfilTreino }] = await Promise.all([
        supabase.from("anamnese_aluno").select("*").eq("aluno_id", alunoId).maybeSingle(),
        supabase.from("perfis_treino").select("*").eq("aluno_id", alunoId).maybeSingle(),
      ]);
      const a = (anam as any) || {};
      const p = (perfilTreino as any) || {};
      const lesoes = uniq([
        a.lesoes_atuais,
        a.cirurgias,
        p.lesoes,
        p.limitacoes,
        ...(Array.isArray(a.doencas) ? a.doencas : []),
      ]);
      setContexto({
        nome: alunos.find((x) => x.id === alunoId)?.nome_completo,
        sexo: p.sexo ?? null,
        peso_kg: p.peso_kg ?? null,
        altura_cm: p.altura_cm ?? null,
        nivel: a.nivel_experiencia ?? p.nivel ?? null,
        dias_disponiveis: a.disponibilidade_dias ?? null,
        doencas: a.doencas ?? null,
        medicamentos: a.medicamentos ?? null,
        lesoes_atuais: a.lesoes_atuais ?? null,
        cirurgias: a.cirurgias ?? null,
        limitacoes: p.limitacoes ?? null,
      });
      if (lesoes.length) setRelato(lesoes.join(" | "));
    })();
  }, [alunoId, alunos]);

  const chamar = async (modo: "chat" | "laudo", texto: string) => {
    return invokeEdgeFunction<{ texto: string; restricoes: RestricoesMeta }>("ia-lesoes", {
      modo,
      pergunta: texto,
      relato,
      aluno: contexto,
      historico: chat.slice(-8),
    });
  };

  const enviar = async () => {
    const q = pergunta.trim();
    if (!q || loading) return;
    setChat((c) => [...c, { role: "user", content: q }]);
    setPergunta("");
    setLoading(true);
    try {
      const res = await chamar("chat", q);
      setMeta(res.restricoes);
      setChat((c) => [...c, { role: "assistant", content: res.texto }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao consultar a IA");
    } finally {
      setLoading(false);
    }
  };

  const gerarLaudo = async () => {
    if (!relato.trim() && !contexto) {
      toast.error("Selecione um aluno ou descreva a condição clínica.");
      return;
    }
    setGerandoLaudo(true);
    setLaudo("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ia-lesoes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            modo: "laudo",
            pergunta: pergunta.trim(),
            relato,
            aluno: contexto,
            historico: [],
          }),
        },
      );

      if (!resp.ok || !resp.body) {
        let msg = `Falha ao gerar o laudo (${resp.status})`;
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let texto = "";
      let eventName = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) { eventName = ""; continue; }
          if (line.startsWith("event:")) { eventName = line.slice(6).trim(); continue; }
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            if (eventName === "meta") setMeta(json as RestricoesMeta);
            else if (eventName === "error") throw new Error(json?.error || "Erro na IA");
            else if (json?.delta) {
              texto += json.delta;
              setLaudo(limparLoop(texto));
            }
          } catch { /* chunk parcial */ }
        }
      }

      if (!texto.trim()) throw new Error("A IA não retornou conteúdo. Tente novamente.");
      setLaudo(limparLoop(texto));
      toast.success("Laudo gerado. Revise antes de baixar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar o laudo");
    } finally {
      setGerandoLaudo(false);
    }
  };


  const baixarPdf = async () => {
    if (!laudo) return;
    const branding = await fetchTenantBranding(tenant?.slug);
    const logo = await loadImageDataUrl(branding?.logo_url);
    const primary = getTenantPrimaryRgb(branding);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = renderPdfHeader({
      doc,
      title: "LAUDO TÉCNICO DE EXERCÍCIOS",
      subtitle: "Adequação de treino a restrições clínicas",
      coachName: branding?.nome || tenant?.nome,
      studentName: alunoSelecionado?.nome_completo || null,
      logo,
      primary,
    });

    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 14, y);
    y += 8;

    const linhas = laudo.split("\n");
    for (const raw of linhas) {
      const linha = raw.replace(/\*\*/g, "").replace(/^#+\s*/, "");
      const isTitulo = /^#+\s/.test(raw);
      doc.setFont("helvetica", isTitulo ? "bold" : "normal");
      doc.setFontSize(isTitulo ? 12 : 10);
      doc.setTextColor(isTitulo ? primary[0] : 25, isTitulo ? primary[1] : 25, isTitulo ? primary[2] : 25);
      const wrapped = doc.splitTextToSize(linha || " ", pageW - 28);
      for (const w of wrapped) {
        if (y > pageH - 22) {
          doc.addPage();
          y = 20;
        }
        doc.text(w, 14, y);
        y += isTitulo ? 6.5 : 5;
      }
      if (isTitulo) y += 1.5;
    }

    if (y > pageH - 30) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(200);
    doc.line(14, y + 2, pageW - 14, y + 2);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    const aviso = doc.splitTextToSize(
      "AVISO: material técnico de apoio ao profissional de Educação Física. Não é laudo médico, não substitui avaliação clínica presencial e não serve para diagnóstico. Patologia diagnosticada exige liberação médica/fisioterapêutica antes da progressão de cargas.",
      pageW - 28,
    );
    y += 7;
    doc.text(aviso, 14, y);

    const nome = (alunoSelecionado?.nome_completo || "atleta").replace(/\s+/g, "-").toLowerCase();
    doc.save(`laudo-exercicios-${nome}.pdf`);
  };

  if (tenantLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <AdminBackButton />

      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
          <HeartPulse className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide">Saúde &amp; Lesões</h1>
          <p className="text-sm text-muted-foreground">
            IA clínica para tirar dúvidas sobre lesões, escolher os melhores exercícios e emitir laudo técnico em PDF.
          </p>
        </div>
      </header>

      {/* Aviso obrigatório */}
      <div className="flex gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
        <ShieldAlert className="h-5 w-5 shrink-0 text-yellow-500" />
        <div className="text-xs leading-relaxed text-yellow-100/90">
          <p className="font-bold uppercase tracking-wide text-yellow-400">Uso profissional — não é diagnóstico médico</p>
          <p className="mt-1">
            Esta ferramenta apoia a decisão do profissional de Educação Física na adequação de exercícios. Ela não
            diagnostica, não interpreta exames de imagem e não prescreve medicamentos. Casos com patologia diagnosticada
            exigem liberação médica/fisioterapêutica. Em dor aguda, perda de força ou alteração de sensibilidade,
            interrompa o treino e encaminhe ao médico.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Contexto do caso */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Atleta</p>
            <select
              value={alunoId}
              onChange={(e) => setAlunoId(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
            >
              <option value="">Caso avulso (sem atleta)</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome_completo || a.email}
                </option>
              ))}
            </select>

            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Quadro clínico relatado</p>
            <textarea
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              rows={5}
              placeholder="Ex.: discopatia degenerativa L4-L5, dor lombar ao flexionar, cirurgia de menisco em 2023..."
              className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Preenchido automaticamente com a anamnese do atleta (lesões, cirurgias e doenças). Edite livremente.
            </p>

            <button
              onClick={gerarLaudo}
              disabled={gerandoLaudo}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
            >
              {gerandoLaudo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
              Gerar laudo técnico
            </button>
            {laudo && (
              <button
                onClick={baixarPdf}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-primary hover:bg-primary/10"
              >
                <FileDown className="h-4 w-4" /> Baixar laudo em PDF
              </button>
            )}
          </div>

          {meta?.detectadas && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs">
              <p className="flex items-center gap-2 font-bold uppercase tracking-wide text-red-400">
                <AlertTriangle className="h-4 w-4" /> Trava clínica ativa — {meta.gravidade}
              </p>
              <p className="mt-2 text-muted-foreground">Regiões: {meta.regioes.join(", ") || "não identificada"}</p>
              {meta.proibidos.length > 0 && (
                <>
                  <p className="mt-2 font-semibold text-red-300">Bloqueados na geração de treino:</p>
                  <p className="text-muted-foreground">{meta.proibidos.slice(0, 12).join(" • ")}</p>
                </>
              )}
              {meta.substitutos.length > 0 && (
                <>
                  <p className="mt-2 font-semibold text-emerald-300">Substitutos seguros:</p>
                  <p className="text-muted-foreground">{meta.substitutos.slice(0, 10).join(" • ")}</p>
                </>
              )}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs space-y-2">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Informações e conformidade
            </p>
            <p className="text-muted-foreground">
              Conteúdo de saúde e bem-estar destinado a profissionais. Sem coleta de dados sensíveis fora do prontuário
              do próprio atleta no AlphaCoach.
            </p>
            <div className="flex flex-col gap-1 pt-1">
              <a href="/suporte" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Suporte AlphaCoach <ExternalLink className="h-3 w-3" />
              </a>
              <a href="/politica-de-privacidade" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Política de privacidade <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://developer.apple.com/app-store/review/guidelines/#health-and-health-research"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
              >
                Apple — Diretrizes de saúde (1.4.1 / 5.1.3) <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://www.apple.com/legal/privacy/data/pt/health-app/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
              >
                Apple — Privacidade de dados de saúde <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Chat + laudo */}
        <div className="space-y-4">
          {(gerandoLaudo || laudo) && (
            <div ref={laudoRef} className="rounded-xl border border-primary/30 bg-black/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Prévia do laudo</p>
                {laudo && (
                  <button onClick={baixarPdf} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <FileDown className="h-3.5 w-3.5" /> Baixar PDF
                  </button>
                )}
              </div>
              {laudo ? (
                <div className="prose prose-sm prose-invert max-w-none prose-table:text-xs">
                  <ReactMarkdown>{laudo}</ReactMarkdown>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando laudo técnico...
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">Consultar a IA clínica</p>

            <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {chat.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Comece por uma dúvida frequente:</p>
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPergunta(s)}
                      className="block w-full rounded-md border border-white/10 px-3 py-2 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-sm"
                      : "max-w-[95%] rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  }
                >
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none prose-table:text-xs">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analisando o caso...
                </p>
              )}
              <div ref={fimChat} />
            </div>

            <div className="mt-3 flex gap-2">
              <textarea
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                rows={2}
                placeholder="Ex.: posso manter leg press nesse caso? Qual amplitude?"
                className="flex-1 rounded-md border border-white/10 bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={enviar}
                disabled={loading}
                className="rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-60"
                aria-label="Enviar pergunta"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SaudeLesoes;
