import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

type Props = {
  children: React.ReactNode;
  /** Cor base em HSL "H S% L%" — ex: "0 85% 50%" (vermelho Netflix). */
  hue?: string;
};

/**
 * Carta holográfica com 3 camadas:
 *  1. Inclinação 3D suave seguindo o mouse
 *  2. Brilho pulsante atrás da carta
 *  3. Shimmer holográfico diagonal no hover
 */
export const HolographicCard = ({ children, hue = "0 85% 50%" }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [12, -12]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: "1000px" }} className="flex justify-center w-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleLeave}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={handleLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="relative w-full max-w-sm cursor-pointer"
      >
        {/* CAMADA 1 — brilho pulsante atrás */}
        <motion.div
          className="absolute -inset-3 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: isHovered
              ? `0 0 30px hsl(${hue} / 0.7), 0 0 60px hsl(${hue} / 0.35), 0 0 100px hsl(${hue} / 0.15)`
              : `0 0 15px hsl(${hue} / 0.4), 0 0 40px hsl(${hue} / 0.15)`,
          }}
          transition={{ duration: 0.4 }}
        />

        {/* corpo da carta — translateZ dá profundidade */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ transform: "translateZ(20px)" }}
        >
          {/* CAMADA 2 — flash inicial ao montar */}
          <motion.div
            className="absolute inset-0 z-20 pointer-events-none"
            initial={{
              opacity: 0.7,
              background: `linear-gradient(135deg, hsl(${hue} / 0.55), transparent 60%)`,
            }}
            animate={{ opacity: 0 }}
            transition={{ delay: 0.5, duration: 0.9 }}
          />

          {/* CAMADA 3 — shimmer holográfico no hover */}
          <motion.div
            className="absolute inset-0 z-10 pointer-events-none mix-blend-screen"
            animate={{
              background: isHovered
                ? `linear-gradient(105deg, transparent 20%, hsl(${hue} / 0.20) 45%, hsl(0 0% 100% / 0.12) 55%, transparent 80%)`
                : "transparent",
            }}
            transition={{ duration: 0.3 }}
          />

          {/* conteúdo */}
          <div className="relative z-[5]">{children}</div>
        </div>
      </motion.div>
    </div>
  );
};

export default HolographicCard;
