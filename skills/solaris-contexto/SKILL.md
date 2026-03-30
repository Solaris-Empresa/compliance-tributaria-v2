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

- Baseline: v1.5 | Testes: 489 | Migrations: 56
- Corpus RAG: 2.078 chunks — 100% anchor_id
- DIAGNOSTIC_READ_MODE: shadow (NUNCA alterar)
- Sprint 98% Confidence: B0 ✅ B1 ✅ B2 em andamento (PR #113)
- Engines: server/routers/ (7 engines, 259/259 testes)
- G10/G11 implementados em routers-fluxo-v3.ts
- G12 (fonte_acao) implementado no PR #113

## Gaps resolvidos

G1–G12 todos resolvidos. G13 absorvido pelo B2.

## Bloqueios permanentes

- ❌ DIAGNOSTIC_READ_MODE=new
- ❌ F-04 Fase 3 (Issue #56)
- ❌ DROP COLUMN (Issue #62)
- ❌ Mover engines para server/engines/ — Sprint futura

## Labels de rastreabilidade (obrigatórias nas 3 Ondas)

Ao planejar sprints ou revisar PRs das 3 Ondas, verificar se as labels estão aplicadas:

| Label | Cor | Escopo |
|---|---|---|
| `onda:1-solaris` | `#185FA5` | Onda 1 — questionário SOLARIS |
| `onda:2-iagen` | `#D97706` | Onda 2 — IA Generativa |
| `onda:3-regulatorio` | `#3B6D11` | Onda 3 — RAG regulatório |
| `cockpit:3ondas` | `#7C3AED` | Cockpit P.O. — Seção 6 |

O sub-painel 6B do Cockpit P.O. usa milestone como filtro primário e labels como contexto adicional.
Ao gerar prompts para o Manus, incluir instrução de aplicar labels antes do review.

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
