# GATE-NCM-NBS #1219 — Análise Profunda v5

**AS-IS / TO-BE / Impacto / Consumers / Producers / Motor / UX / Riscos / Evidência**
**Status:** ANÁLISE — sem despacho, sem implementação. **Data:** 2026-06-14. **HEAD:** `fbefed4c`.
**Classe:** C (cross-cutting). **Autores:** Claude Code, incorporando crítica determinística do Manus à v3/v4.

### Mudanças v4 → v5 (incorporação da crítica Manus)
1. 🔴 **F9 retratado** — `deriveObjetoFromNcm` com grupo cai em fallback **genérico** (`bens_mercadoria_geral`) *antes* de `extractNcmChapter`. A "robustez" do helper é irrelevante (verificado `deriveObjeto.ts:188-224`).
2. 🔴 **CC-1/F10 retratado** — mesmo mecanismo no NBS: `servico_geral` antes de `extractNbsDivisao` (`deriveObjeto.ts:238-306`). Minha resolução anterior ("robusto p/ `1.XXXX`") estava **errada**.
3. **`deriveObjeto` reclassificado** — é governado por `lookupNcm`/`lookupNbs` (Decision Kernel exato) → **parte do C3**, não impact-free.
4. **+3 consumers** (Manus OM-3/4/5): C7 `buildPerfilEntidade`, C8 `completeness`(Score Q3), C9 `diagnostic-consolidator`. Total **9**.
5. **Score reclassificado** — TEM mudança (Q3 calibração). Corrige contradição §10↔§4 da v3 (Manus ERRO-3).
6. **Regex truncation** (`extractNcmsFromContext` 8→6 díg.) elevado a **issue de backlog separada** (afeta RAG Pass 3 de TODOS os projetos).
7. **PR-0 = 4 gates** — minha v4 já tinha 4 incl. **backend `validateM1Input`** (que a crítica Manus não listou — só achou 2). Mantido.

---

## §1 — Verdades estabelecidas (F1–F17)

| # | Fato | Fonte | Status |
|---|---|---|---|
| F1 | `ncm-dataset.json` = 669 linhas / ~24 entradas curadas | `wc` | ✅ (Manus concorda) |
| F2 | `nbs-dataset.json` = 580 linhas / ~19 entradas | `wc` | ✅ |
| F3 | `tabela_ncm_completa.txt` = 25.855 linhas (corpus bruto) | `find` | ✅ |
| F4 | `normative_product_rules`: 26 rows (22 prefix + 4 exact) | SQL prod | ✅ (Manus confirmou) |
| F5 | `normative_service_rules`: 27 rows (todas prefix, 7 regimes) | SQL prod | ✅ (Manus confirmou) |
| F6 | 0 de 1.095 projetos têm NCM/NBS preenchido | SQL prod | ✅ (Manus: arrays vazios) |
| F7 | `isValidNcmFormat` `^\d{4}\.\d{2}\.\d{2}$` rejeita grupo | `ConfirmacaoPerfil.tsx:494` | ✅ |
| F8 | IS usa `digits.startsWith(p)` prefixos 2 díg. | `risk-eligibility-is-ncm-cnae.ts:96` | ✅ |
| F9 | ⚠️ **CORRIGIDO**: `deriveObjetoFromNcm` com grupo → **fallback `bens_mercadoria_geral`** (linha 200-208) **antes** de `extractNcmChapter` (linha 213). `extractNcmChapter` em si é robusto, mas **nunca é alcançado** p/ grupo | `deriveObjeto.ts:188-224` | ✅ retificado |
| F10 | ⚠️ **CORRIGIDO** (era "lacuna"): `deriveObjetoFromNbs` com grupo → **fallback `servico_geral`** (linha 284-291) ou `servico_financeiro` (regulado, 273-282) **antes** de `extractNbsDivisao` (linha 295) | `deriveObjeto.ts:238-306` | ✅ retificado |
| F11 | Bug #827: arrays vazios → `eligible=true, reason="ncm_cnae_ausentes"` — **causa do FP 5040001** | `risk-eligibility-is-ncm-cnae.ts:127-132` | ✅ |
| F12 | Chave JSON: `principaisProdutos[].ncm_code` | `routers-fluxo-v3.ts:5587,5734,6384` | ✅ |
| F13 | `normative-inference` suporta `exact\|prefix` **per-rule** (binário); **cascata está nos DADOS, não no código** | `normative-inference.ts:90-98` | ✅ (Manus ressalva C6) |
| F14 | `fetchNcmCandidates` falha silenciosa só em **erro de DB / zero NCMs** (não em input de grupo) | `rag-retriever.ts:445,448,479-481` | ✅ (Manus precisou) |
| F15 | Pesos 1.0/0.7/0.4/0.2 sem base empírica | crítica N2.4 | ✅ |
| F16 | **Bloqueador de formato em 4 pontos, incl. BACKEND** (§4) | 4 arquivos | ✅ (v4 — Manus achou 2/4) |
| F17 | `extractNcmsFromContext` regex `/\b\d{4}(?:\.\d{2})?\b/g` **trunca 8→6 díg.** (extrai `"8436.99"` de `"8436.99.00"`); usa **`LIKE`, não FULLTEXT** (TiDB não suporta — `rag-retriever.ts:4`) | `rag-retriever.ts:423` | ✅ (Manus OMISSÃO-2 + ERRO-2) |

