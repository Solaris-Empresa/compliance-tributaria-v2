---
name: solaris-contexto
description: "Contexto permanente do projeto IA SOLARIS para o Orquestrador Claude. Use ao iniciar qualquer sessão do projeto IA SOLARIS, ao planejar sprints, ao revisar PRs, ao gerar prompts para o Manus, ou ao analisar o estado do produto. Contém Gate 0 obrigatório, estado atual do produto e regras de governança."
---

# Solaris — Skill de Contexto do Orquestrador

> **Versão do skill:** 2.5 rev K-4-E — 2026-03-29
> **Sincronizado com:** BASELINE-PRODUTO.md v2.5 rev K-4-E | HEAD `88db778` | 213 PRs

## Identidade

Você é o Orquestrador do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
P.O.: Uires Tapajós | Implementador: Manus AI | Consultor: ChatGPT

---

## GATE 0 — Executar SEMPRE ao iniciar sessão

Antes de qualquer trabalho, verificar via `project_knowledge_search` ou lendo diretamente:

1. `docs/governance/ESTADO-ATUAL.md` — versão, HEAD, testes, sprints concluídas (**P0 — leitura obrigatória**)
2. `docs/BASELINE-PRODUTO.md` — versão atual e commit HEAD (**P1**)
3. `docs/HANDOFF-MANUS.md` — estado operacional atual (**P1**)
4. Último PR mergeado bate com versão do baseline?
5. PRs abertos sem baseline atualizado?
6. Para sprint planejada: buscar no repo se já existe implementação
7. Gaps propostos não cobertos por arquitetura já planejada?

**Declarar antes do primeiro prompt:** `"Estado verificado — baseline v[X], [N] testes, HEAD [SHA]"`

> **Nota:** O estado hardcoded abaixo é o snapshot no momento da última sincronização deste skill.
> O `ESTADO-ATUAL.md` é sempre a fonte de verdade — em caso de divergência, prevalece o `ESTADO-ATUAL.md`.

---

## Estado atual do produto (snapshot — verificar ESTADO-ATUAL.md para dados em tempo real)

| Indicador | Valor |
|---|---|
| Baseline | **v2.5** |
| HEAD | `88db778` |
| Commits | 584 |
| PRs mergeados | 213 |
| Testes passando | **2.655 / 2.776** (97 falhas pré-existentes, sem regressão) |
| Migrations | **60** (0000–0059) |
| DIAGNOSTIC_READ_MODE | `shadow` (**NUNCA alterar sem aprovação P.O.**) |
| Sprint atual | **Sprint L** (próxima — Issue #191 G16 Upload CSV) |
| Última sprint concluída | **K-4-E** — `project_status_log` auditoria jurídica (PR #213) |

### Engines implementadas

| Engine | Arquivo | Testes |
|---|---|---|
| Gap Engine | `server/routers/` | ✅ |
| Risk Engine | `server/routers/` | ✅ |
| Action Engine | `server/routers/` | ✅ |
| Fluxo 3 Ondas | `routers-fluxo-v3.ts` | ✅ |
| G10/G11 | `routers-fluxo-v3.ts` | ✅ |
| G12 (fonte_acao) | PR #113 | ✅ |
| G13–G15 | absorvidos pelo B2 | ✅ |

### Corpus RAG

- Chunks: **2.078** — 100% com `anchor_id`
- Modo: `shadow` (leitura paralela, sem impacto em produção)
- G16 (Upload CSV SOLARIS): Issue #191 — **Sprint L**

---

## Sprints concluídas

| Sprint | Entrega | PRs |
|---|---|---|
| B0 | Fundação e schema | ✅ |
| B1 | Engines G1–G9 | ✅ |
| B2 | G10–G13, fonte_acao | ✅ |
| Sprint K | Fluxo 3 Ondas (8 etapas) | ✅ |
| Sprint K+ | Cockpit P.O. v2.0 (C1–C5+I1–I4) | #197 ✅ |
| Sprint K++ | Docs P0/P1 + fetch dinâmico + Seção 4 | #199–#205 ✅ |
| **K-4-E** | **`project_status_log` — auditoria jurídica de transições** | **#213 ✅** |

---

## Gaps resolvidos

G1–G15 todos resolvidos. G16 (Upload CSV SOLARIS) em Sprint L.

---

## Bloqueios permanentes

- ❌ `DIAGNOSTIC_READ_MODE=new` — aguarda GO/NO-GO UAT (Issue #61)
- ❌ F-04 Fase 3 (Issue #56) — aguarda UAT com advogados
- ❌ DROP COLUMN colunas legadas (Issue #62) — aguarda #56 e #61
- ❌ Mover engines para `server/engines/` — Sprint futura

---

## Antes de gerar qualquer prompt de implementação

1. Executar Gate 0 completo (ler ESTADO-ATUAL.md)
2. Buscar no project knowledge se o que será implementado já existe
3. Verificar se campos/schemas já existem em `ai-schemas.ts`
4. Incluir no prompt: leitura obrigatória + perguntas de confirmação
5. Nunca gerar prompt de implementação sem Gate 0 completo

---

## Referências rápidas

- **ESTADO-ATUAL (P0):** `docs/governance/ESTADO-ATUAL.md`
- **BASELINE (P1):** `docs/BASELINE-PRODUTO.md`
- **HANDOFF (P1):** `docs/HANDOFF-MANUS.md`
- **GATE-CHECKLIST:** `docs/GATE-CHECKLIST.md`
- **ADR-010:** `docs/adr/ADR-010-content-architecture-98.md`
- **MATRIZ I/O:** `docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md`
- **MANUS-GOVERNANCE:** `.github/MANUS-GOVERNANCE.md`
- **Cockpit P.O.:** https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/

---

## REGRA ANTI-DRIFT — Atualização obrigatória deste skill

> **Este skill DEVE ser atualizado a cada sprint concluída.**
> Responsável: Manus (ao fechar sprint) + Claude (ao confirmar Gate 0).

### Quando atualizar

| Evento | Quem atualiza | O que atualizar |
|---|---|---|
| Sprint concluída | **Manus** (no mesmo PR de fechamento) | Seção "Estado atual", Sprints, HEAD, PRs, Testes |
| Novo bloqueio/desbloqueio | **Claude** (via prompt ao Manus) | Seção "Bloqueios permanentes" |
| Novo gap resolvido | **Manus** | Seção "Gaps resolvidos" |
| Mudança de DIAGNOSTIC_READ_MODE | **P.O.** (aprovação explícita) | Linha `DIAGNOSTIC_READ_MODE` |

### Como atualizar (Manus)

Ao fechar uma sprint, incluir no mesmo PR de `ESTADO-ATUAL.md` e `BASELINE-PRODUTO.md`:

```
skills/solaris-contexto/SKILL.md   ← atualizar seção "Estado atual"
skills/solaris-orquestracao/SKILL.md ← atualizar linha "Versão do skill"
```

O campo `> **Versão do skill:**` no topo de cada arquivo deve refletir a versão do baseline.

---
