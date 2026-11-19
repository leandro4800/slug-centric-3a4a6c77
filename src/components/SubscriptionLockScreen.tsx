"use client";

import { Lock, Rocket, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const SubscriptionLockScreen = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background Aesthetics */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 mb-4 animate-bounce">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-4xl font-['Anton'] uppercase italic tracking-tighter leading-none">
            ÁREA <span className="text-primary">PROTEGIDA</span>
          </h2>
          <p className="text-white/60 text-sm uppercase tracking-[0.2em] font-bold">Acesso Exclusivo Aluno</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Rocket className="h-32 w-32 -rotate-12" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-bold italic uppercase tracking-tight">
              Acesso Pendente
            </h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Este aplicativo contém conteúdo restrito para alunos ativos. Se você já faz parte do time, entre em contato diretamente com o seu Coach para que ele ative seu acesso pelo painel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Treino App</span>
            </div>
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Dieta Online</span>
            </div>
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleGoBack}
              className="w-full h-14 rounded-2xl bg-white/10 text-white hover:bg-white/20 font-['Anton'] text-xl uppercase italic tracking-wider gap-3"
            >
              Voltar à Tela Anterior
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};