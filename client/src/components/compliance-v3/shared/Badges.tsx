import { cn } from "@/lib/utils";
import {
  CRITICALITY_COLORS,
  RISK_LEVEL_COLORS,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from "@/types/compliance-v3";

type BadgeProps = {
  value: string;
  className?: string;
};

const LABEL_MAP: Record<string, string> = {
  // Criticality
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  // Risk level
  critico: "Crítico",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
  // Priority
  imediata: "Imediata",
  curto_prazo: "Curto Prazo",
  medio_prazo: "Médio Prazo",
  planejamento: "Planejamento",
  // Status
  nao_iniciado: "Não Iniciado",
  em_andamento: "Em Andamento",
  em_revisao: "Em Revisão",
  concluido: "Concluído",
  cancelado: "Cancelado",
  bloqueado: "Bloqueado",
  // Compliance status
  atendido: "Atendido",
  parcial: "Parcial",
  nao_atendido: "Não Atendido",
};

function Badge({ value, colorMap, className }: BadgeProps & { colorMap: Record<string, string> }) {
  const colorClass = colorMap[value] ?? "text-gray-600 bg-gray-50";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        colorClass,
        className
      )}
    >
      {LABEL_MAP[value] ?? value}
    </span>
  );
}

export function CriticalityBadge({ value, className }: BadgeProps) {
  return <Badge value={value} colorMap={CRITICALITY_COLORS} className={className} />;
}

export function RiskLevelBadge({ value, className }: BadgeProps) {
  return <Badge value={value} colorMap={RISK_LEVEL_COLORS} className={className} />;
}

export function PriorityBadge({ value, className }: BadgeProps) {
  return <Badge value={value} colorMap={PRIORITY_COLORS} className={className} />;
}

export function StatusBadge({ value, className }: BadgeProps) {
  return <Badge value={value} colorMap={STATUS_COLORS} className={className} />;
}

export function ComplianceStatusBadge({ value, className }: BadgeProps) {
  const colorMap: Record<string, string> = {
    atendido: "text-green-600 bg-green-50",
    parcial: "text-yellow-600 bg-yellow-50",
    nao_atendido: "text-red-600 bg-red-50",
  };
  return <Badge value={value} colorMap={colorMap} className={className} />;
}

// ADR-0013: CategoryBadge — 10 categorias canônicas LC 214/2025 (risk_category_l2)
const CATEGORY_LABELS: Record<string, string> = {
  imposto_seletivo: "IS",
  ibs_cbs: "IBS/CBS",
  regime_diferenciado: "Regime Dif.",
  aliquota_reduzida: "Alíq. Reduzida",
  aliquota_zero: "Alíq. Zero",
  split_payment: "Split Payment",
  cadastro_fiscal: "Cadastro",
  obrigacao_acessoria: "Obrig. Acessória",
  transicao: "Transição",
  enquadramento_geral: "Geral",
};

const CATEGORY_COLORS: Record<string, string> = {
  imposto_seletivo: "text-red-700 bg-red-50",
  ibs_cbs: "text-blue-700 bg-blue-50",
  regime_diferenciado: "text-purple-700 bg-purple-50",
  aliquota_reduzida: "text-green-600 bg-green-50",
  aliquota_zero: "text-green-800 bg-green-100",
  split_payment: "text-orange-700 bg-orange-50",
  cadastro_fiscal: "text-gray-600 bg-gray-100",
  obrigacao_acessoria: "text-yellow-700 bg-yellow-50",
  transicao: "text-indigo-700 bg-indigo-50",
  enquadramento_geral: "text-gray-500 bg-gray-50",
};

export function CategoryBadge({ value, className }: BadgeProps) {
  const colorClass = CATEGORY_COLORS[value] ?? "text-gray-500 bg-gray-50";
  const label = CATEGORY_LABELS[value] ?? value;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
