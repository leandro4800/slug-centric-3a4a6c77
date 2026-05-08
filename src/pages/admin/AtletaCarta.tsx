import { useParams } from "react-router-dom";
import { CartaScreen } from "@/components/carta/CartaScreen";

export default function AtletaCarta() {
  const { atletaId } = useParams();
  if (!atletaId) return null;
  return <CartaScreen alunoId={atletaId} canEdit={true} />;
}
