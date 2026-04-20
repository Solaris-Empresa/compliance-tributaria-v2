# Template — Avaliação de Risco para Remoção de Guardrail

Use este template quando a mudança envolve:
- Remover `// @ts-nocheck`
- Remover feature flag
- Remover gate/validação existente
- Desabilitar lint rule
- Reduzir severidade de erro para warning

---

## Avaliação de Risco (obrigatória — REGRA-ORQ-20)

### Amplitude

- Arquivos afetados: **N**
- Guardrail removido: [tipo · qual arquivo · há quanto tempo existia]
- Bugs potencialmente suprimidos: [estimativa via grep/histórico]

### Classificação

- Tier: [1 trivial (flag dev-only) / 2 médio (lint rule) / **3 crítico (@ts-nocheck em página visível)**]
- Reversibilidade: alta (re-adicionar guardrail)

### Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Bug latente revelado | 🔴 Alta | Fix antes de remover OU manter guardrail até fix |
| Cascata de erros em outros arquivos | 🟠 Média | Remover 1 arquivo por PR |
| Regressão em funcionalidade que dependia do bug | 🟡 Baixa | Smoke UX dos fluxos tocados |
| Reintrodução acidental do guardrail | 🟢 Trivial | CI rule bloqueando reintrodução |

### Estratégia de rollout (OBRIGATÓRIA snapshot→cold→hot)

Guardrail removal é **classe sensível** — exige sempre:

- [ ] **Snapshot:** branch isolada `chore/remove-guardrail-<nome>-cold`
- [ ] **Teste frio:** Manus publica em `iasolaris-cold.manus.space` (URL não-produção)
- [ ] **UAT no cold:** P.O. valida fluxos críticos no ambiente cold
- [ ] **Observação 24h:** logs do cold sem erro novo
- [ ] **3 luzes verdes obrigatórias:** CI verde · UAT funcional · 24h observação
- [ ] **Conversão para quente:** merge para main · deploy prod

**Sem estes passos, guardrail removal é BLOQUEADO.**

### Plano de rollback

- **Nível 1 — CI vermelho após merge:** `git revert` + push → re-adicionar guardrail
- **Nível 2 — tela branca prod:** `git revert` do PR · Manus redeploy · reintroduzir guardrail em hotfix
- **Nível 3 — múltiplos bugs:** revert todos os PRs da leva + post-mortem
- **Nível 4 — catastrófico:** restore checkpoint pré-remoção

### Abort criteria

- 2+ incidentes em 24h no cold → pausar · investigar antes de promover
- Padrão de bug novo não coberto → não promover · re-avaliar estratégia
- Falha em reproduzir em cold o bug que deveria ter sido detectado → investigar

### Validações obrigatórias pré-conversão para quente

- [ ] `pnpm check` zero erros no branch cold
- [ ] Unit tests dos módulos tocados passando
- [ ] Smoke UX de TODOS os fluxos que passam pelo arquivo
- [ ] Relatório de auditoria (REGRA-ORQ-19) gerado para o cold
- [ ] Aprovação explícita do P.O. para conversão

### Referência canônica

**Issue #793** (migração @ts-nocheck de 20 arquivos) contém o primeiro caso
concreto e serve como gabarito de análise para futuras remoções de guardrail.
