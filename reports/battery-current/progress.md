# Vitest Realtime Progress

**Started:** 2026-05-05T14:31:54.628Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| engine-gap-analyzer.test.ts | server/lib/engine-gap-analyzer.test.ts | PASS | 11ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | engine-gap-analyzer — Q5 obrigatórios (Bloco D) | PASS | 11ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | NCM confirmado (9619.00.00) gera gap com source=engine | PASS | 4ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | NBS confirmado (1.1506.21.00) gera gap com source=engine | PASS | 1ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | NBS pending_validation (1.0906.11.00) NÃO gera INSERT no banco | PASS | 1ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | evaluation_confidence = confianca.valor / 100 para NCM 9619.00.00 (confiança 100) | PASS | 1ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | source_reference contém artigo da lei (LC 214/2025 Art. ...) | PASS | 1ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | múltiplos NCM/NBS confirmados geram múltiplos gaps | PASS | 1ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | mix pending + confirmados: apenas confirmados gravam no banco | PASS | 0ms | 2026-05-05T14:31:55.177Z |
| engine-gap-analyzer.test.ts | DELETE source=engine é chamado antes dos INSERTs (idempotência) | PASS | 1ms | 2026-05-05T14:31:55.177Z |
| e2e-fluxo-completo.test.ts | Caso 1: completeOnda1 — cnaes_confirmados → onda1_solaris | PASS | 1078ms | 2026-05-05T14:31:56.069Z |
| e2e-fluxo-completo.test.ts | Caso 2: completeOnda2 — onda1_solaris → onda2_iagen | PASS | 3ms | 2026-05-05T14:31:56.069Z |
| e2e-fluxo-completo.test.ts | Caso 3: completeDiagnosticLayer(corporate) — onda2_iagen → diagnostico_corporativo | PASS | 2ms | 2026-05-05T14:31:56.069Z |
| e2e-fluxo-completo.test.ts | Caso 4: completeDiagnosticLayer(operational) — diagnostico_corporativo → diagnostico_operacional | PASS | 1ms | 2026-05-05T14:31:56.069Z |
| e2e-fluxo-completo.test.ts | Caso 5: completeDiagnosticLayer(cnae) — diagnostico_operacional → diagnostico_cnae | PASS | 1ms | 2026-05-05T14:31:56.069Z |
| e2e-fluxo-completo.test.ts | Caso 6: approveBriefing — diagnostico_cnae → matriz_riscos (transição atômica) | PASS | 25ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 7: approveMatrices — matriz_riscos → plano_acao | PASS | 1ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 8: approveActionPlan — plano_acao → aprovado | PASS | 1ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Bloco 1 — Happy Path: progressão completa cnaes_confirmados → aprovado | PASS | 1112ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Bloco 2 — Bloqueios: transições inválidas devem lançar FORBIDDEN | PASS | 5ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 9: completeOnda2 com status cnaes_confirmados → FORBIDDEN (pula onda1_solaris) | PASS | 3ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 10: approveBriefing com status onda2_iagen → FORBIDDEN (pula diagnóstico) | PASS | 1ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 11: approveMatrices com status diagnostico_cnae → FORBIDDEN (pula approveBriefing) | PASS | 1ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 12: approveActionPlan com status matriz_riscos → FORBIDDEN (pula approveMatrices) | PASS | 1ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Bloco 3 — computeCompleteness: cenários de status global | PASS | 2ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 13: empresa produto + 24 solaris + diagnóstico completo + 1 NCM → status 'completo' | PASS | 1ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 14: 0 solaris_answers + 0 iagen_answers → status 'insuficiente' | PASS | 0ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | Caso 15: 12 solaris_answers + 0 iagen_answers + QC incompleto → status 'parcial' | PASS | 1ms | 2026-05-05T14:31:56.095Z |
| e2e-fluxo-completo.test.ts | server/integration/e2e-fluxo-completo.test.ts | PASS | 1120ms | 2026-05-05T14:31:56.095Z |

## Summary

- **Pass:** 23
- **Fail:** 0
- **Skipped:** 0
- **Total:** 23
- **Started:** 2026-05-05T14:31:54.628Z
- **Finished:** 2026-05-05T14:31:56.120Z
