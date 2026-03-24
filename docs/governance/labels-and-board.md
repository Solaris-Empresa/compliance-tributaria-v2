# Labels e Board — Governança de Issues Estruturais

> **Versão:** 1.0 | **Data:** 2026-03-24 | **Escopo:** Issues com impacto estrutural no produto

---

## Labels Obrigatórias

As 5 labels abaixo são obrigatórias para qualquer issue classificada como estrutural. Devem ser aplicadas no momento da abertura da issue e mantidas até o fechamento.

| Label | Cor | Descrição | Quando aplicar |
|---|---|---|---|
| `structural-fix` | `#d93f0b` (vermelho) | Issue afeta contrato, invariant ou arquitetura do produto | Sempre que a causa raiz for estrutural |
| `needs-evidence` | `#e4e669` (amarelo) | Evidence Pack ainda não foi criado/aprovado | Ao abrir a issue; remover após Evidence Pack aprovado |
| `needs-regression` | `#f9d0c4` (laranja claro) | Testes de regressão ainda não foram executados | Ao abrir a issue; remover após regressão passando |
| `orchestrator-gate` | `#0075ca` (azul) | Requer aprovação explícita do orquestrador antes do merge | Severidade CRÍTICO ou ALTO |
| `checkpoint-required` | `#cfd3d7` (cinza) | Checkpoint obrigatório antes do merge | Sempre em issues estruturais |

---

## Criação das Labels via GitHub CLI

Execute os comandos abaixo no repositório para criar as labels:

```bash
# structural-fix — vermelho escuro
gh label create "structural-fix" \
  --color "d93f0b" \
  --description "Issue afeta contrato, invariant ou arquitetura do produto"

# needs-evidence — amarelo
gh label create "needs-evidence" \
  --color "e4e669" \
  --description "Evidence Pack ainda não foi criado ou aprovado"

# needs-regression — laranja claro
gh label create "needs-regression" \
  --color "f9d0c4" \
  --description "Testes de regressão ainda não foram executados"

# orchestrator-gate — azul
gh label create "orchestrator-gate" \
  --color "0075ca" \
  --description "Requer aprovação explícita do orquestrador antes do merge"

# checkpoint-required — cinza
gh label create "checkpoint-required" \
  --color "cfd3d7" \
  --description "Checkpoint obrigatório antes do merge"
```

---

## Configuração do Board

### Colunas Recomendadas

O board de issues estruturais deve ter as seguintes colunas, em ordem:

| Coluna | Critério de Entrada | Critério de Saída |
|---|---|---|
| **🔴 Triagem Estrutural** | Issue aberta com `structural-fix` | Causa raiz identificada e template preenchido |
| **🔍 Diagnóstico** | Template preenchido, causa raiz em análise | Causa raiz confirmada, arquivos candidatos listados |
| **📋 Contrato Definido** | ADR/contrato afetado identificado | Invariants documentados, testes planejados |
| **🔧 Em Implementação** | PR aberto com template estrutural | PR com todos os checks do CI passando |
| **🧪 Em Regressão** | Implementação concluída | PCT + suite completa passando |
| **📦 Evidence Pack** | Testes passando | Evidence Pack criado e aprovado |
| **🔐 Gate Orquestrador** | Evidence Pack aprovado (se CRÍTICO/ALTO) | Aprovação explícita do orquestrador obtida |
| **✅ Fechado** | Gate obtido, checkpoint salvo | Issue fechada com `Closes #N` no PR |

### Automações de Board

Configure as seguintes automações no GitHub Projects:

```yaml
# Mover para "Triagem Estrutural" ao abrir issue com label structural-fix
trigger: issue.labeled
condition: label == "structural-fix"
action: move_to_column("🔴 Triagem Estrutural")

# Mover para "Em Implementação" ao abrir PR que referencia a issue
trigger: pull_request.opened
condition: pr.body contains "Closes #" AND issue.labels contains "structural-fix"
action: move_to_column("🔧 Em Implementação")

# Mover para "Gate Orquestrador" quando CI passa e label orchestrator-gate presente
trigger: check_suite.completed
condition: conclusion == "success" AND issue.labels contains "orchestrator-gate"
action: move_to_column("🔐 Gate Orquestrador")

# Mover para "Fechado" ao fechar a issue
trigger: issue.closed
action: move_to_column("✅ Fechado")
```

---

## Fluxo de Vida de uma Issue Estrutural

```
Abertura (template preenchido)
    ↓
[structural-fix] + [needs-evidence] + [needs-regression] + [checkpoint-required]
    ↓ (+ [orchestrator-gate] se CRÍTICO/ALTO)
Diagnóstico → Contrato Definido → Implementação
    ↓
PR aberto (structural-pr template)
    ↓
CI Gate: pr-metadata-check + required-files-check + pct-suite
    ↓ (todos passando)
[needs-evidence] removido → [needs-regression] removido
    ↓
Gate Orquestrador (se aplicável)
    ↓
Checkpoint salvo → [checkpoint-required] removido
    ↓
Merge → Issue fechada
```

---

## Política de Remoção de Labels

| Label | Quando remover |
|---|---|
| `needs-evidence` | Após Evidence Pack criado em `docs/evidence-packs/` e aprovado |
| `needs-regression` | Após `pnpm test` completo passando e resultado documentado no Evidence Pack |
| `orchestrator-gate` | Após aprovação explícita documentada no Evidence Pack |
| `checkpoint-required` | Após checkpoint salvo e `manus-webdev://[version_id]` documentado |
| `structural-fix` | **NUNCA remover** — label permanente para rastreabilidade histórica |
