import { useAuth } from "@/hooks/use-auth";
import { CartaScreen } from "@/components/carta/CartaScreen";

export default function Carta() {
  const { user } = useAuth();
  if (!user) return null;
  return <CartaScreen alunoId={user.id} canEdit={true} />;
}
