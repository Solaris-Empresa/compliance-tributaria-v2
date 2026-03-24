---
name: "🔴 Structural Fix — Correção Estrutural Crítica"
about: "Use este template EXCLUSIVAMENTE para issues que afetam contratos, invariants ou arquitetura do produto."
title: "[STRUCTURAL] <título descritivo do problema>"
labels: structural-fix, needs-evidence, needs-regression, orchestrator-gate, checkpoint-required
assignees: ""
---

<!--
⚠️  ATENÇÃO: Este template é obrigatório para qualquer issue classificada como estrutural.
    Campos marcados com ✅ OBRIGATÓRIO não podem ficar em branco.
    Issues sem preenchimento completo serão bloqueadas pelo CI e não poderão ser mergeadas.
-->

## 1. Tipo do Problema ✅ OBRIGATÓRIO

<!-- Marque apenas um -->
- [ ] Contrato de dados quebrado (ex.: campo coletado não chega ao destino)
- [ ] Invariant violado (ex.: campo preenchido reaparece vazio)
- [ ] Regressão de feature crítica
- [ ] Inconsistência de schema / API
- [ ] Bug de normalização / parsing
- [ ] Outro (descreva abaixo):

**Descrição do tipo:** _[preencher]_

---

## 2. Severidade ✅ OBRIGATÓRIO

<!-- Marque apenas um -->
- [ ] 🔴 **CRÍTICO** — Impacta fluxo principal do produto (diagnóstico, briefing, plano de ação)
- [ ] 🟠 **ALTO** — Impacta funcionalidade secundária com risco de dados incorretos
- [ ] 🟡 **MÉDIO** — Impacta UX ou rastreabilidade sem risco de dados
- [ ] 🟢 **BAIXO** — Melhoria de robustez ou observabilidade

**Justificativa da severidade:** _[preencher]_

---

## 3. Causa Raiz ✅ OBRIGATÓRIO

<!-- Descreva a causa raiz técnica, não o sintoma. Seja específico sobre o arquivo, função e linha. -->

**Causa raiz identificada:**

```
[arquivo]: [função/linha]
[descrição técnica da causa]
```

**Como foi identificada:** _[diagnóstico manual / teste / log / report do usuário]_

---

## 4. Contrato / ADR Afetado ✅ OBRIGATÓRIO

<!-- Liste os contratos formais ou ADRs que esta issue viola ou modifica -->

| Contrato / ADR | Arquivo | Invariant afetado |
|---|---|---|
| _ex.: Prefill Contract v3_ | `shared/questionario-prefill.ts` | `campo_coletado → nunca vazio` |

---

## 5. Invariants Afetados ✅ OBRIGATÓRIO

<!-- Consulte docs/governance/invariant-registry.md para a lista oficial -->

- [ ] `campo_coletado_no_perfil → nunca_reaparece_vazio_no_questionario`
- [ ] `pergunta_sem_fonte → invalida`
- [ ] `risco_sem_origem → invalido`
- [ ] `acao_sem_evidence_required → invalida`
- [ ] `briefing_sem_coverage_100 → invalido`
- [ ] Outro (descreva): _[preencher]_

---

## 6. Arquivos Candidatos à Modificação ✅ OBRIGATÓRIO

<!-- Liste todos os arquivos que provavelmente precisarão ser modificados -->

```
server/db.ts                     — [motivo]
shared/questionario-prefill.ts   — [motivo]
client/src/pages/...             — [motivo]
server/prefill-contract.test.ts  — [motivo: novos testes obrigatórios]
```

---

## 7. Testes Obrigatórios ✅ OBRIGATÓRIO

<!-- Descreva os testes que DEVEM ser adicionados ou atualizados para cobrir esta issue -->

**Novos testes a criar:**
- [ ] `[nome do teste]` — cobre: _[invariant]_
- [ ] `[nome do teste]` — cobre: _[invariant]_

**Testes de regressão a executar:**
- [ ] Suíte PCT completa (`server/prefill-contract.test.ts`)
- [ ] `pnpm test` completo — resultado esperado: todos passando

---

## 8. Evidências Obrigatórias ✅ OBRIGATÓRIO

<!-- Marque o que será entregue no Evidence Pack -->

- [ ] Relatório `.md` em `docs/evidence-packs/YYYY-MM-DD-<slug>.md`
- [ ] Payload antes/depois (JSON ou diff)
- [ ] Print ou evidência visual (se houver UI afetada)
- [ ] Lista de testes adicionados
- [ ] Resultado dos testes (output do `pnpm test`)
- [ ] Link do commit / PR / checkpoint

---

## 9. Gate do Orquestrador ✅ OBRIGATÓRIO

<!-- Esta issue requer aprovação explícita do orquestrador antes do merge? -->

- [ ] **SIM** — Severidade CRÍTICO ou ALTO → aprovação obrigatória antes do merge
- [ ] **NÃO** — Severidade MÉDIO ou BAIXO → revisão de par suficiente

**Justificativa:** _[preencher]_

---

## 10. Risco Residual Esperado

<!-- Após a correção, qual risco permanece? -->

**Risco residual:** _[descreva o que ainda pode falhar e por quê é aceitável]_

**Mitigação do risco residual:** _[o que foi feito para minimizar]_

---

## Contexto Adicional

<!-- Qualquer informação adicional relevante: logs, screenshots, links de sessão, etc. -->

---

## Checklist de Abertura

- [ ] Template preenchido completamente
- [ ] Labels aplicadas: `structural-fix`, `needs-evidence`, `needs-regression`
- [ ] `orchestrator-gate` aplicado se severidade CRÍTICO/ALTO
- [ ] `checkpoint-required` aplicado
- [ ] Issue adicionada à coluna correta do board
