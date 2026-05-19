# CORPUS-BASELINE.md

> Documento de referência do corpus RAG SOLARIS.
> Atualizado a cada ingestão relevante. Fonte de verdade para o RAG Quality Gate.

## Versão

| Campo | Valor |
|---|---|
| Versão | **v7.0** |
| Data | 19/05/2026 |
| HEAD main | `ebf952b5` |
| Total chunks | **16.119** |
| Total leis | **25** |

---

## Corpus Completo

| Lei | Chunks | cnaeGroups | Tipo |
|---|---|---|---|
| tabela_ncm_completa | 10.030 | `''` (universal) | row-chunker NCM |
| nbs_completa | 1.237 | `''` (universal) | row-chunker NBS |
| lc214 | 1.574 | setorial (artigos 128–260) | section-chunker |
| decreto12955 | 831 | `''` (universal) | section-chunker |
| lc227 | 434 | `''` (universal) | section-chunker |
| moc_mdfe_v3 | 393 | `"49"` (transporte) | section-chunker |
| moc_cte_v4 | 318 | `"49"` (transporte) | section-chunker |
| resolucao_cgsn_140 | 302 | `''` (universal) | section-chunker |
| lc123 | 279 | `''` (universal) | section-chunker |
| conv_icms | 278 | `''` (universal) | section-chunker |
| resolucao_cgibs_6 | 187 | setorial | section-chunker |
| lc116 | 60 | `''` (universal) | section-chunker |
| lc87 | 60 | `''` (universal) | section-chunker |
| lc224 | 28 | `''` (universal) | section-chunker |
| cg_ibs | 26 | `''` (universal) | section-chunker |
| resolucao_cgibs_4 | 23 | setorial | section-chunker |
| ec132 | 18 | `''` (universal) | section-chunker |
| nt_2025_002 | 12 | `''` (universal) | section-chunker |
| nt_008_2026 | 10 | `"62,63,..."` (TI/serviços) | section-chunker |
| rfb_cbs | 7 | `''` (universal) | section-chunker |
| resolucao_cgibs_1 | 4 | setorial | section-chunker |
| resolucao_cgibs_5 | 4 | setorial | section-chunker |
| portaria_mf_cgibs_7 | 2 | `''` (universal) | section-chunker |
| resolucao_cgibs_3 | 1 | setorial | section-chunker |
| resolucao_cgibs_2 | 1 | setorial | section-chunker |
| **TOTAL** | **16.119** | — | — |

---

## Histórico de Versões

| Versão | Data | Chunks | Leis | Delta | Marco |
|---|---|---|---|---|---|
| v5.3 | 14/05/2026 | 3.585 | 20 | baseline | Onda 1 completa |
| v6.0 | 19/05/2026 | 4.852 | 23 | +1.267 / +3 leis | Onda 2 completa (MOC + lc123 + cgsn_140) |
| **v7.0** | **19/05/2026** | **16.119** | **25** | **+11.267 / +2 leis** | **NCM/NBS row-chunker (tabela_ncm_completa + nbs_completa)** |

---

## Auditoria de Qualidade (Re-chunking)

| Lei | Veredicto | Escopo auditado | Observação |
|---|---|---|---|
| decreto12955 | ✅ **MANTER** | 100% (831 chunks) | avg 1.045 · max 2.000 · 0 outliers · 0 sem artigo |
| lc214 | ⚠️ **INCONCLUSIVO** (parcial: MANTER) | ~50% (792/1.574) | max 22.904 (1 outlier) · 17 >2.000 (1,08%) · query §4 pendente Manus |

> Laudo completo: `docs/rag/RECHUNKING-AUDIT-lc214-decreto12955.md` (PR #1104)

---

## Pendências de Corpus

| Item | Status |
|---|---|
| lc214 auditoria completa (§4) | ⚠️ Aguarda query SQL Manus no TiDB prod |
| normative_service_rules (seed NBS) | ⏳ Aguarda curadoria jurídica |
| normative_product_rules Cap. 23 (NCMs soja) | ⏳ Aguarda parecer jurídico |
