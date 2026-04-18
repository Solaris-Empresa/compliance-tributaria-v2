# Sub-Sprint Estrutural — Prefill Contract v1
**Plataforma:** Compliance da Reforma Tributária  
**Classificação do Incidente:** `structural data contract breach` — Severidade Crítica para Confiabilidade de UX/Diagnóstico  
**Status:** UAT externo bloqueado até gate de revalidação  
**Data de abertura:** 24/03/2026  
**Decisão do Orquestrador:** Não implementar patch. Abrir trilha estrutural.

---

## 1. Veredito do Orquestrador

O problema não é "campo vazio". É a ruptura do contrato entre coleta, persistência, leitura e hidratação do diagnóstico. O sistema salva de um jeito, lê de outro e tenta pré-preencher de um terceiro jeito. Esse padrão passou em 423/423 testes de engine porque a categoria de teste de contrato de prefill não existia. O defeito se manifestou apenas na experiência real do usuário.

> "Se o sistema esquece o que o usuário já informou, o diagnóstico já nasce em dívida."

---

## 2. Diagnóstico Estrutural Consolidado

O erro se manifesta em três camadas simultâneas:

| Camada | Falha identificada |
|---|---|
| **Persistência** | Dados do perfil salvos exclusivamente em JSONs aninhados (`companyProfile`, `operationProfile`, `financialProfile`, `governanceProfile`, `taxComplexity`). Colunas diretas `projects.taxRegime` e `projects.companySize` não são populadas pelo fluxo V3. |
| **API / Leitura** | `getProjectById` retorna colunas JSON sem garantia de parsing. O Drizzle ORM com MySQL2 pode retornar campos `json()` como strings serializadas dependendo do driver. O frontend recebe shape inconsistente. |
| **UI / Questionários** | Consumo inconsistente: Corporativo lê colunas diretas vazias; Operacional e CNAE passam objeto não normalizado para builders; Corporativo reimplementa lógica local em vez de usar `buildCorporatePrefill()` já existente no módulo compartilhado. |

As quatro causas raiz identificadas são:

**CR-1 — Corporativo QC-01:** `QuestionarioCorporativoV2.tsx` lê `p.taxRegime` e `p.companySize` (colunas diretas, sempre `undefined` no fluxo V3). O builder `buildCorporatePrefill()` que já trata o fallback correto existe em `shared/questionario-prefill.ts` mas não é importado nem usado.

**CR-2 — Corporativo QC-02:** Mapeamento de prefill para `qc02_filiais`, `qc02_grupo` e `qc02_centralizacao` nunca foi implementado. `multiState` e `hasMultipleEstablishments` existem no banco mas não são mapeados. `grupoEconomico` e `centralizacao` não são coletados no formulário inicial.

**CR-3 — Operacional:** `buildOperationalPrefill(p)` recebe `p.operationProfile`, `p.financialProfile`, `p.governanceProfile` como `null` ou string JSON não parseada. O builder retorna objeto vazio e nenhum campo é pré-preenchido.

**CR-4 — CNAE:** Mesma causa raiz do Operacional. `p.confirmedCnaes` pode chegar como string, fazendo `Array.isArray()` retornar `false` e zerando o prefill de CNAEs.

---

## 3. Prefill Contract Matrix v1

Esta é a fonte da verdade canônica para todo pré-preenchimento da plataforma. Nenhum campo fora desta matriz deve ser pré-preenchido. Nenhum campo dentro desta matriz pode reaparecer vazio.

