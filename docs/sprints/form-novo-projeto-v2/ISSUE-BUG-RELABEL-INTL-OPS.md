## [BUG-RELABEL-INTL-OPS] Matar a ponte hasImportExport→hasInternationalOps (viés diagnóstico ativo) — Componente 3

> Classe A · P1 · Decisões P.O. 26/06/2026 + parecer Dr. José (LC 214) + prova runtime Manus.

## Bloco 1 — Contexto

Com `ENABLE_INTL_OPS_ALIGN=true` em prod (verificado `/proc/.../environ`), o helper `alignIntlOps` (`routers-fluxo-v3.ts:497`) deriva `taxComplexity.hasInternationalOps = hasImportExport` no `createProject`. Resultado: o usuário que declara **"Importação/Exportação de bens"** faz o LLM da Onda 2 receber **"Operações internacionais: Sim"** — conceito juridicamente distinto.

**Parecer Dr. José (LC 214/2025):** importação/exportação de **bens materiais** (Art. 65/81) ≠ **operações internacionais** (conceito amplo — imateriais Art. 64/80, serviços financeiros Art. 231). Mapear o sinal estreito no rótulo amplo induz o LLM a gerar findings sobre escopo **não declarado** pelo contribuinte → **viés diagnóstico ativo em produção** (projeto `10590001` afetado).

**Fix:** matar a ponte (Componente 3). Não trocar leitores, não relabelar prompt.

## Bloco 2 — Escopo (4 ações, nada mais)

| # | Ação | Arquivo:linha |
|---|---|---|
| 1 | `alignIntlOps(input.taxComplexity)` → `input.taxComplexity` | `routers-fluxo-v3.ts:497` |
| 2 | Remover import do helper | `routers-fluxo-v3.ts:28` |
| 3 | Aposentar helper + teste (delete) | `server/lib/align-intl-ops.ts` · `align-intl-ops.test.ts` |
| 4 | Desligar flag em prod (ação Manus/ops) | env `ENABLE_INTL_OPS_ALIGN` |

> Ação 4 é ops (prod env). O código (ações 1-3) **neutraliza a flag** independentemente — sem o helper, a flag não tem efeito. Desligar em prod é redundância de segurança.

## Bloco 3 — ❌ Barrado (não fazer)

| Item | Motivo |
|---|---|
| Componente 1 — trocar leitores `hasInternationalOps`→`hasImportExport` | Conflação jurídica (Art. 65/81 ≠ amplo) — Dr. José. Barrado **por mérito**, independente do ConsistencyGate |
| Componente 2 — relabel do prompt | Mentiria sobre o input do **ConsistencyGate** (que declara "operações internacionais" corretamente, mesmo dormente) |
| `usesTaxIncentives` / `usesMarketplace` | Backlog (Decisões 2/3) |

## Bloco 4 — Gate 0 (callsites verificados)

`grep -rn hasInternationalOps server/` — **leitores ficam INTACTOS** (legítimos p/ ConsistencyGate, fonte direta): `:158`, `:5445`, `consistencyEngine.ts:172/179/189` (DET-004/005), `db-requirements.ts:99`, `diagnostic-consolidator.ts:186/189/329`. **Tipos/schema** ficam: `consistencyEngine:44`, `diagnostic-consolidator:52`, `diagnostic-source:85`, `consistencyRouter:38`, `routers-fluxo-v3:435`.
**Só a PONTE é tocada:** `alignIntlOps` call `:497` + import `:28` + helper + test.

**ConsistencyGate = gate dormente** (prova runtime Manus: `consistency_checks`=0, 0 navegações, 0 chamadas tRPC). Remoção da feature = backlog (issue-filha).

## Bloco 7 — DoD (REGRA-HOTFIX-3, persistência real)

- [ ] D1 `grep -r "ENABLE_INTL_OPS_ALIGN" server/` → 0 ativo
- [ ] D2 `grep -r "alignIntlOps" server/` → 0 ativo
- [ ] D3 Projeto novo Import/Export=Sim → `SELECT taxComplexity` → `hasInternationalOps` **ausente/null** (não derivado)
- [ ] D4 Prompt Onda 2 pós-fix **não** contém "Operações internacionais" p/ projeto novo
- [ ] D5 `pnpm tsc --noEmit` → 0 erros
- [ ] D6 `consistencyEngine-det-intl.test.ts` **inalterado e PASS** (DET-004/005 leem `hasInternationalOps` via ConsistencyGate — válidos por construção)

## Bloco 8 — Backlog linkado (issues-filhas)

| Issue-filha | Descrição | Prioridade |
|---|---|---|
| ConsistencyGate dead-code sweep | Gate dormente → remoção estilo ADR-0034 | P3 |
| Leitores `hasInternationalOps` dormentes pós-fix | Limpar junto de `usesTaxIncentives`/`usesMarketplace` | P3 |

## ADR

`ADR-0039` (a criar) — decisão: import/export de bens ≠ operações internacionais; remover ponte dual-name; engine lê apenas a fonte direta. Base: parecer Dr. José LC 214 Arts. 64/65/80/81/231.

## Evidência arquivada
- Parecer Dr. José · prova runtime Manus (taxComplexity 3/3 + 10590001 + ConsistencyGate dormente) · `git=71dbf4ff / checkpoint=1eb2f974`
- Análise: `docs/governance/relatorios/` (tabelas de campos)
