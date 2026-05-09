import { motion } from "framer-motion";
import { User } from "lucide-react";

export type AtributosCarta = {
  forca: number;
  hipertrofia: number;
  resistencia: number;
  mobilidade: number;
  disciplina: number;
  recuperacao: number;
};

export type CartaData = {
  nome: string;
  posicao: string;
  numero: number;
  nivel: number;
  avatar_carta_url?: string | null;
  foto_original_url?: string | null;
  atributos: AtributosCarta;
  estilo_dominante?: string | null;
  estilo_secundario?: string | null;
  bio?: string | null;
};

const ATR_LABELS: Array<{ key: keyof AtributosCarta; short: string; long: string }> = [
  { key: "forca", short: "FOR", long: "Força" },
  { key: "hipertrofia", short: "HIP", long: "Hipertrofia" },
  { key: "resistencia", short: "RES", long: "Resistência" },
  { key: "mobilidade", short: "MOB", long: "Mobilidade" },
  { key: "disciplina", short: "DIS", long: "Disciplina" },
  { key: "recuperacao", short: "REC", long: "Recuperação" },
];

const ratingColor = (n: number) => {
  if (n >= 90) return "fut-gold";
  if (n >= 80) return "fut-cyan";
  if (n >= 70) return "fut-green";
  return "text-foreground";
};

export const AthleteCard = ({ carta }: { carta: CartaData }) => {
  // Carta sempre exibe a foto real do atleta (não o avatar IA)
  const avatar = carta.foto_original_url || carta.avatar_carta_url;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateY: -8 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      whileHover={{ rotateY: 4, rotateX: -2, scale: 1.01 }}
      className="relative w-full max-w-sm mx-auto fut-card-frame fut-shine overflow-hidden"
      style={{ aspectRatio: "3/4.2", transformStyle: "preserve-3d" }}
    >
      {/* Top rating + posição */}
      <div className="absolute top-4 left-4 z-10 text-center">
        <div className={`font-display-fut text-5xl font-black leading-none fut-text-glow ${ratingColor(carta.nivel)}`}>
          {carta.nivel}
        </div>
        <div className="font-gaming text-sm tracking-widest mt-1 fut-cyan">
          ATL
        </div>
        <div className="fut-divider w-10 mx-auto mt-2" />
        <div className="font-gaming text-xs mt-2 text-muted-foreground">
          #{carta.numero}
        </div>
      </div>

      {/* Avatar central */}
      <div className="absolute inset-x-0 top-2 bottom-[42%] flex items-center justify-center pointer-events-none">
        {avatar ? (
          <img
            src={avatar}
            alt={carta.nome}
            className="h-full object-contain drop-shadow-[0_8px_30px_hsla(180_100%_50%_/_0.4)]"
          />
        ) : (
          <div className="h-32 w-32 rounded-full fut-glass flex items-center justify-center">
            <User className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Nome */}
      <div className="absolute left-0 right-0 bottom-[34%] text-center px-4">
        <div className="fut-divider mb-2" />
        <h2 className="font-display-fut text-xl font-bold uppercase truncate fut-text-glow">
          {carta.nome}
        </h2>
        <div className="fut-divider mt-2" />
      </div>

      {/* Atributos grid */}
      <div className="absolute left-0 right-0 bottom-3 px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {ATR_LABELS.map(({ key, short, long }) => {
            const val = carta.atributos?.[key] ?? 0;
            return (
              <div key={key} className="flex items-center justify-between">
                <span className={`font-display-fut text-base font-bold ${ratingColor(val)}`}>
                  {val}
                </span>
                <span className="font-gaming text-[10px] tracking-widest text-muted-foreground uppercase ml-2">
                  {short}
                </span>
                <span className="font-body-fut text-[10px] text-muted-foreground/70 ml-auto">
                  {long}
                </span>
              </div>
            );
          })}
        </div>

        {(carta.estilo_dominante || carta.estilo_secundario) && (
          <div className="mt-3 flex justify-center gap-2">
            {carta.estilo_dominante && (
              <span className="font-gaming text-[9px] uppercase tracking-widest fut-gold fut-gold-glow border border-[hsl(45_90%_60%/0.4)] px-2 py-0.5">
                {carta.estilo_dominante}
              </span>
            )}
            {carta.estilo_secundario && (
              <span className="font-gaming text-[9px] uppercase tracking-widest fut-cyan border border-[hsl(180_100%_60%/0.3)] px-2 py-0.5">
                {carta.estilo_secundario}
              </span>
            )}
          </div>
        )}
      </div>

      {/* glow corners */}
      <div className="absolute -top-px left-0 w-24 h-px bg-gradient-to-r from-[hsl(180_100%_60%)] to-transparent" />
      <div className="absolute -bottom-px right-0 w-24 h-px bg-gradient-to-l from-[hsl(150_100%_55%)] to-transparent" />
    </motion.div>
  );
};
