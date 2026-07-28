import { useBranding } from "@/contexts/BrandingProvider";
import alphaCoachProLogo from "@/assets/alphacoach-pro-logo.jpg.asset.json";

const DEFAULT_LOGO_SRC = alphaCoachProLogo.url;

export const Logo = ({ size = 36, withText = true }: { size?: number; withText?: boolean }) => {
  const { tenant } = useBranding();
  const src = tenant?.logo_url || DEFAULT_LOGO_SRC;
  const name = tenant?.nome || "ALPHACOACH PRO";
  const isDefault = !tenant?.logo_url;

  return (
    <div className="flex items-center gap-3">
      <img
        src={src}
        alt={name}
        width={isDefault ? size * 1.2 : size}
        height={isDefault ? size * 1.2 : size}
        className="rounded-none object-contain"
        style={{ width: isDefault ? size * 1.2 : size, height: isDefault ? size * 1.2 : size }}
      />
      {withText && !isDefault && (
        <span className="font-display text-xl tracking-wider">
          ALPHA<span className="text-primary">COACH</span> PRO
        </span>
      )}
    </div>
  );
};
