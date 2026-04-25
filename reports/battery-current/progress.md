# Vitest Realtime Progress

**Started:** 2026-04-25T00:18:48.795Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| m1-feature-flag.test.ts | server/m1-feature-flag.test.ts | PASS | 5ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | isM1ArchetypeEnabled — Política de rollout controlado M1 | PASS | 5ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R1: cliente NÃO tem acesso quando flag global = false | PASS | 1ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R1: advogado_junior NÃO tem acesso quando flag global = false | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R2: equipe_solaris TEM acesso independente da flag global | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R3: advogado_senior TEM acesso independente da flag global | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R4: E2E_TEST_MODE=true habilita para qualquer role | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R4: E2E_TEST_MODE=false NÃO habilita para clientes | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R5: projeto em whitelist TEM acesso para qualquer role | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R5: projeto fora da whitelist NÃO tem acesso para cliente | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R5: whitelist vazia não habilita nenhum projeto | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R5: whitelist com espaços é parseada corretamente | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | R6: flag global true habilita para todos | PASS | 0ms | 2026-04-25T00:18:49.040Z |
| m1-feature-flag.test.ts | INV: a função não recebe score como parâmetro (score não interfere no gate) | PASS | 0ms | 2026-04-25T00:18:49.040Z |

## Summary

- **Pass:** 12
- **Fail:** 0
- **Skipped:** 0
- **Total:** 12
- **Started:** 2026-04-25T00:18:48.795Z
- **Finished:** 2026-04-25T00:18:49.053Z
| versionHistory.test.ts | should maintain version sequence correctly | PASS | 53338ms | 2026-04-25T00:19:33.850Z |
| versionHistory.test.ts | should return empty array when no versions exist | PASS | 367ms | 2026-04-25T00:19:34.217Z |
| versionHistory.test.ts | Version History - Briefing | PASS | 120301ms | 2026-04-25T00:19:34.217Z |
