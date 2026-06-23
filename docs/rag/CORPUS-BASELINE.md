# CORPUS-BASELINE.md

> Documento de referência do corpus RAG SOLARIS.
> Atualizado a cada ingestão relevante. Fonte de verdade para o RAG Quality Gate.

## §1 — Resumo Executivo

| Campo | Valor |
|---|---|
| Versão | **v9.1** |
| Data | 28/05/2026 |
| HEAD main | `bb8a0e1b` |
| Total chunks | **16.769** _(confirmado DB — Q2 Manus 28/05/2026)_ |
| Total leis | **25** |
| Chunks sem anchor_id | **0** |
| Chunks sem autor | **0** |
| Chunks muito curtos (<10 chars) | **0** |
| normative_product_rules | **26 regras** |
| normative_service_rules (NBS) | **27 regras** |
| risk_categories confirmed | **18** |
| risk_categories pending_vigency | **3** |
| risk_categories blocked | **1** |
| risk_categories pending_document | **1** |
| D2-DETECTOR (artigo_pai) | **5 chunks** (Art. 197) |

> **v9.1 (28/05/2026)** — Sync pós-campanha NCM + COVERAGE-SUITE-V3 + D2/D4. Confirmação de todos os números via SQL real no TiDB Cloud (REGRA-ORQ-37). Integridade 100%: zero chunks sem anchor_id, zero sem autor, zero muito curtos. Documentação de 4 gaps de curadoria (#1280–#1283) e campo `artigo_pai` (D2-DETECTOR).

---

## §2 — Inventário por Lei

| Lei | Chunks | Universais | Setoriais | Status |
|---|---|---|---|---|
| tabela_ncm_completa | 10.030 | 10.030 | 0 | ✅ row-chunker NCM |
| lc214 | 1.586 | 818 | 768 | ✅ section-chunker (pós-surgery Art. 544) |
| nbs_completa | 1.237 | 1.237 | 0 | ✅ row-chunker NBS |
| decreto12955 | 831 | 658 | 173 | ✅ section-chunker |
| resolucao_cgibs_6 | 827 | 244 | 583 | ✅ section-chunker (v9.0: Livro I+II+III) |
| lc227 | 434 | 1 | 433 | ✅ section-chunker |
| moc_mdfe_v3 | 393 | 0 | 393 | ✅ section-chunker (transporte) |
| moc_cte_v4 | 316 | 0 | 316 | ✅ section-chunker (transporte) |
| resolucao_cgsn_140 | 302 | 302 | 0 | ✅ section-chunker |
| lc123 | 279 | 279 | 0 | ✅ section-chunker |
| conv_icms | 278 | 278 | 0 | ✅ section-chunker |
| lc87 | 60 | 5 | 55 | ✅ section-chunker |
| lc116 | 60 | 60 | 0 | ✅ section-chunker |
| lc224 | 28 | 0 | 28 | ✅ section-chunker |
| cg_ibs | 26 | 26 | 0 | ✅ section-chunker |
| resolucao_cgibs_4 | 23 | 14 | 9 | ✅ section-chunker |
| ec132 | 18 | 0 | 18 | ✅ section-chunker |
| nt_2025_002 | 12 | 12 | 0 | ✅ section-chunker |
| nt_008_2026 | 10 | 0 | 10 | ✅ section-chunker (TI/serviços) |
| rfb_cbs | 7 | 7 | 0 | ✅ section-chunker |
| resolucao_cgibs_5 | 4 | 2 | 2 | ✅ section-chunker |
| resolucao_cgibs_1 | 4 | 4 | 0 | ✅ section-chunker |
| portaria_mf_cgibs_7 | 2 | 2 | 0 | ✅ section-chunker |
| resolucao_cgibs_3 | 1 | 1 | 0 | ✅ section-chunker |
| resolucao_cgibs_2 | 1 | 1 | 0 | ✅ section-chunker |
| **TOTAL** | **16.769** | **13.981** | **2.788** | — |

---

## §3 — Campos Especiais (D2-DETECTOR)

O campo `artigo_pai` é utilizado pelo D2-DETECTOR para detecção setorial de chunks que pertencem a um artigo-pai específico, permitindo injeção determinística de conteúdo normativo.

| artigo_pai | Chunks | Propósito |
|---|---|---|
| Art. 197 | 5 | Injeção determinística D1-C — máquinas agrícolas NCM 8436 + CNAE grupo 28 |

> O D2-DETECTOR foi introduzido nos PRs #1267 e #1269. O campo `artigo_pai` permite identificar chunks que são sub-artigos de um artigo principal, viabilizando a injeção contextual sem depender de busca semântica.

---

## §4 — Regras Normativas (normative_*_rules)

| Tabela | Linhas | Origem |
|---|---|---|
| `normative_product_rules` | **26** | curadoria jurídica + campanha NCM 28/05/2026 |
| `normative_service_rules` (NBS) | **27** | curadoria jurídica 19/05/2026 (PR #1108) |

---

## §5 — Gaps de Curadoria Documentados (COVERAGE-SUITE-V3)

Gaps identificados pela campanha COVERAGE-SUITE-V3 (28/05/2026), confirmados em runtime com dados reais do banco:

| Gap | Issue | Categoria Ausente | Implicação | Prioridade |
|---|---|---|---|---|
| P10 Cooperativa | #1280 | `regime_cooperativas` | Sem diferimento IBS (Arts. 271-280 LC 214) | P2 |
| P11 Transporte Carga | #1281 | `regime_diferenciado_transporte` (cnae 4930-2 ausente) | Alíquota específica não identificada (Art. 264 LC 214) | P2 |
| P12/P13 IS | #1282 | `imposto_seletivo` (não data-driven) | Tributação monofásica via hardcode (risk-eligibility-is-ncm-cnae.ts) | P3 |
| P13 SOL-050 | #1283 | `cnae_groups` SOL-050 não cobre subclasses /02+ | 12 perguntas SOLARIS (não 15) para CNAE 4635-4/02 | P2 |

> Esses gaps estão rastreados como issues no GitHub e documentados como testes de regressão em `coverage-11-profiles.test.ts` (M6). Quando corrigidos, os testes falharão automaticamente, forçando atualização dos expected values.

---

## §6 — Histórico de Versões

| Versão | Data | Chunks | Leis | Delta | Marco |
|---|---|---|---|---|---|
| v5.3 | 14/05/2026 | 3.585 | 20 | baseline | Onda 1 completa |
| v6.0 | 19/05/2026 | 4.852 | 23 | +1.267 / +3 leis | Onda 2 completa |
| v7.0 | 19/05/2026 | 16.119 | 25 | +11.267 / +2 leis | NCM/NBS row-chunker |
| v8.0 | 19/05/2026 | 16.132 | 25 | +13 / 0 leis | lc214 Art. 544 surgery (#1109) + normative_*_rules seed (#1108/#1110) |
| v8.1 | 20/05/2026 | 16.129 | 25 | −3 / 0 leis | Correção divergência moc_cte_v4 + 2 DELETEs (REGRA-ORQ-37) |
| v9.0 | 25/05/2026 | 16.769 | 25 | +640 / 0 leis | CGIBS 6 Livro I re-ingestão (CORPUS-RFC-010 / BUG-IBS-00) + chunker fix (FIX-A) |
| **v9.1** | **28/05/2026** | **16.769** | **25** | **0 / 0 leis** | **Sync pós-campanha NCM + COVERAGE-V3 + D2/D4 + normative_product_rules 26** |
| v9.2 | 23/06/2026 | 16.746 _(a confirmar Manus)_ | 25 | −23 / 0 leis | RAG-ART544 Tier1+2A — DELETE chunks Art.544 ruído (caput/signatários/duplicatas + Simples) por IDs; Art.544 46→23. Tier 3 substantivo intacto → re-tag (RAG-ART544-RETAG). #1551 |

---

## §7 — Auditoria de Qualidade

| Lei | Veredicto | Escopo auditado | Observação |
|---|---|---|---|
| decreto12955 | ✅ **MANTER** | 100% (831 chunks) | avg 1.045 · max 2.000 · 0 outliers |
| lc214 | ✅ **SURGERY APLICADA** | parte 15 (Anexo XI) deletada + 4 oversize split em 18 sub-chunks | net +13 chunks (1.574→1.587); PR #1109 |

> Laudo completo: `docs/rag/RECHUNKING-AUDIT-lc214-decreto12955.md` (PR #1104)

---

## §8 — Pendências de Corpus

| Item | Status |
|---|---|
| normative_product_rules — 2301.* | ⏸️ Conservador definitivo (não está em Anexo IX) |
| `rag-corpus-lcs-novas.ts` sync com surgery PR #1109 | 🟠 Tech debt — re-ingest restauraria bug (PR follow-up planejado) |
| **Bundles `artigos_cgibs6` (9 categorias) — Fase 3** | ⏸️ **Pendente confirmação jurídica** (Lição #61 — RACI) |
| D2-DETECTOR expansão (além Art. 197) | 🟡 Apenas 5 chunks mapeados — avaliar expansão para outros artigos setoriais |
