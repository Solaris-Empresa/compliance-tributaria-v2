# GATE-CHECKLIST — Controles Internos do Orquestrador
## IA SOLARIS — Compliance Tributária
**Versão:** 1.1 — 2026-03-29
**Audiência:** Orquestrador (Claude) · P.O. (Uires Tapajós) · Implementador (Manus)

> **Por que este documento existe:** Em 2026-03-26 identificamos que sprints foram
> executadas sem verificação do estado real do repositório — engines já implementadas
> foram planejadas como se não existissem, baseline desatualizado por 4 sprints,
> G12/G13 planejados sem verificar cobertura pelo B2. Este checklist é o enforcement
> formal para que isso não se repita.

---

## GATE 0 — Abertura de sessão (obrigatório antes de qualquer trabalho)

```
□ 0. Ler docs/governance/ESTADO-ATUAL.md — OBRIGATÓRIO PRIMEIRO (DEC-007)
□ 1. Ler BASELINE-PRODUTO.md — versão atual e commit HEAD
□ 2. Verificar: último PR mergeado bate com versão do baseline?
□ 3. Verificar: há PRs abertos sem baseline atualizado?
□ 4. Verificar: HANDOFF-MANUS.md reflete o estado real?
□ 5. Para cada sprint planejada: buscar se já existe implementação no repo
□ 6. Confirmar: gaps propostos não cobertos por arquitetura já planejada?
```

## GATE 1 — Antes de gerar prompt de implementação

```
□ 1. Busca no repositório pelo que será implementado — já existe?
□ 2. As engines/funções referenciadas existem nos arquivos corretos?
□ 3. Os campos/schemas referenciados já existem?
□ 4. A issue do Milestone correspondente está aberta?
□ 5. O prompt inclui leitura obrigatória dos arquivos relevantes?
□ 6. O prompt inclui perguntas de confirmação antes da implementação?
```

## GATE 2 — Antes de aprovar merge de PR

```
□ 1. Contagem de testes: número no PR body bate com o esperado?
□ 2. Arquivos alterados batem com o escopo declarado?
□ 3. Sem arquivos fora do escopo?
□ 4. Double-run executado (quando aplicável)?
□ 5. BASELINE-PRODUTO.md atualizado ou PR de atualização agendado?
□ 6. Issues fechadas corretas?
```

## GATE 3 — Double-check após merge

```
□ 1. Commit HEAD bate com o do PR mergeado
□ 2. Contagem de testes pós-merge confirmada
□ 3. Se baseline não atualizado: prompt de atualização gerado imediatamente
□ 4. HANDOFF-MANUS.md atualizado se necessário
```

## REGRA DE OURO

> **Nenhum prompt de implementação sem Gate 0 + Gate 1.**
> **Nenhum merge sem Gate 2.**
> **Baseline nunca desatualizado por mais de 1 sprint.**

## HISTÓRICO DE FALHAS

| Data | Falha | Gate violado | Impacto |
|---|---|---|---|
| 2026-03-26 | Engines B2–B7 já existiam; planejamento ignorou | Gate 0 item 5 | Sprint B2 reescrita para bridge |
| 2026-03-26 | G12/G13 planejados sem saber cobertura B2 | Gate 0 item 6 | Sprint F suspensa corretamente |
| 2026-03-26 | Baseline desatualizado por 4 sprints | Gate 3 item 3 | Dívida de documentação |
| 2026-03-26 | Contagem 44 vs 99 testes aprovada sem verificação | Gate 2 item 1 | Ciclo extra de correção |
| 2026-03-28 | T06.1 falhou por assertição desatualizada (pré-existente desde K-4-B) | Gate 2 item 1 | Corrigido no K-4-D (PR #184) |
| 2026-03-29 | Orquestrador com contexto desatualizado por 4 sprints (v1.8 vs v2.4 real) | Gate 0 item 1 | Resolvido via DEC-007 (ESTADO-ATUAL.md) |

---
*Criado pelo Orquestrador em 2026-03-26 — documento vivo · Atualizado 2026-03-29 (Sprint K + DEC-007)*
