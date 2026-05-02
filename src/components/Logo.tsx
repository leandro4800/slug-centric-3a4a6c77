import logo from "@/assets/alphacoach-logo.jpeg";

export const Logo = ({ size = 36, withText = true }: { size?: number; withText?: boolean }) => (
  <div className="flex items-center gap-3">
    <img
      src={logo}
      alt="AlphaCoach"
      width={size}
      height={size}
      className="rounded-none object-cover"
      style={{ width: size, height: size }}
    />
    {withText && (
      <span className="font-display text-xl tracking-wider">
        ALPHA<span className="text-primary">COACH</span>
      </span>
    )}
  </div>
);
