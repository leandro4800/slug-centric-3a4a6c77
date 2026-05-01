import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
};

export const isDirectVideo = (url: string | null | undefined) =>
  !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
