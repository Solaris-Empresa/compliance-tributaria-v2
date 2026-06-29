# [ARQUITETURA + BUG + FEATURE] Riscos setoriais de Construção Civil não identificados — red flag de viabilidade

> **Tipo:** Issue ultra-detalhada (REGRA-ORQ-28 Artefato 1) · **Classe:** C (subsistema setorial) + A (CR-01 isolado)
> **Severidade declarada pelo P.O.:** 🔴 RED FLAG — reputação e viabilidade da plataforma
> **Origem:** Validação E2E Dr. José 27/06/2026 (fundamentação jurídica + método determinístico + RAG = **100% corretos**) — os 13 riscos setoriais do setor de construção **não aparecem** no diagnóstico.
> **Insumos:** PDF Dr. José (13 riscos) · Auditoria Determinística Manus 27/06 · AS-IS/TO-BE `docs/governance/relatorios/AS-IS-TO-BE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md` (impact-tree, REGRA-ORQ-41).
> **Princípio P.O. (gov desta issue):** *toda análise determinística, com evidência na fonte da verdade; não concluir sem prova; dado de banco → despacho Manus. Nada de hard-code paliativo — a arquitetura precisa responder automaticamente.*

---

## ÍNDICE DAS 3 FRENTES

- **Frente 1 — Correção dos bugs identificados** (CR-01 + mislabel) — Classe A, sem nova feature.
- **Frente 2 — Solução para os riscos do Dr. José aparecerem** — Classe C, camada setorial data-driven.
- **Frente 3 — Diagnóstico arquitetônico** (a pergunta existencial: a arquitetura responde automaticamente ou tudo será hard-code?) — com evidência `arquivo:linha` + despacho Manus para os fatos de banco.

---

## 1. CONTEXTO

- **Projeto auditado:** CONSTRUTORA VII (`id 10680001`), CNAE principal `4120-4/00` (Construção de Edifícios), regime `lucro_real` (em `companyProfile.taxRegime`; coluna raiz `projects.taxRegime = null`), `operationType="servicos"`, NBS de construção, 8 riscos ativos gerados.
- **Sintoma reportado:** dos **13 riscos** que o Dr. José lista para construtoras (PDF `Principaisriscosparaumaconstrutora.pdf`), o diagnóstico cobre **3 parciais + 1 genérico + 1 oportunidade**; **8 estão completamente ausentes**.
- **Não é erro de conteúdo:** Dr. José validou fundamentação/RAG/determinismo como 100% corretos. É **lacuna de cobertura** + 1 bug latente.

### Os 13 riscos do Dr. José × estado na plataforma (verificado)

| # | Risco | Artigo LC 214 | Estado | Mecanismo da ausência (verificado) |
|---|---|---|---|---|
| 1 | Perda de créditos IBS / gestão da obra | Art. 365 | ⚠️ parcial | coberto só via `risco_art_269_270`; Art. 365 não cableado |
| 2 | Perda do Redutor de Ajuste | Arts. 260-268 | ❌ ausente | sem ramo/categoria/pergunta/requisito |
| 3 | SINTER (avaliação de imóveis) | regul. SINTER | ❌ ausente | idem |
| 4 | Venda por permuta | Arts. 251-270 | ❌ ausente | idem |
| 5 | Controle por empreendimento | Arts. 269-270 | ⚠️ parcial | único ramo existente (CNAE 41xx) |
| 6 | Documentação fiscal da obra | Art. 365 | ⚠️ parcial | sem categoria própria |
| 7 | CIB | Arts. 269-270 | ⚠️ parcial | único ramo existente |
| 8 | Custos históricos < 2027 | Arts. 260-268 | ❌ ausente | idem #2 |
| 9 | Contrapartidas urbanísticas | Arts. 260-268 | ❌ ausente | idem #2 |
| 10 | Recálculo posterior do IBS | Arts. 260-268 | ❌ ausente | idem #2 |
| 11 | Tributação por parcelas | Arts. 251-270 | ❌ ausente | idem #4 |
| 12 | Revisão de contratos (SPE/SCP/...) | Arts. 251-270 | ❌ ausente | idem #4 |
| 13 | Risco tecnológico (ERP) | Arts. 269-270 | ⚠️ genérico | só `obrigacao_acessoria` |

