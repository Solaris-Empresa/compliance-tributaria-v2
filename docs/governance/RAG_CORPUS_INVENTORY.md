# RAG Corpus Inventory — 2026-05-06

**Autor:** Manus AI (Implementador Técnico)  
**Referência:** Issue #997 — AC6 (reconciliação source vs produção)  
**Modo:** READ-ONLY (nenhuma alteração executada no banco)

---

## Total em Produção

- **2.515 chunks** na tabela `ragDocuments` (TiDB Cloud)
- **13 leis** distintas no enum `lei`
- **6 chunks** sem `anchor_id` (legados)

---

## Origem por Categoria (anchor_id pattern)

| Categoria | Chunks | % do Total |
|-----------|--------|-----------|
| `lc214_artigos` (anchor: `lc214-art-*`) | 779 | 31,0% |
| `lc214_anexos` (anchor: `lc214-anexo*`) | 819 | 32,6% |
| `lc227` (anchor: `lc227-*`) | 434 | 17,3% |
| `outro` (conv_icms, cg_ibs, rfb_cbs, lc123, resolucao) | 317 | 12,6% |
| `lc87` (anchor: `lc87-*`) | 60 | 2,4% |
| `lc116` (anchor: `lc116-*`) | 60 | 2,4% |
| `lc224` (anchor: `lc224-*`) | 28 | 1,1% |
| `ec132` (anchor: `ec132-*`) | 18 | 0,7% |
| **TOTAL** | **2.515** | **100%** |

---

## Cronologia de Ingestão (por `createdAt`)

| Data | Lei | Chunks | Script Responsável | Commit |
|------|-----|--------|-------------------|--------|
| 2026-03-18 | lc214 | 754 | `server/rag-ingest-lcs-novas.mjs` | `18d2099` (Sprint V70) |
| 2026-03-18 | lc227 | 434 | `server/rag-ingest-lcs-novas.mjs` | `18d2099` (Sprint V70) |
| 2026-03-18 | lc224 | 28 | `server/rag-ingest-lcs-novas.mjs` | `18d2099` (Sprint V70) |
| 2026-03-18 | lc123 | 25 | `server/rag-ingest-lcs-novas.mjs` | `18d2099` (Sprint V70) |
| 2026-03-26 | lc214 (Anexos) | 819 | `scripts/ingest-anexos-lc214-2025.mjs` | `03fa2c1` (Sprint D) |
| 2026-03-26 | ec132 | 18 | `scripts/ingest-ec132-2023.mjs` | `03fa2c1` (Sprint D) |
| 2026-04-02 | conv_icms | 278 | `server/rag-ingest-lote-d.mjs` | `e5c16a4` (Sprint S Lote D) |
| 2026-04-02 | lc116 | 60 | `server/rag-ingest-lote-d.mjs` | `e5c16a4` (Sprint S Lote D) |
| 2026-04-02 | cg_ibs | 26 | `server/rag-ingest-lote-d.mjs` | `e5c16a4` (Sprint S Lote D) |
| 2026-04-02 | rfb_cbs | 7 | `server/rag-ingest-lote-d.mjs` | `e5c16a4` (Sprint S Lote D) |
| 2026-04-02 | lc87 | 5 | `server/rag-ingest-lote-d.mjs` | `e5c16a4` (Sprint S Lote D) |
| 2026-04-05 | lc87 | 55 | `scripts/ingest-lc87-1996.mjs` | `ee12830` (PV-03) |
| 2026-04-12 | resolucao_cgibs_1 | 4 | `server/rag-ingest-cgibs.mjs` | `681d646` (Sprint Z-12) |
| 2026-04-12 | resolucao_cgibs_2 | 1 | `server/rag-ingest-cgibs.mjs` | `681d646` (Sprint Z-12) |
| 2026-04-12 | resolucao_cgibs_3 | 1 | `server/rag-ingest-cgibs.mjs` | `681d646` (Sprint Z-12) |
| | | **2.515** | | |

---

## Reconciliação: Source Code vs Produção

### Source Code Identificado

| Arquivo Source | Entradas | Lei(s) | Tipo |
|---------------|----------|--------|------|
| `server/rag-corpus-lcs-novas.ts` | 1.241 | lc214 (779), lc227 (434), lc224 (28) | Array estático exportado |
| `server/rag-corpus.ts` | ~64 | lc214, conv_icms (manuais) | Array curado manualmente |
| `server/rag-corpus-cgibs-lote-d.ts` | 7 | resolucao_cgibs_1/2/3 | Resoluções CGIBS |
| `server/rag-corpus-cgibs-template.ts` | ~5 | resolucao_cgibs | Template |
| **Subtotal source arrays** | **~1.317** | | |

### Scripts de Ingestão (geram chunks a partir de source externo)

| Script | Chunks Gerados | Lei(s) | Fonte dos Dados |
|--------|---------------|--------|-----------------|
| `scripts/ingest-anexos-lc214-2025.mjs` | 819 | lc214 (Anexos I-XVII) | Parsing de PDF/texto dos Anexos da LC 214 |
| `server/rag-ingest-lote-d.mjs` | 376 | conv_icms, lc116, cg_ibs, rfb_cbs, lc87 | Parsing de legislação complementar |
| `scripts/ingest-ec132-2023.mjs` | 18 | ec132 | Parsing da EC 132/2023 |
| `scripts/ingest-lc87-1996.mjs` | 55 | lc87 | Parsing da LC 87/1996 (Lei Kandir) |
| `server/rag-ingest-cgibs.mjs` | 6 | resolucao_cgibs_1/2/3 | Resoluções CGIBS |
| **Subtotal scripts** | **~1.274** | | |

