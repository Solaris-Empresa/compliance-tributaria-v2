# D3-JINA — Jina Reranker não-determinístico (diagnóstico)

**Data:** 2026-05-27 · **Tipo:** diagnóstico (doc-only, sem implementação) · **Prioridade:** P2
**Origem:** dry-run v3 do bug NCM/`corpus_gap_setorial` (PR #1257, projeto 2700001)
**Vinculadas:** #1258 (D4-POOL) · #1260 (COL-CONF) · #1262 (COL-LABEL) · REGRA-ORQ-34 · Lição #67

> Este documento **apenas registra** o achado e propõe linhas de investigação.
> **Nenhuma alteração de código** é feita neste PR. A correção (se necessária) será
> uma issue separada após D4-POOL validado em produção.

## 1. Achado

No dry-run v3 (4 execuções idênticas, mesma query e mesmos 43 candidatos), o
`rerankWithJina` (`server/rag-retriever.ts:563-565`) retornou resultados **diferentes
entre execuções**:

| Execução | Saída do Jina | Input do LLM reranker | Seleção do LLM (topK=3) | Gate |
|---|---|---|---|---|
| A | **43** (não filtrou) | 43 | `Art. 4`, `Art. 12`, `8436.99.00` | DISPARA |
| B1 | **43** (não filtrou) | 43 | `Art. 4`, `Art. 12`, `8436.99.00` | DISPARA |
| B2 | **43** (não filtrou) | 43 | `Art. 4`, `Art. 12`, `8436.99.00` | DISPARA |
| B3 | **10** (filtrou) | 10 | `Art. 139`, `8436.99.00`, `Art. 620 (parte 67)` | NÃO dispara |

`isJinaRerankerEnabled() = true` em todas. Ou seja: com a mesma entrada, o Jina ora
filtra (43→10), ora não (43→43) — **comportamento não-determinístico**.

## 2. Mecanismo provável

`rerankWithJina` "NUNCA lança; em qualquer falha devolve `candidates` inalterado"
(comentário em `rag-retriever.ts:559-562`, degradação graciosa — Lição #67). Quando
a chamada à API Jina externa falha (timeout, rate limit, indisponibilidade), a função
retorna os 43 candidatos **sem filtrar**. Quando responde, retorna ≤20 (aqui, 10).

Portanto a intermitência do bug `corpus_gap_setorial` em produção é governada pela
**disponibilidade/latência da API Jina**, não por dados do projeto:

```
Jina falha/timeout → retorna 43 → LLM recebe pool ruidoso → escolhe Parte Geral
                                   (Art. 4/12) → F=0 → gate DISPARA
Jina responde      → retorna 10 → LLM recebe pool limpo → escolhe Art. 620/139
                                   → F=1 → gate NÃO dispara (por acaso)
```

## 3. Inversão de expectativa

O Jina foi introduzido (CORPUS-RFC-007) como **melhoria de qualidade** opcional. Na
prática, neste caso, ele é o **único mecanismo que faz o gate passar** — e de forma
não-determinística. O sistema "funciona por acidente quando o Jina funciona" e
"falha (corretamente) quando o Jina falha".

> **Importante:** o D4-POOL (#1258) ataca a causa que torna isso visível — sem a Parte
> Geral inundando o pool, o reranker recebe um pool já limpo **independente do Jina**.
> Após D4-POOL, a dependência do Jina deixa de ser o fator determinante do gate. D3-JINA
> permanece como dívida de **robustez/observabilidade**, não como bloqueador do bug.

## 4. Linhas de investigação (issue futura, P2)

1. **Observabilidade:** instrumentar `rerankWithJina` para registrar (audit_log) cada
   degradação graciosa — distinguir timeout vs rate-limit vs erro de rede vs sucesso.
   Hoje a falha é silenciosa (Lição #67), o que esconde a taxa real de degradação.
2. **Taxa de falha real:** medir, em produção, com que frequência o Jina degrada
   (a amostra do dry-run sugere ~75%, mas N=4 não é representativo).
3. **Config:** confirmar `JINA_RERANKER_ENABLED` e a saúde/rate-limit da chave em
   produção. Avaliar se o timeout configurado é compatível com a latência do Jina.
4. **Decisão de design:** quando o Jina degrada, devolver os 43 **sem ordenação** é o
   comportamento certo? Alternativa: degradar para um **pré-filtro determinístico**
   (ex.: ordenação por relevância/`ORDER BY` no pool — alinhado ao D1-RETRIEVAL) em
   vez de entregar o pool bruto ao LLM.

## 5. Não-implementar (escopo deste doc)

- Nenhuma mudança em `rerankWithJina` ou na configuração do Jina neste PR.
- A correção de robustez fica condicionada à validação do D4-POOL em produção e a uma
  issue própria (P2), priorizada pelo P.O.
