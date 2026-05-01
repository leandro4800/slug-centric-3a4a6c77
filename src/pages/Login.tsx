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
      const [{ data: perfil }, { data: roles }] = await Promise.all([
        supabase.from("perfis").select("tenant_id, onboarding_completo").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role, tenant_id").eq("user_id", user.id),
      ]);

      const isAdmin = roles?.some((r) => r.role === "admin");
      const isCoach = roles?.some((r) => r.role === "coach");

      // Super admin AlphaCoach
      if (isAdmin && !isCoach) {
        navigate("/admin/coaches", { replace: true });
        return;
      }

      // Coach: vai para o painel do próprio tenant
      if (isCoach) {
        const coachRole = roles?.find((r) => r.role === "coach");
        let slug: string | null = null;
        if (coachRole?.tenant_id) {
          const { data: t } = await supabase
            .from("tenants")
            .select("slug")
            .eq("id", coachRole.tenant_id)
            .maybeSingle();
          slug = t?.slug ?? null;
        }
        navigate(slug ? `/${slug}/admin` : "/seja-coach", { replace: true });
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
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.18),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="relative bg-black/70 backdrop-blur-xl border border-primary/30 rounded-2xl p-8 shadow-[0_25px_80px_-15px_hsl(var(--primary)/0.45)] ring-1 ring-white/5">
          <div className="absolute -inset-px rounded-2xl pointer-events-none bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-60" />
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
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
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
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
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow h-11">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
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