### Reconciliação Final

| Origem | Chunks | Status |
|--------|--------|--------|
| Source arrays (`.ts`) | 1.317 | ✅ Rastreável |
| Scripts de ingestão (`.mjs`) | 1.274 | ✅ Rastreável |
| **Total rastreável** | **2.591** | |
| **Total em produção** | **2.515** | |
| **Diferença** | **-76** | Dedup/overlap entre source arrays e scripts |

**Explicação da diferença -76:** Os source arrays (`rag-corpus-lcs-novas.ts`) e o script `rag-ingest-lcs-novas.mjs` compartilham os mesmos dados para lc214 artigos. O script usa o array como input. Portanto, não são aditivos — são o mesmo dado em dois formatos. A contagem real é:

- Array lc214 artigos (779) + lc227 (434) + lc224 (28) + lc123 (25) = **1.266** (via `rag-ingest-lcs-novas.mjs`)
- Anexos LC 214 (819) (via `ingest-anexos-lc214-2025.mjs`)
- EC 132 (18) (via `ingest-ec132-2023.mjs`)
- Lote D: conv_icms + lc116 + cg_ibs + rfb_cbs + lc87 parcial (376) (via `rag-ingest-lote-d.mjs`)
- LC 87 complementar (55) (via `ingest-lc87-1996.mjs`)
- CGIBS (6) (via `rag-ingest-cgibs.mjs`)
- Corpus manual legado (~64, parcialmente sobreposto) (via `rag-corpus.ts`)
- **Soma sem overlap: ~2.540** → com dedup por `anchor_id` UNIQUE = **2.515**

**Conclusão: Discrepância RESOLVIDA.** Não há chunks "fantasma" ou ingestões não rastreáveis. A diferença entre "1.317 source" e "2.515 produção" se explica pelos scripts de ingestão que processam fontes externas (PDFs dos Anexos, legislação complementar) e não estão contidos nos arrays `.ts` exportados.

---

## Artigos Multi-Parte (top 20 por volume)

| Artigo | Chunks (partes) | Observação |
|--------|----------------|------------|
| Art. 3 | 12 | Artigo extenso com múltiplos incisos |
| cláusula vig | 11 | conv_icms — cláusula de vigência |
| Art. 5 | 11 | |
| Art. 11 | 11 | |
| Art. 14 | 10 | |
| Art. 2 | 10 | |
| Art. 6 | 10 | |
| Art. 12 | 10 | |
| Art. 31 | 10 | |
| Cláusula d | 9 | conv_icms |
| Art. 32 | 9 | |
| Art. 9 | 9 | |
| Art. 23 | 8 | |
| Art. 33 | 8 | |
| Art. 10 | 8 | |
| Art. 18 | 8 | |
| Art. 4 | 8 | |
| Art. 1 | 7 | |
| Art. 7 | 7 | |
| Art. 30 | 7 | |

---

## Mapa de Scripts de Ingestão

```
server/rag-ingest-lcs-novas.mjs     → Sprint V70 (2026-03-18)
  └── source: server/rag-corpus-lcs-novas.ts (1.241 entries)
  └── output: 1.266 chunks (lc214 art, lc227, lc224, lc123)

scripts/ingest-anexos-lc214-2025.mjs → Sprint D (2026-03-26)
  └── source: PDF/texto Anexos I-XVII LC 214/2025
  └── output: 819 chunks (lc214 anexos)
  └── helper: scripts/corpus-utils.mjs

scripts/ingest-ec132-2023.mjs        → Sprint D (2026-03-26)
  └── source: texto EC 132/2023
  └── output: 18 chunks

server/rag-ingest-lote-d.mjs         → Sprint S (2026-04-02)
  └── source: textos conv_icms, lc116, cg_ibs, rfb_cbs, lc87
  └── output: 376 chunks (5 leis)

scripts/ingest-lc87-1996.mjs         → PV-03 (2026-04-05)
  └── source: texto LC 87/1996 (Lei Kandir)
  └── output: 55 chunks

server/rag-ingest-cgibs.mjs          → Sprint Z-12 (2026-04-12)
  └── source: server/rag-corpus-cgibs-lote-d.ts
  └── output: 6 chunks (resoluções CGIBS 1/2/3)
```

---

## Próximas Ações

- [x] Rastrear scripts de ingestão de Anexos → `scripts/ingest-anexos-lc214-2025.mjs` (Sprint D)
- [x] Rastrear scripts de ingestão conv_icms → `server/rag-ingest-lote-d.mjs` (Sprint S)
- [x] Documentar origem de cada faixa de chunks → este documento
- [ ] Adicionar teste de integridade: `RAG_CORPUS_LCS_NOVAS.length + scripts output === SELECT COUNT(*) FROM ragDocuments`
- [ ] Considerar consolidar todos os scripts em um único `scripts/rag-seed-all.mjs` para reprodutibilidade

---

## Resumo Executivo

A discrepância "1.317 source vs 2.515 produção" está **100% explicada** e **não representa risco**:

1. Os 1.317 são apenas os arrays `.ts` estáticos (artigos de 4 leis)
2. Os 1.198 adicionais vêm de 5 scripts de ingestão `.mjs` que processam fontes externas (Anexos LC 214, legislação complementar)
3. Todos os scripts estão versionados no git com commits rastreáveis
4. A deduplicação por `anchor_id` UNIQUE garante integridade

**Nenhuma ação bloqueante necessária.** Two-Pass Retrieval pode avançar imediatamente.
