import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

export default function DebugStep2() {
  const [sono, setSono] = useState([7]);
  const [estresse, setEstresse] = useState([5]);
  const [tabagismo, setTabagismo] = useState(false);
  const [alcool, setAlcool] = useState("nao");
  return (
    <div className="p-6 space-y-4">
      <div><Label>Doencas</Label><Input /></div>
      <div><Label>Med</Label><Textarea rows={2} /></div>
      <div><Label>Sono {sono[0]}</Label><Slider value={sono} onValueChange={setSono} min={3} max={12} step={1} /></div>
      <div><Label>Estresse {estresse[0]}</Label><Slider value={estresse} onValueChange={setEstresse} min={1} max={10} step={1} /></div>
      <div className="flex gap-2"><Checkbox checked={tabagismo} onCheckedChange={(v) => setTabagismo(!!v)} id="f" /><Label htmlFor="f">Fumo</Label></div>
      <div><Select value={alcool} onValueChange={setAlcool}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nao">Não bebo</SelectItem></SelectContent></Select></div>
      <p id="ok">RENDER_OK</p>
    </div>
  );
}
