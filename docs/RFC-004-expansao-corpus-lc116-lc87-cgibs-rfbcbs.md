# RFC-004 — Expansão do Corpus RAG: lc116, lc87, cg_ibs, rfb_cbs

**Issue:** #142 · **Sprint:** K+ · **Prioridade:** P3
**Data:** 2026-03-27
**Status:** Aguarda aprovação do P.O. e revisão jurídica

---

## 1. Diagnóstico (read-only)

### Leis com enum disponível mas zero chunks no corpus

| Lei | Chunks atuais | Descrição | Impacto estimado |
|---|---|---|---|
| `lc116` | 0 | LC 116/2003 — ISS | Prestadores de serviço (todos os CNAEs de serviço) |
| `lc87` | 0 | LC 87/1996 — ICMS (Lei Kandir) | Exportadores, operações interestaduais |
| `cg_ibs` | 0 | Regulamento CGIBS | Todas as empresas — transição IBS |
| `rfb_cbs` | 0 | Regulamento CBS/RFB | Todas as empresas — transição CBS |
| `conv_icms` | 0 | Convênios ICMS | Operações com ICMS |

**Total de leis com enum mas sem corpus:** 5

### Corpus atual para referência

| Lei | Chunks | Cobertura |
|---|---|---|
| `lc214` | 1.573 | ✅ Corpus principal |
| `lc227` | 434 | ✅ Corpus secundário |
| `lc224` | 28 | ✅ Corpus complementar |
| `lc123` | 25 | ✅ Simples Nacional |
| `ec132` | 18 | ✅ Emenda Constitucional |

---

## 2. Sequência de prioridade sugerida

Conforme análise de impacto e dependências:

1. **`cg_ibs`** — Regulamento do Comitê Gestor IBS: afeta todas as empresas na transição. Maior urgência regulatória.
2. **`rfb_cbs`** — Regulamento CBS/RFB: afeta todas as empresas. Complementa `cg_ibs`.
3. **`lc87`** — Lei Kandir (ICMS): afeta exportadores e operações interestaduais. Contexto de transição ICMS → IBS.
4. **`lc116`** — ISS: afeta prestadores de serviço. Contexto de transição ISS → CBS.
5. **`conv_icms`** — Convênios ICMS: menor urgência, dependente de `lc87`.

---

## 3. Processo de ingestão (P-02)

Para cada lei, seguir o processo completo:

### Etapa 1 — Obter texto oficial
- Fonte primária: [planalto.gov.br](https://www.planalto.gov.br)
- Fonte secundária: [senado.leg.br](https://www.senado.leg.br)
- Verificar versão consolidada mais recente

### Etapa 2 — Definir gold set antes da ingestão
- Mínimo 5 queries de validação por lei
- Incluir: contagem de chunks, artigos-chave, anomalias

### Etapa 3 — Abrir RFC de ingestão
- RFC separada por lei (RFC-004a para cg_ibs, RFC-004b para rfb_cbs, etc.)
- Revisão jurídica obrigatória antes de executar

### Etapa 4 — Revisão jurídica
- Validar que o texto ingerido é a versão vigente
- Confirmar que não há conflito com corpus existente

### Etapa 5 — Executar script de ingestão
```bash
node scripts/ingest-corpus.mjs --lei=cg_ibs --source=path/to/cg_ibs.txt
```

### Etapa 6 — Validar gold set pós-ingestão
- Executar queries do gold set definido na Etapa 2
- Verificar `anchor_id` 100% preenchido
- Verificar zero anomalias (GS-07: `LENGTH(conteudo) < 10`)

### Etapa 7 — Atualizar CORPUS-BASELINE.md
- Registrar: lei, data de ingestão, número de chunks, versão do texto

---

## 4. Estimativa de esforço

| Lei | Artigos estimados | Chunks estimados | Esforço |
|---|---|---|---|
| `cg_ibs` | ~200 | ~400–600 | 1 sprint |
| `rfb_cbs` | ~150 | ~300–450 | 1 sprint |
| `lc87` | ~50 | ~100–150 | 0.5 sprint |
| `lc116` | ~100 | ~200–300 | 0.5 sprint |

---

## 5. Bloqueios identificados

1. **Texto oficial `cg_ibs` e `rfb_cbs`:** Os regulamentos do CGIBS e da RFB para IBS/CBS ainda estão em elaboração (previsão: 2026). Ingestão só possível após publicação oficial.
2. **Revisão jurídica:** Cada lei requer revisão por advogado especialista antes da ingestão.
3. **Aprovação do P.O.:** Sequência de prioridade deve ser aprovada pelo P.O. antes de iniciar.

---

## 6. Decisão necessária do P.O.

- [ ] Aprovar sequência de prioridade (cg_ibs → rfb_cbs → lc87 → lc116)
- [ ] Confirmar se `cg_ibs` e `rfb_cbs` já têm texto oficial disponível
- [ ] Designar responsável pela revisão jurídica
- [ ] Definir sprint de início (K ou posterior)

---

**Esta RFC não pode ser executada sem aprovação do P.O. e revisão jurídica.**
