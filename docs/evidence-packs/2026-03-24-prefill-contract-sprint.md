# Evidence Pack — Sub-Sprint Estrutural de Prefill Contract

> **Evidence Pack canônico** — serve como exemplo de referência para futuras issues estruturais.

---

## Metadados

| Campo | Valor |
|---|---|
| **Data** | 2026-03-24 |
| **Issue** | Sub-Sprint Estrutural (sem número de issue — iniciada pelo orquestrador) |
| **PR** | Sub-Sprint direta (sem PR formal — executada em sprint dedicada) |
| **Checkpoint** | `manus-webdev://f1babb41` |
| **Autor** | Manus AI (agente executor) |
| **Severidade** | 🔴 CRÍTICO — afetava os 3 questionários do fluxo principal |
| **Invariant afetado** | `campo_coletado_no_perfil → nunca_reaparece_vazio_no_questionario` |

---

## 1. Relatório de Diagnóstico

### Problema Identificado

Os 3 questionários do fluxo de diagnóstico (Corporativo, Operacional e CNAE) não exibiam os dados coletados no formulário de perfil da empresa como pré-preenchimento. O usuário preenchia regime tributário, porte, tipo de operação, CNAEs confirmados e outros campos no `PerfilEmpresaIntelligente`, mas ao abrir os questionários, todos os campos apareciam em branco — forçando o usuário a responder perguntas já respondidas.

### 4 Causas Raiz Técnicas Identificadas

**DA-1 — Path canônico ausente:**
```
Arquivo:   shared/questionario-prefill.ts
Causa:     builders liam p.taxRegime (coluna direta legada) mas dados novos
           são persistidos em p.companyProfile.taxRegime (JSON canônico).
           Path canônico não estava mapeado nos builders.
```

**DA-2 — API entregava string JSON:**
```
Arquivo:   server/db.ts → getProjectById()
Função:    getProjectById
Causa:     MySQL2 + Drizzle retornam colunas json() como string quando
           typeCast não está configurado. normalizeProject() não existia.
           Frontend recebia string onde esperava objeto.
```

**DA-3 — Lógica local no QuestionarioCorporativoV2:**
```
Arquivo:   client/src/pages/QuestionarioCorporativoV2.tsx
Causa:     useEffect de prefill usava TAX_REGIME_MAP e COMPANY_SIZE_MAP
           locais, duplicando e divergindo da lógica do shared.
           QO e CNAE já usavam builders corretamente.
```

**DA-4 — Campos QC-02 sem fonte:**
```
Causa:     qc02_grupo e qc02_centralizacao não são coletados no formulário
           inicial. Builders tentavam preencher campos sem fonte, gerando
           valores incorretos ou undefined não tratado.
```

### Como Foi Identificada

Diagnóstico técnico profundo realizado pelo agente executor:
- Leitura completa dos 3 questionários (useEffect de prefill)
- Leitura do `shared/questionario-prefill.ts` (builders existentes)
- Leitura do `server/db.ts` (getProjectById, getProjectsByUser)
- Análise do schema Drizzle (`drizzle/schema.ts`)
- Análise do `NovoProjeto.tsx` (o que é persistido no createProject)
- Verificação da configuração MySQL2/Drizzle (ausência de typeCast)

---

## 2. Payload Antes / Depois

### Estado Antes da Correção (DA-2)

```json
{
  "id": 123,
  "companyProfile": "{\"taxRegime\":\"lucro_real\",\"companySize\":\"grande\"}",
  "operationProfile": "{\"operationType\":\"servicos\",\"clientType\":[\"b2b\"]}",
  "confirmedCnaes": "[{\"code\":\"6201-5/01\",\"description\":\"...\"}]"
}
```
*Campos JSON chegavam como **string** ao frontend — `typeof companyProfile === "string"`*

### Estado Depois da Correção (DA-2)

