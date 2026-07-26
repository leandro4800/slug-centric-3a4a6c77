import { useBranding } from "@/contexts/BrandingProvider";

const DEFAULT_LOGO_SRC = "/icons/icon-192.webp";

export const Logo = ({ size = 36, withText = true }: { size?: number; withText?: boolean }) => {
  const { tenant } = useBranding();
  const src = tenant?.logo_url || DEFAULT_LOGO_SRC;
  const name = tenant?.nome || "ALPHACOACH PRO";

  return (
    <div className="flex items-center gap-3">
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-none object-contain"
        style={{ width: size, height: size }}
      />
      {withText && !tenant?.logo_url && (
        <span className="font-display text-xl tracking-wider">
          ALPHA<span className="text-primary">COACH</span> PRO
        </span>
      )}
    </div>
  );
};
