# DK-Q2 — Relatório de Validação Manual (Gold Set)

**Data de execução:** 2026-04-05  
**HEAD no momento da execução:** `adaa84e` (pós-merge PR #313 — DK-Q1)  
**Executor:** Orquestrador Claude  
**Validador jurídico:** Dr. José Rodrigues  
**Solicitante:** Sprint T M1 — Gate triplo pré-Milestone 1

---

## Resultado Geral

**5/5 casos confirmados — todos PASS ✅**

Nenhuma divergência encontrada entre o output do engine e o gabarito do Dr. Rodrigues. Todos os regimes, artigos e condicionantes foram verificados contra a fonte primária (`lc214-2025.pdf` + `nbs-2-0-utf8.csv`).

---

## Resultado por Caso

| Código | Tipo | Regime | Artigo | Condicionante | Status |
|---|---|---|---|---|---|
| `9619.00.00` | NCM | `aliquota_zero` | Art. 147 ✅ | Anvisa ✅ | ✅ PASS |
| `3101.00.00` | NCM | `condicional` | Art. 138 + § 1º ✅ | MAPA ✅ | ✅ PASS |
| `1.1506.21.00` | NBS | `regime_geral` | Arts. 11 + 15 + 21 ✅ | — | ✅ PASS |
| `1.0901.33.00` | NBS | `regime_especial` | Arts. 181 + 182 ✅ | — | ✅ PASS |
| `1.1303.10.00` | NBS | `regime_geral` | Arts. 11 + 15 + 21 ✅ | — | ✅ PASS |

---

## Detalhamento por Caso

### NCM 9619.00.00 — Absorventes higiênicos

- **Regime engine:** `aliquota_zero` · **Gabarito:** `aliquota_zero` ✅
- **Artigo engine:** Art. 147, caput · **Gabarito:** Art. 147 ✅
- **Condicionante engine:** requisitos Anvisa (§ único Art. 147) · **Gabarito:** Anvisa ✅
- **Confiança:** `valor: 100, tipo: deterministico`
- **Fonte primária:** LC 214/2025, Art. 147 — *"Ficam reduzidas a zero as alíquotas do IBS e da CBS incidentes sobre o fornecimento dos seguintes produtos de cuidados básicos à saúde menstrual"*

### NCM 3101.00.00 — Adubos/fertilizantes

- **Regime engine:** `condicional` · **Gabarito:** `condicional` ✅
- **Artigo engine:** Art. 128 inciso IX + Art. 138 + § 1º · **Gabarito:** Art. 138 + § 1º ✅
- **Condicionante engine:** registro MAPA · **Gabarito:** MAPA ✅
- **Confiança:** `valor: 100, tipo: condicional`
- **Instrução engine:** *"Retornar tipo=condicional. Não inferir automaticamente o cumprimento da condição."*
- **Fonte primária:** LC 214/2025, Art. 138 + Anexo IX

### NBS 1.1506.21.00 — Serviços de saúde (regime geral)

- **Regime engine:** `regime_geral` · **Gabarito:** `regime_geral` ✅
- **Artigos engine:** Arts. 11 + 15 + 21 · **Gabarito:** Arts. 11 + 15 + 21 ✅
- **Confiança:** `valor: 95, tipo: regra` (≤ 98 ✅)
- **Fonte primária:** LC 214/2025 + NBS 2.0 MDIC

### NBS 1.0901.33.00 — Serviços de saúde (regime especial)

- **Regime engine:** `regime_especial` · **Gabarito:** `regime_especial` ✅
- **Artigos engine:** Arts. 181 + 182 · **Gabarito:** Arts. 181 + 182 ✅
- **Confiança:** `valor: 90, tipo: regra` (≤ 98 ✅)
- **Fonte primária:** LC 214/2025, Arts. 181-182 (regime diferenciado de saúde)

### NBS 1.1303.10.00 — Serviços de educação (regime geral)

- **Regime engine:** `regime_geral` · **Gabarito:** `regime_geral` ✅
- **Artigos engine:** Arts. 11 + 15 + 21 · **Gabarito:** Arts. 11 + 15 + 21 ✅
- **Confiança:** `valor: 95, tipo: regra` (≤ 98 ✅)
- **Fonte primária:** LC 214/2025 + NBS 2.0 MDIC

---

## Caso Pendente (fora do escopo DK-Q2)

| Código | Status | Pendência |
|---|---|---|
| `2202.10.00` | `pending_validation` | Verificar numeração dos artigos do IS na versão compilada (Lcp214compilado.htm) — PR separado com label `governance` |

---

## Declaração

**Gold set validado. Engine aprovado para Milestone 1.**

Os 5 casos confirmados do POC M1 foram verificados manualmente pelo Orquestrador Claude contra a fonte primária (LC 214/2025 compilada + NBS 2.0 MDIC), com gabarito jurídico do Dr. José Rodrigues. Nenhuma divergência encontrada.

O engine está apto para o **gate triplo** (Técnico + Dr. Rodrigues + P.O.) e para a integração na Onda 3 em produção.

---

## Evidência JSON

```json
{
  "head": "adaa84e",
  "data": "2026-04-05",
  "executor": "Orquestrador Claude",
  "validador_juridico": "Dr. José Rodrigues",
  "total_casos": 5,
  "pass": 5,
  "fail": 0,
  "pending": 1,
  "resultado": "PASS",
  "casos": [
    {"codigo": "9619.00.00", "tipo": "NCM", "regime": "aliquota_zero", "artigo": "Art. 147", "status": "PASS"},
    {"codigo": "3101.00.00", "tipo": "NCM", "regime": "condicional", "artigo": "Art. 138 + § 1º", "status": "PASS"},
    {"codigo": "1.1506.21.00", "tipo": "NBS", "regime": "regime_geral", "artigo": "Arts. 11+15+21", "status": "PASS"},
    {"codigo": "1.0901.33.00", "tipo": "NBS", "regime": "regime_especial", "artigo": "Arts. 181+182", "status": "PASS"},
    {"codigo": "1.1303.10.00", "tipo": "NBS", "regime": "regime_geral", "artigo": "Arts. 11+15+21", "status": "PASS"}
  ],
  "engine_aprovado_para_milestone1": true
}
```

---

*Gerado por Manus AI · Sprint T M1 · 2026-04-05*
