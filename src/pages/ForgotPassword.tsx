import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("E-mail de recuperação enviado!");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.15),transparent_60%)]" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8"><Logo /></Link>
        <div className="relative bg-background/90 backdrop-blur-xl border border-white/10 rounded-none p-8 shadow-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-glow via-primary to-primary-glow" />
          <h1 className="text-2xl font-black mb-2 uppercase tracking-tighter italic">Esqueceu a senha?</h1>
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-widest text-[10px] font-bold">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
          {sent ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground border-l-2 border-primary pl-4 py-2 bg-white/5">
                Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada e o spam.
              </div>
              <Button asChild variant="outline" className="w-full h-12">
                <Link to="/login"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] uppercase tracking-widest font-black text-white/60">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-none focus-visible:ring-primary" />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 font-black uppercase tracking-widest">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-xs uppercase tracking-widest font-black text-primary hover:underline flex items-center justify-center gap-2">
                  <ArrowLeft className="h-3 w-3" /> Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
