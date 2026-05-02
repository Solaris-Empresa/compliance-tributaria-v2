# M3-DIAG-ARCHETYPE-ADOPTION — Diagnóstico de Adoção do Arquétipo

> **Tipo:** Investigação read-only  
> **Autor:** Manus (implementador técnico)  
> **Data:** 2026-05-01  
> **SHA base:** 50afed6 (origin/main)  
> **Objetivo:** Mapear onde o archetype (Perfil da Entidade) é consumido vs. onde DEVERIA ser consumido por downstream engines.

---

## Resumo Executivo

O archetype (6 dimensões M1 v3) é **persistido corretamente** em `projects.archetype` (Sprint M2, ADR-0031), mas **ZERO engines downstream o consomem**. Todos os questionários, briefing, risk engine, RAG e plano de ação continuam lendo dados **legados** (`companyProfile`, `operationProfile`, `operationType` single-select).

| Frente | Consome archetype? | Fonte atual |
|--------|-------------------|-------------|
| IA GEN Onda 2 (questions) | ❌ NÃO | `companyProfile` + `operationProfile` legado |
| Questionário Produtos (NCM) | ❌ NÃO | `operationProfile.principaisProdutos` |
| Questionário Serviços (NBS) | ❌ NÃO | `operationProfile.principaisServicos` |
| Solaris Onda 1 (questions) | ❌ NÃO | `solarisQuestions.cnaeGroups` (filtro CNAE) |
| Gap Analysis | ❌ NÃO | `operationType` legado |
| Risk Engine v4 (aferição) | ❌ NÃO | `ProjectProfile` legado (via `extractProjectProfile`) |
| Briefing Engine | ❌ NÃO | `companyProfile` + `operationProfile` + respostas |
| RAG Retrieval | ❌ NÃO | `cnaes[]` + `contextQuery` string livre |
| filtrarCategoriasPorPerfil | ❌ NÃO | `operationType` legado (ex: "financeiro") |
| Decision Kernel | ❌ NÃO | Sem referência a archetype |
| Diagnostic Consolidator | ❌ NÃO | Sem referência a archetype |
| Action Plan Engine | ❌ NÃO | Sem referência a archetype |

---

## Frente 1 — IA GEN Onda 2 (generateOnda2Questions)

**Arquivo:** `server/routers-fluxo-v3.ts` (linhas ~800-1000)  
**Procedimento:** `generateOnda2Questions`

**O que faz:** Gera perguntas personalizadas via LLM baseadas no perfil da empresa.

**Contexto injetado no LLM:**
```
companyProfile.companyType
companyProfile.companySize
companyProfile.taxRegime
companyProfile.annualRevenueRange
operationProfile.operationType
operationProfile.clientType
operationProfile.multiState
```

**Referência a archetype:** ZERO. Nenhuma menção a `dim_objeto`, `dim_papel_na_cadeia`, `subnatureza_setorial`, `orgao_regulador`.

**Gap:** O LLM gera perguntas baseado em "financeiro" (operationType legado) em vez de "servico_financeiro" (dim_objeto) + "operadora_regulada" (dim_papel_na_cadeia) + "BCB" (orgao_regulador). Perguntas resultantes são **genéricas** em vez de **específicas ao perfil dimensional**.

---

## Frente 2+3 — Questionários Produtos (NCM) e Serviços (NBS)

**Arquivo:** `server/routers/product-questions.ts`, `server/routers/service-questions.ts`  
**Referência a archetype:** ZERO.

**Fonte atual:** Leem `operationProfile.principaisProdutos` e `operationProfile.principaisServicos` (preenchidos pelo usuário no formulário de criação de projeto).

**Gap:** O archetype contém `nbss_canonicos` e `ncms_canonicos` (derivados pela engine M1) que poderiam enriquecer ou substituir o input manual. Atualmente ignorados.

---

## Frente 4 — Solaris Onda 1 (getOnda1Questions)

**Arquivo:** `server/db.ts` (linha 1263), `server/routers-fluxo-v3.ts` (linha 3611)  
**Referência a archetype:** ZERO.

