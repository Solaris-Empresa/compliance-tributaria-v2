# Despacho de Orquestração — TO-BE Construção Civil (#1607)

> **Para:** Orquestrador (orquestração do TO-BE) · **De:** Claude Code · **Data:** 2026-06-29 · **HEAD:** `main` `4b447d37`
> **Status das evidências:** ✅ **consolidadas e mergeadas** (ver §1). **Diagnóstico fechado** após 4 iterações verificadas.
> **Natureza:** plano de orquestração. Nenhuma implementação inicia sem aprovação P.O. + curadoria jurídica (Dr. José).

---

## 1. Insumos consolidados em main (base do TO-BE)

| Doc | Autor | Papel |
|---|---|---|
| `docs/QUADRO-EVIDENCIAS-DR-JOSE.md` (#1619) · `ANALISE-SETORIAL-...` (DOC2) · `TABELA-QUESTAO-FUNDAMENTACAO-...` (DOC1) · `RELATORIO-TOBE-COBERTURA-...` (DOC3) | Manus | evidência de banco + mapeamento risco×artigo |
| `docs/INVESTIGACAO-CR-02-CNAEGROUPS.md` (#1621) | Manus | estado real de `cnaeGroups` (read-only) |
| `CRUZAMENTO-...-EVIDENCIA` (v2) · `CRITICA-QUADRO-...-FLUXO-ATIVO` · `ANALISE-INVESTIGACAO-CR02-...` · `DESPACHO-MANUS-1607-CRUZAMENTO-CR02` | Claude | verificação de código + reconciliação |
| `AS-IS-TO-BE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md` | Claude | impact-tree F0–F4 (origem do plano) |

## 2. Diagnóstico fechado (a verdade verificada)

Quatro hipóteses do implementador foram testadas contra o código. **Só uma sobrevive como lever de geração:**

| Hipótese | Veredito (`arquivo:linha`) | Atua na geração da matriz? |
|---|---|---|
| 3 lacunas (link Q.CNAE / motor resposta→risco / requisitos) | caminho de gaps (Path A) real, mas incompleto | parcial |
| CR-02 `cnaeGroups=''` | `rag-retriever.ts:134/364` = **retrieval**; `normative-inference` não lê; LC 214 **já** tagueada `41,42,43,68` | ❌ não (grounding) |
| GAP-1 (RAG no `generateRiskMatrices`) | `routers-fluxo-v3.ts:3047` **throw METHOD_NOT_SUPPORTED** (ADR-0022) | ❌ dead code |
| GAP-2 (briefing) | engine v4 não lê briefing | ⚠️ narrativa, não geração |
| **GAP-3 (regras no engine v4)** | `normative-inference.ts:232/241/250` = 3 gates só | ✅ **único lever** |

**Conclusão:** a matriz ativa é o **engine v4 determinístico** (`risks_v4` → `/risk-dashboard-v4`, `BriefingV3.tsx:461`). Os 13 riscos só aparecem implementando **regras de inferência** (Path B) e/ou a cadeia **requisito→gap→risco** (Path A). Curadoria de dados (cnaeGroups, briefing) é **grounding/narrativa**, não substitui regra.

## 3. Escopo do TO-BE (classes)

- **Fase 0 (CR-01):** Classe A — bug fix isolado. Sem nova feature.
- **Fases 1–3 (GAP-3):** Classe **C** — novo subsistema setorial (taxonomia + gates + regras + curadoria + testes + ADR bump). Cross-cutting.
- **Fase 4 (grounding/correções):** Classe A/B — UPDATE de dados + gate jurídico.

## 4. Classificação dos 13 riscos — Path A (pergunta) vs Path B (CNAE-determinístico)

> **PROPOSTA DE ENGENHARIA — requer validação jurídica do Dr. José.** Critério: o risco aplica-se a **toda construtora**
> (CNAE 41/42/43) → Path B (regra de inferência, gera sempre); ou depende de **fato do negócio** (faz permuta? tem SPE?
> recebe parcelado?) que o CNAE não revela → Path A (exige **pergunta**, senão gera falso-positivo). [[Lição #139]]/REGRA-ORQ-47.

| # | Risco | Artigo (LC 214) | Cobertura hoje | Caminho proposto | Sinal de elegibilidade |
|---|---|---|---|---|---|
| 1 | Créditos IBS / gestão obra | 255 §5º · 262 · 269 · 270 | ⚠️ parcial (`risco_art_269_270`) | **B** — categoria própria | CNAE 41/42/43 |
| 2 | Redutor de Ajuste | 257–258 | ❌ | **B** | CNAE 41/42/43 + 68 |
| 3 | SINTER / avaliação | 256 · 265 | ❌ | **B** | CNAE imóveis |
| 4 | **Permuta** | **252 §2º** (≠259) | ❌ | **A** (pergunta) | "realiza permuta?" |
| 5 | Controle por empreendimento | 270 | ✅ (existe) | B (manter) | CNAE 41 |
| 6 | Documentação fiscal obra | 270 §único · 265 §2º | ⚠️ parcial | **B** — categoria própria | CNAE 41 |
| 7 | CIB | 265–266 | ✅ (existe) | B (manter) | CNAE imóveis |
| 8 | Custos históricos < 2027 | 258 II b | ❌ | **B** (time-bound 2027) | CNAE imóveis + propriedade pré-2027 |
| 9 | Contrapartidas urbanísticas | 258 §6º-§7º | ❌ | **A** (pergunta) | "tem outorga onerosa / doação de áreas?" |
| 10 | Recálculo posterior do IBS | 256 §2ºIII / 258 §3º | ❌ | **A** (pergunta) | "contrapartidas estimadas?" |
| 11 | Tributação por parcelas | 262 | ❌ | **A** (pergunta) | "vende em parcelas / incorporação?" |
| 12 | Revisão de contratos (SPE/SCP) | 263–264 | ❌ | **A** (pergunta) | "opera via SPE/SCP/consórcio?" |
| 13 | Risco tecnológico (ERP) | 270 | ⚠️ genérico | **B** | CNAE 41 |

**Resumo proposto:** Path B (gera p/ toda construtora) = #1,2,3,5,6,7,8,13 (8). Path A (exige pergunta) = #4,9,10,11,12 (5).

## 5. Plano de orquestração por fases

### Fase 0 — CR-01 (higiene, Classe A, independente)
- `extractProjectProfile` (`project-profile-extractor.ts:190`): incluir `companyProfile` no SELECT + fallback
  `row.taxRegime ?? safeParse(companyProfile)?.taxRegime ?? **null**` (**não** `'lucro_real'` — [[Lição #139]]/REGRA-ORQ-29).
- **DoD discriminante:** construtora lucro_real → inclui imóveis · construtora **Simples Nacional** → **exclui** (hoje falso-positivo).
- Não destrava os 13 — é higiene. Pode ir já (bug fix, sem aprovação P.O. de feature).

### Fase 1 — Taxonomia setorial (DB-first, ADR-0025) — **bloqueada por curadoria jurídica**
- Criar categorias em `risk_categories` (DB, não hardcode): `redutor_ajuste`, `sinter_avaliacao`, `permuta_imobiliaria`,
  `custos_historicos_2027`, `contrapartidas_urbanisticas`, `recalculo_ibs`, `tributacao_parcelas`, `contratos_spe_scp`,
  `creditos_obra`, `documentacao_obra`, `risco_tecnologico_obra` (+ avaliar fundir #5/#7 nos existentes).
- Adicionar os mesmos códigos ao `Categoria` union + `SEVERITY_TABLE` + `TITULO_TEMPLATES` (`risk-engine-v4.ts`) — **obrigatório**
  senão cai em fallback "media"/título genérico ([[Lição #88]]).
- **bump ADR-0025: MINOR.** Severidade de cada categoria = decisão Dr. José (tabela fixa, nunca LLM).

### Fase 2 — Gates de elegibilidade (extensão `regime-imoveis-eligibility.ts`)
- Funções puras por risco (padrão `isRegimeImoveis*`): para Path B, gate CNAE; para Path A, o gate é a **resposta** (Fase 3b).

### Fase 3a — Regras Path B (`normative-inference.ts`) — gera p/ toda construtora
- 8 `makeInferredRisk` (#1,2,3,5,6,7,8,13), cada um citando o artigo, com severidade da Fase 1.
- **DoD negativo (REGRA-ORQ-44):** não-construtora (CNAE ≠ 41/42/43/68) → NÃO gera nenhum dos 8.

### Fase 3b — Riscos Path A (cadeia requisito→gap→risco) — exige pergunta + curadoria
- 5 perguntas SOLARIS (#4,9,10,11,12) com `cnae_groups=["41","42","43","68"]` + `lei_ref`/`artigo_ref` validados
  (REGRA-ORQ-29, `mappingReviewStatus`), cada uma → requisito → gap → risco.
- **Depende de:** CR-03 (link `requirement_question_mapping`) + o motor resposta→risco (lacunas do parecer). Curadoria Dr. José.

### Fase 4 — Grounding + correções (Classe A/B, gate jurídico)
- **UPDATE Decreto 12.955** Arts. 360–372 (`''`→`41,42,43,68`, 18 chunks vazios) — **higiene de grounding**, não geração. P.O. aprova.
- **Correções de dados (gate Dr. José, [[Lição #133]]):** CGIBS 6 mis-tag agro (`01,02,...`→construção); LC 214 tags
  divergentes (252/262=`64,65,66`; 266=manufatura); **permuta = Art. 252** (corrigir DOC1/QUADRO, hoje cita 259).

## 6. Sequenciamento e dependências

```
Fase 0 (CR-01)  ──independente──►  pode ir já
Fase 1 (taxonomia) ──curadoria Dr. José──► Fase 2 ──► Fase 3a (Path B, 8 riscos)
Fase 3b (Path A, 5 riscos) ──depende de──► CR-03 + motor resposta→risco + perguntas curadas
Fase 4 (grounding) ──paralela──► independente das demais (só melhora citação)
```

**Caminho mais curto para valor:** Fase 0 → Fase 1 + Fase 3a (8 riscos Path B) — entrega 8 dos 13 com curadoria mínima.
Fase 3b (5 riscos Path A) é mais cara (perguntas + link + motor) e fecha os 13.

## 7. RACI e gates (REGRA-ORQ-33)

| Etapa | R (implementa) | A (aprova) | C (parecer) | Gate bloqueante |
|---|---|---|---|---|
| Fase 0 CR-01 | Claude/Manus | P.O. | — | DoD discriminante SN |
| Fase 1 taxonomia | Claude/Manus | P.O. | **Dr. José** (severidade + artigo) | `blocked-legal-gate` |
| Fase 3a Path B | Claude/Manus | P.O. | Dr. José (texto do risco) | DoD negativo não-construtora |
| Fase 3b Path A | Claude/Manus | P.O. | Dr. José (perguntas `lei_ref`) | REGRA-ORQ-29 + CR-03 |
| Fase 4 grounding | Manus | P.O. | Dr. José (tags multi-setoriais) | DM-1 (before/after) |

## 8. DoD global (REGRA-ORQ-44/47 — por risco)

Para **CONSTRUTORA VII** (greenfield, Protocolo 1): cada um dos 13 → `requisito/regra → risco_v4` com artigo rastreável e
confiança ≥ 0,90. **Negativo discriminante:** não-construtora **não** recebe nenhum dos 13. **Não-vender grounding como geração**
(DM-1 prova que o UPDATE do Decreto **não** muda o count de `risks_v4`).

## 9. Pendências empíricas (Manus)

- **DM-1:** before/after de `COUNT(*) risks_v4` no UPDATE do Decreto (esperado: inalterado → confirma grounding-only).
- **DM-2:** corrigir permuta → **Art. 252 §2º** (DOC1/QUADRO ainda citam 259 = redutor social).

## Vinculadas

- Issue #1607 · todos os docs da §1 · Backlog #963/#966/#1025 (lacunas Path A)
- ADR-0022 (hot swap v4) · ADR-0025 (categorias configuráveis) · REGRA-ORQ-24/27/29/41/44/47 · [[Lição #59]]/[[Lição #88]]/[[Lição #93]]/[[Lição #133]]/[[Lição #139]]/[[Lição #147]]
- Código: `normative-inference.ts:232/241/250` · `regime-imoveis-eligibility.ts` · `risk-engine-v4.ts` (Categoria/SEVERITY) · `project-profile-extractor.ts:190` · `rag-retriever.ts:134`
