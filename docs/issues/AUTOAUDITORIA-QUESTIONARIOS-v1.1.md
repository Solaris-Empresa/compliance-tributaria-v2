# AUTOAUDITORIA — Questionários de Diagnóstico
**Versão:** 1.1 — Consolidada  
**Data de criação:** 2026-03-24  
**Data de atualização:** 2026-03-24  
**Autor:** Agente de Engenharia (Sub-Sprint Prefill Contract)  
**Status:** ✅ **APROVADO PARA UAT — SEM BLOQUEIOS**  
**Referência:** ISSUE-001 · Fase 1 Final do Prefill Contract · Pós-Autoauditoria  
**Checkpoint:** `ed4630c6`

> **Nota de versão:** Esta versão 1.1 consolida o estado real do sistema após a execução do plano pós-autoauditoria. BUG-001 e OBS-002 foram corrigidos. O sistema está aprovado para UAT sem bloqueios.

---

## SEÇÃO 1 — Escopo da Auditoria

Esta autoauditoria cobre o ciclo completo de dados dos 3 questionários de diagnóstico da Plataforma de Compliance da Reforma Tributária:

| Questionário | Arquivo | Seções | Perguntas |
|---|---|---|---|
| **Corporativo (QC)** | `QuestionarioCorporativoV2.tsx` | QC-01 a QC-10 | 22 perguntas + 10 obs |
| **Operacional (QO)** | `QuestionarioOperacional.tsx` | QO-01 a QO-10 | 20 perguntas + 10 obs |
| **CNAE** | `QuestionarioCNAE.tsx` | QCNAE-01 a QCNAE-05 | 15 perguntas + 5 obs |

**Perguntas totais auditadas:** 57 perguntas + 25 campos de observação = **82 campos**

**Escopo da auditoria:**
1. Integridade do contrato de prefill (DA-1 a DA-5)
2. Ausência de lógica local de prefill nos questionários
3. Normalização da API (nenhum campo JSON chega como string)
4. Cobertura de testes automatizados
5. Gaps de integração entre formulário de perfil e persistência
6. Sobreposição de perguntas entre questionários

---

## SEÇÃO 2 — Mapeamento Completo de Prefill

### 2.1 Questionário Corporativo (QC)

| Campo | Pergunta | Tipo Prefill | Fonte Canônica | Status |
|---|---|---|---|---|
| `qc01_regime` | Regime tributário atual | Direto | `companyProfile.taxRegime` | ✅ Implementado |
| `qc01_porte` | Porte da empresa | Direto | `companyProfile.companySize` | ✅ Implementado |
| `qc01_obs` | Observações (opcional) | Sem prefill legítimo | — | ✅ Correto |
| `qc02_grupo` | Integra grupo econômico? | Direto | `companyProfile.isEconomicGroup` | ✅ **Implementado e persistido (BUG-001 CORRIGIDO)** |
| `qc02_filiais` | Estabelecimentos em outros estados? | Derivado | `operationProfile.multiState` → fallback `taxComplexity.hasMultipleEstablishments` | ✅ Implementado |
| `qc02_centralizacao` | Operações fiscais centralizadas? | Direto | `companyProfile.taxCentralization` | ✅ **Implementado e persistido (BUG-001 CORRIGIDO)** |
| `qc02_obs` | Observações (opcional) | Sem prefill legítimo | — | ✅ Correto |
| `qc03_operacoes` a `qc10_*` | Perguntas de profundidade | Sem prefill legítimo | — | ✅ Correto (dados não coletados no perfil) |

### 2.2 Questionário Operacional (QO)

| Campo | Pergunta | Tipo Prefill | Fonte Canônica | Status |
|---|---|---|---|---|
| `qo01_canais` | Canais de venda | Derivado | `operationProfile.operationType` → `OPERATION_TYPE_TO_CANAIS` | ✅ Implementado |
| `qo01_clientes` | Perfil predominante de clientes | Derivado | `operationProfile.clientType[]` → `clientTypeToPerfilClientes()` | ✅ Implementado |
| `qo01_obs` | Observações (opcional) | Sem prefill legítimo | — | ✅ Correto |
| `qo03_meios` | Meios de pagamento recebidos | Direto | `financialProfile.paymentMethods[]` → `PAYMENT_METHOD_MAP` | ✅ Implementado |
| `qo08_equipe` | Como é gerida a área fiscal? | Derivado | `governanceProfile.hasTaxTeam` → `hasTaxTeamToEquipe()` | ✅ Implementado |
| Demais campos QO | Profundidade operacional | Sem prefill legítimo | — | ✅ Correto |

