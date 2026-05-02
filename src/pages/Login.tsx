import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import loginBg from "@/assets/login-anilhas-bg.jpg";

const Login = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect logged-in user
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const [{ data: perfil }, { data: roles }, { data: ownedTenant }] = await Promise.all([
        supabase.from("perfis").select("tenant_id, onboarding_completo").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role, tenant_id").eq("user_id", user.id),
        supabase.from("tenants").select("slug, id").eq("owner_user_id", user.id).maybeSingle(),
      ]);

      const isAdmin = roles?.some((r) => r.role === "admin");
      const isCoach = roles?.some((r) => r.role === "coach") || !!ownedTenant;

      // Coach (dono de tenant ou role coach): vai direto para o painel do tenant
      if (isCoach) {
        let slug: string | null = ownedTenant?.slug ?? null;
        if (!slug) {
          const coachRole = roles?.find((r) => r.role === "coach");
          if (coachRole?.tenant_id) {
            const { data: t } = await supabase
              .from("tenants")
              .select("slug")
              .eq("id", coachRole.tenant_id)
              .maybeSingle();
            slug = t?.slug ?? null;
          }
        }
        navigate(slug ? `/${slug}/admin` : "/seja-coach", { replace: true });
        return;
      }

      // Super admin AlphaCoach (sem tenant próprio)
      if (isAdmin) {
        navigate("/admin/coaches", { replace: true });
        return;
      }

      // Aluno: precisa onboarding completo
      const { count: anamneseCount } = await supabase
        .from("anamnese_aluno")
        .select("id", { count: 'exact', head: true })
        .eq("aluno_id", user.id);

      const { count: avaliacaoCount } = await supabase
        .from("avaliacoes_fisicas")
        .select("id", { count: 'exact', head: true })
        .eq("aluno_id", user.id);

      if (!perfil?.onboarding_completo || !anamneseCount || !avaliacaoCount) {
        navigate("/onboarding", { replace: true });
        return;
      }

      // Aluno OK: vai pro tenant
      let slug = "demo";
      if (perfil?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("slug")
          .eq("id", perfil.tenant_id)
          .maybeSingle();
        slug = tenant?.slug || slug;
      }
      navigate(`/${slug}/app`, { replace: true });
    })();
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { nome_completo: nome },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Conta criada! Verifique seu e-mail.");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.18),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="relative bg-background/90 backdrop-blur-xl border border-white/10 rounded-none p-8 shadow-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-glow via-primary to-primary-glow" />
          {user ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-widest text-primary">Acessando seu Painel...</p>
            </div>
          ) : (
            <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full mb-8 bg-card p-1 rounded-none border border-white/5">
              <TabsTrigger value="login" className="rounded-none data-[state=active]:btn-premium-primary data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase tracking-widest text-xs py-3">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-none data-[state=active]:btn-premium-primary data-[state=active]:bg-primary data-[state=active]:text-white font-bold uppercase tracking-widest text-xs py-3">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ACESSAR AGORA"}
                </Button>
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email-s">E-mail</Label>
                  <Input id="email-s" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="password-s">Senha</Label>
                  <Input id="password-s" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "CRIAR CONTA ALPHA"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          AlphaCoach 1.0 · Plataforma multi-tenant para coaches
        </p>
      </div>
    </div>
  );
};

export default Login;
