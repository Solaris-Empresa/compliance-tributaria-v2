# Validação da SPEC v3 (`M1-PERFIL-ENTIDADE-v3`) contra o código real

> Executado 2026-04-23 · base: `CODIGO-ATUAL-VERDADE.md` + leituras adicionais · sem implementação · objetivo: achar mentiras, gaps, ambiguidades ou conflitos entre a spec e o código existente.

---

## Veredito

🟡 **AMARELO** — a spec é **direcionalmente correta** e usa referências reais do código, mas tem **8 desalinhamentos** que precisam endereçamento antes de virar contrato de implementação. Nenhum é fatal; todos são corrigíveis em ≤1 iteração.

| Eixo | Status |
|---|---|
| Princípios declarados | 🟢 consistentes com código existente |
| Modelo de dados (origens) | 🟡 falta `companyProfile` na lista de origens |
| Campos-chave | 🟡 mistura existentes + novos sem sinalizar |
| Derivações | 🔴 conflito: `possui_bens`/`possui_servicos` são campos hoje, não derivados |
| Eligibilidade | 🟡 conceito novo; mapeamento DET→eligibility muda comportamento |
| Integração com código | 🟡 4 referências corretas; 2 com ajuste necessário |
| `status_arquetipo` nomenclatura | 🔴 3 nomenclaturas diferentes nas 3 versões (v1/v2/v3) |
| `STOP_IF_NOT_ELIGIBLE` | 🟡 gate novo; código atual tem gates pontuais, não unificado |
| Rastreabilidade de risco | 🟢 alinhada (spec reconhece gaps que CODIGO-ATUAL-VERDADE listou) |
| Critérios GO M1 | 🟢 compatíveis com `REGRA-M1-GO-NO-GO` |

---

## Validação por seção

### 1. `modelo_dados.perfil_entidade.origem`

| Item da spec | Existe no código? | Evidência | Gap |
|---|---|---|---|
| `PerfilEmpresaData` | ✅ sim | `client/src/components/PerfilEmpresaIntelligente.tsx:31-78` | — |
| `operationProfile` | ✅ sim (coluna JSON) | `drizzle/schema.ts` + `extractProjectProfile` | — |
| `taxComplexity` | ✅ sim (coluna JSON) | idem | — |
| `financialProfile` | ✅ sim (coluna JSON) | idem | — |
| `governanceProfile` | ✅ sim (coluna JSON) | idem | — |
| **`companyProfile`** | ✅ **existe mas NÃO está listado na spec** | `drizzle/schema.ts` — contém `cnpj, companyType, companySize, taxRegime, annualRevenueRange` | 🔴 **omissão crítica** — spec não pode ignorar a coluna que guarda CNPJ/regime |

**Correção v3.1:** adicionar `companyProfile` à lista de origens. Sem ele, não há como unificar dados centrais (CNPJ, regime, porte).

---

### 2. `modelo_dados.campos_chave` — 15 campos listados

| Campo | Existe hoje? | Onde | Nota |
|---|---|---|---|
| `natureza_da_operacao` | 🔴 **NÃO existe como listado** | Existe `operationType` **singular enum** (6 valores) em `PerfilEmpresaIntelligente.tsx:37` — NÃO array multi | Se spec quer `natureza_da_operacao` como array multi, é **campo novo** que sobrescreve `operationType` |
| `possui_bens` (derivado) | ✅ existe | `PerfilEmpresaIntelligente.tsx:~50s` | 🔴 **conflito:** código tem como campo independente, spec diz "derivado" → ver seção 3 |
| `possui_servicos` (derivado) | ✅ existe | idem | idem |
| `papel_operacional` | ❌ **NÃO existe no código** | — | Campo novo (é o `papel_operacional_especifico` da spec v2) |
| `cnae_principal` | ✅ existe | `drizzle/schema.ts` coluna `confirmedCnaes` (array) | Spec usa singular; código usa array de CNAEs |
| `ncm` | ✅ existe | `PerfilEmpresaIntelligente.tsx:52` — `principaisProdutos[].ncm_code` | Formato: array de `{ncm_code, descricao, percentualFaturamento}` |
| `nbs` | ✅ existe | `PerfilEmpresaIntelligente.tsx:53` — `principaisServicos[].nbs_code` | Formato: array de `{nbs_code, descricao, percentualFaturamento}` |
| `multiState` | ✅ existe | `PerfilEmpresaIntelligente.tsx:39` | Boolean nullable |
| `taxRegime` | ✅ existe | `drizzle/schema.ts:87-91` | Enum 3 valores (simples_nacional, lucro_presumido, lucro_real) |
| `annualRevenueRange` | ✅ existe | `PerfilEmpresaIntelligente.tsx:35` | Enum 4 faixas |
| `setor_regulado` | ❌ **NÃO existe no código** | — | Campo novo |
| `orgao_regulador` | ❌ **NÃO existe no código** | — | Campo novo |
| `opera_territorio_incentivado` | ❌ **NÃO existe no código** | — | Campo novo |
| `papel_comercio_exterior` | ❌ **NÃO existe no código** | — | Campo novo |
| `isEconomicGroup` | ✅ existe | `PerfilEmpresaIntelligente.tsx:49` | Hoje sem efeito determinístico (flag QC-02 prep); spec quer usar como blocker — comportamento MUDA |

