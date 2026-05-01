import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DEMO_ATHLETES } from "@/lib/demoAthletes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Download,
  Upload,
  Apple,
  Dumbbell,
  FileText,
  Ruler,
  Stethoscope,
  AlertTriangle,
  TrendingUp,
  Camera,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
// ... keep existing code
import JacksonPollockCalculator from "@/components/admin/JacksonPollockCalculator";
import { SevenDobrasIntro } from "@/components/admin/SevenDobrasIntro";
// ... keep existing code
  const [open7Dobras, setOpen7Dobras] = useState(false);
  const [show7DobrasIntro, setShow7DobrasIntro] = useState(false);

  useEffect(() => {
// ... keep existing code
          <button
            onClick={() => setShow7DobrasIntro(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
          >
// ... keep existing code
      <JacksonPollockCalculator
        open={open7Dobras}
        onOpenChange={setOpen7Dobras}
        alunoId={aluno.id}
        tenantId={aluno.tenant_id}
        pesoInicial={perfil?.peso_kg ?? null}
        idadeInicial={perfil?.idade ?? null}
        sexoInicial={perfil?.sexo ?? null}
        alturaInicial={perfil?.altura_cm ?? null}
      />

      {show7DobrasIntro && (
        <SevenDobrasIntro
          name={aluno.nome_completo || ""}
          avatarUrl={aluno.avatar_url}
          onComplete={() => {
            setShow7DobrasIntro(false);
            setOpen7Dobras(true);
          }}
        />
      )}
    </div>
  );
};

export default AtletaDetalhe;