---

## §2 — AS-IS

### 2.1 Os 4 matchers — granularidades reais

| Subsistema | Arquivo:linha | Granularidade real | Grupo (4 díg.) |
|---|---|---|---|
| Decision Kernel (`lookupNcm`/`lookupNbs`) | `ncm-engine.ts:112-115` (find exato) | **EXATO** 8/9 díg. | **Fallback genérico** (NCM conf.60 / NBS conf.55) |
| Gate IS | `risk-eligibility-is-ncm-cnae.ts:89-99` | **PREFIXO 2 díg.** | Grupo **casa** (`"2402"`→`"24"`) |
| Injeção Art.197 | `art197-injection.ts:34` | `startsWith("8436")` | Grupo `"8436"` **casa** |
| Normative Inference | `normative-inference.ts:90-98` | `exact\|prefix` per-rule (sem hierarquia) | Casa se houver regra de prefixo; senão falha |

> **Não existe resolver de cascata.** A "cascata" do Decision Kernel não existe — é match **exato** que cai em fallback genérico. No Normative Inference, a cascata está **implícita nos dados** (regras de prefixos variados), não no código.

### 2.2 ⚠️ Causa-raiz do FP 5040001 (corrigida na v4, mantida)
Não é over-match de capítulo (`"2306"/"2304"` → `"23"`, fora de `{22,24,26,27,87,88,89}`). É **F11** (arrays vazios → permissivo). DoD do IS deve travar ambos os modos de over-permissividade.

### 2.3 Consumers reais (lista canônica — **9**)

| # | Consumer | Arquivo:linha | Impacto c/ grupo |
|---|---|---|---|
| C1 | Q.Produto | `product-questions.ts:60-66,164-181` | 🟡 MÉDIO — RAG já ~4-6 díg. (F17); muda recall |
| C2 | Q.Serviço | `service-questions.ts:59-65,87-106` | 🟡 MÉDIO |
| C3 | Decision Kernel / Gaps | `engine-gap-analyzer.ts:79-80` → `ncm-engine.ts:111-172` | 🔴 CRÍTICO — exato → fallback garantido |
| C4 | Gate IS | `risk-eligibility-is-ncm-cnae.ts:42-50,89-99` | 🔴 CRÍTICO — estreitar + travar F11 |
| C5 | Injeção Art.197 | `art197-injection.ts:31-36` | 🟡 MÉDIO — já opera como grupo; **manter separado** |
| C6 | Normative Inference | `normative-inference.ts:82-99` | 🟢 BAIXO — prefix per-rule |
| **C7** | **`buildPerfilEntidade`** (orquestra deriveObjeto) | `buildPerfilEntidade.ts:80-88` | 🔴 CRÍTICO — grupo → `bens_mercadoria_geral`/`servico_geral` + blocker V-10-FALLBACK acumulado (via F9/F10) |
| **C8** | **`completeness` (Score Q3)** | `completeness.ts:226-232` | 🟡 MÉDIO — `ncmCodesCount>0 → "completo"`: **grupo conta como completo sem distinção de qualidade** |
| **C9** | **`diagnostic-consolidator`** | `diagnostic-consolidator.ts:454,477,487` | 🟢 BAIXO — usa `ncm_code`/`nbs_code` só p/ prefixar pergunta |