**Resumo dos 15 campos-chave:**
- ✅ **10 existem no código** (podem ser reaproveitados)
- 🔴 **5 são campos novos** (`papel_operacional`, `setor_regulado`, `orgao_regulador`, `opera_territorio_incentivado`, `papel_comercio_exterior`)
- ⚠️ **2 mudam comportamento** (`natureza_da_operacao` array vs `operationType` singular; `isEconomicGroup` passa a ser blocker)

**Correção v3.1:** marcar explicitamente quais são **existentes** e quais são **novos** (coluna adicional na spec). Sem isso, implementador não sabe o que reaproveitar vs criar.

---

### 3. `derivacoes` — 3 regras

| Regra da spec | Alinhada com código? | Evidência | Gap |
|---|---|---|---|
| `possui_bens = natureza_da_operacao inclui produto ou misto` | 🔴 **conflito com código atual** | `PerfilEmpresaIntelligente.tsx:50` define `possui_bens` como **campo independente boolean** (user marca ou não) | Se virar derivado, quebra compatibilidade — usuário perde controle independente |
| `possui_servicos = natureza_da_operacao inclui servico ou misto` | idem | `PerfilEmpresaIntelligente.tsx:51` | idem |
| `tipo_operacao_normalizado compatível com gate IS v2.1` | 🟡 depende do contexto | Hotfix IS v2 fechou 2026-04-22 com alias `servico → servicos` (ADR-0030) | Spec não cita o ADR; confirmar que tabela de alias é reaproveitada |

**Conflito crítico (🔴):**

O código atual permite ao usuário marcar `possui_bens=true` **mesmo** se `operationType` não for "industria/comercio/...". É um check independente. A spec transforma em derivação, o que:
- **Remove** a caixa de check do usuário (simplifica)
- **Muda** o modelo mental: agora `operationType` vira a única fonte da verdade

**Problema:** o bug original do hotfix IS (transportadora sendo tratada como "servicos" genérico) foi PRECISAMENTE porque o código derivou mal o tipo. Derivar agora pode reintroduzir a mesma classe de bug se a regra for incompleta.

**Correção v3.1:** explicitar a tabela de derivação com TODOS os casos cobertos, ou manter `possui_bens`/`possui_servicos` como campos independentes com validação cruzada (warning se contraditório com natureza, sem bloquear).

---

### 4. `elegibilidade`

| Item | Existe no código? | Observação |
|---|---|---|
| Campo `eligibility.overall` | ❌ **NÃO existe** | Conceito novo inteiro |
| Valores `allowed`, `denied`, `pending` | ❌ **NÃO existem** | Máquina de estados nova |
| Mapeamento DET-001/004 → denied | 🟡 parcial | No código, DET-001/004 são **CRITICAL** que bloqueiam via `canProceed=false` em `consistencyEngine.ts:118-135, 172-185`. Spec traduz CRITICAL→denied — consistente |
| Mapeamento DET-002/003/005 → pending | 🔴 **muda comportamento** | No código, DET-002 (HIGH), DET-003 (HIGH), DET-005 (MEDIUM) são **warnings** que permitem proceed. Spec vai mapear para pending, que bloqueia o E2E via `STOP_IF_NOT_ELIGIBLE`. Warnings historicamente permitem avançar — com spec v3 vão bloquear. Comportamento novo |
| Mapeamento `completeness < 100` → pending | 🔴 **muda comportamento** | No código, `calcProfileScore.completeness` é informativo. Bloquear E2E por `completeness<100` é gate novo que ninguém tem hoje |
| `multi-CNPJ → denied` | 🟡 parcial | `isEconomicGroup` existe mas hoje sem efeito (`PerfilEmpresaIntelligente.tsx:49`); spec vai transformar em blocker |

