import { Play, Camera, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import heroDefault from "@/assets/hero-default.jpg";

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  const hero = tenant?.hero_url || heroDefault;
  const nome = user?.user_metadata?.nome_completo || user?.email?.split("@")[0]?.toUpperCase() || "ATLETA";

  const handleLogout = async () => { await signOut(); navigate("/login"); };

  return (
    <>
      {/* Hero estilo Netflix */}
      <section className="relative h-[60vh] min-h-[450px] -mt-0">
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">FILME</span>
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Meu Perfil</span>
          </div>
          <h1 className="font-display text-5xl leading-none">{nome.toUpperCase()}</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[hsl(142_70%_55%)] font-semibold">98% compatível</span>
            <span className="text-muted-foreground">2026</span>
            <span className="px-2 py-0.5 border border-muted-foreground/40 rounded text-xs">INTERMEDIÁRIO</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="text-foreground">Ganhar Massa Muscular</span>
            <span className="px-2 py-0.5 border border-muted-foreground/40 rounded text-xs">HDR</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 max-w-md">
            {user?.email}. Atleta focado em ganhar massa muscular, atualmente com 99kg e 0% de gordura corporal. Pronto para a próxima…
          </p>

          <div className="flex gap-3 pt-2">
            <button className="bg-white text-black font-semibold px-6 py-3 rounded-md flex items-center gap-2 flex-1 justify-center">
              <Play className="h-4 w-4 fill-current" /> Salvar
            </button>
            <button className="bg-secondary/80 text-foreground font-semibold px-6 py-3 rounded-md flex items-center gap-2 flex-1 justify-center">
              <Camera className="h-4 w-4" /> Trocar Foto
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-full bg-secondary/70 flex items-center justify-center mt-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="font-display text-xl mb-3">RESUMO</h2>
        <div className="grid grid-cols-2 gap-3">
          <NetflixCard label="PESO" value="99 kg" />
          <NetflixCard label="GORDURA" value="0%" />
          <NetflixCard label="META" value="HIPERTROFIA" />
          <NetflixCard label="NÍVEL" value="INTERMEDIÁRIO" />
        </div>
      </section>
    </>
  );
};

const NetflixCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card/40 border border-border rounded-xl p-4">
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="font-display text-xl mt-1">{value}</p>
  </div>
);

export default Perfil;
