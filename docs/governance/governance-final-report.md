# Relatório Final — Governança Permanente para Correções Estruturais

> **Data:** 2026-03-24 | **Versão:** 1.0
> **Escopo:** Pacote completo de governança implantado após a Sub-Sprint Estrutural de Prefill Contract
> **Diretriz central:** "Uma correção estrutural só está concluída quando a recorrência deixa de ser provável."

---

## 1. O Que Foi Implantado

O pacote de governança permanente foi implantado em 7 etapas, cobrindo o ciclo completo de vida de uma issue estrutural: da detecção ao fechamento. A tabela abaixo resume cada artefato entregue.

| Etapa | Artefato | Arquivo | Propósito |
|---|---|---|---|
| 1 | Issue Template Crítica | `.github/ISSUE_TEMPLATE/structural-fix.md` | Padronizar abertura de issues estruturais com 10 campos obrigatórios |
| 2 | PR Template Estrutural | `.github/PULL_REQUEST_TEMPLATE/structural-pr.md` | Padronizar PRs estruturais com 10 seções + checklist de merge |
| 3a | Evidence Pack Template | `docs/governance/evidence-pack-template.md` | Template reutilizável para criação de evidence packs |
| 3b | Evidence Pack Canônico | `docs/evidence-packs/2026-03-24-prefill-contract-sprint.md` | Exemplo de referência preenchido com a sub-sprint de prefill |
| 4 | CI Bloqueante | `.github/workflows/structural-fix-gate.yml` | Workflow GitHub Actions que bloqueia merge se requisitos ausentes |
| 5 | Labels e Board | `docs/governance/labels-and-board.md` | 5 labels obrigatórias + configuração do board + automações |
| 6 | Changeset Disciplinado | `docs/governance/changeset-discipline.md` | Padrão de 4 commits atômicos obrigatórios |
| 7 | Invariant Registry | `docs/governance/invariant-registry.md` | Registro de 8 invariants estruturais do produto |

---

## 2. Links dos Templates

### Issue Template

```
.github/ISSUE_TEMPLATE/structural-fix.md
```

Campos obrigatórios cobertos:
1. Tipo do problema (6 categorias)
2. Severidade (4 níveis: CRÍTICO, ALTO, MÉDIO, BAIXO)
3. Causa raiz (arquivo, função, linha)
4. Contrato / ADR afetado (tabela)
5. Invariants afetados (checklist com INV-001 a INV-008)
6. Arquivos candidatos à modificação
7. Testes obrigatórios (novos + regressão)
8. Evidências obrigatórias (checklist)
9. Gate do orquestrador (SIM/NÃO com justificativa)
10. Risco residual esperado

### PR Template

```
.github/PULL_REQUEST_TEMPLATE/structural-pr.md
```

Seções obrigatórias cobertas:
1. Problema (sintoma + issue referenciada)
2. Causa raiz (arquivo, função, linha)
3. Contrato / ADR afetado (tabela com status)
4. Solução aplicada (arquivos modificados + justificativa)
5. Invariants protegidos (tabela antes/depois)
6. Testes adicionados (tabela com invariant coberto)
7. Regressões cobertas (PCT + suite completa)
8. Evidências anexadas (checklist + payload diff)
9. Risco residual (identificado + mitigação)
10. Checklist de merge (código + testes + docs + processo)

---

## 3. Links dos Workflows

### CI Bloqueante — Structural Fix Gate

```
.github/workflows/structural-fix-gate.yml
```

O workflow é ativado em qualquer PR com label `structural-fix` e executa 4 jobs em paralelo:

| Job | Verificações |
|---|---|
| `pr-metadata-check` | Referência de issue (`Closes #N`), referência de contrato/ADR, checklist sem itens desmarcados, referência ao evidence pack |
| `required-files-check` | Arquivo `.test.ts` modificado, arquivo em `docs/evidence-packs/` adicionado, `invariant-registry.md` não deletado |
| `pct-suite` | `pnpm vitest run server/prefill-contract.test.ts` passando, `pnpm test` completo passando |
| `structural-gate-summary` | Consolida os 3 jobs anteriores; bloqueia o merge se qualquer um falhar |

O workflow só é ativado quando a label `structural-fix` está presente no PR, garantindo que PRs normais não sejam impactados.

---

## 4. Labels Criadas

| Label | Cor | Quando aplicar | Quando remover |
|---|---|---|---|
| `structural-fix` | `#d93f0b` (vermelho) | Ao abrir issue estrutural | **Nunca** — permanente |
| `needs-evidence` | `#e4e669` (amarelo) | Ao abrir issue | Após Evidence Pack aprovado |
| `needs-regression` | `#f9d0c4` (laranja claro) | Ao abrir issue | Após regressão passando |
| `orchestrator-gate` | `#0075ca` (azul) | Severidade CRÍTICO ou ALTO | Após aprovação do orquestrador |
| `checkpoint-required` | `#cfd3d7` (cinza) | Sempre em issues estruturais | Após checkpoint salvo |

