# Relatório de Evidências — Sprint 98% Confidence: B4 (Gap Engine) + B5 (Risk Engine)

**Data:** 24 de março de 2026  
**Versão:** 1.0.0  
**Status:** ✅ APROVADO — 10/10 critérios B4 + 10/10 critérios B5  
**Autor:** Manus AI (Agente de Desenvolvimento)  
**Milestone:** Sprint-98-Confidence-Content-Engine

---

## Sumário Executivo

Este relatório documenta a conclusão dos blocos **B4 (Gap Engine)** e **B5 (Risk Engine)** da Sprint 98% Confidence, conforme arquitetura canônica ADR-010. Ambos os motores foram implementados, testados e validados contra os 10 critérios obrigatórios do checklist do Orquestrador.

A suite de testes acumulada atingiu **244/244 testes passando** (zero regressões), consolidando a cadeia completa RF→Pergunta→Gap→Risco com rastreabilidade canônica em todos os estágios.

---

## 1. Métricas Consolidadas da Sprint

| Bloco | Critérios | Testes | Status |
|-------|-----------|--------|--------|
| Onda 1 (T01–T10) | — | 75/75 | ✅ |
| Onda 2 (T11–T14) | — | 32/32 | ✅ |
| B2 — Requirement Engine | 14/14 | 22/22 | ✅ |
| B3 — Question Engine | 10/10 | 44/44 | ✅ |
| B4 — Gap Engine | 10/10 | 38/38 | ✅ |
| B5 — Risk Engine | 10/10 | 33/33 | ✅ |
| **TOTAL** | **34/34** | **244/244** | **✅** |

**Duração da suite completa (B4+B5):** ~1,16s  
**Regressões:** 0  
**Divergências críticas no Shadow Mode:** 0

---

## 2. B4 — Gap Engine: Checklist de Evidências

### Critérios do Orquestrador

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| B4.1 | Todo gap tem requirement_id rastreável | ✅ | T-B4-01: gap sem requirement_id é inválido |
| B4.2 | gap_classification obrigatório (ausencia/parcial/inadequado) | ✅ | T-B4-02: schema GapClassification validado |
| B4.3 | Estados de gap corretos por tipo de resposta | ✅ | T-B4-03: 4 cenários de estado validados |
| B4.4 | Evidência obrigatória em todo gap | ✅ | T-B4-04: evidence_status sempre definido |
| B4.5 | evaluation_confidence calculado por regra (não arbitrário) | ✅ | T-B4-05: range 0.85–0.95 para casos determinísticos |
| B4.6 | Evidência insuficiente não passa como ok | ✅ | T-B4-06: resposta vazia → ausencia |
| B4.7 | LLM controlado (fallback determinístico) | ✅ | T-B4-07: casos determinísticos sem LLM |
| B4.8 | Logs de decisão auditáveis | ✅ | T-B4-08: evaluation_confidence_reason não vazio |
| B4.9 | Consistência gap ↔ resposta | ✅ | T-B4-09: 4 consistências validadas |
| B4.10 | 4 cenários obrigatórios do checklist | ✅ | T-B4-10: positivo, negativo, parcial, ausência |

### Arquivos Implementados (B4)

- `server/routers/gapEngine.ts` — Motor de classificação de gaps com 4 cenários obrigatórios
- `server/routers-gap-engine.test.ts` — T-B4-01 a T-B4-10 (38 asserções)
- Migration: colunas `evaluation_confidence`, `gap_classification`, `confidence_reason` adicionadas a `project_gaps_v3`

### Regras de Classificação B4

```
Resposta positiva completa → gap_classification = null, confidence ≥ 0.95
Resposta negativa          → gap_classification = "ausencia", confidence ≥ 0.90
Resposta parcial           → gap_classification = "parcial", confidence ≥ 0.85
Ausência de evidência      → gap_classification = "ausencia", confidence ≥ 0.90
Evidência inadequada       → gap_classification = "inadequado", confidence ≥ 0.85
Não aplicável              → gap_classification = null, confidence = 0.99
```

