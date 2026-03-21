/**
 * CpieSettingsPanel — L1
 * Painel de configurações globais do CPIE para o painel admin.
 * Permite ajustar threshold mínimo, tamanho de lote e dia do relatório mensal.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Save, Loader2, Info } from "lucide-react";

export function CpieSettingsPanel() {
  const { data: settings, isLoading, refetch } = trpc.cpie.getSettings.useQuery();
  const updateSettings = trpc.cpie.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso.");
      refetch();
    },
    onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const [minScore, setMinScore] = useState(30);
  const [batchLimit, setBatchLimit] = useState(50);
  const [gateEnabled, setGateEnabled] = useState(true);
  const [reportDay, setReportDay] = useState(1);

  useEffect(() => {
    if (settings) {
      setMinScore(settings.minScoreToAdvance);
      setBatchLimit(settings.batchSizeLimit);
      setGateEnabled(settings.gateEnabled === 1);
      setReportDay(settings.monthlyReportDay);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      minScoreToAdvance: minScore,
      batchSizeLimit: batchLimit,
      gateEnabled: gateEnabled ? 1 : 0,
      monthlyReportDay: reportDay,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Settings className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Configurações Globais do CPIE</span>
      </div>

      {/* Gate de score mínimo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="space-y-2 md:col-span-2 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Gate de Score Mínimo</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quando ativo, bloqueia o botão "Avançar" se o score CPIE for inferior ao threshold.
            </p>
          </div>
          <Switch
            checked={gateEnabled}
            onCheckedChange={setGateEnabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="min-score" className="text-xs font-medium">
            Score Mínimo para Avançar (%)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="min-score"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24 h-8 text-sm"
              disabled={!gateEnabled}
            />
            <span className="text-xs text-muted-foreground">de 0 a 100</span>
          </div>
          <div className="flex items-start gap-1 mt-1">
            <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Recomendado: 30–50%. Abaixo de 30% a análise de CNAEs pode ser imprecisa.
            </p>
          </div>
        </div>

        {/* Visualização do threshold */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Prévia do Threshold</Label>
          <div className="h-8 rounded-md bg-muted overflow-hidden relative">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${minScore}%`,
                background: minScore < 30
                  ? "hsl(var(--destructive))"
                  : minScore < 60
                  ? "hsl(38 92% 50%)"
                  : "hsl(142 71% 45%)",
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
              {minScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Análise em lote */}
      <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
        <Label htmlFor="batch-limit" className="text-sm font-medium">
          Limite de Projetos por Lote (batchAnalyze)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="batch-limit"
            type="number"
            min={1}
            max={200}
            value={batchLimit}
            onChange={(e) => setBatchLimit(Number(e.target.value))}
            className="w-24 h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground">projetos por execução (máx. 200)</span>
        </div>
      </div>

      {/* Relatório mensal */}
      <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
        <Label htmlFor="report-day" className="text-sm font-medium">
          Dia do Mês para Relatório Automático
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="report-day"
            type="number"
            min={1}
            max={28}
            value={reportDay}
            onChange={(e) => setReportDay(Number(e.target.value))}
            className="w-24 h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground">de 1 a 28 (todo mês)</span>
        </div>
        {settings?.lastMonthlyReportAt && (
          <p className="text-xs text-muted-foreground">
            Último relatório gerado: {new Date(settings.lastMonthlyReportAt).toLocaleString("pt-BR")}
          </p>
        )}
        {settings?.lastJobLog && (
          <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 mt-1 truncate">
            {settings.lastJobLog}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="gap-1.5"
        >
          {updateSettings.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</>
          ) : (
            <><Save className="h-3.5 w-3.5" />Salvar Configurações</>
          )}
        </Button>
      </div>
    </div>
  );
}
