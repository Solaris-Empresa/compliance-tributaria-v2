# Template — Avaliação de Risco para Refactor Cross-File

Use este template quando a mudança envolve:
- ≥3 arquivos em módulos diferentes (server + client, ou múltiplos routers)
- Rename/mover função compartilhada
- Mudança de assinatura em helper usado amplamente
- Extração de lógica para novo módulo

---

## Avaliação de Risco (obrigatória — REGRA-ORQ-20)

### Amplitude

- Arquivos afetados: **N**
- Linhas estimadas: **N**
- Procedures tRPC impactadas: **N**
- Schema changes: não (este template é só refactor de código)

### Classificação

- Tier: [1 trivial (rename privado) / 2 médio (N<5 arquivos) / **3 crítico (N≥10 ou módulos críticos)**]
- Reversibilidade: alta (git revert)

### Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Import quebrado em arquivo esquecido | 🟠 Média | `pnpm check` zero erros antes do PR |
| Mudança semântica imprevista | 🟠 Média | Unit tests dos callers principais |
| Impacto em runtime não coberto por tsc | 🔴 Alta se arquivo com @ts-nocheck | Smoke UX obrigatório em todos os fluxos tocados |
| Conflito com PRs em voo | 🟡 Baixa | Anunciar no board · PR pequeno e atômico |

### Estratégia de rollout

- [ ] PR único (recomendado se tier 1/2)
- [ ] Fases em N PRs por módulo (tier 3)
- [ ] Snapshot → teste frio → conversão quente (se tier 3 + arquivos críticos)

### Plano de rollback

- **Nível 1 — CI vermelho:** `git revert` + push
- **Nível 2 — tela branca prod:** `git revert` do PR específico → Manus redeploy
- **Nível 3 — múltiplos arquivos impactados:** revert em cascata via `git log --grep`
- **Nível 4 — catastrófico:** restore checkpoint pré-refactor

### Abort criteria

- 2+ incidentes P0/P1 em 24h → pausar · investigar
- Cascata >3 arquivos quebrando → rollback completo · post-mortem

### Validações obrigatórias pré-merge

- [ ] `pnpm check` zero erros
- [ ] Unit tests dos módulos tocados passando
- [ ] Grep manual: todos os callers do símbolo alterado foram atualizados
- [ ] Review de 1+ par (se tier 2/3)
