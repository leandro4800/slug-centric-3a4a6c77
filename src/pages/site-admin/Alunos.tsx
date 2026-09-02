import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Loader2, Search, Mail, UserPlus, User, Dumbbell, Apple, Trash2, Link as LinkIcon, Copy, Check, ClipboardList } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnamneseDetails } from "@/components/aluno/AnamneseDetails";
import { toast } from "@/hooks/use-toast";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
}

interface LeadPendente {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  plano_id: string | null;
  convite_enviado_em: string | null;
}

const Alunos = () => {
  const { tenant } = useSiteTenant();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [leads, setLeads] = useState<LeadPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<Aluno | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [anamneseAluno, setAnamneseAluno] = useState<Aluno | null>(null);
  const [anamneseData, setAnamneseData] = useState<any | null>(null);
  const [anamneseLoading, setAnamneseLoading] = useState(false);


  const openAnamnese = async (a: Aluno) => {
    setAnamneseAluno(a);
    setAnamneseData(null);
    setAnamneseLoading(true);
    const { data, error } = await supabase
      .from("anamnese_aluno")
      .select("*")
      .eq("aluno_id", a.id)
      .maybeSingle();
    setAnamneseLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar anamnese", description: error.message, variant: "destructive" });
      return;
    }
    setAnamneseData(data);
  };

  const publicLink = tenant?.slug ? `https://alpha-coach.app/${tenant.slug}` : "";

  const handleCopyLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      toast({ title: "Link copiado!", description: "Compartilhe com seus alunos para assinarem um plano." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Não foi possível copiar", description: publicLink, variant: "destructive" });
    }
  };

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("perfis")
      .select("id, nome_completo, email, telefone, avatar_url")
      .eq("tenant_id", tenant.id)
      .order("nome_completo", { ascending: true });
    setAlunos((data as Aluno[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return alunos;
    return alunos.filter((a) => (a.nome_completo || "").toLowerCase().includes(t) || (a.email || "").toLowerCase().includes(t));
  }, [alunos, q]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("site-delete-aluno", {
        body: { aluno_id: toDelete.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Aluno removido",
        description: (data as any)?.unlinked_only
          ? "O aluno foi desvinculado do seu tenant (a conta dele foi preservada porque também é coach em outro lugar)."
          : "A conta do aluno foi excluída com sucesso.",
      });
      setAlunos((prev) => prev.filter((a) => a.id !== toDelete.id));
      setToDelete(null);
    } catch (e) {
      toast({
        title: "Erro ao excluir",
        description: String((e as Error).message || e),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gestão</p>
          <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter">Meus alunos</h1>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} {filtered.length === 1 ? "aluno" : "alunos"}</p>
        </div>
        <Link to="/site/admin/alunos/novo">
          <Button className="gap-2"><UserPlus className="h-4 w-4" /> Cadastrar aluno</Button>
        </Link>
      </div>

      {publicLink && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" /> Link para captar novos alunos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Envie este link para seus alunos assinarem um plano e acessarem o app automaticamente.
            </p>
            <code className="mt-2 block text-xs font-mono text-foreground bg-background/60 rounded px-2 py-1.5 break-all">
              {publicLink}
            </code>
          </div>
          <Button size="sm" onClick={handleCopyLink} className="gap-2 shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar link"}
          </Button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou email..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhum aluno cadastrado ainda.</p>
          <Link to="/site/admin/alunos/novo"><Button>Cadastrar primeiro aluno</Button></Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Aluno</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">E-mail</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Telefone</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border/40 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-primary text-xs font-bold">
                          {(a.nome_completo || a.email || "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate">{a.nome_completo || "Sem nome"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" />{a.email || "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{a.telefone || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                      <Link to={`/site/admin/treinos?aluno=${a.id}`}>
                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" title="Ver/Editar treino">
                          <Dumbbell className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link to={`/site/admin/dieta?aluno=${a.id}`}>
                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" title="Ver/Editar dieta">
                          <Apple className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        title="Ver anamnese"
                        onClick={() => openAnamnese(a)}
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        title="Excluir conta do aluno"
                        onClick={() => setToDelete(a)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta do aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{toDelete?.nome_completo || toDelete?.email}</strong> do seu painel, cancelará a assinatura no seu tenant e apagará a conta de acesso do aluno.
              <br /><br />
              Se este e-mail também for coach em outro tenant, apenas o vínculo com você será removido (a conta de coach dele é preservada).
              <br /><br />
              Essa operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Excluindo...</> : "Excluir conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!anamneseAluno} onOpenChange={(open) => { if (!open) { setAnamneseAluno(null); setAnamneseData(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anamnese — {anamneseAluno?.nome_completo || anamneseAluno?.email}</DialogTitle>
          </DialogHeader>
          {anamneseLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : anamneseData ? (
            <AnamneseDetails
              data={anamneseData}
              alunoId={anamneseAluno?.id}
              editable
              onSaved={(updated) => setAnamneseData((prev: any) => ({ ...prev, ...updated }))}
            />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Este aluno ainda não preencheu a anamnese.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alunos;
