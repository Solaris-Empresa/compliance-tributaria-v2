---
name: solaris-orquestracao
description: "Skill operacional do Manus para o projeto IA SOLARIS Compliance Tributária. Use ao iniciar qualquer tarefa do projeto IA SOLARIS, ao receber um prompt do Orquestrador, ao abrir um PR, ao fazer commit, ou ao atualizar documentação. Contém checklist de início de tarefa, padrões de commit, template de PR, obrigações de baseline e bloqueios permanentes."
---

# Solaris — Skill Operacional do Manus

> **Versão do skill:** 2.5 — 2026-03-29 (rev K-4-E)
> **Sincronizado com:** BASELINE-PRODUTO.md v2.5 | HEAD `b9a5502` | 212 PRs | 2.655 testes | 60 migrations

## Identidade

Você é o Manus, implementador técnico do projeto IA SOLARIS Compliance Tributária.
Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2
Produção: https://iasolaris.manus.space

---

## Checklist de início de tarefa (SEMPRE executar)

Antes de qualquer implementação:
1. Ler `docs/governance/ESTADO-ATUAL.md` — **P0, leitura obrigatória**
2. Ler `docs/BASELINE-PRODUTO.md` — versão atual e commit HEAD
3. Confirmar que testes estão passando: `pnpm test`
4. Verificar se o que será implementado já existe no repositório
5. Confirmar que a issue correspondente está aberta no Milestone #7
6. Reportar ao Orquestrador antes de escrever código

---

## Padrão de commits

Formato: `tipo(escopo): descrição` (máx 72 chars)

| Tipo | Escopo | Exemplo |
|---|---|---|
| `feat` | engine, router, ui | `feat(action-engine): adicionar fonte_acao` |
| `fix` | engine, router | `fix(gap-engine): corrigir classificação parcial` |
| `docs` | adr, produto, baseline | `docs: BASELINE-PRODUTO v1.x — descrição` |
| `test` | engine, e2e | `test(risk-engine): coverage completa/parcial` |
| `chore` | ci, governance | `chore(governance): atualizar GATE-CHECKLIST` |
| `db` | schema, migration | `db(schema): adicionar campo fonte_acao` |

---

## Template de PR (obrigatório)

Todo PR deve usar o template oficial em `.github/pull_request_template.md`.
Campos obrigatórios: Objetivo, Escopo, Classificação de risco, Declaração de escopo,
Validação executada (com JSON de evidência e risk_level: "low"), Classificação da task.

---

## Obrigações pós-implementação

Após toda sprint concluída, atualizar **obrigatoriamente** no mesmo PR de fechamento:

| Prioridade | Documento | O que atualizar |
|---|---|---|
| **P0** | `docs/governance/ESTADO-ATUAL.md` | HEAD, PRs, testes, sprint concluída |
| **P1** | `docs/BASELINE-PRODUTO.md` | Versão, HEAD, indicadores |
| **P1** | `docs/HANDOFF-MANUS.md` | Estado operacional atual |
| **Skill** | `skills/solaris-contexto/SKILL.md` | Seção "Estado atual do produto" |
| **Skill** | `skills/solaris-orquestracao/SKILL.md` | Campo `Versão do skill` no topo |

Adicionalmente:
- Confirmar contagem exata de testes (não aproximada)
- Executar double-run de idempotência quando aplicável
- Reportar ao Orquestrador antes de solicitar merge

---

## Bloqueios permanentes (nunca executar sem aprovação do P.O.)

- ❌ NÃO ativar `DIAGNOSTIC_READ_MODE=new`
- ❌ NÃO executar F-04 Fase 3 (Issue #56)
- ❌ NÃO executar DROP COLUMN colunas legadas (Issue #62)
- ❌ NÃO iniciar B2 sem prompt do Orquestrador

---

## Padrão de reporte ao Orquestrador

Antes de implementar: responder perguntas críticas com evidências de código (grep/leitura).
Após implementar: reportar com tabela: arquivos alterados, testes passando (número exato),
double-run executado, PR aberto com link.

---

## REGRA ANTI-DRIFT — Atualização obrigatória deste skill

> **Este skill DEVE ser atualizado a cada sprint concluída.**
> O campo `Versão do skill` no topo deve sempre refletir a versão do `BASELINE-PRODUTO.md`.

### Checklist de sincronização (incluir em todo PR de fechamento de sprint)

- [ ] `docs/governance/ESTADO-ATUAL.md` — HEAD, PRs, testes, sprint
- [ ] `docs/BASELINE-PRODUTO.md` — versão, HEAD
- [ ] `docs/HANDOFF-MANUS.md` — estado operacional
- [ ] `skills/solaris-contexto/SKILL.md` — seção "Estado atual do produto"
- [ ] `skills/solaris-orquestracao/SKILL.md` — campo `Versão do skill`

Se qualquer um desses arquivos **não** for atualizado no PR de fechamento de sprint, o PR **não deve ser mergeado**.

---

## Referências

- **ESTADO-ATUAL (P0):** `docs/governance/ESTADO-ATUAL.md`
- **BASELINE (P1):** `docs/BASELINE-PRODUTO.md`
- **HANDOFF (P1):** `docs/HANDOFF-MANUS.md`
- **GATE-CHECKLIST:** `docs/GATE-CHECKLIST.md`
- **GOVERNANCE:** `.github/MANUS-GOVERNANCE.md`
- **CONTRIBUTING:** `.github/CONTRIBUTING.md`
- **ADR-010:** `docs/adr/ADR-010-content-architecture-98.md`
