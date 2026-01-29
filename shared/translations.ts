// Traduções e mapeamentos para a interface IA SOLARIS
// 100% em português - NENHUM termo em inglês

export const ROLES = {
  cliente: "Cliente",
  equipe_solaris: "Equipe SOLARIS",
  advogado_senior: "Advogado Sênior",
} as const;

export const PROJECT_STATUS = {
  rascunho: "Rascunho",
  assessment_fase1: "Assessment - Fase 1",
  assessment_fase2: "Assessment - Fase 2",
  matriz_riscos: "Matriz de Riscos",
  plano_acao: "Plano de Ação",
  em_avaliacao: "Em Avaliação Jurídica",
  aprovado: "Aprovado",
  em_execucao: "Em Execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
} as const;

export const TAX_REGIME = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
  mei: "MEI",
} as const;

export const COMPANY_SIZE = {
  mei: "MEI",
  pequena: "Pequena",
  media: "Média",
  grande: "Grande",
} as const;

export const RISK_LEVEL = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
} as const;

export const PROBABILITY = {
  muito_baixa: "Muito Baixa",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  muito_alta: "Muito Alta",
} as const;

export const IMPACT = {
  muito_baixo: "Muito Baixo",
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  muito_alto: "Muito Alto",
} as const;

export const NOTIFICATION_FREQUENCY = {
  diaria: "Diária",
  semanal: "Semanal",
  apenas_atrasos: "Apenas Atrasos",
  marcos_importantes: "Marcos Importantes",
  personalizada: "Personalizada",
} as const;

export const ACTION_PLAN_STATUS = {
  em_avaliacao: "Em Avaliação",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  em_revisao: "Em Revisão",
} as const;

// Função helper para obter tradução
export function translate<T extends Record<string, string>>(
  map: T,
  key: string
): string {
  return map[key as keyof T] || key;
}

// Cores por nível de risco
export const RISK_COLORS = {
  baixo: "text-green-600 bg-green-50",
  medio: "text-yellow-600 bg-yellow-50",
  alto: "text-orange-600 bg-orange-50",
  critico: "text-red-600 bg-red-50",
} as const;

// Cores por status do projeto
export const STATUS_COLORS = {
  rascunho: "text-gray-600 bg-gray-50",
  assessment_fase1: "text-blue-600 bg-blue-50",
  assessment_fase2: "text-blue-600 bg-blue-50",
  matriz_riscos: "text-purple-600 bg-purple-50",
  plano_acao: "text-indigo-600 bg-indigo-50",
  em_avaliacao: "text-yellow-600 bg-yellow-50",
  aprovado: "text-green-600 bg-green-50",
  em_execucao: "text-cyan-600 bg-cyan-50",
  concluido: "text-emerald-600 bg-emerald-50",
  cancelado: "text-red-600 bg-red-50",
} as const;
