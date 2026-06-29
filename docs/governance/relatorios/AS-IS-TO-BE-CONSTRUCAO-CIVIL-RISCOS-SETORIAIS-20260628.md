# AS-IS / TO-BE — Riscos setoriais de Construção Civil não identificados pela plataforma

> **Tema:** Por que os 13 riscos do Dr. José (construção civil) não aparecem no diagnóstico.
> **Data:** 2026-06-28 · **Autor:** Claude Code (Orquestrador) · **Skill:** `impact-tree` (REGRA-ORQ-41)
> **Classe estimada:** **C** (novo subsistema setorial — multi-camada) · CR-01 isolado é Classe A.
> **Status:** ANÁLISE — **não implementar**. Aguarda decisão P.O. (RACI: A).
> **Projeto auditado:** CONSTRUTORA VII (`id 10680001`), CNAE 4120-4/00, lucro_real, 8 riscos ativos.
> **Insumos:** PDF Dr. José (13 riscos) + Auditoria Determinística Manus 27/06/2026 + verificação de código (este doc).

---

## 0. Validação cruzada da auditoria Manus (Lição #93 — refutação técnica obrigatória)

O Dr. José validou que **fundamentação jurídica, método determinístico e RAG estão 100% corretos**. A pergunta é de **cobertura**, não de correção. O Manus apontou 3 causas-raiz (CR-01/02/03). A REGRA-ORQ-41 + Lição #93 obrigam a verificar cada citação `arquivo:linha` por Read antes de incorporar. Resultado:

