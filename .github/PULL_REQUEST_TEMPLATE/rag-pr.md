## PR RAG — Rastreabilidade e Governança

### Tipo de mudança RAG

- [ ] `rag:corpus` — ingestão, chunks, embeddings, versionamento
- [ ] `rag:retriever` — retrieveArticles, re-ranking, keywords
- [ ] `rag:incidente` — falha, hallucination, corpus desatualizado
- [ ] `rag:rfc` — proposta de mudança arquitetural
- [ ] `rag:performance` — latência, rate limit, cache
- [ ] `rag:governanca` — auditoria, rastreabilidade, documentação

### Descrição

> O que este PR faz e por quê.

### Issue associada

Closes #

---

## Gate RAG — Evidências de Qualidade

> **Obrigatório** se este PR tocar corpus, chunking, embeddings, retrieval, ragAdmin,
> scripts de ingestão, leis, anexos ou `ragDocuments`.
> Referência completa: `docs/governance/RAG-QUALITY-GATE.md`

### RAG-Q1 — Estrutural

- [ ] Executei a query de integridade estrutural
- [ ] `anchor_id` 100% preenchido (0 chunks sem anchor_id)
- [ ] 0 chunks vazios
- [ ] 0 duplicatas críticas (hash idêntico)

### RAG-Q2 — Recuperação (Gold Set)

- [ ] Executei o gold set completo (8 queries críticas mínimas)
- [ ] Recall top-5 ≥ 90%
- [ ] Recall top-10 = 100% nas queries críticas
- [ ] Não houve regressão em relação ao baseline anterior

### RAG-Q3 — Visibilidade

- [ ] Verifiquei chunks invisíveis
- [ ] Chunks invisíveis críticos = 0
- [ ] Relatório de invisibilidade anexado

### RAG-Q4 — Explicabilidade

- [ ] Queries usadas documentadas abaixo
- [ ] Chunks esperados e recuperados documentados
- [ ] Divergências (se houver) explicadas

### Resultado consolidado

| Métrica | Valor |
|---|---|
| Chunks afetados | |
| Chunks sem `anchor_id` | |
| Duplicatas críticas | |
| Recall top-5 | |
| Recall top-10 | |
| Invisíveis críticos | |
| Conclusão | sem regressão / com regressão |

> **Artefato de evidência:** `artifacts/rag-quality/<pr-number>/report.md`

---

### Arquivos de rastreabilidade atualizados

<!-- Marque todos que foram atualizados neste PR -->

- [ ] `docs/rag/CORPUS-BASELINE.md` (versão incrementada: vX.Y → vX.Z)
- [ ] `docs/rag/RAG-PROCESSO.md`
- [ ] `docs/rag/RAG-GOVERNANCE.md`
- [ ] `docs/rag/HANDOFF-RAG.md`
- [ ] `docs/rag/RAG-RESPONSABILIDADES.md`
- [ ] `docs/painel-po/RASTREABILIDADE-RAG-PO.md`
- [ ] `docs/painel-po/index.html` (Seção 7 do Cockpit)
- [ ] `docs/skills/SKILL-ORQUESTRACAO.md`
- [ ] `docs/skills/SKILL-CONTEXTO.md`
- [ ] Nenhum — justificativa: ___

### Evidência JSON

```json
{
  "tipo": "corpus|retriever|incidente|rfc|performance|governanca",
  "lei": "lc214|lc224|ec132|lc227|lc123|outro",
  "chunks_antes": 0,
  "chunks_depois": 0,
  "recall_top5": "0%",
  "recall_top10": "0%",
  "invisíveis_críticos": 0,
  "duplicatas_críticas": 0,
  "corpus_baseline_versao": "vX.Y",
  "rag_quality_gate": "PASSOU|BLOQUEADO",
  "cockpit_auditado": true,
  "pr_relacionado": "#000"
}
```

### Auditoria do Cockpit P.O.

- [ ] Seção 7A (barras de corpus) reflete os novos totais
- [ ] Seção 7B (rastreabilidade viva) exibe este PR
- [ ] Seção 7D (documentos) carrega versão atualizada
- [ ] Status global ✅/⚠️/✖ está correto

### Checklist obrigatório

- [ ] Labels `rag:*` aplicadas a este PR
- [ ] Testes passando (`pnpm test`)
- [ ] Sem DROP COLUMN sem aprovação do P.O.
- [ ] CORPUS-BASELINE.md versionado (se corpus mudou)
- [ ] Skill atualizada (se processo/governança mudou)
- [ ] `artifacts/rag-quality/<pr>/report.md` criado e anexado
