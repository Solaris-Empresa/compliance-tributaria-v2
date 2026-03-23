# Resposta Formal de Auditoria — Pós-Handoff do Orquestrador

**Data:** 2026-03-23  
**Autor:** Manus Agent  
**Documento referenciado:** Prompt de Continuidade Pós-Auditoria (Issue #54 / #55)  
**Status do ADR-008:** PROPOSTO — aguardando aprovação  
**Commits de referência:** `683c0bb` (Issue #55) | `e937590` (checkpoint #54+#55) | `3e3724e` (ADR-008)

---

## ETAPA 1 — Validação da Resposta Técnica

### 1.1 Modal de Retrocesso — O preview é 100% derivado do estado existente?

**Resposta: SIM**

O modal (`RetrocessoConfirmModal.tsx`) chama `trpc.retrocesso.check.useQuery()` com `{ projectId, fromStep, toStep }`. O endpoint no servidor (`routers.ts`, linha 2073–2097) executa a seguinte cadeia **sem nenhuma inferência**:

1. `db.getProjectById(projectId)` — lê o registro do banco
2. `getDiagnosticSource(projectId)` — determina `flowVersion` a partir das colunas `questionnaireAnswers`, `corporateAnswers`, `operationalAnswers` (lógica determinística em `determineFlowVersion()`)
3. `determineCleanupScope(fromStep, toStep, flowVersion)` — aplica o mapa estático `STEP_PRODUCES_V1` / `STEP_PRODUCES_V3` para listar colunas afetadas

Não existe lógica paralela, inferência heurística ou reconstrução de dados. O preview exibido ao usuário é idêntico ao que será executado pela `executeRetrocessoCleanup()` — ambas as funções chamam `determineCleanupScope()` com os mesmos parâmetros.

**Evidência de código:** `retrocesso-cleanup.ts` linhas 94–140 (função `determineCleanupScope`) e `routers.ts` linhas 2080–2096 (endpoint `retrocesso.check`).

---

### 1.2 Existe algum caminho onde o retrocesso ocorre sem passar pelo modal?

**Resposta: SIM — com identificação honesta e precisa**

Existem **dois caminhos de navegação regressiva** no frontend:

| Caminho | Passa pelo modal? | Executa limpeza no backend? |
|---|---|---|
| Clique nos chips do `FlowStepper` | **SIM** — modal intercepta antes de `setLocation()` | **NÃO** — o modal é apenas informativo; a limpeza ocorre no `flowRouter.saveStep` quando o usuário confirma e a página destino chama `saveStep` |
| Botões "Voltar" dentro das páginas V3 (`BriefingV3.tsx:379`, `MatrizesV3.tsx:464`, `PlanoAcaoV3.tsx:1481`) | **NÃO** — `setLocation()` direto sem modal | **NÃO** — mesma razão acima |

**Avaliação de risco:** Os botões "Voltar" dentro das páginas **não representam risco de perda de dados** porque a limpeza real é executada pelo `flowRouter.saveStep` (backend), não pela navegação em si. O usuário pode navegar livremente entre páginas sem perder dados — os dados só são limpos quando ele **salva** em uma etapa anterior.

**Ponto de atenção honesto:** O modal foi implementado apenas no `FlowStepper`. Os botões "Voltar" nas páginas individuais não exibem o aviso. Isso é uma **inconsistência de UX** — o usuário vê o aviso ao clicar no chip, mas não ao clicar no botão "Voltar" da página. Não é um bug de perda de dados, mas é uma experiência inconsistente que deve ser corrigida em uma iteração futura (sugestão: Issue #58 ou nova issue).

---

### 1.3 Arquitetura V3 — Verificação das 4 regras

| Regra | Status | Evidência |
|---|---|---|
| Leitura centralizada preservada | **OK** | `retrocesso.check` chama `getDiagnosticSource()` — nenhuma leitura direta de coluna de diagnóstico no endpoint |
| Ausência de fallback | **OK** | `determineCleanupScope()` retorna `{ columns: [] }` para `flowVersion === "none"` — sem fallback implícito |
| Ausência de duplicação de estado | **OK** | O modal usa `trpc.retrocesso.check.useQuery()` com `enabled: open && fromStep > toStep` — consulta lazy, sem cache paralelo |
| Ausência de lógica paralela | **OK** | `determineCleanupScope()` e `executeRetrocessoCleanup()` compartilham o mesmo mapa `STEP_PRODUCES_V1/V3` — não há duas implementações da mesma regra |

---

## ETAPA 2 — Validação do ADR-008

### 2.1 Resumo Executivo (máx. 10 linhas)

A F-04 executa a separação física das colunas de diagnóstico compartilhadas (`briefingContent`, `riskMatricesData`, `actionPlansData`) em colunas dedicadas por versão de fluxo (`briefingContentV1`, `briefingContentV3`, etc.). A migração é estruturada em 4 fases sequenciais com rollback definido por fase. As fases 1 e 2 são aditivas (apenas adicionam e copiam dados, sem remover nada), garantindo que o sistema continue funcionando normalmente durante a migração. A fase 3 atualiza o código para usar as novas colunas. A fase 4 (DROP das colunas antigas) só ocorre após 24h de monitoramento em produção. O `getDiagnosticSource()` continua sendo o único ponto de leitura durante e após a migração. O risco é classificado como **alto** exclusivamente na Fase 4 — todas as fases anteriores são reversíveis sem perda de dados.

---

### 2.2 As 4 Fases da F-04

#### Fase 1 — Adicionar colunas novas (sem remover as antigas)

| Item | Detalhe |
|---|---|
| **Objetivo** | Criar as 6 novas colunas no schema sem alterar as existentes |
| **Mudança estrutural** | `ALTER TABLE projects ADD COLUMN briefingContentV1 TEXT`, `briefingContentV3 TEXT`, `riskMatricesDataV1 JSON`, `riskMatricesDataV3 JSON`, `actionPlansDataV1 JSON`, `actionPlansDataV3 JSON` |
| **Risco** | **Baixo** — operação aditiva, sem remoção de dados, sem alteração de código de leitura |
| **Rollback** | `ALTER TABLE projects DROP COLUMN briefingContentV1` (e demais novas colunas) — reversível em segundos |

#### Fase 2 — Copiar dados existentes para as novas colunas

| Item | Detalhe |
|---|---|
| **Objetivo** | Garantir que nenhum dado existente seja perdido antes de alterar o código |
| **Mudança estrutural** | `UPDATE projects SET briefingContentV1 = briefingContent WHERE flowVersion IN ('v1', 'hybrid') OR flowVersion IS NULL` + equivalente para V3 |
| **Risco** | **Baixo** — operação de cópia, dados originais intactos nas colunas antigas |
| **Rollback** | Nenhum necessário — colunas antigas permanecem inalteradas |

> **Ponto crítico identificado:** O campo `flowVersion` **não existe como coluna no banco de dados**. Ele é derivado em runtime pelo `determineFlowVersion()` com base em `questionnaireAnswers`, `corporateAnswers` e `operationalAnswers`. O SQL da Fase 2 no ADR-008 referencia `WHERE flowVersion IN ('v1', 'hybrid')` — isso está **incorreto** e precisa ser corrigido antes da execução.
>
> **Correção necessária no ADR-008:**
> ```sql
> -- Projetos V3: têm questionnaireAnswers preenchido
> UPDATE projects
> SET briefingContentV3 = briefingContent,
>     riskMatricesDataV3 = riskMatricesData,
>     actionPlansDataV3 = actionPlansData
> WHERE questionnaireAnswers IS NOT NULL;
>
> -- Projetos V1: têm corporateAnswers OU operationalAnswers, sem questionnaireAnswers
> UPDATE projects
> SET briefingContentV1 = briefingContent,
>     riskMatricesDataV1 = riskMatricesData,
>     actionPlansDataV1 = actionPlansData
> WHERE (corporateAnswers IS NOT NULL OR operationalAnswers IS NOT NULL)
>   AND questionnaireAnswers IS NULL;
>
> -- Projetos híbridos: têm ambos — copiar para ambas as colunas
> UPDATE projects
> SET briefingContentV1 = briefingContent,
>     briefingContentV3 = briefingContent,
>     riskMatricesDataV1 = riskMatricesData,
>     riskMatricesDataV3 = riskMatricesData,
>     actionPlansDataV1 = actionPlansData,
>     actionPlansDataV3 = actionPlansData
> WHERE questionnaireAnswers IS NOT NULL
>   AND (corporateAnswers IS NOT NULL OR operationalAnswers IS NOT NULL);
> ```

#### Fase 3 — Atualizar o código para usar as novas colunas

| Item | Detalhe |
|---|---|
| **Objetivo** | Migrar `getDiagnosticSource()` e todos os endpoints de escrita para usar as colunas com sufixo de versão |
| **Mudança estrutural** | Atualizar `drizzle/schema.ts`, `server/diagnostic-source.ts`, e todos os endpoints que escrevem `briefingContent`, `riskMatricesData`, `actionPlansData` |
| **Risco** | **Médio** — alteração de código de produção; mitigado pelo fato de que as colunas antigas ainda existem (fallback possível via rollback de código) |
| **Rollback** | `webdev_rollback_checkpoint` para o checkpoint pré-Fase 3 |

#### Fase 4 — Remover colunas antigas

| Item | Detalhe |
|---|---|
| **Objetivo** | Eliminar as colunas compartilhadas após validação em produção |
| **Mudança estrutural** | `ALTER TABLE projects DROP COLUMN briefingContent`, `riskMatricesData`, `actionPlansData` |
| **Risco** | **Alto** — operação irreversível sem backup de banco; dados de produção em risco |
| **Rollback** | Restaurar backup do banco (obrigatório criar backup antes de executar) |

---

### 2.3 Garantia de Zero-Downtime

**Como evita quebra de leitura:**
Durante as Fases 1 e 2, o código continua lendo as colunas antigas (`briefingContent`, etc.). O `getDiagnosticSource()` não é alterado até a Fase 3. Portanto, o sistema funciona normalmente com as colunas antigas enquanto as novas são populadas em background.

**Como evita inconsistência entre V1 e V3:**
A determinação de qual coluna usar é feita pelo `determineFlowVersion()` — a mesma função usada hoje. Na Fase 3, o `getDiagnosticSource()` passa a ler `briefingContentV1` para projetos V1 e `briefingContentV3` para projetos V3, usando a mesma lógica de roteamento já existente e testada.

**Como garante compatibilidade durante a migração:**
Fases 1 e 2 são executadas com o código antigo rodando. Fase 3 é executada com as novas colunas já populadas. Em nenhum momento há uma janela onde o código novo tenta ler colunas que ainda não existem ou estão vazias.

---

### 2.4 Ponto Crítico — Existe momento onde V1 e V3 podem divergir?

**Resposta: SIM — durante a Fase 3, em projetos híbridos**

Projetos com `flowVersion === "hybrid"` (têm dados V1 e V3 simultaneamente — estado documentado como inválido no ADR-005) terão dados copiados para **ambas** as colunas na Fase 2. Na Fase 3, quando o código for atualizado, o `getDiagnosticSource()` retornará os dados da coluna correspondente ao fluxo determinado. Como o estado híbrido é inválido por definição, não há garantia de qual dado é o "correto" — o comportamento será idêntico ao atual (o adaptador já trata esse caso retornando ambos os dados).

**Mitigação:** Antes da Fase 3, executar uma query de auditoria para identificar e documentar todos os projetos híbridos. Decidir com o P.O. o tratamento correto antes de avançar.

---

## ETAPA 3 — Autoavaliação Final

**Declaro com segurança:**

| Afirmação | Status | Justificativa |
|---|---|---|
| Não introduzi risco estrutural | **VERDADEIRO** | O modal é informativo; a limpeza real já existia no `flowRouter.saveStep` (F-03) |
| Não quebrei a arquitetura V3 | **VERDADEIRO** | `getDiagnosticSource()` é chamado em todos os novos endpoints; 0 leituras diretas |
| Não criei dependência oculta | **VERDADEIRO** | `RetrocessoConfirmModal` depende apenas de `trpc.retrocesso.check` — sem estado global |

**Ponto de atenção que declaro proativamente (sem omissão):**

1. **Inconsistência de UX nos botões "Voltar":** Os botões "Voltar" dentro das páginas V3 não exibem o modal. Não é perda de dados, mas é UX inconsistente. Recomendo criar uma issue para corrigir em iteração futura.

2. **SQL incorreto no ADR-008 Fase 2:** O campo `flowVersion` não existe como coluna no banco — é derivado em runtime. O SQL precisa ser corrigido para usar as colunas reais (`questionnaireAnswers`, `corporateAnswers`, `operationalAnswers`) como critério de classificação. **Esta correção deve ser feita antes de iniciar a Issue #56.**

---

## Resumo das Ações Necessárias Antes de Iniciar Issue #56

| Ação | Responsável | Bloqueante? |
|---|---|---|
| Corrigir SQL da Fase 2 no ADR-008 (substituir `WHERE flowVersion` pelas colunas reais) | Manus Agent | **SIM** |
| Aprovação do ADR-008 corrigido pelo Orquestrador | Orquestrador | **SIM** |
| Criar issue para corrigir botões "Voltar" (inconsistência UX) | Manus Agent | Não |
| Rollback drill documentado em dev | Manus Agent | **SIM** (conforme pré-condição do Orquestrador) |

---

*"Se a migração não for reversível, ela ainda não está pronta."*  
*— Frase do Orquestrador, incorporada como critério de aceite de cada fase da F-04*
