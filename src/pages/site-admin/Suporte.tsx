import { useEffect, useState } from "react";
import {
  LifeBuoy, MessageCircle, ExternalLink, PlayCircle, Plus, Pencil, Trash2, Mail,
} from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import ExercisePlayer from "@/components/aluno/ExercisePlayer";
import { toast } from "sonner";

const EMAIL = "alphacoachapp@gmail.com";

type Tutorial = {
  id: string;
  titulo: string;
  descricao: string | null;
  conteudo: string | null;
  video_url: string | null;
  ordem: number;
  ativo: boolean;
};

/** Guia fixo — dúvidas mais comuns dos coaches sobre o painel. */
const GUIA = [
  {
    titulo: "Como começo a usar o painel?",
    texto: [
      "1. Em Negócio → Aparência, envie sua logo e ajuste as cores da sua marca.",
      "2. Em Negócio → Meus Planos, defina os valores e a periodicidade das assinaturas.",
      "3. Em Negócio → Landing page, personalize a página que você envia para captar alunos.",
      "4. Em Alunos → Cadastrar aluno, adicione seu primeiro aluno (ou envie o link de captação).",
    ],
  },
  {
    titulo: "Como cadastrar alunos e enviar o acesso?",
    texto: [
      "Em Alunos → Cadastrar aluno você pode preencher manualmente ou usar a IA (envie um print da conversa/ficha e ela preenche os campos).",
      "Se você é coach parceiro, a conta do aluno é criada na hora e a senha padrão é o primeiro nome + 2026 (ex.: samila2026). O aluno recebe tudo por e-mail.",
      "Se você não é parceiro, o aluno entra como 'Aguardando pagamento' e a conta é criada automaticamente assim que ele assina pela sua landing page.",
      "Na tela Alunos há também o link de captação para enviar direto no WhatsApp.",
    ],
  },
  {
    titulo: "Como montar treino com IA?",
    texto: [
      "Em Programação → Montar treino, escolha o aluno, o objetivo (Bulking, Cutting ou Recomposição Corporal) e a frequência semanal.",
      "Escolha uma divisão pronta ou use 'Editar divisão livremente' para montar do zero.",
      "A IA respeita as lesões informadas na anamnese e nunca prescreve exercícios contraindicados.",
      "Revise os exercícios, reordene pelo campo numérico, confira os vídeos e clique em Confirmar e enviar para o aluno.",
    ],
  },
  {
    titulo: "Como montar a dieta?",
    texto: [
      "Em Programação → Montar dieta, selecione o aluno e o objetivo. A IA usa a tabela TACO para calcular os macros.",
      "Você pode trocar alimentos manualmente e clicar em Recalcular macros — as descrições das refeições acompanham a troca.",
      "Preferências e alimentos que o aluno ama entram como refeição livre 1x por semana.",
    ],
  },
  {
    titulo: "Avaliação física — 7 dobras",
    texto: [
      "Em Programação → Avaliação física, clique em Nova avaliação e escolha o protocolo de 7 dobras (Jackson & Pollock).",
      "Você pode importar uma foto/print da ficha e a IA preenche as dobras automaticamente.",
      "A altura aceita formatos como 178, 1,78 ou 1.78m.",
    ],
  },
  {
    titulo: "Exercícios & vídeos",
    texto: [
      "Em Programação → Exercícios & vídeos você monta sua biblioteca com links do YouTube/Instagram.",
      "Esses vídeos aparecem para o aluno dentro do card do exercício no app, e no botão 'Ver vídeo' durante a montagem do treino.",
    ],
  },
  {
    titulo: "Financeiro e assinatura",
    texto: [
      "Em Negócio → Financeiro você acompanha os pagamentos dos seus alunos e os repasses.",
      "Coaches parceiros recebem o valor integral dos alunos; as taxas são repassadas ao aluno no checkout.",
      "Em Minha conta você consulta o status da sua própria assinatura da plataforma.",
    ],
  },
  {
    titulo: "O aluno não consegue entrar. O que faço?",
    texto: [
      "Confirme se o aluno está usando o link do SEU app (alpha-coach.app/seu-slug) — o login é separado por coach.",
      "Peça para usar 'Esqueci a senha' na tela de login e checar o spam.",
      "Se continuar, envie o e-mail do aluno para " + EMAIL + " que resolvemos.",
    ],
  },
];

const emptyForm = { titulo: "", descricao: "", conteudo: "", video_url: "", ordem: 0, ativo: true };

