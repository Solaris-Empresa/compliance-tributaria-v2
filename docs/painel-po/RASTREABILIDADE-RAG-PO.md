# Rastreabilidade do RAG — Documento P.O.

> **Projeto:** IA SOLARIS — Compliance Tributária  
> **Repositório:** [Solaris-Empresa/compliance-tributaria-v2](https://github.com/Solaris-Empresa/compliance-tributaria-v2)  
> **Versão:** v1.1 — 2026-04-04  
> **Autor:** Manus (implementador técnico) — revisão P.O.: Uires Tapajós  
> **Status:** ✅ Governança ativa no `main`

---

## 1. O que é o RAG e por que ele precisa de rastreabilidade

O **RAG** (Retrieval-Augmented Generation) é o componente do IA SOLARIS responsável por fundamentar o diagnóstico tributário na legislação vigente. Quando o sistema gera um diagnóstico para um escritório de advocacia, ele não inventa as referências legais — ele as recupera de um corpus de 2.509 chunks extraídos de 10 leis da Reforma Tributária (LC 214/2024, LC 224/2025, EC 132/2023, LC 227/2021, LC 123/2006, LC 87/1996, LC 116/2003, CG-IBS, RFB-CBS e Conv. ICMS).

A rastreabilidade do RAG é necessária porque qualquer falha neste componente tem impacto direto na qualidade jurídica do produto. Um chunk desatualizado, uma lei mal classificada ou uma falha de recuperação pode resultar em um diagnóstico incorreto entregue a um advogado. Por isso, toda alteração no corpus, no pipeline de recuperação, ou na arquitetura do RAG deve ser rastreável do commit até o cockpit.

---

## 2. Arquitetura do RAG — visão P.O.

O RAG do IA SOLARIS é composto por três camadas:

| Camada | Componente | Responsabilidade |
|---|---|---|
| **Corpus** | Tabela `ragDocuments` (TiDB Cloud) | Armazena 2.509 chunks de 10 leis tributárias com metadados de lei, artigo, tópicos e CNAE |
| **Retriever** | `server/rag-retriever.ts` | Recupera os chunks mais relevantes para o contexto do cliente |
| **Gerador** | `routers-fluxo-v3.ts` → GPT-4.1 | Usa os chunks recuperados para fundamentar o diagnóstico |

O pipeline de recuperação funciona em dois modos:

**Modo completo (`retrieveArticles`):** extrai keywords do contexto → busca candidatos por LIKE nos tópicos → re-ranking com LLM para selecionar os mais relevantes. Usado para diagnósticos completos.

**Modo rápido (`retrieveArticlesFast`):** mesma extração de keywords, mas sem re-ranking — retorna os top-K candidatos diretamente. Usado quando latência é crítica.

---

## 3. Sistema de labels GitHub — governança RAG

### 3.1 As 6 labels criadas

Em 2026-03-30, foram criadas 6 labels no repositório para classificar toda issue, PR, RFC e incidente relacionado ao RAG. Estas labels cobrem o ciclo de vida completo do componente.

| Label | Cor | Finalidade |
|---|---|---|
| `rag:corpus` | 🩵 `#0E7490` | Ingestão, chunks, embeddings, versionamento de corpus |
| `rag:retriever` | 🔵 `#0369A1` | Pipeline de recuperação: retrieveArticles, re-ranking, keywords |
| `rag:incidente` | 🔴 `#DC2626` | Incidentes: falhas de recuperação, qualidade, hallucination |
| `rag:rfc` | 🟣 `#7C3AED` | RFC: propostas de mudança arquitetural ou de corpus |
| `rag:performance` | 🟠 `#D97706` | Performance: latência, rate limit, cache, otimizações |
| `rag:governanca` | 🟢 `#16A34A` | Governança: rastreabilidade, auditoria, versionamento |

### 3.2 Protocolo por tipo de evento

Cada tipo de evento RAG tem um protocolo específico de rastreabilidade:

| Tipo de evento | Label obrigatória | Protocolo |
|---|---|---|
| **Nova funcionalidade** | `rag:retriever` ou `rag:corpus` | PR com escopo declarado + contagem de chunks antes/depois |
| **Alteração de corpus** | `rag:corpus` | PR com: lei afetada, chunks removidos, chunks adicionados, anchor_ids |
| **RFC** | `rag:rfc` | Issue com proposta + aprovação do P.O. antes de qualquer implementação |
| **Incidente** | `rag:incidente` | Issue aberta imediatamente com: sintoma, impacto, reprodução, workaround |
| **Otimização de performance** | `rag:performance` | PR com: métrica antes (ms), métrica depois (ms), método de medição |
| **Governança / auditoria** | `rag:governanca` | PR com: o que mudou na governança, impacto na rastreabilidade |

### 3.3 Aplicação automática via GitHub Actions

O workflow `.github/workflows/label-governance.yml` (ativo desde PR #222) detecta automaticamente issues e PRs RAG pelas seguintes keywords:

| Label aplicada | Keywords que disparam |
|---|---|
| `rag:corpus` | "corpus", "chunks", "ingestão", "anchor_id", "ragDocuments", "uploadCsv", "lc214", "lc224", "ec132" |
| `rag:retriever` | "retrieveArticles", "retrieveArticlesFast", "fetchCandidates", "rerankWithLLM", "extractKeywords", "rag-retriever" |
| `rag:incidente` | "incidente", "falha rag", "hallucination", "recuperação falhou", "corpus desatualizado" |
| `rag:rfc` | "RFC-", "rfc:", "proposta de mudança", "mudança arquitetural" |
| `rag:performance` | "latência rag", "rate limit", "cache rag", "otimização rag", "timeout rag" |
| `rag:governanca` | "governança rag", "auditoria rag", "versionamento corpus", "rastreabilidade rag" |

---

## 4. Histórico de PRs RAG — rastreabilidade retroativa

Os PRs abaixo formam o histórico completo de implementação do RAG no projeto, organizados por sprint:

| PR | Sprint | Título | Tipo | Data |
|---|---|---|---|---|
| #104 | Pré-sprint | AS-IS v1.1 Final — base formal para sprints RAG | docs | 2026-03-26 |
| #105 | Sprint A | G1/G2 labels + G5/G6 corpus (LC 224 01/04/2026) | fix | 2026-03-26 |
| #106 | Sprint B | G8 companyProfile + G7 RAG por área | fix | 2026-03-26 |
| #108 | Sprint C | G9 Zod schema + G10 fonte_risco | feat | 2026-03-26 |
| #109 | Sprint D | DEC-002 schema + G4 Anexos LC214 + G3 EC132 | feat | 2026-03-26 |
| #110 | Sprint E | G11 fundamentação auditável por item de risco | feat | 2026-03-26 |
| #122 | Sprint F | CORPUS-BASELINE v1.0 + RFC-001 + RFC-002 | docs | 2026-03-26 |
| #123 | Sprint F | RAG Cockpit — painel de governança do corpus | feat | 2026-03-26 |
| #126 | Sprint G | RFC-001 + RFC-002 executadas — Sprint G encerrada | fix | 2026-03-27 |
| #129 | Sprint G | RAG Cockpit — estado real pós-Sprint G | fix | 2026-03-27 |
| #130 | Sprint G | RAG-PROCESSO + RAG-RESPONSABILIDADES + HANDOFF | docs | 2026-03-27 |
| #131 | Sprint H | ragInventory tRPC endpoint — cockpit ao vivo | feat | 2026-03-27 |
| #132 | Sprint H | RAG Cockpit ao vivo — tRPC ragInventory | feat | 2026-03-27 |
| #141 | Sprint H | 5 testes para ragAdmin.uploadCsv | test | 2026-03-27 |
| #147 | Sprint H | RAG Cockpit v2 — Sprint H enriquecida, UAT | feat | 2026-03-27 |

### 4.1 Issues RAG abertas (backlog ativo)

| Issue | Título | Label sugerida |
|---|---|---|
| #128 | Inventário automático do corpus — alimentar RAG Cockpit | `rag:corpus` + `rag:governanca` |
| #189 | RFC-003 — Reclassificação chunks leis avulsas (faixa 617–) | `rag:rfc` + `rag:corpus` |
| #190 | N8N-F1 — Monitoramento RAG agendado (Fase 1) | `rag:performance` + `rag:governanca` |
| #191 | G16 — Upload CSV SOLARIS para corpus RAG | `rag:corpus` |
| #193 | Expansão corpus — lc116, lc87, cg_ibs, rfb_cbs | `rag:corpus` |

---

## 5. Schema da tabela `ragDocuments`

A tabela `ragDocuments` é o coração do corpus RAG. Cada linha representa um chunk de legislação tributária.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int (PK) | Identificador auto-incremental |
| `anchor_id` | varchar(255) UNIQUE | Chave canônica de deduplicação — determinístico (DEC-002, Sprint D) |
| `lei` | enum | Lei de origem: `lc214`, `lc224`, `ec132`, `lc227`, `lc116`, `lc87`, `cg_ibs`, `rfb_cbs`, `conv_icms`, `lc123` |
| `artigo` | varchar(300) | Referência do artigo (ampliado de 100→300 chars na Sprint D) |
| `titulo` | varchar(500) | Título do chunk |
| `conteudo` | text | Texto completo do chunk |
| `topicos` | text | Palavras-chave para busca FULLTEXT |
| `cnaeGroups` | varchar(500) | Grupos de CNAE para filtro por setor |
| `chunkIndex` | int | Índice do chunk dentro do artigo |
| `autor` | text | Autor da curadoria (nullable — DEC-002) |
| `revisado_por` | text | Revisor do chunk (nullable — DEC-002) |
| `data_revisao` | varchar(30) | Data de revisão ISO 8601 (nullable — DEC-002) |
| `createdAt` | timestamp | Data de criação |

**Estado atual do corpus:** 2.509 chunks — 100% com `anchor_id` preenchido. 10 leis ativas (Sprint S, 2026-04-04).

**Distribuição por lei:**

| Lei | Descrição | Chunks (estimado) |
|---|---|---|
| `lc214` | LC 214/2024 — IBS e CBS | ~800 |
| `lc224` | LC 224/2025 — Comitê Gestor IBS | ~400 |
| `ec132` | EC 132/2023 — Reforma Constitucional | ~350 |
| `lc227` | LC 227/2024 — Complementações | ~200 |
| `lc87` | LC 87/1996 — ICMS | ~100 |
| `lc116` | LC 116/2003 — ISS | ~80 |
| `lc123` | LC 123/2006 — Simples Nacional | ~148 |
| `cg_ibs` | Regulamento CG-IBS | ~60 |
| `rfb_cbs` | Regulamento RFB-CBS | ~60 |
| `conv_icms` | Convênios ICMS | ~60 |

---

## 6. Pipeline de recuperação — rastreabilidade técnica

O arquivo `server/rag-retriever.ts` implementa o pipeline completo. Cada função é rastreável por PR:

```
Contexto do cliente (CNAE + texto do diagnóstico)
    │
    ├── extractCnaeGroups(cnaes)
    │       → normaliza CNAEs para grupos de busca
    │
    ├── extractKeywords(contextQuery)
    │       → extrai termos relevantes do contexto
    │
    ├── fetchCandidates(cnaes, keywords, topK)
    │       → busca LIKE nos campos topicos + cnaeGroups
    │       → retorna até topK candidatos
    │
    ├── [modo completo] rerankWithLLM(candidates, query)
    │       → LLM seleciona os mais relevantes
    │       → retorna RetrievedArticle[]
    │
    └── formatContextText(articles)
            → formata para injeção no prompt do diagnóstico
```

---

## 7. Cadeia de rastreabilidade completa

```
Evento RAG (nova funcionalidade / alteração / RFC / incidente)
    │
    ├── Issue aberta com label rag:xxx
    │       └── GitHub Actions aplica label automaticamente
    │
    ├── PR implementado com:
    │       ├── Escopo declarado (apenas arquivos RAG)
    │       ├── Evidência JSON (chunks antes/depois, testes)
    │       └── Labels rag:xxx aplicadas antes do review
    │
    ├── Merge no main
    │       └── Cockpit P.O. Seção 7 atualiza na próxima visita
    │
    └── Cockpit P.O. — Seção 7 RAG
            ├── 7A — Estado do corpus (chunks por lei — vivo via tRPC)
            ├── 7B — Issues/PRs RAG por label (vivo via API GitHub)
            └── 7C — Backlog RAG (issues abertas + RFC pendentes)
```

---

## 8. Critérios de aceite do P.O. para governança RAG

| # | Critério | Status |
|---|---|---|
| RAG-01 | 6 labels RAG criadas no repositório | ✅ Feito |
| RAG-02 | GitHub Actions detecta keywords RAG e aplica labels automaticamente | ✅ Feito |
| RAG-03 | Skills `solaris-orquestracao` e `solaris-contexto` registram labels RAG como regra permanente | ✅ Feito |
| RAG-04 | Protocolo por tipo de evento (funcionalidade / corpus / RFC / incidente / performance / governança) documentado | ✅ Feito |
| RAG-05 | Histórico de 15 PRs RAG (Sprints A–H) documentado com rastreabilidade retroativa | ✅ Feito |
| RAG-06 | 5 issues RAG abertas identificadas e com labels sugeridas | ✅ Feito |
| RAG-07 | Schema completo da tabela `ragDocuments` documentado | ✅ Feito |
| RAG-08 | Pipeline de recuperação documentado com cadeia de funções | ✅ Feito |
| RAG-09 | Cockpit P.O. Seção 7 implementada com informações vivas | ⏳ Sprint atual |
| RAG-10 | Documento P.O. de rastreabilidade RAG disponível no repositório | ✅ Este documento |

---

## 9. O que muda para o P.O. a partir de agora

**Incidentes têm protocolo claro.** Qualquer falha de recuperação, hallucination ou corpus desatualizado deve ser registrada como issue com label `rag:incidente`. O Cockpit P.O. exibirá incidentes abertos em destaque na Seção 7.

**RFCs são rastreáveis.** Toda proposta de mudança arquitetural no RAG (ex: RFC-003 — reclassificação de chunks) deve ser registrada como issue com label `rag:rfc` e aprovada pelo P.O. antes de qualquer implementação. O histórico de RFCs (RFC-001, RFC-002 executadas; RFC-003 pendente) estará visível no cockpit.

**Corpus tem versão.** Cada alteração no corpus (ingestão de nova lei, reclassificação de chunks, expansão) deve registrar a contagem anterior e a nova no PR. O cockpit exibirá a evolução do corpus ao longo do tempo.

**Governança automática.** O GitHub Actions garante que nenhum PR ou issue RAG fique sem classificação, mesmo que o desenvolvedor esqueça de aplicar a label manualmente.

---

## 10. Histórico de decisões de governança RAG

| Data | Decisão | Impacto |
|---|---|---|
| 2026-03-26 | DEC-002 (Sprint D): campo `anchor_id` para deduplicação determinística | Corpus auditável e sem duplicatas |
| 2026-03-26 | RFC-001: reclassificação de chunks por lei | Corpus organizado por fonte legal |
| 2026-03-26 | RFC-002: expansão do campo `artigo` de 100→300 chars | Suporte a NCMs com descrição longa |
| 2026-03-27 | ragInventory tRPC endpoint (PR #131) | Cockpit RAG com dados ao vivo |
| 2026-03-27 | RAG-PROCESSO + RAG-RESPONSABILIDADES documentados (PR #130) | Governança formal do corpus |
| 2026-03-30 | 6 labels RAG criadas no repositório | Rastreabilidade por tipo de evento |
| 2026-03-30 | GitHub Actions atualizado com keywords RAG | Governança automática sem intervenção |
| 2026-03-30 | Skills atualizadas com regras RAG | Propagação para sessões futuras |
| 2026-03-30 | RFC-003 identificada como pendente (Issue #189) | Aguarda aprovação do P.O. |
| 2026-04-04 | Sprint S: 5 novas leis ingeridas (2.454 chunks, 10 leis) | RFC-003 e RFC-004 executadas |
| 2026-04-04 | Fix iagen: `isNonCompliantAnswer` substitui `confidence_score` (PR #295) | Gaps `source=iagen` gerados corretamente |
| 2026-04-05 | Sprint T Pré-M1: Skill v4.1, CODEOWNERS 15 entradas, 3 CI gates, CNT-01a/01b/02/03 | Governança reforçada, contratos M1 canônicos |
| 2026-04-05 | Milestone 1: ncm-engine + nbs-engine + engine-gap-analyzer (PRs #311–#315) | `source='engine'` ativo, 5/6 casos validados, gate triplo aprovado |
| 2026-04-05 | Sprint V Lote 1 (PR #328): +10 casos NCM/NBS → 16 confirmados | NCM:9 · NBS:7 · Testes:26/26 |
| 2026-04-05 | Sprint V Lote 2 (PR #330): +8 casos NCM/NBS → 24 confirmados | NCM:12 · NBS:12 · Testes:34/34 · Correção S-07 (Arts.234-235) |

---

*Documento gerado em 2026-03-30. Atualizado em 2026-04-05 (Sprint V — Lote 2: 24 casos NCM/NBS confirmados, PR #330). Pelo implementador técnico Manus. Aprovado pelo P.O. Uires Tapajós. Fonte de verdade: [ESTADO-ATUAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ESTADO-ATUAL.md) e [BASELINE-PRODUTO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md).*
