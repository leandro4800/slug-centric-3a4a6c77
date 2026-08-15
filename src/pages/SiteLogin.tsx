import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

/**
 * Login exclusivo do SITE (alpha-coach.app/site).
 * Direciona o coach para o painel ADMIN do seu tenant (não para o app do aluno).
 * Alunos não devem usar este painel — eles entram pelo aplicativo.
 */
const SiteLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const rawNext = params.get("next");
  const redirectTo =
    params.get("redirect") || (rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const userId = signInData?.user?.id;
    if (!userId) {
      setLoading(false);
      toast.error("Não foi possível autenticar.");
      return;
    }

    // Se há redirect explícito (ex: continuar fluxo /seja-coach), respeita.
    if (redirectTo && redirectTo.startsWith("/")) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Verifica se é dono de algum tenant (coach) — com retry para não
    // derrubar o coach por uma falha momentânea de rede.
    let ownedSlug: string | null = null;
    let lookupFailed = false;
    const delays = [0, 700, 1500];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
      const { data, error: err } = await supabase
        .from("tenants")
        .select("slug")
        .eq("owner_user_id", userId)
        .limit(1)
        .maybeSingle();
      if (!err) {
        ownedSlug = data?.slug ?? null;
        lookupFailed = false;
        break;
      }
      lookupFailed = true;
      console.warn("[SiteLogin] Falha ao verificar painel do coach:", err.message);
    }

    setLoading(false);

    if (ownedSlug) {
      navigate(`/site/admin/dashboard`, { replace: true });
      return;
    }

    if (lookupFailed) {
      // Não desloga: pode ser instabilidade de rede. Deixa entrar no painel,
      // que também valida o acesso e oferece "tentar novamente".
      navigate(`/site/admin/dashboard`, { replace: true });
      return;
    }

    // Não é coach — desloga e orienta a usar o app
    await supabase.auth.signOut();
    toast.error(
      "Este painel é exclusivo para coaches. Alunos devem entrar pelo aplicativo Alpha Coach."
    );

  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.15),transparent_70%)]" />

      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/site" className="flex items-center gap-3">
            <Logo withText={false} />
            <span className="font-display text-xl tracking-wider">
              ALPHA<span className="text-primary">COACH</span> PRO
            </span>
          </Link>
        </div>

        <div className="relative bg-black/40 border border-white/20 rounded-none shadow-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-glow via-primary to-primary-glow" />
          <div className="p-8">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl tracking-widest uppercase">
                Painel do Coach
              </h1>
              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">
                Acesso ao painel admin do seu site
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 pr-10"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white p-1"
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ACESSAR PAINEL"}
              </Button>

              <div className="text-center space-y-2 pt-2">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline block">
                  Esqueceu a senha?
                </Link>
                <p className="text-xs text-muted-foreground">
                  Ainda não tem conta de coach?{" "}
                  <Link to="/seja-coach" className="text-primary hover:underline font-bold">
                    Testar por R$ 1
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-6 uppercase tracking-widest">
          Alunos: usem o aplicativo Alpha Coach para entrar
        </p>
      </div>
    </div>
  );
};

export default SiteLogin;
