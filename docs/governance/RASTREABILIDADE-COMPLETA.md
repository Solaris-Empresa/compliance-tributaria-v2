# RASTREABILIDADE COMPLETA — IA SOLARIS

> **Central de rastreabilidade do projeto.** Audiência: P.O. · Orquestrador · Implementador.
> Versão: **v1.1** — 2026-03-31. Baseado em 577+ commits e 256 PRs mergeados.

---

## 1. Mapa de Sprints × PRs × Entregáveis

### Sprint M — UAT E2E + BUG-UAT-02/03/05 (2026-03-31)

| Checkpoint | PR | Commit | Arquivos Alterados | Testes | Status |
|---|---|---|---|
| BUG-UAT-03 fix: completeOnda2 | #254 | `199afc8` | `server/routers-fluxo-v3.ts` | Regressão adicionada | ✅ |
| auth.testLogin + guard E2E_TEST_MODE | #256 | `2f17184` | `server/routers.ts`, `server/e2e-testlogin.test.ts` | 8 unit tests | ✅ |
| BUG-UAT-05: DiagnosticoStepper hardcode | #256 | `2f17184` | `client/src/components/DiagnosticoStepper.tsx` | — | ✅ |
| E2E Playwright CT-01/04/06/07/37 | #256 | `2f17184` | `tests/e2e/`, `playwright.config.ts` | 5 suites Playwright | ✅ |
| SOL-013/014 soft-delete | — | — | Banco de dados (soft-delete `ativo=0`) | — | ✅ |
| Painel PO atualizado 2026-03-31 | #257 | — | `docs/painel-po/index.html` | — | ⏳ Aguarda merge |

### Sprint K — Fluxo 3 Ondas (2026-03-28)

| Checkpoint | PR | Commit | Arquivos Alterados | Testes | Status |
|---|---|---|---|---|---|
| K-4-A: Schema + State Machine | #176 | `d370932` | `drizzle/schema.ts`, `flowStateMachine.ts`, `server/db.ts` | 36 (T-K4A-01..08) | ✅ |
| K-4-B: QuestionarioSolaris + Stepper | #179 | `a3c8f4e` | `QuestionarioSolaris.tsx`, `DiagnosticoStepper.tsx`, `routers-fluxo-v3.ts` | 70 (T01..T10) | ✅ |
| K-4-B fix: VALID_TRANSITIONS | #181 | — | `flowStateMachine.ts` | — | ✅ |
| K-4-B fix: NovoProjeto navegação | #180 | — | `NovoProjeto.tsx` | — | ✅ |
| K-4-C: QuestionarioIaGen + Onda 2 | #182 | `b7fb1b4` | `QuestionarioIaGen.tsx`, `routers-fluxo-v3.ts` | 82 (T11..T14) | ✅ |
| K-4-D: Wiring etapas 7-8 + T06.1 | #184 | `e54d606` | `DiagnosticoStepper.tsx`, `ProjetoDetalhesV2.tsx`, `onda1-t06-t10.test.ts` | 36 (T06.1 fix) | ✅ |
| Docs: BASELINE v2.2 + HANDOFF v2.2 | #178 | — | `docs/BASELINE-PRODUTO.md`, `docs/HANDOFF-MANUS.md` | — | ✅ |
| Docs: FLUXO-3-ONDAS v1.1 | #174 | — | `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md` | — | ✅ |

### Sprint J — Bateria Avançada + UAT (2026-03-27)

| Checkpoint | PR | Entregável | Status |
|---|---|---|---|
| K-1: Tabela solaris_questions | #159 | Schema + helpers CRUD + 12 testes | ✅ |
| K-2: Pipeline Onda 1 (questionEngine) | #162 | ADR-011, onda1Injector | ✅ |
| K-3: Badge visual por onda + seed | #171 | SOL-001..012 seed, badge UI | ✅ |
| Admin: Taskboard P.O. ao vivo | #163 | `/admin/taskboard` | ✅ |
| Admin: Taskboard estático permanente | #172 | `/taskboard-po` | ✅ |

### Sprint I — Scoring Engine + UAT Gate (2026-03-27)

| Checkpoint | PR | Entregável | Status |
|---|---|---|---|
| B8: Scoring Engine | — | `scoringEngine.ts`, Score CPIE, 5 níveis | ✅ |
| Bateria Avançada 50 testes | — | 50/50 + 100 manuais — GO | ✅ |
| Suite UAT 12 itens | #144 | Gate técnico G1-G16, 25 testes | ✅ |
| GATE-CHECKLIST | — | `docs/GATE-CHECKLIST.md` | ✅ |

### Sprint H — RAG Cockpit (2026-03-27)