**Não-consumers de granularidade:** Crédito Presumido, Alíquota Reduzida Art.127, Regime Imóveis (CNAE/questionário); Briefing/PDF/Plano (herdam).

> **C7 é o elo perdido da v4:** `deriveObjeto` não é impact-free — é governado por `lookupNcm`/`lookupNbs` (= C3). Com grupo, `buildPerfilEntidade` acumula `bens_mercadoria_geral`/`servico_geral` genéricos → arquétipo degradado.

---

## §3 — PRODUCERS / READERS (Lição #65)

| Dado | Producer(s) | Reader(s) | Nota |
|---|---|---|---|
| `principaisProdutos[].ncm_code` | M1PerfilEntidade / ConfirmacaoPerfil / PerfilEmpresaIntelligente | C1,C3,C4,C5,C6,C7,C8,C9 | F6: 0 projetos hoje → caminho **nunca exercido** |
| `normative_product_rules` | seed cap23 (26) | C6 | — |
| `normative_service_rules` | seed service (27) | C6 (NBS) | confirmar reader NBS ativo |
| `ncm-dataset.json`/`nbs-dataset.json` | curadoria manual | C3, C7 (via lookup) | exato-only |

---

## §4 — UX: bloqueador em **4 gates** (F16)

| # | Gate | Arquivo:linha | Tipo | PR-0 |
|---|---|---|---|---|
| 1 | `isValidNcmFormat` | `ConfirmacaoPerfil.tsx:494` | Frontend | ✅ |
| 2 | `NCM_REGEX`/`NBS_REGEX` + msgs | `M1PerfilEntidade.tsx:128-129,158-167` | Frontend | ✅ |
| 3 | `NCM_REGEX`/`NBS_REGEX` | **`validateM1Input.ts:18-19` (BACKEND, fonte de verdade)** | Backend | ✅ |
| 4 | `isValidNcm`/`isValidNbs` (M2) | `PerfilEmpresaIntelligente.tsx:789,791` | Frontend | ✅ (Manus OMISSÃO-1 confirmou) |

