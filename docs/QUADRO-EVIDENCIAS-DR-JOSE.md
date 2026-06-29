# Quadro de Evidências — 13 Riscos do Dr. José × Matriz de Riscos IA SOLARIS

**Versão:** 1.0  
**Data:** 2026-06-29  
**Autoria:** Manus (Implementador) — Projeto IA SOLARIS  
**Aprovação pendente:** P.O. Uires Tapajós  
**Commit de referência:** HEAD `main` — branch `docs/quadro-evidencias-dr-jose`

---

## 1. Diagnóstico: Por que os 13 riscos do Dr. José não aparecem na matriz?

### 1.1 Fluxo real da geração de riscos (AS-IS)

O sistema possui **dois fluxos paralelos** de geração de riscos que operam de forma independente:

| Fluxo | Motor | Entrada | Saída | Exibição |
|-------|-------|---------|-------|----------|
| **Fluxo A — Matriz Legada** | LLM (`generateRiskMatrices`) | Briefing textual + RAG por área | Riscos em `riskMatricesDataV3` (JSON no campo do projeto) | Página `/matrizes-v3` |
| **Fluxo B — Engine v4** | Determinístico (`risk-engine-v4.ts` + `normative-inference.ts`) | `ProjectProfile` (CNAEs + regime + NCMs + gaps) | Riscos em tabela `risks_v4` | Página `/risk-dashboard-v4` |

**Os 13 riscos do Dr. José pertencem ao Fluxo A (Matriz Legada).** O Dr. José avaliou a saída do LLM (`generateRiskMatrices`), que usa o briefing como entrada e gera riscos por área (fiscal, operacional, jurídico, TI). Esse fluxo **não é determinístico** — a saída varia conforme o contexto RAG recuperado e o briefing gerado.

### 1.2 Causa-raiz real (confirmada por código e banco)

A investigação do código-fonte e do banco de produção revelou **três gaps estruturais** que explicam a ausência dos 13 riscos:

---

## 2. Quadro de Evidências

### GAP-1: RAG não recupera artigos de construção civil com confiança suficiente

| Campo | Conteúdo |
|-------|----------|
| **Problema** | O motor RAG (`retrieveArticlesFast`) usa a query do briefing + CNAEs para recuperar artigos. Para a CONSTRUTORA VII (CNAE `4120-4/00`), o risco `risco_art_269_270` foi gerado com `rag_validated = false` e `rag_confidence = 0.00`, com nota: *"Base legal não localizada no corpus RAG"*. |
| **Gap técnico** | Os artigos 252–270 da LC 214/2025 e os Arts. 360–372 do Decreto 12.955/2026 estão no corpus (25 leis, 16.702 chunks), mas a query de recuperação não os alcança com score suficiente para o contexto de construção civil. |
| **Evidência no banco** | `risks_v4` WHERE `project_id = 10680001` AND `categoria = 'risco_art_269_270'`: `rag_validated = 0`, `rag_confidence = 0.00`, `rag_validation_note = 'Base legal não localizada no corpus RAG'` |
| **Evidência no código** | `server/routers-fluxo-v3.ts:3118` — `generateRiskMatrices` usa `retrieveArticlesFast(cnaeCodesMatrix, areaQuery, 7)` com apenas 7 artigos por área. Para construção civil, os artigos relevantes (Arts. 252–270 LC 214) competem com artigos gerais de IBS/CBS e perdem na ordenação por relevância. |
| **Solução TO-BE** | Adicionar queries RAG especializadas por CNAE setorial. Para CNAEs `41xx`, injetar query: `"regime específico bens imóveis construção civil Art. 252 Art. 269 Art. 270 CIB empreendimento"` antes do loop de áreas. |
| **Resultado esperado** | `rag_validated = true`, `rag_confidence ≥ 0.85`, artigos 252–270 aparecem no contexto do LLM → riscos gerados com fundamentação auditável. |

---

### GAP-2: Briefing não menciona as 13 dimensões específicas do Dr. José

