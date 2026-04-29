import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    const init = async () => {
      // Caso 1: link PKCE -> ?code=...
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error("Link inválido ou expirado. Solicite um novo.");
        } else {
          setReady(true);
          // limpa a query string para não reusar o code
          window.history.replaceState({}, "", url.pathname);
        }
        return;
      }

      // Caso 2: link com hash (#access_token=...) — supabase processa sozinho
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
    };

    void init();
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha redefinida com sucesso!");
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.15),transparent_60%)]" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card">
          <h1 className="text-2xl font-bold mb-2">Redefinir senha</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {ready ? "Escolha uma nova senha para sua conta." : "Validando link de recuperação..."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" type="password" minLength={6} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading || !ready} className="w-full bg-gradient-primary shadow-glow h-11">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
