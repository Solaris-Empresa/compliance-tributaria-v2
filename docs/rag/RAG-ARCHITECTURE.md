# RAG-ARCHITECTURE.md

> Arquitetura do pipeline de Retrieval-Augmented Generation (RAG) do SOLARIS.
> Referência técnica para manutenção e evolução do sistema de grounding normativo.

**Versão:** 1.0  
**Data:** 28/05/2026  
**Corpus:** CORPUS-BASELINE v9.1 (16.769 chunks / 25 leis)

---

## §1 — Visão Geral do Pipeline

O pipeline RAG do SOLARIS é responsável por fornecer grounding normativo (fundamentação legal) para as respostas geradas pelo LLM. Ele opera em três passes sequenciais, com gates determinísticos que injetam conteúdo adicional baseado no perfil da empresa (CNAE, NCM, NBS, regime tributário).

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE RAG SOLARIS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Perfil Empresa] ──► [Gates Determinísticos] ──► [Retrieval]   │
│       │                    │                          │          │
│       │                    ├── D1-C (Art.197)         │          │
│       │                    ├── D2 (artigo_pai)        │          │
│       │                    └── D4 (Parte Geral)       │          │
│       │                                               │          │
│       ▼                                               ▼          │
│  [shouldInjectCategory] ──► [risk_categories] ──► [LLM Prompt]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## §2 — Passes de Retrieval

### Pass 1 — Busca Semântica (Embedding)

Busca por similaridade vetorial no corpus `ragDocuments`. Filtrada por `lei` e `cnaeGroups` quando aplicável. Retorna os top-K chunks mais relevantes para a query do usuário.

**Filtros aplicados:**
- `leiFilter`: restringe por contexto (ver §4)
- `cnaeGroups`: match por prefixo CNAE quando o chunk é setorial

### Pass 2 — Injeção Determinística (Gates)

Chunks adicionais injetados sem busca semântica, baseados em regras hardcoded ou data-driven:

| Gate | Trigger | Chunks Injetados | Fonte |
|---|---|---|---|
| D1-C | CNAE grupo 28 + NCM 8436.* | 5 chunks Art. 197 LC 214 | `shouldInjectArt197()` |
| D2-DETECTOR | `artigo_pai` preenchido | Chunks filhos do artigo-pai | Campo `artigo_pai` em ragDocuments |
| D4-POOL | Q.NCM ativo + Parte Geral | Filtra chunks Parte Geral LC 214 do pool | `leiFilter` contextual |

### Pass 3 — Reranking (Jina)

Quando `JINA_RERANKER_ENABLED=true`, os chunks combinados dos Passes 1+2 são rerankeados pelo Jina Reranker para priorizar os mais relevantes ao contexto específico da query.

---

## §3 — Gates Determinísticos (D1-C / D2 / D4)

### D1-C — Injeção Art. 197 (Máquinas Agrícolas)

**Arquivo:** `server/lib/art197-injection.ts`  
**PR:** Campanha NCM (merged)  
**Lógica:** Se o perfil tem CNAE no grupo 28 (fabricação de máquinas) E NCM no padrão 8436.*, injeta os 5 chunks do Art. 197 da LC 214 (suspensão IBS/CBS para bens de capital agrícola).

```typescript
shouldInjectArt197(cnaes: string[], ncms: string[]): boolean
// true se algum CNAE startsWith("28") E algum NCM startsWith("8436")
```

**Status:** Hardcode interino. Issue #1275 (NEW-CAT) para migrar para categoria data-driven.

### D2-DETECTOR — Campo artigo_pai

**PRs:** #1267, #1269  
**Lógica:** O campo `artigo_pai` em `ragDocuments` marca chunks que são sub-artigos de um artigo principal. Permite detecção setorial sem busca semântica — o pipeline identifica que chunks com `artigo_pai = "Art. 197"` devem ser injetados quando o gate D1-C é ativado.

**Estado atual:** 5 chunks com `artigo_pai = "Art. 197"`. Expansão para outros artigos setoriais é tech debt documentado.

### D4-POOL — Filtro Parte Geral LC 214

**PR:** #1259  
**Lógica:** Quando o contexto é Q.NCM (questionário de produto), filtra chunks da Parte Geral da LC 214 do pool de retrieval para evitar poluição com conteúdo genérico que não é relevante para a análise NCM-específica.

---

## §4 — leiFilter por Contexto

O `leiFilter` restringe quais leis são consultadas dependendo do contexto da operação:

| Contexto | Leis Incluídas | Leis Excluídas | Justificativa |
|---|---|---|---|
| Diagnóstico geral | Todas | — | Cobertura ampla |
| Q.NCM (produto) | lc214, decreto12955, tabela_ncm_completa | Parte Geral LC 214 (D4) | Foco em tributação de bens |
| Q.NBS (serviço) | lc214, resolucao_cgibs_6, nbs_completa | — | Foco em tributação de serviços |
| Briefing | Todas | — | Síntese completa |
| SOLARIS perguntas | N/A (query direta) | — | `querySolarisByCnaes` |

---

## §5 — Corpus

Referência completa: [`docs/rag/CORPUS-BASELINE.md`](./CORPUS-BASELINE.md) (v9.1)

| Métrica | Valor |
|---|---|
| Total chunks | 16.769 |
| Total leis | 25 |
| Universais | 13.981 |
| Setoriais | 2.788 |
| Integridade (sem anchor/autor/curtos) | 100% |
| normative_product_rules | 26 |
| normative_service_rules | 27 |
| risk_categories confirmed | 18 |

---

## §6 — Diagrama de Fluxo Simplificado

```
Usuário → [Perfil: CNAE, NCM, NBS, Regime]
              │
              ├──► shouldInjectCategory(cnae, vigência) → [risk_categories confirmed]
              │         └──► 18 categorias (11 universais + 7 setoriais)
              │
              ├──► shouldInjectArt197(cnaes, ncms) → [D1-C: 5 chunks Art.197]
              │
              ├──► querySolarisByCnaes(cnaes) → [Perguntas SOLARIS: 12-16]
              │
              └──► RAG Retrieval (Pass 1 + Pass 2 + Pass 3)
                        │
                        ├── Pass 1: Embedding search (leiFilter + cnaeGroups)
                        ├── Pass 2: D1-C + D2-DETECTOR + D4-POOL
                        └── Pass 3: Jina Reranker (opcional)
                                │
                                ▼
                        [LLM Prompt com grounding normativo]
```

---

## §7 — Referências

| Artefato | Localização |
|---|---|
| CORPUS-BASELINE v9.1 | `docs/rag/CORPUS-BASELINE.md` |
| Art.197 injection | `server/lib/art197-injection.ts` |
| Deterministic grounding | `server/lib/deterministic-grounding.ts` |
| SOLARIS query | `server/lib/solaris-query.ts` |
| Regime imóveis eligibility | `server/lib/regime-imoveis-eligibility.ts` |
| Risk eligibility IS | `server/lib/risk-eligibility-is-ncm-cnae.ts` |
| Coverage tests | `server/integration/coverage-11-profiles.test.ts` |
| E2E alignment tests | `server/integration/e2e-alignment.test.ts` |