**Alerta importante (🔴):** converter **warnings** em **pending que bloqueia** é regressão de UX se não for bem comunicada. Hoje um MEI em multi-estado (DET-003 HIGH warning) avança com alerta. Na spec v3, esse mesmo MEI fica `pending` e **não pode nem ver o briefing**. Isso pode ser intencional (endurecer gate) ou acidental — precisa ser explícito.

---

### 5. `integracao_codigo_atual`

| Referência da spec | Precisão | Observação |
|---|---|---|
| "consistencyEngine fonte primária de inconsistências" | 🟢 preciso | `server/consistencyEngine.ts:118-199` tem as 5 regras DET |
| "DET-001, DET-004 → denied" | 🟢 preciso (são CRITICAL no código) | Hard blocks confirmados |
| "DET-002, DET-003, DET-005 → pending" | 🟡 traduz warnings em blockers | Ver seção 4 acima |
| "calcProfileScore fonte de completude" | 🟢 preciso | `PerfilEmpresaIntelligente.tsx:169-202` |
| "completeness < 100 → pending" | 🔴 **muda comportamento** | Hoje não bloqueia; com spec vai bloquear |
| "unificar 5 JSONs sem criar novo schema" | 🟡 depende da interpretação | Se "unificar" = view materializada TypeScript sem DDL → OK. Se "unificar" = nova coluna `perfil_entidade` JSON → contradiz "sem novo schema" |

**Correção v3.1:** esclarecer como "unificar" funciona — função `buildPerfilEntidade(project)` em `@shared/` que retorna view (reaproveitando 5 colunas existentes) seria o caminho sem schema novo.

---

### 6. `status_arquetipo.valores`

Terceira nomenclatura em 3 versões. Precisa escolher uma antes de congelar spec:

| Versão | Valores usados |
|---|---|
| v1 JSON (original P.O.) | `valido` |
| v2 (avaliador) | `valido`, `incompleto`, `bloqueado`, `ambiguo` |
| **v3 SPEC** | `pendente`, `inconsistente`, `confirmado` |

🔴 **Inconsistência:** runner atual retorna `valido/incompleto/bloqueado`. Spec v3 quer `confirmado/inconsistente/pendente`. Bateria de 50 cenários **quebra** se status nomenclatura mudar — todos os `expected_arquetipo_minimo.status_arquetipo = "valido"` viram falsos negativos.

**Correção v3.1:** escolher **um** vocabulário e aplicar retroativamente na bateria v2. Sugestão (a P.O. decide): **`pendente`, `bloqueado`, `confirmado`** — "inconsistente" confunde com `Inconsistencia` do briefing JSON (ver §7.2 do CODIGO-ATUAL-VERDADE).

---

### 7. `regra_global.STOP_IF_NOT_ELIGIBLE`

| Aspecto | Alinhamento com código |
|---|---|
| Condição `status_arquetipo != confirmado OR eligibility != allowed` | 🔴 ambos os campos são **novos** no código atual |
| Ação "bloquear RAG" | 🟡 hoje não há gate antes de RAG; RAG é chamada livre em `server/_core/llm.ts` via vários routers |
| Ação "bloquear perguntas" | 🟡 existe `canProceed` em `consistencyRouter.analyze()`, mas não bloqueia geração de perguntas — bloqueia só progressão pós-diagnóstico |
| Ação "bloquear briefing" | 🟡 idem |
| Ação "bloquear riscos" | 🟡 idem |
| Ação "bloquear plano" | 🟡 idem |

