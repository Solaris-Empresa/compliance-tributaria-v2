/**
 * SOLARIS Gaps Map — G17-C (Sprint O+ · Expansão 76 tópicos)
 *
 * Mapeamento de tópicos de solaris_questions.topicos → definições de gaps
 * a serem inseridos em project_gaps_v3 quando a resposta for negativa.
 *
 * Chave: tópico normalizado (trim + toLowerCase) — snake_case sem acentos
 * Valor: array de definições de gap (uma pergunta pode gerar múltiplos gaps)
 *
 * MANUTENÇÃO: adicionar novas entradas aqui quando novas perguntas SOLARIS
 * forem criadas com tópicos não mapeados. Não requer deploy de engine.
 *
 * Padrão de detecção negativa (D2):
 *   resposta.trim().toLowerCase().startsWith('não') || === 'nao'
 *   "Não aplicável", "Não sei" → NÃO disparam gap (conservador)
 *
 * Perguntas ativas: SOL-015..SOL-036 (22 perguntas, 76 tópicos distintos)
 * Perguntas soft-deleted: SOL-001..SOL-014 (legado — tópicos com acentos)
 */
export type SolarisGapDefinition = {
  /** Descrição do gap para exibição na matriz de riscos */
  gap_descricao: string;
  /** Área de compliance afetada */
  area: 'contabilidade_fiscal' | 'juridico' | 'ti' | 'governanca' | 'operacional' | 'negocio';
  /** Severidade base do gap */
  severidade: 'critica' | 'alta' | 'media';
  /** Tópico que disparou este gap (para rastreabilidade) */
  topico_trigger: string;
};

/**
 * Mapa principal: tópico (lowercase, snake_case) → definições de gap.
 * Tópicos sem correspondência aqui são logados como warn e ignorados.
 *
 * Cobertura: 76/76 tópicos das perguntas ativas SOL-015..SOL-036
 */
