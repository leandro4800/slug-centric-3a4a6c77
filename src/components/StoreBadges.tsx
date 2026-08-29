import appStoreBadge from "@/assets/badge-app-store.png";
import googlePlayBadge from "@/assets/badge-google-play.png";
import { cn } from "@/lib/utils";

export const APP_STORE_URL = "https://apps.apple.com/br/app/alpha-coach-pro/id6788533682";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.alphacoachpro.app";

interface StoreBadgesProps {
  className?: string;
  size?: "sm" | "md";
}

export const StoreBadges = ({ className, size = "md" }: StoreBadgesProps) => {
  const h = size === "sm" ? "h-10" : "h-12 md:h-14";
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Baixar na App Store">
        <img
          src={appStoreBadge}
          alt="Baixar o Alpha Coach Pro na App Store"
          loading="lazy"
          className={cn(h, "w-auto transition-transform hover:scale-105")}
        />
      </a>
      <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Disponível no Google Play">
        <img
          src={googlePlayBadge}
          alt="Baixar o Alpha Coach Pro no Google Play"
          loading="lazy"
          className={cn(h, "w-auto transition-transform hover:scale-105")}
        />
      </a>
    </div>
  );
};

export default StoreBadges;
