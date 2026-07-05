import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";
import { Loader2, UserPlus, Mail, CheckCircle2 } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("site-create-aluno", {
        body: {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone.trim() || null,
          plano_id: planoId || null,
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

        {planos.length > 0 && (
          <div>
            <Label htmlFor="plano">Plano (opcional)</Label>
            <select
              id="plano"
              value={planoId}
              onChange={(e) => setPlanoId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sem plano atribuído</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {(p.preco_centavos / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/site/admin/alunos")} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1 gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {submitting ? "Cadastrando..." : "Cadastrar e enviar email"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NovoAluno;
