# Checklist de Aceite P.O. — Excluir campo "Cliente Vinculado" do formulário Novo Projeto

**Data:** 2026-05-29 · **Solicitante:** Uires Tapajós (P.O.)
**Vinculadas:** `AS-IS-TO-BE-EXCLUIR-CLIENTE-PROJETO-20260529.md` · `DB-SPEC-EXCLUIR-CLIENTE-PROJETO.md` · `PLANO-TESTES-EXCLUIR-CLIENTE-PROJETO.md`

---

## Bloco 1 — Pré-requisitos Manus (§F0)

| # | Item | Estado | Responsável |
|---|---|---|---|
| 1.1 | Query Q1 executada: distribuição `clientId vs createdById` em produção | ⏳ pendente | Manus |
| 1.2 | Query Q2 executada: 0 nulls em `projects.clientId` | ⏳ pendente | Manus |
| 1.3 | Query Q3 executada: roles dos clientes referenciados | ⏳ pendente | Manus |
| 1.4 | Snapshot `mysqldump projects` salvo em S3 pré-implementação | ⏳ pendente | Manus |
| 1.5 | Tag git `pre-excluir-cliente-projeto-baseline` em `5b3191b` | ⏳ pendente | Manus |

**Bloqueante para F1:** se Q1 mostrar **>10% de projetos com `clientId ≠ createdById`**, reabrir spec antes de implementar (Cenário A2 quebra o fluxo "advogado cria projeto para cliente").

---

## Bloco 2 — Spec (já produzida)

| Item | Estado |
|---|---|
| AS-IS/TO-BE v1 (cobertura ≥90%) | ✅ pronto |
| DB-SPEC com 3 queries de verificação | ✅ pronto |
| Plano de testes (16 contratos) | ✅ pronto |
| Checklist de aceite (este) | ✅ pronto |

---

## Bloco 3 — Decisões do P.O.

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| 3.1 | Cenário implementado | A1 (frontend envia ctx.user.id explícito) · **A2** (backend auto-deriva) · B (typescript clientId nullable cascateia) · C (DROP COLUMN) | **A2** |
| 3.2 | Tratamento se Q1 quebrar A2 | Reabrir spec · Híbrido por role · Cenário C | **Reabrir spec** (decisão técnica) |
| 3.3 | Lição #112 (`useEffect ""`) é parte deste PR ou separado? | Junto · Separado | **Separado** — não é causa-raiz desta mudança |
| 3.4 | PR único ou F0+F1+F2+F3 separados? | Único · Múltiplos | **Único** (Classe A — cirúrgico) |
| 3.5 | Feature flag necessária? | Sim · Não | **Não** — Cenário A2 é semanticamente equivalente para 95%+ dos casos |

---

## Bloco 4 — UX_DICTIONARY (a atualizar em F4)

- [ ] `docs/governance/UX_DICTIONARY.md` §M1.1 (NovoProjeto.tsx): entrada atualizada removendo campo Cliente
- [ ] Mockup HTML opcional (1 estado — formulário sem bloco cliente)
- [ ] `docs/governance/FLOW_DICTIONARY.md`: passo "selecionar cliente" removido do step 1 NovoProjeto

---

## Bloco 5 — Rollback

| Item | Estratégia |
|---|---|
| Rollback código | `git revert <commit>` — sem migration, é instantâneo |
| Rollback dados | N/A — coluna `clientId` permanece preenchida (auto-derivada ou explícita) |
| Critério rollback | (a) Q1 da Manus mostra fluxo legítimo quebrado · (b) ≥1 RBAC guard falha em smoke E2E pós-deploy |
| Runbook `rollback-excluir-cliente.md` | ⏳ pendente — F0 (Claude Code) |

---

## Bloco 6 — Assinatura P.O.

```
Declaração:

Eu, Uires Tapajós, aprovo a implementação do TO-BE descrito no
AS-IS-TO-BE-EXCLUIR-CLIENTE-PROJETO-20260529.md, Cenário A2 (UI removida
+ backend opcional + auto-derivação de clientId = ctx.user.id), com as
seguintes ressalvas:

[ ] Q1 da Manus confirma <10% de projetos com clientId ≠ createdById
[ ] Q2 da Manus confirma 0 nulls em projects.clientId
[ ] Snapshot SQL e tag git criados
[ ] Cenário A2 escolhido (em vez de A1/B/C)
[ ] PR único Classe A
[ ] Lição #112 tratada em PR separado

Assinatura: ____________________________  Data: __/__/____
```

---

## Estado consolidado

| Bloco | Status |
|---|---|
| 1 — Pré-requisitos Manus (§F0) | ⏳ aguarda Q1+Q2+Q3 + snapshot |
| 2 — Spec | ✅ pronto (4 documentos) |
| 3 — Decisões P.O. | ❓ aguarda 5 decisões |
| 4 — UX_DICTIONARY | ⏳ F4 (pós-implementação) |
| 5 — Rollback | ⏳ runbook a criar em F0 |
| 6 — Assinatura | ⏳ aguarda Blocos 1, 3 e leitura da spec pelo P.O. |

**Próxima ação esperada:** Manus executa Q1+Q2+Q3 → P.O. lê resultado → decide Bloco 3 → assina Bloco 6 → Claude Code implementa F0-F4.