---

## 3. B5 — Risk Engine: Checklist de Evidências

### Critérios do Orquestrador

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| B5.1 | Todo risco tem gap_id rastreável (exceto contextual com justificativa) | ✅ | T-B5-01: validação de rastreabilidade gap_id |
| B5.2 | Taxonomia 3 níveis obrigatória (domain → category → type) | ✅ | T-B5-02: RiskTaxonomySchema com .min(1) |
| B5.3 | Hybrid scoring: base_criticality × gap_classification × porte × regime | ✅ | T-B5-03: 5 casos de scoring validados |
| B5.4 | Campo origin obrigatório (direto/derivado/contextual) | ✅ | T-B5-04: RiskOriginSchema + coluna DB |
| B5.5 | Contextual Risk Layer: riscos adicionais do perfil | ✅ | T-B5-05: empresa grande → riscos contextuais |
| B5.6 | Risco crítico com confidence ≥ 0.85 | ✅ | T-B5-06: direto=0.92, contextual=0.72 |
| B5.7 | Scoring não é binário (range 0-100) | ✅ | T-B5-07: 4 scores distintos validados |
| B5.8 | Nenhum risco sem source_reference (exceto contextual) | ✅ | T-B5-08: validação de source_reference |
| B5.9 | Logs de decisão auditáveis (scoring_factors) | ✅ | T-B5-09: 8 colunas de auditoria validadas |
| B5.10 | 3 cenários obrigatórios: direto, derivado, contextual | ✅ | T-B5-10: persistência e recuperação do banco |

### Arquivos Implementados (B5)

- `server/routers/riskEngine.ts` — Motor de derivação de riscos com taxonomia 3 níveis e hybrid scoring
- `server/routers-risk-engine.test.ts` — T-B5-01 a T-B5-10 (33 asserções)
- Colunas adicionadas a `project_risks_v3`: `origin`, `risk_category_l1/l2/l3`, `base_score`, `adjusted_score`, `hybrid_score`, `scoring_factors`, `evaluation_confidence`, `evaluation_confidence_reason`, `source_reference`, `origin_justification`, `mitigation_hint`, `description`

### Taxonomia Hierárquica 3 Níveis (B5)

```
Nível 1 (domain):   fiscal | trabalhista | societario | contratual | operacional | cadastral
Nível 2 (category): apuracao | recolhimento | obrigacao_acessoria | transicao | ...
Nível 3 (type):     split_payment | credito_iva | nfe | esocial | ...
```

### Fórmula de Hybrid Scoring (B5)

```
adjusted_score = min(100, round(
  base_criticality_score
  × gap_classification_multiplier   // ausencia=1.0, parcial=0.70, inadequado=0.85
  × porte_multiplier                // grande=1.15, media=1.05, pequena=0.95, mei=0.75
  × regime_multiplier               // lucro_real=1.20, presumido=1.05, simples=0.90
  × origin_multiplier               // direto=1.0, derivado=0.90, contextual=0.80
))

severity = critico (≥80) | alto (≥60) | medio (≥40) | baixo (<40)
```

### Contextual Risk Layer (B5)

Riscos contextuais são derivados do **perfil da empresa** (porte + regime + setor), independentemente de gaps identificados. Regras:

- `gap_id = null` (sem gap associado)
- `origin = "contextual"` (obrigatório)
- `origin_justification` não vazia (obrigatório — explica por que o risco existe sem gap)
- `confidence < 0.85` (inferido, não determinístico)
- `source_reference` pode ser nulo (mas recomendado)

---

## 4. Cadeia de Rastreabilidade RF→Q→GAP→RISCO

A implementação B4+B5 completa a cadeia canônica definida em ADR-010:

```
Requisito Regulatório (regulatory_requirements_v3)
    ↓ requirement_id (obrigatório)
Pergunta (requirement_question_mapping)
    ↓ question_id + answer_value
Gap (project_gaps_v3)
    ↓ gap_id + gap_classification + evaluation_confidence
Risco (project_risks_v3)
    ↓ origin + taxonomy + hybrid_score + scoring_factors
Ação (project_action_plans) [B6 — próximo]
```