**Observação crítica:** o gate **único e E2E** proposto é uma arquitetura nova. O código atual tem:
- `consistencyRouter.analyze()` → gate pré-diagnóstico
- `briefing-confidence-signals.ts` → score que influencia UX, não bloqueia
- Nenhum gate global que trave RAG/perguntas/briefing/riscos/plano simultaneamente

Implementar `STOP_IF_NOT_ELIGIBLE` exige:
1. Middleware tRPC em ≥5 routers (`questionEngine`, `briefingEngine`, `risks-v4`, `action-plan-engine-v4`, `rag`)
2. Função central `isEligible(project)` em `@shared/`
3. Respostas HTTP 409 ou payload com `blocked: true` que UI reconheça

**Correção v3.1:** detalhar **onde** o gate roda. Sem isso, implementador vai por intuição e pode furar algum caminho.

---

### 8. `fluxo`

```
input_formulario → construir_perfil_entidade → calcular_inconsistencias
  → calcular_completude → derivar_arquetipo → calcular_eligibilidade
  → if NOT allowed → STOP
  → else → RAG → perguntas → riscos
```

| Passo | Existe no código? |
|---|---|
| `input_formulario` | ✅ `PerfilEmpresaIntelligente.tsx` |
| `construir_perfil_entidade` | 🔴 novo — unificação em view |
| `calcular_inconsistencias` | ✅ `consistencyEngine.runDeterministicChecks()` |
| `calcular_completude` | ✅ `calcProfileScore()` |
| `derivar_arquetipo` | 🔴 novo — função `buildArquetipo()` |
| `calcular_eligibilidade` | 🔴 novo — função `computeEligibility()` |
| `if NOT allowed → STOP` | 🔴 novo — gate global |
| `RAG → perguntas → riscos` | ✅ existe, mas hoje sem gate à frente |

🟢 3 passos existem e são reaproveitáveis.
🔴 4 passos são novos.

---

### 9. `ux`

| Item | Código atual |
|---|---|
| Label "Perfil da Entidade" | Hoje é "Perfil da Empresa" — muda label UI |
| Painel lateral | `PerfilEmpresaIntelligente.tsx` tem painel de score (completeness + confidence); spec quer expandir para status + campos faltantes + inconsistências + bloqueios |
| Mostrar: status, campos faltantes, inconsistências, bloqueios | Parcial: `AlertasInconsistencia.tsx` mostra inconsistências pós-briefing, não pré-diagnóstico |

**Observação:** "Perfil da Empresa" → "Perfil da Entidade" é mudança de label em múltiplos lugares (componentes, breadcrumbs, testes E2E). Não é só CSS — é mudança de vocabulário do produto.

---

### 10. `riscos`

| Aspecto da spec | Alinhamento com CODIGO-ATUAL-VERDADE.md |
|---|---|
| "risco só pode ser gerado se `eligibility.overall = allowed`" | 🟡 implica gate novo em `risksV4.generateRisks` — hoje não há checagem |
| Rastreabilidade origem `[regra, categoria, artigo, dados do perfil]` | 🟡 código tem `[fonte, categoria, artigo, ruleId]` em `risk-engine-v4.ts:153-155`. Spec substitui `ruleId` por "dados do perfil" — mudança semântica |
| "exibir: por que é risco" | 🔴 **GAP confirmado** — CODIGO-ATUAL-VERDADE documenta: breadcrumb é só 4 labels, sem justificativa LLM |
| `governanca.source: [system, user]` | 🔴 **GAP confirmado** — hoje só `system`; SEM `addRiskManual` tRPC |
| `separacao_obrigatoria: true` | 🔴 exige novo campo `source` em `risks_v4` table + migration |

Spec está certa ao reconhecer esses gaps. 🟢 validação alinhada.

---

### 11. `criterio_go_m1`

| Critério | Status |
|---|---|
| "7 P0 resolvidos" | ✅ alinhado com decisão P.O. 2026-04-23 |
| "50 testes PASS" | 🟡 **impreciso** — bateria v2 rodou 49/50 (S27 BLOCKED é controle negativo esperado) |
| "rodada D validada" | ✅ consistente |
| "eligibility funcionando" | 🟡 campo novo, depende de spec v3 completa |
| "STOP_IF_NOT_ELIGIBLE ativo" | ✅ consistente com spec §7 |