---

## 2. DIAGNÓSTICO EMPÍRICO (causa-raiz com `arquivo:linha`)

### 2.1 Validação cruzada da auditoria Manus (Lição #93 — refutação obrigatória)

| Manus | Verificação por código | Veredito |
|---|---|---|
| **CR-01** taxRegime null impede engine de saber lucro_real → riscos setoriais não acionados | `project-profile-extractor.ts:190` (`row.taxRegime ?? null`) + SELECT `:117-130` sem `companyProfile` → bug existe. **MAS** consumo em `normative-inference.ts:230` é `if (taxRegime !== "simples_nacional")` → `null` **passa** → bloco de imóveis roda mesmo com bug. `:218` (`=== "lucro_real"`) só p/ crédito presumido (exige CNAE atacadista — construtora não tem). | ⚠️ **Bug real, efeito ZERO nos 13 riscos deste caso.** Só causaria **falso-positivo** p/ construtora no **Simples Nacional**. |
| **CR-02** operationType="servicos" impede ativação setorial | breadcrumb `::op:servicos::` é rótulo (`risk-engine-v4.ts:363`); gate setorial real é **CNAE** (`regime-imoveis-eligibility.ts:58` → `startsWith("41")`). Prova: família imóveis FOI acionada (2 riscos no banco) apesar de op:servicos. | ⚠️ **Refutado como causa** — cosmético. |
| **CR-03** zero perguntas SOLARIS construção | evidência DB Manus (0/22) + filtro `solaris-context-filter.ts:91` + `db.ts:1283-1285`. | ✅ **Confirmado.** |

### 2.2 Causa-raiz consolidada (determinística)

A plataforma tem **exatamente 1 ramo setorial de construção** — a família `regime_imoveis` em `normative-inference.ts:227-258`, gated puramente por CNAE 41xx (`regime-imoveis-eligibility.ts:38/50/58`). Ela cobre #5/#6/#7 (parcial) + a oportunidade de 50%. Os **8 riscos ausentes não têm ramo de inferência, categoria no `Categoria` union, pergunta SOLARIS, nem requisito em `regulatory_requirements_v3`.**

**As "3 causas independentes" do Manus colapsam em 1 causa real (cobertura setorial ausente) + 1 bug latente irrelevante a este caso (CR-01) + 1 mislabel (CR-02).**

---

## 3. SPEC TÉCNICA — AS 3 FRENTES

> **Esta issue é ANÁLISE/SPEC. Não implementar antes da aprovação P.O. + curadoria jurídica (Frente 2/3).**

### FRENTE 1 — Correção dos bugs (Classe A, independente)