**Fonte atual:** Filtra perguntas por `cnaeGroups` (match de prefixo CNAE). Não usa nenhuma dimensão do archetype.

**Gap:** Perguntas Solaris poderiam ser filtradas por `dim_objeto` + `subnatureza_setorial` para apresentar apenas questões relevantes ao perfil dimensional (ex: perguntas de "operadora regulada BCB" vs. perguntas genéricas de "serviços").

---

## Frente 5 — Gap Analysis

**Arquivo:** `server/config/solaris-gaps-map.ts`  
**Referência a archetype:** ZERO.

**Fonte atual:** Mapeia tópicos de `solaris_questions` para definições de gaps. Não referencia dimensões do archetype.

---

## Frente 6 — Risk Engine v4 (Aferição de Riscos)

**Arquivo:** `server/lib/risk-engine-v4.afericao.ts`  
**Referência a archetype:** ZERO.

**Fonte atual:** Usa `ProjectProfile` (interface legada) que contém:
- `financialProfile` (paymentMethods, hasIntermediaries)
- `taxComplexity` (usesTaxIncentives)
- `operationProfile` (operationType single-select)

**Gap crítico:** `filtrarCategoriasPorPerfil()` (linha 104 de `routers-fluxo-v3.ts`) decide quais categorias de risco são relevantes baseado em `operationType` legado:
```typescript
case "imposto_seletivo":
  return ["industria", "comercio"].includes(op?.operationType ?? "");
case "transicao_iss_ibs":
  return ["servicos", "misto"].includes(op?.operationType ?? "");
```

Com archetype, poderia usar `dim_objeto` + `dim_tipo_de_relacao` para filtragem mais precisa.

---

## Frente 7 — Briefing Engine

**Arquivo:** `server/routers-fluxo-v3.ts` (linhas ~1100-1250)  
**Referência a archetype:** ZERO.

**Contexto injetado no LLM do briefing:**
```
companyProfileBlock:
  - Razão Social
  - CNAE Principal
  - Porte
  - Regime Tributário
  - Faturamento Anual
  - Principais Produtos (NCM) ← de operationProfile
  - Principais Serviços (NBS) ← de operationProfile

additionalSourcesContext:
  - respostas_solaris_onda1
  - respostas_iagen_onda2
  - respostas_q_produtos_ncm
  - respostas_q_servicos_nbs
```

**Gap:** O briefing NÃO recebe:
- `dim_objeto` (servico_financeiro)
- `dim_papel_na_cadeia` (operadora_regulada)
- `subnatureza_setorial` (financeiro)
- `orgao_regulador` (BCB)
- `dim_territorio` (nacional)
- `dim_tipo_de_relacao` (servico)

O LLM gera briefing sem saber que a empresa é uma **operadora regulada pelo BCB** — informação crítica para compliance tributário.

---

## Frente 8 — RAG Retrieval

**Arquivo:** `server/rag-retriever.ts` (linha 259)  
**Referência a archetype:** ZERO.

**Assinatura atual:**
```typescript
export async function retrieveArticles(
  cnaes: string[],
  contextQuery: string,
  topK = 5,
  usageOpts: RAGUsageOptions = {}
): Promise<RAGContext>
```

**Gap:** `retrieveArticles` aceita APENAS `cnaes[]` + `contextQuery` (string livre). Não aceita `PerfilDimensional` opcional. O re-ranking via LLM não tem acesso às dimensões do archetype para priorizar artigos relevantes ao perfil.

**Confirmação auditoria v7.60:** Exatamente o achado da Seção 7.1 — "M1 v3 → RAG está DESACOPLADO".

---

## Frente 9 — Decision Kernel

**Arquivo:** `server/lib/decision-kernel/`  
**Referência a archetype:** ZERO.

---

## Frente 10 — Diagnostic Consolidator

**Arquivo:** `server/diagnostic-consolidator.ts`  
**Referência a archetype:** ZERO.

---

## Frente 11 — Action Plan Engine

**Arquivo:** `server/routers-session-action-plan.ts`  
**Referência a archetype:** ZERO.

---

## Frente 12 — Consumidores reais do archetype (hoje)

