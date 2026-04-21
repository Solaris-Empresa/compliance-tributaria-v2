# Template — Avaliação de Risco para Schema DB

Use este template quando a mudança envolve:
- `ALTER TABLE` (adicionar/remover/renomear coluna)
- `DROP TABLE` / `DROP COLUMN`
- Nova migration em `drizzle/`
- Nova coluna JSON em tabela existente

---

## Avaliação de Risco (obrigatória — REGRA-ORQ-20)

### Amplitude

- Arquivos afetados: **N** (drizzle schema + N procedures + N clients)
- Linhas estimadas: **N**
- Procedures tRPC impactadas: **N**
- **Schema changes:** sim — [detalhar: tabela, coluna, tipo]

### Classificação

- Tier: [1 trivial (add coluna nullable) / 2 médio (rename com mapper) / 3 crítico (DROP)]
- Reversibilidade: [alta / média / **baixa** (DROP é destrutivo)]
- Dados em risco: [quantidade · tipo · produção ou dev]

### Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Perda de dados | 🔴 Alta se DROP | Backup antes · window fora de pico |
| Breaking change em prod | 🔴 Alta | Dual-schema por 1 sprint antes de remover |
| Migração órfã em `_journal.json` | 🟠 Média | Verificar hash antes de aplicar |
| Leitura inconsistente em cache | 🟡 Baixa | Invalidar cache tRPC no deploy |
| Type drift entre Drizzle e consumers | 🟡 Baixa | Gate 0 (DATA_DICTIONARY) antes de implementar |

### Estratégia de rollout

- [ ] Migration direta em produção (só se for adição nullable)
- [ ] Dual-write por 1 sprint (adicionar coluna nova + manter antiga)
- [ ] Migration + backfill + swap + drop (4 sprints)
- [ ] Snapshot → teste frio → conversão quente (REGRA-ORQ-19)

### Plano de rollback

- **Nível 1 — CI vermelho:** `git revert` + desaplicar migration local
- **Nível 2 — dados corrompidos em dev:** `pnpm db:reset` + seed
- **Nível 3 — dados corrompidos em prod (coluna removida errada):**
  - Restaurar backup mais recente (Manus)
  - `INSERT INTO ... SELECT FROM backup` para dados faltantes
  - Revert migration + redeploy
- **Nível 4 — catastrófico (tabela dropada):**
  - Restore de backup completo (janela Manus)
  - Post-mortem obrigatório
  - Investigar por que Gate 0 não detectou

### Abort criteria

- Migration falha aplicar em dev → parar · investigar · não avançar para prod
- Backup não disponível → parar · criar backup · refazer
- Gate 0 sinaliza ambiguidade (DATA_DICTIONARY não reflete estado real) → parar

### Validações obrigatórias pré-merge

- [ ] Gate 0 executado (DATA_DICTIONARY consultado + `SHOW FULL COLUMNS`)
- [ ] Backup documentado em `docs/governance/backups/` com timestamp
- [ ] Hash da migration em `drizzle/_journal.json`
- [ ] Teste local com dataset representativo
- [ ] Revisão do `db-schema-validator` agent
