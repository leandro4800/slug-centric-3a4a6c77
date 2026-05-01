import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SevenDobrasIntroProps {
  name: string;
  avatarUrl?: string | null;
  onComplete: () => void;
}

export const SevenDobrasIntro = ({ name, avatarUrl, onComplete }: SevenDobrasIntroProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500); // Wait for exit animation
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 border-primary/20 shadow-2xl">
              <img
                src={avatarUrl || "/placeholder.svg"}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 1.2, duration: 1 }}
              className="absolute -bottom-2 left-0 h-1 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"
            />
          </motion.div>
          
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-6 font-display text-2xl md:text-3xl text-foreground uppercase tracking-widest"
          >
            {name}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="mt-2 text-primary text-xs font-bold tracking-[0.4em] uppercase"
          >
            Protocolo 7 Dobras
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
