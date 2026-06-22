---
description: Governance ADR-REF — índice dos Architecture Decision Records ativos + referências cruzadas
globs:
  - "docs/governance/**"
---

# Governance Rules — Índice de ADRs

> Parte 4 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).
> Conteúdo GERADO a partir de `docs/adr/`. Fonte autoritativa: `docs/adr/ADR-INDEX.md`.

## ADRs ativos (31 arquivos em `docs/adr/`)

| Arquivo | Título |
|---|---|
| `0002-arquitetura-3-ondas-perguntas.md` | — |
| `ADR-0009-fluxo-canonico-fontes-diagnostico.md` | ADR-0009 — Fluxo Canônico e Fontes do Diagnóstico |
| `ADR-0010-substituicao-qc-qo-por-ncm-nbs.md` | ADR-0010 — Substituição de QC/QO por Q.Produtos (NCM) e Q.Serviços (NBS) |
| `ADR-0011-consolidacao-respostas-pipeline.md` | ADR-0011 — Consolidação de Respostas no Pipeline de Briefing |
| `ADR-0012-art57-vs-art2-is-mapeamento-canonico.md` | ADR-0012 — Mapeamento Canônico: Art. 57 vs Art. 2 LC 214/2025 (Imposto Seletivo) |
| `ADR-0013-badge-risk-category-l2-frontend.md` | ADR-0013 — Badge risk_category_l2 no Frontend (RisksV3) |
| `ADR-0016-completude-confianca-questionarios.md` | ADR-0016 — Modelo de Completude e Confiança dos Questionários |
| `ADR-0017-aviso-ncm-nbs-ausente.md` | ADR-0017 — Aviso de Diagnóstico Genérico quando NCM/NBS Ausente |
| `ADR-0018-context-injection-briefing.md` | ADR-0018 — Context Injection: Fontes Ausentes no Briefing |
| `ADR-0020-schema-drift-0063.md` | ADR-0020 — Schema Drift: Migration 0063 (hash divergente) |
| `ADR-0022-hot-swap-risk-engine-v4.md` | ADR-0022 — Hot Swap: Risk Engine v4 (Determinístico) substitui generateRiskMatrices (LLM) |
| `ADR-0023-cpie-score-opcao-a-sprint-z07.md` | ADR-0023 — Score CPIE: Opção A para Sprint Z-07 |
| `ADR-0025-risk-categories-configurable-rag-sensor.md` | ADR-0025 — Categorias de Risco Configuráveis via Banco + RAG Sensor |
| `ADR-0026-anti-corruption-layer-gap-risk.md` | ADR-0026 — Anti-Corruption Layer Gap→Risk |
| `ADR-0027-fonte-verdade-respostas-por-onda.md` | ADR-0027 — Fonte de Verdade das Respostas por Onda |
| `ADR-0028-categorizacao-onda2-iagen.md` | ADR-0028 — Categorização da Onda 2 (IA GEN) |
| `ADR-0029-cpie-v3-drop-estrategia-excecoes.md` | ADR-0029 — CPIE v3: Mudança de estratégia @deprecated → DROP + exceções autorizadas a restrições absolutas |
| `ADR-0030-fonte-canonica-gap-solaris.md` | ADR-0030 — Fonte Canônica de Gap SOLARIS · Arquitetura Max |
| `ADR-0030-hotfix-is-elegibilidade-por-operationtype-v1.1.md` | ADR-0030 AMENDMENT — Hotfix IS: ajustes pós-crítica do implementador (v1.1) |
| `ADR-0031-imutabilidade-snapshot.md` | ADR-0031 — Imutabilidade do Snapshot do Perfil da Entidade |
| `ADR-0032-versionamento-perfil-entidade.md` | ADR-0032 — Versionamento do Snapshot do Perfil da Entidade |
| `ADR-0033-identidade-fiscal-dual.md` | ADR-0033 — Identidade Fiscal Dual (CPF/CNPJ) |
| `ADR-0034-drop-compliance-v3-legado.md` | ADR-0034 — Remoção do dashboard compliance-v3 legado (Fase 1: frontend órfão + router) |
| `ADR-0035-ncm-nbs-resolver-cascata.md` | ADR-0035 — Resolver NCM/NBS em cascata (ponto único de decisão) |
| `ADR-0036-reranker-ncm-aware-opcao-a.md` | ADR-0036 — Reranker NCM-aware (Opção A: instrução de aderência ao NCM no `rerankWithLLM`) |
| `ADR-0037-gate-deploy-4-heads-obrigatorio.md` | ADR-0037 — Gate de deploy obrigatório: 4 HEADs alinhados (BLOQUEANTE) |
| `ADR-0038-regime-tributario-filtro-questionario.md` | ADR-0038 — Gate Regime Tributário no Questionário SOLARIS Onda 1 |
| `ADR-010-content-architecture-98.md` | ADR-010 — Arquitetura Canônica de Conteúdo Diagnóstico para Confiabilidade 98% |
| `ADR-ARCH-01-modelo-tributario.md` | ADR-ARCH-01 — Governança do Modelo Tributário |
| `ADR-GP-001-guia-pratico-llm-efemero.md` | ADR-GP-001 — Guia Prático: Modal IA Generativa efêmero no Plano de Ação |
| `ADR-INDEX.md` | ADR Index — IA SOLARIS |

## Referências cruzadas (regra → ADR)

As regras em `governance-core.md` e as lições em `governance-lessons.md` referenciam ADRs por número (ex.: `ADR-0035`, `ADR-0038`). Para o texto completo de cada decisão, consultar o arquivo correspondente em `docs/adr/`. Destaques operacionais:

- **ADR-0022** — hot swap risk engine v4 (`generateRiskMatrices` desativado; `risksV4` ativo)
- **ADR-0025** — risk_categories configuráveis (RAG sensor)
- **ADR-0035** — resolver cascata NCM/NBS (grupo vs específico)
- **ADR-0036** — reranker NCM-aware (Opção A)
- **ADR-0037** — gate de deploy 4 HEADs obrigatório
- **ADR-0038** — filtro de questionário por regime tributário