| Checkpoint | PR | Entregável | Status |
|---|---|---|---|
| RAG Admin Cockpit | #123 | `/admin/rag-cockpit`, painel de governança | ✅ |
| ragInventory endpoint | #131 | `ragInventory.getSnapshot` tRPC ao vivo | ✅ |
| Corpus RAG 2.078 chunks | #126 | RFC-001 + RFC-002 executadas | ✅ |
| Governança RAG | #130 | RAG-PROCESSO + RAG-RESPONSABILIDADES + HANDOFF-RAG | ✅ |

### Sprints A–G — Fundação (2026-03-23 a 2026-03-27)

| Sprint | PRs | Entregável Principal | Status |
|---|---|---|---|
| A: Fundação | #1–#20 | Schema inicial, auth, projetos, clientes | ✅ |
| B: Diagnóstico V1 | #21–#50 | Gap engine, risk engine, questionários | ✅ |
| C: Diagnóstico V3 | #51–#80 | Diagnóstico dual V1/V3, ADR-001..005 | ✅ |
| D: Corpus RAG | #81–#109 | DEC-002, G3/G4 Anexos LC214, 46 testes | ✅ |
| E: Fundamentação | #110 | G11 fundamentação auditável por item | ✅ |
| F: Prefill Contract | — | PCT v2, 81 testes, INV-001..008 | ✅ |
| G: Correções UX | #126–#134 | G13/G14 UX, RFC-001/002, BASELINE v1.7 | ✅ |

---

## 2. Rastreabilidade RF × PR × Sprint

| RF | Descrição | Sprint | PR | Status |
|---|---|---|---|---|
| RF-001 | Cadastro de projetos | A | #1–#5 | ✅ |
| RF-002 | Questionário Corporativo V2 | B | #30–#40 | ✅ |
| RF-003 | Questionário Operacional | B | #40–#50 | ✅ |
| RF-004 | Questionário CNAE | B | #50–#60 | ✅ |
| RF-005 | Gap Engine (identificação de gaps) | C | #60–#80 | ✅ |
| RF-006 | Risk Engine (matrizes de risco) | C | #80–#100 | ✅ |
| RF-007 | Plano de Ação | C | #100–#110 | ✅ |
| RF-008 | Corpus RAG (2.078 chunks) | D | #109 | ✅ |
| RF-009 | Fundamentação auditável por item | E | #110 | ✅ |
| RF-010 | Prefill Contract (pré-preenchimento) | F | — | ✅ |
| RF-011 | Scoring Engine (Score CPIE) | I | — | ✅ |
| RF-012 | RAG Cockpit (governança do corpus) | H | #123–#132 | ✅ |
| RF-013 | Questionário SOLARIS (Onda 1) | K | #159, #179 | ✅ |
| RF-014 | DiagnosticoStepper 8 etapas | K | #179, #184 | ✅ |
| RF-015 | Questionário IA Gen (Onda 2) | K | #182 | ✅ |
| RF-016 | Wiring etapas 7-8 (Matrizes + Plano) | K | #184 | ✅ |
| RF-017 | Upload CSV SOLARIS | L | #157 | ⏳ Backlog |
| RF-018 | Template CSV equipe jurídica | L | #158 | ⏳ Backlog |
| RF-019 | auth.testLogin (E2E guard) | M | #256 | ✅ |
| RF-020 | E2E Playwright CT-01/04/06/07/37 | M | #256 | ✅ |

---

## 3. Issues Abertas — Estado Atual

### Críticas (aguardam P.O.)

| Issue | Título | Risco | Bloqueio |
|---|---|---|---|
| #57 | Teste E2E Completo — Fluxo V1/V3 + Retrocesso | Crítico | ✅ Resolvido parcialmente (CT-37 no PR #256) |
| #56 | F-04 Separação Física de Colunas V1/V3 | Alto | Aprovação P.O. |
| #62 | ADR-009 Fase 4 — DROP COLUMN | Alto | Aprovação P.O. |

### Sprint L (próxima)

| Issue | Título | Labels |
|---|---|---|
| #152 | ÉPICO E6 — Upload CSV SOLARIS | `epic` |
| #157 | L-1: Tela de upload CSV | `frontend`, `backend`, `p.o.-valida` |
| #158 | L-2: Template CSV e docs jurídicas | `docs` |

### Débito Técnico

| Issue | Título | Impacto |
|---|---|---|
| #101 | 30 arquivos de teste com falhas no CI | 97 testes falhando (pré-existentes) |
| #99 | 27 arquivos com falhas catalogadas | Documentado — resolver gradualmente |

### Validação P.O. Pendente

| Issue | Título |
|---|---|
| #170 | L-1 VALIDAÇÃO P.O. — Tela de upload CSV SOLARIS |
| #169 | K-4 VALIDAÇÃO P.O. — Onda 2 combinatória por perfil |
| #167 | K-3 VALIDAÇÃO P.O. — Badge visual por onda |

---

## 4. Tabela de Arquivos Críticos × Responsabilidade

