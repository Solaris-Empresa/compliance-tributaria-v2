# E2E RAG — Fluxo End-to-End do Pipeline de Conhecimento

**Versão:** v1.0 — 2026-05-08
**Autor:** Claude Code (orquestrador) com base em análise empírica Manus
**Aprovação:** Uires Tapajós (P.O.)
**Status:** documento vivo — atualizar a cada mudança no pipeline

---

## Objetivo

Documentar o fluxo end-to-end do RAG (Retrieval-Augmented Generation) no IA SOLARIS — desde o ingestão de documentos jurídicos até a entrega de perguntas regulatórias rastreáveis ao cliente final. Este documento serve como **mapa operacional** para diagnosticar bugs, planejar evoluções e auditar conformidade jurídica.

---

## 1. Visão geral — 5 estágios do pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  E1 — INGESTÃO       │  E2 — STORAGE     │  E3 — RETRIEVAL      │
│  PDF/HTML → chunks   │  TiDB Cloud       │  Query → top-K       │
│  + embeddings        │  ragDocuments     │  chunks relevantes   │
└─────────────────────────────────────────────────────────────────┘
                                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  E4 — GENERATION                                                 │
│  Chunks + Prompt → LLM → Perguntas com source_reference          │
└─────────────────────────────────────────────────────────────────┘
                                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  E5 — DELIVERY                                                   │
│  Cache (questionnaireQuestionsCache) → Frontend (QuestionarioV3) │
│  → Cliente responde → Briefing/Riscos                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. E1 — Ingestão (corpus building)

### 2.1 Atores e responsabilidades

| Ator | Responsabilidade |
|---|---|
| Manus AI | Operação dos scripts de ingestão, validação empírica do corpus em produção |
| Claude Code | Implementação de novos scripts de ingestão e refactor de pipeline |
| Equipe SOLARIS jurídica | Curadoria e aprovação de chunks (futuro — REGRA-ORQ-29) |

### 2.2 Fluxo técnico atual

```
1. Documento source (PDF, HTML, texto)
2. Script .mjs específico (server/rag-ingest-*.mjs ou scripts/ingest-*.mjs)
   ├── parsing/extração de texto
   ├── chunking hierárquico (livro → título → cap → seção → artigo → §)
   ├── geração de anchor_id único
   ├── chamada OpenAI embedding API
   └── INSERT em ragDocuments
3. UNIQUE constraint anchor_id rejeita duplicatas
```

### 2.3 Scripts de ingestão (rastreabilidade source-to-production)

| Script | Sprint | Documentos | Chunks gerados |
|---|---|---|---|
| `server/rag-ingest-lcs-novas.mjs` | V70 (2026-03-18) | LC 214/227/224/123 (artigos) | 1.241 |
| `scripts/ingest-anexos-lc214-2025.mjs` | D (2026-03-26) | LC 214 — Anexos I-XVII | 819 |
| `scripts/ingest-ec132-2023.mjs` | D (2026-03-26) | EC 132/2023 | 18 |
| `server/rag-ingest-lote-d.mjs` | S Lote D (2026-04-02) | conv_icms, lc116, cg_ibs, rfb_cbs, lc87 | 376 |
| `scripts/ingest-lc87-1996.mjs` | PV-03 (2026-04-05) | LC 87 (Lei Kandir) | 55 |
| `server/rag-ingest-cgibs.mjs` | Z-12 (2026-04-12) | Resoluções CGIBS 1/2/3 | 6 |

Ver detalhes em `docs/governance/RAG_CORPUS_INVENTORY.md` (inventário 2026-05-06).

### 2.4 Estado atual e gaps

🔴 Empírico (Manus 2026-05-06): **2.515 chunks ativos** (após dedup `anchor_id` UNIQUE).

⚠️ Gap: **17 documentos pós-abr/2026 ainda não ingeridos** — Decreto 12.955 (CBS), Resoluções CGIBS 4/5/6, Portaria Conjunta 7, NTs NF-e/NFS-e, Orientações 2026, DeRE, Manuais RTC, Cartilhas IBS, EFD-Contribuições. Detalhes em `docs/0-RAG/0-acervo-v3-06mai26/Gap table Atualidade x Plataforma RAG da Solaris IA.md`.

---

## 3. E2 — Storage (TiDB Cloud)

### 3.1 Schema

Tabela: `ragDocuments` (Drizzle ORM em `drizzle/schema.ts`)

Campos críticos:

| Campo | Tipo | Função |
|---|---|---|
| `id` | INT auto-increment | Primary key |
| `anchor_id` | VARCHAR UNIQUE | Identificador determinístico (formato `<lei>-art-<n>` ou `<lei>-anexo-<x>`) |
| `lei` | ENUM | 13 leis ativas (lc214, lc227, lc224, lc123, lc116, lc87, ec132, conv_icms, cg_ibs, rfb_cbs, resolucao_cgibs_1/2/3) |
| `artigo` | VARCHAR | Identificação do artigo (ex: "Art. 9", "Art. 4 §2") |
| `conteudo` | TEXT | Texto bruto do chunk |
| `topicos` | JSON array | Tags semânticas para retrieval |
| `cnaeGroups` | JSON array | Prefixos CNAE (ex: `["46","47"]`) ou NULL = universal |
| `embedding` | vector | OpenAI embedding (text-embedding-3-small ou similar) |
| `createdAt` | TIMESTAMP | Cronologia de ingestão |