| Bug | Arquivo | Correção (direcional — Gate 0 do implementador, REGRA-ORQ-45) | DoD |
|---|---|---|---|
| **CR-01** taxRegime sem fallback | `project-profile-extractor.ts:190` + SELECT `:117-130` | incluir `companyProfile` no SELECT + `row.taxRegime ?? safeParseObject(row.companyProfile)?.taxRegime ?? null` (mesmo padrão BUG-REGIME-FILTER-01, `routers-fluxo-v3.ts:5148-5157`) | **DoD discriminante (REGRA-ORQ-47/Lição #139):** construtora **lucro_real**→inclui imóveis (igual hoje) · **Simples Nacional**→**exclui** (hoje gera falso-positivo) · sem regime→documentado. SQL greenfield (Manus). |
| **CR-02** mislabel (não é bug funcional) | — | nenhuma ação de código; documentar que `op:servicos` é rótulo, não gate. Evitar que vire "fix" paliativo. | n/a |

> ⚠️ **Honestidade obrigatória (Lição #117/#142):** CR-01 **não faz aparecer nenhum dos 8 riscos ausentes**. É higiene (corrige falso-positivo p/ SN). NÃO comunicar como "destravar os riscos do Dr. José".

### FRENTE 2 — Camada setorial de construção (Classe C, data-driven, anti-hardcode)

> Objetivo: os riscos do Dr. José aparecerem **pela arquitetura data-driven existente** (`regulatory_requirements_v3` + SOLARIS questions + categorias DB), **não** por novos `if` hard-coded em `inferNormativeRisks`.

| Fase | O quê | Onde (data-driven) | Dependência |
|---|---|---|---|
| **F1** | Categorias setoriais em `risk_categories` (DB, ADR-0025): `redutor_ajuste`, `sinter_avaliacao`, `permuta_imobiliaria`, `tributacao_parcelas`, `custos_historicos_2027`, `contrapartidas_urbanisticas`, `contratos_construcao`, avaliar `gestao_obra_creditos` (Art. 365). Adicionar códigos ao `Categoria` union (`risk-engine-v4.ts:46-71`, só tipagem TS — Lição #88). | DB + 1 union | aprovação P.O. + curadoria jurídica |
| **F2** | **Requisitos** em `regulatory_requirements_v3` (seed curado) para cada risco, com `legal_reference`/`legal_article`/`risk_category_code`/`evaluation_criteria`/`evidence_required` (caminho canônico requisito→gap→risco, `gapEngine.ts:282`). | seed JSON | curadoria jurídica (Dr. José) |
| **F3** | **Perguntas SOLARIS** com `cnae_groups=["41","42","43","68"]` + `lei_ref`/`artigo_ref` + `risk_category_code` + `mappingReviewStatus` (Lição #61, REGRA-ORQ-29). ~8 perguntas (CIB, custos históricos, permuta, SPE/SCP, parcelas, contrapartidas, ERP/centro de custo, avaliação SINTER) — captam os **fatos do negócio** que CNAE não revela. | tabela `solaris_questions` (CSV `solarisAdmin.ts:8`) | curadoria jurídica |
| **F4** | Grounding determinístico no briefing (padrão `buildRegimeImoveisRestriction` `regime-imoveis-eligibility.ts:70`) citando Arts. 260-268/365/SINTER. | função pura | depende F1-F3 |

**Por que data-driven e NÃO hard-code:** o caminho `regulatory_requirements_v3` + SOLARIS questions + `risk_categories` **já é o mecanismo escalável** (configurável por seed/CSV/DB, REGRA-ORQ-32). Adicionar `if (cnae 41) {...}` em `inferNormativeRisks` seria o paliativo que o P.O. rejeita. A Frente 2 **popula a camada de dados existente**, não cria branches.

**bump ADR:** ADR-0025 MINOR (categorias aditivas). Possível ADR novo para "camada setorial = curadoria, não inferência hard-coded" (ver Frente 3).

### FRENTE 3 — Diagnóstico arquitetônico (a pergunta existencial)

> **Pergunta do P.O.:** a causa-raiz é erro arquitetônico? RAG mal feito? falta dataset? os riscos não são identificáveis a partir da legislação (só com curadoria)? A arquitetura responde automaticamente, ou tudo será hard-code?

#### 3.1 FATOS VERIFICADOS na fonte da verdade (código) — não são conclusões, são evidência

**FATO A — A plataforma tem 3 mecanismos de geração de risco; NENHUM descobre risco a partir da lei:**

| Mecanismo | Origem do "o que checar" | RAG? | `arquivo:linha` |
|---|---|---|---|
| Requisitos curados → gap → risco | seed `regulatory_requirements_v3` (138 reqs curados) | não | `gapEngine.ts:282-292` · `schema-compliance-engine-v3.ts:63-95` · `scripts/seed-regulatory-requirements-v3.mjs:74` |
| Perguntas curadas (SOLARIS) → gap → risco | CSV upload por advogado | não | `solarisAdmin.ts:8-18` · `solaris-gap-analyzer.ts:201-363` |
| Inferência hard-coded → risco | listas CNAE + regime + pagamento no código | não | `normative-inference.ts:180-271` |

**FATO B — A RAG é GROUNDING/validação/enriquecimento, NUNCA discovery.** Não existe caminho onde um risco/categoria/requisito nasça do retrieval do corpus:
- `enrichRiskWithRag` entra **depois** do risco criado (`rag-risk-validator.ts:182`; pipeline `generate-risks-pipeline.ts:120`).
- `fetchDeterministicGrounding` injeta só categorias **já** `normativeStatus="confirmed"` (`deterministic-grounding.ts:115`).
- Perguntas LLM (Q.CNAE/Q.NCM/Q.NBS/Onda 2) são geradas **com RAG como contexto** + filtro de categorias hard-coded (`filtrarCategoriasPorPerfil` `routers-fluxo-v3.ts:175-221`), com anti-alucinação (toda pergunta exige `source_reference` — `routers-fluxo-v3.ts:1226`).

**FATO C — Não há descoberta setorial automática.** Não existe função "dado CNAE 41xx + corpus → quais requisitos legais aplicam". A cobertura de um CNAE depende de **alguém ter curado** requisitos/perguntas com `cnae_groups`/`risk_category_code` para ele. `requirement_question_mapping` está **vazia** (`unified-answer.ts:18`, #963).

**FATO D — Decisão arquitetônica deliberada:** o sistema é curation-first + RAG-grounding **por design anti-alucinação** (REGRA-ORQ-29 "sem requisito = sem pergunta", REGRA-ORQ-30 temp ≤0.1, REGRA-ORQ-31 meta 98%, REGRA-ORQ-32 no hardcode). Consequência: **cobertura é limitada pela curadoria**; setor sem curadoria recebe só riscos transversais + os hard-coded.

**FATO E — `cnaeGroups` é camada interpretativa, não normativa (Lição #133):** a LC 214 cita CNAE em **1 único artigo** (Art. 273 §2º I, verificado contra PDF primário). Para os demais ~543 artigos, "qual artigo aplica a qual CNAE" **não está na lei** — é mapeamento editorial/jurídico (curadoria). Logo, "derivar automaticamente da legislação quais riscos aplicam a construção" **não é mecanicamente possível a partir do texto legal** — exige a camada interpretativa.

#### 3.2 Resposta estruturada às hipóteses do P.O. (com base nos FATOS A-E)

| Hipótese do P.O. | Veredito baseado em evidência | Base |
|---|---|---|
| "É erro arquitetônico?" | **Não é bug; é escopo deliberado.** A arquitetura escolheu curation-first + RAG-grounding (anti-alucinação). O caminho data-driven (`regulatory_requirements_v3`+SOLARIS) **é** escalável — está **subpopulado**, não quebrado. | FATO A, D |
| "O RAG foi mal feito?" | **Não — RAG é grounding-scoped por design**, não discovery. Funciona para o que foi projetado (fundamentar). A questão não é qualidade do RAG, é **ausência de uma camada de discovery**. | FATO B |
| "Falta dataset?" | **Sim, parcialmente — falta o dataset ESTRUTURADO** (requisitos/perguntas com `risk_category_code`+`cnae_groups`+`evaluation_criteria` para construção). O **texto legal** existe no corpus (Dr. José validou). Falta o **metadado curado**, não a lei. | FATO C, E |
| "Os riscos são identificáveis só da legislação?" | **Não para a maioria.** Vários riscos do Dr. José (Redutor sem documentação; permuta mal estruturada; SPE/parcelas) são **inferências expert** que conectam mecanismo legal → modo de falha do negócio, e dependem de **fatos do negócio** (faz permuta? documentou custos?) → exigem **pergunta** + **curadoria**. Não derivam do texto sozinho. | FATO E + PDF Dr. José |
| "A arquitetura responde automaticamente ou tudo será hard-code?" | **Há um caminho automático-escalável SEM hard-code: o data-driven** (`regulatory_requirements_v3`+SOLARIS+`risk_categories`). O hard-code (`inferNormativeRisks`) é o **anti-padrão** a evitar. A arquitetura "responde automaticamente" **na medida em que a camada de curadoria estiver populada** — a automação é do *motor*, a cobertura é do *dado curado*. | FATO A, D |

#### 3.3 A questão arquitetônica de fundo (para decisão P.O. — NÃO concluída aqui)

Existe uma **4ª via possível** que hoje **não existe** no código: um **discovery layer** que, dado o perfil (CNAE/NCM/NBS/regime), recupere do corpus os artigos com potencial de risco e proponha **requisitos candidatos** (para curadoria humana validar) — semi-automatizando a curadoria em vez de eliminá-la. Isso **reduziria** o custo de cobrir cada novo setor sem cair em hard-code nem em alucinação. **Decisão de arquitetura (P.O. + Consultor + Dr. José):** investir nesse discovery-assistido ou manter curation-first manual por setor. **Não decido aqui** — requer os dados do despacho Manus (§7) para dimensionar.

---

## 4. ADR MÍNIMO

- **ADR-0025 (categorias configuráveis):** bump MINOR — novas categorias setoriais de construção (F1).
- **ADR novo candidato (ARCH):** "Cobertura setorial = curadoria data-driven, não inferência hard-coded" — formaliza FATO D + decide §3.3 (discovery-assistido vs curation manual). Requer parecer Consultor + P.O.
- **FEAT-COB-01 #1176** (família regime_imoveis) — referência do padrão a estender.

---

## 5. CRITÉRIO DE ACEITE EMPÍRICO (verificável; dados via Manus)

### Frente 1
- [ ] `extractProjectProfile` retorna `taxRegime="lucro_real"` para 10680001 (SQL greenfield, Manus).
- [ ] Construtora SN greenfield: ANTES recebe `risco_art_269_270` (falso-positivo); DEPOIS NÃO recebe (DoD discriminante, REGRA-ORQ-47).

### Frente 2 (após curadoria)
- [ ] Para CONSTRUTORA VII, ≥1 risco de cada categoria nova aparece em `risks_v4` com `source` rastreável + `lei_ref` validado por Dr. José.
- [ ] DoD negativo (REGRA-ORQ-44): empresa não-construção NÃO recebe os riscos setoriais (sem falso-positivo cross-setor).
- [ ] Cobertura: ≥11/13 riscos do PDF representados (≥85%, REGRA-ORQ-31).

### Frente 3 (diagnóstico)
- [ ] Despacho Manus (§7) respondido com queries → confirma/refuta FATO C/E empiricamente.
- [ ] Decisão P.O. registrada em ADR (§3.3).

---

## 6. TEST CONTRACTS (it.todo — REGRA-ORQ-28 Artefato 2)

```
// Frente 1
it.todo("extractProjectProfile: taxRegime null na coluna → lê companyProfile.taxRegime")
it.todo("extractProjectProfile: construtora SN → regime_imoveis NÃO inferido (DoD discriminante)")
it.todo("extractProjectProfile: construtora lucro_real → comportamento inalterado")

// Frente 2 (após F1-F3)
it.todo("inferência/gap: CONSTRUTORA → categoria redutor_ajuste gerada com lei_ref Arts.260-268")
it.todo("DoD negativo: empresa varejo NÃO recebe categorias de construção")
it.todo("cobertura: ≥11/13 riscos do PDF Dr. José representados para CNAE 41xx")

// Frente 3 (arquitetura)
it.todo("não existe caminho RAG-discovery: enrichRiskWithRag nunca cria risco novo (só enriquece)")
```

---

## 7. DESPACHO MANUS — dados de banco para fechar o diagnóstico (sem empirismo pelo Claude)

> Executar em produção (read-only). Reportar resultado literal (REGRA-ORQ-37). Estes dados **confirmam ou refutam** FATO C/E e dimensionam a Frente 2/3.

1. **Requisitos de construção existem?**
   `SELECT id, code, name, domain, legal_reference, legal_article, risk_category_code FROM regulatory_requirements_v3 WHERE active=1 AND (legal_article REGEXP '2[56][0-9]|36[0-9]|27[0]' OR domain LIKE '%imov%' OR name LIKE '%constru%' OR name LIKE '%imov%');` → esperado: poucos/nenhum.
   Também: `SELECT COUNT(*) FROM regulatory_requirements_v3 WHERE active=1;` (confirmar 138).

2. **`requirement_question_mapping` está vazia?** `SELECT COUNT(*) FROM requirement_question_mapping;` (esperado 0 — #963).

3. **Corpus tem os artigos E são RECUPERÁVEIS para CNAE 41xx?** (Dr. José validou conteúdo; aqui testamos retrievability — Lição #101)
   `SELECT id, lei, artigo, LEFT(conteudo,80), cnaeGroups FROM ragDocuments WHERE artigo REGEXP '26[0-8]|365|25[1-9]|27[0]' OR conteudo LIKE '%redutor de ajuste%' OR conteudo LIKE '%SINTER%' OR conteudo LIKE '%Cadastro Imobiliário%' ORDER BY artigo LIMIT 50;` → verificar se `cnaeGroups` casa 41/42/43/68 (se não, retrieval não traz p/ construtora).

4. **Categorias de construção no DB:** `SELECT codigo, nome, status, normative_status, cnae_codes, vigencia_inicio FROM risk_categories WHERE codigo LIKE '%imov%' OR codigo LIKE '%269%' OR codigo LIKE '%constru%' OR nome LIKE '%imov%';`

5. **TESTE-CHAVE (distingue "RAG/dataset" de "curadoria"):** para CONSTRUTORA VII (10680001), o caminho Q.CNAE (LLM+RAG) gerou **alguma** pergunta setorial de construção, ou retornou `hasGap=true`/vazio?
   `SELECT cnaeAnswers, questionnaireAnswersV3 FROM projects WHERE id=10680001;` + `SELECT codigo, texto, fonte, source_reference FROM <tabela de perguntas geradas> WHERE project_id=10680001;`
   - Se gerou perguntas de construção mas não viraram risco → gap é **curadoria de `risk_category_code`** (mapeamento pergunta→risco).
   - Se retornou vazio/hasGap → gap é **retrievability do corpus** (RAG/reranker/cnaeGroups) → reforça FATO E.

6. **Confirmar os 8 riscos do projeto:** `SELECT rule_id, categoria, severidade, source_priority, confidence FROM risks_v4 WHERE project_id=10680001 AND status='active';` (reproduzir a tabela do Manus).
7. **Snapshot ao vivo do RAG Cockpit** (reproduzir `ragInventory.getSnapshot`, `ragInventory.ts:128-204`) — para anexar à auditoria:
   - `SELECT COUNT(*) total_chunks, COUNT(DISTINCT lei) total_leis, SUM(CASE WHEN anchor_id IS NULL THEN 1 ELSE 0 END) sem_anchor FROM ragDocuments;` (confirmar ~16.769 chunks / 25 leis do badge `RagCockpit.tsx:2382`).
   - `SELECT lei, COUNT(*) FROM ragDocuments GROUP BY lei ORDER BY lei;`
   - **Cobertura de construção (NÃO existe gold query p/ isso — este é o teste que o cockpit não faz):** `SELECT id, lei, artigo, LEFT(conteudo,80), cnaeGroups FROM ragDocuments WHERE lei='lc214' AND (artigo REGEXP '2[56][0-9]|365|27[0]' OR conteudo LIKE '%redutor de ajuste%' OR conteudo LIKE '%SINTER%') ORDER BY artigo LIMIT 50;` → verificar se `cnaeGroups` casa 41/42/43/68 (se não, retrieval não traz p/ construtora — Lição #101).

---

## 7-B. AUDITORIA DO RAG COCKPIT (`/admin/rag-cockpit`) — reforço empírico da Frente 3

Auditoria do componente `client/src/pages/RagCockpit.tsx` (2.501 LOC) + router `server/routers/ragInventory.ts` (fonte dos números ao vivo via `ragInventory.getSnapshot`). O cockpit é o auto-monitoramento da RAG — **o que ele mede confirma a causa-raiz arquitetônica.**

### 7-B.1 FATO F — o cockpit mede INTEGRIDADE DE CORPUS, não COBERTURA DE RISCO

A métrica "confiabilidade" (badge header `RagCockpit.tsx:2397`, meta 98%) = % do **gold set de 8 queries** (`ragInventory.ts:23-110`) com status ok:

| Gold query | O que testa | `arquivo:linha` |
|---|---|---|
| GS-01 | orphans (anchor_id null) = 0 | `ragInventory.ts:28` |
| GS-02 | ≥4 leis distintas | `:36` |
| GS-03 | lc227 contém "split payment" | `:42` |
| GS-04 | lc214 Art.45 confissão | `:51` |
| GS-05 | lc224 CNAE | `:59` |
| GS-06 | ec132 ≥18 chunks | `:67` |
| GS-07 | zero chunks <10 bytes ou sem anchor | `:75` |
| GS-08 | autor preenchido (rastreável) | `:91` |

**Nenhuma das 8 testa cobertura setorial.** Não há query "CNAE 41 → retorna Redutor de Ajuste / Arts. 260-268". A "confiabilidade 100%" mede **higiene de ingestão + grounding**, NÃO se os riscos de um setor estão cobertos.

> **Implicação direta para o red-flag do P.O.:** o dashboard de saúde pode marcar **100% verde enquanto construção está totalmente descoberta** — a plataforma **não tem instrumento** para enxergar essa classe de lacuna. O "verde" é de *ingestão*, não de *cobertura de risco*.

### 7-B.2 A única visão de "cobertura" é estática e hardcoded

A tabela "Gaps de Curadoria (COVERAGE-SUITE-V3)" (`RagCockpit.tsx:841-873`) é um **array hardcoded** (não derivado do corpus) com 4 lacunas: #1280 (cooperativa), #1281 (transporte), #1282 (IS hardcode), #1283 (bebidas). **Construção civil NÃO está na lista** → a plataforma não rastreia sequer que falta cobertura para construção. Confirma FATO C (sem descoberta setorial automática) + FATO D (cobertura curation-bound).

### 7-B.3 Síntese

O cockpit **auto-monitora grounding (qualidade do corpus), não discovery (completude de cobertura)**. Isso fecha a resposta à pergunta existencial da Frente 3: a camada de discovery/coverage por setor **não é medida nem existe**. O RAG retriever é descrito no próprio cockpit como "Motor de recuperação RAG (LIKE + topicos + cnaeGroups)" (`RagCockpit.tsx:306`) — recuperação/grounding, consistente com FATO B.

> Baseline (badge estático `RagCockpit.tsx:2382`): `CORPUS-BASELINE v9.1 · 16.769 chunks · 25 leis · 28/05/2026` + `COVERAGE-V3 49/49 · E2E-ALIGNMENT 9/9 · GROUNDING-SMOKE 74/74`. Números ao vivo → despacho Manus §7.7.

---

## 8. NÃO-IMPLEMENTAR (escopo excluído — anti scope-creep)

- ❌ NÃO adicionar `if (cnae 41) {...}` em `inferNormativeRisks` (hard-code paliativo — viola REGRA-ORQ-32 e a diretriz do P.O.).
- ❌ NÃO seedar categorias/perguntas sem parecer jurídico (gate `blocked-legal-gate`, Lição #133).
- ❌ NÃO alterar `SEVERITY_TABLE`/dados `risks_v4` existentes (backend.md).
- ❌ NÃO implementar o discovery-layer (§3.3) antes da decisão de arquitetura (ADR + P.O.).
- ❌ NÃO comunicar CR-01 como solução dos riscos do Dr. José.

---

## 9. VINCULADAS

- **Docs:** AS-IS/TO-BE `docs/governance/relatorios/AS-IS-TO-BE-CONSTRUCAO-CIVIL-RISCOS-SETORIAIS-20260628.md` · Auditoria Manus 27/06.
- **Issues:** #1235 (rename `risco_art_269_270`) · #1236 (filtro briefingEngine) · #1277 (cnae locação) · #963 (`requirement_question_mapping` vazia) · BUG-REGIME-FILTER-01.
- **Regras:** ORQ-28 (triade) · ORQ-29 (sem requisito=sem pergunta) · ORQ-30 (temp) · ORQ-31 (98%) · ORQ-32 (no hardcode) · ORQ-41 (impact-tree) · ORQ-44/47 (DoD negativo/discriminante) · ORQ-45 (Gate 0 emissor) · ADR-0025.
- **Lições:** #59 · #61 · #65 · #66 · #88 · #93 · #101 · #117 · #133 · #139 · #140 · #142.
- **Código (fonte da verdade):** `gapEngine.ts:282` · `schema-compliance-engine-v3.ts:63-95` · `seed-regulatory-requirements-v3.mjs:74` · `solarisAdmin.ts:8` · `solaris-gap-analyzer.ts:201` · `normative-inference.ts:180-271` · `rag-risk-validator.ts:182` · `deterministic-grounding.ts:115` · `filtrarCategoriasPorPerfil` `routers-fluxo-v3.ts:175` · `project-profile-extractor.ts:190` · `regime-imoveis-eligibility.ts:38/50/58` · `risk-engine-v4.ts:46-71/363` · `unified-answer.ts:18`.
- **RAG Cockpit (auditado §7-B):** `client/src/pages/RagCockpit.tsx:306/841-873/2382/2397` · `server/routers/ragInventory.ts:23-110/128-204` (gold set 8 queries + `getSnapshot`) · `server/rag-retriever.ts` (retriever LIKE+topicos+cnaeGroups).
