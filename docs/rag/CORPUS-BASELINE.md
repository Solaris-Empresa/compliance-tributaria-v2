# CORPUS-BASELINE.md

> Documento de referência do corpus RAG SOLARIS.
> Atualizado a cada ingestão relevante. Fonte de verdade para o RAG Quality Gate.

## Versão

| Campo | Valor |
|---|---|
| Versão | **v8.1** |
| Data | 20/05/2026 |
| HEAD main | `44576a7` |
| Total chunks | **16.129** |
| Total leis | **25** |
| normative_service_rules (NBS) | **27 regras** (PR #1108) |
| normative_product_rules Cap. 23 | **5 definitivas + 1 conservador** (PRs #1108/#1110) |

---

## Corpus Completo

| Lei | Chunks | cnaeGroups | Tipo |
|---|---|---|---|
| tabela_ncm_completa | 10.030 | `''` (universal) | row-chunker NCM |
| nbs_completa | 1.237 | `''` (universal) | row-chunker NBS |
| lc214 | 1.586 | setorial (artigos 128–260) | section-chunker (pós-surgery Art. 544 — PR #1109; −1 chunk em v8.1 — DELETE B id=742 duplicata) |
| decreto12955 | 831 | `''` (universal) | section-chunker |
| lc227 | 434 | `''` (universal) | section-chunker |
| moc_mdfe_v3 | 393 | `"49"` (transporte) | section-chunker |
| moc_cte_v4 | 316 | `"49"` (transporte) | section-chunker (v8.1: 318→316 — correção divergência baseline −1 + DELETE A id=330243 chunk lixo CT-e §7.2 −1) |
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
| **TOTAL** | **16.129** | — | — |

---

## Histórico de Versões

| Versão | Data | Chunks | Leis | Delta | Marco |
|---|---|---|---|---|---|
| v5.3 | 14/05/2026 | 3.585 | 20 | baseline | Onda 1 completa |
| v6.0 | 19/05/2026 | 4.852 | 23 | +1.267 / +3 leis | Onda 2 completa |
| v7.0 | 19/05/2026 | 16.119 | 25 | +11.267 / +2 leis | NCM/NBS row-chunker |
| v8.0 | 19/05/2026 | 16.132 | 25 | +13 / 0 leis | lc214 Art. 544 surgery (#1109) + normative_*_rules seed (#1108/#1110) |
| **v8.1** | **20/05/2026** | **16.129** | **25** | **−3 / 0 leis** | **Correção divergência moc_cte_v4 + 2 DELETEs (REGRA-ORQ-37)** |

> **v8.1 (20/05/2026)**: corrige divergência moc_cte_v4 (318→317 era o estado real no DB antes dos DELETEs; baseline v8.0 estava over por 1) + remove 2 chunks via REGRA-ORQ-37:
> - **DELETE A** — `id=330243` (lei=`moc_cte_v4`, artigo=`Seção 7.2`, 23 chars) — chunk lixo de parsing CT-e §7.2
> - **DELETE B** — `id=742` (lei=`lc214`, artigo=`Art. 2`, 562 chars) — duplicata legado Sprint D (id=740 com mesmo conteúdo preservado)
>
> Auditoria SQL: Manus 2026-05-20 03:05 UTC. Estado final: `moc_cte_v4=316`, `lc214=1.586`, total=16.129. Aritmética: v8.0 16.132 − 1 (divergência) − 2 (DELETEs) = 16.129 ✓.

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
