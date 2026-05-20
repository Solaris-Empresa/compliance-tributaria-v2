# Auditoria de Qualidade — lc214 + decreto12955

Data: 2026-05-19 | Auditor: Claude Code
Métricas geradas por `scripts/audit-rechunking-lc214-decreto.ts` (determinístico, dados reais dos módulos `.ts` — não inventadas).

## Resumo Executivo

| Lei | Veredicto | Justificativa |
|---|---|---|
| **decreto12955** | **MANTER** | 831 chunks, 100% auditável. 0 chunks >2000, 0 duplicatas, 0 sem artigo, max=2000 (bem limitado). Saudável para retrieval. Único reparo opcional: 8 chunks (1,0%) <100 chars (artigos curtos legítimos — ex. "Revogado"). Não justifica re-chunking. |
| **lc214** | **MANTER (parcial) / INCONCLUSIVO p/ corpus completo** | Subconjunto de código (792 / ~1.574 = ~50%) majoritariamente saudável, mas com **1 outlier de 22.471 chars** + 8 chunks (1,0%) >2000 → re-chunking pontual recomendado para os oversized. Veredicto definitivo exige os ~782 chunks que estão só no DB (§3 — query Manus). |

## §1 — Decreto 12.955/2026 (831 chunks — auditoria completa)

### Métricas

| Métrica | Valor |
|---|---|
| Total | 831 |
| avg / mediana length | 1.045 / 909 |
| min / max length | 28 / 2.000 |
| < 100 chars | 8 (1,0%) |
| > 2000 chars | 0 (0,0%) |
| 300–800 (faixa ideal) | 260 (31,3%) |
| sem artigo | 0 |
| artigos distintos | 620 (831 chunks → ~1,34 chunk/artigo via chunkIndex) |
| duplicatas exatas | 0 |

### Distribuição de tamanho

```
<100      : ████ 8 (1,0%)
100–299   : ████████████ 108 (13,0%)
300–800   : ███████████████████████████ 260 (31,3%)  ← ideal
801–2000  : ████████████████████████████████████████████████ 455 (54,8%)
>2000     : 0 (0,0%)
```

### Achados

- ✅ **Bem limitado:** `max=2000`, 0 chunks >2000 — o chunker (corpus-chunker `splitLong`/maxChunkChars=2000) está cortando corretamente. Sem chunks gigantes que degradam retrieval.
- ✅ **Sem ruído estrutural:** 0 sem artigo, 0 duplicatas exatas.
- 🟡 **54,8% em 801–2000:** acima da faixa ideal 300–800, porém aceitável para artigos legais densos (regulamento CBS). Não compromete retrieval com re-ranking.
- 🟡 **8 chunks <100 (1,0%):** artigos curtos legítimos (revogações, remissões). Ruído marginal, não justifica re-chunking.

### Recomendação

**MANTER.** decreto12955 está dentro de parâmetros saudáveis. Nenhuma ação de re-chunking necessária. (Opcional P3, não prioritário: filtrar/fundir os 8 chunks <100 numa futura RFC de corpus — ganho marginal.)

## §2 — LC 214/2025 (~792 chunks visíveis — auditoria parcial)

### ⚠️ Escopo desta auditoria

- **Total no DB (produção):** ~1.574 chunks (baseline CORPUS-BASELINE)
- **Auditável por código:** **792** chunks (`server/rag-corpus.ts` inline: 13 + `server/rag-corpus-lcs-novas.ts`: 779) ≈ **~50%**
- **Chunks apenas no DB:** ~782 — **não auditáveis aqui** (sem acesso ao DB; autoridade Manus). Requerem a query SQL da §3.
- Toda métrica abaixo refere-se **exclusivamente ao subconjunto de 792** — NÃO extrapolável ao corpus completo.

### Métricas (escopo parcial — 792 chunks)

| Métrica | Valor (subconjunto) |
|---|---|
| Total auditado | 792 (de ~1.574) |
| avg / mediana length | 950 / 779 |
| min / max length | 59 / **22.471** ⚠️ |
| < 100 chars | 4 (0,5%) |
| > 2000 chars | 8 (1,0%) |
| 300–800 (faixa ideal) | 264 (33,3%) |
| sem artigo | 0 |
| artigos distintos | 712 |
| duplicatas exatas | 1 grupo / 2 chunks (0,3% — negligível) |
| Cobertura art. 1–127 (reforma geral) | 267 |
| Cobertura art. 128–260 (setorial) | 169 |
| Cobertura art. >260 | 356 |

