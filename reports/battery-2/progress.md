# Bateria 2 — Pós-primeiras correções

**Status:** PENDENTE (aguarda pré-condições resolvidas)
**Pré-requisitos:**
- `final.md` B1 aprovado pelo P.O. ✅ (ver `reports/battery-1/final.md`)
- Projeto `E2E_DESTRUCTIVE_PROJECT_ID=1200001` populado (riscos aprovados + planos + tarefas)
  — AÇÃO 2 em execução pelo Manus

## Thresholds oficiais (aprovados P.O. 18/04/2026)

| Gate | Threshold | Notas |
|---|---|---|
| Unit | ≥ 80% PASS | Subiu de 50% (B1) |
| Integration | ≥ 70% PASS | Subiu de 30% (B1) |
| Aferição §13.5 | ≥ 8/10 critérios | Subiu de 5/10 (B1) |
| **Bugs UAT automatizáveis** | **≥ 12/15** | **APROVADO P.O. 18/04/2026** (substitui "17/21" da spec v1.1 — triagem Bloco 9.1 identificou 15 automatizáveis + 5 humanos + 1 UX) |
| Drift check | 0 divergências críticas | DB × código × RN alinhados |

## Escopo

- 4 fixme pendentes de B1 devem ser implementados (requerem dados em 1200001)
- Bugs UAT não cobertos em B1 (B-01, B-03, B-04, B-05, B-07, B-08, B-09, B-10, B-14..B-21) — novos CTs
- Correções (se houver) dos gaps detectados em B1 — atualmente 0 bugs de produto

## Meta de cobertura

Dos 15 bugs automatizáveis:
- **B1 cobriu 5 explícitos:** B-02, B-06, B-11, B-12, B-13
- **B2 precisa cobrir +7 no mínimo:** chegar a ≥ 12/15

---

*Este arquivo será alimentado em tempo real pelo `realtime-reporter` durante execução da B2.*
