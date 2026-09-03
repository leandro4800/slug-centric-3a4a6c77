import defaultCoachVideo from "@/assets/videopadrao.mp4";

export const DEFAULT_COACH_VIDEO = defaultCoachVideo;

export function coachVideoOrDefault(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed || DEFAULT_COACH_VIDEO;
}
