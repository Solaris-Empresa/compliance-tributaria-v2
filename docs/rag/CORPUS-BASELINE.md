# CORPUS BASELINE — IA SOLARIS RAG

> **Versão:** v5.0
> **Data:** 2026-04-13
> **Commit HEAD:** 1ea5c64
> **Sprint de referência:** Sprint Z-13 ENCERRADA · Gate 7 PASS (PRs #485–#497)
> **Autor:** Manus AI
> **Aprovado por:** Uires Tapajós (P.O.)
> **Revisão externa:** Consultor (ChatGPT) — parecer de 2026-03-30
>
> **Instrução de atualização:** a cada ingestão, RFC, incidente ou correção de corpus,
> incrementar a versão, registrar data/commit e atualizar as seções 1–8.
> Nunca atualizar este arquivo sem um PR com label `rag:corpus` associado.

---

## Objetivo desta versão

A v1.1 media **integridade** (quantidade de chunks, anchor_id, anomalias).
A v2.0 evolui para medir **utilidade operacional** — o corpus passa de inventário estático
para sistema vivo de conhecimento auditável, respondendo não apenas "está íntegro?"
mas "**está funcionando?**"

| Dimensão | v1.1 | v2.0 |
|---|---|---|
| Integridade estrutural | ✅ | ✅ mantido |
| Métricas de uso real | ❌ | ✅ novo |
| Qualidade semântica | ❌ | ✅ novo |
| Rastreabilidade chunk→risco | ❌ | ✅ novo |
| Score do corpus | ❌ | ✅ novo |
| Alertas operacionais | ❌ | ✅ novo |
| Ciclo de vida documentado | ❌ | ✅ novo |

---

## 1. Métricas estruturais (integridade)

| Indicador | Valor |
|---|---|
| Total de chunks | **2.515** |
| Chunks com `anchor_id` | 2.515 (100%) |
| Chunks sem `anchor_id` | 0 |
| Leis ativas no corpus | **13** (10 leis + 3 CGIBS) |
| Anomalias abertas | 0 ✅ Sprint G concluída |
| Anomalias críticas (P0) | 0 |

### 1.1 Distribuição por lei

| Lei | Total chunks | Com anchor_id | Sem anchor_id | Status |
|---|---|---|---|---|
| lc214 | 1.573 | 1.573 | 0 | ✅ Íntegro |
| lc227 | 434 | 434 | 0 | ✅ RFC-001 executada |
| conv_icms | 278 | 278 | 0 | ✅ Sprint S · PR #296 |
| lc116 | 60 | 60 | 0 | ✅ Sprint S · PR #296 |
| lc87 | 60 | 60 | 0 | ✅ Sprint S · PR #296 |
| lc224 | 28 | 28 | 0 | ✅ Íntegro |
| cg_ibs | 26 | 26 | 0 | ✅ Sprint S · PR #296 |
| lc123 | 25 | 25 | 0 | ✅ RFC-002 executada |
| ec132 | 18 | 18 | 0 | ✅ Íntegro |
| rfb_cbs | 7 | 7 | 0 | ✅ Sprint S · PR #296 |
| resolucao_cgibs_1 | 4 | 4 | 0 | ✅ Sprint Z-12 · Lote D |
| resolucao_cgibs_2 | 1 | 1 | 0 | ✅ Sprint Z-12 · Lote D |
| resolucao_cgibs_3 | 1 | 1 | 0 | ✅ Sprint Z-12 · Lote D |

---

## 2. Métricas de uso real

> **Crítica do Consultor (C-01):** "Você mede quantidade de chunks, mas não mede se os chunks são usados. Isso mata o RAG."

> **Status L-RAG-01 (2026-03-30):** Tabela `rag_usage_log` criada (migration 0060), captura
> async non-blocking implementada em `server/rag-retriever.ts`, 4 endpoints tRPC adicionados
> em `ragAdmin`. Aguardando primeiros logs de produção para popular as métricas abaixo.

As métricas abaixo devem ser coletadas a cada sprint via query no banco de produção
e registradas neste documento.

| Indicador | Descrição | Status atual |
|---|---|---|
| **Top 10 chunks usados** | `anchor_id` mais recuperados por `retrieveArticles` | ✅ endpoint `getTopChunks` disponível |
| **Chunks nunca usados** | `anchor_id` com 0 recuperações desde a ingestão | ✅ endpoint `getUnusedChunks` disponível |
| **Uso por lei** | % de recuperações por lei (lc214 vs lc227 vs demais) | ✅ endpoint `getUsageByLei` disponível |
| **Frequência por diagnóstico** | Chunks mais usados por tipo de empresa (CNAE) | ⏳ aguarda logs de produção |
| **Taxa de fallback** | % de queries que retornaram 0 chunks relevantes | ⏳ aguarda logs de produção |

### 2.1 Query de referência para coleta de uso

```sql
-- Executar no banco de produção a cada sprint
-- Requer tabela rag_usage_log (a criar em Sprint L — item L-RAG-01)
SELECT
  anchor_id,
  lei,
  COUNT(*)          AS total_recuperacoes,
  MAX(used_at)      AS ultimo_uso
FROM rag_usage_log
GROUP BY anchor_id, lei
ORDER BY total_recuperacoes DESC
LIMIT 50;
```

### 2.2 Critério de chunk morto

Um chunk é considerado **morto** quando:
- Nunca foi recuperado em nenhum diagnóstico, **ou**
- Não foi recuperado nas últimas 4 sprints (≈ 60 dias)

Chunks mortos devem ser revisados para remoção ou fusão na próxima RFC de corpus.

---

## 3. Métricas de qualidade semântica

> **Crítica do Consultor (C-03):** "Você tem integridade, mas falta qualidade semântica e cobertura real."

| Categoria | Critério | Status atual |
|---|---|---|
| **Chunk útil** | Foi recuperado em ≥ 1 diagnóstico | ⏳ pendente telemetria |
| **Chunk morto** | Nunca recuperado | ⏳ pendente telemetria |
| **Chunk duplicado** | Conteúdo redundante (similaridade coseno > 0,95) | ⏳ pendente Sprint L |
| **Chunk incompleto** | Fragmentado — artigo cortado sem conclusão | 0 identificados (Sprint G) |
| **Chunk desatualizado** | Lei revogada ou alterada sem atualização no corpus | 0 identificados |

### 3.1 Gold set de queries de referência

O gold set valida a qualidade semântica do corpus de forma objetiva:

| Query | Chunks esperados | Status |
|---|---|---|
| "IBS base de cálculo" | lc214 art. 12–15 | ✅ 8/8 verde (Sprint G) |
| "CBS alíquota padrão" | lc214 art. 87–90 | ✅ validado |
| "Simples Nacional exceção" | lc123 art. 3–5 | ✅ validado |
| "Imposto Seletivo bens" | lc214 art. 400–410 | ✅ validado |
| "Comitê Gestor atribuições" | ec132 art. 1–5 | ✅ validado |

Ver: `docs/rag/gold-set-queries.sql` para queries completas.

---

## 4. Métricas de cobertura

> **Crítica do Consultor (C-05):** "Você não sabe quais artigos críticos estão presentes ou não."

| Lei | Artigos críticos | Presença no corpus | Cobertura estimada |
|---|---|---|---|
| **lc214** | Arts. 1–500 (IBS/CBS/IS) | 1.573 chunks | ~98% |
| **ec132** | Arts. 1–18 (Comitê Gestor) | 18 chunks | 100% |
| **lc227** | Arts. 1–200 (IBS complementar) | 434 chunks | ~95% |
| **lc224** | Arts. 1–50 (transição) | 28 chunks | ~90% |
| **lc123** | Arts. 1–100 (Simples Nacional) | 25 chunks | ~60% ⚠️ |

> **Alerta:** lc123 com ~60% de cobertura estimada. RFC-004 propõe expansão.
> Ver: `docs/RFC-004-expansao-corpus-lc116-lc87-cgibs-rfbcbs.md`

### 4.1 Leis candidatas para ingestão futura

| Lei | Tema | Prioridade | RFC |
|---|---|---|---|
| LC 116/2003 | ISS (transição para IBS) | Alta | RFC-004 |
| LC 87/1996 | ICMS (Lei Kandir) | Alta | RFC-004 |
| Res. CGIBS 01/2025 | Regulamentação IBS | Crítica | RFC-003 |
| IN RFB CBS 2024 | Regulamentação CBS | Crítica | RFC-003 |

---

## 5. Rastreabilidade chunk → risco → ação

> **Crítica do Consultor (C-02):** "Você não tem chunk → risco → ação. Isso é o mais importante."

A rastreabilidade completa conecta cada chunk do corpus ao risco que ele mitiga
e à ação que o advogado deve tomar no diagnóstico.

### 5.1 Cadeia de rastreabilidade

```
anchor_id (chunk)
    ↓
lei + artigo (referência normativa)
    ↓
categoria_risco (ex: "alíquota IBS incorreta")
    ↓
pergunta_onda3 (gerada por generateQuestions)
    ↓
resposta_cliente (coletada no diagnóstico)
    ↓
acao_recomendada (plano de ação do advogado)
```

### 5.2 Exemplos de rastreabilidade por lei

| anchor_id | Lei | Artigo | Risco mapeado | Onda | Ação |
|---|---|---|---|---|---|
| 1–50 | lc214 | Art. 1–5 | Incidência IBS/CBS incorreta | Onda 3 | Revisar base de cálculo |
| 808–810 | lc227 | Art. 2 | Cumulatividade IBS | Onda 3 | Verificar não-cumulatividade |
| 664–688 | lc123 | Art. 3–5 | Exclusão indevida do Simples | Onda 3 | Confirmar enquadramento |
| 30.840–30.857 | ec132 | Art. 1–18 | Governança Comitê Gestor | Onda 3 | Monitorar regulamentação |
| 780–807 | lc224 | Art. 1–28 | Regime de transição | Onda 3 | Calcular período de transição |

### 5.3 Schema de rastreabilidade (Sprint L — item L-RAG-02)

```sql
-- Tabela de mapeamento chunk → risco (a criar em Sprint L)
CREATE TABLE rag_chunk_risk_map (
  id                  SERIAL PRIMARY KEY,
  anchor_id           INTEGER NOT NULL,
  lei                 VARCHAR(20) NOT NULL,
  artigo              VARCHAR(50),
  categoria_risco     VARCHAR(200) NOT NULL,
  onda                INTEGER CHECK (onda IN (1, 2, 3)),
  acao_recomendada    TEXT,
  criado_em           TIMESTAMP DEFAULT NOW(),
  sprint              VARCHAR(10)
);
```

---

## 6. Score do corpus

> **Crítica do Consultor (C-04):** "Score = 0–100 com 4 critérios ponderados."

O score sintetiza a saúde do corpus em um único número para o P.O.

### 6.1 Fórmula

```
Score = (Integridade × 0,20) + (Cobertura × 0,20) + (Uso real × 0,30) + (Qualidade × 0,30)
```

### 6.2 Critérios e pesos

| Critério | Peso | Medição | Score atual |
|---|---|---|---|
| **Integridade** | 20% | % chunks com anchor_id | 100/100 → **20 pts** |
| **Cobertura** | 20% | % artigos críticos presentes | ~88% estimado → **17,6 pts** |
| **Uso real** | 30% | % chunks usados em diagnósticos | ⏳ pendente → **0 pts** |
| **Qualidade** | 30% | Gold set + ausência de chunks mortos | 8/8 gold set → **24 pts** |
| **TOTAL** | 100% | | **61,6 / 100** ⚠️ |

> **Interpretação:** 61,6 reflete que 30% do score (uso real) está pendente de telemetria.
> Com telemetria implementada, score estimado: 80–90/100. Meta: ≥ 85/100 ao final da Sprint L.

### 6.3 Faixas de saúde

| Faixa | Score | Significado |
|---|---|---|
| 🟢 Saudável | 85–100 | Corpus operacional e auditável |
| 🟡 Atenção | 65–84 | Gaps de cobertura ou uso baixo |
| 🔴 Crítico | 0–64 | Ação imediata necessária |

**Score atual: 61,6 → 🔴 Crítico por ausência de telemetria de uso (Sprint L)**

---

## 7. Alertas operacionais

> **Crítica do Consultor (C-06):** "Alertas por situação com ação prescrita."

| Situação | Severidade | Ação prescrita | Status |
|---|---|---|---|
| Chunk nunca usado | P2 | Revisar relevância — candidato a remoção | ⏳ aguarda telemetria |
| Cobertura lc123 < 70% | P1 | Ingestão imediata — RFC-004 | 🔴 ativo |
| Gold set com falha | P0 | Parar diagnósticos — investigar corpus | ✅ 8/8 verde |
| RFC aprovada sem ingestão > 7 dias | P1 | Escalar para P.O. | ✅ nenhuma pendente |
| Chunk duplicado detectado | P2 | RFC de limpeza | ⏳ aguarda Sprint L |
| Lei nova publicada (DOU) | P1 | Abrir issue `rag:corpus` em 48h | ✅ processo ativo |

---

## 8. Ciclo de vida do corpus

```
INGESTÃO → VALIDAÇÃO → USO → MELHORIA
    ↓           ↓         ↓        ↓
  RFC        gold set  telemetria  RFC
  anchor_id  8/8 verde  uso real   limpeza
  lei correta anomalias  chunk→risco score
```

### 8.1 Protocolo por etapa

| Etapa | Responsável | Artefato | Gate |
|---|---|---|---|
| **Ingestão** | Manus | RFC + migration SQL | Aprovação P.O. |
| **Validação** | Manus | gold-set-queries.sql | 8/8 verde |
| **Uso** | Sistema | rag_usage_log | Telemetria Sprint L |
| **Melhoria** | Manus + P.O. | Nova RFC | Aprovação P.O. |

---

## 9. Anomalias documentadas

| ID | IDs afetados | Lei | Problema | Severidade | Status | RFC |
|---|---|---|---|---|---|---|
| G-01 | 810–811 | lc227 | Chunk fragmentado — Art. 2 partes 2+3 | P2 | ✅ Corrigido Sprint G · 2026-03-26 | CORPUS-RFC-001.md |
| G-02 | 617–779 | lc123 | 25 chunks com campo lei=lc214 incorreto | P1 | ✅ Corrigido Sprint G · 2026-03-26 | CORPUS-RFC-002.md |

> **NOTA:** ids 780–807 (28 chunks, lei=lc224) auditados e **CORRETOS** — não foram pendência.

---

## 10. Pendências para Sprint L

| Item | Prioridade | Descrição | Status |
|---|---|---|---|
| L-RAG-01 | P0 | Implementar `rag_usage_log` — tabela de telemetria de uso | ✅ **implementado** — PR #235 · migration 0060 · 4 endpoints tRPC |
| L-RAG-02 | P1 | Implementar `rag_chunk_risk_map` — rastreabilidade chunk→risco | ⏳ pendente |
| L-RAG-03 | P1 | Dashboard de score no cockpit (Seção 7 — "Saúde do Corpus") | ✅ **implementado** — PR #233 |
| L-RAG-04 | P2 | Detector automático de chunks duplicados (similaridade coseno) | ⏳ pendente |
| L-RAG-05 | P2 | Ingestão lc123 completa (RFC-004) — cobertura de ~60% → 95% | ⏳ pendente |

---

## 11. Histórico de versões

| Versão | Data | Commit | Descrição |
|---|---|---|---|
| v1.0 | 2026-03-26 | 0ad209b | Criação — primeiro inventário granular por lei |
| v1.1 | 2026-03-26 | 4591b0c | RFC-001: fusão chunks 810+811 · RFC-002: 25 chunks migrados para lc123 · gold set 8/8 |
| **v2.0** | **2026-03-30** | **a098aab** | **Evolução para corpus operacional: métricas de uso, qualidade, rastreabilidade chunk→risco, score, alertas, ciclo de vida. Incorpora parecer do Consultor (ChatGPT) de 2026-03-30** |
| **v2.1** | **2026-03-30** | **PR #235** | **L-RAG-01 implementado: tabela `rag_usage_log`, migration 0060, captura async non-blocking em `rag-retriever.ts`, 4 endpoints tRPC (`getChunkUsageStats`, `getTopChunks`, `getUnusedChunks`, `getUsageByLei`), integração no cockpit 7E** |
| **v2.2** | **2026-04-04** | **d08c12a** | **Sprint S: 5 novas leis ingeridas (conv_icms=278, lc116=60, cg_ibs=26, rfb_cbs=7, lc87=5). Corpus: 2.454 chunks · 10 leis. PR #296.** |
| **v3.3** | **2026-04-05** | **d562127** | **Milestone 1 Decision Kernel: ncm-engine + nbs-engine + engine-gap-analyzer (PRs #311–#315). source='engine' ativo em project_gaps_v3. 5/6 casos NCM/NBS validados (Dr. Rodrigues). Gate triplo aprovado (Técnico + Jurídico + P.O.). Baseline v3.3 oficial.** |
| **v4.3** | **2026-04-05** | **49c3f68** | **Sprint V Lote 1 (PR #328): +10 casos NCM/NBS → 16 confirmados. NCM:9 · NBS:7 · Testes:26/26. Fix nbs-engine.ts extractFonte.** |
| **v4.4** | **2026-04-05** | **1c42774** | **Sprint V Lote 2 (PR #330): +8 casos NCM/NBS → 24 confirmados. NCM:12 · NBS:12 · Testes:34/34. Correção S-07 (planos saúde: Arts.234-235).** |
| **v4.5** | **2026-04-05** | **2d53596** | **Sprint V Lote 3 (PR #333): +13 casos NCM/NBS + 1 pending → 37 confirmados. NCM:19 · NBS:19 · Testes:48/48. Sprint V encerrada. Meta 38 casos atingida com margem de segurança jurídica.** |
| **v5.0** | **2026-04-13** | **1ea5c64** | **Sprint Z-13 ENCERRADA · Gate 7 PASS (PRs #485–#497): Lote D CGIBS (resolucao_cgibs_1=4, resolucao_cgibs_2=1, resolucao_cgibs_3=1 → +6 chunks). fix B-Z13-004 risk_category_code. backfill project_gaps_v3. Corpus: 2.515 chunks · 13 leis · 100% anchor_id.** |

---

*Documento vivo — fonte de verdade do estado do corpus RAG.*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
*Cockpit P.O.: https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/*
