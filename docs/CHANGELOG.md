## [3.1.0] — 2026-04-01

### G17 P0 — Integrar solaris_answers ao gapEngine (Sprint N)

**PRs:** #262 (feat/g17) + #263 (fix/g17-v2)  
**Issue:** Closes #259

#### Adicionado
- `server/lib/solaris-gap-analyzer.ts` — módulo puro `analyzeSolarisAnswers()` que lê `solaris_answers` e insere gaps em `project_gaps_v3` com `source='solaris'`
- `server/config/solaris-gaps-map.ts` — mapeamento de 12 tópicos SOLARIS (SOL-001..SOL-012) para gaps com descrição, área, severidade e score
- Migration `drizzle/0061_g17_source_column.sql` — campo `source VARCHAR NOT NULL DEFAULT 'v1'` em `project_gaps_v3`
- 13 testes unitários em `server/g17-solaris-gap.test.ts` cobrindo mapeamento, geração, idempotência e fire-and-forget

#### Corrigido (PR #263)
- Enums incorretos no INSERT: `gap_level=operacional`, `gap_type=normativo`, `compliance_status=nao_atendido`, `evidence_status=ausente`, `action_priority=imediata`
- Extração da função inline de `routers-fluxo-v3.ts` para módulo dedicado `server/lib/`

#### Validado em produção
- Projeto 2310001: SOL-002="não" → 3 gaps `source=solaris` inseridos em `project_gaps_v3`
- Critério de done: gap com "confiss" no `description` e `source='solaris'` ✅

---


