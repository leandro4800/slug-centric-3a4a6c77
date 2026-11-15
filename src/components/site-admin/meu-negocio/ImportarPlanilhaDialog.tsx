import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CATEGORIA_LABEL, formatBRL } from "@/lib/meu-negocio-metrics";
import { MODELO_CSV, lerCsv, lerLinhasDespesas, type ResultadoImportacao } from "@/lib/despesas-planilha";
import type { NovaDespesa } from "@/hooks/use-despesas";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  importando: boolean;
  onImportar: (itens: NovaDespesa[]) => Promise<void>;
};

const fmtData = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const ImportarPlanilhaDialog = ({ open, onOpenChange, importando, onImportar }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [res, setRes] = useState<ResultadoImportacao | null>(null);

  const reset = () => {
    setArquivo(null);
    setRes(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const baixarModelo = () => {
    const blob = new Blob([MODELO_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-despesas.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ler = async (file: File) => {
    setLendo(true);
    setArquivo(file.name);
    try {
      const nome = file.name.toLowerCase();
      let linhas: unknown[][];
      if (nome.endsWith(".xlsx")) {
        const { readSheet } = await import("read-excel-file/browser");
        linhas = (await readSheet(file)) as unknown[][];
      } else if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
        linhas = lerCsv(await file.text());
      } else {
        toast.error("Use um arquivo .xlsx (Excel) ou .csv.");
        reset();
        return;
      }
      setRes(lerLinhasDespesas(linhas as never));
    } catch (e) {
      console.error("[importar-despesas]", e);
      toast.error("Não conseguimos ler essa planilha. Confira se é .xlsx ou .csv.");
      reset();
    } finally {
      setLendo(false);
    }
  };

  const importar = async () => {
    if (!res?.validas.length) return;
    await onImportar(res.validas.map(({ linha: _l, ...d }) => d));
    reset();
  };

  const total = res?.validas.reduce((s, d) => s + d.valor_centavos, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase italic tracking-tight">Importar planilha</DialogTitle>
          <DialogDescription>
            Colunas: Data, Categoria, Valor, Descrição, Fixa (sim/não) e Captação (sim/não). Aceita Excel (.xlsx) ou .csv.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={baixarModelo} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Baixar planilha modelo
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && ler(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={lendo || importando}
            className="flex w-full flex-col items-center gap-2 border border-dashed border-border bg-card p-6 text-center transition-colors hover:bg-primary/5"
          >
            {lendo ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <FileSpreadsheet className="h-6 w-6 text-primary" />}
            <span className="text-sm font-bold">{arquivo ?? "Escolher planilha"}</span>
            <span className="text-xs text-muted-foreground">Toque para selecionar o arquivo</span>
          </button>

          {res && (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{res.validas.length}</strong> {res.validas.length === 1 ? "despesa pronta" : "despesas prontas"} · {formatBRL(total)}
                {res.erros.length > 0 && <span className="text-primary"> · {res.erros.length} com problema</span>}
              </p>

              {res.validas.length > 0 && (
                <ul className="max-h-56 divide-y divide-border overflow-y-auto border border-border text-sm">
                  {res.validas.slice(0, 50).map((d) => (
                    <li key={d.linha} className="flex items-center justify-between gap-3 p-2">
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{d.descricao || CATEGORIA_LABEL[d.categoria]}</span>
                        <span className="block text-xs text-muted-foreground">
                          {fmtData(d.data)} · {CATEGORIA_LABEL[d.categoria]}
                          {d.fixa && " · fixa"}
                          {d.gasto_captacao && " · captação"}
                        </span>
                      </span>
                      <span className="shrink-0">{formatBRL(d.valor_centavos)}</span>
                    </li>
                  ))}
                  {res.validas.length > 50 && (
                    <li className="p-2 text-xs text-muted-foreground">e mais {res.validas.length - 50}…</li>
                  )}
                </ul>
              )}

              {res.erros.length > 0 && (
                <ul className="max-h-32 space-y-1 overflow-y-auto border border-primary/40 bg-primary/5 p-2 text-xs">
                  {res.erros.slice(0, 30).map((e) => (
                    <li key={e.linha}>Linha {e.linha}: {e.motivo}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importando}>Cancelar</Button>
          <Button onClick={importar} disabled={!res?.validas.length || importando}>
            {importando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar {res?.validas.length ? res.validas.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
