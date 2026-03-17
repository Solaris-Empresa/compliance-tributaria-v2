// @ts-nocheck
/**
 * V64 — Alertas Visuais de Inconsistência
 *
 * Exibe alertas quando a IA detecta contradições nas respostas do questionário.
 * Aparece condicionalmente no BriefingV3 apenas quando inconsistencias.length > 0.
 *
 * Estrutura de cada inconsistência:
 *   - pergunta_origem: string
 *   - resposta_declarada: string
 *   - contradicao_detectada: string
 *   - impacto: "alto" | "medio" | "baixo"
 */

import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Inconsistencia {
  pergunta_origem: string;
  resposta_declarada: string;
  contradicao_detectada: string;
  impacto: "alto" | "medio" | "baixo";
}

interface AlertasInconsistenciaProps {
  inconsistencias: Inconsistencia[];
  /** Se true, exibe em modo compacto (apenas badge + botão expandir) */
  compact?: boolean;
}

// ─── Helpers de estilo por impacto ────────────────────────────────────────────

const impactoConfig = {
  alto: {
    label: "Alto",
    badgeClass: "bg-red-100 text-red-700 border-red-300",
    rowClass: "border-l-4 border-red-400 bg-red-50/60",
    iconColor: "text-red-500",
    Icon: AlertCircle,
    dotClass: "bg-red-500",
  },
  medio: {
    label: "Médio",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-300",
    rowClass: "border-l-4 border-orange-400 bg-orange-50/60",
    iconColor: "text-orange-500",
    Icon: AlertTriangle,
    dotClass: "bg-orange-400",
  },
  baixo: {
    label: "Baixo",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-300",
    rowClass: "border-l-4 border-yellow-400 bg-yellow-50/60",
    iconColor: "text-yellow-600",
    Icon: Info,
    dotClass: "bg-yellow-400",
  },
} as const;

// ─── Badge de contagem para o header do briefing ─────────────────────────────

export function InconsistenciaBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300 animate-pulse">
      <AlertTriangle className="h-3 w-3" />
      {count} {count === 1 ? "inconsistência" : "inconsistências"}
    </span>
  );
}

// ─── Modal de detalhe de uma inconsistência ───────────────────────────────────

function InconsistenciaModal({
  item,
  onClose,
}: {
  item: Inconsistencia | null;
  onClose: () => void;
}) {
  if (!item) return null;
  const cfg = impactoConfig[item.impacto] ?? impactoConfig.baixo;
  const { Icon } = cfg;

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
            Inconsistência Detectada
            <Badge className={`text-xs ml-auto ${cfg.badgeClass}`}>
              Impacto {cfg.label}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A IA identificou uma contradição nas respostas do questionário que pode afetar a
            precisão do diagnóstico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pergunta de Origem
            </p>
            <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">
              {item.pergunta_origem}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Resposta Declarada
            </p>
            <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2">
              {item.resposta_declarada}
            </p>
          </div>

          <div className={`space-y-1 rounded-lg px-3 py-3 ${cfg.rowClass}`}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "inherit" }}>
              Contradição Detectada
            </p>
            <p className="text-sm font-medium">
              {item.contradicao_detectada}
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              <strong>Recomendação:</strong> Revise as respostas do questionário e regenere o
              briefing para corrigir esta inconsistência, ou use o botão "Corrigir" para fornecer
              informações adicionais à IA.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AlertasInconsistencia({
  inconsistencias,
  compact = false,
}: AlertasInconsistenciaProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [selectedItem, setSelectedItem] = useState<Inconsistencia | null>(null);

  if (!inconsistencias || inconsistencias.length === 0) return null;

  const countAlto = inconsistencias.filter((i) => i.impacto === "alto").length;
  const countMedio = inconsistencias.filter((i) => i.impacto === "medio").length;
  const countBaixo = inconsistencias.filter((i) => i.impacto === "baixo").length;

  // Ordenar: alto → medio → baixo
  const sorted = [...inconsistencias].sort((a, b) => {
    const order = { alto: 0, medio: 1, baixo: 2 };
    return (order[a.impacto] ?? 3) - (order[b.impacto] ?? 3);
  });

  return (
    <>
      <Card className="border-red-200 bg-red-50/30 shadow-sm">
        {/* Header do card */}
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-red-800 font-semibold">
                Alertas de Inconsistência Detectados pela IA
              </span>
            </CardTitle>

            {/* Resumo de contagem por impacto */}
            <div className="flex items-center gap-1.5 shrink-0">
              {countAlto > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {countAlto} alto
                </span>
              )}
              {countMedio > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                  {countMedio} médio
                </span>
              )}
              {countBaixo > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                  {countBaixo} baixo
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-red-700 hover:bg-red-100"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <>
                    Ocultar <ChevronUp className="h-3.5 w-3.5 ml-1" />
                  </>
                ) : (
                  <>
                    Ver detalhes <ChevronDown className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Aviso contextual */}
          <p className="text-xs text-red-700/80 mt-1">
            A IA detectou {inconsistencias.length}{" "}
            {inconsistencias.length === 1 ? "contradição" : "contradições"} nas respostas do
            questionário. Revise e corrija para aumentar a precisão do diagnóstico.
          </p>
        </CardHeader>

        {/* Lista de inconsistências */}
        {expanded && (
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-2 mt-2">
              {sorted.map((item, idx) => {
                const cfg = impactoConfig[item.impacto] ?? impactoConfig.baixo;
                const { Icon } = cfg;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer hover:opacity-90 transition-opacity ${cfg.rowClass}`}
                    onClick={() => setSelectedItem(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedItem(item)}
                    aria-label={`Ver detalhes da inconsistência de impacto ${cfg.label}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {item.pergunta_origem}
                        </p>
                        <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${cfg.badgeClass}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.contradicao_detectada}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Modal de detalhe */}
      <InconsistenciaModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
