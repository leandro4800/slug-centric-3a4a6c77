import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";
import { Loader2, UserPlus, Mail, CheckCircle2, Sparkles, Image as ImageIcon, ClipboardPaste } from "lucide-react";

interface Plano { id: string; nome: string; preco_centavos: number; }

const NovoAluno = () => {
  const { tenant } = useSiteTenant();
  const navigate = useNavigate();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [planoId, setPlanoId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ email: string; aguardandoPagamento?: boolean; convite?: boolean } | null>(null);

  // IA
  const [iaOpen, setIaOpen] = useState(false);
  const [iaMode, setIaMode] = useState<"image" | "text">("image");
  const [iaText, setIaText] = useState("");
  const [iaLoading, setIaLoading] = useState(false);
  const [iaPreview, setIaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File) =>
    new Promise<{ base64: string; mime: string }>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || "");
        const [meta, b64] = s.split(",");
        const mime = /data:(.*?);base64/.exec(meta || "")?.[1] || file.type || "image/png";
        resolve({ base64: b64 || "", mime });
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const applyParsed = (d: any) => {
    if (d?.nome) setNome(d.nome);
    if (d?.email) setEmail(String(d.email).toLowerCase());
    if (d?.telefone) setTelefone(d.telefone);
    setIaOpen(false);
    setIaText("");
    setIaPreview(null);
    toast.success("Dados preenchidos! Confira antes de cadastrar.");
  };

  const runIA = async (payload: { image_base64?: string; image_mime?: string; text?: string }) => {
    setIaLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-aluno-ia", { body: payload });
      let serverError: string | null = (data as any)?.error || null;
      if (error && !serverError) {
        try {
          const resp = (error as any)?.context as Response | undefined;
          if (resp?.text) {
            const txt = await resp.text();
            try { serverError = JSON.parse(txt)?.error || txt; } catch { serverError = txt; }
          }
        } catch { /* ignore */ }
        if (!serverError) serverError = error.message;
      }
      if (serverError) throw new Error(serverError);
      const parsed = (data as any)?.data;
      if (!parsed || (!parsed.nome && !parsed.email && !parsed.telefone)) {
        toast.warning("A IA não conseguiu identificar dados. Tente uma imagem mais nítida ou ajuste o texto.");
        return;
      }
      applyParsed(parsed);
    } catch (err: any) {
      toast.error(err.message || "Falha ao processar com IA");
    } finally {
      setIaLoading(false);
    }
  };

  const handleImageChosen = async (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Imagem muito grande (máx 8MB)"); return; }
    const { base64, mime } = await fileToBase64(file);
    setIaPreview(`data:${mime};base64,${base64}`);
    await runIA({ image_base64: base64, image_mime: mime });
  };

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      const { data } = await supabase
        .from("planos")
        .select("id, nome, preco_centavos")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      setPlanos((data as Plano[]) || []);
    })();
  }, [tenant?.id]);

  const VIP_EMAILS = ["48mineiro@gmail.com", "vozesdamitologia1@gmail.com"];
  const isVip = VIP_EMAILS.includes(email.trim().toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e email");
      return;
    }
    if (!isVip && !planoId) {
      toast.error("Selecione um plano para o aluno");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("site-create-aluno", {
        body: {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone.trim() || null,
          plano_id: planoId,
        },
      });
      // supabase-js oculta o corpo em respostas não-2xx; ler manualmente do contexto
      let serverError: string | null = (data as any)?.error || null;
      if (error && !serverError) {
        try {
          const resp = (error as any)?.context as Response | undefined;
          if (resp && typeof resp.text === "function") {
            const txt = await resp.text();
            try { serverError = JSON.parse(txt)?.error || txt; } catch { serverError = txt; }
          }
        } catch { /* ignore */ }
        if (!serverError) serverError = error.message;
      }
      if (serverError) throw new Error(serverError);
      const modoConvite = (data as any)?.modo === "convite";
      setSuccess({ email: email.trim().toLowerCase(), aguardandoPagamento: !!(data as any)?.aguardando_pagamento, convite: modoConvite });
      toast.success(modoConvite ? "Convite enviado ao aluno!" : "Aluno cadastrado! Email com credenciais enviado.");

    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar aluno");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="relative max-w-xl w-full rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-black to-black p-10 text-center space-y-4 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)]">
          <div className="absolute inset-0 rounded-3xl opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, hsl(var(--primary) / 0.4), transparent 60%)" }} />
          <CheckCircle2 className="h-14 w-14 text-primary mx-auto relative" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary relative">Sucesso</p>
          <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter text-white relative">Aluno cadastrado!</h1>
          <p className="text-sm text-white/70 relative">
            Enviamos um email para <strong className="text-white">{success.email}</strong> com
            o usuário, senha temporária e instruções de acesso ao app.
          </p>
          {success.aguardandoPagamento && (
            <p className="text-sm text-amber-400 relative">
              Atenção: o acesso do aluno só será liberado após o pagamento do plano pelo checkout (Stripe).
            </p>
          )}
          <div className="flex gap-3 justify-center pt-2 relative">
            <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => { setSuccess(null); setNome(""); setEmail(""); setTelefone(""); setPlanoId(""); }}>
              Cadastrar outro
            </Button>
            <Button onClick={() => navigate("/site/admin/alunos")}>Ver alunos</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero cinematográfico */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, hsl(var(--primary) / 0.35), transparent 55%), radial-gradient(ellipse at 90% 100%, hsl(var(--primary) / 0.2), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
        <div className="relative p-4 md:p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <AdminBackButton to="/site/admin/alunos" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Gestão de atletas</p>
          <h1 className="font-display text-4xl md:text-6xl uppercase italic tracking-tighter flex items-center gap-3 mt-2 text-white">
            <UserPlus className="h-8 w-8 md:h-10 md:w-10 text-primary" /> Cadastrar aluno
          </h1>
          <p className="text-sm text-white/60 mt-3 max-w-xl">
            Ao cadastrar, enviaremos um email para o aluno com o usuário, senha temporária e
            instruções para entrar no app.
          </p>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-3xl mx-auto -mt-6 relative">
        <div className="mb-4 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent backdrop-blur p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Cadastro com IA
            </p>
            <p className="text-xs text-white/60 mt-1">
              Envie um print (WhatsApp, ficha, cartão) ou cole o texto que a IA preenche o formulário.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setIaOpen(true)} className="gap-2 shrink-0">
            <Sparkles className="h-4 w-4" /> Usar IA
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur p-6 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]">
          <div>
            <Label htmlFor="nome" className="text-white/80">Nome completo *</Label>
            <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva" className="bg-black/60 border-white/10 text-white placeholder:text-white/30" />
          </div>

          <div>
            <Label htmlFor="email" className="text-white/80">E-mail *</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" className="bg-black/60 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-[11px] text-white/50 mt-1 flex items-center gap-1">
              <Mail className="h-3 w-3" /> Para este email enviaremos os dados de acesso.
            </p>
          </div>

          <div>
            <Label htmlFor="telefone" className="text-white/80">Telefone (opcional)</Label>
            <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" className="bg-black/60 border-white/10 text-white placeholder:text-white/30" />
          </div>

          {isVip ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
              <p className="font-medium text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Acesso VIP liberado
              </p>
              <p className="text-white/60 mt-1">
                Este e-mail tem acesso livre ao app — nenhum plano é necessário.
              </p>
            </div>
          ) : planos.length === 0 ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <p className="font-medium text-destructive">Você ainda não criou nenhum plano.</p>
              <p className="text-white/60 mt-1">
                Crie um plano em <strong>Faturamento</strong> antes de cadastrar alunos.
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="plano" className="text-white/80">Plano *</Label>
              <select
                id="plano"
                required
                value={planoId}
                onChange={(e) => setPlanoId(e.target.value)}
                className="w-full h-10 rounded-md border border-white/10 bg-black/60 text-white px-3 text-sm"
              >
                <option value="">Selecione um plano...</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — R$ {(p.preco_centavos / 100).toFixed(2)}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/50 mt-1">
                O aluno já entrará no app com este plano ativo.
              </p>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/site/admin/alunos")} disabled={submitting} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || (!isVip && (planos.length === 0 || !planoId))} className="flex-1 gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {submitting ? "Cadastrando..." : "Cadastrar e enviar email"}
            </Button>
          </div>
        </form>
      </div>

      <Dialog open={iaOpen} onOpenChange={(o) => { if (!iaLoading) setIaOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Cadastro com IA
            </DialogTitle>
            <DialogDescription>
              Escolha uma das opções — a IA extrai nome, e-mail e telefone e preenche o formulário.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-3">
            <Button
              type="button"
              variant={iaMode === "image" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setIaMode("image")}
              disabled={iaLoading}
            >
              <ImageIcon className="h-4 w-4" /> Print / foto
            </Button>
            <Button
              type="button"
              variant={iaMode === "text" ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setIaMode("text")}
              disabled={iaLoading}
            >
              <ClipboardPaste className="h-4 w-4" /> Colar texto
            </Button>
          </div>

          {iaMode === "image" ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageChosen(f); }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={iaLoading}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors p-6 text-center disabled:opacity-50"
              >
                {iaPreview ? (
                  <img src={iaPreview} alt="preview" className="max-h-40 mx-auto rounded" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <p className="text-sm font-medium">Clique para enviar um print</p>
                    <p className="text-[11px]">JPG, PNG · máx 8MB</p>
                  </div>
                )}
              </button>
              <p className="text-[11px] text-muted-foreground">
                Funciona com prints de WhatsApp, ficha física fotografada, cartão de visita, etc.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder={"Cole aqui o texto. Ex.:\n\nNome: João Silva\nEmail: joao@email.com\nCel: (11) 98888-7777"}
                rows={7}
                value={iaText}
                onChange={(e) => setIaText(e.target.value)}
                disabled={iaLoading}
              />
              <Button
                type="button"
                onClick={() => iaText.trim() && runIA({ text: iaText })}
                disabled={iaLoading || !iaText.trim()}
                className="w-full gap-2"
              >
                {iaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {iaLoading ? "Analisando..." : "Extrair dados"}
              </Button>
            </div>
          )}

          {iaLoading && iaMode === "image" && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Analisando imagem...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NovoAluno;
