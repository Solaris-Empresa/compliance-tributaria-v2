/**
 * ShareBriefingModal — #767 feat(ux)
 *
 * Modal com 6 tabs (genérico/fiscal/TI/contabilidade/legal/gestão) exibindo
 * o resumo do briefing formatado para WhatsApp, com botão "Copiar" por área.
 *
 * Classificação determinística (client-side) via briefing-areas.ts — zero LLM.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  AREA_META,
  AREA_ORDER,
  groupBriefingByArea,
  formatWhatsAppSummary,
  type BriefingArea,
  type BriefingLite,
} from "@/lib/briefing-areas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structured: BriefingLite | null | undefined;
  projectName: string;
}

export function ShareBriefingModal({ open, onOpenChange, structured, projectName }: Props) {
  const [copiedArea, setCopiedArea] = useState<BriefingArea | null>(null);
  const [activeTab, setActiveTab] = useState<BriefingArea>("generico");

  const buckets = useMemo(() => groupBriefingByArea(structured), [structured]);

  const texts = useMemo<Record<BriefingArea, string>>(() => {
    const out = {} as Record<BriefingArea, string>;
    if (!structured) {
      AREA_ORDER.forEach((a) => (out[a] = ""));
      return out;
    }
    AREA_ORDER.forEach((a) => {
      out[a] = formatWhatsAppSummary({
        projectName,
        area: a,
        bucket: buckets[a],
        structured,
      });
    });
    return out;
  }, [buckets, projectName, structured]);

  const totalItems = (area: BriefingArea): number => {
    const b = buckets[area];
    return b.gaps.length + b.oportunidades.length + b.recomendacoes.length + b.inconsistencias.length;
  };

  const handleCopy = async (area: BriefingArea) => {
    try {
      await navigator.clipboard.writeText(texts[area]);
      setCopiedArea(area);
      toast.success(`Resumo de ${AREA_META[area].label} copiado para a área de transferência.`);
      setTimeout(() => setCopiedArea(null), 2500);
    } catch {
      toast.error("Falha ao copiar. Selecione o texto manualmente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] flex flex-col"
        data-testid="modal-resumo-whatsapp"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Resumo (WhatsApp)
          </DialogTitle>
          <DialogDescription>
            Resumos do briefing separados por área da empresa. Copie o texto e compartilhe
            no grupo de WhatsApp correspondente.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as BriefingArea)}
          className="flex-1 min-h-0 flex flex-col"
        >
          <TabsList className="flex w-full flex-wrap h-auto justify-start">
            {AREA_ORDER.map((area) => {
              const count = totalItems(area);
              return (
                <TabsTrigger
                  key={area}
                  value={area}
                  className="gap-1.5"
                  data-testid={`tab-area-${area}`}
                >
                  <span>{AREA_META[area].emoji}</span>
                  <span>{AREA_META[area].label}</span>
                  {count > 0 && area !== "generico" && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] font-mono">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {AREA_ORDER.map((area) => (
            <TabsContent
              key={area}
              value={area}
              className="flex-1 min-h-0 flex flex-col gap-3 mt-4"
            >
              <pre
                className="flex-1 min-h-0 overflow-auto rounded-lg border bg-muted/30 p-4 text-xs whitespace-pre-wrap font-mono"
                data-testid={`resumo-preview-${area}`}
              >
                {texts[area]}
              </pre>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {texts[area].length.toLocaleString("pt-BR")} caracteres
                </p>
                <Button
                  onClick={() => handleCopy(area)}
                  size="sm"
                  className="gap-2"
                  data-testid={`btn-copy-resumo-${area}`}
                >
                  {copiedArea === area ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar resumo {AREA_META[area].label}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
