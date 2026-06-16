# SPEC RERANKER-NCM-AWARE-01 — Reranker NCM-aware (defense-in-depth semântico)

**Issue:** #1468 · **Classe:** C (cross-cutting + ADR) · **Status:** 🟡 Draft — aguarda aprovação do P.O. + escolha de opção
**Criado:** 16/06/2026 · **Despacho:** v34 · **Autor:** Claude Code (RACI R)

> **Nota de path (Gate 0 / REGRA-ORQ-45):** o despacho v34 indicou `docs/governance/specs/`, que não existe. Specs do projeto vivem em `docs/specs/` (REGRA-ORQ-16). Path corrigido + naming `SPEC-*-v1.md` consistente com `SPEC-1028-*`, `SPEC-COCKPIT-*`.

---

## 1. AS-IS (com citações — REGRA-ORQ-27)

### Pipeline de retrieval atual

`server/rag-retriever.ts:631` `retrieveArticles(cnaes, contextQuery, topK, leiFilter, …)`:

```
Pass1 genérico (fetchCandidates, LIMIT 20)            :650
Pass2 setorial CNAE-aware (fetchSetorialCandidates)   :655
Pass3 NCM-targeted (fetchNcmCandidates, extrai NCM    :660
       do contextQuery via LIKE)
  → mergeAndDedup (até ~55 candidatos)                :663
  → filterByCnaeRelevance (FIX #1276, membership      :673
       estrito por cnaeGroups)
  → [opcional] exclui Parte Geral LC214 (Q.NCM)       :675
  → rerankWithJina(contextQuery, candidates, 20)      :688   (se JINA_RERANKER_ENABLED)
  → rerankWithLLM(prerankedCandidates, contextQuery)  :692   (GPT-4.1)
```

### O gap

O **NCM do usuário já está no `contextQuery`** (Pass3 o extrai por regex). Mas a relevância final é decidida por **similaridade semântica** (Jina cross-encoder em `server/lib/jina-reranker.ts` → depois `rerankWithLLM` GPT-4.1). **Não há sinal explícito de aderência ao NCM** no scoring. Após o filtro determinístico por CNAE (#1276) e a curadoria de `cnaeGroups` (Lição #133), um artigo **semanticamente próximo do query mas NCM-irrelevante** ainda pode subir no ranking — é a camada que #1276/#1451 (filtragem por CNAE) **não** cobrem.

### Evidência

- **Estática (verificada):** comentários em `rag-retriever.ts:322,670-672` documentam o caso Art.139 (cultural, `cnaeGroups="41,42,43,68"`) / Art.128 (saúde) afogando o reranker para NCM 8436 — origem de #1276.
- **Runtime (PENDENTE Manus — não fabricar, Lição #87):** quais artigos de fato sobem no top-K para NCM 8436 (CNAE 28) **após** #1276 em produção. Requer query a `rag_usage_log` / regeneração observável. Sem essa evidência, a magnitude do risco residual é hipótese fundamentada, não fato medido.

---

## 2. TO-BE — 3 opções (P.O. escolhe)

> **Correção técnica (Gate 0):** a Opção A do despacho ("prompt injection no Jina") é **imprecisa** — o **Jina reranker é um cross-encoder** (recebe `query, documents` → scores), **não aceita instrução em prompt**. "Prompt injection" só se aplica ao estágio **`rerankWithLLM` (GPT-4.1)**. As opções abaixo refletem isso.

### Opção A — Reforço de aderência NCM no prompt do `rerankWithLLM` (Classe B · risco baixo)
Adicionar ao prompt do GPT-4.1 reranker (`rerankWithLLM`, `rag-retriever.ts:521`): "priorize chunks que mencionem explicitamente o NCM `{ncm}` ou o produto `{produto}`; penalize chunks de setores não relacionados."
- ✅ Cirúrgico, reversível, não toca Jina nem schema.
- ⚠️ Não-determinístico (LLM pode ignorar); temperatura ≤ 0.1 (REGRA-ORQ-30).

### Opção B — Score boost determinístico pós-rerank (Classe B/C · risco médio)
Após o rerank, multiplicador de score para chunks que contêm o NCM literal (ou prefixo) no `conteudo`/`topicos`.
- ✅ Determinístico, auditável.
- ⚠️ Muitos artigos são genéricos e **não citam o NCM no texto** → boost não dispara (cai no comportamento atual). Cobre bem chunks Anexo/NCM-específicos, mal os artigos de regime.

### Opção C — Filtro pré-rerank por setor do NCM (Classe C · risco alto)
Mapear NCM→setor antes do Jina, excluindo chunks de setores não relacionados.
- ✅ Reduz o pool ruidoso na origem.
- ⚠️ Exige **novo metadado NCM→setor/CNAE** mantido (acoplamento — Lição #88) e arrisca ocultar artigo legítimo (mesma classe de risco da curadoria de `cnaeGroups`). Maior superfície.

### Recomendação técnica (P.O. decide — REGRA-ORQ-33)
**Opção A** como 1º passo (menor risco, reversível, ataca o estágio certo — o LLM reranker que já recebe o `contextQuery` com o NCM), com **Opção B** como reforço determinístico opcional. **Opção C** só se A+B forem insuficientes na evidência de runtime, por exigir novo metadado.

---

## 3. ADR necessário

**ADR-0036 — Reranker NCM-aware:** registrar a opção escolhida, o estágio do pipeline afetado (`rerankWithLLM` vs Jina vs pré-filtro), o trade-off determinismo × cobertura, e o impacto no contrato de `retrieveArticles`. Bump: MINOR (extensão de comportamento, sem quebra de assinatura) — confirmar no impact-tree (REGRA-ORQ-41).

---

## 4. Test contracts (antes de implementar — REGRA-ORQ-28)

Para NCM 8436 (CNAE 28, máquinas agrícolas):
- `it.todo` Art.140 **NÃO** no top-3 (comunicação institucional — irrelevante ao NCM)
- `it.todo` Art.139 **NÃO** no top-3 (cultural)
- `it.todo` Art.197 **DEVE** estar no top-3 (legítimo p/ CNAE 28) — anti-regressão
- `it.todo` anti-regressão: para NCM de produto cultural, Art.139 **DEVE** aparecer (não penalizar globalmente)
- `it.todo` degradação graciosa: falha do reranker NCM-aware → fallback ao comportamento atual (Lição #67)

> DoD deve usar **critério negativo** (REGRA-ORQ-44/34-P3): a remoção de Art.140 do top-3 não pode derrubar artigo legítimo de outro NCM.

## 5. DoD

```text
- ADR-0036 mergeado + opção escolhida pelo P.O.
- Test contracts (seção 4) convertidos de it.todo → it() e PASS
- Evidência de runtime (Manus): top-K para NCM 8436 antes/depois
- tsc --noEmit → 0 erros · feature-flag para rollout seguro
```

## Vinculadas

- Issue #1468 · related #1276 / #1451 (filtragem CNAE — distintos: este é relevância semântica) · #1436 (group-aware)
- `server/rag-retriever.ts:631-692` · `server/lib/jina-reranker.ts` · `rerankWithLLM:521`
- REGRA-ORQ-27 (consumo) · REGRA-ORQ-28 (triade) · REGRA-ORQ-30 (temperatura) · REGRA-ORQ-41 (impact-tree) · REGRA-ORQ-44 (DoD negativo) · Lições #67/#87/#88
- Curadoria de `cnaeGroups` (Lição #133) é **independente** — o reranker é defense-in-depth válido mesmo após a curadoria.