| Campo | Conteúdo |
|-------|----------|
| **Problema** | O briefing gerado pelo LLM (`generateBriefing`) é genérico para o setor de construção civil. Ele menciona "regime específico de bens imóveis" mas não detalha as 13 dimensões identificadas pelo Dr. José: Redutor de Ajuste, SINTER, permuta, SPE/SCP, CIB, apuração por empreendimento, tributação por parcelas, etc. |
| **Gap técnico** | A função `buildRegimeImoveisRestriction` (`regime-imoveis-eligibility.ts:75`) injeta uma diretriz no prompt do briefing para citar as dimensões aplicáveis (50% / 70% / Arts. 269-270), mas **não lista as 13 dimensões específicas** do Dr. José. A diretriz atual cobre apenas 3 dimensões (redução 50%, redução 70%, CIB/empreendimento). |
| **Evidência no código** | `server/lib/regime-imoveis-eligibility.ts:75–134` — `buildRegimeImoveisRestriction` retorna diretriz com 3 dimensões. As 13 dimensões do Dr. José (Redutor de Ajuste, SINTER, permuta, SPE/SCP, custos históricos 2027, contrapartidas urbanísticas, recálculo posterior, tributação por parcelas, revisão de contratos, risco tecnológico) não estão mapeadas. |
| **Evidência no banco** | CONSTRUTORA VII (`id = 10680001`): `status = 'matriz_riscos'`. O campo `briefingContentV3` contém o briefing gerado — ao ser usado como entrada para `generateRiskMatrices`, o LLM só "vê" o que o briefing menciona. |
| **Solução TO-BE** | Expandir `buildRegimeImoveisRestriction` para incluir as 13 dimensões do Dr. José como tópicos obrigatórios de cobertura no briefing. Alternativamente, criar `buildRegimeImoveisRiscosDrJose` com as 13 dimensões mapeadas para artigos específicos (Art. 257–258 Redutor, Art. 256 SINTER, Art. 259 permuta, Art. 270 CIB/empreendimento, etc.). |
| **Resultado esperado** | Briefing passa a mencionar as 13 dimensões → `generateRiskMatrices` recebe contexto completo → LLM gera riscos cobrindo todas as 13 questões. |

---

### GAP-3: Engine v4 (`normative-inference.ts`) gera apenas 2 riscos de construção civil

| Campo | Conteúdo |
|-------|----------|
| **Problema** | O motor determinístico (`normative-inference.ts`) gera apenas 2 entradas para construção civil: `regime_especifico_imoveis` (oportunidade 50%) e `risco_art_269_270` (CIB + empreendimento). Os outros 11 riscos do Dr. José não têm regra correspondente no engine. |
| **Gap técnico** | O engine usa gates binários por CNAE (`isRegimeImoveisOportunidade`, `isRegimeImoveisRisco`). Cada gate gera **um único risco** independentemente da complexidade do setor. As 13 dimensões do Dr. José requerem 13 regras distintas no engine. |
| **Evidência no banco** | CONSTRUTORA VII (`id = 10680001`): `risks_v4` contém 8 riscos. Os 2 de construção civil são: `regime_especifico_imoveis` (oportunidade, `source_priority = 'inferred'`, `gap_detected = 0`) e `risco_art_269_270` (risco, `source_priority = 'inferred'`, `gap_detected = 0`). Os outros 6 são genéricos (confissão automática, inscrição cadastral, split payment, regime diferenciado, transição ISS/IBS, obrigação acessória). |
| **Evidência no código** | `server/lib/normative-inference.ts:232–262` — bloco `if (profile.taxRegime !== 'simples_nacional')` contém apenas 3 `makeInferredRisk` para imóveis. Nenhum dos 13 riscos do Dr. José está implementado como regra determinística. |
| **Solução TO-BE** | Implementar 13 regras determinísticas no engine para CNAEs `41xx`/`68xx` (construção civil e incorporação): uma regra por dimensão do Dr. José, com artigo específico, severidade e urgência definidos. |
| **Resultado esperado** | Engine gera 13+ riscos para construtoras → `risks_v4` passa a ter cobertura completa das 13 dimensões → matriz de riscos exibe todos os riscos identificados pelo Dr. José. |

---

## 3. Mapeamento TO-BE: 13 Riscos × Artigo × Regra a Implementar

