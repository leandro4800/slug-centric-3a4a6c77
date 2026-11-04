import { useLayoutEffect, useSyncExternalStore } from "react";

/**
 * Telas que já desenham a própria seta de voltar avisam aqui enquanto estão
 * montadas. Assim o botão flutuante não aparece por cima do título da tela.
 */
let owners = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const hasOwner = () => owners > 0;

/** A tela atual mostra a própria seta de voltar. */
export function useOwnBackButton(own = true) {
  useLayoutEffect(() => {
    if (!own) return;
    owners += 1;
    notify();
    return () => {
      owners -= 1;
      notify();
    };
  }, [own]);
}

/** true quando a tela montada já tem a própria seta de voltar. */
export function useHasOwnBackButton() {
  return useSyncExternalStore(subscribe, hasOwner, hasOwner);
}
