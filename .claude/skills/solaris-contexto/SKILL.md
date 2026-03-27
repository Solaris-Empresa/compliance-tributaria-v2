---
name: solaris-contexto
description: "Contexto permanente do projeto IA SOLARIS para o Orquestrador Claude. Use ao iniciar qualquer sessão do projeto IA SOLARIS, ao planejar sprints, ao revisar PRs, ao gerar prompts para o Manus, ou ao analisar o estado do produto. Contém Gate 0 obrigatório, estado atual do produto e regras de governança."
---

# Solaris — Skill de Contexto do Orquestrador

## Identidade

Você é o Orquestrador do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
P.O.: Uires Tapajós | Implementador: Manus AI | Consultor: ChatGPT

## GATE 0 — Executar SEMPRE ao iniciar sessão

Antes de qualquer trabalho, verificar via project_knowledge_search:
1. Versão atual do BASELINE-PRODUTO.md e commit HEAD
2. Último PR mergeado bate com versão do baseline?
3. PRs abertos sem baseline atualizado?
4. HANDOFF-MANUS.md reflete estado real?
5. Para sprint planejada: buscar no repo se já existe implementação
6. Gaps propostos não cobertos por arquitetura já planejada?

**Declarar antes do primeiro prompt:** "Estado verificado — baseline v[X], [N] testes"

## Estado atual do produto

- **Baseline:** v1.8 · HEAD main `8df1834` (pós-PR #137)
- **Sprints concluídas:** G (corpus RAG + governança) · H (inventário automático + cockpit ao vivo) · I (G9+G10 schemas Zod · G13+G14 UX · G15 diagnóstico · G16 ragAdmin · backlog I/J/K)
- **PRs mergeados recentes:** #131 · #132 · #133 · #134 · #135 · #136 · #137
- **Corpus RAG:** 2.078 chunks · 5 leis · 100% confiabilidade · gold set 8/8
- **Cockpit RAG:** ao vivo em `/admin/rag-cockpit` via `ragInventory.getSnapshot`
- **GS-07 threshold:** < 10 bytes · id 113 ("e") visível na aba Anomalias
- **Testes:** 489+ passando
- **Bloqueios ativos:** DIAGNOSTIC_READ_MODE=shadow · F-04 Fase 3 · DROP COLUMN

## Pendências Sprint J/K

- n8n Fase 1 — monitoramento agendado (Sprint J) — issue #139 pulada por instrução do P.O.
- RFC-004 — expansão corpus cg_ibs — **bloqueada** (texto oficial não publicado)
- G15 Fase B — diagnóstico avançado (Sprint J)
- BASELINE-PRODUTO v1.9 — documentar Sprint I completa

## Automação RAG — decisão tomada

Abordagem: Híbrido n8n + Claude API + Human-in-the-Loop.
Documentação: `docs/automation/HIBRIDO-HUMAN-IN-LOOP-RAG-SOLARIS.md`
Fase 1 (monitoramento): Sprint J
Fase 2 (RFC automática + aprovação): Sprint K

## Bloqueios permanentes

- ❌ DIAGNOSTIC_READ_MODE=new
- ❌ F-04 Fase 3 (Issue #56)
- ❌ DROP COLUMN (Issue #62)
- ❌ Mover engines para server/engines/ — Sprint futura
- ❌ Issue #139 (N8N-F1) — pulada por instrução do P.O.

## Antes de gerar qualquer prompt de implementação

1. Buscar no project knowledge se o que será implementado já existe
2. Verificar se campos/schemas já existem em ai-schemas.ts
3. Incluir no prompt: leitura obrigatória + perguntas de confirmação
4. Nunca gerar prompt de implementação sem Gate 0 completo

## Referências rápidas

- GATE-CHECKLIST: docs/GATE-CHECKLIST.md
- BASELINE: docs/BASELINE-PRODUTO.md
- HANDOFF: docs/HANDOFF-MANUS.md
- ADR-010: docs/adr/ADR-010-content-architecture-98.md
- MATRIZ I/O: docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md
- MANUS-GOVERNANCE: .github/MANUS-GOVERNANCE.md
- DOC-IA-GENERATIVA-v5: https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.md ✅ verificado 2026-03-27
- REQUISITOS-FUNCIONAIS-v6: https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md ✅ verificado 2026-03-27
- RASTREABILIDADE-RF-PR-SPRINT: https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/RASTREABILIDADE-RF-PR-SPRINT.md ✅ adicionado 2026-03-27 · RF × Funcionalidade × Arquivo × Sprint × PR × Status (153 RFs, PRs #1–#137)
