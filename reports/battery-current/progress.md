# Vitest Realtime Progress

**Started:** 2026-04-29T18:03:38.804Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| perfil-router.test.ts | isM2PerfilEntidadeEnabled — 5 etapas de rollout | PASS | 4ms | 2026-04-29T18:03:39.280Z |
| perfil-router.test.ts | T11: Step 1 — flag global false default | PASS | 2ms | 2026-04-29T18:03:39.280Z |
| perfil-router.test.ts | T12: Step 3 — equipe_solaris com env opt-in | PASS | 0ms | 2026-04-29T18:03:39.280Z |
| perfil-router.test.ts | T13: Step 3 alt — whitelist de projetos via env | PASS | 0ms | 2026-04-29T18:03:39.280Z |
| perfil-router.test.ts | T14: Step 4 — flag global true ativa para todos | PASS | 0ms | 2026-04-29T18:03:39.280Z |
| perfil-router.test.ts | T15: env M2_PERFIL_ENTIDADE_ENABLED=false sobrescreve flag global true | PASS | 0ms | 2026-04-29T18:03:39.280Z |
| perfil-router.test.ts | T16: E2E_TEST_MODE=true sempre ativa | PASS | 0ms | 2026-04-29T18:03:39.280Z |
| perfil-router.test.ts | T24: router perfil.ts importa isM2PerfilEntidadeEnabled (corrige feature flag morta) | PASS | 639ms | 2026-04-29T18:03:39.909Z |
| perfil-router.test.ts | T25: assertM2Enabled rejeita FORBIDDEN quando flag global = false e role = cliente | PASS | 0ms | 2026-04-29T18:03:39.910Z |
| perfil-router.test.ts | BUG-1 fix — guard isM2PerfilEntidadeEnabled consumido pelo router | PASS | 640ms | 2026-04-29T18:03:39.910Z |
| perfil-router.test.ts | server/perfil-router.test.ts | PASS | 644ms | 2026-04-29T18:03:39.910Z |

## Summary

- **Pass:** 8
- **Fail:** 0
- **Skipped:** 17
- **Total:** 25
- **Started:** 2026-04-29T18:03:38.804Z
- **Finished:** 2026-04-29T18:03:39.927Z
