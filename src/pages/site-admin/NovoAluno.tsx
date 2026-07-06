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
  const [success, setSuccess] = useState<{ email: string } | null>(null);

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

  const VIP_EMAILS = ["48mineiro@gmail.com"];
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
      setSuccess({ email: email.trim().toLowerCase() });
      toast.success("Aluno cadastrado! Email com credenciais enviado.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar aluno");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h1 className="font-display text-2xl uppercase tracking-wider">Aluno cadastrado!</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um email para <strong className="text-foreground">{success.email}</strong> com
            o usuário, senha temporária e instruções de acesso ao app.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => { setSuccess(null); setNome(""); setEmail(""); setTelefone(""); setPlanoId(""); }}>
              Cadastrar outro
            </Button>
            <Button onClick={() => navigate("/site/admin/alunos")}>Ver alunos</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <AdminBackButton to="/site/admin/alunos" />
      </div>
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gestão</p>
        <h1 className="font-display text-3xl uppercase italic tracking-tighter flex items-center gap-3">
          <UserPlus className="h-7 w-7 text-primary" /> Cadastrar aluno
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Ao cadastrar, enviaremos um email para o aluno com o usuário, senha temporária e
          instruções para entrar no app.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Cadastro com IA
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Envie um print (WhatsApp, ficha, cartão) ou cole o texto que a IA preenche o formulário.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setIaOpen(true)} className="gap-2 shrink-0">
          <Sparkles className="h-4 w-4" /> Usar IA
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border/50 bg-card p-6">
        <div>
          <Label htmlFor="nome">Nome completo *</Label>
          <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva" />
        </div>

        <div>
          <Label htmlFor="email">E-mail *</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" />
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <Mail className="h-3 w-3" /> Para este email enviaremos os dados de acesso.
          </p>
        </div>

        <div>
          <Label htmlFor="telefone">Telefone (opcional)</Label>
          <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
        </div>

        {planos.length === 0 ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">Você ainda não criou nenhum plano.</p>
            <p className="text-muted-foreground mt-1">
              Crie um plano em <strong>Faturamento</strong> antes de cadastrar alunos.
            </p>
          </div>
        ) : (
          <div>
            <Label htmlFor="plano">Plano *</Label>
            <select
              id="plano"
              required
              value={planoId}
              onChange={(e) => setPlanoId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione um plano...</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {(p.preco_centavos / 100).toFixed(2)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              O aluno já entrará no app com este plano ativo.
            </p>
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/site/admin/alunos")} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || planos.length === 0 || !planoId} className="flex-1 gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {submitting ? "Cadastrando..." : "Cadastrar e enviar email"}
          </Button>
        </div>
      </form>

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