### Distribuição de tamanho (subconjunto)

```
<100      : ███ 4 (0,5%)
100–299   : ████████████████ 134 (16,9%)
300–800   : █████████████████████████████████ 264 (33,3%)  ← ideal
801–2000  : ████████████████████████████████████████████████ 382 (48,2%)
>2000     : ████ 8 (1,0%)  ⚠️ inclui outlier de 22.471 chars
```

### Achados parciais (declarados como PARCIAIS — só 50% do corpus)

- 🔴 **Outlier crítico:** ao menos 1 chunk lc214 com **22.471 chars** (max). Tamanho hostil a retrieval/re-ranking (excede limites de janela útil) — candidato a split.
- 🟠 **8 chunks (1,0%) >2000:** acima do teto saudável; re-chunking pontual recomendado para os oversized.
- ✅ **Sem ruído estrutural:** 0 sem artigo, duplicatas negligíveis (2 chunks).
- 🟡 **Cobertura desbalanceada no subconjunto:** art>260=356 vs art1-127=267 — mas isto é artefato do recorte de ~50%; **não conclusivo** sobre cobertura real.

### Recomendação provisória

**MANTER (parcial) com re-chunking PONTUAL dos oversized** — split dos ~8 chunks >2000 (incl. o de 22.471) na faixa-alvo. **Não re-chunkar o corpus inteiro** sem evidência completa. Veredicto definitivo depende da §3 (Manus): se a proporção de oversized/ruído nos ~1.574 reais for similar (~1%), confirma-se "MANTER + fix pontual"; se for muito maior, reavaliar re-chunking amplo.

## §3 — Query SQL para completar auditoria lc214 (Manus)

```sql
-- Executar no TiDB prod e reportar resultados (preenche §4)
SELECT
  COUNT(*) AS total,
  ROUND(AVG(LENGTH(conteudo))) AS avg_length,
  MIN(LENGTH(conteudo)) AS min_length,
  MAX(LENGTH(conteudo)) AS max_length,
  SUM(CASE WHEN LENGTH(conteudo) < 100 THEN 1 ELSE 0 END) AS below_100,
  SUM(CASE WHEN LENGTH(conteudo) > 2000 THEN 1 ELSE 0 END) AS above_2000,
  SUM(CASE WHEN LENGTH(conteudo) BETWEEN 300 AND 800 THEN 1 ELSE 0 END) AS ideal_range,
  SUM(CASE WHEN artigo IS NULL OR artigo = '' THEN 1 ELSE 0 END) AS no_artigo
FROM ragDocuments
WHERE lei = 'lc214';

-- Complemento — top 10 maiores (identificar outliers a splitar):
SELECT id, artigo, LENGTH(conteudo) AS len
FROM ragDocuments WHERE lei = 'lc214'
ORDER BY len DESC LIMIT 10;
```

## §4 — Decisão de re-chunking (após dados completos)

> _Placeholder — preencher após Manus executar §3._
>
> Critério de decisão:
> - Se `above_2000 / total` ≲ 2% e `max_length` ≲ 3.000 → **MANTER + split pontual** dos outliers.
> - Se `above_2000 / total` ≳ 5% OU `max_length` ≳ 10.000 → **RE-CHUNKAR lc214** (estratégia proposta: alvo 300–800 chars, split por artigo→parágrafo, sem sobreposição, teto rígido 1.500).
> - `below_100` elevado (>5%) → avaliar fusão de fragmentos.

---

### Reprodutibilidade

Script commitado: `scripts/audit-rechunking-lc214-decreto.ts` (Lição #71 — scripts de evidência versionados). Re-executar: `pnpm exec tsx scripts/audit-rechunking-lc214-decreto.ts`. Métricas decreto12955 = corpus real (módulo = ingestão 1:1). Métricas lc214 = subconjunto de código (§2 escopo).