const Suporte = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [tutoriais, setTutoriais] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tutorial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState<Tutorial | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("suporte_tutoriais" as any)
      .select("id, titulo, descricao, conteudo, video_url, ordem, ativo")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    setTutoriais(((data as any) || []) as Tutorial[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, ordem: tutoriais.length });
    setOpen(true);
  };

  const openEdit = (t: Tutorial) => {
    setEditing(t);
    setForm({
      titulo: t.titulo,
      descricao: t.descricao || "",
      conteudo: t.conteudo || "",
      video_url: t.video_url || "",
      ordem: t.ordem,
      ativo: t.ativo,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.titulo.trim()) { toast.error("Informe o título."); return; }
    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      conteudo: form.conteudo.trim() || null,
      video_url: form.video_url.trim() || null,
      ordem: Number(form.ordem) || 0,
      ativo: form.ativo,
    };
    const { error } = editing
      ? await supabase.from("suporte_tutoriais" as any).update(payload).eq("id", editing.id)
      : await supabase.from("suporte_tutoriais" as any).insert(payload as any);
    setSaving(false);
    if (error) { toast.error("Não foi possível salvar."); return; }
    toast.success(editing ? "Tutorial atualizado." : "Tutorial adicionado.");
    setOpen(false);
    load();
  };

  const remove = async (t: Tutorial) => {
    if (!confirm(`Excluir "${t.titulo}"?`)) return;
    const { error } = await supabase.from("suporte_tutoriais" as any).delete().eq("id", t.id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    toast.success("Tutorial excluído.");
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>

      <header className="text-center">
        <LifeBuoy className="h-10 w-10 text-primary mx-auto mb-2" />
        <h1 className="font-display text-3xl uppercase italic tracking-tighter">Suporte</h1>
        <p className="text-sm text-muted-foreground">
          Guia completo do painel, tutoriais em vídeo e contato direto com o time Alpha Coach Pro.
        </p>
      </header>

      {/* Guia do painel */}
      <section className="rounded-2xl border border-border/50 bg-card p-5">
        <h2 className="font-display text-sm uppercase tracking-wider mb-3">Guia do painel — dúvidas frequentes</h2>
        <Accordion type="single" collapsible className="w-full">
          {GUIA.map((g, i) => (
            <AccordionItem key={g.titulo} value={`g-${i}`}>
              <AccordionTrigger className="text-sm text-left">{g.titulo}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {g.texto.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Tutoriais em vídeo */}
      <section className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-sm uppercase tracking-wider">Tutoriais em vídeo</h2>
          {isAdmin && (
            <Button size="sm" onClick={openNew} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar vídeo
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : tutoriais.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? "Nenhum tutorial ainda. Clique em “Adicionar vídeo” para publicar o primeiro."
              : "Novos tutoriais em vídeo serão publicados aqui em breve."}
          </p>
        ) : (
          <div className="space-y-3">
            {tutoriais.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold flex items-center gap-2">
                      {t.titulo}
                      {!t.ativo && (
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                          Rascunho
                        </span>
                      )}
                    </p>
                    {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.video_url && (
                      <Button size="sm" variant="ghost" className="gap-1 text-primary" onClick={() => setPlaying(t)}>
                        <PlayCircle className="h-4 w-4" /> Assistir
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(t)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {t.conteudo && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line border-t border-border/40 pt-2">
                    {t.conteudo}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contato */}
      <section className="grid sm:grid-cols-2 gap-4">
        <a
          href={`mailto:${EMAIL}?subject=Suporte%20Coach%20Alpha%20Coach%20Pro`}
          className="group rounded-2xl border border-border/50 bg-card p-5 hover:border-primary transition-colors"
        >
          <Mail className="h-6 w-6 text-primary mb-2" />
          <p className="font-bold text-sm">Suporte por e-mail</p>
          <p className="text-xs text-muted-foreground">{EMAIL} — resposta em até 48h úteis.</p>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary mt-3">
            Enviar <ExternalLink className="h-3 w-3" />
          </span>
        </a>
        <a
          href="https://wa.me/" target="_blank" rel="noreferrer"
          className="group rounded-2xl border border-border/50 bg-card p-5 hover:border-primary transition-colors"
        >
          <MessageCircle className="h-6 w-6 text-primary mb-2" />
          <p className="font-bold text-sm">Suporte via WhatsApp</p>
          <p className="text-xs text-muted-foreground">Canal oficial — fale com o time Alpha Coach Pro.</p>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary mt-3">
            Abrir <ExternalLink className="h-3 w-3" />
          </span>
        </a>
      </section>

      {/* Player */}
      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider text-base">
              {playing?.titulo}
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-video">
            {playing?.video_url && (
              <ExercisePlayer videoUrl={playing.video_url} exerciseName={playing.titulo} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Form admin */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider text-base">
              {editing ? "Editar tutorial" : "Novo tutorial"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição curta</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Link do vídeo (YouTube, Instagram ou MP4)</Label>
              <Input
                placeholder="https://youtube.com/watch?v=..."
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Explicação em texto (opcional)</Label>
              <Textarea
                rows={5}
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-1 w-24">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <span className="text-xs text-muted-foreground">Publicado</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suporte;