**Únicos consumidores:**
1. `server/routers/perfil.ts` — build + confirm + read (write-once + leitura de snapshot)
2. `server/_core/systemRouter.ts` — expõe flag `m1ArchetypeEnabled` (boolean)
3. `server/routers-m1-monitor.ts` — M1 Runner v3 (deploy controlado, flag desativada)

**Nenhum engine downstream lê `projects.archetype` para decisão de negócio.**

---

## Matriz de Impacto

| Engine | Impacto se receber archetype | Prioridade |
|--------|------------------------------|-----------|
| **Briefing** | Alto — LLM saberia que é operadora BCB-regulada | P1 |
| **RAG Retrieval** | Alto — re-ranking priorizaria artigos de regulação financeira | P1 |
| **Risk Engine v4** | Médio — filtragem de categorias mais precisa | P2 |
| **IA GEN Onda 2** | Médio — perguntas mais específicas ao perfil | P2 |
| **Solaris Onda 1** | Baixo — filtro CNAE já funciona razoavelmente | P3 |
| **Q. Produtos/Serviços** | Baixo — input manual é a fonte primária | P3 |
| **Decision Kernel** | Baixo — não implementado completamente | P4 |
| **Action Plan** | Médio — plano de ação deveria considerar perfil | P2 |

---

## Recomendação Arquitetural (M3)

### Fase 1 — Injeção no Briefing (P1, baixo risco)

```typescript
// Ler archetype se confirmado
const arch = project.archetype ? JSON.parse(project.archetype) : null;
const archetypeBlock = arch ? `
## Perfil Dimensional (Arquétipo M1)
- Objeto Econômico: ${arch.dim_objeto?.join(', ')}
- Papel na Cadeia: ${arch.dim_papel_na_cadeia}
- Subnatureza Setorial: ${arch.subnatureza_setorial?.join(', ')}
- Órgão Regulador: ${arch.orgao_regulador?.join(', ')}
- Território: ${arch.dim_territorio?.join(', ')}
- Regime: ${arch.dim_regime}
` : '';
```

### Fase 2 — RAG com PerfilDimensional opcional (P1, médio risco)

```typescript
export async function retrieveArticles(
  cnaes: string[],
  contextQuery: string,
  topK = 5,
  usageOpts: RAGUsageOptions = {},
  perfilDimensional?: PerfilDimensional // NOVO — opcional, backward-compatible
): Promise<RAGContext>
```

### Fase 3 — Risk Engine + IA GEN (P2)

Substituir `operationType` legado por `dim_objeto` + `dim_papel_na_cadeia` em `filtrarCategoriasPorPerfil` e no prompt de `generateOnda2Questions`.

---

## Riscos e Guardrails

| Risco | Mitigação |
|-------|-----------|
| Archetype NULL (projeto antigo sem M2) | Fallback para dados legados — NUNCA quebrar |
| Archetype diverge de operationProfile | Archetype é fonte de verdade pós-confirmação |
| RAG retorna artigos irrelevantes | Manter fallback CNAE-only se perfilDimensional ausente |
| Briefing verboso demais | Limitar archetypeBlock a 6 linhas |

---

## Rastreabilidade

| Documento | Referência |
|-----------|-----------|
| Auditoria v7.60 §7.1 | `docs/governance/audits/v7.60-2026-04-28-bundle-m1-corpus-gate.md` |
| ADR-0031 (imutabilidade) | Snapshot write-once em `projects.archetype` |
| ADR-0032 (versionamento) | `archetypeVersion` + `archetypeRulesHash` |
| SPEC M2 (rag_downstream_contract) | `docs/specs/m2-perfil-entidade/PROMPT-M2-v3-FINAL.json` |
| HANDOFF-MANUS v8.0 §M3 | "Consumo: engines downstream leem archetype" |

---

## Conclusão

O Sprint M2 cumpriu seu objetivo: **persistir o archetype de forma imutável e auditável**. O Sprint M3 deve cumprir o segundo objetivo: **fazer os engines downstream consumirem o archetype**. O gap é total (0/12 frentes consomem) mas o caminho é incremental e backward-compatible (archetype é sempre opcional, fallback para legado).
