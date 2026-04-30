import { useEffect, useState } from "react";
import { ArrowLeft, Users, Palette, Plus, Headphones, Save, Pencil, Trash2, Star, Clapperboard, LayoutDashboard } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const parceiros = [
  { nome: "GROWTH", tag: "PIKACHU" },
  { nome: "JOIAS MAROMBA", tag: "PIKACHU" },
];

const ControleCentral = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [playlist, setPlaylist] = useState("https://open.spotify.com/playlist/1kdeP");

  return (
    <div className="px-5 pt-6 pb-32">
      <button
        onClick={() => navigate(`/${slug}/app`)}
        className="flex items-center gap-2 text-accent text-sm font-semibold uppercase tracking-widest"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-center gap-2 mt-6 text-accent">
        <Clapperboard className="h-4 w-4" />
        <span className="text-xs uppercase tracking-[0.3em]">Produção Original</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-accent leading-tight" style={{ textShadow: "0 0 30px hsl(var(--accent) / 0.4)" }}>
        CONTROLE CENTRAL: {(tenant?.nome || "TIME").toUpperCase()}
      </h1>
      <div className="h-px bg-accent/30 mt-3" />

      <div className="space-y-4 mt-6">
        <Link
          to={`/${slug}/admin`}
          className="block bg-card/40 border border-accent/30 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-accent">GERENCIAR ELENCO</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Atletas da equipe</p>
          </div>
          <span className="text-accent">→</span>
        </Link>

        <Link
          to={`/${slug}/admin/aparencia`}
          className="block bg-card/40 border border-accent/30 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Palette className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-accent">IDENTIDADE VISUAL</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Logo, cores e fontes · 1x/mês</p>
          </div>
          <span className="text-accent">→</span>
        </Link>

        <button className="w-full bg-accent text-accent-foreground font-display text-lg py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_40px_-5px_hsl(var(--accent)/0.6)]">
          <Plus className="h-5 w-5" /> LANÇAR NOVO EPISÓDIO
        </button>

        <div className="bg-card/40 border border-[hsl(142_70%_45%)]/40 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Headphones className="h-5 w-5 text-[hsl(142_70%_55%)]" />
            <p className="font-display text-base">PLAYLIST DO TREINO</p>
          </div>
          <div className="flex gap-2">
            <input
              value={playlist}
              onChange={(e) => setPlaylist(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm"
            />
            <button className="w-12 h-12 rounded-lg bg-[hsl(142_70%_45%)] flex items-center justify-center">
              <Save className="h-4 w-4 text-black" />
            </button>
          </div>
        </div>

        <div className="bg-card/40 border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-accent fill-accent" />
              <p className="font-display text-base">PARCEIROS ELITE</p>
            </div>
            <button className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Plus className="h-4 w-4 text-accent" />
            </button>
          </div>
          <div className="space-y-3">
            {parceiros.map((p) => (
              <div key={p.nome} className="flex items-center gap-3 bg-background/50 rounded-xl p-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold">
                  {p.nome.split(" ")[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{p.nome}</p>
                  <p className="text-xs text-accent">{p.tag}</p>
                </div>
                <button className="w-9 h-9 flex items-center justify-center text-accent">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="w-9 h-9 flex items-center justify-center text-[hsl(0_80%_60%)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControleCentral;
