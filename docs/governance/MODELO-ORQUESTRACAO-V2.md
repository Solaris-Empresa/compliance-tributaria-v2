# MODELO DE ORQUESTRACAO v2 — IA SOLARIS

**Criado:** Sprint Z-13.5 | **Motivo:** Post-mortem Z-07 + Z-13.5
**Destino:** Copiar para `/mnt/skills/user/solaris-contexto/SKILL.md` pelo Orquestrador

> Este arquivo e a referencia canonica do modelo de orquestracao.
> O Orquestrador deve copiar a secao "Checklist por sprint" para o SKILL.md.

---

## Checklist por sprint

### F0 — Discovery (nunca pular)
- [ ] Gate 0: `SHOW FULL COLUMNS` tabelas afetadas (Manus)
- [ ] Gate UX: `ux-spec-validator` nos componentes afetados (Claude Code)
- [ ] `UX_DICTIONARY.md` consultado
- [ ] `DATA_DICTIONARY.md` consultado
- [ ] Estado real dos componentes reportado

### F1 — Issues (7 blocos obrigatorios)
- [ ] Contexto + dependencias
- [ ] UX Spec (copiada inline + link fonte)
- [ ] Skeleton (estrutura sem logica)
- [ ] Schema real do banco (saida do Gate 0)
- [ ] Contrato API (existe? chamado pelo componente?)
- [ ] Estado atual do componente (tabela implementado/ausente)
- [ ] Criterios de aceite + plano de testes

**Issue sem os 7 blocos = INVALIDA**

### F2 — Auditoria (assimetrica)
- [ ] Frontend puro: Claude Code audita (Manus opcional)
- [ ] Banco/migration: Manus audita (Claude Code opcional)
- [ ] Issue P0 critica: ambos obrigatorio

### F3 — Aprovacao P.O.
- [ ] Todas as issues do batch aprovadas
- [ ] Spec congelada (lock)

### F4 — Implementacao
- [ ] `gh issue view [N]` no inicio de cada prompt (REGRA-ORQ-08)
- [ ] 1 issue = 1 PR
- [ ] PR contem `Closes #N`
- [ ] Claude Code: frontend, TS, logica, testes
- [ ] Manus: banco, migrations, deploy

### F4.5 — Integration Checkpoint (obrigatorio)
- [ ] `grep -n "trpc\." [componente]` executado
- [ ] Cruzar com Contrato API da issue
- [ ] 100% procedures da issue estao sendo chamadas
- [ ] Procedure ausente = BLOQUEAR merge, reportar ao Orquestrador

### F5 — Gate final
- [ ] tsc 0 erros global
- [ ] Testes unitarios passando
- [ ] Testes integration passando
- [ ] UAT P.O. com checklist da issue
- [ ] Gate 7 (padrao existente)

---

## Mini-gate por PR (antes de abrir)

- [ ] tsc 0 erros
- [ ] Testes da issue passando
- [ ] Responsavel confirma spec implementada
- [ ] Se toca banco: Manus confirma schema
- [ ] F4.5 executado e aprovado

---

## Regras mandatorias

| Regra | Descricao |
|---|---|
| REGRA-ORQ-01 | Nenhuma implementacao sem issue completa |
| REGRA-ORQ-02 | Spec hibrida (inline + link + lock) |
| REGRA-ORQ-03 | Auditoria assimetrica antes de codar |
| REGRA-ORQ-04 | Claude Code implementa frontend/logica |
| REGRA-ORQ-05 | Manus valida banco/ambiente |
| REGRA-ORQ-06 | UAT so apos batch completo |
| REGRA-ORQ-07 | R-SYNC-01 (S3 != GitHub = bloqueio) |
| REGRA-ORQ-08 | `gh issue view [N]` obrigatorio no prompt |
| REGRA-ORQ-09 | Gate UX obrigatorio antes de frontend |
| REGRA-ORQ-10 | F4.5 Integration Checkpoint obrigatorio |

---

## Matriz de responsabilidade

| Area | Manus | Claude Code |
|---|---|---|
| Banco / SQL | PRINCIPAL | suporte |
| Migrations / deploy | PRINCIPAL | — |
| Frontend React / TS | — | PRINCIPAL |
| Engine / logica | — | PRINCIPAL |
| Testes unitarios | — | PRINCIPAL |
| grep / auditoria codigo | — | PRINCIPAL |
| Auditoria banco | PRINCIPAL | suporte |
| Debug ambiente | PRINCIPAL | — |

---

## Regra de mudanca de spec

| Tipo | Definicao | Acao |
|---|---|---|
| **PATCH** | Ajuste <= 5 linhas, nao muda estrutura | Comentario na issue existente |
| **AMENDMENT** | Mudanca estrutural, novo comportamento | Nova issue obrigatoria |
