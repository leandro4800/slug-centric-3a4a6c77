import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const regexes = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})/i,
  ];
  for (const regex of regexes) {
    const match = url.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
};

export const isDirectVideo = (url: string | null | undefined) =>
  !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
