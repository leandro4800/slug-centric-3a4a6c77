import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Logo } from "@/components/Logo";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import loginBg from "@/assets/login-anilhas-bg.jpg";
import { useBranding } from "@/contexts/BrandingProvider";
import { readTenantBrandingCache } from "@/lib/tenant-branding-cache";
import { isSafeTenantSlug, readFallbackTenantSlug } from "@/lib/tenant-slug";
import { readStartupBranding } from "@/lib/startup-branding";
import { useAuth } from "@/hooks/use-auth";

import { buildAuthRedirectUrl } from "@/lib/app-url";
import {
  defaultRememberLogin,
  loadSavedLoginCredentials,
  saveLoginCredentials,
} from "@/lib/login-credentials";
import { stashAuthRolesPrefetch, type PrefetchedRole } from "@/lib/auth-roles-prefetch";

const getSafeAppSlug = (slug?: string | null) => {
  if (!slug || !/^[a-z0-9-]+$/i.test(slug) || slug === "index" || slug === "demo") return null;
  return slug;
};

const Login = () => {
  const navigate = useNavigate();
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const { tenant } = useBranding();
  const startupBranding = readStartupBranding();
  const brandingSlug =
    (urlSlug && isSafeTenantSlug(urlSlug) ? urlSlug : null) ?? readFallbackTenantSlug();
  const cachedTenant = brandingSlug ? readTenantBrandingCache(brandingSlug) : null;
  const displayTenant =
    tenant ??
    cachedTenant ??
    (startupBranding
      ? {
          nome: startupBranding.nome,
          logo_url: startupBranding.logo_url,
          hero_url: startupBranding.hero_url ?? null,
          login_video_url: null,
        }
      : null);
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(defaultRememberLogin());
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadSavedLoginCredentials().then((saved) => {
      if (cancelled || !saved) return;
      setEmail(saved.email);
      if (saved.password) setPassword(saved.password);
      setRememberLogin(saved.remember);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  type Resolution = { destination: string; ownerRedirect?: boolean };

  const resolveAppDestination = async (userId: string): Promise<Resolution> => {
    // Fonte autoritativa: o banco resolve o tenant da conta autenticada sem
    // depender do slug que ficou salvo/aberto no app nativo.
    const { data: destinationRows, error: destinationError } = await supabase.rpc("get_my_app_destination");
    const databaseDestination = destinationRows?.[0];
    const databaseSlug = getSafeAppSlug(databaseDestination?.tenant_slug);
    const contextSlug = getSafeAppSlug(urlSlug || tenant?.slug);

    if (databaseSlug) {
      if (databaseDestination.account_role) {
        stashAuthRolesPrefetch([{
          role: databaseDestination.account_role as PrefetchedRole["role"],
          tenant_id: databaseDestination.tenant_id,
        }]);
      }

      return {
        destination: `/${databaseSlug}/app`,
        ownerRedirect: Boolean(contextSlug && contextSlug !== databaseSlug),
      };
    }

    if (destinationError) {
      console.error("[Login] Falha na resolução autoritativa do tenant; usando compatibilidade:", destinationError);
    }

    // Compatibilidade temporária para instalações conectadas antes da função
    // autoritativa existir no banco.
    const [{ data: ownedTenant }, { data: roleRows }, { data: alunoRow }, { data: perfilRow }] = await Promise.all([
      supabase.from("tenants").select("slug").eq("owner_user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role, tenant_id, tenants:tenant_id(slug)").eq("user_id", userId),
      supabase.from("alunos").select("tenants:tenant_id(slug)").eq("id", userId).maybeSingle(),
      supabase.from("perfis").select("tenants:tenant_id(slug)").eq("id", userId).maybeSingle(),
    ]);

    const prefetchedRoles: PrefetchedRole[] = [];
    if (ownedTenant?.slug) {
      prefetchedRoles.push({ role: "coach", tenant_id: null });
    }
    for (const row of roleRows ?? []) {
      prefetchedRoles.push({ role: row.role as PrefetchedRole["role"], tenant_id: row.tenant_id });
    }
    if (prefetchedRoles.length) stashAuthRolesPrefetch(prefetchedRoles);

    // 1) Dono de tenant SEMPRE entra no próprio app — nunca no app de outro coach.
    if (ownedTenant?.slug) {
      const ownSlug = getSafeAppSlug(ownedTenant.slug);
      if (!ownSlug) return { destination: "/onboarding" };
      return {
        destination: `/${ownSlug}/app`,
        ownerRedirect: Boolean(contextSlug && contextSlug !== ownSlug),
      };
    }

    // 2) Aluno: só entra onde tem vínculo.
    const alunoSlugs = new Set<string>();
    for (const r of (roleRows as any[] | null) ?? []) {
      if (r.role !== "aluno") continue;
      const s = getSafeAppSlug(r?.tenants?.slug);
      if (s) alunoSlugs.add(s);
    }
    const alunoTableSlug = getSafeAppSlug((alunoRow as any)?.tenants?.slug);
    if (alunoTableSlug) alunoSlugs.add(alunoTableSlug);
    const perfilTenantSlug = getSafeAppSlug((perfilRow as any)?.tenants?.slug);
    if (perfilTenantSlug) alunoSlugs.add(perfilTenantSlug);

    if (contextSlug) {
      if (alunoSlugs.has(contextSlug)) return { destination: `/${contextSlug}/app` };
      // A tela de login aberta nunca define o app do atleta. Se ele pertence a
      // outro coach, abre diretamente o tenant persistido no banco.
      if (alunoSlugs.size >= 1) {
        const own = Array.from(alunoSlugs)[0];
        return { destination: `/${own}/app`, ownerRedirect: true };
      }
      return { destination: "/onboarding" };
    }


    if (alunoSlugs.size >= 1) {
      const first = Array.from(alunoSlugs)[0];
      return { destination: `/${first}/app` };
    }

    return { destination: "/onboarding" };
  };

  const applyResolution = async (res: Resolution) => {
    if (res.ownerRedirect) {
      toast.info("Abrindo o app onde sua conta está cadastrada.");
    }

    navigate(res.destination, { replace: true });
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // A rota de login também funciona como troca de conta. Limpa sempre a
      // sessão e os caches da conta anterior, mesmo quando o React ainda não
      // restaurou `user` no primeiro frame do app nativo.
      await supabase.auth.signOut({ scope: "local" });
      try {
        sessionStorage.removeItem("startup_navigation_memory_v1");
        sessionStorage.removeItem("auth_roles_prefetch_v1");
        Object.keys(localStorage)
          .filter((key) => key.startsWith("tenant_member:") || key.startsWith("subscription_guard:"))
          .forEach((key) => localStorage.removeItem(key));
      } catch {}

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        const msg = error.message?.toLowerCase() || "";
        if (msg.includes("not confirmed") || msg.includes("confirm")) {
          toast.error("E-mail ainda não confirmado. Use 'Reenviar confirmação' abaixo.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const userId = signInData?.user?.id;
      if (!userId) {
        navigate("/onboarding", { replace: true });
        return;
      }

      const res = await resolveAppDestination(userId);
      void saveLoginCredentials(email, password, rememberLogin);
      if (res.ownerRedirect) {
        toast.info("Abrindo o app onde sua conta está cadastrada.");
      }

      // Recarrega no tenant correto para que AuthProvider, BrandingProvider e
      // os guards nasçam juntos com a nova conta. Isso evita que o tenant da
      // sessão anterior sobreviva durante a troca de usuário no app instalado.
      window.location.replace(res.destination);

    } catch (err) {
      console.error("[Login] Erro inesperado:", err);
      toast.error("Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
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


  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      {displayTenant?.login_video_url ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-110 lg:block hidden"
        >
          <source src={displayTenant.login_video_url} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 lg:block hidden"
          style={{ backgroundImage: `url(${displayTenant?.hero_url || loginBg})` }}
        />
      )}
      
      {/* Background for mobile/tablet when video is inside the container */}
      <div 
        className="absolute inset-0 bg-cover bg-center scale-110 lg:hidden block"
        style={{ backgroundImage: `url(${displayTenant?.hero_url || loginBg})` }}
      />

      <div className="absolute inset-0 bg-black/60 lg:bg-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            {displayTenant?.logo_url ? (
              <img src={displayTenant.logo_url} alt={displayTenant.nome} className="h-12 w-auto object-contain" />
            ) : (
              <Logo withText={false} />
            )}
            {displayTenant ? (
              <span className="font-display text-xl tracking-wider uppercase">
                {displayTenant.nome}
              </span>
            ) : (
              <span className="font-display text-xl tracking-wider">
                ALPHA<span className="text-primary">COACH</span> PRO
              </span>
            )}
          </div>
        </div>
        <div className="relative bg-black/40 lg:bg-black/10 border border-white/20 rounded-none shadow-card overflow-hidden min-h-screen lg:min-h-[400px] flex flex-col">
          {/* Responsive Video Container for Mobile/Tablet */}
          {displayTenant?.login_video_url && (
            <div className="lg:hidden absolute inset-0 z-0">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src={displayTenant.login_video_url} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/40" />
            </div>
          )}

          <div className="p-8 relative z-10 flex-1 flex flex-col justify-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-glow via-primary to-primary-glow" />
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
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(e) => setRememberLogin(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-primary"
              />
              Lembrar meus dados neste dispositivo
            </label>
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
            <p className="text-center text-xs text-muted-foreground mt-6">
              {displayTenant ? `${displayTenant.nome} @ Alpha Coach` : "Alpha Coach 1.0 · Plataforma multi-tenant para coaches"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