export const SOLARIS_GAPS_MAP: Record<string, SolarisGapDefinition[]> = {

  // ── SOL-015 — Erros operacionais virarem dívida ativa ─────────────────────
  'divida_ativa': [{
    gap_descricao: 'Ausência de controle de débitos constituídos por confissão — risco de execução fiscal automática (Art. 45 LC 214/2025)',
    area: 'juridico',
    severidade: 'critica',
    topico_trigger: 'divida_ativa',
  }],
  'erro_operacional': [{
    gap_descricao: 'Erros operacionais sem processo de correção preventiva — risco de constituição de dívida ativa por confissão tácita',
    area: 'operacional',
    severidade: 'critica',
    topico_trigger: 'erro_operacional',
  }],
  'credito_tributario': [{
    gap_descricao: 'Ausência de controle de crédito tributário constituído — risco de execução fiscal sem contestação tempestiva',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'credito_tributario',
  }],
  'art45': [{
    gap_descricao: 'Empresa não mapeou os riscos do Art. 45 LC 214/2025 — confissão automática por atos omissivos',
    area: 'juridico',
    severidade: 'critica',
    topico_trigger: 'art45',
  }],

  // ── SOL-016 — Limitação de retificação após confissão ─────────────────────
  'retificacao': [{
    gap_descricao: 'Ausência de processo de retificação fiscal preventiva — prazo para correção antes da confissão é irrecuperável',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'retificacao',
  }],
  'estorno': [{
    gap_descricao: 'Ausência de rotina de estorno fiscal — erros de lançamento não corrigidos configuram confissão de dívida',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'estorno',
  }],
  'credito_indevido': [{
    gap_descricao: 'Risco de crédito indevido não detectado — aproveitamento incorreto de crédito IBS/CBS sujeito a glosa e multa',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'credito_indevido',
  }],
  'art29': [{
    gap_descricao: 'Empresa não mapeou os efeitos do Art. 29 LC 214/2025 — limitações ao aproveitamento de crédito após confissão',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'art29',
  }],

  // ── SOL-017 — Execução fiscal automática por crédito constituído ──────────
  'execucao_fiscal': [{
    gap_descricao: 'Ausência de monitoramento de créditos constituídos — execução fiscal automática sem defesa prévia (Art. 45 LC 214/2025)',
    area: 'juridico',
    severidade: 'critica',
    topico_trigger: 'execucao_fiscal',
  }],
  'credito_constituido': [{
    gap_descricao: 'Créditos tributários constituídos por confissão sem controle — risco de execução fiscal imediata',
    area: 'juridico',
    severidade: 'critica',
    topico_trigger: 'credito_constituido',
  }],
  'passivo_tributario': [{
    gap_descricao: 'Passivo tributário não mapeado — risco de execução fiscal por créditos constituídos por confissão tácita',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'passivo_tributario',
  }],

  // ── SOL-018 — Restrição ao contraditório e ampla defesa ───────────────────
  'contraditorio': [{
    gap_descricao: 'Ausência de processo de defesa administrativa — restrição ao contraditório em créditos constituídos por confissão',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'contraditorio',
  }],
  'ampla_defesa': [{
    gap_descricao: 'Empresa sem estrutura de defesa fiscal — ampla defesa comprometida em autuações por confissão automática',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'ampla_defesa',
  }],
  'devido_processo_legal': [{
    gap_descricao: 'Ausência de protocolo de devido processo legal fiscal — risco de perda de prazo em impugnações administrativas',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'devido_processo_legal',
  }],
  'judicializacao': [{
    gap_descricao: 'Empresa sem estratégia de judicialização preventiva — risco de autuações por confissão automática sem contestação',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'judicializacao',
  }],

  // ── SOL-019 — Dependência da apuração assistida CGIBS ─────────────────────
  'cgibs': [{
    gap_descricao: 'Ausência de monitoramento CGIBS — confissão por inércia na apuração assistida (Art. 45 §4º LC 214/2025)',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'cgibs',
  }],
  'apuracao_assistida': [{
    gap_descricao: 'Ausência de rotina de conferência da apuração assistida CGIBS — risco de confissão automática por inércia',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'apuracao_assistida',
  }],
  'comite_gestor': [{
    gap_descricao: 'Empresa não acompanha as resoluções do Comitê Gestor IBS — risco de não conformidade com regras operacionais',
    area: 'governanca',
    severidade: 'alta',
    topico_trigger: 'comite_gestor',
  }],
  'ibs': [{
    gap_descricao: 'Ausência de parametrização do IBS no sistema fiscal — risco de apuração incorreta e confissão automática',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'ibs',
  }],
  'cbs': [{
    gap_descricao: 'Ausência de parametrização da CBS no sistema fiscal — risco de apuração incorreta e confissão automática',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'cbs',
  }],

  // ── SOL-020 — Multas por ajustes tardios ──────────────────────────────────
  'multas': [{
    gap_descricao: 'Empresa sem controle de prazo de apuração — risco de multas por ajustes tardios após fechamento do período (Art. 44 LC 214/2025)',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'multas',
  }],
  'ajuste_tardio': [{
    gap_descricao: 'Ausência de processo de ajuste fiscal tempestivo — ajustes tardios geram multa automática após prazo de apuração',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'ajuste_tardio',
  }],
  'prazo_apuracao': [{
    gap_descricao: 'Empresa sem controle de prazo de apuração IBS/CBS — perda do prazo configura confissão e multa automática',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'prazo_apuracao',
  }],
  'art44': [{
    gap_descricao: 'Empresa não mapeou os efeitos do Art. 44 LC 214/2025 — multas por ajustes tardios após prazo de apuração',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'art44',
  }],
  'penalidade': [{
    gap_descricao: 'Ausência de mapeamento de penalidades fiscais LC 214/2025 — risco de multas e juros não provisionados',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'penalidade',
  }],

  // ── SOL-021 — Risco sistêmico por parametrização incorreta de ERP ─────────
  'erp': [{
    gap_descricao: 'ERP não parametrizado para IBS/CBS — risco sistêmico de apuração incorreta em toda a cadeia fiscal',
    area: 'ti',
    severidade: 'critica',
    topico_trigger: 'erp',
  }],
  'parametrizacao': [{
    gap_descricao: 'Ausência de parametrização fiscal do ERP para a Reforma Tributária — risco de erros em massa na apuração IBS/CBS',
    area: 'ti',
    severidade: 'critica',
    topico_trigger: 'parametrizacao',
  }],
  'risco_sistemico': [{
    gap_descricao: 'Empresa sem análise de risco sistêmico fiscal — falha de parametrização no ERP pode gerar confissão em múltiplos períodos',
    area: 'ti',
    severidade: 'critica',
    topico_trigger: 'risco_sistemico',
  }],
  'auditoria': [{
    gap_descricao: 'Ausência de trilha de auditoria fiscal — impossibilidade de rastrear erros de apuração IBS/CBS para defesa administrativa',
    area: 'governanca',
    severidade: 'alta',
    topico_trigger: 'auditoria',
  }],

  // ── SOL-022 — Judicialização futura por inconstitucionalidade ─────────────
  'inconstitucionalidade': [{
    gap_descricao: 'Empresa sem monitoramento de teses de inconstitucionalidade da LC 214/2025 — risco de perda de oportunidade de recuperação fiscal',
    area: 'juridico',
    severidade: 'media',
    topico_trigger: 'inconstitucionalidade',
  }],
  'confissao_automatica': [{
    gap_descricao: 'Ausência de rotina de conferência CGIBS — risco de confissão automática por inércia (Art. 45 §4º LC 214/2025)',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'confissao_automatica',
  }],
  'stf': [{
    gap_descricao: 'Empresa sem acompanhamento de jurisprudência STF sobre LC 214/2025 — risco de perda de teses favoráveis',
    area: 'juridico',
    severidade: 'media',
    topico_trigger: 'stf',
  }],
  'stj': [{
    gap_descricao: 'Empresa sem acompanhamento de jurisprudência STJ sobre LC 214/2025 — risco de perda de teses favoráveis',
    area: 'juridico',
    severidade: 'media',
    topico_trigger: 'stj',
  }],

  // ── SOL-023 — Responsabilização da gestão por falhas fiscais ──────────────
  'responsabilidade_gestao': [{
    gap_descricao: 'Ausência de política de responsabilização da gestão por falhas fiscais — risco de responsabilidade pessoal de administradores (Art. 45 LC 214/2025)',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'responsabilidade_gestao',
  }],
  'administradores': [{
    gap_descricao: 'Administradores não treinados sobre responsabilidade fiscal na Reforma Tributária — risco de responsabilidade pessoal por confissão automática',
    area: 'governanca',
    severidade: 'alta',
    topico_trigger: 'administradores',
  }],
  'governanca': [{
    gap_descricao: 'Ausência de estrutura de governança fiscal para a Reforma Tributária — LC 214/2025 exige controles internos formalizados',
    area: 'governanca',
    severidade: 'alta',
    topico_trigger: 'governanca',
  }],

  // ── SOL-024 — Perda da espontaneidade ─────────────────────────────────────
  'espontaneidade': [{
    gap_descricao: 'Empresa sem processo de denúncia espontânea — correção após confissão não elimina penalidade (Art. 29 LC 214/2025)',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'espontaneidade',
  }],
  'credito': [{
    gap_descricao: 'Ausência de controle de créditos fiscais — risco de perda de crédito IBS/CBS por prazo decadencial',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'credito',
  }],
  'debito': [{
    gap_descricao: 'Ausência de controle de débitos fiscais — risco de constituição de dívida ativa por débitos não identificados',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'debito',
  }],
  'correcao_preventiva': [{
    gap_descricao: 'Empresa sem processo de correção preventiva fiscal — erros identificados tardiamente geram multa mesmo com correção voluntária',
    area: 'operacional',
    severidade: 'alta',
    topico_trigger: 'correcao_preventiva',
  }],

  // ── SOL-025 — Aumento da carga tributária (PIS/Cofins) ────────────────────
  'aliquota': [{
    gap_descricao: 'Empresa sem análise de impacto das novas alíquotas IBS/CBS — risco de precificação incorreta e perda de margem',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'aliquota',
  }],
  'pis_cofins': [{
    gap_descricao: 'Ausência de análise de transição PIS/Cofins → CBS — risco de dupla tributação no período de transição 2026–2033',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'pis_cofins',
  }],
  'carga_tributaria': [{
    gap_descricao: 'Empresa sem simulação de impacto da nova carga tributária IBS/CBS — risco de subcapitalização e perda de competitividade',
    area: 'negocio',
    severidade: 'critica',
    topico_trigger: 'carga_tributaria',
  }],

  // ── SOL-026 — Redução de créditos (não cumulativo) ────────────────────────
  'creditos': [{
    gap_descricao: 'Ausência de análise de impacto na não cumulatividade — risco de perda de créditos IBS/CBS na cadeia produtiva',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'creditos',
  }],
  'nao_cumulatividade': [{
    gap_descricao: 'Empresa sem mapeamento de créditos na não cumulatividade IBS/CBS — risco de perda de créditos por falta de documentação',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'nao_cumulatividade',
  }],
  'margem': [{
    gap_descricao: 'Empresa sem análise de impacto na margem operacional pela Reforma Tributária — risco de precificação insuficiente',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'margem',
  }],

  // ── SOL-027 — Cumulatividade indireta na cadeia produtiva ─────────────────
  'cumulatividade': [{
    gap_descricao: 'Empresa sem análise de cumulatividade indireta na cadeia produtiva — risco de aumento de custo por fornecedores não creditados',
    area: 'contabilidade_fiscal',
    severidade: 'critica',
    topico_trigger: 'cumulatividade',
  }],
  'cadeia_produtiva': [{
    gap_descricao: 'Ausência de análise de impacto da Reforma Tributária na cadeia produtiva — risco de repasse de custos por fornecedores',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'cadeia_produtiva',
  }],

  // ── SOL-028 — Impacto no fluxo de caixa ──────────────────────────────────
  'fluxo_caixa': [{
    gap_descricao: 'Empresa sem planejamento de fluxo de caixa para a Reforma Tributária — risco de descasamento entre recolhimento IBS/CBS e faturamento',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'fluxo_caixa',
  }],
  'capital_giro': [{
    gap_descricao: 'Ausência de planejamento de capital de giro para absorver aumento de carga tributária — risco de insolvência operacional',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'capital_giro',
  }],
  'tributos': [{
    gap_descricao: 'Empresa sem mapeamento completo dos tributos afetados pela Reforma — risco de surpresas fiscais no período de transição',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'tributos',
  }],
  'faturamento': [{
    gap_descricao: 'Empresa sem análise de impacto da Reforma Tributária no faturamento — risco de precificação incorreta e perda de receita',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'faturamento',
  }],

  // ── SOL-029 — Perda de competitividade ────────────────────────────────────
  'competitividade': [{
    gap_descricao: 'Empresa sem análise de competitividade pós-Reforma Tributária — risco de perda de mercado por precificação inadequada',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'competitividade',
  }],
  'pricing': [{
    gap_descricao: 'Ausência de revisão de estratégia de pricing para IBS/CBS — risco de margem negativa ou perda de competitividade',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'pricing',
  }],
  'mercado': [{
    gap_descricao: 'Empresa sem análise de impacto da Reforma Tributária no mercado — risco de perda de posição competitiva',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'mercado',
  }],
  'custos': [{
    gap_descricao: 'Empresa sem análise de impacto da Reforma Tributária nos custos operacionais — risco de subcapitalização',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'custos',
  }],

  // ── SOL-030 — Erro na aplicação de novas alíquotas ────────────────────────
  'apuracao': [{
    gap_descricao: 'Ausência de processo de conferência de apuração IBS/CBS — risco de erro sistemático por alíquotas incorretas no ERP',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'apuracao',
  }],

  // ── SOL-031 — Classificação fiscal incorreta de produtos (NCM) ────────────
  'ncm': [{
    gap_descricao: 'Ausência de revisão de NCM para a Reforma Tributária — classificação incorreta gera alíquota errada e risco de autuação',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'ncm',
  }],
  'classificacao_fiscal': [{
    gap_descricao: 'Empresa sem processo de revisão de classificação fiscal — NCM incorreto gera apuração IBS/CBS errada e risco de confissão',
    area: 'contabilidade_fiscal',
    severidade: 'alta',
    topico_trigger: 'classificacao_fiscal',
  }],
  'produto': [{
    gap_descricao: 'Empresa sem mapeamento de produtos afetados pela mudança de alíquota na Reforma Tributária — risco de apuração incorreta',
    area: 'contabilidade_fiscal',
    severidade: 'media',
    topico_trigger: 'produto',
  }],

  // ── SOL-032 — Interpretação equivocada da lista taxativa ──────────────────
  'interpretacao': [{
    gap_descricao: 'Empresa sem análise jurídica da lista taxativa LC 224/2025 — risco de interpretação equivocada e autuação por benefício indevido',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'interpretacao',
  }],
  'lista_taxativa': [{
    gap_descricao: 'Ausência de mapeamento de produtos/serviços na lista taxativa LC 224/2025 — risco de aplicação indevida de benefício fiscal',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'lista_taxativa',
  }],
  'juridico': [{
    gap_descricao: 'Empresa sem assessoria jurídica especializada em Reforma Tributária — risco de interpretação equivocada de LC 214/2025 e LC 224/2025',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'juridico',
  }],
  'lc224': [{
    gap_descricao: 'Empresa sem análise de impacto da LC 224/2025 — risco de não conformidade com regras de benefícios fiscais e lista taxativa',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'lc224',
  }],

  // ── SOL-033 — Risco de autuação por aplicação indevida de benefício ────────
  'autuacao': [{
    gap_descricao: 'Empresa sem mapeamento de riscos de autuação — aplicação indevida de benefício fiscal gera multa qualificada',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'autuacao',
  }],
  'beneficio_fiscal': [{
    gap_descricao: 'Ausência de análise de elegibilidade a benefícios fiscais LC 224/2025 — risco de autuação por aplicação indevida',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'beneficio_fiscal',
  }],
  'risco_fiscal': [{
    gap_descricao: 'Empresa sem mapeamento de riscos fiscais da Reforma Tributária — exposição não quantificada a autuações e execuções fiscais',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'risco_fiscal',
  }],

  // ── SOL-034 — Judicialização por majoração de base no lucro presumido ──────
  'lucro_presumido': [{
    gap_descricao: 'Empresa no lucro presumido sem análise de impacto da Reforma Tributária — risco de majoração de base de cálculo',
    area: 'contabilidade_fiscal',
    severidade: 'media',
    topico_trigger: 'lucro_presumido',
  }],
  'base_calculo': [{
    gap_descricao: 'Ausência de análise de mudança de base de cálculo IBS/CBS — risco de apuração incorreta e litigiosidade',
    area: 'contabilidade_fiscal',
    severidade: 'media',
    topico_trigger: 'base_calculo',
  }],
  'litigio': [{
    gap_descricao: 'Empresa sem estratégia de gestão de litígios fiscais — risco de passivo tributário não provisionado',
    area: 'juridico',
    severidade: 'media',
    topico_trigger: 'litigio',
  }],

  // ── SOL-035 — Impacto no IPI para itens antes zerados ────────────────────
  'ipi': [{
    gap_descricao: 'Empresa sem análise de impacto do IPI na Reforma Tributária — risco de aumento de carga para produtos antes isentos',
    area: 'contabilidade_fiscal',
    severidade: 'media',
    topico_trigger: 'ipi',
  }],
  'industria': [{
    gap_descricao: 'Empresa industrial sem análise de impacto da Reforma Tributária — risco de aumento de carga por mudança no IPI e IBS',
    area: 'contabilidade_fiscal',
    severidade: 'media',
    topico_trigger: 'industria',
  }],
  'reducao_tributaria': [{
    gap_descricao: 'Empresa sem análise de reduções tributárias aplicáveis na Reforma — risco de não aproveitamento de benefícios previstos',
    area: 'contabilidade_fiscal',
    severidade: 'media',
    topico_trigger: 'reducao_tributaria',
  }],

  // ── SOL-036 — Efeito cadeia — repasse de custos por fornecedores ──────────
  'fornecedores': [{
    gap_descricao: 'Contratos com fornecedores não revisados para cláusulas de repasse IBS/CBS — risco de aumento de custo não previsto',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'fornecedores',
  }],
  'contratos': [{
    gap_descricao: 'Contratos com fornecedores sem cláusula de repasse IBS/CBS — risco de absorção de custo tributário adicional',
    area: 'juridico',
    severidade: 'alta',
    topico_trigger: 'contratos',
  }],
  'repasse': [{
    gap_descricao: 'Empresa sem análise de impacto do repasse tributário na cadeia de fornecedores — risco de aumento de custo operacional',
    area: 'negocio',
    severidade: 'alta',
    topico_trigger: 'repasse',
  }],

};