```json
{
  "id": 123,
  "companyProfile": { "taxRegime": "lucro_real", "companySize": "grande" },
  "operationProfile": { "operationType": "servicos", "clientType": ["b2b"] },
  "confirmedCnaes": [{ "code": "6201-5/01", "description": "..." }]
}
```
*Campos JSON chegam como **objetos** ao frontend — `typeof companyProfile === "object"`*

### Diff Conceitual — DA-2 (db.ts)

```diff
- return result[0];
+ return result[0] ? normalizeProject(result[0]) : undefined;
```

### Diff Conceitual — DA-1 (shared/questionario-prefill.ts)

```diff
- const taxRegime = p.taxRegime;                          // coluna direta (legado)
+ const taxRegime = p.companyProfile?.taxRegime           // path canônico (DA-1)
+                ?? p.taxRegime;                          // fallback legado
```

### Diff Conceitual — DA-3 (QuestionarioCorporativoV2.tsx)

```diff
- // lógica local com TAX_REGIME_MAP e COMPANY_SIZE_MAP locais
- const regime = TAX_REGIME_MAP[p.taxRegime] ?? p.taxRegime;
- const porte = COMPANY_SIZE_MAP[p.companySize] ?? p.companySize;
- setRespostas(prev => ({ qc01_regime: regime, qc01_porte: porte, ...prev }));

+ // builder canônico do shared
+ const prefill = buildCorporatePrefill(p);
+ if (Object.keys(prefill).length > 0) {
+   setRespostas(prev => ({ ...prefill, ...prev }));
+ }
```

---

## 3. Evidência Visual

**Antes:** Ao abrir o Questionário Corporativo com um projeto que tinha regime tributário "Lucro Real" e porte "Grande", o campo QC-01 aparecia em branco — o usuário precisava selecionar novamente.

**Depois:** Ao abrir o Questionário Corporativo, o campo QC-01 aparece pré-preenchido com "Lucro Real" e "Grande porte (acima de R$ 78 mi)" automaticamente, sem interação do usuário.

*(Evidência visual disponível via checkpoint `manus-webdev://f1babb41` — abrir projeto com perfil completo e navegar para /questionario-corporativo)*

---

## 4. Lista de Testes Adicionados

| Arquivo | Bloco | Teste | Invariant coberto |
|---|---|---|---|
| `server/prefill-contract.test.ts` | BLOCO 1 | `NormalizedProjectForPrefill define todos os JSONs canônicos` | Contrato de tipo |
| `server/prefill-contract.test.ts` | BLOCO 1 | `normalizeProject cobre todos os JSONs canônicos do schema` | DA-2 |
| `server/prefill-contract.test.ts` | BLOCO 2 | `safeParseJson: string JSON é parseada corretamente` | DA-2 |
| `server/prefill-contract.test.ts` | BLOCO 2 | `normalizeProject: campos JSON como string são convertidos` | DA-2 |
| `server/prefill-contract.test.ts` | BLOCO 2 | `normalizeProject: não lança erro com objeto null/undefined` | Robustez |
| `server/prefill-contract.test.ts` | BLOCO 3 | `buildCorporatePrefill é uma função exportada do shared` | DA-1 |
| `server/prefill-contract.test.ts` | BLOCO 4 | `TAX_REGIME_MAP — cobertura completa (4 regimes)` | Matriz |
| `server/prefill-contract.test.ts` | BLOCO 4 | `COMPANY_SIZE_MAP — cobertura completa (5 portes)` | Matriz |
| `server/prefill-contract.test.ts` | BLOCO 4 | `OPERATION_TYPE_TO_CANAIS — cobertura completa (8 tipos)` | Matriz |
| `server/prefill-contract.test.ts` | BLOCO 4 | `campos sem prefill legítimo NÃO estão nos builders (DA-4)` | DA-4 |
| `server/prefill-contract.test.ts` | BLOCO 5 | `regime tributário coletado → qc01_regime preenchido` | Invariant crítico |
| `server/prefill-contract.test.ts` | BLOCO 5 | `operationType coletado → qo01_canais preenchido` | Invariant crítico |
| `server/prefill-contract.test.ts` | BLOCO 5 | `paymentMethods coletados → qo03_meios preenchido` | Invariant crítico |
| `server/prefill-contract.test.ts` | BLOCO 6 | `lucro_presumido → 'Lucro Presumido'` | Prefill direto |
| `server/prefill-contract.test.ts` | BLOCO 6 | `multiState=true → qc02_filiais='Sim'` | Prefill derivado |
| `server/prefill-contract.test.ts` | BLOCO 6 | `b2b+b2c → 'Misto (B2B e B2C)'` | Prefill derivado |
| `server/prefill-contract.test.ts` | BLOCO 7 | `projeto completamente vazio não quebra builders` | Robustez |
| `server/prefill-contract.test.ts` | BLOCO 7 | `paymentMethods com valor desconhecido é filtrado` | Robustez |
| `server/prefill-contract.test.ts` | BLOCO 8 | `buildCorporatePrefill com trace registra paths usados` | PrefillTrace |
| `server/prefill-contract.test.ts` | BLOCO 8 | `trace sem option não polui o objeto de retorno` | PrefillTrace |
| `server/prefill-contract.test.ts` | BLOCO 9 | `REGRESSÃO: coluna direta (legado) ainda funciona` | Compatibilidade |
| `server/prefill-contract.test.ts` | BLOCO 9 | `REGRESSÃO: companyProfile tem prioridade sobre colunas diretas` | DA-1 |
| `server/prefill-contract.test.ts` | BLOCO 10 | `Caso 1 — zero repetições: nenhum campo coletado reaparece vazio` | Invariant crítico |
| `server/prefill-contract.test.ts` | BLOCO 10 | `Caso 3 — projeto inconsistente: coluna direta funciona como fallback` | Compatibilidade |