### 2.3 Questionário CNAE (QCNAE)

| Campo | Pergunta | Tipo Prefill | Fonte Canônica | Status |
|---|---|---|---|---|
| `qcnae01_setor` | Setor econômico principal | Derivado | `operationProfile.operationType` → `OPERATION_TYPE_TO_SETOR` | ✅ Implementado |
| `qcnae01_atividades` | Múltiplos CNAEs? | Derivado | `confirmedCnaes[].length` → `cnaeCountToAtividades()` | ✅ Implementado |
| `qcnae01_observacoes` | Informe os CNAEs (opcional) | Derivado | `confirmedCnaes[]` → `cnaesToObservacoes()` | ✅ Implementado |
| Demais campos QCNAE | Profundidade setorial | Sem prefill legítimo | — | ✅ Correto |

---

## SEÇÃO 3 — Verificação das Decisões Arquiteturais (DA-1 a DA-5)

### DA-1: Path canônico = JSON aninhado (companyProfile, operationProfile, etc.)
**Status: ✅ CONFORME**

Todos os builders leem exclusivamente dos paths canônicos:
- `companyProfile.taxRegime` (não `projeto.taxRegime` diretamente)
- `companyProfile.companySize` (não `projeto.companySize` diretamente)
- `companyProfile.isEconomicGroup`, `companyProfile.taxCentralization`
- `operationProfile.operationType`, `operationProfile.clientType[]`, `operationProfile.multiState`
- `financialProfile.paymentMethods[]`
- `governanceProfile.hasTaxTeam`
- `taxComplexity.hasMultipleEstablishments` (fallback para `qc02_filiais`)
- `confirmedCnaes[]`

O fallback para colunas diretas (`projeto.taxRegime`, `projeto.companySize`) existe apenas para compatibilidade com projetos legados criados antes da Sprint Estrutural.

### DA-2: Frontend nunca recebe string JSON — normalização feita na API
**Status: ✅ CONFORME**

`normalizeProject()` é aplicado em **todos** os pontos de saída de projeto:
- `getProjectById()` → linha 200 do `server/db.ts`
- `getProjectsByUser()` → linha 228 do `server/db.ts`

Todos os routers (`routers.ts`, `routers-fluxo-v3.ts`) usam exclusivamente `db.getProjectById()` e `db.getProjectsByUser()` — nenhum router executa query direta à tabela `projects`.

`safeParseJson()` garante fallback gracioso para qualquer campo que chegue como string (projetos legados).

### DA-3: Nenhum questionário tem lógica local de prefill — tudo no shared
**Status: ✅ CONFORME**

Verificação por arquivo:
- `QuestionarioCorporativoV2.tsx`: importa `buildCorporatePrefill` de `@shared/questionario-prefill` (linha 32). Nenhuma lógica local de mapeamento. O banner informativo na linha 316 usa `companyProfile.taxRegime` e `companyProfile.companySize` (path canônico — OBS-002 corrigido).
- `QuestionarioOperacional.tsx`: importa `buildOperationalPrefill` de `@shared/questionario-prefill` (linha 41). Nenhuma lógica local.
- `QuestionarioCNAE.tsx`: importa `buildCnaePrefill` de `@shared/questionario-prefill` (linha 39). Nenhuma lógica local.

### DA-4: Três tipos de prefill — direto | derivado | sem prefill legítimo
**Status: ✅ CONFORME**

Todos os campos classificados corretamente. Ver Seção 2 para mapeamento completo.

### DA-5: Campo coletado + mapeado = não pode reaparecer vazio
**Status: ✅ CONFORME — BUG-001 CORRIGIDO**

`qc02_grupo` e `qc02_centralizacao` são coletados no formulário de perfil (Seção 6.5 — Estrutura Societária), persistidos corretamente no banco e mapeados nos builders. O fluxo E2E está íntegro para todos os 12 campos de prefill.

