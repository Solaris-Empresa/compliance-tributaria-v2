// Traduções e mapeamentos para a interface IA SOLARIS
// 100% em português - NENHUM termo em inglês

export const ROLES = {
  cliente: "Cliente",
  equipe_solaris: "Equipe SOLARIS",
  advogado_senior: "Advogado Sênior",
} as const;

export const PROJECT_STATUS = {
  rascunho: "Rascunho",
  diagnostico_corporativo: "Diagnóstico Corporativo",
  diagnostico_operacional: "Diagnóstico Operacional",
  diagnostico_cnae: "Diagnóstico CNAE",
  matriz_riscos: "Matriz de Riscos",
  plano_acao: "Plano de Ação",
  em_avaliacao: "Aguardando Aprovação",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  arquivado: "Arquivado",
} as const;

// Alias para compatibilidade
export const STATUS_LABELS = PROJECT_STATUS;

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

export const COSO_COMPONENTS = {
  ambiente_controle: "Ambiente de Controle",
  avaliacao_riscos: "Avaliação de Riscos",
  atividades_controle: "Atividades de Controle",
  informacao_comunicacao: "Informação e Comunicação",
  monitoramento: "Monitoramento",
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

export const TASK_STATUS = {
  pendencias: "Pendências",
  a_fazer: "A Fazer",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
} as const;

export const TASK_PRIORITY = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
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
  diagnostico_corporativo: "text-blue-600 bg-blue-50",
  diagnostico_operacional: "text-indigo-600 bg-indigo-50",
  diagnostico_cnae: "text-violet-600 bg-violet-50",
  matriz_riscos: "text-purple-600 bg-purple-50",
  plano_acao: "text-indigo-600 bg-indigo-50",
  em_avaliacao: "text-amber-700 bg-amber-50",
  aprovado: "text-green-700 bg-green-50",
  em_andamento: "text-blue-700 bg-blue-50",
  concluido: "text-emerald-700 bg-emerald-50",
  arquivado: "text-gray-500 bg-gray-100",
} as const;

// Cores por prioridade de tarefa
export const PRIORITY_COLORS = {
  baixa: "text-gray-600 bg-gray-50 border-gray-200",
  media: "text-blue-600 bg-blue-50 border-blue-200",
  alta: "text-orange-600 bg-orange-50 border-orange-200",
  critica: "text-red-600 bg-red-50 border-red-200",
} as const;

// Cores por status de tarefa
export const TASK_STATUS_COLORS = {
  pendencias: "bg-gray-100 border-gray-300",
  a_fazer: "bg-blue-50 border-blue-300",
  em_andamento: "bg-yellow-50 border-yellow-300",
  concluido: "bg-green-50 border-green-300",
} as const;
