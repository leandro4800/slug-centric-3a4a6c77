import { useBranding } from "@/contexts/BrandingProvider";
import wolfDefault from "@/assets/wolf-symbol.png";

interface TenantSymbolProps {
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Símbolo/mascote do tenant. Cada tenant pode ter o seu próprio (ex: face de lobo).
 * Usa o `symbol_url` da tabela tenants; se não houver, cai no símbolo padrão (lobo).
 */
export const TenantSymbol = ({ size = 24, className = "", alt = "Símbolo" }: TenantSymbolProps) => {
  const { tenant } = useBranding();
  const src = tenant?.symbol_url || wolfDefault;
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