---

## SEÇÃO 4 — Cobertura de Testes Automatizados

| Suíte | Arquivo | Testes | Status |
|---|---|---|---|
| PCT v1 — Prefill Contract Tests | `server/prefill-contract.test.ts` | 117 | ✅ 117/117 |
| PCT v2 — Checklist 10 Blocos | `server/prefill-contract-v2.test.ts` | 81 | ✅ 81/81 |
| INV-006/007/008 | `server/invariants-606-607-608.test.ts` | 47 | ✅ 47/47 |
| E2E Fase 2 — 10 Cenários | `server/fase2-e2e-validation.test.ts` | 132 | ✅ 132/132 |
| BUG-001 Regressão | `server/bug001-regression.test.ts` | 33 | ✅ 33/33 |
| **Total** | | **410** | **✅ 410/410** |

**Cobertura por builder:**

| Builder | Cenários testados | Campos cobertos |
|---|---|---|
| `buildCorporatePrefill` | 10 cenários × 8 blocos | `qc01_regime`, `qc01_porte`, `qc02_grupo`, `qc02_filiais`, `qc02_centralizacao` |
| `buildOperationalPrefill` | 10 cenários × 8 blocos | `qo01_canais`, `qo01_clientes`, `qo03_meios`, `qo08_equipe` |
| `buildCnaePrefill` | 10 cenários × 8 blocos | `qcnae01_setor`, `qcnae01_atividades`, `qcnae01_observacoes` |
| `normalizeProject` | Cenários legado + null + objeto | Todos os 14 campos JSON |

---

## SEÇÃO 5 — Histórico de Achados

> Esta seção documenta os problemas identificados durante a auditoria e seu estado de resolução. Todos os problemas foram resolvidos antes do UAT.

### BUG-001 — `isEconomicGroup` e `taxCentralization` não persistidos no banco

**Status: ✅ CORRIGIDO**

**Descrição original:** O `NovoProjeto.tsx` montava o objeto `companyProfile` (linhas 468-474) sem incluir os campos `isEconomicGroup` e `taxCentralization`. O usuário preenchia a Seção 6.5 (Estrutura Societária), mas esses valores eram descartados antes de chegar ao backend.

**Correção aplicada:** Adicionadas 2 linhas ao objeto `companyProfile` em `client/src/pages/NovoProjeto.tsx` (linhas 474-476):
```diff
+ isEconomicGroup: perfilData.isEconomicGroup,
+ taxCentralization: perfilData.taxCentralization,
```

**Evidências:**
- Commit: `ed4630c6` (Checkpoint Pós-Autoauditoria)
- Suíte de regressão: `server/bug001-regression.test.ts` — 33/33 ✅
- TypeScript: `tsc --noEmit` EXIT:0

**Impacto após correção:** Eliminado. `qc02_grupo` e `qc02_centralizacao` são agora pré-preenchidos corretamente.

---

### OBS-001 — Sobreposição entre QC-07 e QO-03

**Status: ⏳ DECISÃO PENDENTE (não bloqueante)**

**Descrição:** `qc07_meios` (QC-07) e `qo03_meios` (QO-03) fazem perguntas relacionadas a meios de pagamento. Após análise detalhada, as perguntas têm propósitos distintos: QC-07 avalia preparação jurídica/tecnológica para o split payment; QO-03 avalia o fluxo operacional de recebimento.

**Decisão do PO:** DECISÃO-001 — em aberto. Não bloqueia UAT.

---

### OBS-002 — Banner de prefill usava colunas diretas legadas

**Status: ✅ CORRIGIDO**

**Descrição original:** O banner informativo no QC-01 (linha 316 do `QuestionarioCorporativoV2.tsx`) verificava `(projeto as any)?.taxRegime || (projeto as any)?.companySize` — colunas diretas legadas — em vez dos paths canônicos.

**Correção aplicada:** Linha 316 atualizada para usar `companyProfile.taxRegime` e `companyProfile.companySize`:
```diff
- {secao.codigo === "QC-01" && ((projeto as any)?.taxRegime || (projeto as any)?.companySize) && (
+ {secao.codigo === "QC-01" && ((projeto as any)?.companyProfile?.taxRegime || (projeto as any)?.companyProfile?.companySize) && (
```