| Arquivo | Sprint de Criação | Última Alteração | Responsabilidade |
|---|---|---|---|
| `drizzle/schema.ts` | A | K-4-A | Schema de 63 tabelas — editar com cuidado |
| `server/flowStateMachine.ts` | K-4-A | K-4-B | Máquina de estados — 11 estados, VALID_TRANSITIONS |
| `server/routers-fluxo-v3.ts` | C | K-4-C | Fluxo principal das 3 ondas |
| `server/routers.ts` | A | K | Entry point de todos os routers tRPC |
| `server/gapEngine.ts` | C | F | Identificação de gaps tributários |
| `server/riskEngine.ts` | C | F | Geração de matrizes de risco |
| `server/routers/scoringEngine.ts` | I | I | Score CPIE ponderado |
| `server/rag-corpus.ts` | D | H | Corpus RAG — 2.078 chunks |
| `client/src/components/DiagnosticoStepper.tsx` | K-4-B | M (BUG-UAT-05) | Stepper 8 etapas — hardcode removido |
| `server/e2e-testlogin.test.ts` | M | M | 8 testes unit para auth.testLogin |
| `tests/e2e/fixtures/auth.ts` | M | M | Fixtures Playwright: loginViaTestEndpoint + criarProjetoViaApi |
| `tests/e2e/01-onda1-solaris.spec.ts` | M | M | Suite CT-01/CT-04/CT-06/CT-07 |
| `tests/e2e/02-e2e-completo.spec.ts` | M | M | Suite CT-37 (E2E completo) |
| `client/src/pages/QuestionarioSolaris.tsx` | K-4-B | K-4-B | Questionário Onda 1 (12 perguntas) |
| `client/src/pages/QuestionarioIaGen.tsx` | K-4-C | K-4-C | Questionário Onda 2 (gerado por LLM) |
| `client/src/pages/ProjetoDetalhesV2.tsx` | C | K-4-D | Página de detalhes do projeto + stepper |
| `client/src/pages/MatrizesV3.tsx` | C | C | Matrizes de risco (Etapa 7) |
| `client/src/pages/PlanoAcaoV3.tsx` | C | C | Plano de ação (Etapa 8) |
| `docs/BASELINE-PRODUTO.md` | A | K (v2.4) | Fonte de verdade técnica |
| `docs/HANDOFF-MANUS.md` | A | K (v2.4) | Contexto operacional para o Manus |
| `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md` | K | K (v1.1) | Contrato de implementação das 3 ondas |
| `docs/governance/ESTADO-ATUAL-PLATAFORMA.md` | K | K (v1.0) | Fonte única de verdade — métricas reais |
| `docs/governance/HANDOFF-IMPLEMENTADOR.md` | K | M (v1.1) | Guia operacional para o Manus |
| `docs/governance/CONTEXTO-ORQUESTRADOR.md` | K | K (v1.0) | Contexto para o Claude (Orquestrador) |

---

## 5. Corpus RAG — 23 Anexos da LC 214/2025

Todos os 23 anexos foram ingeridos (100% de cobertura):

| Anexo | Conteúdo | Relevância |
|---|---|---|
| I | Cesta Básica Nacional — alíquota zero CBS/IBS | Alta — todos os clientes |
| II | Cesta Básica Estendida — alíquota reduzida 60% | Alta |
| III | Produtos agropecuários com redução 60% | Média — agronegócio |
| IV | Insumos agropecuários — alíquota zero | Média — agronegócio |
| V | Medicamentos — alíquota zero CBS/IBS | Alta — farmácias e distribuidoras |
| VI | Dispositivos médicos — redução 60% | Média — saúde |
| VII | Produtos de higiene pessoal — redução 60% | Média |
| VIII | Serviços de educação — redução 60% | Média — educação |
| IX | Serviços de saúde — redução 60% | Alta — saúde |
| X | Transporte coletivo — redução 60% | Média — transporte |
| XI | Insumos para produções jornalísticas | Baixa |
| XII | Serviços financeiros — IS (Imposto Seletivo) | Alta — bancos e fintechs |
| XIII | Seguros — IS | Alta — seguradoras |
| XIV | Bens e serviços de luxo — IS 20% | Alta — varejo premium |
| XV | Tabaco — IS 100% | Alta — tabacaria |
| XVI | Bebidas alcoólicas — IS 30% | Alta — bebidas |
| XVII | Veículos — IS | Alta — montadoras e concessionárias |
| XVIII–XXIII | Simples Nacional — tabelas atualizadas | Alta — MEI e pequenas empresas |

---

## 6. Histórico de Versões deste Documento

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| v1.0 | 2026-03-28 | Manus (implementador) | Criação inicial — dados reais de 577 commits e 184 PRs |
| v1.1 | 2026-03-31 | Manus (Sprint M) | Sprint M adicionada · PRs #254/#256 · RF-019/020 · arquivos E2E · 256 PRs mergeados |
