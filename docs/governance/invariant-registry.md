# Invariant Registry — Plataforma de Compliance da Reforma Tributária

> **Versão:** 1.0 | **Data de criação:** 2026-03-24 | **Última atualização:** 2026-03-24
>
> Este registro é um **artefato permanente e imutável** da plataforma. Ele lista os invariants estruturais do produto — propriedades que DEVEM ser verdadeiras em qualquer estado válido do sistema.
>
> **Regra de ouro:** Qualquer issue que viole um invariant deste registro é automaticamente classificada como `structural-fix` e requer o processo completo de governança.

---

## O Que É um Invariant

Um invariant é uma propriedade do sistema que deve ser sempre verdadeira, independentemente do estado dos dados, do usuário, ou do fluxo de execução. Invariants não são requisitos funcionais — são **garantias de integridade** que, se violadas, indicam um bug estrutural.

A violação de um invariant é sempre severidade **CRÍTICO** ou **ALTO**.

---

## Registro de Invariants

### GRUPO 1 — Prefill Contract (Contrato de Pré-preenchimento)

Estes invariants protegem o fluxo de dados entre o formulário de perfil da empresa e os questionários de diagnóstico.

---

#### INV-001 — Campo Coletado Nunca Reaparece Vazio

| Campo | Valor |
|---|---|
| **ID** | `INV-001` |
| **Nome** | `campo_coletado_no_perfil → nunca_reaparece_vazio_no_questionario` |
| **Grupo** | Prefill Contract |
| **Severidade de violação** | 🔴 CRÍTICO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) |
| **Protegido por** | `server/prefill-contract.test.ts` — BLOCO 5 (17 testes) |

**Enunciado:**

> Se um campo foi coletado no formulário de perfil da empresa (`PerfilEmpresaIntelligente`) e mapeado em um builder de prefill (`buildCorporatePrefill`, `buildOperationalPrefill`, `buildCnaePrefill`), então esse campo NUNCA deve aparecer vazio no questionário correspondente quando o usuário o abre pela primeira vez.

**Campos cobertos:**

| Campo coletado | Builder | Campo no questionário |
|---|---|---|
| `companyProfile.taxRegime` | `buildCorporatePrefill` | `qc01_regime` |
| `companyProfile.companySize` | `buildCorporatePrefill` | `qc01_porte` |
| `operationProfile.multiState` ou `taxComplexity.hasMultipleEstablishments` | `buildCorporatePrefill` | `qc02_filiais` |
| `operationProfile.operationType` | `buildOperationalPrefill` | `qo01_canais` |
| `operationProfile.clientType` | `buildOperationalPrefill` | `qo01_clientes` |
| `financialProfile.paymentMethods` | `buildOperationalPrefill` | `qo03_meios` |
| `governanceProfile.hasTaxTeam` | `buildOperationalPrefill` | `qo08_equipe` |
| `operationProfile.operationType` | `buildCnaePrefill` | `qcnae01_setor` |
| `confirmedCnaes` (count) | `buildCnaePrefill` | `qcnae01_atividades` |
| `confirmedCnaes` (lista) | `buildCnaePrefill` | `qcnae01_observacoes` |

**Exceções legítimas:**

- Campos que não foram coletados no formulário de perfil (ex.: `qc02_grupo`, `qc02_centralizacao`) — estes permanecem `undefined` intencionalmente (ver `INV-004`).
- Campos com dados insuficientes para derivação (ex.: `clientType` vazio) — retornam `undefined`, não string vazia.

---

#### INV-002 — API Nunca Entrega String JSON

| Campo | Valor |
|---|---|
| **ID** | `INV-002` |
| **Nome** | `api_nunca_entrega_string_json_para_campos_canonicos` |
| **Grupo** | Prefill Contract |
| **Severidade de violação** | 🔴 CRÍTICO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) — DA-2 |
| **Protegido por** | `server/prefill-contract.test.ts` — BLOCO 2 (8 testes) |

**Enunciado:**

> Os campos JSON canônicos do projeto (`companyProfile`, `operationProfile`, `financialProfile`, `governanceProfile`, `taxComplexity`, `confirmedCnaes`, `corporateAnswers`, `operationalAnswers`, `cnaeAnswers`, `stepHistory`, `diagnosticStatus`) NUNCA devem ser entregues ao frontend como string. Devem sempre ser objetos ou arrays JavaScript.

**Implementação:** `normalizeProject()` em `server/db.ts` aplicado em `getProjectById()` e `getProjectsByUser()`.

---

#### INV-003 — Builder Canônico é Fonte Única de Prefill

| Campo | Valor |
|---|---|
| **ID** | `INV-003` |
| **Nome** | `builder_canonico_e_fonte_unica_de_prefill` |
| **Grupo** | Prefill Contract |
| **Severidade de violação** | 🟠 ALTO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) — DA-3 |
| **Protegido por** | `server/prefill-contract.test.ts` — BLOCO 3, BLOCO 9 |

**Enunciado:**

> Nenhum questionário deve conter lógica local de prefill. Todo pré-preenchimento DEVE ser derivado exclusivamente dos builders em `shared/questionario-prefill.ts`. Lógica de mapeamento duplicada em componentes de página é proibida.

---

#### INV-004 — Campo Sem Fonte Não É Preenchido

| Campo | Valor |
|---|---|
| **ID** | `INV-004` |
| **Nome** | `campo_sem_fonte_nao_e_preenchido` |
| **Grupo** | Prefill Contract |
| **Severidade de violação** | 🟠 ALTO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) — DA-4 |
| **Protegido por** | `server/prefill-contract.test.ts` — BLOCO 4, BLOCO 6 |

**Enunciado:**

