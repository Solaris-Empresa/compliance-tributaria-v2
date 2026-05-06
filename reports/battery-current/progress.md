# Vitest Realtime Progress

**Started:** 2026-05-06T09:55:23.395Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| m3-fase1-completeness.test.ts | server/integration/m3-fase1-completeness.test.ts | PASS | 11ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | inferCompanyType | PASS | 5ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 1. operationType='produto' → 'produto' | PASS | 2ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 2. operationType='servico' → 'servico' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 3. operationType='misto' → 'misto' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 4. operationProfile null + CNAE 4632 → 'produto' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 5. operationProfile null + CNAE 8599 → 'servico' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | suporte defensivo: operationType='product' (inglês) → 'produto' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | suporte defensivo: operationType='service' (inglês) → 'servico' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | suporte defensivo: operationType='mixed' (inglês) → 'misto' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | operationType='industria' → 'produto' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | fallback conservador: operationProfile null + sem CNAEs → 'misto' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | agronegocio → 'misto' (não 'servico') | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | financeiro → 'servico' (regressão — não afetado pelo fix do agronegocio) | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | evaluateSourceStatus | PASS | 2ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 6. SOLARIS: 0 respostas → 'nao_iniciado' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 7. SOLARIS: 12 respostas → 'suficiente' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 8. SOLARIS: 24 respostas → 'completo' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 9. NCM: companyType='servico' → 'nao_aplicavel' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | 10. NCM: companyType='produto', 1 código → 'completo' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | SOLARIS: 1 resposta → 'iniciado' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | IAGEN: 0 respostas → 'nao_iniciado' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | IAGEN: 3 respostas → 'completo' | PASS | 0ms | 2026-05-06T09:55:23.766Z |
| m3-fase1-completeness.test.ts | CORPORATE: diagnosticStatus null → 'nao_iniciado' | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | CORPORATE: completed → 'completo' | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | NBS: companyType='produto' → 'nao_aplicavel' | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | computeCompleteness | PASS | 2ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | 11. zero respostas em todas as fontes → 'insuficiente' | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | 12. SOLARIS suficiente, resto nao_iniciado → 'parcial' | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | 13. todas fontes suficientes, NCM nao_aplicavel (serviço) → 'completo' | PASS | 1ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | 14. todas fontes suficientes, NCM aplicável mas 0 códigos → 'parcial' | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | 15. todas fontes suficientes, NCM e NBS preenchidos (misto) → 'completo' | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | partiality_reasons | PASS | 1ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | 16. empresa de produto sem NCM → reasons inclui texto sobre NCM | PASS | 0ms | 2026-05-06T09:55:23.767Z |
| m3-fase1-completeness.test.ts | 17. SOLARIS não iniciado → reasons inclui texto sobre SOLARIS | PASS | 0ms | 2026-05-06T09:55:23.767Z |

## Summary

- **Pass:** 30
- **Fail:** 0
- **Skipped:** 0
- **Total:** 30
- **Started:** 2026-05-06T09:55:23.395Z
- **Finished:** 2026-05-06T09:55:23.781Z