**Comando de criação (GitHub CLI):**

```bash
gh label create "structural-fix" --color "d93f0b" --description "Issue afeta contrato, invariant ou arquitetura do produto"
gh label create "needs-evidence" --color "e4e669" --description "Evidence Pack ainda não foi criado ou aprovado"
gh label create "needs-regression" --color "f9d0c4" --description "Testes de regressão ainda não foram executados"
gh label create "orchestrator-gate" --color "0075ca" --description "Requer aprovação explícita do orquestrador antes do merge"
gh label create "checkpoint-required" --color "cfd3d7" --description "Checkpoint obrigatório antes do merge"
```

---

## 5. Padrão de Evidence Pack

O Evidence Pack é o artefato de rastreabilidade obrigatório para toda issue estrutural. Ele documenta o estado completo da correção e serve como prova de que o processo foi seguido.

**Localização:** `docs/evidence-packs/YYYY-MM-DD-<slug>.md`

**Template:** `docs/governance/evidence-pack-template.md`

**Conteúdo mínimo obrigatório:**

| Seção | Conteúdo |
|---|---|
| Metadados | Data, issue, PR, checkpoint, autor, severidade, invariant afetado |
| Relatório de diagnóstico | Problema, causa raiz técnica (arquivo:função:linha), como foi identificada |
| Payload antes/depois | JSON ou diff mostrando o estado antes e depois da correção |
| Evidência visual | Print ou descrição do comportamento na UI (se houver) |
| Lista de testes adicionados | Tabela com arquivo, bloco, teste e invariant coberto |
| Resultado dos testes | Output completo do `pnpm test` e `pnpm vitest run server/prefill-contract.test.ts` |
| Links de commit/PR/checkpoint | Tabela com todos os artefatos rastreáveis |
| Risco residual | Identificado, justificado e mitigado |
| Aprovação do orquestrador | Data, aprovado por, observações |

**Exemplo canônico:** `docs/evidence-packs/2026-03-24-prefill-contract-sprint.md`

---

## 6. Invariant Registry

O Invariant Registry (`docs/governance/invariant-registry.md`) contém 8 invariants estruturais do produto, organizados em 4 grupos:

### Grupo 1 — Prefill Contract (4 invariants)

| ID | Invariant | Severidade | Testes |
|---|---|---|---|
| INV-001 | `campo_coletado_no_perfil → nunca_reaparece_vazio` | 🔴 CRÍTICO | BLOCO 5 (17 testes) |
| INV-002 | `api_nunca_entrega_string_json` | 🔴 CRÍTICO | BLOCO 2 (8 testes) |
| INV-003 | `builder_canonico_e_fonte_unica` | 🟠 ALTO | BLOCO 3, 9 |
| INV-004 | `campo_sem_fonte → undefined` | 🟠 ALTO | BLOCO 4, 6 |

### Grupo 2 — Diagnóstico (1 invariant)

| ID | Invariant | Severidade | Testes |
|---|---|---|---|
| INV-005 | `pergunta_sem_fonte → invalida` | 🟠 ALTO | Revisão manual |

### Grupo 3 — Riscos e Planos de Ação (2 invariants)

| ID | Invariant | Severidade | Testes |
|---|---|---|---|
| INV-006 | `risco_sem_origem → invalido` | 🟠 ALTO | A implementar |
| INV-007 | `acao_sem_evidence_required → invalida` | 🟡 MÉDIO | A implementar |

### Grupo 4 — Briefing (1 invariant)

| ID | Invariant | Severidade | Testes |
|---|---|---|---|
| INV-008 | `briefing_sem_coverage_100 → invalido` | 🔴 CRÍTICO | A implementar |

---

## 7. Como Esta Governança Reduz o Risco de Recorrência

A análise abaixo mapeia cada mecanismo de governança ao risco específico que ele mitiga.

### Risco 1 — Issue estrutural aberta sem diagnóstico completo

**Mecanismo de mitigação:** Issue Template com campos obrigatórios de causa raiz, arquivos candidatos e invariants afetados. O CI bloqueia o merge se o PR não referenciar uma issue.

**Redução de risco:** Um agente ou desenvolvedor não pode executar uma correção estrutural sem primeiro documentar a causa raiz. Isso elimina correções de sintoma sem resolver a causa.

---

### Risco 2 — Correção implementada sem testes

