# AS-IS / TO-BE — Filtro por Regime Tributário no Questionário SOLARIS (1ª Onda)

**Decisão formal:** ADR-0038 · **HEAD:** `9ab44e62` · **Classe C** (REGRA-ORQ-41) · **Solicitante:** Dr. José Swami Rodrigues
**Origem:** consolidação do levantamento (memo + análise de código Claude Code + parecer Consultor D-A/D-B/D-C, despacho v89)

## 1. Demanda
Além do CNAE, exibir pergunta SOLARIS Onda 1 conforme o **regime tributário** do projeto (Simples Nacional / Lucro Presumido / Lucro Real), informado em `/projetos/novo`. As decisões D1-D5 estão na ADR-0038.

## 2. AS-IS (verificado, `arquivo:linha`)
A regra de exibição da Onda 1 é **só por CNAE** (`cnae_groups`):
- **Caminho LIVE:** `QuestionarioSolaris.tsx:184` → `trpc.fluxoV3.getOnda1Questions` (`routers-fluxo-v3.ts:5000`) → `db.getOnda1Questions(primaryCnae)` (`server/db.ts:1367,1391-1397`).
- Regra: `cnae_groups` null/vazio → universal; senão match bidirecional `cnaeCode.startsWith(g) || g.startsWith(cnaeCode)`.
- **Filtro duplicado em 4 lugares** (anti-padrão Lição #137): `db.getOnda1Questions:1391`, `db.getSolarisQuestions:1285`, `onda1Injector.getOnda1Questions:55`, `querySolarisByCnaes:79` (este morto p/ q_solaris — airbag #1035).
- **Sem coluna de regime** em `solaris_questions` (só `cnae_groups`, `schema.ts:1692`).
- **Fonte do regime:** `projects.taxRegime` (coluna top-level `schema.ts:89`, 3 valores, nullable), gravada por `createProject` (`db.ts:420`) ← `NovoProjeto.tsx:283`. Também em `companyProfile.taxRegime` (JSON) — dual-storage; usar a coluna.

### Gate determinístico existente
`getOnda1Questions` só exibe `mapping_review_status ∈ {curated_internal, approved_legal}` (`db.ts:1382`) — perguntas novas de regime entram por aqui (curadoria, REGRA-ORQ-29).

## 3. TO-BE (resumo — detalhe na ADR-0038)
Regra de 2 dimensões com **AND + fallback (3 estados)** (D1):
```
exibe SE (cnae_groups NULL/[] OU casa CNAE)  E  (tax_regimes NULL/[] OU contém o regime)
  CNAE ausente OU genérico/fallback (V-10) → ignora dimensão CNAE (só regime)
```
- Coluna `tax_regimes` **extensível** (JSON array; D2 — MEI fora de escopo de produto, não de lei) em `solaris_questions`.
- **Helper único** `filterSolarisByContext({cnae, regime})` (D5) consumido por C1/C3/C4 — encerra a duplicação dos 4 filtros.
- Backfill `tax_regimes = NULL` (universal) → zero regressão.
- Curadoria via Admin (D3, Dr. José) + import CSV (F6).

## 4. Consumers / Fases / Riscos / DoD
Ver ADR-0038 (§Consumers, §Fases F0-F6, §Riscos, §DoD).

## 5. Decisões pendentes — RESOLVIDAS (despacho v89)
| # | Decisão | Veredito |
|---|---|---|
| D1 | Semântica | **AND + fallback 3 estados** (D-C) |
| D2 | MEI | **fora de escopo de produto** (extensível; pg. 7/10/14-15/41/43/111/114-115 LC214) (D-B) |
| D3 | Quem preenche | P.O./jurídico (Admin) |
| D4 | Campo | `tax_regimes` |
| D5 | Helper único | `filterSolarisByContext` |

## 6. Auto-auditoria (impact-tree)
✅ AS-IS com `arquivo:linha` · ✅ consumers (C1-C5) · ✅ fonte do regime confirmada (coluna populada) · ✅ 4 filtros duplicados mapeados · ✅ decisões fechadas (D1-D5) · 🟡 dual-storage `taxRegime` (col vs companyProfile JSON) — usar a coluna, confirmar PF/antigos na F4. Cobertura ~92%.

---
*Direção formal: ADR-0038. Implementação F1-F6 só após ADR-0038 mergeado (P.O. aprovou via despacho v89).*
