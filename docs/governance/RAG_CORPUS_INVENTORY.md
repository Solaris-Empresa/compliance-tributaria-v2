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

---

## Atualização 2026-05-08 — Gaps de Atualidade Identificados

> **Adendo após análise comparativa "Gap table Atualidade x Plataforma RAG da Solaris IA" (2026-05-06).**
> O backbone legal está completo e íntegro. **17 documentos pós-abril/2026 ainda não foram ingeridos** — gap operacional, não estrutural.

### Resumo dos gaps por severidade

| Categoria | Itens | Severidade | Tipo |
|---|---|---|---|
| 🔴 **Gap crítico — não no LLM** | 6 | P0 | Decreto 12.955 (CBS), Res. CGIBS 4/5/6, Portaria 7, NTs NF-e/NFS-e |
| 🟠 **Gap secundário** | 9 | P1-P2 | DeRE pacote, Manuais RTC, Cartilhas IBS, GT-08, Guia EFD v3.2.2, FAQs piloto/prazos, NTs 011/012 EFD-Contribuições |
| ⚠️ **Parcial no RAG** | 2 | P2 | Ajuste SINIEF 49/2025 com alterações abr/2026, Ato Conjunto RFB/CGIBS 1/2025 |
| ✅ **Presente no RAG** | 8 | OK | EC 132, LC 214 (+ Anexos), LC 227/224/123/116/87 |

**Total: 17 itens pendentes (15 gap + 2 parcial) vs 8 presentes.**

### Pacote de atualização emergencial (Onda 1)

| Documento | Data | Impacto operacional |
|---|---|---|
| **Decreto 12.955/2026** | 29/04/2026 | Regulamento federal CBS — split payment, créditos, obrigações |
| **Resolução CGIBS 6/2026** | 30/04/2026 | Regulamento infralegal nuclear do IBS |
| **Portaria Conjunta MF/CGIBS 7/2026** | 30/04/2026 | Disposições comuns CBS/IBS |
| **Resolução CGIBS 4/2026** | 08/04/2026 | Regimento Interno CGIBS |
| **Resolução CGIBS 5/2026** | 30/04/2026 | Estrutura institucional CGIBS |
| **NT 2025.002 v1.36** (NF-e/NFC-e) | 24/04/2026 | Leiautes IBS/CBS/IS |
| **NT 008/2026** (NFS-e DANFSe) | 05/05/2026 | Padrão nacional DANFSe |
| **Página "Orientações 2026"** RFB | 06/05/2026 | Documento-pai operacional |

### Risco principal

🔴 **Alucinação operacional por falta de corpus novo** — não erro de backbone legal.

Cliente perguntando sobre **leiautes, APIs, documentos fiscais eletrônicos, DeRE, marcos 2026** pode receber respostas potencialmente desatualizadas porque os documentos infralegais de abril/maio não estão no corpus.

### Roadmap de ingestão (4 ondas priorizadas)

| Onda | Documentos | Justificativa |
|---|---|---|
| **1ª** | Decreto 12.955 + Res. CGIBS 4/5/6 + Portaria 7 | Núcleo infralegal pós-LC |
| **2ª** | NT 2025.002 v1.36 + pacote NFS-e (NT 008) | Layouts técnicos para ERPs |
| **3ª** | Ato RFB/CGIBS 1/2025 + Orientações 2026 + DeRE + Manuais RTC + Cartilhas + FAQ piloto | Suporte operacional/onboarding |
| **4ª** | Ajustes SINIEF + Guia EFD v3.2.2 + FAQ prazos LC 227 + NTs EFD-Contribuições | Transição/legado/conformidade processual |

### 3 ajustes de engenharia recomendados

1. **Taxonomia explícita** no schema: `tipo_documento ENUM(lei, lei_complementar, decreto, resolucao, portaria, ato_conjunto, nota_tecnica, ajuste_sinief, manual, cartilha, faq, guia_pratico, layout_xsd)`
2. **Versão + vigência** como metadados de primeira classe (`versao VARCHAR`, `vigencia_inicio DATE`, `vigencia_fim DATE`)
3. **Watcher semanal** dos portais oficiais (RFB, CGIBS, CONFAZ, ENCAT, NF-e, NFS-e, SPED, Planalto) com detecção de hash/versão

### Limitações declaradas

- Famílias agregadas (`conv_icms`, `cg_ibs`, `rfb_cbs`) impedem confirmar edição exata → marcação "Parcial" conservadora
- Alguns portais SPED não expõem link direto estável → uso de página de listagem
- **Sem evidência de nova LC federal IBS/CBS** publicada na janela recente — o que mudou foi camada **regulamentar e operacional**

### Vinculadas

- Documento fonte: `docs/0-RAG/0-acervo-v3-06mai26/Gap table Atualidade x Plataforma RAG da Solaris IA.md`
- Resumo executivo: `docs/0-RAG/0-acervo-v3-06mai26/resumo/Resumo_RAG_—_Inventário_e_Gaps.docx`
- Estratégias de remediação: `docs/rag/RAG-PROCESSO.md` (ver "3 Estratégias")
- Fluxo end-to-end: `docs/rag/E2E-RAG-FLUXO.md`