| Campo do Formulário Inicial | Path Canônico de Persistência | Questionário Alvo | Pergunta Alvo | ID do Campo | Tipo de Prefill | Regra de Derivação | Pode Pré-preencher? | Status Atual |
|---|---|---|---|---|---|---|---|---|
| `taxRegime` | `companyProfile.taxRegime` | Corporativo | QC-01-P1 Regime tributário | `qc01_regime` | **Direto** | Mapeamento 1:1 via `TAX_REGIME_MAP` | ✅ Sim | 🔴 Quebrado (CR-1) |
| `companySize` | `companyProfile.companySize` | Corporativo | QC-01-P2 Porte da empresa | `qc01_porte` | **Direto** | Mapeamento 1:1 via `COMPANY_SIZE_MAP` | ✅ Sim | 🔴 Quebrado (CR-1) |
| `multiState` | `operationProfile.multiState` | Corporativo | QC-02-P2 Estabelecimentos outros estados | `qc02_filiais` | **Derivado** | `true` → "Sim", `false` → "Não" | ✅ Sim | 🟡 Não implementado (CR-2) |
| `hasMultipleEstablishments` | `taxComplexity.hasMultipleEstablishments` | Corporativo | QC-02-P2 Estabelecimentos outros estados | `qc02_filiais` | **Derivado** | Fallback se `multiState` ausente: `true` → "Sim" | ✅ Sim (fallback) | 🟡 Não implementado (CR-2) |
| *(não coletado)* | — | Corporativo | QC-02-P1 Grupo econômico | `qc02_grupo` | **Sem prefill legítimo** | Dado não existe no formulário inicial | ❌ Não | ⚪ N/A — campo em aberto |
| *(não coletado)* | — | Corporativo | QC-02-P3 Operações centralizadas | `qc02_centralizacao` | **Sem prefill legítimo** | Dado não existe no formulário inicial | ❌ Não | ⚪ N/A — campo em aberto |
| `operationType` | `operationProfile.operationType` | Operacional | QO-01-P1 Canais de venda | `qo01_canais` | **Derivado** | `OPERATION_TYPE_TO_CANAIS[operationType]` | ✅ Sim | 🔴 Quebrado (CR-3) |
| `clientType[]` | `operationProfile.clientType` | Operacional | QO-01-P2 Perfil de clientes | `qo01_clientes` | **Derivado** | `clientTypeToPerfilClientes(clientType[])` | ✅ Sim | 🔴 Quebrado (CR-3) |
| `paymentMethods[]` | `financialProfile.paymentMethods` | Operacional | QO-03-P1 Meios de pagamento | `qo03_meios` | **Direto** | Mapeamento via `PAYMENT_METHOD_MAP` | ✅ Sim | 🔴 Quebrado (CR-3) |
| `hasTaxTeam` | `governanceProfile.hasTaxTeam` | Operacional | QO-08-P2 Gestão fiscal | `qo08_equipe` | **Derivado** | `true` → "Equipe interna dedicada", `false` → "Totalmente terceirizado" | ✅ Sim | 🔴 Quebrado (CR-3) |
| `operationType` | `operationProfile.operationType` | CNAE | QCNAE-01 Setor econômico | `qcnae01_setor` | **Derivado** | `OPERATION_TYPE_TO_SETOR[operationType]` | ✅ Sim | 🔴 Quebrado (CR-4) |
| `confirmedCnaes[]` | `confirmedCnaes` (coluna direta JSON) | CNAE | QCNAE-01 Múltiplos CNAEs | `qcnae01_atividades` | **Derivado** | `cnaeCountToAtividades(cnaes.length)` | ✅ Sim | 🔴 Quebrado (CR-4) |
| `confirmedCnaes[]` | `confirmedCnaes` (coluna direta JSON) | CNAE | QCNAE-01 Observações CNAEs | `qcnae01_observacoes` | **Derivado** | `cnaesToObservacoes(cnaes[])` | ✅ Sim | 🔴 Quebrado (CR-4) |

**Resumo:** 10 campos com prefill legítimo, todos quebrados ou não implementados. 2 campos sem prefill legítimo (dado não coletado) — devem permanecer em aberto por design.

---

## 4. Decisão Arquitetural

As seguintes decisões são formais e vinculantes para toda implementação futura:

**DA-1 — Fonte da verdade:** O path canônico de prefill são os JSONs aninhados (`companyProfile`, `operationProfile`, `financialProfile`, `governanceProfile`, `taxComplexity`, `confirmedCnaes`). Colunas diretas como `projects.taxRegime` e `projects.companySize` não devem ser usadas como fonte primária de prefill.

**DA-2 — Normalização na fronteira da API:** O `getProjectById` (ou equivalente) deve normalizar e parsear todos os campos JSON antes de retornar ao frontend. O frontend nunca deve receber string JSON, `null` inesperado ou shape inconsistente. A decisão de parsear é da API, não da UI.

**DA-3 — Centralização dos builders:** Nenhum questionário deve conter lógica local de prefill. Toda lógica de pré-preenchimento reside exclusivamente em `shared/questionario-prefill.ts`. As telas chamam apenas builders. Os builders consomem apenas o shape normalizado.

**DA-4 — Distinção de tipos de prefill:** Existem três categorias mutuamente exclusivas: (a) prefill direto — dado existe exatamente no path canônico; (b) prefill derivado — dado pode ser inferido por regra objetiva documentada; (c) sem prefill legítimo — dado não foi coletado, campo permanece em aberto. Não se tenta preencher o que não existe.

**DA-5 — Invariant crítico:** `Campo do perfil coletado + mapeado na Prefill Contract Matrix = não pode reaparecer vazio no questionário`. Esta é uma regra de produto, não de implementação.

---

## 5. Plano de Correção por Frentes

### Fase 0 — Contenção (Imediata)

**Objetivo:** Impedir avanço com base falsa de prontidão.

| Item | Ação |
|---|---|
| UAT externo | Mantido bloqueado até gate de revalidação (Fase 7) |
| Classificação formal | `structural data contract breach` — severidade crítica |
| Congelamento | Zero mudanças cosméticas até fechamento do contrato |

