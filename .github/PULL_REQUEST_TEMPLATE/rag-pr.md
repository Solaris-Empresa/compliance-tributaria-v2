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

### Arquivos de rastreabilidade atualizados

<!-- Marque todos que foram atualizados neste PR -->

- [ ] `docs/rag/CORPUS-BASELINE.md` (versão incrementada: vX.Y → vX.Z)
- [ ] `docs/rag/RAG-PROCESSO.md`
- [ ] `docs/rag/RAG-GOVERNANCE.md`
- [ ] `docs/rag/HANDOFF-RAG.md`
- [ ] `docs/rag/RAG-RESPONSABILIDADES.md`
- [ ] `docs/painel-po/RASTREABILIDADE-RAG-PO.md`
- [ ] `docs/painel-po/index.html` (Seção 7 do Cockpit)
- [ ] `skills/solaris-orquestracao/SKILL.md`
- [ ] `skills/solaris-contexto/SKILL.md`
- [ ] Nenhum — justificativa: ___

### Evidência JSON

```json
{
  "tipo": "corpus|retriever|incidente|rfc|performance|governanca",
  "lei": "lc214|lc224|ec132|lc227|lc123|outro",
  "chunks_antes": 0,
  "chunks_depois": 0,
  "corpus_baseline_versao": "vX.Y",
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