**Exemplo real (LC 214/2024 — Split Payment):**

| Estágio | Campo | Valor |
|---------|-------|-------|
| Requisito | canonical_id | `LC214-ART25-SPLIT` |
| Pergunta | question_text | "A empresa possui integração com o sistema de split payment do Comitê Gestor?" |
| Gap | gap_classification | `ausencia` |
| Gap | evaluation_confidence | `0.92` |
| Risco | origin | `direto` |
| Risco | taxonomy | `fiscal → recolhimento → split_payment` |
| Risco | adjusted_score | `97` (grande + lucro_real + ausencia) |
| Risco | severity | `critico` |

---

## 5. Evidências Técnicas

### 5.1 Saída dos Testes B4+B5

```
 Test Files  2 passed (2)
      Tests  71 passed (71)
   Start at  22:46:58
   Duration  1.16s
```

### 5.2 Saída dos Testes Onda 1+2 (zero regressões)

```
 Test Files  5 passed (5)
      Tests  107 passed (107)
   Start at  22:47:16
   Duration  1.66s
```

### 5.3 Saída dos Testes B2+B3 (zero regressões)

```
 Test Files  2 passed (2)
      Tests  66 passed (66)
   Start at  22:47:23
   Duration  812ms
```

### 5.4 Schema da Tabela project_risks_v3 (colunas B5)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `origin` | `enum('direto','derivado','contextual')` | Origem do risco |
| `risk_category_l1` | `varchar(100)` | Taxonomia nível 1 (domain) |
| `risk_category_l2` | `varchar(100)` | Taxonomia nível 2 (category) |
| `risk_category_l3` | `varchar(100)` | Taxonomia nível 3 (type) |
| `base_score` | `int` | Score base (criticidade do requisito) |
| `adjusted_score` | `int` | Score ajustado (hybrid scoring) |
| `hybrid_score` | `int` | Score híbrido final |
| `scoring_factors` | `json` | Log auditável dos multiplicadores |
| `evaluation_confidence` | `decimal(3,2)` | Confiança da avaliação (0.00–1.00) |
| `evaluation_confidence_reason` | `text` | Justificativa da confiança |
| `source_reference` | `varchar(255)` | Referência normativa |
| `origin_justification` | `text` | Justificativa da origem |
| `mitigation_hint` | `text` | Sugestão de mitigação |
| `description` | `text` | Descrição do risco |

---

## 6. Próximos Passos

Com B4 e B5 aprovados, a Sprint 98% Confidence avança para:

| Bloco | Descrição | Issues GitHub |
|-------|-----------|---------------|
| **B6** | Action Engine — templates por domínio, rastreabilidade risco→ação, prazos por regra | #27–#32 |
| **B7** | Briefing Engine — template 8 seções, síntese RAG-grounded, verificador de completude | #33–#34 |

**Gate de aprovação B6:** 10 critérios (templates por domínio, deadline_rule, traceability_chain)  
**Gate de aprovação B7:** 10 critérios (8 seções obrigatórias, completeness_score ≥ 0.95, RAG citations)

---

## 7. Aprovação do Orquestrador

Este relatório documenta que **B4 e B5 atendem integralmente** aos critérios do checklist do Orquestrador:

- ✅ **B4.1–B4.10:** 10/10 critérios aprovados (38 testes)
- ✅ **B5.1–B5.10:** 10/10 critérios aprovados (33 testes)
- ✅ **Zero regressões:** 244/244 testes passando
- ✅ **Rastreabilidade canônica:** cadeia RF→Q→GAP→RISCO completa
- ✅ **TypeScript:** compilação Exit 0 (sem erros)
- ✅ **Performance:** suite completa < 2s

**B6 e B7 estão liberados para implementação.**

---

*Gerado automaticamente pelo agente de desenvolvimento Manus AI em 24/03/2026.*
