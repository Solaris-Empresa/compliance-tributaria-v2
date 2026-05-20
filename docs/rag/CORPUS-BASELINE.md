# CORPUS-BASELINE.md

> Documento de referência do corpus RAG SOLARIS.
> Atualizado a cada ingestão relevante. Fonte de verdade para o RAG Quality Gate.

## Versão

| Campo | Valor |
|---|---|
| Versão | **v8.0** |
| Data | 19/05/2026 |
| HEAD main | `141b0821` |
| Total chunks | **16.132** |
| Total leis | **25** |
| normative_service_rules (NBS) | **27 regras** (PR #1108) |
| normative_product_rules Cap. 23 | **5 definitivas + 1 conservador** (PRs #1108/#1110) |

---

## Corpus Completo

| Lei | Chunks | cnaeGroups | Tipo |
|---|---|---|---|
| tabela_ncm_completa | 10.030 | `''` (universal) | row-chunker NCM |
| nbs_completa | 1.237 | `''` (universal) | row-chunker NBS |
| lc214 | 1.587 | setorial (artigos 128–260) | section-chunker (pós-surgery Art. 544 — PR #1109) |
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
| **TOTAL** | **16.132** | — | — |

---

## Histórico de Versões

| Versão | Data | Chunks | Leis | Delta | Marco |
|---|---|---|---|---|---|
| v5.3 | 14/05/2026 | 3.585 | 20 | baseline | Onda 1 completa |
| v6.0 | 19/05/2026 | 4.852 | 23 | +1.267 / +3 leis | Onda 2 completa |
| v7.0 | 19/05/2026 | 16.119 | 25 | +11.267 / +2 leis | NCM/NBS row-chunker |
| **v8.0** | **19/05/2026** | **16.132** | **25** | **+13 / 0 leis** | **lc214 Art. 544 surgery (#1109) + normative_*_rules seed (#1108/#1110)** |

---

## Auditoria de Qualidade (Re-chunking)

| Lei | Veredicto | Escopo auditado | Observação |
|---|---|---|---|
| decreto12955 | ✅ **MANTER** | 100% (831 chunks) | avg 1.045 · max 2.000 · 0 outliers |
| lc214 | ✅ **SURGERY APLICADA** | parte 15 (Anexo XI) deletada + 4 oversize split em 18 sub-chunks | net +13 chunks (1.574→1.587); PR #1109 |

> Laudo completo: `docs/rag/RECHUNKING-AUDIT-lc214-decreto12955.md` (PR #1104)
> Surgery executada per laudo §4: `scripts/fix-lc214-art544-chunks.ts` (PR #1109)

---

## Regras Normativas (normative_*_rules)

| Tabela | Linhas | Origem |
|---|---|---|
| `normative_service_rules` (NBS) | **27** | curadoria jurídica 19/05/2026 (PR #1108) |
| `normative_product_rules` Cap. 23 | **5 definitivas + 1 conservador** | base: Art. 138 LC 214 + Anexo IX + Art. 213 Decreto 12.955 (PRs #1108 conservador → #1110 definitivos) |

Cap. 23 detalhe:
- ✅ `aliquota_reduzida_60`: 2304.00.10, 2306.10.00, 2302.*, 2303.*, 2309.* (Anexo IX itens 6 e 18)
- ⏸️ `tratamento_agropecuario_especifico_pendente` (conservador): 2301.* (NÃO está em Anexo IX — inconclusivo per anti-alucinação REGRA-ORQ-29)

---

## Pendências de Corpus

| Item | Status |
|---|---|
| lc214 auditoria completa (§4) | ⚠️ Aguarda query SQL Manus no TiDB prod |
| normative_product_rules — 2301.* | ⏸️ Conservador definitivo (não está em Anexo IX) |
| `rag-corpus-lcs-novas.ts` sync com surgery PR #1109 | 🟠 Tech debt — re-ingest restauraria bug (PR follow-up planejado) |