### 3.2 Constraints e integridade

- `UNIQUE(anchor_id)` — impede duplicação
- Sem `ON DELETE CASCADE` — chunks órfãos precisam DELETE explícito (ver REGRA-ORQ-34)

---

## 4. E3 — Retrieval

### 4.1 Função principal

`server/rag-retriever.ts`:

| Função | Quando usar | Comportamento |
|---|---|---|
| `retrieveArticles()` | Diagnóstico completo (briefing, matriz) | Keywords → candidatos por LIKE → **re-ranking via LLM** → top-K |
| `retrieveArticlesFast()` | Geração de perguntas Q.CNAE | Keywords → candidatos por LIKE → **top-K direto, sem re-ranking** |

### 4.2 Query atual de fetchCandidates (filtro CNAE)

```sql
WHERE (cnaeGroups LIKE '46,%' OR cnaeGroups LIKE '%,46,%' OR ...
       OR LENGTH(cnaeGroups) < 50)  -- ← fallback universal
```

🔴 Empírico (Manus 2026-05-06): fallback `LENGTH < 50` retorna **1.882 chunks genéricos** para qualquer CNAE consultado.

### 4.3 Cobertura RAG por CNAE (2026-05-06)

| Prefixo CNAE | Chunks específicos | Fallback acessível | Total efetivo |
|---|---|---|---|
| 46 (comércio atacadista) | 486 | +1.882 | 2.296 |
| 49 (transporte) | 501 | +1.882 | 2.381 |
| 82 (serviços admin) | varia | +1.882 | ~2.381 |
| Qualquer CNAE | 0 mínimo | 1.882 | ≥1.882 |

⚠️ **Implicação:** gate `hasGap` (RAG=0 + SOLARIS=0) é dead branch — fallback genérico cobre qualquer CNAE.

---

## 5. E4 — Generation (Q.CNAE)

### 5.1 Procedure backend

`server/routers-fluxo-v3.ts:627-743` — `generateQuestions`

### 5.2 Pipeline completo (pós-PR #1030 — Issue #1028 Opção C)

```
Input: { projectId, cnaeCode, cnaeDescription, level, ... }
   ↓
1. retrieveArticlesFast(cnaeCode, query, 5)
   → Retorna top-5 chunks regulatórios
   ↓
2. Gate hasGap (linha 679):
   if (ragArticlesCount === 0 && onda1ForGapCheck.length === 0)
      → return { questions: [], hasGap: true }
   ↓
3. Prompt LLM:
   - REGRAS: fonte SEMPRE "regulatorio" (M2 Issue #1028)
   - source_reference OBRIGATÓRIO
   - Se RAG insuficiente → retornar []
   ↓
4. invokeLLM (temperature: 0.1, REGRA-ORQ-30)
   ↓
5. M3 Filter (linha 734-742):
   validQuestions = result.questions.filter(q =>
     q.fonte === "regulatorio" &&
     q.source_reference?.trim().length > 0
   )
   ↓
6. Return { questions: validQuestions, hasGap: false }
   ↓ (sem injectOnda1IntoQuestions — M1 Issue #1028)
7. Frontend (QuestionarioV3.tsx:452):
   saveQuestionsCacheMutation → INSERT em questionnaireQuestionsCache
```

### 5.3 Garantias de qualidade (REGRA-ORQ-29 enforce)

| Camada | Garantia | Onde |
|---|---|---|
| Prompt | LLM instruído a usar SEMPRE `regulatorio` | M2 |
| Schema Zod | `fonte` ∈ {regulatorio, solaris, ia_gen} | `ai-schemas.ts:146` |
| Filter pós-LLM | Rejeita `fonte != regulatorio` ou `source_ref vazio` | M3 |
| UNIQUE cache | `anchor_id` impede duplicação no DB | TiDB |

🔴 Empírico (Manus 2026-05-08, projeto 4800062): **10 perguntas regulatório, 0% ia_gen, 0% solaris, 100% com source_reference válido**.

---

## 6. E5 — Delivery (UI → Cliente)

### 6.1 Renderização frontend

`client/src/pages/QuestionarioV3.tsx`:

```
1. Mount → useEffect auto-start (Issue #1028 FASE 1 + Issue #1031 fix)
2. handleStartCnae(cnaes[0]) → loadQuestions
3. generateQuestions.mutateAsync → backend
4. setQuestions(result.questions)
5. saveQuestionsCacheMutation → DB
6. UI exibe perguntas com tag "Legislação"
```

### 6.2 Persistência de respostas

