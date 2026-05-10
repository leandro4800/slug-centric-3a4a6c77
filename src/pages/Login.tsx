import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import loginBg from "@/assets/login-anilhas-bg.jpg";
import { useBranding } from "@/contexts/BrandingProvider";

import { buildAuthRedirectUrl } from "@/lib/app-url";

const REDIRECT_QUERY_TIMEOUT_MS = 7000;

const withRedirectTimeout = async <T,>(promise: PromiseLike<T>, fallback: unknown, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Login] ${label} demorou demais; usando fallback seguro.`);
      resolve(fallback as T);
    }, REDIRECT_QUERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const { tenant } = useBranding();
  const { user, isLoading: authLoading, roles } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [redirectTimedOut, setRedirectTimedOut] = useState(false);

  const redeemVoucherCode = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("redeem_voucher", { _code: code });
    if (error) {
      toast.error(error.message);
      return false;
    }
    const result = data as { ok: boolean; error?: string };
    if (!result?.ok) {
      const msg = result?.error === "invalid_code" ? "Código inválido"
        : result?.error === "already_used" ? "Código já utilizado"
        : result?.error === "expired" ? "Código expirado"
        : "Não foi possível resgatar o código";
      toast.error(msg);
      return false;
    }
    toast.success("Acesso liberado!");
    return true;
  };

  const handleRedeemClick = async () => {
    const code = voucherCode.trim();
    if (!code) { toast.error("Digite o código"); return; }
    if (!user) {
      sessionStorage.setItem("pending_voucher", code);
      toast.message("Faça login ou crie sua conta — vamos liberar seu acesso automaticamente.");
      return;
    }
    setVoucherLoading(true);
    const ok = await redeemVoucherCode(code);
    setVoucherLoading(false);
    if (ok) {
      sessionStorage.removeItem("pending_voucher");
      const targetSlug = urlSlug || tenant?.slug;
      // Hard reload para o AuthProvider reler os papéis (inclui o 'aluno' recém-criado)
      window.location.assign(targetSlug ? `/${targetSlug}/app` : "/marketplace");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "1") {
      toast.success("E-mail confirmado! Faça login para continuar.");
      const url = new URL(window.location.href);
      url.searchParams.delete("confirmed");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Redirect logged-in user
  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;
    setRedirectTimedOut(false);

    const goTo = (path: string) => {
      if (!isMounted) return;
      if (location.pathname === path || location.pathname.startsWith(`${path}/`)) return;
      navigate(path, { replace: true });
    };

    (async () => {
      try {
        const timeoutId = window.setTimeout(() => {
          if (!isMounted) return;
          console.warn("[Login] Redirecionamento demorou demais, disparando fallback.");
          setRedirectTimedOut(true);
          
          if (urlSlug) {
            window.location.assign(`/${urlSlug}/app`);
          } else {
            // Se travar no login geral, pelo menos libera a tela
            setLoading(false);
          }
        }, 10000); // 10s de limite total para o redirect

        const locationState = location.state as { from?: { pathname: string }, slug?: string } | null;
        const urlSearchParams = new URLSearchParams(window.location.search);
        const redirectPath = locationState?.from?.pathname || urlSearchParams.get("redirect");
        const fallbackSlug = urlSlug || tenant?.slug;

        // 1. Busca dados do perfil e tenant em paralelo
        const [{ data: perfil }, { data: ownedTenant }] = await Promise.all([
          supabase.from("perfis").select("tenant_id").eq("id", user.id).maybeSingle(),
          supabase.from("tenants").select("slug").eq("owner_user_id", user.id).maybeSingle(),
        ]);

        window.clearTimeout(timeoutId);
        if (!isMounted) return;

        // 2. Prioridade: Coach (Dono de Tenant)
        if (ownedTenant?.slug) {
          goTo(`/${ownedTenant.slug}/app/controle`);
          return;
        }

        // 3. Processamento de Voucher/Código
        const pending = sessionStorage.getItem("pending_voucher") || urlSearchParams.get("voucher") || urlSearchParams.get("codigo") || urlSearchParams.get("v");
        
        if (pending && pending !== "1") {
          console.log("[Login] Processando voucher:", pending);
          setVoucherLoading(true);
          const ok = await redeemVoucherCode(pending);
          setVoucherLoading(false);
          sessionStorage.removeItem("pending_voucher");
          
          if (ok) {
            let targetSlug = urlSlug || tenant?.slug;
            if (!targetSlug && perfil?.tenant_id) {
               const { data: t } = await supabase.from("tenants").select("slug").eq("id", perfil.tenant_id).maybeSingle();
               if (t?.slug) targetSlug = t.slug;
            }
            if (targetSlug) {
              window.location.assign(`/${targetSlug}/app`);
              return;
            }
          }
        }

        // 4. Caminho normal: Aluno ou Admin
        if (redirectPath && !redirectPath.includes("/login") && !redirectPath.includes("voucher=1")) {
          goTo(redirectPath);
          return;
        }

        let userSlug = fallbackSlug;
        if (!userSlug && perfil?.tenant_id) {
          const { data: tenantData } = await supabase.from("tenants").select("slug").eq("id", perfil.tenant_id).maybeSingle();
          if (tenantData?.slug) userSlug = tenantData.slug;
        }

        if (userSlug && userSlug !== "demo") {
          console.log("[Login] Redirecionando para app do tenant:", userSlug);
          goTo(`/${userSlug}/app`);
          return;
        }

        // 5. Se chegamos aqui, o usuário não tem tenant vinculado nem slug na URL
        // Evita loop com o /index: se já estiver em /login sem slug, para por aqui.
        if (location.pathname === "/login") {
          setLoading(false);
          // Se o usuário não tem nada, redireciona para um lugar seguro ou marketplace se existisse
          console.log("[Login] Usuário sem destino definido.");
        } else {
          goTo("/login");
        }
      } catch (err) {
        console.error("[Login] Erro no redirecionamento:", err);
        setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [user, authLoading, roles, navigate, location.pathname, location.state, urlSlug, tenant?.slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("not confirmed") || msg.includes("confirm")) {
        toast.error("E-mail ainda não confirmado. Use 'Reenviar confirmação' abaixo.");
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Digite seu e-mail acima para reenviar a confirmação.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(urlSlug ? `/${urlSlug}/login` : "/login", { confirmed: "1" }),
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("E-mail de confirmação reenviado! Verifique sua caixa de entrada e spam.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Verifica se já existe perfil para este e-mail
    const { data: exists } = await supabase.rpc("email_is_registered", { _email: cleanEmail });
    if (exists) {
      setLoading(false);
      toast.error("Este e-mail já está cadastrado. Faça login.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
            emailRedirectTo: buildAuthRedirectUrl(urlSlug ? `/${urlSlug}/login` : "/login", { confirmed: "1" }),
        data: { 
          nome_completo: nome,
          tenant_id: tenant?.id || undefined,
          tenant_slug: urlSlug || undefined,
        },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        toast.error("Este e-mail já está cadastrado. Faça login.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    const identities = (data?.user as any)?.identities;
    if (data?.user && Array.isArray(identities) && identities.length === 0) {
      toast.error("Este e-mail já está cadastrado. Faça login.");
      return;
    }
    toast.success("Conta criada! Verifique seu e-mail e depois escolha um plano para começar.");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      {tenant?.login_video_url ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-110"
        >
          <source src={tenant.login_video_url} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{ backgroundImage: `url(${tenant?.hero_url || loginBg})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

      <div className="relative w-full max-w-md">
        <Link to={urlSlug ? `/${urlSlug}` : "/"} className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.nome} className="h-12 w-auto object-contain" />
            ) : (
              <Logo withText={false} />
            )}
            {tenant ? (
              <span className="font-display text-xl tracking-wider uppercase">
                {tenant.nome}
              </span>
            ) : (
              <span className="font-display text-xl tracking-wider">
                ALPHA<span className="text-primary">COACH</span>
              </span>
            )}
          </div>
        </Link>
        <div className="relative bg-black/10 border border-white/20 rounded-none p-8 shadow-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-glow via-primary to-primary-glow" />
          {user ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-widest text-primary">Acessando seu Painel...</p>
            </div>
          ) : (
            <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full mb-8 bg-transparent p-1 rounded-none border border-white/5">
              <TabsTrigger value="login" className="rounded-none data-[state=active]:btn-premium-primary data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px] md:text-xs py-3">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none data-[state=active]:btn-premium-primary data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px] md:text-xs py-3">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="bg-white/5 border-white/10" 
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative group">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="bg-white/5 border-white/10 pr-10 focus:ring-primary/50" 
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-all duration-200 z-10 p-1"
                      aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ACESSAR AGORA"}
                </Button>
                <div className="text-center space-y-2">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline block">
                    Esqueceu a senha?
                  </Link>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                  >
                    Reenviar e-mail de confirmação
                  </button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} className="bg-white/5 border-white/10" />
                </div>
                <div>
                  <Label htmlFor="email-s">E-mail</Label>
                  <Input 
                    id="email-s" 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="bg-white/5 border-white/10" 
                  />
                </div>
                <div>
                  <Label htmlFor="password-s">Senha</Label>
                  <div className="relative group">
                    <Input 
                      id="password-s" 
                      type={showPassword ? "text" : "password"} 
                      minLength={6} 
                      required 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="bg-white/5 border-white/10 pr-10 focus:ring-primary/50" 
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-all duration-200 z-10 p-1"
                      aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "CRIAR CONTA ALPHA"}
                </Button>
              </form>
            </TabsContent>
            </Tabs>
          )}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {tenant ? `${tenant.nome} @ Alpha Coach` : "Alpha Coach 1.0 · Plataforma multi-tenant para coaches"}
        </p>
      </div>
    </div>
  </div>
);
};

export default Login;
