import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Bot, Copy, RefreshCw, Eye, EyeOff, Loader2, ShieldAlert, Sparkles,
  MessageSquare, Terminal, CheckCircle2, ExternalLink,
} from "lucide-react";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

const TOOLS = [
  { name: "list_athletes", desc: "Lista todos os seus alunos ativos com nome, e-mail e status." },
  { name: "get_athlete_workout", desc: "Retorna o treino atual de um aluno (por nome ou e-mail)." },
  { name: "get_athlete_diet", desc: "Retorna a dieta ativa de um aluno com refeições e macros." },
  { name: "get_athlete_progress", desc: "Retorna evolução: peso, medidas e treinos concluídos." },
  { name: "get_athlete_anamnesis", desc: "Retorna a anamnese respondida pelo aluno." },
  { name: "add_athlete", desc: "Cadastra novo aluno e envia e-mail com credenciais." },
];

const IntegracaoIA = () => {
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_my_mcp_token");
      setMcpToken((data as string | null) || null);
      setLoading(false);
    })();
  }, []);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado`, description: "Cole no seu assistente de IA." });
  };

  const generate = async () => {
    setRotating(true);
    const { data, error } = await supabase.rpc("rotate_my_mcp_token");
    setRotating(false);
    if (error) return toast({ title: "Erro ao gerar token", description: error.message, variant: "destructive" });
    setMcpToken(data as string);
    setShowToken(true);
    toast({ title: "Token gerado", description: "Copie e use nas mensagens ao seu assistente." });
  };

  const rotate = async () => {
    if (!confirm("Gerar novo token? O token atual deixará de funcionar imediatamente.")) return;
    await generate();
  };


  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <AdminBackButton to="/site/admin/dashboard" />

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Negócio</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" /> Integração com IA
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Converse com o Alpha Coach diretamente pelo ChatGPT, Claude ou Cursor. Consulte treinos, dietas,
          evolução e cadastre alunos — tudo por texto natural, sem sair do seu assistente favorito.
        </p>
      </div>

      {/* Passo 1 — Token */}
      <section className="rounded-2xl border border-primary/40 bg-primary/5 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">1</div>
          <h2 className="font-display text-lg uppercase tracking-wider">Copie o seu token pessoal</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Este token identifica você. Cada coach tem o seu, e só enxerga os próprios alunos.{" "}
          <strong className="text-foreground">Informe este token diretamente nas mensagens ao assistente de IA</strong>{" "}
          (ex.: “Meu token é ...”), e não em um campo de configuração separado.
        </p>

        {mcpToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 min-w-[220px] rounded-md bg-black/60 border border-border/60 px-3 py-2.5 text-xs font-mono break-all">
                {showToken ? mcpToken : "•".repeat(Math.min(mcpToken.length, 40))}
              </code>
              <Button size="sm" variant="outline" onClick={() => setShowToken((s) => !s)} className="gap-1.5">
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showToken ? "Ocultar" : "Ver"}
              </Button>
              <Button size="sm" onClick={() => copy(mcpToken, "Token")} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
              <Button size="sm" variant="outline" onClick={rotate} disabled={rotating} className="gap-1.5">
                {rotating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Gerar novo
              </Button>
            </div>
            <div className="flex items-start gap-2 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Guarde este token como uma senha. Se vazar, clique em <strong>Gerar novo</strong> — o antigo é invalidado na hora.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem um token. Clique abaixo para gerar o seu.
            </p>
            <Button size="sm" onClick={generate} disabled={rotating} className="gap-1.5">
              {rotating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Gerar meu token
            </Button>
          </div>
        )}

      </section>

      {/* Passo 2 — URL do servidor */}
      <section className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center">2</div>
          <h2 className="font-display text-lg uppercase tracking-wider">Copie o endereço do servidor</h2>
        </div>
        <p className="text-xs text-muted-foreground">É a URL onde os assistentes vão se conectar.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="flex-1 min-w-[220px] rounded-md bg-black/40 border border-border/60 px-3 py-2.5 text-xs font-mono break-all text-primary">{MCP_URL}</code>
          <Button size="sm" onClick={() => copy(MCP_URL, "Endereço")} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copiar URL
          </Button>
        </div>
      </section>

      {/* Passo 3 — Configurar */}
      <section className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center">3</div>
          <h2 className="font-display text-lg uppercase tracking-wider">Configure no seu assistente</h2>
        </div>

        <ClientBlock
          icon={MessageSquare}
          title="ChatGPT (versão Plus / Pro)"
          steps={[
            "Abra o ChatGPT no navegador ou app.",
            "Vá em Configurações → Conectores → Adicionar novo.",
            "Cole a URL do servidor (passo 2) no campo de endereço.",
            "Não preencha campo de autenticação — não é necessário.",
            "Salve. Em qualquer chat, cole seu token (passo 1) e peça: “Meu token é [seu token]. Liste meus alunos ativos”.",
          ]}
        />

        <ClientBlock
          icon={Sparkles}
          title="Claude (Desktop / Web Pro)"
          steps={[
            "Abra Claude → Configurações → Integrações (MCP).",
            "Clique em Adicionar servidor customizado.",
            "Nome: Alpha Coach. URL: cole o endereço do passo 2.",
            "Não preencha campo de autenticação — não é necessário.",
            "Salve e teste: “Meu token é [seu token]. Mostre o treino atual do João Silva.”",
          ]}
        />

        <ClientBlock
          icon={Terminal}
          title="Cursor (para devs)"
          steps={[
            "Abra Cursor → Settings → MCP → Add server.",
            "Cole o JSON abaixo e substitua SEU_TOKEN pelo seu token real.",
          ]}
        >
          <pre className="rounded-md bg-black/60 border border-border/60 p-3 text-[11px] font-mono overflow-x-auto">{`{
  "alpha-coach": {
    "url": "${MCP_URL}",
    "headers": { "Authorization": "Bearer SEU_TOKEN_AQUI" }
  }
}`}</pre>
          <p className="text-[11px] text-amber-400/90 mt-2">
            Nota: hoje o servidor ignora o cabeçalho <code>Authorization</code>. O token precisa ser passado
            nas mensagens/prompts ao assistente (ex.: “Meu token é ...”), não no header.
          </p>
        </ClientBlock>

      </section>

      {/* O que dá pra pedir */}
      <section className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="font-display text-lg uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Exemplos de perguntas
        </h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {[
            "Liste todos os meus alunos ativos.",
            "Qual o treino da Maria Silva hoje?",
            "Mostra a dieta atual do João.",
            "Como está a evolução da Ana nos últimos 30 dias?",
            "Mostra a anamnese do Pedro.",
            "Cadastra um novo aluno: Carla Souza, carla@email.com.",
          ].map((q) => (
            <li key={q} className="flex items-start gap-2 rounded-md bg-black/30 border border-border/40 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Ferramentas disponíveis */}
      <section className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
        <h2 className="font-display text-lg uppercase tracking-wider">Ferramentas disponíveis para a IA</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOOLS.map((t) => (
            <div key={t.name} className="rounded-md border border-border/40 bg-black/30 p-3">
              <code className="text-primary text-xs font-mono">{t.name}</code>
              <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-2xl border border-dashed border-border p-6 space-y-3">
        <h2 className="font-display text-sm uppercase tracking-wider">Perguntas frequentes</h2>
        <Faq q="Custa alguma coisa?" a="Não. A integração já está incluída na sua assinatura do Alpha Coach." />
        <Faq q="Outro coach pode ver meus alunos?" a="Nunca. O token é pessoal e só enxerga o seu tenant." />
        <Faq q="A IA pode apagar aluno?" a="Não. As ferramentas atuais só leem dados e cadastram novos alunos — nada destrutivo." />
        <Faq q="E se eu perder o token?" a="Clique em Gerar novo no topo desta página. O antigo é invalidado no ato." />
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Saiba mais sobre MCP <ExternalLink className="h-3 w-3" />
        </a>
      </section>
    </div>
  );
};

const ClientBlock = ({ icon: Icon, title, steps, children }: {
  icon: any; title: string; steps: string[]; children?: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border/40 bg-black/30 p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-bold text-sm">{title}</h3>
    </div>
    <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
      {steps.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
    {children}
  </div>
);

const Faq = ({ q, a }: { q: string; a: string }) => (
  <div>
    <p className="text-sm font-bold">{q}</p>
    <p className="text-xs text-muted-foreground">{a}</p>
  </div>
);

export default IntegracaoIA;
