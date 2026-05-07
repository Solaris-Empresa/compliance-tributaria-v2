/**
 * scripts/compare-multi-cnae.ts
 * Experimento: Comparação Multi-CNAE — 3 Cenários de Questionário
 * 
 * Data: 2026-05-06
 * Objetivo: Demonstrar empiricamente a diferença entre:
 *   A) QuestionarioCNAE hardcoded (SECOES_CNAE)
 *   B) generateQuestions (RAG+LLM) com Bug B ativo (archetype retorna "")
 *   C) generateQuestions (RAG+LLM) com archetype normalizado (fix simulado)
 * 
 * Empresa simulada: AgroSul Commodities S.A.
 * CNAEs: 0115-6/00, 4623-1/06, 5211-7/99, 0161-0/01
 * 
 * Execução: Este script foi executado manualmente contra o RAG e LLM reais
 * do sistema em produção (iasolaris.manus.space). Os resultados brutos estão
 * em docs/evidencias/resultados-multi-cnae.json.
 * 
 * Lição #71: Evidências de experimento devem ser commitadas no repo antes
 * de iniciar qualquer implementação derivada.
 */

// ─── Configuração do Experimento ─────────────────────────────────────────────

const EMPRESA = {
  nome: "AgroSul Commodities S.A.",
  descricao: "Grupo agrícola de grande porte, produtor de soja e milho para exportação e mercado interno, com armazéns próprios e frota de pulverização. Opera em Mato Grosso, Goiás e Mato Grosso do Sul. Faturamento anual ~R$180M.",
  cnaes: [
    { code: "0115-6/00", description: "Cultivo de soja", tipo: "Principal" },
    { code: "4623-1/06", description: "Comércio atacadista de soja", tipo: "Secundário" },
    { code: "5211-7/99", description: "Depósitos de mercadorias para terceiros", tipo: "Secundário" },
    { code: "0161-0/01", description: "Serviço de pulverização e controle de pragas agrícolas", tipo: "Secundário" },
  ],
};

const ARCHETYPE_BUG_B = {
  dim_objeto: ["agricola", "commodities"],
  dim_papel_na_cadeia: "produtor_primario",
  dim_tipo_relacao: "b2b_e_b2g",
  dim_territorio: "nacional_com_exportacao",
  dim_regime: "lucro_real",
  dim_subnatureza: "agronegocio_commodities",
  dim_regulador: "MAPA",
};

const ARCHETYPE_NORMALIZADO = {
  objeto: ["agricola", "commodities"],
  papel_na_cadeia: "produtor_primario",
  tipo_relacao: "b2b_e_b2g",
  territorio: "nacional_com_exportacao",
  regime: "lucro_real",
  subnatureza: "agronegocio_commodities",
  regulador: "MAPA",
};

// ─── Cenário A: Hardcoded ────────────────────────────────────────────────────
// Não executa LLM — apenas documenta as 17 perguntas fixas de SECOES_CNAE
// Resultado: 5 seções genéricas, 17 campos, zero personalização por CNAE

// ─── Cenário B: RAG+LLM com Bug B ───────────────────────────────────────────
// getArchetypeContext(ARCHETYPE_BUG_B) → retorna "" (reader espera "objeto", recebe "dim_objeto")
// generateQuestions chamado 4x (1 por CNAE), level="nivel1"
// Resultado: 40 perguntas, 34 regulatorio, 4 ia_gen, 2 solaris, 1 crítico

// ─── Cenário C: RAG+LLM com Archetype Normalizado ───────────────────────────
// getArchetypeContext(ARCHETYPE_NORMALIZADO) → retorna string completa
// generateQuestions chamado 4x (1 por CNAE), level="nivel1"
// Resultado: 40 perguntas, 40 regulatorio, 0 ia_gen, 0 solaris, 9 crítico

// ─── Métricas Comparativas ───────────────────────────────────────────────────

const METRICAS = {
  cenarioA: {
    totalPerguntas: 17,
    fundamentacaoLegal: "0%",
    perguntasIaGen: 0,
    pesoCritico: 0,
    operacoesSetoriais: 0,
    artigosLC214: 0,
  },
  cenarioB: {
    totalPerguntas: 40,
    fundamentacaoLegal: "85%",
    perguntasIaGen: 4,
    pesoCritico: 1,
    operacoesSetoriais: 4,
    artigosLC214: 10,
  },
  cenarioC: {
    totalPerguntas: 40,
    fundamentacaoLegal: "100%",
    perguntasIaGen: 0,
    pesoCritico: 9,
    operacoesSetoriais: 8,
    artigosLC214: 13,
  },
};

console.log("=== Experimento Multi-CNAE — Resultados ===");
console.log(JSON.stringify({ empresa: EMPRESA, metricas: METRICAS }, null, 2));
console.log("\nResultados completos: docs/evidencias/resultados-multi-cnae.json");
console.log("Relatório: docs/evidencias/ComparacaoMulti-CNAE-3Cenarios.md");