```
1. Cliente clica "Sim/Não/Parcialmente"
2. saveAnswer (questionnaireAnswersV3) — fire-and-forget
3. Briefing posterior consome respostas + cache de perguntas
```

### 6.3 Estado pós-Issue #1028 + #1031

✅ Pipeline E1→E5 funcional para CNAEs com cobertura RAG (incluindo fallback genérico).
✅ Auto-start serial elimina race condition multi-CNAE (PR #1032).
⚠️ V3 banner UX (CnaeGapBanner) é dead code em produção — gate hasGap nunca dispara devido ao fallback genérico do RAG. Backlog: refatorar gate para considerar apenas chunks setoriais específicos.

---

## 7. Pontos de falha conhecidos (mapa de risco)

| Estágio | Risco | Mitigação atual | Backlog |
|---|---|---|---|
| E1 | OCR ruim em PDFs escaneados | Validação manual amostral | Skill `/ingest-rag-batch` automatizada |
| E1 | Documentos não-ingeridos (gaps temporais) | Manual via scripts ad-hoc | Watcher automatizado (Estratégia 2) |
| E2 | Schema sem versão/vigência | UNIQUE anchor_id | Refactor architectural (Estratégia 3) |
| E3 | Fallback `LENGTH < 50` retorna chunks irrelevantes | Re-ranking em `retrieveArticles` (modo completo) | Curadoria CNAE-específica do corpus |
| E4 | LLM gera `ia_gen` sem source_ref | M3 filter (PR #1030) | Schema strict — rejeitar `fonte != regulatorio` |
| E4 | Alucinação de `source_reference` | Validação amostral pós-deploy | Script `verify-rag-coverage` |
| E5 | Race condition state React | PR #1032 (auto-start serial) | Mergeado |
| E5 | Cache stale pré-fix em projetos antigos | DELETE manual (FASE 3 Issue #1028) | Concluído para projetos pós-PR #1012 |

---

## 8. Métricas de sucesso (REGRA-ORQ-31 — meta 98%)

| Métrica | Meta | Estado atual (2026-05-08) |
|---|---|---|
| Chunks com `anchor_id` válido | 100% | ✅ 100% (2.515/2.515) |
| Cobertura backbone legal (LC + EC) | 100% | ✅ 8/8 leis principais |
| Cobertura regulamentar pós-abr/2026 | ≥90% | 🔴 ~6/23 (26%) — 17 gaps |
| Perguntas com `fonte=regulatorio` | 100% | ✅ 100% (pós-PR #1030) |
| Perguntas com `source_reference` válido | 100% | ✅ 100% (pós-M3 filter) |
| Alucinação detectada | 0% | ✅ 0/16 references validadas no corpus |
| TTL médio de gap (publicação → ingestão) | ≤7 dias | 🔴 ~30+ dias (sem watcher) |
| Confiança do briefing (REGRA-ORQ-31) | ≥95% | ⚠️ ~71-85% por projeto |

---

## 9. Documentação correlata

| Documento | Path | Função |
|---|---|---|
| Inventário do corpus | `docs/governance/RAG_CORPUS_INVENTORY.md` | Estado atual + cronologia ingestão |
| Baseline canônica | `docs/rag/CORPUS-BASELINE.md` | Métricas estruturais + utilidade |
| Processo de ingestão | `docs/rag/RAG-PROCESSO.md` | Pipeline operacional |
| Governança | `docs/rag/RAG-GOVERNANCE.md` | Regras, gates e responsabilidades |
| Quality gate | `docs/governance/RAG-QUALITY-GATE.md` | Critérios de aceitação |
| RFCs ativas | `docs/rag/RFC/CORPUS-RFC-*.md` | Propostas de evolução |
| Rastreabilidade P.O. | `docs/painel-po/RASTREABILIDADE-RAG-PO.md` | Visão executiva |
| Gap table 2026-05-06 | `docs/0-RAG/0-acervo-v3-06mai26/Gap table Atualidade x Plataforma RAG da Solaris IA.md` | 17 gaps identificados |

---

## 10. Vinculadas

### Issues e PRs

- Issue #1028 — Q.CNAE fonte única regulatório (FASE 1 #1029, Opção C #1030)
- Issue #1031 — Race condition auto-start (PR #1032 — em validação)
- Issue #997 — Inventário corpus (AC6 reconciliação source vs produção)

### REGRAs governance

- **REGRA-ORQ-29** — Sem requisito = sem pergunta = sem gap
- **REGRA-ORQ-30** — Temperature ≤ 0.1 (determinismo LLM)
- **REGRA-ORQ-31** — Meta 98% confiança jurídica
- **REGRA-ORQ-32** — Proibição de hardcode (visão sistêmica)
- **REGRA-ORQ-37** — Empirismo proibido / Manus executa queries

### Lições

- **Lição #59** — assemble ≠ consumption (validação de consumo real)
- **Lição #61** — metadado determinístico antes da pergunta
- **Lição #66** — spec sem dados = ilusão (validação empírica obrigatória)
