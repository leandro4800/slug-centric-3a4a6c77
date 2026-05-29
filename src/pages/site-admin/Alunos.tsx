import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Mail, UserPlus, User } from "lucide-react";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
}

const Alunos = () => {
  const { tenant } = useSiteTenant();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!tenant?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("perfis")
        .select("id, nome_completo, email, telefone, avatar_url")
        .eq("tenant_id", tenant.id)
        .order("nome_completo", { ascending: true });
      setAlunos((data as Aluno[]) || []);
      setLoading(false);
    })();
  }, [tenant?.id]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return alunos;
    return alunos.filter((a) => (a.nome_completo || "").toLowerCase().includes(t) || (a.email || "").toLowerCase().includes(t));
  }, [alunos, q]);

  return (
    <div className="p-4 md:p-8 space-y-6">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Alunos;
