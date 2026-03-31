/**
 * SOLARIS Gaps Map — G17 (Sprint N · Issue #259)
 *
 * Mapeamento de tópicos de solaris_questions.topicos → definições de gaps
 * a serem inseridos em project_gaps_v3 quando a resposta for negativa.
 *
 * Chave: tópico normalizado (trim + toLowerCase)
 * Valor: array de definições de gap (uma pergunta pode gerar múltiplos gaps)
 *
 * MANUTENÇÃO: adicionar novas entradas aqui quando novas perguntas SOLARIS
 * forem criadas com tópicos não mapeados. Não requer deploy de engine.
 *
 * Padrão de detecção negativa (D2):
 *   resposta.trim().toLowerCase().startsWith('não') || === 'nao'
 *   "Não aplicável", "Não sei" → NÃO disparam gap (conservador)
 */

export type SolarisGapDefinition = {
  /** Descrição do gap para exibição na matriz de riscos */
  gap_descricao: string;
  /** Área de compliance afetada */
  area: 'contabilidade_fiscal' | 'juridico' | 'ti' | 'governanca' | 'operacional';
  /** Severidade base do gap */
  severidade: 'critica' | 'alta' | 'media';
  /** Tópico que disparou este gap (para rastreabilidade) */
  topico_trigger: string;
};

/**
 * Mapa principal: tópico (lowercase) → definições de gap.
 * Tópicos sem correspondência aqui são logados como warn e ignorados.
 */
export const SOLARIS_GAPS_MAP: Record<string, SolarisGapDefinition[]> = {
  // ── SOL-002 — CGIBS / confissão por inércia ──────────────────────────────
  'confissão': [{
    gap_descricao: 'Ausência de rotina de conferência CGIBS — risco de confissão automática por inércia (Art. 45 §4º LC 214/2025)',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'confissão',
  }],

  // ── SOL-001 — validação NF-e ──────────────────────────────────────────────
  'nf-e': [{
    gap_descricao: 'Ausência de validação automática de NF-e — erros em CFOP/CST/alíquota IBS/CBS configuram confissão de dívida',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'NF-e',
  }],

  // ── CGIBS — monitoramento da apuração assistida ───────────────────────────
  'cgibs': [{
    gap_descricao: 'Ausência de monitoramento CGIBS — confissão por inércia na apuração assistida',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'CGIBS',
  }],

  // ── SLA — prazo interno de correção fiscal ────────────────────────────────
  'sla': [{
    gap_descricao: 'Ausência de SLA interno de correção fiscal — prazo D+2 não implementado',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'SLA',
  }],

  // ── ERP — parametrização IBS/CBS ──────────────────────────────────────────
  'erp': [{
    gap_descricao: 'ERP não parametrizado para IBS/CBS — risco de apuração incorreta na transição',
    area: 'ti',
    severidade: 'critica',
    topico_trigger: 'ERP',
  }],

  // ── Dívida ativa — controle de débitos constituídos ───────────────────────
  'dívida ativa': [{
    gap_descricao: 'Ausência de controle de débitos constituídos por confissão — risco de execução fiscal',
    area: 'juridico',
    severidade: 'critica',
    topico_trigger: 'dívida ativa',
  }],

  // ── Governança fiscal ─────────────────────────────────────────────────────
  'governança': [{
    gap_descricao: 'Ausência de estrutura de governança fiscal para a Reforma Tributária — LC 214/2025',
    area: 'governanca',
    severidade: 'alta',
    topico_trigger: 'governança',
  }],

  // ── Treinamento da equipe ─────────────────────────────────────────────────
  'treinamento': [{
    gap_descricao: 'Equipe fiscal não treinada para IBS/CBS/IS — risco operacional na transição 2026–2033',
    area: 'operacional',
    severidade: 'alta',
    topico_trigger: 'treinamento',
  }],

  // ── Nota fiscal de serviços ───────────────────────────────────────────────
  'nfs-e': [{
    gap_descricao: 'Ausência de validação de NFS-e para CBS — serviços sujeitos a novo regime de tributação',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'NFS-e',
  }],

  // ── Contratos com fornecedores ────────────────────────────────────────────
  'contratos': [{
    gap_descricao: 'Contratos com fornecedores não revisados para cláusulas de repasse IBS/CBS',
    area: 'juridico',
    severidade: 'media',
    topico_trigger: 'contratos',
  }],
};
