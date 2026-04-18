# RFC-003 — Corpus: Leis Avulsas (lc123, lc224, lc116, lc87)

**Status:** DIAGNÓSTICO CONCLUÍDO — Aguarda decisão do P.O.
**Sprint:** I (diagnóstico) → J (execução, se aprovado)
**Prioridade:** P3
**Autor:** Manus (autônomo) · 2026-03-27
**Baseline:** v1.8 · HEAD `8692751`

---

## Contexto

A issue #138 pede diagnóstico dos chunks de "leis avulsas" no corpus RAG (ids 617–779 identificados no backlog). O objetivo é decidir se esses chunks devem ser reclassificados, removidos ou mantidos.

---

## Diagnóstico executado (read-only)

### Distribuição atual do corpus

| Lei | Chunks | IDs | Status |
|---|---|---|---|
| `lc214` | 1.573 | 1–30.839 | ✅ Corpus principal |
| `lc123` | 25 | 664–722 | ⚠️ Avulso — ver análise abaixo |
| `lc224` | 28 | 780–807 | ⚠️ Avulso — ver análise abaixo |
| `lc227` | 434 | 808–1.241 | ✅ Corpus secundário (COMITÊ GESTOR IBS) |
| `ec132` | 18 | 30.840–30.857 | ✅ Corpus principal (Emenda Constitucional) |
| **Total** | **2.078** | | |

### Análise dos chunks avulsos

#### lc123 (25 chunks, ids 664–722)
- **O que é:** LC 123/2006 — Lei Geral das Micro e Pequenas Empresas (Simples Nacional)
- **Conteúdo:** Artigos sobre IBS/CBS no Simples Nacional (Art. 13-A, 18, 18-A, 25-A, 25-B, 26, 38-A, 41)
- **Relevância:** ALTA — A reforma tributária (LC 214/2025) altera diretamente o Simples Nacional. Esses artigos são referenciados em consultas de advogados sobre empresas do Simples
- **Qualidade:** Boa — artigos completos, sem fragmentação crítica. Alguns com `....` (supressão intencional de parágrafos revogados)
- **Decisão sugerida:** ✅ MANTER — são artigos relevantes da LC 123 alterados pela reforma

#### lc224 (28 chunks, ids 780–807)
- **O que é:** LC 224/2025 — Lei Complementar que regulamenta o IBS (posterior à LC 214)
- **Conteúdo:** Artigos sobre regras de transição e operacionalização do IBS
- **Relevância:** ALTA — complementa diretamente a LC 214/2025
- **Qualidade:** Boa — artigos completos
- **Decisão sugerida:** ✅ MANTER — corpus complementar essencial

### Leis ausentes no corpus (identificadas no enum do schema)

O enum `lei` no schema já inclui `lc116`, `lc87`, `cg_ibs`, `rfb_cbs` mas **nenhum chunk dessas leis existe no banco**:

| Lei | O que é | Chunks no banco |
|---|---|---|
| `lc116` | LC 116/2003 — ISS | 0 |
| `lc87` | LC 87/1996 — ICMS (Lei Kandir) | 0 |
| `cg_ibs` | Regulamentos do Comitê Gestor IBS | 0 |
| `rfb_cbs` | Instruções Normativas RFB sobre CBS | 0 |

---

## Anomalia real identificada

**id 113 — `"e"` (1 char, 89 bytes):** fragmento de ingestão da LC 214. Detectado pelo GS-07 do RAG Cockpit. Deve ser corrigido via RFC futura (P3).

---

## Recomendações

### Ação imediata (Sprint I — zero risco)
- **Nenhuma** — os chunks existentes são válidos e relevantes. Não há o que remover.

### Sprint J (se aprovado pelo P.O.)
1. **Ingestão lc116:** 50–80 artigos relevantes do ISS (impactado pela reforma)
2. **Ingestão lc87:** 30–50 artigos relevantes do ICMS (período de transição 2026–2032)
3. **Correção id 113:** DELETE do chunk `"e"` + verificação de integridade

### Sprint K (se aprovado pelo P.O.)
4. **Ingestão cg_ibs:** Resolução CGIBS 01/2025 e posteriores (quando publicadas)
5. **Ingestão rfb_cbs:** IN RFB sobre CBS (quando publicadas)

---

## Evidência JSON para PR body

```json
{
  "rfc": "RFC-003",
  "tipo": "diagnostico",
  "corpus_total": 2078,
  "leis_avulsas_analisadas": ["lc123", "lc224"],
  "decisao": "MANTER",
  "anomalia_id113": "detectada_pelo_gs07",
  "leis_ausentes": ["lc116", "lc87", "cg_ibs", "rfb_cbs"],
  "banco_tocado": false,
  "codigo_tocado": false
}
```