**Total de testes novos:** 117

---

## 5. Resultado dos Testes

### Suíte PCT (Prefill Contract Tests)

```
pnpm vitest run server/prefill-contract.test.ts --reporter=verbose

 Test Files  1 passed (1)
       Tests  117 passed (117)
    Start at  10:36:41
    Duration  752ms (transform 197ms, setup 0ms, collect 444ms, tests 34ms)
```

**Resultado: ✅ 117/117 passando**

---

## 6. Links de Commit / PR / Checkpoint

| Artefato | Link / Referência |
|---|---|
| Commit 1 — docs/contrato | `docs/prefill-contract-sprint.md` criado |
| Commit 2 — normalização API | `server/db.ts` — `normalizeProject()` + `safeParseJson()` |
| Commit 3 — builders canônicos | `shared/questionario-prefill.ts` reescrito |
| Commit 4 — eliminação lógica local | `QuestionarioCorporativoV2.tsx` refatorado |
| Commit 5 — testes PCT | `server/prefill-contract.test.ts` criado (117 testes) |
| Commit 6 — normalização listagens | `getProjectsByUser()` atualizado |
| Checkpoint | `manus-webdev://f1babb41` |

---

## 7. Risco Residual

**Risco identificado:** Campos QC-02 (grupo econômico, filiais, centralização tributária) ainda não são coletados no formulário de perfil inicial (`PerfilEmpresaIntelligente`). Os builders não os preenchem (DA-4), mas esses campos continuam sem fonte de dados.

**Por que é aceitável:** Os campos QC-02 sem fonte são tratados como "não aplicável" — o questionário os exibe em branco para preenchimento manual, que é o comportamento correto quando o dado não foi coletado. Não há regressão.

**Mitigação:** DA-4 documentado explicitamente nos builders com comentário `// DA-4: não coletado no formulário inicial`. Testes cobrem que esses campos permanecem `undefined` (não preenchidos incorretamente).

---

## Aprovação do Orquestrador

- [x] **Gate obtido em:** 2026-03-24
- [x] **Aprovado por:** Orquestrador (via instrução de sub-sprint estrutural)
- [x] **Observações:** Sprint executada conforme diretrizes do orquestrador. 117/117 testes passando. Checkpoint salvo.
