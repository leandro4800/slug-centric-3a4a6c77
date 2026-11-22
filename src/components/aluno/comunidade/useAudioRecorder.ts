import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_MAX_SEG, microfoneErro, pickAudioMime } from "@/lib/comunidade-audio";

export interface GravacaoAudio {
  blob: Blob;
  mime: string;
  duracaoSeg: number;
}

/** Grava áudio com MediaRecorder (web e WebView do app), com timer e limite. */
export const useAudioRecorder = (onMaxReached?: () => void) => {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inicioRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxRef = useRef(onMaxReached);
  maxRef.current = onMaxReached;

  const limpar = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setGravando(false);
    setSegundos(0);
  }, []);

  useEffect(() => () => {
    try {
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
    } catch {
      /* noop */
    }
    limpar();
  }, [limpar]);

  /** Pede o microfone e começa a gravar. Lança erro com mensagem amigável. */
  const iniciar = useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error(microfoneErro({ name: "Unsupported" }));
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      throw new Error(microfoneErro(e));
    }
    const mime = pickAudioMime((t) => MediaRecorder.isTypeSupported(t));
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    streamRef.current = stream;
    recorderRef.current = rec;
    rec.start(250);
    inicioRef.current = Date.now();
    setSegundos(0);
    setGravando(true);
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - inicioRef.current) / 1000);
      setSegundos(s);
      if (s >= AUDIO_MAX_SEG) maxRef.current?.();
    }, 250);
  }, []);

  /** Para e devolve o áudio gravado. */
  const parar = useCallback(
    () =>
      new Promise<GravacaoAudio | null>((resolve) => {
        const rec = recorderRef.current;
        if (!rec) return resolve(null);
        const duracaoSeg = Math.max(0, Math.round((Date.now() - inicioRef.current) / 1000));
        rec.onstop = () => {
          const mime = rec.mimeType || chunksRef.current[0]?.type || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mime });
          chunksRef.current = [];
          limpar();
          resolve(blob.size > 0 ? { blob, mime, duracaoSeg } : null);
        };
        try {
          rec.stop();
        } catch {
          limpar();
          resolve(null);
        }
      }),
    [limpar]
  );

  const cancelar = useCallback(() => {
    const rec = recorderRef.current;
    if (rec) {
      rec.onstop = null;
      rec.ondataavailable = null;
      try {
        rec.state !== "inactive" && rec.stop();
      } catch {
        /* noop */
      }
    }
    chunksRef.current = [];
    limpar();
  }, [limpar]);

  return { gravando, segundos, iniciar, parar, cancelar };
};
