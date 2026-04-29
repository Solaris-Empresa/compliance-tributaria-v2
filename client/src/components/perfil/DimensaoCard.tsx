/**
 * DimensaoCard.tsx — M2 PR-B
 *
 * Card visual por dimensão M1 (objeto, papel_na_cadeia, tipo_de_relacao,
 * territorio, regime). Exibe valor derivado + rótulo + indicador de
 * confiança (origem: cnae|user|infer|fallback).
 *
 * Termo "Perfil da Entidade" — NUNCA "Arquétipo".
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, Users, Repeat, MapPin, FileText } from "lucide-react";

export type DimensaoTipo = "objeto" | "papel_na_cadeia" | "tipo_de_relacao" | "territorio" | "regime";
export type DimensaoOrigem = "cnae" | "user" | "infer" | "fallback";

interface DimensaoCardProps {
  readonly tipo: DimensaoTipo;
  readonly valor: readonly string[] | string;
  readonly origem: DimensaoOrigem;
  readonly onIrParaCampo?: () => void;
}

const LABELS: Record<DimensaoTipo, string> = {
  objeto: "Objeto",
  papel_na_cadeia: "Papel na Cadeia",
  tipo_de_relacao: "Tipo de Relação",
  territorio: "Território",
  regime: "Regime",
};

const ICONS: Record<DimensaoTipo, React.ComponentType<{ className?: string }>> = {
  objeto: Building2,
  papel_na_cadeia: Users,
  tipo_de_relacao: Repeat,
  territorio: MapPin,
  regime: FileText,
};

const ORIGEM_LABEL: Record<DimensaoOrigem, string> = {
  cnae: "CNAE (inferido)",
  user: "Usuário (preenchido)",
  infer: "Inferência LLM+RAG",
  fallback: "Fallback (baixa confiança)",
};

const ORIGEM_COLOR: Record<DimensaoOrigem, string> = {
  cnae: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  user: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  infer: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  fallback: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export function DimensaoCard({ tipo, valor, origem, onIrParaCampo }: DimensaoCardProps) {
  const Icon = ICONS[tipo];
  const valorString = Array.isArray(valor) ? (valor.length > 0 ? valor.join(", ") : "—") : valor || "—";

  return (
    <Card
      className={cn(
        "bg-slate-900/50 border-slate-700 cursor-pointer hover:border-indigo-500/50 transition-colors",
        origem === "fallback" && "opacity-70",
      )}
      onClick={onIrParaCampo}
      data-testid={`dimensao-${tipo}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Icon className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">{LABELS[tipo]}</p>
            <p className="text-sm text-slate-100 font-medium truncate" data-testid={`dimensao-${tipo}-valor`}>
              {valorString}
            </p>
            <Badge className={cn("mt-1.5 text-[10px]", ORIGEM_COLOR[origem])} data-testid={`dimensao-${tipo}-origem`}>
              {ORIGEM_LABEL[origem]}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
