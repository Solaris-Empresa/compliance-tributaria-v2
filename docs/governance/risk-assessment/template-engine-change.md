# Template — Avaliação de Risco para Engine Determinística

Use este template quando a mudança envolve:
- `server/lib/risk-engine-v4.ts` (computeRiskMatrix, classifyRisk)
- `server/lib/action-plan-engine-v4.ts` (buildActionPlans)
- `server/lib/compliance-score-v4.ts` (calculateComplianceScore)
- `server/lib/calculate-briefing-confidence.ts`
- `server/lib/consolidate-gaps.ts`
- `server/lib/detect-export-signal.ts`
- Qualquer função pura que alimenta o briefing/matriz/planos

---

## Avaliação de Risco (obrigatória — REGRA-ORQ-20)

### Amplitude

- Arquivos afetados: **N**
- Engine modificada: [nome]
- Consumers downstream: [riscos · planos · tarefas · briefing · dashboard]
- Linhas estimadas: **N**

### Classificação

- Tier: [1 trivial (adição nova função) / 2 médio (alteração de pesos) / **3 crítico (mudança de fórmula/threshold)**]
- Reversibilidade: alta (código puro, sem estado persistente)
- Efeito em dados existentes: [recalcular snapshots? invalidar cache?]

### Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Output muda para projetos existentes | 🔴 Alta se threshold | Versionar fórmula · flag para recalcular |
| LLM downstream muda comportamento | 🟠 Média | Golden set test (entrada fixa → saída esperada) |
| Cache tRPC serve dados antigos | 🟡 Baixa | Invalidar cache no deploy |
| Perda de determinismo | 🔴 Alta | Unit tests cobrindo faixas · mesma entrada → mesma saída |

### Estratégia de rollout

- [ ] Direto em main (tier 1)
- [ ] Nova engine side-by-side (v4 + v5), switch via flag (tier 2/3)
- [ ] Snapshot → teste frio → conversão quente (REGRA-ORQ-19) — **obrigatório para tier 3**
- [ ] Versionamento de fórmula (`formula_version: "v4.1"`) para auditoria

### Plano de rollback

- **Nível 1 — scores absurdos em dev:** `git revert` · unit test exposes
- **Nível 2 — score inconsistente em prod:** `git revert` · Manus redeploy
- **Nível 3 — briefings/riscos com qualidade degradada:** revert + investigar causa · pode exigir recalcular snapshots
- **Nível 4 — catastrófico (todos os projetos afetados):** restore checkpoint + script SQL para repopular snapshots

### Abort criteria

- Output de casos representativos fora de threshold esperado → parar
- Unit test de regressão falha (ex: projeto golden que dava 85% agora dá 70%) → investigar
- Convergência matemática para ponto fixo (ex: sempre 66%) → revisar fórmula

### Validações obrigatórias pré-merge

- [ ] Unit tests determinísticos (mesma entrada → mesma saída em 100 runs)
- [ ] Golden set: 5-10 projetos representativos com outputs esperados
- [ ] Comparação A/B: output v4 vs v5 em dataset real (antes de promover)
- [ ] Documentação da fórmula atualizada em `server/lib/<engine>.ts` header
- [ ] ADR se mudança de contrato (ex: engine v4 → v5)

### Referência canônica

**Issue #796** (score cravado em 66%) — exemplo de análise matemática de ponto
fixo em engine determinística. Serve como lembrete de que fórmulas precisam
ser testadas com diversidade de inputs, não só casos típicos.

**ADR-0022** — hot swap engine v4 — exemplo de versionamento formal.