**Evidências:** Commit `ed4630c6`. Impacto após correção: eliminado.

---

## SEÇÃO 6 — Verificação de Integridade do Fluxo E2E

### Fluxo completo de um campo pré-preenchível (estado atual — todos os elos íntegros):

```
[Usuário preenche perfil]
  → PerfilEmpresaIntelligente.tsx (coleta dado)
  → NovoProjeto.tsx (monta payload — ✅ inclui isEconomicGroup e taxCentralization)
  → routers-fluxo-v3.ts createProject (valida Zod, persiste)
  → drizzle/schema.ts projects.companyProfile (JSON no banco)
  → db.getProjectById() → normalizeProject() (JSON → objeto)
  → tRPC response (objeto normalizado)
  → QuestionarioCorporativoV2.tsx useEffect
  → buildCorporatePrefill(projeto) (builder canônico)
  → setRespostas(prefill) (estado do formulário)
  → Campo pré-preenchido visível ao usuário
```

**Campos com fluxo 100% íntegro:** `qc01_regime`, `qc01_porte`, `qc02_grupo`, `qc02_filiais`, `qc02_centralizacao`, `qo01_canais`, `qo01_clientes`, `qo03_meios`, `qo08_equipe`, `qcnae01_setor`, `qcnae01_atividades`, `qcnae01_observacoes`

**Campos com fluxo quebrado:** nenhum.

---

## SEÇÃO 7 — Conformidade com Invariant Registry

| Invariant | Descrição | Status |
|---|---|---|
| INV-001 | Prefill Contract Matrix — builders canônicos | ✅ CONFORME |
| INV-002 | API normalizada — JSON nunca como string | ✅ CONFORME |
| INV-003 | Sem lógica local de prefill nos questionários | ✅ CONFORME |
| INV-004 | Testes PCT passando | ✅ 410/410 |
| INV-005 | normalizeProject aplicado em todos os retornos | ✅ CONFORME |
| INV-006 | Riscos gerados com estrutura válida | ✅ CONFORME |
| INV-007 | Planos de ação vinculados a riscos existentes | ✅ CONFORME |
| INV-008 | Briefing com campos obrigatórios | ✅ CONFORME |

---

## SEÇÃO 8 — Estado Atual Consolidado e Decisão de Gate

### Estado Atual Consolidado

O sistema encontra-se no seguinte estado após a execução completa da Sub-Sprint Estrutural de Prefill Contract e do plano pós-autoauditoria:

- **Zero bugs críticos** — BUG-001 corrigido, nenhum outro bug P0 ou P1 identificado
- **Zero inconsistências estruturais** — todos os 5 invariants arquiteturais (DA-1 a DA-5) conformes
- **Prefill contract completo** — 12 campos pré-preenchidos com fluxo E2E íntegro de ponta a ponta
- **Testes passando** — 410/410 testes automatizados, regressão zero
- **TypeScript limpo** — `tsc --noEmit` EXIT:0, zero erros reais
- **Pronto para validação com usuários** — sistema estável, documentado e coberto por testes

### Critérios de Aceite para UAT

| Critério | Peso | Status |
|---|---|---|
| DA-1 a DA-5 conformes | Bloqueante | ✅ TODOS CONFORMES |
| 410/410 testes passando | Bloqueante | ✅ |
| Nenhuma lógica local de prefill | Bloqueante | ✅ |
| normalizeProject em todos os retornos | Bloqueante | ✅ |
| BUG-001 corrigido | Bloqueante | ✅ CORRIGIDO |
| OBS-002 corrigido | Informativo | ✅ CORRIGIDO |

### Decisão

> **✅ APROVADO PARA UAT — SEM BLOQUEIOS**

Todos os critérios bloqueantes estão satisfeitos. O sistema está pronto para validação com advogados. A DECISÃO-001 (sobreposição QC-07/QO-03) permanece em aberto como decisão de produto não bloqueante.

---

*Documento produzido como parte da Sub-Sprint Estrutural de Prefill Contract — ISSUE-001*  
*Versão 1.1 — Estado consolidado pós-correção de BUG-001 e OBS-002*  
*Próxima revisão: após UAT com advogados*