> `validateM1Input.ts:124-125`: *"backend é fonte de verdade"* + *"Decisão P.O. C2/C3: P0 valida formato (regex)"*. Relaxar 1 gate não desbloqueia (Lição #74). PR-0 = **4 gates** (constante regex compartilhada) + reabrir Decisão P.O. C2/C3.

---

## §5 — Schema

```sql
ALTER TABLE normative_product_rules ADD COLUMN resolution_level ENUM('specific','group','chapter','fallback') DEFAULT 'specific';
ALTER TABLE normative_service_rules ADD COLUMN resolution_level ENUM('specific','group','chapter','fallback') DEFAULT 'specific';
ALTER TABLE risks_v4              ADD COLUMN resolution_level ENUM('specific','group','chapter','fallback') DEFAULT NULL;
```
Sem CREATE. Confirmar via M-1 que `resolution_level` não existe e que `risks_v4` aceita o ENUM (Lição #64).

---

## §6 — Riscos

| # | Risco | Sev. | Mitigação |
|---|---|---|---|
| R1 | DoD IS invertido (devolutiva Manus testava grupo "não casa") | 🔴 CRÍTICO | grupo **casa** hoje; fix estreita via resolver; testar 5040001 (F11) |
| R2 | Resolver quebra IS/Art.197 ao unificar 4 semânticas | 🔴 CRÍTICO | DoD negativo antes de PR-3 |
| R3 | RAG Pass 3 com grupo → **over-matching** (`LIKE %8436%`), não `[]` | 🟡 MÉDIO | smoke greenfield mede precisão |
| R4 | **`deriveObjeto` com grupo → genérico** (F9/F10), arquétipo degradado | 🔴 ALTO (era 🟢) | resolver deve resolver grupo→regra antes do `lookupNcm` exato |
| R5 | Pesos de confiança sem calibração | 🟡 MÉDIO | placeholder |
| R6 | Curadoria caminho crítico — 26+27 regras vs 98% | 🔴 ALTO | issue separada com volume |
| R7 | BUG-RERANKER-NCM #1276 | 🟡 MÉDIO | known issue |
| R8 | Chave `.ncm` vs `.ncm_code` | 🟢 RESOLVIDO (F12) | — |
| R9 | Art.197 multifatorial (não NCM-only) | 🔴 ALTO | manter `art197-injection.ts` separado |
| R10 | PR-0 incompleto (4 gates) | 🔴 CRÍTICO | tocar os 4 + reabrir Decisão P.O. C2/C3 |
| R11 | 0 projetos exercidos (F6) | 🔴 ALTO | smoke greenfield E2E |
| **R12** | **Regex `extractNcmsFromContext` trunca 8→6** — RAG Pass 3 nunca busca NCM completo (afeta **TODOS** os projetos) | 🟡 MÉDIO | **issue de backlog separada** (independe de #1219) |
| **R13** | **Score Q3 marca grupo como "completo"** sem distinção de qualidade (C8) | 🟡 MÉDIO | calibrar Q3: grupo = cobertura parcial |

---

## §7 — Regras determinísticas (DoD negativo)

| Regra | Proteção |
|---|---|
| IS só injeta se NCM ∈ Art.393§1º | `NCM 2306.10.00 + CNAE não-92 → NÃO elegível` |
| IS não injeta com NCM/CNAE ausente (F11/#827) | `NCM=[] + CNAE não-92 → NÃO elegível` |
| Art.197 = CNAE 28 + NCM `8436.*` + destinatário PF não contribuinte | manter multifatorial |
| Específico (8/9) obrigatório p/ cesta básica (Anexo I) e IS | gate específico em F3 |
| `deriveObjeto` não deve degradar grupo a genérico | resolver popula regra de grupo antes do `lookupNcm` exato (R4) |
| `normative-inference` não regredir prefix | manter `match_mode` table-driven |

---

## §8 — TO-BE (fases)

| PR | Entrega | Bloq.? | DoD |
|---|---|---|---|
| PR-0 | Relaxar **4 gates** (F16) → 4/6/8 díg. + reabrir Decisão P.O. C2/C3 | SIM | `"8436"` aceito nos 4 (incl. backend); `"abc"` rejeitado |
| PR-1 | `ncm-nbs-resolver.ts` central (específico→grupo→capítulo→fallback) **encapsulando `lookupNcm`/`lookupNbs`** | SIM | cascata OK; IS não regride; Art.197 preservado; **`deriveObjeto` resolve grupo→regra (R4)** |
| PR-2 | 3 ALTER + expandir regras | SIM | migration reversível; ENUM aceito por `risks_v4` |
| PR-3 | Integração C1/C2/C3/C4/C6/C7/C8 | SIM | **smoke greenfield PASS**; 5040001 não regride; Score Q3 calibrado |
| PR-4 | Frontend badges | NÃO | — |
| PR-5 | DELETE projetos | NÃO (indep.) | verificar CASCADE (M-3) |
| **B-1** | **Backlog: bug regex `extractNcmsFromContext` (R12)** | NÃO (indep. #1219) | regex extrai NCM completo 8 díg. |

---

## §9 — Produtos obrigatórios (checklists populadas)

### 9.1 Artefatos de Engenharia (impact-tree)
| Produto | Obrig.? | Status |
|---|---|---|
| Grep estrutural | ✅ | ✅ ast-grep + rg (4 matchers, 4 gates, 9 consumers) |
| Inventário de consumers | ✅ | ✅ §2.3 (**9** — após Manus OM-3/4/5) |
| Inventário de producers | ✅ | ✅ §3 |
| Fluxo E2E documentado | ✅ | ✅ §2; **runtime pendente (F6)** |
| Mapa de tabelas | ✅ | ✅ §2.1/§5 |
| Mapa de feature flags | ✅ | ⚠️ PENDENTE — propor `ENABLE_NCM_RESOLVER` no PR-1 (não existe) |
| Diagrama de dependência | ⚠️ | ⚠️ recomendado p/ PR-1 (depcruise sobre 4 matchers + deriveObjeto) |

### 9.2 Evidência / Validação
| Produto | Obrig.? | Alvo |
|---|---|---|
| Test Contracts | ✅ | `it.todo` resolver + DoD negativo IS (§7) + deriveObjeto grupo→regra |
| Smoke Test | ✅ | **greenfield** (F6) — projeto novo c/ NCM grupo `"8436"` |
| Query SQL | ✅ (DB) | M-1 (`SHOW COLUMNS`), M-3 (CASCADE), F4/F5 commitado (Lição #71) |
| Screenshot | ✅ (UX) | 4 gates aceitando grupo; badge de nível |
| JSON de evidência | ✅ | before/after `risks_v4.source_priority`+`resolution_level`; blocker V-10-FALLBACK |
| E2E | ✅ (fluxo) | perfil(grupo) → Q.Produto → gaps → riscos → briefing |

### 9.3 Jurídico / Normativo
| Produto | Obrig.? | Alvo |
|---|---|---|
| Fonte normativa | ✅ | LC 214/2025 |
| Artigos-base | ✅ | Art.393§1º (IS); Art.197 (máq. agrícolas); Art.125+Anexo I (cesta) |
| Artigos complementares | ✅ | Art.137 (red.60%); Art.58 (agro); Arts.31–35 (split) |
| Parecer jurídico | ✅ (tributário) | **Dr. José** — rol taxativo NCM grupo×específico + completude 26+27 regras |
| Normative bundle | ✅ | `normative_*_rules` (data-driven) |
| Vigência | ✅ | IBS/CBS 2026+; checar `vigencia_fim` |
| Exceções | ✅ | produtor rural PF não contribuinte (Art.197 — D0-JUR); NCM ausente (F11) |

---

## §10 — Lacunas (prompts)

### Claude Code — RESOLVIDAS
- ✅ CC-1 **(retratada)**: `deriveObjetoFromNbs` com grupo → `servico_geral` genérico (não robusto — F10).
- ✅ CC-2: RAG Pass 3 → `LIKE`, regex trunca 8→6, over-matching (F17/R12).
- ✅ CC-3: 4 gates de validação (F16/§4).

### Manus (SQL prod)
- M-1 `SHOW COLUMNS` nas 2 tabelas (confirmar ausência de `resolution_level`).
- M-2 `JSON_KEYS(...principaisProdutos[0])` (readers já usam `.ncm_code` — F12).
- M-3 CASCADE das FKs de `projects`.
- M-4 re-confirmar F4/F5/F6 com script commitado (Lição #71).

### Dr. José
- Completude do rol taxativo NCM (26 regras cobrem quanto da meta 98%?); suficiência das 27 NBS; vigência; exceções.

---

## §11 — Estimativa final

| Dimensão | Valor |
|---|---|
| PRs | PR-0..PR-4 + PR-5 (indep.) + B-1 (backlog R12) |
| Sprints (engenharia) | ~1.5 |
| Sprints (produto) | **Travado por curadoria jurídica — não dimensionado** |
| Classe | **C** |
| Schema | 3 ALTER |
| Consumers com mudança real | **7** (C1,C2,C3,C4,C6,**C7,C8**) |
| Consumers sem mudança | C9 (cosmético), Briefing/PDF/Plano (herdam) |
| **Score** | **TEM mudança (C8/Q3 calibração)** — corrige contradição da v3 |

> **Síntese v5:** Manus está certo em F9/F10 — `deriveObjeto` degrada grupo a genérico (fallback antes do chapter/divisão), logo é **consumer crítico (C7)**, não impact-free. Total de consumers sobe para **9**; com mudança real **7** (Score incluído). PR-0 mantém **4 gates** (v4 já tinha o backend que a crítica Manus não listou). Regex truncation vira **backlog independente (R12)**. Direção macro inalterada: híbrido + resolver central encapsulando o Decision Kernel + curadoria como caminho crítico + smoke greenfield (F6) como pré-condição.