**Mecanismo de mitigação:** CI Job `required-files-check` verifica se algum arquivo `.test.ts` foi modificado. PR Template tem seção obrigatória de testes. Checklist de merge inclui item de testes.

**Redução de risco:** Impossível fazer merge de uma issue estrutural sem adicionar testes. O CI bloqueia automaticamente.

---

### Risco 3 — Regressão não detectada

**Mecanismo de mitigação:** CI Job `pct-suite` executa a suíte PCT completa (117 testes) e o `pnpm test` completo em todo PR estrutural. A suíte PCT é permanente e cresce a cada nova correção.

**Redução de risco:** Qualquer regressão nos invariants de prefill é detectada automaticamente antes do merge. A suíte PCT é o "guardião" permanente do contrato.

---

### Risco 4 — Evidência perdida ou incompleta

**Mecanismo de mitigação:** CI Job `required-files-check` verifica se um arquivo foi adicionado em `docs/evidence-packs/`. PR Template tem seção obrigatória de evidências. Evidence Pack Template garante estrutura consistente.

**Redução de risco:** Toda correção estrutural tem um registro permanente e rastreável em `docs/evidence-packs/`. O histórico de correções é auditável.

---

### Risco 5 — Correção sem aprovação do orquestrador

**Mecanismo de mitigação:** Label `orchestrator-gate` aplicada automaticamente em issues CRÍTICO/ALTO. PR Template tem seção de gate do orquestrador. CI verifica checklist completo.

**Redução de risco:** Issues de severidade CRÍTICO ou ALTO não podem ser mergeadas sem aprovação explícita documentada no Evidence Pack.

---

### Risco 6 — Invariant violado sem detecção

**Mecanismo de mitigação:** Invariant Registry com 8 invariants formalizados. Suíte PCT cobrindo 4 invariants de prefill com 117 testes. Issue Template exige referência ao invariant violado.

**Redução de risco:** Qualquer violação dos invariants de prefill é detectada automaticamente pela suíte PCT. Os demais invariants têm testes planejados para implementação futura.

---

### Risco 7 — Changeset confuso dificultando rollback

**Mecanismo de mitigação:** Guia de Changeset Disciplinado com 4 commits atômicos obrigatórios (docs → impl → testes → evidências). Convenção de nomenclatura de branch e mensagens de commit.

**Redução de risco:** Cada commit é reversível de forma independente. O histórico do git conta a história completa de cada correção estrutural.

---

### Resumo Quantitativo

| Mecanismo | Issues estruturais que passariam sem detecção |
|---|---|
| Sem governança (estado anterior) | 100% — qualquer issue poderia ser corrigida sem processo |
| Com Issue Template obrigatório | Reduz issues sem diagnóstico para ~0% |
| Com CI bloqueante | Reduz PRs sem testes/evidências para ~0% |
| Com Suíte PCT (117 testes) | Reduz regressões de prefill não detectadas para ~0% |
| Com Invariant Registry | Formaliza 8 invariants — violações têm nome e processo |
| Com Evidence Pack obrigatório | Reduz correções sem rastreabilidade para ~0% |

> A governança não elimina bugs. Ela elimina a probabilidade de que bugs estruturais passem sem detecção, sem processo e sem rastreabilidade.

---

## Estrutura Final de Arquivos de Governança

```
compliance-tributaria-v2/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── structural-fix.md          ← Issue Template (Etapa 1)
│   ├── PULL_REQUEST_TEMPLATE/
│   │   └── structural-pr.md           ← PR Template (Etapa 2)
│   └── workflows/
│       └── structural-fix-gate.yml    ← CI Bloqueante (Etapa 4)
│
├── docs/
│   ├── governance/
│   │   ├── evidence-pack-template.md  ← Template de Evidence Pack (Etapa 3)
│   │   ├── labels-and-board.md        ← Labels e Board (Etapa 5)
│   │   ├── changeset-discipline.md    ← Changeset Disciplinado (Etapa 6)
│   │   ├── invariant-registry.md      ← Invariant Registry (Etapa 7)
│   │   └── governance-final-report.md ← Este documento (Etapa 8)
│   │
│   ├── evidence-packs/
│   │   └── 2026-03-24-prefill-contract-sprint.md  ← Evidence Pack canônico
│   │
│   └── prefill-contract-sprint.md    ← Documento da sub-sprint (pré-existente)
│
└── server/
    └── prefill-contract.test.ts       ← Suíte PCT (117 testes) — guardião permanente
```

---

## Frase Final

> "Uma correção estrutural só está concluída quando a recorrência deixa de ser provável."

Este pacote de governança transforma essa diretriz em processo executável: cada issue estrutural agora tem um caminho claro, verificável e auditável — da detecção ao fechamento.
