# Vitest Realtime Progress

**Started:** 2026-04-20T22:33:17.118Z
**Output:** reports/battery-current/progress.md

| Arquivo | Teste | Estado | Duração | Timestamp |
|---|---|---|---|---|
| calculate-briefing-confidence.test.ts | server/lib/calculate-briefing-confidence.test.ts | PASS | 7ms | 2026-04-20T22:33:17.456Z |
| calculate-briefing-confidence.test.ts | calculateBriefingConfidence | PASS | 6ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | retorna 30 quando total == 0 (sem respostas) | PASS | 3ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | retorna 55 quando total < 5 (1-4 respostas) | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | retorna 70 quando total 5-14 | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | retorna 80 quando total 15-29 | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | retorna 85 quando total >= 30 sem NCM/NBS | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | retorna 90 quando total >= 30 com NCM cadastrado | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | retorna 90 quando total >= 30 com NBS cadastrado | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | NCM/NBS sem respostas suficientes não altera faixa (ainda depende de total) | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | valores negativos são tratados como 0 | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| calculate-briefing-confidence.test.ts | boundary: exatamente 5 → 70 · exatamente 15 → 80 · exatamente 30 → 85/90 | PASS | 0ms | 2026-04-20T22:33:17.457Z |
| consolidate-gaps.test.ts | server/lib/consolidate-gaps.test.ts | PASS | 9ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | normalizeEvidenciaKey | PASS | 5ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | extrai Art. N sem parágrafo | PASS | 3ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | extrai Art. N §M com normalização | PASS | 0ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | distingue parágrafos diferentes do mesmo artigo | PASS | 1ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | retorna vazio para input vazio/null | PASS | 0ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | consolidateGapsByArticle | PASS | 4ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | passa direto quando há 0 ou 1 gap | PASS | 1ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | não consolida gaps com artigos diferentes | PASS | 1ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | consolida 3 gaps com mesmo Art. 21 §1º em 1 gap | PASS | 1ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | preserva ordem de aparição | PASS | 0ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | não consolida quando parágrafos diferem | PASS | 0ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | gaps sem evidencia_regulatoria nunca são consolidados entre si | PASS | 0ms | 2026-04-20T22:33:17.459Z |
| consolidate-gaps.test.ts | prefere urgência imediata como primary no merge | PASS | 0ms | 2026-04-20T22:33:17.459Z |
| briefing-areas.test.ts | client/src/lib/briefing-areas.test.ts | PASS | 10ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | classifyItemByArea | PASS | 6ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | classifica fiscal por IBS/CBS/alíquota | PASS | 3ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | classifica TI por ERP/Sped/NFe | PASS | 0ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | classifica contabilidade por escrituração/fato gerador | PASS | 0ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | classifica legal por parecer/LC/Art. | PASS | 1ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | classifica gestão por fluxo de caixa/estratégia | PASS | 0ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | cai em genérico quando nenhuma keyword bate | PASS | 0ms | 2026-04-20T22:33:17.460Z |
| briefing-areas.test.ts | groupBriefingByArea | PASS | 2ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | agrupa gaps por área | PASS | 1ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | agrupa recomendações por área | PASS | 0ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | retorna buckets vazios quando structured é null | PASS | 0ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | formatWhatsAppSummary | PASS | 1ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | inclui risco no cabeçalho | PASS | 1ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | inclui resumo executivo só na área Genérica | PASS | 0ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | marca área vazia com mensagem explícita (exceto genérico) | PASS | 0ms | 2026-04-20T22:33:17.461Z |
| briefing-areas.test.ts | usa asteriscos para negrito (compatível WhatsApp) | PASS | 0ms | 2026-04-20T22:33:17.461Z |
| detect-export-signal.test.ts | server/lib/detect-export-signal.test.ts | PASS | 18ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detectExportSignal — países | PASS | 14ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta Bolívia mesmo lowercase/sem acento | PASS | 7ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta Bolívia com acento | PASS | 5ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta EUA / USA / Estados Unidos | PASS | 1ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta Argentina com pontuação | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | NÃO detecta Brasil (país-base) | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | NÃO detecta 'bolivia' dentro de palavra maior | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detectExportSignal — termos | PASS | 2ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta 'exportação' | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta 'exportamos' | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta 'mercado externo' | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta 'comércio exterior' com e sem acento | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta 'cross-border' e 'cross border' | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detecta 'importação' também (relevante para créditos) | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detectExportSignal — sufixo jurídico | PASS | 1ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | gera sufixo vazio quando não detecta | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | gera sufixo com Art. 8 quando detecta termo | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | gera sufixo com 'transfronteiriça' quando detecta país | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | combina country + term sem duplicar | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | detectExportSignal — input | PASS | 1ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | aceita array com nulls/undefined sem quebrar | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | retorna detected=false para array vazio | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | retorna detected=false para strings vazias | PASS | 0ms | 2026-04-20T22:33:17.474Z |
| detect-export-signal.test.ts | concatena múltiplos textos (description + correction + complement) | PASS | 0ms | 2026-04-20T22:33:17.474Z |

## Summary

- **Pass:** 54
- **Fail:** 0
- **Skipped:** 0
- **Total:** 54
- **Started:** 2026-04-20T22:33:17.118Z
- **Finished:** 2026-04-20T22:33:17.486Z
