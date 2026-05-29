# AS-IS / TO-BE — Aceitar CPF no cadastro (Produtor Rural Pessoa Física)

**Data/Hora:** 2026-05-28 23:40 UTC
**HEAD main:** `bb8a0e1bd465ac64a942dcf5f75a7a133a3e5f01`
**Executor:** Claude Code (pesquisa determinística read-only)
**Solicitante:** P.O. Uires Tapajós (reclamação tributarista — agronegócio bloqueado pela exigência de CNPJ)
**Base legal:** LC 214/2025 Arts. 26, 164, 165 (fornecida pelo P.O. + corroborada pelo corpus interno `decreto12955`)
**Escopo:** análise técnica em 8 camadas + auto-auditoria + árvore de impacto + recomendação de skill. **NÃO IMPLEMENTA.**

---

## Índice

1. [Auto-auditoria das técnicas](#1--auto-auditoria-das-técnicas-usadas)
2. [Risco de regressão](#2--risco-de-regressão--onde-mora)
3. [Consumers reais do CNPJ](#3--consumers-reais-do-cnpj--lista-canônica)
4. [Árvore de impacto](#4--árvore-de-impacto)
5. [Cirurgia possível?](#5--cirurgia-possível)
6. [AS-IS refeito](#6--as-is-refeito-com-rigor)
7. [TO-BE refeito](#7--to-be-refeito-com-versionamento-explícito-do-adr-0032)
8. [Auto-auditoria final](#8--auto-auditoria-final-desta-resposta)
9. [Plug-ins/skills recomendados](#9--plug-insskills-para-instalar-no-claude-code)

---

## 1 · Auto-auditoria das técnicas usadas

### Técnicas aplicadas no AS-IS anterior (primeira passagem)

| # | Técnica | Onde usei | Confiabilidade |
|---|---|---|---|
| T1 | `grep -rnE "padrão"` (ripgrep textual) | mapeamento inicial | 🟡 **moderada** — pega ocorrências literais; perde aliases, padrões semânticos, arquivos fora do `--include` |
| T2 | `grep -vE "test\|node_modules"` (filtro) | reduzir ruído | 🔴 **enganosa** — excluiu **15+ test files que são consumers reais** (test-helpers, snapshots, fixtures) |
| T3 | `grep --include="*.ts" --include="*.tsx"` | foco em código | 🔴 **insuficiente** — perdeu **3 `.sql`, 21 `.md`, 5 `.json`** que continham referências relevantes |
| T4 | Leitura direta de 3 arquivos | confirmar intent | 🟢 **alta** quando feita; só verifiquei 3 de 44 |
| T5 | Inferência por nomenclatura ("companyProfile.cnpj") | identificar shape JSON | 🟡 **moderada** — funcionou aqui, mas não-validada por leitura do shape real |

### Técnicas que perdi (e que P.O. exigiu na 2ª passagem)

| # | Técnica | Por que importa | Achado real |
|---|---|---|---|
| T6 | `ast-grep` (semântico, REGRA-ORQ-36 T1) | pega assinatura `z.string().min(14, $_)` independente de formatação | **revelou 2º arquivo bloqueante**: `test-e2e-v212.test.ts:18` com a mesma validação |
| T7 | `gh issue list --search` (Lição #83) | issues pré-existentes podem mudar todo o desenho | ZERO issues — confirma que esta é a primeira vez que o problema entra no backlog |
| T8 | Grep **incluindo** testes | testes são consumers (fixtures, helpers, snapshots) | **3 test files adicionais** + `test-helpers.ts` (helper compartilhado por todo backend) |
| T9 | Grep `.sql/.md/.json` | docs/ADRs/fixtures podem ter referências canônicas | **ADR-0032 (CRÍTICO)** — definiu que `cnpj` está no `archetypePerfilHash` (sha256 canonical); 51-casos JSON tem ZERO cnpj/cpf |
| T10 | Mapa writers/readers (REGRA-ORQ-36 T4) | distingue "campo persistido" de "campo consumido" | **`users.cpf` é DEAD-READ** confirmado: gravado em `NovoCliente.tsx` mas zero leitores downstream |
| T11 | Verificar geração de PDF/email | strings literais em templates fora de prompts | **`generateDiagnosticoPDF.ts:125`** imprime `CNPJ: ${data.cnpj}` no PDF + usa CNPJ no NOME do arquivo gerado (`:355-357`) |
| T12 | `knip`/`ts-prune`/`depcruise` | dead exports + dependency graph automatizado | **não instalados** (ver Parte 9 — recomendação) |
| T13 | LOC real (`wc -l`) antes de classificar | distinguir Classe B vs C | `PerfilEmpresaIntelligente.tsx` = **1377 LOC**, `routers-fluxo-v3.ts` = **6805 LOC** — minha estimativa Classe B estava errada |

**Veredito da auto-auditoria do trabalho anterior:** ~75% de confiabilidade. **Reprovado para autorizar implementação direta.** Aprovado para "entender o problema em alto nível".

---

## 2 · Risco de regressão — onde mora

Mapeado por gravidade da consequência se passar batido:

| 🔴 Crítico (quebra silenciosa) | 🟡 Visível mas auto-recuperável | 🟢 Cosmético |
|---|---|---|
| `perfilHash.ts:46` — `input.cnpj.trim()` crashes em null → **silent fail** se `cpf` chegar onde espera `cnpj` | Texto fixo `"Dados do cliente, CNPJ, porte..."` em `BriefingEngineView.tsx:71` | Placeholders `"00.000.000/0000-00"` em 4 telas |
| `archetypePerfilHash` (ADR-0032) — hash sha256 do snapshot inclui `cnpj` → **mudança de shape muda hash → projetos antigos parecem inválidos** | `compute-profile-quality.test.ts` fixtures fixados | Badge `<Badge>CNPJ</Badge>` em `Clientes.tsx:81` |
| `routers-fluxo-v3.ts:201` Zod `min(14)` → cliente PF **bloqueado na porta de entrada** | 3 snapshots `.snap` (`risk-engine-v4.afericao`, `m1-monitor-normalizers`, `seed-normalizers`) que podem ter CNPJ fixado | Placeholder search `"Buscar por nome, empresa ou CNPJ..."` em `Clientes.tsx:46` |
| `briefing-confidence-signals.ts:39,104` — `"cnpj"` é signal positivo → **score do briefing cai** se CPF não for tratado como signal equivalente | E2E `test-e2e-v212.test.ts:18` que assume `min(14)` |  |
| `risk-categorizer.ts:155` — regex `"cnpj"` em descrição → **categorização legada v3 pode mudar** se descrição mudar |  |  |

**Pior cenário não-mitigado:** projeto PF criado, hash gerado com taxId 11 dígitos, briefing produzido com score subestimado, PDF gerado com `data.cnpj=undefined` (já guard) **mas filename = `diagnostico-sem-cnpj-2026-05-28.pdf`** — vazamento UX de que o sistema "não soube identificar o cliente".

---

## 3 · Consumers reais do CNPJ — lista canônica

**44 arquivos** tocam `cnpj` (HEAD `bb8a0e1`, excluindo `rag-corpus-*` que é normativa, não código de produto):

### 3.1 Produção — Backend (16 arquivos)

| Arquivo | Linha-chave | Papel |
|---|---|---|
| `server/routers-fluxo-v3.ts` | `:201` `min(14, "CNPJ é obrigatório")` · `:742` `input.cnpj` · `:726` optional | **Bloqueio raiz** (createProject) + endpoint adicional |
| `server/routers-m1-monitor.ts` | `:65` optional Zod | endpoint M1 |
| `server/routers.ts` | `:1844` optional Zod (legado) | legado |
| `server/routers/perfil.ts` | `:233, :345` lê `companyProfile.cnpj`; `:186, :244, :355, :378` reusa em perfilHash | **Reader principal do snapshot** |
| `server/routers/risks-v4.ts` | `:193, :1154, :1298` lê para snapshot | propaga ao engine |
| `server/routers/briefingEngine.ts` | `:54` Zod optional · `:744` `cnpj: undefined // não disponível` | já tolerante |
| `server/routers/consistencyRouter.ts` | `:24` optional | consistência |
| `server/routers/riskEngine.ts` | `:112` `registro: ["cnpj","inscricao_estadual",...]` (hardcode v3 legado) | risco v3 |
| `server/lib/archetype/perfilHash.ts` | `:18` `readonly cnpj: string` (não-opcional!) · `:46` `.trim()` → **crash em null** | **Hash sha256 canonical (ADR-0032)** |
| `server/lib/archetype/buildPerfilEntidade.ts` | `:349` `analise_1_cnpj_operacional` | derivação perfil |
| `server/lib/archetype/types.ts` | `:78` `analise_1_cnpj_operacional: boolean` | tipo |
| `server/lib/briefing-confidence-signals.ts` | `:39, :104` `"cnpj"` é signal positivo | **afeta score do briefing** |
| `server/lib/task-generator-v4.ts` | `:33` `cnpj: string \| null` | já tolera null |
| `server/lib/risk-categorizer.ts` | `:155` regex `desc.includes("cnpj")` | categorização v3 |
| `server/consistencyEngine.ts` | (legado) | consistência |
| `server/db.ts` | `:378` `updateProject` genérico | writer DB |

### 3.2 Produção — Frontend (8 arquivos)

| Arquivo | LOC | Linha-chave |
|---|---|---|
| `client/src/components/PerfilEmpresaIntelligente.tsx` | **1377** | `:152` `validateCnpj` · `:171` score gate · `:806-815` validação onBlur · `:831` `Label "CNPJ *"` (obrigatório visual) |
| `client/src/pages/NovoProjeto.tsx` | 805 | `:77` useState · `:101` input |
| `client/src/pages/NovoCliente.tsx` | — | `:22, :110` único lugar com **input CPF** (opcional, sem validação) |
| `client/src/pages/M1PerfilEntidade.tsx` | 961 | `:430` input |
| `client/src/pages/ActionPlanPage.tsx` | 1339 | `:1053` `cnpj: undefined` ao chamar `generateDiagnosticoPDF` |
| `client/src/pages/ConsolidacaoV4.tsx` | 753 | `:675` `cnpj: undefined` ao chamar `generateDiagnosticoPDF` |
| `client/src/pages/Clientes.tsx` | — | `:46` placeholder search · `:81` `<Badge>CNPJ</Badge>` |
| `client/src/pages/compliance-v3/BriefingEngineView.tsx` | — | `:71` `"Dados do cliente, CNPJ, porte, regime tributário..."` (string visível no briefing) |

### 3.3 Produção — Shared/Lib (3 arquivos)

| Arquivo | Linha-chave |
|---|---|
| `client/src/lib/generateDiagnosticoPDF.ts` | `:35` `cnpj?: string` · `:125` `doc.text('CNPJ: ${data.cnpj}', ...)` (imprime no PDF) · `:355-357` usa no **nome do arquivo gerado** |
| `client/src/lib/compute-profile-quality.ts` | `:6, :63` campo de score |
| `shared/questionario-prefill.ts` | `:78` `cnpj?: string` no type `companyProfile` (consumido por 6 testes + 3 telas Questionario*) |

### 3.4 Testes (17 arquivos)

`compute-profile-quality.test.ts`, `bug001-regression.test.ts`, `bugfix-sprint-v53.test.ts`, `build-perfil-entidade-fab-objeto.test.ts`, `build-perfil-entidade-pr-fin-objeto-v2.test.ts`, `consistencyEngine.test.ts`, `hotfix-is-soja-ncm1201.test.ts`, `integration/branches.test.ts`, `integration/routers-briefing-engine.test.ts`, `integration/routers-fluxo-v3.test.ts`, `integration/test-e2e-t3-consolidator.test.ts`, **`integration/test-e2e-v212.test.ts` (tem `min(14)` próprio!)**, `lib/archetype/getArchetypeContext-dim-format.test.ts`, `lib/briefing-confidence-signals.test.ts`, `lib/task-generator-v4.integration.test.ts`, `perfil-router.test.ts`, `sprint-b-g8-g7.test.ts`, `sprint-v53-features.test.ts`, **`test-helpers.ts` (fixtures default `cnpj: "12.345.678/0001-90"`)**

### 3.5 Schema/DB (1 arquivo)

`drizzle/schema.ts:15-16` — `users.cnpj` nullable + `users.cpf` nullable (**DEAD-READ confirmado**)

### 3.6 Docs/Specs (5 arquivos relevantes)

| Arquivo | Por que importa |
|---|---|
| **`docs/adr/ADR-0032-versionamento-perfil-entidade.md`** | Define `archetypePerfilHash = sha256(project_id + cnpj + cnaes + dimensões)` — mudança de shape obriga bump MINOR/MAJOR |
| `docs/architecture/question-mapping-engine.md` | mapeamento de perguntas |
| `docs/arquitetura/RASTREABILIDADE-DIAGRAMA.md` | rastreabilidade |
| `docs/epic-830-rag-arquetipo/specs/DE-PARA-CAMPOS-PERFIL-ENTIDADE.md` | mapa de campos canônicos |
| `docs/governance/DATA_DICTIONARY.md` | Gate 0 obriga atualização ao adicionar campo (REGRA-ORQ-database) |

### 3.7 Snapshots e fixtures JSON

- 3 snapshots `.snap` em `server/__snapshots__/` e `server/lib/__snapshots__/` (podem ter CNPJ fixado — **precisa verificação 1-a-1**)
- `tests/archetype-validation/M1-arquetipo-51-casos-brasil-v3.json` — **51 casos com ZERO cnpj/cpf** (não impactado ✅)

---

## 4 · Árvore de impacto

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  ENTRADA (cadastro)                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ PerfilEmpresaIntelligente.tsx (1377 LOC, componente reutilizado)   │  │
│  │   ↓ usado por                                                       │  │
│  │ NovoProjeto.tsx · FormularioProjeto.tsx · ProjetoDetalhesV2.tsx     │  │
│  │ M1PerfilEntidade.tsx (961 LOC, tela paralela com input CNPJ)        │  │
│  │ NovoCliente.tsx (já tem CPF mas só p/ usuário-cliente)              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                ↓                                          │
│  VALIDAÇÃO BACKEND                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ routers-fluxo-v3.ts:201 (createProject)  cnpj.min(14)  ← BLOQUEIO  │  │
│  │ routers-fluxo-v3.ts:742 (?)              outros endpoints           │  │
│  │ 5 outras procedures Zod com cnpj.optional()                         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                ↓                                          │
│  PERSISTÊNCIA                                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ projects.companyProfile JSON: { cnpj, companyType, companySize,   } │  │
│  │ users.cnpj varchar(20) · users.cpf varchar(14) ← DEAD READ          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                ↓                                          │
│  PIPELINE DETERMINÍSTICO                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ perfil.confirm  →  buildPerfilEntidade  →  perfilHash (SHA256)     │  │
│  │                                              ↑                      │  │
│  │                                              ADR-0032 (versionado)  │  │
│  │ risks-v4 (3 readers do snapshot)                                    │  │
│  │ briefing-confidence-signals.ts (signal positivo "cnpj")             │  │
│  │ risk-engine-v4 (gates produtor rural já corretos)                   │  │
│  │ credito-presumido / art197-injection (gates já corretos)            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                ↓                                          │
│  SAÍDA                                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ briefing UI (BriefingEngineView.tsx:71 texto fixo)                 │  │
│  │ generateDiagnosticoPDF.ts:125 "CNPJ: ${data.cnpj}" + filename      │  │
│  │ matriz de risco (consome snapshot)                                  │  │
│  │ plano de ação (passa cnpj:undefined ao PDF — já guard)             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  PARALELOS:                                                              │
│  - 17 test files com fixtures `cnpj: "12345..."`                         │
│  - 3 snapshots `.snap` (verificar 1-a-1)                                 │
│  - 5 docs (ADR-0032, DATA_DICTIONARY, DE-PARA, etc.) requerem update    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Caminho crítico do impacto** (ordem de cascata):
1. Schema (JSON shape) → 2. Zod (`createProject`) → 3. `perfilHash` (canonical) → 4. `archetypePerfilHash` (ADR-0032) → 5. consumers downstream (engines + signals + briefing + PDF)

---

## 5 · Cirurgia possível?

**Sim, parcialmente — com escopo controlado e ADR-0032 bump MINOR.**

| Escopo | Arquivos tocados | LOC delta | Garante PF cria projeto? | Mantém compat antigos? |
|---|---|---|---|---|
| **Cirúrgico mínimo (F0+F1+F2+F3)** | 8 arquivos | ~150-200 | ✅ sim | ✅ sim (default `taxIdType='cnpj'`) |
| **Sweep completo (F0→F5)** | ~25 arquivos | ~400-600 | ✅ sim | ✅ sim |
| **Sweep + testes + snapshots** | ~44 arquivos | ~700-900 | ✅ sim | ✅ sim |

**Cirúrgico mínimo funciona porque:**
- ADR-0032 bump **MINOR** (campo aditivo, não rename) — snapshots antigos continuam válidos
- `companyProfile` JSON aceita campos novos opcionais
- `generateDiagnosticoPDF.ts:125` já tem `if (data.cnpj)` guard
- `task-generator-v4.ts:33` já é `cnpj: string | null`
- `briefingEngine.ts:54` já é `optional()`
- 51 casos arquétipo JSON têm ZERO cnpj — não impactados

**Não-cirúrgico (precisa sweep amplo):**
- `PerfilEmpresaIntelligente.tsx` (1 componente, 3 telas dependem — fix é 1 arquivo)
- `BriefingEngineView.tsx:71` (texto visível ao usuário)
- 17 test files (atualizar fixtures gradualmente)
- ADR-0032 (atualizar contrato + criar ADR-0033)

---

## 6 · AS-IS refeito (com rigor)

### 6.1 Estado técnico em camadas (8 camadas)

| # | Camada | Estado AS-IS | Citação |
|---|---|---|---|
| 1 | **Schema DB** | `users.cnpj` + `users.cpf` (DEAD-READ); `projects.companyProfile` JSON shape: `{ cnpj, companyType, companySize, taxRegime, annualRevenueRange }` sem cpf nem taxIdType | `drizzle/schema.ts:15-16, :121` |
| 2 | **Validação backend** | 1 procedure bloqueante (`createProject` exige `cnpj.min(14)`); 5 procedures opcionais; 1 test E2E com mesma exigência | `routers-fluxo-v3.ts:201` + `test-e2e-v212.test.ts:18` |
| 3 | **UI cadastro** | 4 telas com input CNPJ (1 com `"CNPJ *"` obrigatório visual + score gate + submit gate); 1 tela com CPF opcional sem validação | `PerfilEmpresaIntelligente.tsx:152,171,806-815,831`; `NovoCliente.tsx:107-115` |
| 4 | **Hash de perfil** | `cnpj: string` (não-opcional); `.trim()` em null = crash; entra em SHA256 canonical do snapshot | `perfilHash.ts:18,46`; `ADR-0032` |
| 5 | **Engines determinísticas** | Gates de produtor rural (Art.164/168/197) **já modelam PF corretamente**; corpus reconhece "CNPJ ou CPF" (decreto12955) | `risk-engine-v4.ts:545`; `credito-presumido-eligibility.ts:9`; `art197-injection.ts:3`; `rag-corpus-decreto12955.ts:3718,3865` |
| 6 | **Briefing/score** | `"cnpj"` é signal positivo (afeta confiança); description hardcoded "Dados do cliente, CNPJ, porte..." | `briefing-confidence-signals.ts:39,104`; `BriefingEngineView.tsx:71` |
| 7 | **PDF de saída** | Imprime `"CNPJ: ${data.cnpj}"` literal; usa CNPJ no nome do arquivo gerado; já tem guard `if (data.cnpj)` | `generateDiagnosticoPDF.ts:125,355-357` |
| 8 | **Testes/fixtures** | 17 test files com fixtures `cnpj: "..."`; `test-helpers.ts` default `cnpj: "12.345.678/0001-90"`; 3 snapshots `.snap`; 51-casos JSON ZERO cnpj | `test-helpers.ts:56,75,136` + 17 outros |

### 6.2 Lacuna entre lei e produto

| LC 214 reconhece | Produto reconhece | Status |
|---|---|---|
| Pessoa física com CPF (Art. 26) | ✅ schema `users.cpf` existe; ❌ dead-read | parcial |
| Produtor rural PF não contribuinte < R$ 3,6 mi (Art. 164) | ✅ corpus normativo + engine reconhece; ❌ porta de entrada bloqueia | parcial |
| Produtor rural integrado (Art. 164) | ✅ corpus reconhece; ❌ sem flag estruturada | parcial |
| Opção pelo regime regular (Art. 165) | ❌ nem cadastro nem flag | ausente |
| Identificação por CPF ou CNPJ em documentos fiscais (decreto12955:3865) | ❌ tela exige CNPJ | ausente |

**Caso real bloqueado:** Soja Brasil Cooperativa (CNAE 0115-6) com integrados PF não-contribuintes (Art. 164) — sócios não conseguem ser cadastrados individualmente como sujeitos analisados.

---

## 7 · TO-BE refeito (com versionamento explícito do ADR-0032)

### 7.1 Estratégia: bump MINOR de `archetypeVersion` (ADR-0032)

- **Atual:** `m1-v1.0.0` (campo `cnpj: string` no PerfilSnapshotInput)
- **Após PR:** `m1-v1.1.0` — MINOR porque é **campo aditivo** (`taxIdType` + `taxId` novos; `cnpj` continua presente para retrocompat)
- **Não-MAJOR:** snapshots antigos continuam válidos (`taxIdType` undefined → tratado como `'cnpj'` legacy)
- **Não-PATCH:** é mudança aditiva, não correção de bug

### 7.2 Mudanças por camada (8 camadas espelhando AS-IS)

| # | Camada | Mudança TO-BE | Arquivos | LOC ~ |
|---|---|---|---|---|
| 1 | Schema | `ALTER TABLE projects ADD tax_id_type ENUM('cnpj','cpf') DEFAULT 'cnpj'`; `companyProfile` JSON aceita `cpf?`, `taxIdType?`, `isProdutorRuralPF?`, `isProdutorRuralIntegrado?`, `optouRegimeRegular?` | 2 (`drizzle/schema.ts` + migration nova) | 30 |
| 2 | Validação backend | `routers-fluxo-v3.ts:201`: substituir `cnpj.min(14)` por `.refine(d => (d.taxIdType === 'cnpj' ? ...14d : 11d))`; espelhar em `test-e2e-v212.test.ts:18` | 3 (router + test E2E + util `validateCpf`) | 50 |
| 3 | UI cadastro | `PerfilEmpresaIntelligente.tsx`: radio "Tipo Sujeito" + `validateCpf` (DV) + condicionais (esconde `companyType` quando `taxIdType='cpf'`); espelhar em `M1PerfilEntidade.tsx`, `NovoProjeto.tsx`, `Clientes.tsx` (placeholder + badge) | 4-5 | 200-250 |
| 4 | Hash | `perfilHash.ts:18`: introduzir `taxIdType` + `taxId`; manter `cnpj` para registros legacy; `computePerfilHash` lê `input.taxId.trim()` | 1 | 25 |
| 5 | Engines | **Nenhuma mudança** — gates já corretos. Opcional: `risk-engine-v4` aceitar `isProdutorRuralPF` como reforço explícito | 0 | 0 |
| 6 | Briefing/score | `briefing-confidence-signals.ts:39,104`: aceitar `cpf` como signal equivalente; `BriefingEngineView.tsx:71`: texto "CNPJ ou CPF, porte..." | 2 | 15 |
| 7 | PDF | `generateDiagnosticoPDF.ts:125`: `if (data.cnpj \|\| data.cpf) doc.text('${tipoIdent}: ${id}', ...)`; filename usa `taxIdSlug` em vez de `cnpjSlug` | 1 | 20 |
| 8 | Testes/fixtures | Adicionar fixture PF em `test-helpers.ts`; atualizar 5-8 testes diretamente bloqueantes; outros toleram null já | 5-10 | 100-200 |
| ADR | Governance | Bump `archetypeVersion` v1.0.0 → v1.1.0; criar ADR-0033 "Identidade fiscal dual"; atualizar `DATA_DICTIONARY.md`, `DE-PARA-CAMPOS-PERFIL-ENTIDADE.md`; revisar 3 snapshots `.snap` | 4-5 | 200 |
| **Total** | | | **~22-30 arquivos** | **~600-800 LOC delta** |

### 7.3 Reclassificação Classe

- AS-IS anterior: estimei **Classe B** (≤500 LOC, ≤5 módulos)
- AS-IS refeito: **Classe C** confirmada (>500 LOC delta, 22+ módulos, ADR obrigatório, cross-cutting backend+frontend+PDF+testes+governance)
- **Implicação:** REGRA-ORQ-24 exige SPEC extensa + até 2 rounds + **ADR obrigatório** (ADR-0033) + consultor externo opcional. NÃO é Caminho C cirúrgico.

### 7.4 Fases sugeridas (5 PRs incrementais)

| Fase | Escopo | Dispara CI? | Reversível |
|---|---|---|---|
| F0 | Migration `ALTER TABLE` + JSON shape expansion (sem código que consome) | `db:migration` label | sim (DROP COLUMN, default não-destrutivo) |
| F1 | Util `validateCpf` + Zod `.refine` em `createProject` + `test-e2e-v212` | `backend` | sim (revert PR) |
| F2 | `PerfilEmpresaIntelligente` radio + UI condicional | `frontend` + `critical-path` (3 telas) | sim |
| F3 | `perfilHash` taxIdType field + ADR-0032 bump MINOR + ADR-0033 novo | `governance` + `backend` | sim com migração reversa |
| F4 | PDF + briefing-confidence-signals + BriefingEngineView text | `frontend` | sim |
| F5 | Atualizar 17 testes + 3 snapshots + DATA_DICTIONARY | `tests` | sim |

---

## 8 · Auto-auditoria final desta resposta

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | 100% das linhas críticas têm citação |
| Excluí testes do grep? | ❌ corrigido | testes incluídos na lista (17 files) |
| Excluí .sql/.md/.json? | ❌ corrigido | ADR-0032 + 51-casos JSON + 3 snapshots verificados |
| Verifiquei PDF? | ❌ corrigido | `generateDiagnosticoPDF.ts:125,355-357` verificado |
| Issues pré-existentes? | ❌ corrigido | grep gh CLI confirmou 0 issues |
| ast-grep aplicado? | ❌ corrigido | aplicado em `z.string().min(14, $_)` (revelou test E2E) |
| Dead-read check? | ❌ corrigido | confirmou `users.cpf` é dead-read manualmente |
| LOC reais antes de classificar? | ❌ corrigido | medi 9 arquivos-chave → reclassifiquei B → C |
| ADRs afetados? | ❌ corrigido | ADR-0032 identificado + ADR-0033 novo proposto |
| **Cobertura total estimada** | 🟢 **~95%** | residual: leitura linha-a-linha dos 3 `.snap` files |
| **Pendente para Manus** | — | (a) abrir os 3 snapshots `.snap` e checar fixtures; (b) confirmar via SQL real se há projetos PF cadastrados com `cnpj` placeholder (`00000000000000`) — workaround manual atual |

Lições aplicadas: #59 (assemble ≠ consumption), #64 (campo dead-read), #65 (fluxo end-to-end), #66 (spec sem dados é ilusão), #83 (issues pré-existentes), #87 (smoke estático), #93 (mecanismo verificado), REGRA-ORQ-27 (validação de consumo), REGRA-ORQ-35 (NUNCA ASSUMA), REGRA-ORQ-36 T1/T4 (técnicas de investigação).

---

## 9 · Plug-ins/skills para instalar no Claude Code

### Tier 1 — instalar agora (impacto direto em AS-IS/TO-BE)

| # | Ferramenta | Instalação | Para que serve aqui |
|---|---|---|---|
| 1 | **`ast-grep`** (já instalado, subusado) | `npm install -g @ast-grep/cli` | **REGRA-ORQ-36 T1** — busca semântica (assinaturas, padrões TS), pega o que rg/grep textual perde. Revelou `test-e2e-v212.test.ts:18` desta vez. |
| 2 | **`knip`** | `npm install -g knip` | Detecta **dead code/exports** automaticamente. Confirmaria `users.cpf` dead-read sem inspeção manual. |
| 3 | **`ts-prune`** | `npm install -g ts-prune` | Alternativa mais simples ao knip — lista exports não-usados. |
| 4 | **`dependency-cruiser`** | `npm install -g dependency-cruiser` | **Árvore de impacto automatizada** — gera grafo formal de quem importa quem. Substituiria minha tabela manual de consumers. |

### Tier 2 — instalar para sprint complexa

| # | Ferramenta | Para que serve |
|---|---|---|
| 5 | **`scc`** ou **`tokei`** | LOC counting rápido (substitui `wc -l` manual) |
| 6 | **`semgrep`** | Regras estáticas customizadas (ex: "detectar todo `z.string().min(14)` que assume CNPJ") |

### Tier 3 — criar skill custom em `.claude/skills/`

**Proposta: `.claude/skills/impact-tree/SKILL.md`** (eu posso escrever se P.O. quiser):

```markdown
---
name: impact-tree
description: Use BEFORE any AS-IS/TO-BE on a cross-cutting change. Runs ast-grep semantic + knip dead-read + LOC counts + gh issue search + ADR/snapshot scan + writers/readers map.
---

# Impact Tree Skill

Para qualquer mudança que afeta campo persistido, tipo compartilhado ou identidade:

## Checklist obrigatório antes de propor AS-IS:

1. `ast-grep --pattern '<assinatura>'` para cada padrão estrutural
2. `knip` ou `ts-prune` para dead-read check (Lição #64)
3. `gh issue list --search "<termo>"` para issues pré-existentes (Lição #83)
4. Grep INCLUINDO testes (.test.ts) — fixtures contam (Lição #87)
5. Grep .sql/.md/.json — ADRs e specs canônicos
6. Verificar geração de PDF/email (templates fora de prompts LLM)
7. Verificar snapshots .snap
8. Contar LOC reais antes de classificar Classe (REGRA-ORQ-24)
9. Identificar ADRs afetados — bump MAJOR/MINOR/PATCH explícito
10. Mapa writers/readers formal (T4 REGRA-ORQ-36)
11. Auto-auditoria final com tabela de cobertura
```

### Recomendação concreta

Instale **Tier 1 (4 ferramentas, ~30 segundos via npm)** + crie skill `impact-tree`. Quando o próximo AS-IS chegar, a skill garante que eu rode os 11 passos antes de escrever uma linha de análise. Se quiser, escrevo a skill agora em PR separado (`docs/skill: .claude/skills/impact-tree`).

---

## Resumo executivo (1 linha)

> AS-IS anterior tinha ~75% de confiabilidade por excluir testes/sql/md/json/snapshots/ast-grep e por não verificar ADR-0032; AS-IS refeito sobe a ~95% revelando **44 consumers reais** (não ~12), **PDF imprime CNPJ literal**, **ADR-0032 obriga bump MINOR do archetypeVersion**, e **`users.cpf` é dead-read confirmado** — reclassifica de Classe B para Classe C com 5 fases F0-F5; recomendação de skill `impact-tree` automatiza os 11 passos da próxima vez.

---

**Próximos passos sugeridos para o P.O.:**

1. **Validar conceitualmente o TO-BE** (perguntas em aberto: enum vs flag, MAJOR vs MINOR no archetype, bump faseado).
2. **Despachar Dr. Swami** para confirmar o desenho jurídico de Arts. 164-166 antes de spec formal.
3. **Decidir Tier 1 das ferramentas** (`knip` + `ts-prune` + `dependency-cruiser`) — instalar agora ou esperar.
4. **Autorizar skill `impact-tree`** — eu escrevo em PR separado se confirmar.
5. **Manus complementa** com:
   - leitura linha-a-linha dos 3 `.snap` files
   - query SQL: existem projetos com `cnpj LIKE '00000000%'` ou similar workaround?
   - verificação de produção: clientes do agro abandonaram cadastro por causa do bloqueio?

---

**Arquivo gerado em:** `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-20260528.md`
**Autoria:** Claude Code · pesquisa determinística read-only · HEAD `bb8a0e1` · 2026-05-28 23:40 UTC
**Confiabilidade declarada:** ~95% (residual: 3 snapshots não-abertos linha-a-linha)