**Risco:** Nenhum. **Benefício:** Evita que advogados encontrem o defeito antes da correção.

---

### Fase 1 — Fechar o Contrato Canônico

**Objetivo:** Definir uma única verdade documentada para todo prefill.

**Entregável:** Prefill Contract Matrix v1 (este documento, seção 3).

**Dependências:** Nenhuma. É o pré-requisito de todas as fases seguintes.

---

### Fase 2 — Normalização na Fronteira da API

**Objetivo:** Garantir que o frontend sempre receba shape canônico tipado.

**Implementação:** Criar função `normalizeProject(raw)` no servidor que parseia com segurança todos os campos JSON antes de retornar via tRPC. O `getProjectById` passa a retornar o projeto normalizado.

```typescript
// server/db.ts — normalizeProject (a implementar)
function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; }
    catch { return fallback; }
  }
  return fallback;
}

export function normalizeProject(raw: any) {
  return {
    ...raw,
    companyProfile:    safeParseJson(raw.companyProfile, null),
    operationProfile:  safeParseJson(raw.operationProfile, null),
    financialProfile:  safeParseJson(raw.financialProfile, null),
    governanceProfile: safeParseJson(raw.governanceProfile, null),
    taxComplexity:     safeParseJson(raw.taxComplexity, null),
    confirmedCnaes:    safeParseJson(raw.confirmedCnaes, []),
    corporateAnswers:  safeParseJson(raw.corporateAnswers, null),
    operationalAnswers: safeParseJson(raw.operationalAnswers, null),
    cnaeAnswers:       safeParseJson(raw.cnaeAnswers, null),
  };
}
```

**Risco:** Baixo — é uma camada de segurança sem efeito colateral.  
**Benefício:** Elimina CR-3 e CR-4 completamente. Torna o frontend imune a variações do driver MySQL2.  
**Dependências:** Nenhuma.

---

### Fase 3 — Centralizar 100% da Lógica de Prefill

**Objetivo:** Eliminar split-brain entre telas. Zero lógica local de prefill fora do módulo compartilhado.

**Implementação em `shared/questionario-prefill.ts`:**

- `buildCorporatePrefill()` — já existe, corrigir para incluir QC-02 (`qc02_filiais` via `multiState`/`hasMultipleEstablishments`)
- `buildOperationalPrefill()` — já existe, funciona com shape normalizado
- `buildCnaePrefill()` — já existe, funciona com shape normalizado
- Criar `buildCorporateSection2Prefill()` se necessário para QC-02

**Implementação nos questionários:**

- `QuestionarioCorporativoV2.tsx`: remover lógica local, importar e usar `buildCorporatePrefill()`
- `QuestionarioOperacional.tsx`: já usa builder, mas recebe shape não normalizado — corrigido pela Fase 2
- `QuestionarioCNAE.tsx`: já usa builder, mas recebe shape não normalizado — corrigido pela Fase 2

**Risco:** Médio — requer refatoração das telas.  
**Benefício:** Elimina CR-1 e CR-2. Cria ponto único de manutenção.  
**Dependências:** Fase 2 (normalização da API).

---

### Fase 4 — Distinguir Derivável vs. Não Derivável

**Objetivo:** Não transformar ausência de dado em bug.

Os campos `qc02_grupo` (grupo econômico) e `qc02_centralizacao` (operações centralizadas) não são coletados no formulário inicial. Eles devem permanecer em aberto por design — não devem ser pré-preenchidos com valores inventados.

**Implementação:** Documentar explicitamente na Prefill Contract Matrix (seção 3) e nos comentários do código que esses campos são `sem prefill legítimo`. Adicionar comentário no `buildCorporatePrefill()` explicando a ausência intencional.

**Risco:** Nenhum.  
**Benefício:** Evita "prefill alucinado" — pior que campo vazio.  
**Dependências:** Fase 3.

---

### Fase 5 — Suíte Permanente de Prefill Contract Tests

**Objetivo:** Impedir repetição desse erro. Criar categoria de teste que não existia.

**Nova família:** `prefill-contract.test.ts`

**Cobertura mínima obrigatória (10 casos):**