| # | Risco (Dr. José) | Artigo Base | Regra Engine TO-BE | Dimensão |
|---|-----------------|-------------|-------------------|----------|
| 1 | Perda de créditos do IBS | Art. 269–270 LC 214 + Art. 369 Dec. 12.955 | `risco_creditos_ibs_construcao` | Crédito |
| 2 | Perda do Redutor de Ajuste | Art. 257–258 LC 214 + Arts. 360–362 Dec. 12.955 | `risco_redutor_ajuste` | Redutor |
| 3 | SINTER / avaliação dos imóveis | Art. 256 LC 214 + Arts. 363–364 Dec. 12.955 | `risco_sinter_avaliacao` | Cadastro |
| 4 | Risco na venda por permuta | Art. 259 LC 214 + Arts. 365–366 Dec. 12.955 | `risco_permuta_imoveis` | Operação |
| 5 | Controle por empreendimento | Art. 270 LC 214 + Arts. 370–371 Dec. 12.955 | `risco_apuracao_empreendimento` | Apuração |
| 6 | Documentação fiscal da obra | Art. 269 LC 214 + Art. 369 Dec. 12.955 | `risco_documentacao_obra` | Fiscal |
| 7 | CIB — Cadastro Imobiliário de Beneficiários | Arts. 265–266 LC 214 + Arts. 367–368 Dec. 12.955 | `risco_cib_cadastro` | Cadastro |
| 8 | Custos históricos 2027 | Art. 258 LC 214 + Arts. 361–362 Dec. 12.955 | `risco_custos_historicos_2027` | Transição |
| 9 | Contrapartidas urbanísticas | Art. 258 LC 214 + Art. 362 Dec. 12.955 | `risco_contrapartidas_urbanisticas` | Operação |
| 10 | Recálculo posterior do IBS | Art. 262 LC 214 + Art. 370 Dec. 12.955 | `risco_recalculo_ibs` | Apuração |
| 11 | Tributação por parcelas | Art. 262 LC 214 + Art. 372 Dec. 12.955 | `risco_tributacao_parcelas` | Fiscal |
| 12 | Revisão dos contratos | Arts. 263–264 LC 214 + Arts. 365–366 Dec. 12.955 | `risco_revisao_contratos` | Jurídico |
| 13 | Risco tecnológico (SPED/EFD) | Art. 270 LC 214 + Art. 371 Dec. 12.955 | `risco_tecnologico_construcao` | TI |

---

## 4. Plano de Implementação TO-BE

### Fase 1 — RAG Setorial (GAP-1) · Prioridade: Alta · Esforço: 1 sprint

**Arquivo:** `server/lib/normative-inference.ts` (ou novo `server/lib/rag-query-builder.ts`)

```typescript
// TO-BE: queries RAG especializadas por CNAE setorial
const CNAE_RAG_QUERIES: Record<string, string> = {
  "41": "regime específico bens imóveis construção civil Art. 252 Art. 269 Art. 270 CIB empreendimento Redutor Ajuste SINTER permuta",
  "68": "regime específico bens imóveis incorporação alienação Art. 261 Art. 263 Art. 256 SINTER",
};
```

**Impacto:** `rag_validated` passa de `false` para `true` para todos os riscos de construção civil. Sem alteração de schema.

---

### Fase 2 — Briefing Setorial (GAP-2) · Prioridade: Alta · Esforço: 1 sprint

**Arquivo:** `server/lib/regime-imoveis-eligibility.ts`

Expandir `buildRegimeImoveisRestriction` para incluir as 13 dimensões como tópicos obrigatórios de cobertura no prompt do briefing LLM.

**Impacto:** Briefing passa a cobrir as 13 dimensões → `generateRiskMatrices` recebe contexto completo. Sem alteração de schema.

---

### Fase 3 — Engine v4 Setorial (GAP-3) · Prioridade: Média · Esforço: 2 sprints · **Requer aprovação P.O.**

**Arquivo:** `server/lib/normative-inference.ts`

Implementar 13 regras determinísticas para CNAEs `41xx`/`68xx`. Cada regra usa `makeInferredRisk` com artigo específico, severidade e urgência definidos pela tabela da Seção 3.

**Impacto:** `risks_v4` passa a ter 13+ riscos para construtoras. Sem alteração de schema (usa estrutura existente).

---

## 5. Resumo Executivo

| Dimensão | AS-IS | TO-BE (após implementação) |
|----------|-------|---------------------------|
| Riscos de construção civil na matriz (CONSTRUTORA VII) | 2 de 13 (15%) | 13 de 13 (100%) |
| RAG validado para construção civil | `rag_validated = false` (0%) | `rag_validated = true` (≥ 85%) |
| Cobertura do briefing | 3 dimensões (50%, 70%, CIB) | 13 dimensões (todas do Dr. José) |
| Engine determinístico | 2 regras (oportunidade + CIB) | 13 regras (uma por dimensão) |
| Dataset (corpus RAG) | ✅ Completo — 16.702 chunks, 25 leis, Arts. 252–270 LC 214 + Arts. 360–372 Dec. 12.955 presentes | ✅ Mantido — nenhuma alteração necessária |

> **Conclusão:** O dataset **não é o problema**. Os artigos relevantes estão no corpus. Os 3 gaps são de **orquestração** (como o RAG é consultado, como o briefing é construído, e quantas regras o engine possui). A implementação do TO-BE não requer ingestão de novos documentos.

---

*Documento gerado por Manus (Implementador IA SOLARIS) em 2026-06-29. Base: código-fonte `main` HEAD + banco de produção (READ-ONLY). Aprovação: P.O. Uires Tapajós.*