> Um campo de questionário que não possui fonte de dados coletada no formulário de perfil NUNCA deve ser preenchido com um valor fabricado ou inferido sem base. O campo deve permanecer `undefined` para que o usuário o preencha manualmente.

**Campos atualmente sem fonte (intencionalmente vazios):**
- `qc02_grupo` — grupo econômico não coletado no perfil inicial
- `qc02_centralizacao` — centralização tributária não coletada no perfil inicial

---

### GRUPO 2 — Diagnóstico e Questionários

#### INV-005 — Pergunta Sem Fonte É Inválida

| Campo | Valor |
|---|---|
| **ID** | `INV-005` |
| **Nome** | `pergunta_sem_fonte → invalida` |
| **Grupo** | Diagnóstico |
| **Severidade de violação** | 🟠 ALTO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) |
| **Protegido por** | Revisão manual + `INV-004` |

**Enunciado:**

> Toda pergunta adicionada a um questionário de diagnóstico DEVE ter uma fonte de dados identificada: ou é coletada diretamente do usuário no questionário, ou é derivada de dados já coletados no perfil. Perguntas sem fonte identificada são inválidas e não devem ser adicionadas.

---

### GRUPO 3 — Riscos e Planos de Ação

#### INV-006 — Risco Sem Origem É Inválido

| Campo | Valor |
|---|---|
| **ID** | `INV-006` |
| **Nome** | `risco_sem_origem → invalido` |
| **Grupo** | Riscos e Planos de Ação |
| **Severidade de violação** | 🟠 ALTO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) |
| **Protegido por** | Testes de planos de ação (a implementar) |

**Enunciado:**

> Todo risco gerado pelo sistema DEVE ter uma origem rastreável: ou uma resposta do questionário, ou um CNAE confirmado, ou um campo do perfil. Riscos gerados sem origem identificada são inválidos e não devem ser exibidos ao usuário.

---

#### INV-007 — Ação Sem Evidence Required É Inválida

| Campo | Valor |
|---|---|
| **ID** | `INV-007` |
| **Nome** | `acao_sem_evidence_required → invalida` |
| **Grupo** | Riscos e Planos de Ação |
| **Severidade de violação** | 🟡 MÉDIO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) |
| **Protegido por** | Testes de planos de ação (a implementar) |

**Enunciado:**

> Toda ação em um plano de ação DEVE ter o campo `evidence_required` definido (true ou false). Ações sem esse campo são inválidas pois não permitem ao usuário saber se precisa coletar evidências para comprovar a conformidade.

---

### GRUPO 4 — Briefing e Cobertura

#### INV-008 — Briefing Sem Cobertura 100% É Inválido

| Campo | Valor |
|---|---|
| **ID** | `INV-008` |
| **Nome** | `briefing_sem_coverage_100 → invalido` |
| **Grupo** | Briefing |
| **Severidade de violação** | 🔴 CRÍTICO |
| **Status** | ✅ Ativo |
| **Introduzido em** | Sub-Sprint Prefill Contract (2026-03-24) |
| **Protegido por** | Testes de briefing (a implementar) |

**Enunciado:**

> Um briefing só pode ser gerado e exibido ao usuário quando as 3 camadas do diagnóstico (Corporativo, Operacional, CNAE) estiverem 100% concluídas. Um briefing gerado com dados parciais é inválido e não deve ser apresentado como resultado definitivo.

---

## Tabela Resumo

| ID | Nome (curto) | Grupo | Severidade | Status | Testes |
|---|---|---|---|---|---|
| INV-001 | `campo_coletado → nunca_vazio` | Prefill Contract | 🔴 CRÍTICO | ✅ Ativo | BLOCO 5 (17 testes) |
| INV-002 | `api → nunca_string_json` | Prefill Contract | 🔴 CRÍTICO | ✅ Ativo | BLOCO 2 (8 testes) |
| INV-003 | `builder → fonte_única` | Prefill Contract | 🟠 ALTO | ✅ Ativo | BLOCO 3, 9 |
| INV-004 | `campo_sem_fonte → undefined` | Prefill Contract | 🟠 ALTO | ✅ Ativo | BLOCO 4, 6 |
| INV-005 | `pergunta_sem_fonte → invalida` | Diagnóstico | 🟠 ALTO | ✅ Ativo | Revisão manual |
| INV-006 | `risco_sem_origem → invalido` | Riscos | 🟠 ALTO | ✅ Ativo | A implementar |
| INV-007 | `acao_sem_evidence → invalida` | Planos de Ação | 🟡 MÉDIO | ✅ Ativo | A implementar |
| INV-008 | `briefing_sem_coverage → invalido` | Briefing | 🔴 CRÍTICO | ✅ Ativo | A implementar |

---

## Como Usar Este Registro

### Ao Abrir uma Issue

1. Consulte este registro para identificar qual invariant foi violado.
2. Referencie o ID do invariant no template de issue (campo "Invariants Afetados").
3. Se o invariant não estiver neste registro, avalie se um novo invariant deve ser adicionado.

### Ao Adicionar um Novo Invariant

1. Atribua o próximo ID sequencial (`INV-00N`).
2. Preencha todos os campos da tabela de metadados.
3. Escreva o enunciado em linguagem precisa e não ambígua.
4. Identifique os testes que protegem o invariant (ou crie-os).
5. Faça commit em `docs(structural): adicionar INV-00N ao Invariant Registry`.

### Ao Violar um Invariant

1. Abra uma issue com label `structural-fix`.
2. Referencie o ID do invariant violado.
3. Siga o processo completo de governança (Issue Template → PR Template → Evidence Pack → CI Gate → Orquestrador Gate → Checkpoint).

---

## Histórico de Versões

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-03-24 | Criação inicial com INV-001 a INV-008 (Sub-Sprint Prefill Contract) |