| # | Caso de Teste | Invariant validado |
|---|---|---|
| PCT-01 | `createProject` salva `taxRegime` em `companyProfile.taxRegime` | Path canônico de persistência |
| PCT-02 | `getById` retorna `companyProfile` como objeto (não string) | Normalização da API |
| PCT-03 | `buildCorporatePrefill` lê `companyProfile.taxRegime` e preenche `qc01_regime` | Builder corporativo QC-01 |
| PCT-04 | `buildCorporatePrefill` lê `operationProfile.multiState` e preenche `qc02_filiais` | Builder corporativo QC-02 |
| PCT-05 | `buildOperationalPrefill` com objeto normalizado preenche `qo01_canais` | Builder operacional |
| PCT-06 | `buildCnaePrefill` com `confirmedCnaes` array preenche `qcnae01_setor` | Builder CNAE |
| PCT-07 | `buildCorporatePrefill` com `companyProfile = null` retorna `{}` sem erro | Resiliência a null |
| PCT-08 | `buildOperationalPrefill` com `operationProfile` como string JSON retorna `{}` sem quebrar | Resiliência a serialização |
| PCT-09 | `qc02_grupo` e `qc02_centralizacao` NÃO aparecem em `buildCorporatePrefill` | Campos sem prefill legítimo |
| PCT-10 | Regressão: nenhum campo da Prefill Contract Matrix retorna vazio quando dado existe | Invariant crítico DA-5 |

**Dependências:** Fases 2 e 3.

---

### Fase 6 — Observabilidade do Prefill

**Objetivo:** Tornar erro de hidratação visível em produção.

**Implementação:** Adicionar telemetria interna nos builders:

```typescript
// shared/questionario-prefill.ts — telemetria (a implementar)
export interface PrefillTrace {
  prefill_fields_expected: string[];   // campos que deveriam ser preenchidos
  prefill_fields_resolved: string[];   // campos efetivamente preenchidos
  prefill_fields_missing: string[];    // campos esperados mas não resolvidos
  prefill_source_paths_used: string[]; // paths canônicos que foram lidos
  prefill_parse_errors: string[];      // erros de serialização capturados
}
```

Os builders retornam opcionalmente o trace. O frontend pode logar `prefill_fields_missing` no console em modo desenvolvimento.

**Risco:** Nenhum — é adição não-breaking.  
**Benefício:** Permite auditoria por projeto. Detecta regressões antes do usuário.  
**Dependências:** Fase 3.

---

### Fase 7 — Revalidação Obrigatória (Gate de UAT)

**Objetivo:** Gate formal antes de liberar advogados.

**Critérios binários de aceite:**

| Critério | Verificação |
|---|---|
| Zero campo mapeado reaparecendo vazio | Bateria manual: 10 projetos completos |
| Zero lógica local de prefill fora do shared | Revisão de código: `grep` nos 3 questionários |
| Zero dependência em coluna direta desatualizada | Revisão de código: `grep` por `p.taxRegime` e `p.companySize` diretos |
| Zero quebra por serialização | PCT-07 e PCT-08 passando |
| 100% dos campos da Prefill Contract Matrix documentados por origem | Matriz v1 completa e aprovada |
| Suíte PCT passando 10/10 | `pnpm test` verde |

**Protocolo de revalidação:**

1. Rodar `pnpm test` — todos os testes passando incluindo PCT-01..PCT-10
2. Criar 3 projetos completos do zero com perfis distintos (Simples Nacional/MEI, Lucro Presumido/Média, Lucro Real/Grande)
3. Para cada projeto: verificar os 3 questionários e confirmar que todos os 10 campos da Prefill Contract Matrix aparecem pré-preenchidos
4. Confirmar que `qc02_grupo` e `qc02_centralizacao` permanecem em aberto (sem prefill inventado)
5. Somente após aprovação de todos os critérios: liberar UAT com advogados

---

## 6. Priorização

| Fase | Prioridade | Motivo |
|---|---|---|
| Fase 0 — Contenção | P0 | Imediata — já executada |
| Fase 1 — Contrato canônico | P0 | Sem isso a correção vira remendo |
| Fase 2 — Normalização API | P0 | Resolve shape inconsistente na raiz |
| Fase 3 — Centralização builders | P0 | Elimina duplicidade e drift |
| Fase 4 — Derivável vs. não derivável | P1 | Evita prefill inventado |
| Fase 5 — Testes permanentes | P0 | Impede regressão estrutural |
| Fase 6 — Observabilidade | P1 | Acelera auditoria futura |
| Fase 7 — Revalidação | P0 | Gate antes do UAT |

---

## 7. Lacuna de Governança Identificada

O projeto tinha 423/423 testes passando e mesmo assim o defeito passou. A causa é uma lacuna de governança: havia governança forte para geração de conteúdo (requirement engine, question engine, gap, risco, ação, briefing), mas não havia governança equivalente para **hidratação do contexto já coletado**. O pré-preenchimento foi tratado como detalhe de UI quando é parte do contrato de entrada do diagnóstico. A Fase 5 (suíte PCT) fecha essa lacuna permanentemente.

---

*Documento produzido como artefato formal da Sub-Sprint Estrutural de Prefill Contract. Nenhuma implementação foi realizada até este ponto.*
