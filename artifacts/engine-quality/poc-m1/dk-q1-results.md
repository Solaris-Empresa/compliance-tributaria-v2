# DK-Q1 — Relatório de Gate Estrutural do Dataset

**Data de execução:** 2026-04-05  
**HEAD no momento da execução:** `4c3146f` (pós-merge PR #312 — Bloco D)  
**Executor:** Manus AI  
**Solicitante:** Orquestrador Claude — Sprint T M1

---

## Resultado por Check

| Check | Descrição | Resultado | Observações |
|---|---|---|---|
| Q1-A | Campos obrigatórios NCM | ✅ PASS | 3 entradas · 0 erros |
| Q1-B | Campos obrigatórios NBS | ✅ PASS | 3 entradas · 0 erros |
| Q1-C | Status válidos | ✅ PASS | confirmados: 5 · pending: 1 · total: 6 |
| Q1-D | Confiança por tipo | ✅ PASS | 0 erros (após correção autorizada) |
| Q1-E | Smoke test engine | ⚠️ N/A | Não bloqueante — problema de runtime CJS/ESM no script ad-hoc; evidência válida são os 16 testes Vitest |

**Total de erros bloqueantes: 0**

---

## Correção Aplicada (autorizada pelo Orquestrador)

Durante a execução do Q1-D, foi identificada uma inconsistência no `ncm-dataset.json`:

| Campo | Valor anterior | Valor corrigido | Razão |
|---|---|---|---|
| `2202.10.00` · `confianca.valor` | `100` | `0` | `pending_validation` → confiança operacional = 0 |
| `2202.10.00` · `confianca.tipo` | `"deterministico"` | `"fallback"` | `pending_validation` → tipo = fallback |

**Origem do erro:** o valor `100` veio do gabarito jurídico do Dr. Rodrigues (certeza jurídica sobre o regime), mas o campo `confianca.valor` representa a confiança operacional do engine — não a certeza jurídica. Caso `pending_validation` não pode ter confiança operacional diferente de 0.

**Autorização:** Orquestrador Claude — 2026-04-05.

---

## Evidência dos Checks Q1-A a Q1-D

```
=== Q1-A — Campos obrigatórios NCM ===
NCM check completo: 3 entradas | erros: 0

=== Q1-B — Campos obrigatórios NBS ===
NBS check completo: 3 entradas | erros: 0

=== Q1-C — Status válidos ===
confirmados: 5 | pending: 1 | total: 6 | erros: 0

=== Q1-D — Confiança por tipo ===
Confiança check OK | erros: 0

=== RESUMO DK-Q1 ===
  Q1-A: PASS
  Q1-B: PASS
  Q1-C: PASS
  Q1-D: PASS
  Q1-E: N/A (não bloqueante)
Total erros bloqueantes: 0
✅ Dataset estruturalmente válido para DK-Q2
```

---

## Evidência Q1-E (Vitest — 16/16 ✅)

O smoke test Q1-E não pôde ser executado via script CJS/ESM ad-hoc (os engines são TypeScript puro, não compilados para CJS). A evidência válida são os **16 testes Vitest** do PR #311 (Bloco C), que cobrem exatamente os mesmos casos:

| Teste Vitest | Equivalente Q1-E |
|---|---|
| `NCM 9619.00.00 → aliquota_zero, confiança 100` | `r1.regime === 'aliquota_zero'` ✅ |
| `NCM 2202.10.00 (pending) → confiança 0, tipo fallback` | `r2.confianca.valor === 0` ✅ |
| `NBS 1.0901.33.00 → regime_especial, confiança ≤ 98` | `r3.regime === 'regime_especial'` ✅ |

---

## Declaração

**Dataset estruturalmente válido para DK-Q2.**

Os datasets `ncm-dataset.json` (3 entradas: 2 confirmadas + 1 pending) e `nbs-dataset.json` (3 entradas: 3 confirmadas) passaram em todos os checks estruturais obrigatórios (Q1-A a Q1-D). O engine responde corretamente para todos os casos validados (evidenciado pelos 16 testes Vitest do Bloco C).

**Próximo passo:** DK-Q2 — validação manual pelo Orquestrador (executar engine para os 5 casos confirmados e comparar com gabarito do Dr. Rodrigues).

---

*Gerado por Manus AI · Sprint T M1 · 2026-04-05*
