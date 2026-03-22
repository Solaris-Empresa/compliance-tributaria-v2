# CPIE v2 — Single Source of Truth

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.ts`

---

## Propósito

Este documento define os valores canônicos de todos os thresholds, limites, penalizações e constantes do CPIE v2. Qualquer alteração de regra deve ser feita **primeiro aqui** e depois propagada para o código e para os testes.

> **Princípio:** `server/cpie-v2.ts` é a implementação. Este documento é o contrato. Em caso de divergência, este documento prevalece e o código deve ser corrigido.

---

## 1. Limites de Faturamento por Porte

Fonte: BNDES, Sebrae e Receita Federal (Simples Nacional).

| Porte | Faturamento anual máximo | Constante no código |
|---|---|---|
| MEI | R$ 81.000 | `REVENUE_LIMITS["0-81000"].max = 81000` |
| Microempresa | R$ 360.000 | `REVENUE_LIMITS["0-360000"].max = 360000` |
| Pequena empresa | R$ 4.800.000 | `REVENUE_LIMITS["360000-4800000"].max = 4800000` |
| Média empresa | R$ 300.000.000 | `SIZE_MAX_REVENUE["media"] = 300000000` |
| Grande empresa | Sem limite superior | `SIZE_MAX_REVENUE["grande"] = Infinity` |

**Nota crítica:** O limite de R$ 4,8M para Simples Nacional é o teto legal. O limite de R$ 300M para porte médio é o critério BNDES. Esses dois valores têm fontes distintas e não devem ser confundidos.

---

## 2. Limites de Faturamento por Regime Tributário

| Regime | Faturamento anual máximo | Observação |
|---|---|---|
| MEI | R$ 81.000 | Limite legal LC 123/2006 |
| Simples Nacional | R$ 4.800.000 | Limite legal LC 123/2006 |
| Lucro Presumido | R$ 78.000.000 | Limite RIR/1999 |
| Lucro Real | Sem limite | Obrigatório acima de R$ 78M |

---

## 3. Penalizações por Severidade

| Severidade | Penalização no `consistencyScore` | Constante |
|---|---|---|
| `critical` | -35 pontos | `SEVERITY_PENALTIES.critical = 35` |
| `high` | -20 pontos | `SEVERITY_PENALTIES.high = 20` |
| `medium` | -10 pontos | `SEVERITY_PENALTIES.medium = 10` |
| `low` | -5 pontos | `SEVERITY_PENALTIES.low = 5` |

As penalizações são **acumulativas**: dois conflitos `high` resultam em -40 pontos.

---

## 4. Vetos por Regra (Tetos de `consistencyScore`)

| Regra | Veto | Severidade | Tipo |
|---|---|---|---|
| A1 | 15 | critical | hard_block |
| A2 | 30 | high | soft_block |
| A3 | 35 | high | soft_block |
| A4 | 15 | critical | hard_block |
| B1 (5× faturamento) | 15 | critical | hard_block |
| B1b (3× faturamento) | 30 | high | soft_block |
| B2 (operação incompatível — high) | 35 | high | soft_block |
| B2 (operação levemente incompatível — medium) | 55 | medium | — |
| B3 | 55 | medium | — |
| B4 (≥ 2 categorias) | 30 | high | soft_block |
| B4 (1 categoria) | 55 | medium | — |
| C1 | 15 | critical | hard_block |
| C2 | 35 | high | soft_block |
| C3 | 35 | high | soft_block |
| AI-ERR (falha da IA) | 0 | critical | hard_block |

---

## 5. Thresholds de Decisão

| Threshold | Valor | Efeito |
|---|---|---|
| `diagnosticConfidence < 15` | 15 | hard_block automático |
| `completenessScore` mínimo para análise B | 0% | Camada B executa se `inferenceConfidence ≥ 50` |
| `inferenceConfidence` mínimo para Camada B | 50 | Abaixo disso, Camada B é ignorada |
| Multiplicador faturamento para B1 (crítico) | 5× | Faturamento descrito ≥ 5× o declarado → critical |
| Multiplicador faturamento para B1b (alto) | 3× | Faturamento descrito ≥ 3× o declarado → high |
| Diferença de porte para B4 (alto) | ≥ 2 categorias | Ex: micro → grande |
| Diferença de porte para B4 (médio) | 1 categoria | Ex: micro → pequena |
| Justificativa mínima para override | 50 chars | Abaixo → BAD_REQUEST |

---

## 6. Ordem de Precedência de Vetos

Quando múltiplos vetos estão ativos, o `consistencyScore` final é o **mínimo** de todos:

```
consistencyScore = min(rawScore, deterministicVeto, effectiveAiVeto)
```

O `deterministicVeto` é o mínimo dos vetos determinísticos ativos. O `effectiveAiVeto` é o veto da IA após filtros de sanidade e falsos positivos.

---

## 7. Versão do Motor

| Campo | Valor |
|---|---|
| `analysisVersion` | `"cpie-v2.0"` |
| Data de lançamento | 2026-01-29 |
| Última atualização | 2026-03-22 |

---

## 8. Regras de Filtro de Falsos Positivos

O filtro de falsos positivos remove findings da IA sobre conflitos de porte quando:

```
revenueMin <= SIZE_MAX_REVENUE[companySize]
```

Onde `revenueMin` é o limite inferior do `annualRevenueRange` declarado e `SIZE_MAX_REVENUE[companySize]` é o limite máximo do porte declarado.

**Exemplos:**

| Cenário | `revenueMin` | `SIZE_MAX_REVENUE` | Filtrado? |
|---|---|---|---|
| Média + R$12M/ano | 4.800.000 | 300.000.000 | Sim (4,8M ≤ 300M) |
| Média + R$36M/ano | 4.800.000 | 300.000.000 | Sim (4,8M ≤ 300M) |
| Pequena + R$10M/ano | 360.000 | 4.800.000 | Não (360K ≤ 4,8M mas 10M > 4,8M) |
| Grande + R$500M/ano | 78.000.000 | Infinity | Sim (78M ≤ ∞) |