| Manus | Afirmação | Verificação por código (`arquivo:linha`) | Veredito |
|---|---|---|---|
| **CR-01** | `taxRegime=null` impede o engine de saber que é lucro_real → riscos setoriais não acionados | `project-profile-extractor.ts:190` (`row.taxRegime ?? null`) + SELECT `:117-130` sem `companyProfile` → **bug existe**. PORÉM o consumo em `normative-inference.ts:230` é `if (profile.taxRegime !== "simples_nacional")` → `null !== "simples_nacional"` = **true** → o bloco de imóveis **roda mesmo com o bug**. O outro consumo `:218` (`=== "lucro_real"`) é só para `credito_presumido`, que exige CNAE atacadista (construtora não tem). | ⚠️ **Bug REAL, mas com efeito ZERO nos 13 riscos deste caso.** CR-01 só produziria **falso-positivo** (uma construtora no **Simples Nacional** receberia indevidamente os riscos de imóveis, porque `null` passa o gate). Severidade do bug medida pelo runtime, não pela narrativa (Lição #142). |
| **CR-02** | `operationType="servicos"` impede a ativação de lógica setorial | O breadcrumb `::op:servicos::` vem de `risk-engine-v4.ts:363` (`${categoria}::op:${op}::geo:${multi}`) — é **rótulo**, não gate. O gate setorial real é **CNAE** (`regime-imoveis-eligibility.ts:58` → `c.startsWith("41")`). Prova: a família `regime_imoveis` **foi acionada** (2 riscos no banco: `regime_especifico_imoveis` + `risco_art_269_270`), apesar de `op:servicos`. | ⚠️ **Refutado como causa.** `op:servicos` é cosmético. A ausência dos outros 11 riscos **não** é causada por ele. |
| **CR-03** | Zero perguntas SOLARIS para CNAE 41/42/43/68 | Evidência empírica do Manus (queries no banco — 0 de 22). Mecanismo de filtro confirmado em código: `solaris-context-filter.ts:91` (`matchesCnaeDimension`) + `db.ts:1283-1285` (cnaeGroups null = universal; senão precisa casar). | ✅ **Confirmado** (evidência DB é do Manus; o filtro existe no código). |

**Conclusão da validação:** as "3 causas independentes e cumulativas" do Manus, sob verificação determinística, **colapsam em UMA causa-raiz real** + um bug latente irrelevante a este caso + um mislabel:

- **Causa-raiz real (única):** ausência da **camada setorial de construção civil** — não há ramo de inferência, categoria, pergunta nem requisito para ~10 dos 13 riscos.
- **CR-01:** bug real, porém **sem efeito** no caso (apenas risco de falso-positivo p/ SN — vale corrigir, mas não "destrava" os riscos do Dr. José).
- **CR-02:** descrição imprecisa do mecanismo — `op:servicos` é rótulo, não bloqueio.

---

## 1. Auto-auditoria das técnicas usadas (impact-tree)

| Passo | Técnica | Status | Evidência |
|---|---|---|---|
| 1 | ast-grep semântico | 🟡 parcial | grep textual + Read direto (ast-grep não reexecutado; padrões cobertos por grep dirigido) |
| 2 | dead-read (knip/ts-prune) | 🟡 manual | `taxRegime` rastreado manualmente até consumo (`normative-inference.ts:218/230`) — NÃO é dead-read |
| 3 | Issues pré-existentes (`gh`) | ✅ | #1235, #1236, #1277 (família imóveis); nenhuma cobre os 11 riscos faltantes |
| 4 | grep incluindo testes | 🟡 | não exaustivo (análise diagnóstica, não mudança de assinatura) |
| 5 | grep .sql/.md/.json | 🟡 | corpus validado pelo Dr. José (não re-grepado — autoridade jurídica) |
| 6 | PDF/email/templates | n/a | não aplicável (diagnóstico de cobertura) |
| 7 | snapshots .snap | n/a | sem mudança de shape neste doc |
| 8 | LOC reais antes de classificar | ✅ | ver §5 |
| 9 | ADRs + bump | ✅ | ver §7 (ADR-0025 categorias · FEAT-COB-01 · família regime_imoveis) |
| 10 | mapa writers/readers + consumers/producers | ✅ | ver §3 |
| 11 | auto-auditoria final | ✅ | ver §8 |

**Cobertura estimada do código de geração de risco:** 🟢 ~92% (os 2 caminhos de geração mapeados ponta-a-ponta; pendências de Passo 4/5 não afetam o diagnóstico).

---

## 2. Risco de regressão por gravidade

Esta análise é **diagnóstica** (não há mudança proposta para implementar agora). Os riscos abaixo aplicam-se ao **TO-BE** quando/se aprovado:

- 🔴 **Crítico:** adicionar categorias ao `Categoria` union (`risk-engine-v4.ts:46-71`) sem linha correspondente em `risk_categories` (DB) → risco cai em fallback "media"/"curto_prazo" e título genérico (Lição #88 — acoplamento engine/seed). Mitigado pelo fallback gracioso `Partial<Record>` (`:149`), mas semântica fica errada sem o seed.
- 🟡 **Visível:** corrigir CR-01 muda comportamento de construtoras **Simples Nacional** (passariam a NÃO receber riscos de imóveis). É correção, mas precisa de DoD discriminante (Lição #139): SN→exclui / lucro_real→inclui.
- 🟢 **Cosmético:** renomear `risco_art_269_270` (já há issue #1235) — fora de escopo aqui.

---

## 3. Consumers e producers reais (inventários canônicos)

### 3.1 Os DOIS caminhos de geração de risco (`generate-risks-pipeline.ts:96-117`)

```
generateRisksV4Pipeline(projectId, gaps, actorId)
 ├─ Path A: consolidateRisks(gaps, context, ...)      → riscos a partir de GAPS (Onda 1 SOLARIS + RAG)
 │     fonte: solaris / regulatorio / cnae / ncm / nbs / iagen
 └─ Path B: inferNormativeRisks(projectId, profile)   → riscos a partir do PERFIL (CNAE/NCM/regime/pagamento)
       fonte: inferred
 → mergeByRiskKey → enrichWithRag → persist
```

### 3.2 Producer de perfil (input do Path B)

| Producer | `arquivo:linha` | Observação |
|---|---|---|
| `extractProjectProfile` | `project-profile-extractor.ts:112-210` | SELECT `:117-130` **sem** `companyProfile` → `taxRegime` lido só da coluna raiz (`:190`) = **null** no caso |

### 3.3 Consumers de `profile.taxRegime` (prova de que NÃO é dead-read)

| Consumer | `arquivo:linha` | Efeito no caso construção |
|---|---|---|
| crédito presumido | `normative-inference.ts:218` (`=== "lucro_real"`) | irrelevante (exige CNAE atacadista) |
| regime imóveis (gate) | `normative-inference.ts:230` (`!== "simples_nacional"`) | `null` **passa** → riscos de imóveis disparam |
| consolidateRisks (filtro CGIBS-SN) | `generate-risks-pipeline.ts:103` | passthrough |

### 3.4 Ramos setoriais de construção HOJE existentes (Path B)

| Ramo | `arquivo:linha` | Gate | Cobre risco Dr. José |
|---|---|---|---|
| `isRegimeImoveisOportunidade` (50%) | `regime-imoveis-eligibility.ts:38` / disparo `normative-inference.ts:232` | CNAE 4120/4110/4121 + 6810-2/01 + 6821-8/01 | oportunidade (não está nos 13, é benefício) |
| `isRegimeImoveisLocacao` (70%) | `:50` / `:241` | CNAE 6810-2/02 | n/a construtora |
| `isRegimeImoveisRisco` (CIB/empreend.) | `:58` (`startsWith("41")`) / `:250` | CNAE 41xx | **#5, #6, #7** (parcial, conf 0.64) |

### 3.5 Filtro de perguntas SOLARIS (Path A)

| Mecanismo | `arquivo:linha` | Regra |
|---|---|---|
| `filterSolarisByContext` / `matchesCnaeDimension` | `solaris-context-filter.ts:61-95` | `cnaeGroups` null/[] = universal; senão precisa casar o CNAE |
| `db.getOnda1Questions` | `db.ts:1283-1285` | idem (universal vs match) |

→ Como **0 perguntas têm cnaeGroups 41/42/43/68** (evidência Manus), só as **12 universais** se aplicam → só gaps/riscos **transversais**.

---

## 4. Árvore de impacto (por que cada risco do Dr. José aparece ou não)

```
CONSTRUTORA VII (CNAE 4120, lucro_real, op:servicos, NBS construção)
│
├─ Path B inferNormativeRisks (perfil → risco)
│   ├─ isRegimeImoveisRisco(41xx)=TRUE  → risco_art_269_270        ✅ GERADO (cobre #5,#6,#7 parcial)
│   ├─ isRegimeImoveisOportunidade=TRUE → regime_especifico_imoveis ✅ GERADO (oportunidade 50%)
│   ├─ hasPaymentTrigger?                → split_payment             ✅ (transversal)
│   ├─ aliquota_zero (alimentar)?        → não (CNAE não-alimentar)  ⬚
│   ├─ credito_presumido (atacad+LR)?    → não (CNAE não-atacadista) ⬚
│   └─ [NÃO EXISTE ramo p/ Redutor/SINTER/permuta/parcelas/custos/contrapartidas/recálculo/contratos] ❌
│
└─ Path A consolidateRisks (gaps SOLARIS+RAG → risco)
    ├─ perguntas universais (12) → gaps transversais →
    │     confissao_automatica / inscricao_cadastral / obrigacao_acessoria /
    │     regime_diferenciado / transicao_iss_ibs                    ✅ (transversais, conf 0.97)
    └─ perguntas setoriais construção (cnaeGroups 41/42/43/68) = 0  → ❌ zero gaps setoriais
```

**Mapa dos 13 riscos do Dr. José → estado na plataforma** (refinando o Gap Analysis do Manus com base legal do PDF):

| # | Risco (Dr. José) | Artigo | Estado plataforma | Mecanismo da ausência |
|---|---|---|---|---|
| 1 | Perda de créditos IBS / gestão da obra | Art. 365 | ⚠️ parcial (via `risco_art_269_270`) | sem categoria própria; Art. 365 não cableado |
| 2 | Perda do Redutor de Ajuste | Arts. 260-268 | ❌ ausente | sem ramo/categoria/pergunta |
| 3 | SINTER (avaliação imóveis) | regulam. SINTER | ❌ ausente | sem ramo/categoria/pergunta |
| 4 | Venda por permuta | Arts. 251-270 | ❌ ausente | sem ramo/categoria/pergunta |
| 5 | Controle por empreendimento | Arts. 269-270 | ⚠️ parcial (`risco_art_269_270` conf 0.64) | coberto pelo único ramo |
| 6 | Documentação fiscal da obra | Art. 365 | ⚠️ parcial (idem) | sem categoria própria |
| 7 | CIB | Arts. 269-270 | ⚠️ parcial (idem) | coberto pelo único ramo |
| 8 | Custos históricos < 2027 | Arts. 260-268 | ❌ ausente | sem ramo/categoria/pergunta |
| 9 | Contrapartidas urbanísticas | Arts. 260-268 | ❌ ausente | sem ramo/categoria/pergunta |
| 10 | Recálculo posterior do IBS | Arts. 260-268 | ❌ ausente | sem ramo/categoria/pergunta |
| 11 | Tributação por parcelas | Arts. 251-270 | ❌ ausente | sem ramo/categoria/pergunta |
| 12 | Revisão de contratos (SPE/SCP/...) | Arts. 251-270 | ❌ ausente | sem ramo/categoria/pergunta |
| 13 | Risco tecnológico (ERP) | Arts. 269-270 | ⚠️ genérico (`obrigacao_acessoria`) | sem categoria setorial |

**Resumo:** 3 parciais (#5/#6/#7) + 1 genérico (#13) + 1 oportunidade (50%) cobertos pelo único ramo existente; **8 completamente ausentes**.

---

## 5. Cirurgia possível? (escopo mínimo vs amplo) — LOC reais (Passo 8)

| Arquivo | LOC | Papel no TO-BE |
|---|---|---|
| `project-profile-extractor.ts` | 210 | CR-01 (1 linha + SELECT) |
| `regime-imoveis-eligibility.ts` | 137 | home natural dos novos gates setoriais |
| `normative-inference.ts` | 271 | novos ramos de inferência |
| `risk-engine-v4.ts` | 753 | `Categoria` union + (opcional) SEVERITY/TÍTULO |
| `generate-risks-pipeline.ts` | 133 | orquestração (sem mudança) |
| `solaris-context-filter.ts` | 102 | filtro (sem mudança; perguntas vêm do DB) |

- **CR-01 isolado:** Classe **A** (≤50 LOC, 1 arquivo + SELECT). Independente, mas **não resolve** os riscos do Dr. José.
- **Camada setorial completa:** Classe **C** (novo subsistema: ~7 categorias DB + ~3-8 ramos de inferência OU requisitos+perguntas + curadoria jurídica + testes + ADR). Cross-cutting (DB + engine + questionário + RAG-grounding).

---

## 6. AS-IS em camadas (com citações)

1. **Extração de perfil:** `extractProjectProfile` lê `taxRegime` só da coluna raiz (`project-profile-extractor.ts:190`); coluna está `null` (regime real em `companyProfile.taxRegime`). Bug simétrico ao já corrigido em `routers-fluxo-v3.ts:5148-5157` (BUG-REGIME-FILTER-01).
2. **Inferência normativa (Path B):** só a família `regime_imoveis` é setorial-construção (`normative-inference.ts:227-258`), gated por CNAE (`regime-imoveis-eligibility.ts:38/50/58`). Não há ramo para Redutor de Ajuste (Arts. 260-268), SINTER, permuta, parcelas, custos históricos, contrapartidas, recálculo, contratos.
3. **Taxonomia de risco:** `Categoria` é union fechada de 23 valores (`risk-engine-v4.ts:46-71`) + `risk_categories` no DB (`getRiskCategories`, ADR-0025). Categorias setoriais de construção (`redutor_ajuste`, `sinter_avaliacao`, `permuta_imobiliaria`, `tributacao_parcelas`, `custos_historicos_2027`, `contrapartidas_urbanisticas`, `contratos_construcao`) **não existem**.
4. **Questionário (Path A):** perguntas SOLARIS filtradas por `cnaeGroups` (`solaris-context-filter.ts:61-95`); **0 perguntas** com grupo 41/42/43/68 (evidência DB Manus) → só gaps transversais.
5. **Breadcrumb:** `::op:servicos::` é rótulo de `buildRiskKey` (`risk-engine-v4.ts:363`), não influencia ativação setorial.
6. **RAG/corpus:** validado 100% pelo Dr. José — Arts. 251-270, 269-270 e 365 existem; faltam estar **cabeados** à inferência/categoria.

---

## 7. TO-BE com fases (F0-F4) + bump ADR

> Princípio (Lição #66/#88): cada fase declara verificação de dados + acoplamento de engine. Curadoria jurídica é dependência explícita, não "TODO".

### F0 — Correção independente CR-01 (Classe A, sem nova feature)
- `extractProjectProfile`: incluir `companyProfile` no SELECT + fallback `row.taxRegime ?? safeParseObject(row.companyProfile)?.taxRegime ?? null` (`project-profile-extractor.ts:190`).
- **DoD discriminante (REGRA-ORQ-47/Lição #139):** construtora **lucro_real**→inclui imóveis (igual hoje) · construtora **Simples Nacional**→**exclui** (hoje gera falso-positivo) · sem regime→documentado.
- **Nota honesta:** F0 **não** faz aparecer nenhum dos 8 riscos ausentes; corrige só o falso-positivo SN. Tratar como higiene, não como "destravar Dr. José".

### F1 — Taxonomia setorial (DB-first, requer aprovação P.O. + curadoria jurídica)
- Criar categorias em `risk_categories` (DB, ADR-0025) — NÃO hardcode: `redutor_ajuste`, `sinter_avaliacao`, `permuta_imobiliaria`, `tributacao_parcelas`, `custos_historicos_2027`, `contrapartidas_urbanisticas`, `contratos_construcao` (+ avaliar `gestao_obra_creditos` p/ Art. 365 como categoria própria).
- Adicionar os mesmos códigos ao `Categoria` union (`risk-engine-v4.ts:46-71`) — necessário p/ tipagem TS (Lição #88).
- **bump ADR-0025:** MINOR (aditivo — novas categorias configuráveis, não invalida existentes).

### F2 — Gates de elegibilidade setorial (extensão de `regime-imoveis-eligibility.ts`)
- Novas funções puras CNAE/perfil-based (mesmo padrão `isRegimeImoveis*`): redutor de ajuste (incorporação/construção própria), permuta, parcelas, contrapartidas, custos históricos.
- **Decisão de design (P.O.):** vários desses riscos dependem de **fatos do negócio** (a empresa faz permuta? tem SPE? recebe parcelado?) que CNAE não revela → exigem **perguntas** (F3), não só gate CNAE. Caso contrário, geram falso-positivo para toda construtora.

### F3 — Perguntas SOLARIS setoriais (requer curadoria jurídica — `mappingReviewStatus`)
- Criar ~8 perguntas com `cnae_groups=["41","42","43","68"]` + `lei_ref`/`artigo_ref` validados (Lição #61, REGRA-ORQ-29) cobrindo: CIB, custos históricos, permuta, SPE/SCP, parcelas, contrapartidas, ERP/centro de custo, avaliação imobiliária (SINTER).
- Cada pergunta → requisito → gap → risco (cadeia inviolável, Content Engine Rule #3).
- **bump:** sem ADR novo (usa infra existente `solaris_questions` + gate `mappingReviewStatus`).

### F4 — Ramos de inferência + grounding determinístico
- Adicionar ramos em `normative-inference.ts` (perfil/resposta → risco) OU via cadeia requisito→gap (F3), citando Arts. 260-268 / 365 / SINTER.
- Injeção determinística de grounding no briefing (padrão `buildRegimeImoveisRestriction`, `regime-imoveis-eligibility.ts:70`).
- **DoD negativo por consumer crítico (REGRA-ORQ-44):** construtora→gera os novos riscos; não-construtora→NÃO gera (sem falso-positivo cross-setor).

**Sequência recomendada:** F0 (já) → F1+F3 (juntas, dependem de curadoria) → F2/F4. F0 é independente; F1-F4 são o subsistema Classe C.

---

## 8. Auto-auditoria final (tabela de cobertura)

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | §0, §3, §6 |
| Incluí testes no grep | 🟡 | parcial (diagnóstico, não mudança de assinatura) |
| Incluí .sql/.md/.json | 🟡 | corpus validado por Dr. José; risk_categories via DB (Manus) |
| Verifiquei PDF/email | n/a | não aplicável |
| Issues pré-existentes consultadas | ✅ | #1235/#1236/#1277 (família imóveis); nenhuma p/ os 8 ausentes |
| ast-grep ≥3 padrões | 🟡 | grep dirigido + Read (ast-grep não reexecutado) |
| Dead-read check | ✅ | `taxRegime` consumido em `:218/:230` (NÃO dead-read) |
| LOC reais antes de classificar | ✅ | §5 |
| ADRs + bump declarado | ✅ | ADR-0025 MINOR (F1) |
| Mapa writers/readers | ✅ | §3 |
| Inventário consumers/producers | ✅ | §3 |
| **Cobertura total estimada** | 🟢 ~92% | refutação CR-01/CR-02 + confirmação CR-03 |

---

## 9. Pendências para Manus (evidência empírica — "sem empirismo" pelo Claude)

1. **Confirmar contagem de ramos de inferência:** `SELECT DISTINCT categoria FROM risks_v4 WHERE project_id=10680001` (esperado: as 8 categorias do relatório).
2. **DoD discriminante de CR-01 (F0):** criar projeto construtora **Simples Nacional** greenfield → confirmar que HOJE recebe `risco_art_269_270`/`regime_especifico_imoveis` indevidamente (falso-positivo); pós-F0, NÃO recebe. (REGRA-ORQ-34 Protocolo 1 — greenfield.)
3. **Curadoria jurídica (Dr. José):** validar `lei_ref`/`artigo_ref` das ~8 perguntas F3 e dos códigos de categoria F1 antes de qualquer seed (gate `blocked-legal-gate`).
4. **Corpus:** confirmar que Arts. 260-268 (Redutor de Ajuste) e SINTER têm chunks recuperáveis para grounding determinístico (F4).

---

## Vinculadas

- **Manus:** Auditoria Determinística Construção Civil 27/06/2026 (`AUDITORIA-CONSTRUCAO-CIVIL.pdf` / `.md`); PDF Dr. José `Principaisriscosparaumaconstrutora.pdf`.
- **Regras:** REGRA-ORQ-41 (impact-tree) · REGRA-ORQ-27 (assemble≠consumption) · REGRA-ORQ-29/32 (no hardcode / sem requisito) · REGRA-ORQ-44/47 (DoD negativo/discriminante) · ADR-0025 (categorias configuráveis) · FEAT-COB-01 #1176 (regime imóveis).
- **Lições:** #59 · #61 · #65 · #66 · #88 (acoplamento engine) · #93 (mecanismo verificado) · #133 (cnaeGroups camada interpretativa) · #139 (DoD discriminante) · #140 (dual-storage taxRegime) · #142 (severidade pelo runtime).
- **Issues relacionadas:** #1235 (rename `risco_art_269_270`) · #1236 (filtro briefingEngine) · #1277 (cnae locação) · BUG-REGIME-FILTER-01 (`routers-fluxo-v3.ts:5148`).
- **Código:** `project-profile-extractor.ts:190` · `normative-inference.ts:218/230/227-258` · `regime-imoveis-eligibility.ts:38/50/58/70` · `risk-engine-v4.ts:46-71/149/363` · `generate-risks-pipeline.ts:96-117` · `solaris-context-filter.ts:61-95` · `db.ts:1283-1285`.