**Correção v3.1:** ajustar para "49 PASS + 1 BLOCKED (controle negativo multi-CNPJ esperado)", não "50 testes PASS" literal.

---

## Resumo consolidado

### 🟢 O que a spec v3 acerta (reaproveitamento real)

1. **5 origens de perfil** (falta só `companyProfile`)
2. **consistencyEngine como fonte de inconsistências**
3. **calcProfileScore como fonte de completude**
4. **Mapeamento DET-001/004 → denied** (hard blocks hoje)
5. **Rastreabilidade origem do risco** — reconhece os gaps reais
6. **Critérios GO M1** — compatíveis com governança anterior

### 🔴 O que precisa correção em v3.1

1. **Adicionar `companyProfile`** às origens (omissão crítica)
2. **Sinalizar quais dos 15 campos-chave são novos** (5 não existem)
3. **Resolver conflito `possui_bens`/`possui_servicos`**: derivados OU campos independentes?
4. **Escolher vocabulário único para `status_arquetipo`** (3 versões diferentes hoje)
5. **Detalhar `STOP_IF_NOT_ELIGIBLE`** — onde roda o gate exatamente
6. **Explicitar mudança de comportamento** de DET-002/003/005: warnings → pending bloqueia
7. **Esclarecer "unificar 5 JSONs sem schema novo"** — view TypeScript ou nova coluna?
8. **Corrigir "50 testes PASS"** → "49 PASS + 1 BLOCKED controle negativo"

### 🟡 Pontos de atenção (não-bloqueantes mas merecem discussão)

- Label "Perfil da Empresa" → "Perfil da Entidade" toca vocabulário em muitos lugares
- `isEconomicGroup` passa de campo inócuo a blocker — mudança de contrato
- Completeness < 100% passa de informativo a bloqueador — endurece gate

---

## O que NÃO é novidade para o código (já existe)

A spec v3 NÃO exige criar do zero:
- ✅ `consistencyEngine` (5 DETs) — existe
- ✅ `calcProfileScore` — existe
- ✅ `AlertasInconsistencia` UI — existe
- ✅ `acceptRisk()` tRPC com justificativa 10+ chars — existe
- ✅ soft-delete de risco com cascata — existe
- ✅ breadcrumb do risco (4 labels) — existe (mas insuficiente)
- ✅ audit_log 3+ níveis — existe

## O que É novidade (exige implementação)

A spec v3 introduz:
- 🆕 Campo `eligibility.overall` com 3 estados
- 🆕 Status arquétipo `confirmado/inconsistente/pendente`
- 🆕 Gate global `STOP_IF_NOT_ELIGIBLE` em 5 routers
- 🆕 5 campos do arquétipo que não existem (setor_regulado, orgao_regulador, papel_operacional, opera_territorio_incentivado, papel_comercio_exterior)
- 🆕 `natureza_da_operacao` array multi (hoje é `operationType` singular)
- 🆕 Rastreabilidade "por que é risco" com justificativa LLM
- 🆕 `addRiskManual` + `updateRisk` tRPC procedures
- 🆕 Campo `source: system | user` em riscos
- 🆕 Função `buildPerfilEntidade()` unificando 5+1 colunas JSON

**Nenhum desses implementável sob REGRA-M1-GO-NO-GO ainda.** Todos dependem da spec v3.1 com os 8 gaps corrigidos + rodada D passando.

---

## Próximo passo recomendado

Devolver ao consultor com estes 8 itens de correção:

1. Adicionar `companyProfile` nas origens
2. Marcar quais campos-chave são novos (5 de 15)
3. Decidir `possui_bens`/`possui_servicos`: derivados ou independentes
4. Escolher vocabulário de `status_arquetipo`
5. Detalhar pontos de injeção do gate `STOP_IF_NOT_ELIGIBLE`
6. Declarar mudança DET-002/003/005 de warning→pending como intencional
7. Esclarecer "unificação sem schema novo"
8. Ajustar critério GO para "49 PASS + 1 BLOCKED esperado"

Depois: rodada D com bateria v2 adaptada ao novo vocabulário.

**Implementação M1 segue suspensa.**
