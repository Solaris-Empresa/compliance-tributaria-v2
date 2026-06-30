---
description: Governance LESSONS — Lições aprendidas #61..#141 (casos canônicos, anti-padrões, vinculadas)
globs:
  - "docs/governance/**"
---

# Governance Rules — Lições Aprendidas

> Parte 2 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).
> REGRA-ORQ/gates/flow → `governance-core.md`.

## Lição #61 — Metadado determinístico antes da pergunta

Origem: Sprint M3.6 — smoke test E2E + análise de LC 224 no Q.NBS

### Texto

Perguntas sem metadado determinístico (`lei_ref` + `artigo_ref` + `cnaeGroups` validado) NÃO devem entrar no questionário. O campo `mappingReviewStatus` no schema `solaris_questions` (`drizzle/schema.ts:1729`) é o gate correto — data-driven, sem hardcode, reversível.

Antes de afirmar tema ou escopo de uma lei, VERIFICAR conteúdo real no corpus RAG:

```bash
grep "<lei>" server/rag-corpus-lcs-novas.ts | head -5
# ou
sed -n '/lei: "<lei>"/,/conteudo:/p' server/rag-corpus-lcs-novas.ts | head -10
```

Correlação empresa↔lei ≠ causalidade — não inferir tema da lei a partir de sample de empresas testadas.

### Caso canônico

Sprint M3.6, sessão 2026-05-04: Claude Code rotulou LC 224 como *"lei de combustíveis"* baseado em correlação com 2 transportadoras testadas (#2880001 e #3120001). Verificação em `server/rag-corpus-lcs-novas.ts:13784-13800` (Art. 1 LC 224) levaria 5 segundos e desmistificaria: LC 224 trata de **redução linear de incentivos fiscais federais + alterações na LRF**, não combustíveis.

A solução técnica não é remover perguntas SOL-008 a SOL-012 — é exigir que toda pergunta tenha (a) `lei_ref` estruturado, (b) `artigo_ref` rastreável, (c) `cnaeGroups` validado pela equipe jurídica. Sem isso, a pergunta fica em `mappingReviewStatus = 'pending_legal'` e não é exibida.

### Vinculadas

- REGRA-ORQ-29 (operacionaliza esta lição como regra)
- REGRA-ORQ-32 (meta-regra "no hardcode" — solução é data-driven, não `if/else`)
- Sprint M3.6 (PR #937 + smoke test + análise profunda do Manus)

## Lição #62 — Separação Contexto vs Evidência

Origem: Sprint M3.8 — auditoria do pipeline de gaps (P.O. + Manus + Consultor)

### Texto

Dados de classificação do negócio (`projects.cnaeAnswers`, `companyProfile`, `operationProfile`, archetype) são **CONTEXTO** — alimentam filtros, priorização, interpretação LLM. Dados de resposta a obrigações (`questionnaireAnswersV3`, `service_answers`, `solaris_answers`, `iagen_answers`) são **EVIDÊNCIA** — alimentam Gap Engine na cadeia REQUISITO → EVIDÊNCIA → GAP.

Misturar as camadas leva a falso positivo + violação REGRA-ORQ-29 (gap sem requisito).

### Princípio orientador

> **"CNAE diz o que a empresa É. NBS diz o que ela FAZ ERRADO."** — Consultor, Sprint M3.8

| Camada | Conteúdo | Função | Onde alimenta |
|---|---|---|---|
| **CONTEXTO** | `cnaeAnswers`, `companyProfile`, archetype | Atributos do negócio | LLM briefing (`routers-fluxo-v3.ts:3100-3103`), filtros de elegibilidade, priorização |
| **EVIDÊNCIA** | `questionnaireAnswersV3`, `service_answers`, `solaris_answers`, `iagen_answers` | Respostas a obrigações | Gap Engine (`gapEngine.analyzeGaps`) — cadeia REQUISITO → EVIDÊNCIA → GAP |

### Caso canônico

Sprint M3.8, sessão 2026-05-04: Manus inicialmente sugeriu D5.A "incluir `cnaeAnswers` como 5a fonte no Gap Engine" (resposta às 12 perguntas Q.CNAE Fixo do P.O.). Consultor identificou que isso seria **violação de camada** — `qcnae*` são atributos (ST, IS, regime especial, imunidade) sem estrutura "atendido/não-atendido". Manus reformulou para D5.B: 4 fontes de EVIDÊNCIA apenas, `cnaeAnswers` permanece em CONTEXTO (já implementado em `routers-fluxo-v3.ts:3100`).

### Aplicação prática

Antes de adicionar nova fonte ao Gap Engine, validar:

1. As respostas têm estrutura "atendido/não-atendido/parcial"? (evidência)
2. Ou são atributos do negócio (setor, regime, classificação)? (contexto)
3. Se contexto: alimenta LLM briefing/filtros, NÃO Gap Engine.

### Vinculadas

- REGRA-ORQ-29 (Sem Requisito = Sem Pergunta = Sem Gap)
- REGRA-ORQ-32 (No Hardcode — visão sistêmica)
- Sprint M3.8 (issues a serem abertas)
- Análise consultor 2026-05-04

## Lição #63 — Spec arquiteturalmente correta ≠ implementável

Origem: Sprint M3.8 — verificação empírica do banco antes de implementar (Manus + Consultor)

### Texto

Spec arquiteturalmente correta **NÃO É** automaticamente implementável. Mapeamento determinístico exige metadado preexistente no banco. Antes de propor expansão de pipeline (ex: "Gap Engine consome 4 fontes"), verificar empiricamente:

1. Os campos de mapeamento existem no schema?
2. Estão populados nos dados reais?
3. As fontes são redundantes entre si?
4. A curadoria humana necessária está disponível?

Sem essa verificação, spec implementada literalmente pode entregar **muito menos** do que prometido.

### Princípio orientador

> **"Você não está corrigindo código — está corrigindo a maturidade dos dados."** — P.O., Sprint M3.8

### Caso canônico

Sprint M3.8, M3.8-2 — Spec V5 do consultor propôs Gap Engine consumir 4 fontes (`questionnaireAnswersV3`, `service_answers`, `solaris_answers`, `iagen_answers`). Manus auditou banco e descobriu:

| Fonte | Spec promete | Realidade no banco | % funcional |
|---|---|---|---|
| `questionnaireAnswersV3` | Mapear via `mapQuestionIndexToRequirement` | Sem coluna `requirement_id`. `requirement_question_mapping` vazia (0 registros) | 0% |
| `service_answers` padrão `idN` | `extractRequirementId` parsing | Determinístico. **3 de 15 respostas** mapeáveis em #3270001 | 100% das aplicáveis |
| `service_answers` padrão `SOL-XXX` | `mapSolarisToRequirement` | `solaris_questions.risk_category_code = NULL` em todos | 0% |
| `solaris_answers` | Idem | Sem metadados + **100% redundante com service_answers** (overlap total em 2 projetos auditados) | 0% — exclusão definitiva |
| `iagen_answers` | `mapCategoryToRequirement` | `risk_category_code = NULL` em 100% das respostas | 0% |

**Resultado se V5 fosse implementado literalmente:** 3/138 requirements (2.2%) com evidência real. Outros 135 continuariam falso positivo.

### Aplicação prática

Antes de spec de expansão de pipeline:

```bash
# Verificar campos de mapeamento existem
SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = '<tabela>';

# Verificar dados populados
SELECT COUNT(*) FROM <tabela_mapping>;
SELECT <campo_mapping>, COUNT(*) FROM <tabela> GROUP BY <campo_mapping>;

# Verificar redundância entre fontes candidatas
SELECT a.codigo FROM source_a a INNER JOIN source_b b ON a.codigo = b.codigo;
```

Se algum check falhar: spec precisa ser **dividida em fases** (Fase 1 = código que funciona com dados atuais; Fase 2 = curadoria + ativação após dados maduros).

### Princípio operacional

> **"Spec correta na direção" ≠ "Spec viável agora".**
>
> Implementar versão mínima funcional + planejar curadoria = decisão honesta.
> Implementar literalmente sem verificar dados = entrega 2.2% e cria dívida técnica oculta.

### Vinculadas

- Lição #61 (Metadado determinístico antes da pergunta)
- Lição #62 (Contexto vs Evidência)
- REGRA-ORQ-28 (Triade de garantia — test contracts dependem de viabilidade real)
- Sprint M3.8 (M3.8-2 escopo reduzido para 1 fonte funcional + M3.9 backlog curadoria)
- Análise técnica Manus 2026-05-04 — "Crítica Técnica — Spec M3.8-2 do Consultor"

## Lição #64 — Audit-greps insuficientes vs runtime tests

Origem: Sprint M3.8.1 — diagnóstico Manus 2026-05-05 (post-deploy M3.8)

### Texto

PRs docs-only de audit baseados em **grep estático** são insuficientes para detectar contratos quebrados em runtime quando uma função muda seus retornos sem que os consumidores downstream sejam atualizados. Mudanças que alteram o **valor retornado** (não apenas a assinatura) por uma função consumida por outros módulos exigem **test contract runtime** que valide o comportamento end-to-end, não apenas que a string foi removida do código.

### Caso canônico

Sprint M3.8-1B (PR #968) mudou `inferFonte` em `gap-to-rule-mapper.ts:258,262` para retornar `"regulatorio"` (era `"solaris"`). O audit v7.62 validou via grep que o hardcode `"solaris"` foi removido — gate passou. Mas:

- `risk-engine-v4.ts:37` `type Fonte` não foi atualizado → mismatch silencioso
- `risk-engine-v4.ts:100-106` `SOURCE_RANK` não incluiu `"regulatorio"` → loop de `getBestSourcePriority` retornou rank 99 para todos os gaps → initial value `"iagen"` foi retornado em 100% dos casos
- `risks_v4.source_priority` ENUM no banco não incluiu `"regulatorio"` → INSERT falhou com `Data truncated`

3 bugs em cascata, 1 P0 (perda de dados em `gapEngine.ts:459` exposto pelo cenário), 1 P1 (UI mostrando "iagen" para todos os riscos), 1 P2 (type mismatch). Detectados apenas em smoke E2E pós-deploy (Manus 2026-05-05).

### Aplicação prospectiva

A partir de 2026-05-05, qualquer PR que altere o valor de retorno de função pública consumida por outros módulos DEVE incluir:

1. **Test contract runtime** que valida o consumo downstream (não apenas grep da string nova)
2. **Atualização explícita de tipos correlatos** quando o domínio é union string ou ENUM
3. **Migration SQL alinhada** quando o domínio é ENUM persistido em coluna do banco

PRs docs-only de audit podem usar grep, mas **não substituem** test contracts runtime para mudanças em retornos consumidos.

### Vinculadas

- REGRA-ORQ-27 (Lição #59 — assemble ≠ consumption) — esta lição é manifestação concreta em runtime
- REGRA-ORQ-28 (Triade) — test contracts são o gate primário, greps são complemento
- Sprint M3.8.1 (caso canônico) — PRs #973 + #974
- PR #968 (M3.8-1B) — origem dos 3 bugs A/B/C
- Audit v7.62 (`docs/governance/audits/v7.62-2026-05-04-sprint-m3.8-encerrada.md`) — exemplo de audit que passou apesar dos bugs latentes

## Lição #65 — Sempre rastrear o fluxo de DADOS end-to-end antes de diagnosticar

Origem: Sprint M3.10 — post-mortem `docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md`

### Texto

Antes de propor qualquer fix em pipeline de dados, o diagnóstico DEVE rastrear o caminho completo do dado: **de onde vem o input** (não apenas o que a função faz com ele) → quem o transforma → onde é persistido → quem o consome → como aparece no output final ao usuário. Função pura testada isoladamente com input simulado pode passar em 100% dos cenários sintéticos enquanto o sistema real nunca produz aquele input.

Para pipelines de dados (caminhos `input → transformação → output`), test contracts unitários cobrem **transformação** mas não **caminho real do input**. PRs que tocam pipelines de dados DEVEM incluir teste E2E que dispare o caminho real (UI → banco → UI) com evidência observável (screenshot, count exibido na UI, query SQL pós-execução).

### Caso canônico

Sprint M3.8.1 Bug B teve 7 tests unitários PASS cobrindo `getBestSourcePriority` com gaps multi-fonte simulados — mas o sistema real nunca chama com multi-fonte (entrada é sempre mono-fonte do `result.gaps` do frontend, que só passa gaps `v1`). Tests passaram em prova de função isolada, não de comportamento real do sistema.

```
Hipótese errada (Sprint M3.8.1):
  "getBestSourcePriority retorna 'iagen' como default → fix: trocar para 'regulatorio'"

Tests escritos para validar a hipótese:
  buildGap("regulatorio") × 10  →  espera retornar "regulatorio"  ✅ PASS
  buildGap("solaris") + buildGap("iagen") →  espera "solaris" (rank menor)  ✅ PASS
  16/16 tests PASS, sprint encerrada 🟢

Realidade do sistema:
  getBestSourcePriority sempre recebe 138 gaps mono-fonte ('regulatorio') do
  result.gaps do gapEngine. Os cenários multi-fonte testados nunca acontecem
  no caminho real porque a entrada é mono-fonte upstream.

O que Lição #65 teria forçado:
  Antes de propor fix, mapear:
    INPUT real para getBestSourcePriority?
      → vem de risk-engine-v4.consolidateRisks
      → recebe gaps consolidados via groupBy(categoria)
      → vem de generateRisksV4Pipeline(gaps)
      → input.gaps recebido via tRPC do frontend
      → frontend passa result.gaps de gapEngine.analyzeGaps
      → gapEngine.analyzeGaps retorna apenas gaps v1 ❌ MONO-FONTE NA ORIGEM

  Conclusão da lição: o fix NÃO está em getBestSourcePriority. Está em quem
  alimenta o pipeline upstream. Esta cadeia de 6 saltos toma 5 minutos para
  rastrear e teria evitado 3 sprints de fixes errados.
```

### Aplicação prospectiva

Antes de qualquer PR de pipeline de dados, o diagnóstico DEVE produzir um **mapa "writers vs readers"** da tabela crítica:

1. Liste todas as funções que ESCREVEM na tabela (com source/discriminador)
2. Liste todas as funções que LÊEM da tabela (com filtro)
3. Verifique: existe consumer que lê tudo o que cada writer escreve?
4. Se algum writer não tem consumer correspondente → escrita órfã (dead write)

Sem esse mapa, falta evidência de que a entrada do pipeline é o que se assume.

### Vinculadas

- REGRA-ORQ-27 (Lição #59 — assemble ≠ consumption) — esta lição estende para o caso de **escritas órfãs**
- Lição #64 (audit-greps insuficientes vs runtime tests) — complementa
- Sprint M3.10 (caso canônico) — Post-mortem #975 + Fix B (#976) + Fix A1
- PRs com diagnóstico equivocado: #968 (M3.8-1B), #969 (M3.8-2), #973 (M3.8.1)
- Dry-run Manus 2026-05-05 (validou diagnóstico empiricamente antes da implementação)

## Lição #66 — Spec arquitetural sem dados reais é ilusão

Origem: Sprint M3.10 — post-mortem `docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md`

### Texto

Spec que descreve "como o sistema DEVERIA funcionar" sem verificar **qual é o estado dos dados reais no banco** entrega ilusão arquitetural. Sprint pode declarar "engine X consome dado Y" e tests unitários podem validar essa asserção em isolamento — mas se os dados reais em produção têm Y nulo, não-mapeável, ou ausente, o consumo nunca acontece e o produto entrega valor parcial silenciosamente.

Para pipelines que dependem de metadados (categoria, classificação, mapeamento), o diagnóstico DEVE verificar empiricamente:

1. **Dados existem?** `SELECT COUNT(*) FROM tabela WHERE filtro` — quantas linhas atendem aos critérios?
2. **Metadados estão preenchidos?** `SELECT COUNT(*), SUM(metadado IS NOT NULL) FROM tabela` — qual % está populado?
3. **Mapeamento é único ou ambíguo?** Se há mapping curado de N→M, qual o coverage?
4. **Curadoria humana necessária?** Se algum metadado depende de juízo (jurídico, semântico), há volume tratável?

### Caso canônico

Sprint M3.8 declarou que `gapEngine.analyzeGaps` consumia 4 fontes (questionnaireAnswersV3, service_answers, solaris_answers, iagen_answers) — assertiva arquiteturalmente correta. Implementação literal entregou 2 fontes ativas (Q.CNAE + Q.NBS idN) e 2 stubs documentados (Q.SOLARIS + Q.IA Gen). Stubs nunca foram ativados porque:

- `solaris_questions.risk_category_code = NULL` em 100% das perguntas (curadoria pendente)
- `service_answers.fonte_ref` com padrão SOL-XXX (não-mapeável por `extractRequirementId` que só captura `idN`)

Resultado: 2.2% de coverage real (3/138 requirements) entregue como se fosse 100% — assemble passou (código existe), consumption falhou (dados não suportam).

### Caso canônico complementar (M3.10)

Pipeline de risco (`risksV4.generateRisksFromGaps`) declarava aceitar gaps de qualquer source via input. Tests de função isolada confirmavam multi-fonte. Mas em runtime:

- Frontend só enviava gaps v1 (138)
- Gaps solaris (28) e iagen (8) eram escritas órfãs (Lição #65)
- Mesmo se incluídos: `risk_category_code = NULL` → cairiam em "unmapped"

Manus diagnosticou via queries de banco em 5 minutos o que 3 sprints de leitura de código não viram.

### Aplicação prospectiva

Antes de aprovar spec de pipeline:

1. **Bloco "Verificação de dados" obrigatório:** spec inclui queries SQL que comprovem que dados necessários existem com metadados preenchidos
2. **Phaseamento honesto:** se dados não estão prontos, dividir em fases (Fase 1: código que funciona com dados atuais; Fase 2: ativar após curadoria)
3. **Coverage explícito:** se 2.2% dos requirements têm dados, declarar 2.2% no PR — não 100%
4. **Curadoria como dependência declarada:** issues separadas para curadoria (não escondidas em "TODO")

> **"Você não está corrigindo código — está corrigindo a maturidade dos dados."** — P.O., Sprint M3.8

### Vinculadas

- Lição #63 (Spec arquiteturalmente correta ≠ implementável) — esta lição reforça e estende
- Lição #61 (Metadado determinístico antes da pergunta)
- Lição #65 (rastrear fluxo end-to-end) — complemento
- REGRA-ORQ-32 (no hardcode — visão sistêmica)
- Sprint M3.10 (caso canônico) — Post-mortem #975
- Diagnóstico Manus 2026-05-05 (validação por queries de banco antes de fix)

## Lição #67 — Try/catch + degradação graciosa em sequências assíncronas

Origem: Sprint M3.10 Fix C-bis — auto-trigger com 2 mutations sequenciais (PR #979)

### Texto

Em pipelines com sequência `await Step1 → Step2`, falha de Step1 NÃO deve bloquear Step2 quando este pode operar com estado parcial. Pattern obrigatório:

```typescript
try {
  await step1Mutation.mutateAsync(...);  // pode falhar (timeout, rate limit, network)
} catch (err) {
  console.warn("[contexto] step1 falhou — degradando para estado parcial", err);
  // Não relança. Toast/log já exibido via onError. Continua para Step2.
}
step2Mutation.mutate(...);  // sempre executa
```

**Princípio:** matriz parcial é sempre melhor que zero. Usuário vendo "alguns riscos exibidos" beat usuário vendo "spinner infinito".

### Decisão antes de aplicar

Quando dois mutations sequenciais são acoplados via `await`, sempre considerar 2 perguntas:

1. **Step1 pode falhar de forma recuperável?** (timeout LLM, rate limit, falha temporária de rede)
2. **Step2 pode operar sem o resultado de Step1?** (state parcial é útil ao usuário?)

Se ambas SIM → try/catch + console.warn + continuar Step2 (degradação graciosa)
Se NÃO → falha de Step1 deve bloquear Step2 (relançar erro, deixar useEffect órfão é pior que estado errado)

### Caso canônico

`RiskDashboardV4.tsx` Fix C-bis:

- Step1 (`ensureV1GapsMutation`): pode falhar (LLM timeout em ~138 requirements)
- Step2 (`generateAllSourcesMutation`): consome todos os gaps disponíveis no banco — funciona com solaris/iagen mesmo sem v1

Aplicação: try/catch absorve falha do Step1 + Passo 2 ainda gera matriz parcial. Sem isso, useEffect ficaria órfão e usuário veria spinner infinito (critério A6 de abortar).

### Vinculadas

- Sprint M3.10 Fix C-bis (PR #979) — caso canônico
- REGRA-ORQ-34 (Pipeline de Dados Bugfix Protocol) — try/catch é mitigação de race condition em sequências assíncronas
- Lição #65 (rastrear fluxo end-to-end) — complementa: além de mapear writers/readers, mapear failure modes em sequências

## Lição #68 — Coluna mono-valor + JSON multi-valor: ler do JSON na UI

Origem: Sprint M3.10 Fix C-bis — `risks_v4.source_priority` vs `evidence.gaps[*].fonte` (PR #979)

### Texto

Quando schema do banco persiste:

| Tipo | Coluna mono-valor | JSON multi-valor |
|---|---|---|
| Conteúdo | 1 vencedor de ranking | Todos os contribuintes |
| Função | Query, ordenação, index | Representação fiel ao usuário |
| Exemplo no projeto | `risks_v4.source_priority` | `risks_v4.evidence.gaps[*].fonte` |

**UI DEVE ler do JSON multi-valor**, não da coluna mono-valor. Coluna mono-valor é otimização de DB (índice, ORDER BY, GROUP BY) — não é representação fiel ao domínio.

### Pattern obrigatório

Helper que extrai do JSON com fallback para coluna quando JSON ausente/malformado:

```typescript
function getMultiValueField(record): string[] {
  const json = record.jsonField;
  if (!json) return [record.monoColumn];                    // fallback 1: ausente
  if (Array.isArray(json)) return [record.monoColumn];      // fallback 2: formato legado
  if (typeof json !== "object") return [record.monoColumn]; // fallback 3: malformado
  const items = json.items;                                 // tipo correto
  if (!items?.length) return [record.monoColumn];           // fallback 4: vazio
  const valores = items.map(i => i.field).filter(Boolean);
  if (!valores.length) return [record.monoColumn];          // fallback 5: nenhum válido
  return [...new Set(valores)].sort();                      // dedup + determinismo
}
```

### Caso canônico

`risks_v4` schema:
- Coluna `source_priority`: 1 valor — fonte vencedora do `getBestSourcePriority` (rank menor)
- JSON `evidence.gaps[*].fonte`: N valores — todas as fontes que contribuíram

**Antes (bug):** UI exibia 1 badge baseado em `source_priority`. Multi-fonte real ofuscado em 3/6 riscos do projeto #3690001.

**Depois (Fix C-bis):** helper `getSourceContributors(risk)` extrai do JSON com fallback. UI exibe `Solaris + IA Gen + Regulatório` quando aplicável; 1 badge quando mono-fonte real.

### Aplicação prospectiva

Antes de aprovar PR de UI que exibe campo persistido:

1. **Há JSON correlato com info mais rica que a coluna?** Verificar schema do banco
2. **Se sim, UI deve ler do JSON com fallback para coluna** — pattern acima
3. **Se não, ler da coluna está OK**

Pull request review check: `grep -r "risk\.source_priority" client/` deve retornar apenas usos em fallback (`?? risk.source_priority`), nunca como fonte primária.

### Vinculadas

- Sprint M3.10 Fix C-bis (PR #979) — caso canônico
- Lição #66 (spec sem dados = ilusão) — extensão para output: spec pode ter JSON rico, mas se UI lê só da coluna, info se perde
- REGRA-ORQ-34 (Pipeline de Dados Bugfix Protocol) — Protocolo 3 (DoD negativo) deve incluir validação de exibição multi-valor

## Lição #69 — Multi-fonte agregado vs multi-fonte por risco

Origem: Sprint M3.10 Fix C-bis — DoD do projeto #3780001 (Manus 2026-05-05)

### Texto

Distinguir 2 conceitos diferentes de "multi-fonte" em matrizes consolidadas:

| Conceito | Definição | Quando importa |
|---|---|---|
| **Multi-fonte AGREGADO** | Matriz exibe ≥2 valores de fonte distribuídos entre N riscos diferentes (ex: risco A=solaris, risco B=iagen, risco C=regulatorio) | Suficiente quando cada categoria tem 1 vencedora clara no rank |
| **Multi-fonte POR RISCO** | Cada risco individual exibe múltiplas fontes que contribuíram para ele (ex: risco A=Solaris+IA Gen+Regulatório) | Necessário quando categoria tem gaps de N fontes simultâneas — `getBestSourcePriority` esconde N-1 |

### Caso canônico

Sprint M3.10 #3780001 (Manus DoD 2026-05-05):

```
8 riscos:
  6 com source_priority='regulatorio'
  2 com source_priority='iagen'
  → 2 fontes distintas no AGREGADO ✅ (Critério Positivo 1 atendido)

evidence.gaps[*].fonte = [] em todos os riscos
  → multi-fonte POR RISCO está vazio ⚠️
```

A matriz exibiu multi-fonte agregado satisfatoriamente — 2 fontes diferentes em riscos diferentes. Mas se uma única categoria tivesse 3 fontes simultâneas (solaris+iagen+regulatorio), `source_priority` exibiria só 1 (winner-takes-all do rank), e a Frente 2 do Fix C-bis (que extrai de `evidence.gaps[*].fonte`) cairia no fallback `[source_priority]` = 1 badge.

### Implicação operacional

**Spec UX deve declarar explicitamente qual conceito está sendo entregue:**

- "Matriz exibe múltiplas fontes" → ambíguo
- "Matriz exibe ao menos 2 fontes diferentes entre os riscos" → multi-fonte agregado
- "Cada risco exibe todas as fontes contribuintes" → multi-fonte por risco

DoD deve incluir **ambos os critérios** quando relevante:
- Critério agregado: `COUNT(DISTINCT source_priority) >= 2` em `risks_v4`
- Critério por risco: pelo menos 1 risco com `LENGTH(evidence.gaps) >= 2 fontes únicas`

### Aplicação prospectiva

Antes de declarar bug "mono-fonte" resolvido, validar AMBOS conceitos. Se apenas agregado for atendido, documentar como tech debt o que ainda falta para multi-fonte por risco.

### Vinculadas

- Sprint M3.10 #3780001 (caso canônico — Manus DoD 2026-05-05)
- Lição #66 (spec sem dados = ilusão) — extensão: spec sem clareza UX = ilusão de cobertura
- Lição #68 (coluna mono + JSON multi) — Fix C-bis previu multi-fonte por risco mas evidence.gaps[].fonte vazio expôs gap de implementação no `mapGapToEvidence`
- REGRA-ORQ-34 Protocolo 3 (DoD com critério NEGATIVO) — agora deve incluir distinção agregado vs por risco

### Errata (2026-05-05)

A afirmação `evidence.gaps[*].fonte = [] em todos os riscos` no caso canônico acima é **factualmente incorreta** — artefato de bug no script DoD `scripts/dod-3780001.ts` (não commitado, criado em sandbox Manus 2026-05-05).

**Estado real do banco** (queries executadas em produção 2026-05-05 ~20:50 UTC, conexão TiDB direta):

| Projeto | source_priority distintos | evidence.gaps[*].fonte multi-fonte por risco |
|---|---|---|
| #3780001 (greenfield) | 2 (iagen + regulatorio) | 2/8 riscos (`confissao_automatica` e `regime_diferenciado` = `[iagen, regulatorio]`) |
| #3570002 (retrigger) | 2 (solaris + regulatorio) | 5/9 riscos com 2-3 fontes |
| #3750060 (pré-existente) | 2 (solaris + regulatorio) | 6/9 riscos com 2-3 fontes |

**Mecanismo do bug no script DoD:**

```typescript
// BUGADO (dod-3780001.ts):
const ev = JSON.parse(row.evidence || '{}');
```

O driver `mysql2` retorna colunas JSON do TiDB já parseadas como objetos JavaScript. `JSON.parse(object)` invoca `.toString()` → `"[object Object]"` → throws `TypeError` → `catch {}` silencia → `fontes` permanece `[]`.

**Pattern correto** (aplicado em `dod-queries-3750060.ts` e em `RiskDashboardV4.tsx:204` — helper `getSourceContributors`):

```typescript
const ev = typeof row.evidence === "string" ? JSON.parse(row.evidence) : row.evidence;
```

**Conclusão:** a Frente 2 do Fix C-bis (multi-fonte POR RISCO) **funciona corretamente em produção**. A distinção conceitual agregado vs por risco permanece válida e útil — apenas o exemplo numérico estava errado. Ver Lição #72 (mysql2 JSON auto-parse) e Lição #71 (scripts DoD commitados).

**Vinculadas à errata:**
- Audit `docs/governance/audits/v7.64-2026-05-05-audit-m3.10-multi-fonte.md` (evidência reproduzível)
- Lição #71 (scripts DoD commitados — previne recorrência)
- Lição #72 (mysql2 auto-parse JSON — antipattern)

## Lição #70 — Assimetria de auth em procedures aparentemente similares

Origem: Sprint M3.10 deep research — diagnóstico do silent fail em #3690001 (Claude Code 2026-05-05)

### Texto

Procedures que fazem "a mesma coisa" frequentemente têm filtros de autenticação/autorização DIFERENTES. Quando uma procedure A é mais restritiva que procedure B no mesmo fluxo, e ambas são chamadas em sequência (try/catch absorvendo falha de A), o resultado é silent fail seletivo: B roda com estado parcial, sem erro visível ao usuário.

### Caso canônico

Sprint M3.10 — comparação cirúrgica entre 2 procedures do pipeline de risco:

| Procedure | Filtro de ownership | Comportamento se P.O. ≠ criador |
|---|---|---|
| `gapEngine.analyzeGaps` (gapEngine.ts:268) | `WHERE id = ? AND createdById = ?` | Retorna `NOT_FOUND` 404 |
| `risksV4.generateRisksAllSources` | Apenas `validateProjectAccess()` | Roda normalmente |

No `RiskDashboardV4.tsx` Fix C-bis, ambas são chamadas em sequência:
```typescript
try {
  await ensureV1GapsMutation.mutateAsync({...});  // = gapEngine.analyzeGaps
} catch (err) {
  console.warn(...);  // ABSORVE 404 silenciosamente
}
generateAllSourcesMutation.mutate({...});  // RODA sem ownership check
```

**Resultado em projeto #3690001:** se P.O. não é `createdById` (ex: criado por outra conta, seed automático), `ensureV1Gaps` retorna 404 → catch absorve → `generateAllSources` roda só com gaps solaris pré-existentes → matriz mono-solaris (NÃO multi-fonte).

### Aplicação prospectiva

**Antes de fix em pipeline com 2+ procedures sequenciais:**

1. Comparar filtros de auth entre procedures (técnica T2 da REGRA-ORQ-36)
2. Documentar assimetrias em comentário inline
3. Decidir explicitamente: alinhar (relaxar mais restritiva) ou divergir (com justificativa)
4. Se try/catch absorve falha de procedure restritiva, garantir que erro chegue ao usuário (toast, log de auditoria)

### Pattern do anti-fix

❌ **Não fazer:** try/catch absorvendo silenciosamente sem distinguir tipos de erro
✅ **Fazer:** try/catch que distingue 404 (auth) de 500 (server error) e age diferente

```typescript
try {
  await procA.mutateAsync({...});
} catch (err) {
  if (err.code === "NOT_FOUND") {
    toast.warning("Você não é o criador deste projeto — gaps regulatórios não serão atualizados");
  } else {
    console.warn("[contexto] procA falhou — degradando", err);
  }
}
await procB.mutateAsync({...});  // continua mesmo após auth fail
```

### Vinculadas

- Sprint M3.10 deep research (caso canônico) — `gapEngine.ts:268` vs `risks-v4.ts:generateRisksAllSources`
- REGRA-ORQ-36 T2 (Comparação cirúrgica) — esta lição é manifestação concreta
- Lição #65 (rastrear fluxo end-to-end) — complementa: além de mapear writers/readers, mapear filtros de auth
- Lição #67 (try/catch graceful) — refinamento: catch graceful precisa distinguir tipos de erro
- Tech debt declarado: relaxar `WHERE createdById = ?` em `gapEngine.ts:268` para `validateProjectAccess()` (Sprint M3.11 backlog)

### Errata (2026-05-05)

O caso canônico acima descreve cenário **hipotético** baseado em leitura de código, não reproduzido em produção. Query executada em 2026-05-05 nos 4 projetos auditados na Sprint M3.10 (#3690001, #3780001, #3570002, #3750060) confirmou que **todos têm `createdById = 1` (P.O., Uires Tapajós)** — o cenário "P.O. ≠ criador" não ocorreu.

**Status revisado:**

- ✅ **FATO:** assimetria de auth entre `gapEngine.analyzeGaps` (`AND createdById = ?`) e `risksV4.generateRisksAllSources` (sem filtro) existe no código (verificável em `server/routers/gapEngine.ts:268` vs `server/routers/risks-v4.ts:872-881`)
- ❌ **REFUTADO:** este padrão NÃO causou silent fail no #3690001. A causa real do mono-fonte percebido foi o bug do script DoD (Lição #69 errata) somado ao auto-trigger guard `activeRisks.length === 0`
- ⚠️ **HIPOTÉTICO:** o cenário "ensureV1Gaps retorna 404 → catch absorve → mono-solaris" permanece **possível teoricamente** mas **não reproduzido** em nenhum projeto auditado em produção

A lição permanece **conceitualmente válida** como técnica de investigação (T2 da REGRA-ORQ-36 — comparação cirúrgica) e padrão prospectivo de defesa em depth para procedures sequenciais. O pattern do anti-fix (catch que distingue 404 de 500) continua recomendado.

**Vinculadas à errata:**
- Q5 do relatório Manus 2026-05-05 (refutação por query)
- Audit `docs/governance/audits/v7.64-2026-05-05-audit-m3.10-multi-fonte.md`
- Tech debt em `gapEngine.ts:268` permanece válido para investigação prospectiva, mas **não é causa raiz documentada** de incidente real

## Lição #71 — Scripts de validação DoD devem ser commitados + autor valida o parser

Origem: Sprint M3.10 — bug em `scripts/dod-3780001.ts` (não commitado) propagou erro factual para Lição #69 e atrasou fechamento da sprint

### Texto

Scripts que produzem evidência DoD (Definition of Done) DEVEM:

1. **Ser commitados** ao repositório (`scripts/dod-*.ts`, `scripts/audit-*.ts` ou similar)
2. **Ter teste unitário do parser** quando consumirem dados estruturados (JSON, CSV, output de query)
3. **Ser executados pelo autor com validação cruzada** antes de reportar PASS/FAIL

A regra é dupla: o autor do script é responsável por validar o próprio parser **antes** de reportar resultado downstream. Reportar "DoD PASS" baseado em script não testado equivale a confiar em ferramenta de medição não calibrada.

### Caso canônico

Sprint M3.10 fechamento (2026-05-05). Manus produziu `scripts/dod-3780001.ts` em sandbox isolada para validar critério de DoD do PR #979 (multi-fonte). Script:

- **Não foi commitado** ao repositório
- **Não tinha teste unitário** do parser de `evidence` (coluna JSON do TiDB)
- **Continha bug** de `JSON.parse(row.evidence)` em coluna mysql2 já parseada → `[object Object]` → throws → catch silencia → reporta `fontes=[]` (falso negativo)

Resultado: `fontes_evidence=[]` foi propagado para o relatório DoD → consumido pelo Orquestrador → registrado na Lição #69 como caso canônico → publicado em main via PR #981 → afirmação factualmente incorreta no governance permanente. Cascata de governance dependeu de ferramenta de medição cega.

Apenas com queries SQL diretas (executadas independentemente do script bugado) o estado real do banco foi confirmado: 2/8 riscos do #3780001 têm multi-fonte real em `evidence.gaps[*].fonte`.

### Aplicação prospectiva

CI gate sugerido em `.github/workflows/dod-scripts-tracked.yml`:

```bash
# Falha se PR menciona "DoD PASS" no body sem referência a script commitado em scripts/
grep -E "DoD.*PASS|DoD.*✅" PR_BODY \
  && ! grep -E "scripts/(dod|audit)-[a-z0-9-]+\.ts" PR_BODY \
  && exit 1
```

Para audits ORQ-19: relatório arquivado em `docs/governance/audits/` deve referenciar SHA git + caminho dos scripts executados. Sem isso, evidência é narrativa, não reproduzível.

### Conflito RACI a observar

Quando o autor do script e o validador da implementação são a mesma entidade (caso M3.10: Manus implementou solaris/iagen analyzers + Manus escreveu DoD script + Manus reportou PASS), o checks-and-balances quebra. Em sprints pequenas pode ser inevitável — nesse caso, **commitar o script** vira a única salvaguarda residual: outro implementador ou o Orquestrador podem re-executar e detectar discrepância.

### Vinculadas

- REGRA-ORQ-19 (auditoria fim-de-sessão) — agora exige referência a scripts commitados
- REGRA-ORQ-27 (Lição #59 — assemble ≠ consumption) — manifestação meta: script "consome" do banco mas parser corrompe leitura
- REGRA-ORQ-33 (RACI Implementador ≠ Validador) — backlog: refinar para casos de validador-autor-de-ferramenta
- Lição #69 errata (caso canônico do bug propagado)
- Lição #72 (mysql2 auto-parse JSON — antipattern do parser específico)
- Sprint M3.10 (caso canônico)

## Lição #72 — Driver mysql2 auto-parseia colunas JSON: NÃO usar `JSON.parse`

Origem: Sprint M3.10 — bug em `scripts/dod-3780001.ts` que mascarou multi-fonte como `[]`

### Texto

O driver `mysql2` (versão Node.js usada no projeto) **auto-parseia colunas do tipo JSON** do TiDB/MySQL, retornando objetos JavaScript já estruturados. Aplicar `JSON.parse(row.jsonColumn)` sobre um objeto:

1. Invoca `Object.prototype.toString()` → `"[object Object]"`
2. `JSON.parse("[object Object]")` lança `SyntaxError: Unexpected token o in JSON`
3. Se houver `try/catch` ao redor, o erro é silenciado e o output cai em fallback (geralmente `[]` ou `{}`)
4. Resultado é falso negativo silencioso

### Antipattern

```typescript
// ❌ NÃO FAZER:
const ev = JSON.parse(row.evidence || '{}');

// Mecanismo da falha:
//   row.evidence === { gaps: [...] }  (objeto, não string)
//   JSON.parse({...}) → toString → "[object Object]" → throws
//   catch silenciado → ev permanece undefined ou {} → consumer reporta []
```

### Pattern correto

```typescript
// ✅ FAZER:
const ev = typeof row.evidence === "string" ? JSON.parse(row.evidence) : row.evidence;

// Variante defensiva (3 fallbacks):
function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }
  return fallback;
}
```

### Caso canônico em runtime de produção

`client/src/components/RiskDashboardV4.tsx:194-220` — helper `getSourceContributors`:

```typescript
function getSourceContributors(risk: RiskData): string[] {
  const evidence = risk.evidence;
  if (!evidence) return [risk.source_priority];
  if (Array.isArray(evidence)) return [risk.source_priority];
  if (typeof evidence === "object" && "gaps" in evidence) {
    // ← trata como objeto SEM JSON.parse
    const gaps = (evidence as ConsolidatedEvidence).gaps;
    // ...
  }
  return [risk.source_priority];
}
```

tRPC + superjson preservam o tipo objeto end-to-end (banco → backend → frontend). Por isso o helper de produção funciona — só o script DoD em sandbox isolada caiu na armadilha.

### Aplicação prospectiva

CI gate sugerido em `.github/workflows/invariant-check.yml` (INV-08):

```bash
# Detectar JSON.parse direto sobre coluna JSON em scripts/ e server/
grep -rnE "JSON\.parse\(\s*row\.(evidence|gaps|metadata|profile|payload)" \
  scripts/ server/ --include="*.ts" --include="*.tsx" \
  | grep -v "test\|\.d\.ts"
```

Se match > 0 → FAIL com mensagem direcionando para Lição #72.

**Nota técnica:** o regex captura nomes específicos de colunas JSON conhecidas no schema (lista expansível). Listar campos JSON em variável de configuração permite manutenção centralizada.

### Vinculadas

- Lição #71 (scripts DoD commitados — esta lição é o antipattern específico que motivou Lição #71)
- Lição #69 errata (caso canônico do bug propagado)
- Sprint M3.10 (caso canônico)
- `client/src/components/RiskDashboardV4.tsx:204` (pattern correto em produção)
- `scripts/dod-queries-3750060.ts` (pattern correto em script de validação — não commitado em sandbox Manus, recuperação tracked como issue P3)

## Lição #74 — Fix downstream incompleto (caso canônico: PR #1015)

Origem: Issue #1014 (NCM/NBS opcional) — PR #1015 mergeado 2026-05-07
Severidade: governança crítica — gate de processo para fixes de validação

### Padrão de erro

Remover/alterar um gate de validação sem rastrear todos os gates downstream
que consomem o mesmo campo ou produzem o mesmo status.

### Sintoma

Fix resolve o erro visível (crash/throw) mas revela bloqueio silencioso
downstream (botão desabilitado, status inconsistente sem mensagem clara).
Usuário deixa de ver o erro técnico mas não consegue avançar — UX
contraditória ("0 pendências" + botão bloqueado).

### Caso canônico — PR #1015 (cadeia completa)

| Gate | Localização | Status pós-#1015 | Bloqueia? |
|---|---|---|---|
| 1 | `validateM1Input.ts:115-123` (`NBS_REQUIRED` throw) | ✅ removido | Não |
| 2 | `buildPerfilEntidade.ts:294-300` (`computeMissingRequiredFields`) | ❌ ativo | Sim — adiciona ao missing |
| 3 | `computeStatus.ts:93-102` (gate `inconsistente` se missing > 0) | ❌ ativo | Sim — força status inconsistente |

PR #1015 cobriu apenas Gate 1. Gates 2 e 3 continuam impedindo confirmação.
Sintoma reportado pelo P.O.: "botão Confirmar Perfil da Entidade desabilitado".

### Regras violadas

- **REGRA-ORQ-35** (NUNCA ASSUMA / Read Before Write Enforcement) —
  checklist obrigatório Q2 ("identifiquei TODOS os consumers/importers")
  foi aplicado parcialmente: 3 callsites de `validateM1Seed` listados,
  mas consumers downstream em `buildSnapshot → computeStatus` ignorados.
- **Lição #59** (assemble vs consumption) — test `T73` em
  `build-perfil-entidade-pr-fin-objeto-v2.test.ts:137-146` documenta
  literalmente `status_arquetipo === "inconsistente"` como regressão
  preservada. Test passou pós-fix porque comportamento foi mantido,
  mas autor interpretou "passar" como "resolvido".
- **Lição #65** (rastrear fluxo de DADOS end-to-end) — autor parou em
  "input → validateM1Seed throw removido" sem rastrear "→ buildSnapshot
  → status_arquetipo → frontend gate".
- **Lição #66** (spec sem dados = ilusão) — spec do P.O. era literal
  ("somente validateM1Input.ts"), correta como direção mas insuficiente
  para resolver o sintoma reportado.

### Por que falhou — falha de processo colaborativo

Não foi falha individual. **4 atores tiveram oportunidade de detectar:**

| Ator | Oportunidade |
|---|---|
| Claude Code (autor) | Investigação read-only pré-implementação |
| Spec do P.O. | Definição de escopo cirúrgico |
| Manus (review) | Auditoria pré-merge |
| P.O. (autorização) | Decisão de merge |

Nenhum dos 4 detectou. Cada ator confiou que outro tinha verificado os
gates downstream.

### Contramedida obrigatória

Antes de qualquer fix de validação, autor responde por escrito as 5
perguntas do **CHECKLIST-VAL-01** (ver abaixo).

Antes de aprovar PR de fix de validação, revisor (Manus) responde por
escrito as 4 perguntas do **CHECKLIST-REVIEW-01** (ver abaixo).

### Vinculadas

- PR #1015 (caso canônico — fix incompleto)
- Issue #1014 (regressão diagnóstica que motivou)
- Issue #1016 (este PR de governança)
- REGRA-ORQ-35 (NUNCA ASSUMA)
- Lições #59, #65, #66 (regras violadas)
- CHECKLIST-VAL-01 (contramedida autor)
- CHECKLIST-REVIEW-01 (contramedida revisor)

## Lição #83 — Verificar issues pré-existentes antes de criar nova

**Origem:** Sprint BUG-Q1 (20/05/2026) — Issue #1134 criada por Claude Code sem detectar que Issue #1131 já cobria o mesmo escopo (criada anteriormente pelo P.O.). Duplicata identificada no checkpoint da sessão e fechada com link cruzado.

**Custo:** rastreabilidade fragmentada — discussões espalhadas entre 2 issues; 1 issue fechada como "not planned" apenas após o PR mergeado; tempo de reconciliação no audit fim-de-sessão.

**Caso canônico complementar:** Sprint BUG-G1 (mesmo dia, ~1h antes) — eu mesmo abri Issue #1129 (refactor deduplicação de prompts) durante o trabalho do PR #1130. Quando o despacho seguinte solicitou "TECH-D1" com escopo idêntico, fui forçado a comentar em #1129 confirmando equivalência em vez de criar duplicata. Padrão repetido 2 vezes no mesmo dia.

### Regra

Antes de `gh issue create`, executar busca prévia:

```bash
# Por arquivo + função/conceito:
gh issue list --search "<arquivo> <função>" --state all

# Por título aproximado:
gh issue list --search "<palavra-chave-do-titulo>" --state all

# Pelo escopo de afected files:
gh issue list --search "<bug-id-ou-rotulo>" --state all
```

Se issue pré-existente cobre **o mesmo escopo** → comentar nela com link para a investigação atual, **não criar nova**.

### Critérios para "mesmo escopo"
- Mesmo arquivo + mesma função
- Mesma reprodução E2E
- Mesmo conjunto de DoD esperado

Casos onde duplicata é aceitável: contextos diferentes (ex: mesmo arquivo mas funções distintas), evolução temporal (issue antiga já refletindo estado obsoleto), separação por sprint/escopo declarado pelo P.O.

### Aplicação prospectiva

Adicionar ao template de PR / issue criada por Claude Code:

```markdown
## Issues pré-existentes verificadas
- Busca executada: `gh issue list --search "<termo>"`
- Resultado: [N issues encontradas / nenhuma encontrada]
- Decisão: [criar nova / comentar em #XXXX]
```

### Vinculadas
- Sprint BUG-Q1 20/05/2026 (caso canônico — #1131 vs #1134)
- Sprint BUG-G1 20/05/2026 (caso complementar — #1129 vs TECH-D1)
- REGRA-ORQ-28 (Triade — Artefato 1 exige issue ultra-detalhada antes do código)
- REGRA-ORQ-15 (PR body template) — adicionar campo "issues pré-existentes verificadas"

## Lição #84 — Fix de consumidor sem fix de origem: marcar explicitamente

**Origem:** Sprint BUG-Q1 (20/05/2026) — bug `cnaeAnswers` permanecer `{answers: [], nivel1Done: false}` reapareceu 3 vezes (projetos 120001, 120002, 150001) após o PR #1067 (Issue #1066, 11/05/2026) ter aplicado fix **apenas no consumidor** (`BriefingV3.tsx` — merge inteligente com tabela granular V3). A origem em `QuestionarioV3.tsx` (state `cnaeProgress[i]` ficar não-marcado em fluxo `hasGap=true`) ficou invisível por 9 dias.

**Custo:** reabertura do mesmo bug 3 vezes em projetos diferentes; 9 dias de detecção tardia; advogado tributarista recebeu PDFs com confiança subestimada para projetos no fluxo `hasGap=true`.

### Padrão de erro

Fix aplicado **downstream** (consumidor) mascara sintoma mas preserva causa raiz **upstream** (origem). Sprints futuros não veem o problema original — bug "resolvido" no que diz respeito ao consumidor imediato, mas reaparece em qualquer outro consumidor que confie no mesmo dado corrompido.

### Regra

Quando um fix é aplicado em consumidor de dado corrompido (merge inteligente, fallback, defaults compensatórios, normalização defensiva), o PR DEVE incluir **comentário inline no arquivo do consumidor** com formato fixo:

```typescript
// FIX PARCIAL — origem não corrigida: <arquivo da origem> L<linha>
// Issue #XXXX aberta para fix definitivo.
// Sintoma compensado aqui: <descrição breve>.
```

Sem esse marcador, a origem fica invisível para sprints futuras — qualquer pessoa lendo o consumidor vê código "que funciona" sem detectar que há trabalho pendente upstream.

### Critérios para marcar fix como "parcial"

Aplica-se se **qualquer um**:
- Fix usa fallback que mascara `null` / `undefined` / array vazio vindo de upstream
- Fix usa merge com fonte secundária para suprir falta de fonte primária
- Fix usa normalização defensiva sobre dado que upstream deveria já normalizar
- Causa raiz é diagnosticada mas escopo do PR é declaradamente downstream

Se nenhum dos 4 critérios aplica → fix é completo, não precisa marcador.

### Aplicação prospectiva

Adicionar ao template de PR template de PR (`.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
## Cobertura do fix
- [ ] Fix completo (origem + consumidor)
- [ ] Fix parcial — apenas consumidor
  - Origem: `<arquivo> L<linha>`
  - Issue para fix definitivo: #XXXX
  - Comentário inline adicionado: SIM/NÃO
```

Se PR marca "Fix parcial" sem issue de fix definitivo associada → `validate-pr` FALHA.

### Caso canônico

**PR #1067 (Issue #1066, 11/05/2026):**
- Consumidor: `BriefingV3.tsx` — merge inteligente com `questionnaireAnswersV3` (tabela granular)
- Origem real: `QuestionarioV3.tsx` L1437 — `onAvancar` do `CnaeGapBanner` não marcava `nivel1Done=true`
- **Faltou marcador**: nenhum comentário em `BriefingV3.tsx` apontou para a origem
- **Consequência**: bug reapareceu em 3 projetos novos (120001, 120002, 150001) entre 11/05 e 20/05
- **Fix definitivo**: PR #1135 (BUG-Q1, 20/05/2026)

### Vinculadas
- Sprint BUG-Q1 20/05/2026 (caso canônico)
- PR #1067 / Issue #1066 (fix parcial original)
- PR #1135 / Issue #1134 (fix definitivo, 9 dias depois)
- Lição #59 (assemble ≠ consumption) — esta lição é manifestação simétrica: ter consumidor que compensa não significa que origem está correta
- Lição #65 (rastrear fluxo end-to-end) — complementa: além de mapear writers/readers, marcar fixes parciais explicitamente

## Lição #85 — DoD de persistência exige verificação SQL, não estado de UI

Origem: Sprint BUG-Q1 (20/05/2026) — PR #1135

### Texto

Um DoD que afirma "persistido" deve ser comprovado por query SQL no estado final, **não** por flag de progresso da UI. `cnaeAnswers` com `nivel1Done=true` e `answers=null` (ou `[]`) é um **DoD inválido**: o flag de conclusão diz "o usuário terminou", mas a ausência de `answers` prova que nada foi gravado. Flag de progresso ≠ evidência de dado persistido.

### Caso canônico

BUG-Q1: projetos com `cnaeAnswers = {answers: [], nivel1Done: false}` apesar do fluxo percorrido. O critério confiava no flag; só a query (`SELECT cnaeAnswers FROM projects WHERE id=?`) revelou `answers` vazio.

### Vinculadas

- PR #1135 / Issue #1134 · Lição #84 (fix de consumidor ≠ fix de origem) · Lição #59

## Lição #86 — Persistência crítica não depende de estado efêmero do frontend

Origem: Sprint BUG-Q1 (20/05/2026) — PR #1142

### Texto

Dado crítico (que alimenta diagnóstico/briefing) deve ser reconstruído pelo backend a partir da **fonte de verdade no banco**, não depender do estado efêmero do frontend (que se perde em reload, navegação, timeout). Se o backend consegue reconstruir de uma fonte canônica granular, deve fazê-lo — não confiar que o frontend enviou tudo.

### Caso canônico

PR #1142: `cnaeAnswers` ficava incompleto quando dependia do state do React no momento do finish. Fix: backend reconstrói `cnaeAnswers` de `questionnaireAnswersV3` (fonte de verdade granular no banco), independente do payload do frontend.

### Vinculadas

- PR #1142 / Issue #1141 · Lição #85 · Lição #62 (contexto vs evidência)

## Lição #87 — Smoke estático ≠ prova de consumo (extensão REGRA-ORQ-27 / Lição #59)

Origem: BUG-FONTES Frente C (21/05/2026) — crítica do smoke do PR #1143

### Texto

Um relatório de smoke que afirma "feature funciona" baseado em **análise estática de código** (grep, leitura) NÃO prova consumo em runtime. Para features de cadeia assemble→consumption (ex.: grounding injetado no contexto do LLM), o critério de smoke DEVE incluir **evidência de runtime**: query no estado real, log do payload, ou execução observável. Análise estática prova que o código EXISTE (assemble), não que é CONSUMIDO.

### Caso canônico

Smoke do PR #1143 (Portaria grounding) declarou "4/4 PASS" mas a afirmação central (grounding chega ao LLM) apoiava-se em "análise estática do código". A degradação graciosa de `fetchPortariaGrounding` (retorna `""` em falha) tornava "injetado" e "falhou silenciosamente" **indistinguíveis** no output. Só a query runtime (`SELECT conteudo FROM ragDocuments WHERE lei='portaria_mf_cgibs_7'` → 2 chunks não-vazios) fechou a lacuna.

### Vinculadas

- REGRA-ORQ-27 (assemble ≠ consumption) · Lição #59 · Lição #64 (audit-greps vs runtime tests) · PR #1143 · `docs/governance/audits/smoke-pr-1143-frente-c.md`

## Lição #88 — Acoplamento de engine oculto deve ser declarado no PR (extensão Lição #63)

Origem: BUG-FONTES Frente A2 (21/05/2026) — análise da Opção B

### Texto

Criar dados que parecem "seed puro" (novas linhas em tabela de configuração) pode ter **acoplamento oculto** com engine determinístico hardcoded. Antes de seedar novos códigos/categorias, verificar se o engine os reconhece via tipo/tabela hardcoded. Havendo acoplamento, o PR DEVE declarar a dependência explícita — não tratar como seed trivial.

### Caso canônico

A2 Opção B propunha 3 novas linhas `credito_presumido_*` em `risk_categories` (aparente seed puro). Verificação revelou: `risk-engine-v4.ts` tem `type Categoria` (union fechada de 11), `SEVERITY_TABLE` e `TITULO_TEMPLATES` keyed por codigo literal → novos codigos teriam severidade `undefined` / título genérico / risco `unmapped`. P.O. optou pela Opção A (enriquecer o genérico). Opção B → backlog #1146 com pré-requisitos de investigação do engine.

### Vinculadas

- Lição #63 (spec arquiteturalmente correta ≠ implementável) · Lição #62/#65 · `backend.md` ("NÃO tocar SEVERITY_TABLE") · Issue #1146 (A2-future)

## Lição #89 — scripts/ fora do tsconfig: tsc não valida seeds

Origem: BUG-FONTES Frentes A1/A2 (21/05/2026)

### Texto

O `tsconfig.json` tem `include: ["client/src/**", "shared/**", "server/**"]` — **`scripts/` está fora**. Logo, `pnpm tsc --noEmit` (gate de qualidade) NÃO valida arquivos em `scripts/`. Erros de tipo em scripts de seed/migration/diag passam pelo gate. Validar scripts por leitura cuidadosa + execução `tsx` (que o Manus roda em prod) antes de commitar — não confiar no tsc.

### Caso canônico

Scripts A1/A2 (`scripts/bug-fontes-a1-block-is.ts`, `bug-fontes-a2-enrich-credito-split.ts`) compilavam sem checagem do tsc. Caso reforçado pelo diag #1153: `mysql.createConnection(DATABASE_URL)` direto compilava (não checado) mas falhava em runtime (TLS TiDB Cloud) — fix via pool `getDb()` (#1154).

### Vinculadas

- `tsconfig.json` (include sem `scripts/`) · Lição #71 (scripts DoD commitados) · Lição #72 (driver mysql2) · PRs #1147/#1148/#1154

## Lição #90 — Nudge é necessário, não suficiente: citação de normativa infralegal exige injeção determinística

Origem: BUG-FONTES Frente B (21/05/2026) — PRs #1155 (nudge) + #1156 (injeção) + #1157 (parse)

### Texto

Nudge imperativo é **condição necessária, não suficiente** para o LLM citar normativas infralegais. A causa raiz do BUG-FONTES era **estrutural**: 79% (659/831) dos chunks do Decreto têm `cnaeGroups=""` + o `briefingQueryCtx` é domain-specific → o 2º passe via retrieval retornava ~0 chunks em produção (o spike local "passou" por usar query genérica não-representativa).

**Solução definitiva: injeção determinística por-lei** (padrão `fetchPortariaGrounding` / Frente C) — busca os artigos por categoria direto do corpus (`WHERE lei=? AND artigo IN (...)`), **zero dependência de reranker ou keyword match**.

**Bug adicional (Lição #72):** Drizzle/MySQL retornou `normativeBundle` como **string crua** (não objeto parsed) → acesso a `.artigos_decreto` em string = `undefined` → injeção vazia. Sempre aplicar `typeof raw === "string" ? JSON.parse(raw) : raw`.

**Fix completo = #1155 (nudge) + #1156 (injeção determinística) + #1157 (parse).** Nenhum sozinho bastava.

**Ausência de citação em categorias sem `normative_bundle` curado é COBERTURA (Lição #66), não falha de nudge.** Ex.: SN 120001 (gaps de alíquota zero / cadastro) não citou Decreto porque essas categorias não foram curadas — não porque o nudge falhou. "Reforçar o nudge" não resolve cobertura; o caminho é curar mais categorias.

### Validação

Smoke [SMOKE-B-FINAL-V2] (local — dev server + DB prod): projeto 660001 (lucro_presumido) citou "Art. 28 a 31 do Decreto 12.955/2026" (split_payment) → **consumo provado** (≠ as 4 tentativas anteriores e ≠ análise estática). Critério 4a (SN não citou) = cobertura, não bug. Deploy em produção (Publish) pendente — re-validar em prod.

### Vinculadas

- PRs #1155 / #1156 / #1157 · Lição #87 (smoke estático ≠ consumo) · Lição #72 (driver mysql2 JSON) · Lição #66 (cobertura — spec sem dados é ilusão) · Lição #88 (acoplamento engine) · REGRA-ORQ-27 (assemble ≠ consumption) · REGRA-ORQ-36 (5 técnicas) · Frente C / #1143 (padrão da injeção)

## Lição #91 — Gotchas dos gates de CI (validate-pr-body / Guard / autoaudit)

Origem: Sprint FIX-NORM (24/05/2026) — PRs #1181/#1182 falharam o gate `Validate PR body` 2× por detalhes de formato, custando re-triggers. Documentado a pedido do P.O.

### Texto

Os gates de CI do projeto têm comportamentos não-óbvios que custam ciclos se ignorados. Antes de abrir PR, conferir:

| # | Gotcha | Regra |
|---|---|---|
| 1 | **`validate-pr-body` lê o PRIMEIRO bloco ` ```json `** como evidência | Se houver outro JSON antes (ex.: Gate Zero), o validador pega o errado → "chaves ausentes". **Solução:** blocos auxiliares usam ` ```text ` (ou ` ``` ` sem `json`); só a evidência é ` ```json `. |
| 2 | **Checkbox de risco exige a FRASE EXATA do template** | `- [x] Baixo — sem impacto em dados ou fluxo principal` (não sufixo custom). Frase própria → "Nenhum nível de risco marcado". Idem `Médio — impacto controlado e reversível`. |
| 3 | **Arquivo critical-path exige label** | Tocar `flowStateMachine`/`getDiagnosticSource`/`flowRouter`/`FlowStepper` → label **`critical-path`** (Guard Regra 3, `changed-files-guard.js`); migration → **`db:migration`**; RAG → **`rag:review`**. Sem o label → Governance gate + Guard critical bloqueiam. |
| 4 | **`autoaudit` re-dispara só em `synchronize`/`opened`, NÃO em `edited`** | Editar o body sozinho não re-roda o gate. **Empty commit** (`git commit --allow-empty`) gera `synchronize` e re-lê o body atual. |
| 5 | **Número de migration — verificar colisão** | Não assumir "próximo número". `ls drizzle/0NNN*.sql` — PRs em voo podem ter reservado o número (ex.: 0101 #1156, 0102 #1181 → próximo 0103). |
| 6 | **Menção INLINE de fence-json na PROSA conta como bloco** | Escrever a sequência crase-crase-crase+json no texto do body (ex.: descrevendo o gotcha #1) é detectado como fence de evidência → parse inválido. Caso canônico: o PR #1185 desta própria lição falhou por isso. **Solução:** na prosa, escrever "bloco JSON cercado" — nunca o fence literal. |
| 7 | **Migration discipline exige 3 frases EXATAS no body** (extensão 19/06/2026) | PR que toca `schema.ts`/`.sql`/`drizzle`/`migrations` dispara o gate **`Migration discipline`** (required), que faz `grep -q` por 3 frases literais: **"Migração de banco"** + **"Reversível"** + **"Testado em ambiente isolado"**. Faltando qualquer uma → fail. Caso canônico: #1517 (F1 regime tributário) custou 2 re-triggers até as 3 estarem presentes. Origem complementar: incidente DDL `projects` vs `solaris_questions` — a frase "Testado em ambiente isolado" como prática teria antecipado o typo no report. |
| 8 | **Exceção docs-only só vale se TODOS os arquivos estão em `docs/`** (extensão 19/06/2026) | `validate-pr-body` dispensa o template completo apenas quando 100% dos arquivos do diff estão sob `docs/`. Um único arquivo em `.claude/` ou `.github/` (ex.: `.claude/rules/governance.md`) **quebra** a exceção → exige o template completo (Escopo/Risco/Declaração/Validação/Task/Checklist/Declaração final + risco marcado). Caso canônico: o PR #1526 (esta própria lição) falhou por isso — PR de lição mistura `governance.md` (em `.claude/`) com audits (em `docs/`). **Solução:** usar o template completo em PRs de governança que toquem `.claude/`. |
| 9 | **`Spec completa` (required) grepa o CONTEÚDO da issue, não só as 5 labels — mesmo Classe A** (extensão 26/06/2026) | O job `Spec completa` lê `closingIssuesReferences` e, além das 5 labels `spec-*`, faz `grep` no **corpo da issue** por **"Bloco 9"** + **"Contrato"** (ou `input.*output`) + **"E2E"** (ou `fluxo completo`/`passo a passo`). Issue Classe A enxuta que omita esses 3 marcadores → `FAIL: Conteudo ausente`. Caso canônico: PR #1601 (BUG-RELABEL-INTL-OPS) — issue tinha as 5 labels mas faltava Bloco 9/Contrato/E2E → custou 1 edição da issue + resync. **Solução:** toda issue vinculada a PR (mesmo Classe A) inclui os 3 marcadores literais no corpo. |
| 10 | **`Pre-Close Checklist` PC-2 (parser de `data-testid`) → falso-positivo em fix de lógica sem elemento UI novo** (extensão 26/06/2026) | O job `Pre-Close Checklist (ORQ-17)` PC-2 extrai `data-testid="..."` do Bloco 9 da issue e exige presença no componente. Fix de **lógica de validação** (ex.: gate `calcProfileScore`/`STEP_DEFS`) **não adiciona testid** → PC-2 retorna `0/0 — implementação incompleta`. É **não-required** (não está nos 5 required do branch protection). Casos canônicos: PR #1599 e #1603. **Solução:** não queimar ciclos — `Pre-Close` PC-2 é known-false-positive para fixes sem UI nova; mergear pelos 5 required verdes. Registrar no PR body que PC-2 é falso-positivo. |

### Validação prática

Rodar **localmente** antes do push (mesmo script do CI):
```
PR_BODY="$(cat body.md)" PR_TITLE="..." node .github/scripts/validate-pr-body.js
```
Esperar `✅ PR body validado com sucesso` antes de abrir o PR.

### Vinculadas

- PRs #1181 / #1182 (FIX-NORM) — casos canônicos · PR #1173 (label critical-path) · REGRA-ORQ-15 (PR body template) · REGRA-ORQ-CI-01 (CI verde pré-merge) · `.github/scripts/validate-pr-body.js` · `.github/scripts/changed-files-guard.js`

## Lição #92 — `touchesRag` casa `cnae`: falso-positivo em CNAE tributário (24/05/2026)

Origem: PR #1186 (FEAT-SCOPE-01) — split forçado em 2 PRs por falso-positivo do Guard.

### Texto

`changed-files-guard.js:41` define `touchesRag` com `f.toLowerCase().includes('cnae')`. A intenção é proteger o **subsistema RAG de descoberta de CNAE** (embeddings/semantic search). Mas a heurística é larga demais: **qualquer arquivo com "cnae" no nome** (incluindo features de CNAE **tributário** determinístico, sem RAG) é classificado como domínio RAG.

Consequência: PRs de CNAE tributário que **também** tocam migration (`schema.ts`/`.sql`/`drizzle/`) disparam:
- **REGRA 2** (exige label `rag:review`), e
- **REGRA 5** (`migration + RAG = PROIBIDO` — hard-block incondicional, **sem escape por label**, linha 116).

→ O PR fica **impossível de mergear** sem split, mesmo não tocando `ragDocuments`/embeddings/recuperação.

### Workaround aplicado (PR #1187 + PR #1188, FEAT-SCOPE-01)

1. **Split em 2 PRs:** migration (schema.ts + `.sql`) primeiro; engine + reader + testes depois.
2. **Filename da migration sem "cnae"** (REGRA-ORQ-FILENAME-01 / Lição #81) → migration PR tem `touchesRag=false` → sem REGRA 5.
3. **PR de engine** tem `touchesRag=true` (arquivos `*cnae*.ts`) mas **sem migration** → só REGRA 2 → resolvido com label `rag:review` proativo.
4. **Body sem keywords do auto-labeler** (`corpus`/`chunks`/`ingestão`/`anchor_id`) — senão `label-governance.yml` aplica `rag:corpus` → dispara o RAG Quality Gate (REGRA-ORQ-37) indevidamente.

### 2º trigger estrutural — RAG Quality Gate (path `drizzle/schema.ts`)

O mesmo tipo de falso-positivo existe em **OUTRO gate**: `rag-quality-gate.yml` tem `paths: - 'drizzle/schema.ts'` (linha 14). **Qualquer** migration que toque `schema.ts` — inclusive tabelas **não-RAG** (ex: `cnae_aplicavel_oportunidade`, tributária) — dispara o RAG Quality Gate, que exige a seção "Gate RAG — Evidências de Qualidade" com checkboxes de **ingestão** (`anchor_id 100%`, `gold set`, `chunks invisíveis`...). **Não há label de skip.** Marcar esses checkboxes em PR não-RAG seria **declaração falsa** → correto NÃO marcar.

**Padrão estabelecido:** para migration não-RAG que toca `schema.ts`, o caminho correto é **admin-override documentado** do RAG Quality Gate (honestidade > compliance aparente). Precedente: **PR #1116** (migration anchor_id/autor — mesmo path-trigger, mesmo admin-override) e **PR #1187** (FEAT-SCOPE-01 — tabela tributária). Adicionar nota no body do PR explicando o falso-positivo antes do override.

### Correção futura (não feita aqui — exige PR próprio + review)

Duas heurísticas largas a estreitar (PR de governança separado):
1. `changed-files-guard.js` `touchesRag` → restringir `includes('cnae')` ao **subsistema RAG real** (`rag-corpus-*`, `ragDocuments`, `*-embeddings*`, `*-vector*`), excluindo CNAE tributário; OU escape por label à REGRA 5 (ex: `migration-cnae-tributario-reviewed`).
2. `rag-quality-gate.yml` `paths: drizzle/schema.ts` → disparar só quando o diff tocar tabelas RAG (`ragDocuments`/`rag_*`), não todo `schema.ts`; OU adicionar label de exceção.

Enquanto não corrigido: **admin-override documentado** é o caminho correto para migrations não-RAG que tocam `schema.ts`. Mudança em gate de governança → PR separado + aprovação P.O. + review Manus.

### Vinculadas

- PR #1186 (fechado — falso-positivo) · PRs #1187/#1188 (split FEAT-SCOPE-01) · #1177
- REGRA-ORQ-FILENAME-01 / Lição #81 (filename de migration sem substring que o guard casa)
- Lição #91 (gotchas dos gates de CI) · REGRA-ORQ-32 (no hardcode) · REGRA-ORQ-33 (RACI — não altero gate unilateralmente)
- `.github/scripts/changed-files-guard.js:38-44` (touchesRag) · `.github/workflows/label-governance.yml` (auto-labeler keywords)

## Lição #93 — "Ausência na base" ≠ "não-regressão"; mudança aditiva prova-se pelo diff

**Origem:** FEAT-COB-01 #1176 (PR #1205, 24/05/2026) — crítica do smoke DoD T7 (suposta regressão de `aliquota_reduzida`)
**Status:** proposta por Claude Code — aguarda revisão Manus/Consultor + aprovação P.O. (REGRA-ORQ-33)

### Texto

Um teste de regressão que conclui "sem regressão" a partir de um **count global** ("categoria X = 0 em TODA a base") é **inválido**. Ausência de dado na base é **ausência de evidência**, não evidência de não-regressão. Regressão prova-se por:

1. **before/after no MESMO artefato** que tinha o estado (um projeto que TINHA a categoria continua tendo); OU
2. **argumento estrutural por construção** — para mudança puramente ADITIVA: "o diff não toca o code path que produz X" (verificável por `git diff --name-only`). O argumento por construção é **mais forte** que qualquer count.

Adicionalmente: ao explicar **por que** algo não regrediu, VERIFICAR o mecanismo real no código antes de afirmá-lo. Afirmar um gate inexistente ("o gate de X em `<função>`") quando `grep` retorna 0 ocorrências é **mecanismo inventado** — contamina o registro arquivado (Lição #64/#71/#87).

### Caso canônico

Smoke do PR #1205, cenário T7: concluiu que `aliquota_reduzida` "não regrediu" porque "= 0 em toda a base", com a explicação *"o gate de aliquota_reduzida no `inferNormativeRisks` exige CNAE alimentar + regime específico"*. Verificação na fonte de verdade:

- (a) `inferNormativeRisks` **NÃO tem** branch de `aliquota_reduzida` (`grep aliquota_reduzida normative-inference.ts` = **0**; as categorias inferidas são `aliquota_zero`, `credito_presumido`, `split_payment`, `regime_especifico_imoveis*`, `risco_art_269_270`);
- (b) "CNAE alimentar" é o gate do `aliquota_ZERO` (NCM alimentar), **não** do reduzida;
- (c) `aliquota_reduzida` é Art. 127, gerada por `cnae-oportunidade-eligibility.ts` (FEAT-SCOPE-01) no path **gap/`consolidateRisks`**.

O PR #1205 é **aditivo** a `inferNormativeRisks` e **não toca** esse path (`git diff --name-only origin/main~1 origin/main` confirma) → `aliquota_reduzida` não pode regredir **por construção**. **Conclusão certa, mecanismo e metodologia errados.**

### Aplicação prospectiva

- DoD de regressão para mudança **aditiva** DEVE usar: *"o diff não toca `<path que gera a categoria/feature>`"* — não "count global = 0".
- Toda afirmação *"X não regrediu porque `<mecanismo>`"* exige o mecanismo **verificado** (`grep` / `arquivo:linha`), nunca inferido.
- Smoke que cita um gate/função DEVE confirmar a existência do gate antes de arquivá-lo.

### Vinculadas

- Lição #65 (rastrear fluxo / testar a coisa certa) · Lição #87 (smoke estático ≠ consumo) · Lição #64 (audit-greps vs runtime) · Lição #71 (scripts DoD / medição calibrada)
- REGRA-ORQ-27 (assemble ≠ consumption) · REGRA-ORQ-34 Protocolo 3 (DoD com critério negativo) · REGRA-ORQ-33 (RACI)
- FEAT-COB-01 #1176 / PR #1205 (caso canônico) · `server/lib/normative-inference.ts` · `server/lib/cnae-oportunidade-eligibility.ts`

## Lição #103 — cnae_groups NULL = pergunta universal

**Contexto:** BUG-SOL-050-051 · PR #1253 · build d259d4e3 · 26/05/2026

### Regra

`cnae_groups = NULL` em `solaris_questions` significa **pergunta universal**
(exibida para todos os CNAEs). Perguntas **condicionais por CNAE** DEVEM ter
`cnae_groups` preenchido na migration de inserção. Nunca inserir como NULL
e corrigir depois — o NULL vaza para produção como universal silenciosamente.

### Aplicação

Ao criar migration que insere `solaris_questions` condicionais, sempre incluir
`cnae_groups` no INSERT. Se universal intencional, documentar explicitamente
com comentário:

```sql
-- universal: exibida para todos os CNAEs
```

### Vinculadas

- BUG-SOL-050-051 · PR #1253 (caso canônico) · migration 0106 (#1197 — SOL-050/051/052 inseridas com `cnae_groups=NULL`)
- BUG-UX-01 #1249 / PR #1251 (ocultação condicional de SOL-052 no display — sintoma do mesmo NULL universal)
- REGRA-ORQ-29 + Lição #61 (CNAE-condicionado / metadado determinístico antes da pergunta)
- REGRA-ORQ-32 (no hardcode — visão sistêmica: `cnae_groups` é o campo data-driven correto, não filtro hardcoded)
- Lição #92 (`touchesRag` casa `cnae` — falso-positivo em CNAE tributário)

## Lição #101 — boundary é por match-de-grupo (não LENGTH); casar o WHERE ≠ sobreviver ao LIMIT

**Contexto:** Campanha BUG-CORPUS-GAP projeto 2700001 (fabricante CNAE 2833, NCM 8436.99.00) · D1 · 27/05/2026

### Regra

Boundary match é por **LIKE de grupo CNAE** (`cnaeGroups LIKE '28,%' | '%,28,%' | '%,28' | ='28'`), **não por LENGTH**. `LENGTH(cnaeGroups) < 50` é a condição de **fallback** (chunk setorial sem grupo restrito), não o discriminador de boundary — um `cnaeGroups` curto contendo o grupo (ex.: Art. 197 com `'01,02,03,...,28,...'`, len 30) **é boundary**; um longo universal também.

Segundo erro, simétrico: **casar o WHERE (boundary) ≠ sobreviver ao LIMIT.** Um chunk pode ser boundary e ainda assim ser **excluído** do resultado se houver mais boundaries antes dele no ordering (PK ou outro). Corrigir o `cnaeGroups` (tornar boundary) não garante que o chunk seja retornado.

### Evidência empírica (Gate 0 + dry-run, 27/05/2026)

- `Art. 140`: `cnaeGroups` len=**71** E classificado **boundary** (contém 28) → tamanho não classifica.
- Após corrigir o `cnaeGroups` do Art. 197 (D1-A), ele virou boundary — mas com `ORDER BY boundary-first, id` ficou na **posição 72 de 73 boundaries** para CNAE 28 (id alto) → **fora do LIMIT 20**. Boundary ≠ retornado.

### Aplicação

- Nunca usar `LENGTH(cnaeGroups)` como proxy de boundary (em WHERE ou ORDER BY) — usar os patterns LIKE de grupo.
- Ao diagnosticar "chunk X não é recuperado", separar dois passos: (1) casa o WHERE? (2) sobrevive ao LIMIT/ordering? Medir o objetivo final (output), não o intermediário.

### Vinculadas

- Campanha BUG-CORPUS-GAP 2700001 · D1-A (PR #1271) · D4-POOL (#1259) · D2 (#1267/#1269)
- Lição #65 (rastrear fluxo / medir objetivo) · Lição #93 (mecanismo verificado, não inferido)
- REGRA-ORQ-32 (no hardcode — boundary por metadado, não LENGTH) · `server/rag-retriever.ts` (`fetchSetorialCandidates`, `matchesCnaeBoundary`)

## Lição #107 — oráculo de cobertura é shouldInjectCategory sobre risk_categories, não o texto do grounding

**Contexto:** DIAG-COVERAGE-03 · 27/05/2026 · suite `coverage-8-profiles` (57/57 com DB)

### Regra

O oráculo de "quais categorias se aplicam a um perfil (CNAE/regime)" é **`shouldInjectCategory` aplicado sobre `risk_categories`** (gate CNAE + vigência) — **não** o output de `fetchDeterministicGrounding`, que retorna **texto de artigo** (`[FONTE: lei, artigo]`), não códigos de categoria, e só processa o grounding infralegal (decreto/cgibs6/portaria7). Testes e auditorias de cobertura devem atacar **o gate**, não o output textual.

### Caso canônico

O design original do F2 (DIAG-COVERAGE-03) tentava `extractCategoriesFromOutput(fetchDeterministicGrounding(...))` para verificar `must_include` por código → daria ~0 categorias (os códigos não estão no texto; as universais nem são processadas por essa função). Corrigido para `shouldInjectCategory × risk_categories × perfil` → 8/8 PASS com DB.

### Vinculadas

- DIAG-COVERAGE-03 · `server/integration/coverage-8-profiles.test.ts` · `deterministic-grounding.ts` (`shouldInjectCategory:60` vs `fetchDeterministicGrounding:104`)
- REGRA-ORQ-27 (assemble ≠ consumption) · Lição #59 · Lição #87 (smoke estático ≠ consumo)

## Lição #109 — Spec sem modelo conceitual entrega contrato técnico, não produto

**Origem:** BUG-AGRO-CPF · PR #1294 (F2) · 29/05/2026

**O que aconteceu:**
A spec F2 definiu "radio PJ/PF + input CPF condicional". Claude Code entregou
exatamente isso. Mas o produto real exige que, ao selecionar PF, campos exclusivos
de PJ (Tipo Jurídico, Porte, Regime Tributário, Estrutura Societária) desapareçam.
Isso nunca foi escrito em nenhum artefato. O scorecard F2 marcou ✅ — tecnicamente
correto por arquivo, funcionalmente falso por produto.

**Regra:**
Toda spec de formulário com múltiplos perfis de usuário (PJ/PF, admin/cliente,
pessoa física/jurídica) DEVE incluir uma tabela de visibilidade de campos:

| Campo | Perfil A | Perfil B |
|---|---|---|
| Tipo Jurídico | visível + obrigatório | OCULTO |
| ... | ... | ... |

Sem essa tabela, a spec está incompleta e não pode ser aceita como DoD.

**Corolário:**
Smoke test de feature de formulário DEVE incluir cenário E2E completo:
selecionar perfil → preencher campos visíveis → clicar Avançar → confirmar que
avançou. Smoke que valida apenas o campo novo (radio, input) sem testar o fluxo
completo é smoke parcial — não é DoD.

---

## Lição #110 — Test que replica schema simplificado passa por motivo errado

**Origem:** BUG-AGRO-CPF · PR #1297 (F5) · 29/05/2026

**O que aconteceu:**
O teste TB-01 em `bug-agro-cpf.test.ts` replicou o schema Zod com
`companyType: z.string()` em vez de importar o schema real de
`routers-fluxo-v3.ts`. O valor `"produtor_rural_pf"` passou no teste mas seria
rejeitado pelo backend real (enum com 9 valores PJ).
O teste marcou PASS. A produção teria marcado 400.

**Regra:**
Testes de contrato de schema DEVEM importar o schema real, não replicá-lo.

```typescript
// ❌ ERRADO — replica schema, pode divergir silenciosamente
const schema = z.object({ companyType: z.string() });

// ✅ CORRETO — importa o schema real
import { projectCreateSchema } from '../routers/routers-fluxo-v3';
```

Se o schema não é exportado, exportar como `export const` antes de escrever o
teste — nunca replicar.

**Corolário (extensão da Lição #59):**
Assemble ≠ Consumption se aplica também a schemas: validar que o refine local
aceita CPF não prova que o schema de produção aceita um payload PF completo.

---

## Lição #113 — "UI mostra X" ≠ "DB persiste X" (extensão da REGRA-ORQ-27)

**Data:** 29/05/2026 | **Origem:** diagnóstico falso-positivo perfil.pdf vs Q-NEW-1/Q-NEW-2 do Manus

**Regra:**
Antes de classificar causa-raiz como bug de persistência, validar empiricamente que
UI e banco concordam. PDF/tela mostrando um valor **não prova** que o banco persiste
esse valor. Query SQL é obrigatória antes de qualquer diagnóstico de persistência.

**Origem:**
`perfil.pdf` do projeto 4470001 exibiu `Regime: lucro_real (Usuário preenchido)` para
projeto PF. Diagnóstico inicial concluiu: "F7 não cobriu a tela ConfirmacaoPerfil; PF
preencheu regime indevidamente". Q-NEW-1 do Manus refutou: `archetype.regime = NULL`
em **0/N projetos PF**. Q-NEW-2 confirmou: 4470001 tem `regime_companyprofile=null`
**e** `regime_perfil_entidade=null`. A string `"lucro_real"` no PDF era artefato de
template/cache, não dado persistido. Falso positivo de diagnóstico de causa-raiz.

**Procedimento obrigatório antes de afirmar "X está persistido errado":**

1. Identificar o campo SQL exato suposto (`tabela.coluna` ou `JSON_EXTRACT`)
2. Executar query empírica que comprova ou refuta a persistência
3. Só então classificar como "bug de persistência" ou "bug de UI/template"

**Anti-padrão:**

```
Observação: "PDF mostra Regime: lucro_real para PF"
Inferência:  "Logo, o banco está persistindo lucro_real para PF"
Conclusão:   "Bug crítico de persistência — abrir hotfix P0"
```

→ pula direto da observação para a conclusão sem provar a inferência intermediária.
A mesma classe de erro que REGRA-ORQ-27 (assemble ≠ consumption) descreve, agora
aplicada à **observação visual ≠ dado persistido**.

**Pattern correto:**

```
Observação:  "PDF mostra Regime: lucro_real para PF"
Validação:   "SELECT JSON_EXTRACT(...) AS regime FROM projects WHERE id=X"
  → Se = 'lucro_real' → bug de persistência (continue diagnóstico)
  → Se = NULL          → bug de UI/template/cache (mude direção)
Conclusão:   só depois da validação
```

**Vinculadas:**
- REGRA-ORQ-27 (assemble ≠ consumption — pai conceitual)
- Lição #59 (engine declara consumir vs consome em runtime)
- Lição #87 (smoke estático ≠ consumo runtime)
- Lição #93 (mecanismo verificado, não inferido)
- Lição #110 (schema replicado mascara bugs)
- Lição #111 (testar valor real do frontend, não conveniente)
- Diagnóstico E2E 4470001 (caso canônico — falso positivo de regime PF)

## Lição #114 — Restrições de escopo no despacho devem ser verificadas contra o contrato real do backend

**Data:** 29/05/2026 | **Origem:** BUG-AGRO-CPF-UX · despacho item G (excluir campo cliente)

**Contexto:** O despacho declarou "❌ NÃO tocar server/". Claude Code fez grep e descobriu que
`clientId` era `z.number({ message: "Cliente é obrigatório" })` — obrigatório, não opcional.
Seguir o despacho literalmente quebraria o DoD D2 silenciosamente (frontend para de enviar
`clientId` → backend rejeita com 400).

**Lição:** Restrições de escopo declaradas pelo Orquestrador ("não tocar X") são baseadas em
premissas sobre o estado do código. Claude Code tem o dever de verificar empiricamente via grep
antes de implementar — e levantar conflito se a premissa for falsa. O Orquestrador não tem acesso
ao código; Claude Code tem.

**Regra:** Antes de aceitar uma restrição de escopo, executar:
```bash
grep -n "<campo_restrito>" <arquivo_restrito> | head -10
```
Se o grep revelar premissa falsa → parar e reportar ao Orquestrador antes de implementar.

---

## Lição #115 — Smoke via script tRPC ≠ smoke via UI

**Data:** 29/05/2026 | **Origem:** BUG-CPF-E2E-REG-01 · `NovoProjeto.tsx` L317

**Contexto:** O DoD do fix `tax_id_type` foi validado via script que chamava o endpoint tRPC
diretamente com `taxIdType: 'cpf'` hardcoded no payload. O teste passou. Mas o frontend
`NovoProjeto.tsx` lia `perfilData.personType` (campo inexistente) em vez de
`perfilData.taxIdType` — então `isPF` era sempre `false`, e o payload enviado pela UI era
sempre montado como PJ. O bug só foi descoberto no E2E manual.

**Lição:** Um teste que chama o endpoint diretamente com payload hardcoded valida o
**backend isolado**, mas **não valida o contrato frontend→backend**. São duas camadas
distintas. Um bug pode existir exclusivamente na camada de montagem do payload no frontend
e passar invisível em qualquer teste de backend.

**Regra:** O DoD de qualquer fix de formulário DEVE incluir pelo menos uma das seguintes
evidências:
1. Clique real na UI (smoke manual) com o formulário preenchido pelo usuário, OU
2. Teste Playwright/Cypress que simule o `handleSubmit` completo do formulário

Scripts tRPC diretos são válidos como evidência de backend, mas **não substituem** o smoke
de UI para fixes que envolvem formulários.

**Par com Lição #113:** "UI mostra X ≠ DB persiste X" (não confiar na UI para inferir o DB).
Lição #115 é o inverso: "script passa ≠ UI funciona" (não confiar no script para inferir o
comportamento da UI).

**Caso canônico complementar — BUG-TAX-ID-SQL (29/05/2026 ~21:43):** Orquestrador
recebeu report do Manus indicando que `SELECT tax_id_type FROM projects WHERE id=4500032`
retornava `'cnpj'`. O diagnóstico inferiu causa-raiz "código `createProject()` não popula
a coluna" e o despacho foi formulado para refazer o fix. Verificação literal do código
em main HEAD `8f54939` (via Read tool) mostrou que **a linha `taxIdType:
input.companyProfile?.taxIdType ?? "cnpj"` já existia em `routers-fluxo-v3.ts:467` desde
PR #1308**. O sintoma SQL era real, mas a causa-raiz inferida estava errada (provável
deploy lag). REGRA-ORQ-22 Nível 1 bloqueou corretamente o PR no-op antes da execução.
Mesma classe da Lição #115: **script SQL revela o sintoma; só inspeção literal do código
revela se a causa-raiz proposta é coerente.**

## Lição #116 — Callsite audit obrigatório pós-migration

**Data:** 29/05/2026 | **Origem:** despacho GOV-116 · padrão preventivo

**Lição:** Declarar uma coluna no `drizzle/schema.ts` garante apenas que o ORM **conhece**
a coluna — **não** garante que ela será setada em qualquer `db.insert(...).values({...})`
existente. Drizzle ignora silenciosamente colunas que não estão no objeto passado a
`.values()`, e o banco aplica o `DEFAULT` da coluna. Resultado: sintoma "coluna sempre
com valor default" mesmo com schema correto, frontend correto e tipos corretos.

**Regra:** Toda **nova coluna com semântica de negócio** (não cosmética) adicionada via
migration DEVE ter seus callsites de INSERT auditados manualmente. Audit mínimo:

```bash
grep -n "db\.createProject\|db\.insert(projects" server/routers-fluxo-v3.ts server/db.ts
```

Para cada callsite identificado, confirmar que o objeto passado ao INSERT **inclui** a
nova coluna (ou que o `DEFAULT` da coluna é semanticamente correto para o callsite —
ex: scripts de seed legados que não precisam saber da coluna nova).

**Quando aplicar:** imediatamente após mergear qualquer migration que adicione coluna
com semântica de negócio. NÃO depois de bug em produção.

**Anti-padrão:**

```
1. Adicionar migration: ALTER TABLE x ADD COLUMN y NOT NULL DEFAULT 'a'
2. Adicionar declaração no schema.ts (Drizzle conhece y)
3. Esquecer de auditar db.insert(x).values({...}) — ninguém seta y
4. Produção: coluna y sempre = 'a' (DEFAULT), independente do payload
5. Bug só aparece quando alguém roda SELECT y FROM x WHERE ... e estranha
```

**Pattern correto:**

```
1. Adicionar migration
2. Adicionar declaração no schema.ts
3. grep todos os callsites de db.insert(<tabela>)
4. Para cada callsite: confirmar que objeto .values({...}) seta a nova coluna
   (ou registrar exceção justificada se DEFAULT é correto para aquele caller)
5. CI: snapshot tests dos callsites podem ajudar a manter sincronização
```

**Lição preventiva — sem caso canônico real nesta sessão.** O episódio BUG-TAX-ID-SQL
do mesmo dia **não é** caso canônico desta lição: o callsite em `routers-fluxo-v3.ts:467`
**já estava** auditado e setando `taxIdType` corretamente desde PR #1308. O bug observado
em 4500032 teve **outra** causa-raiz (provável deploy lag). Caso canônico desta Lição
fica em aberto até emergir cenário real.

**Vinculadas:**
- REGRA-ORQ-27 (assemble ≠ consumption — pai conceitual)
- Lição #65 (writers/readers end-to-end)
- Lição #93 (mecanismo verificado, não inferido)
- Lição #113 (UI mostra X ≠ DB persiste X)
- Lição #115 (script passa ≠ UI funciona)
- Migration 0119 + PR #1308 (cenário preventivo — callsite estava auditado)

## Lição #117 — Registrar lição em governance.md ≠ aplicar fix no código

**Data:** 29/05/2026 | **Origem:** BUG-PAYLOAD-CPF — gap operacional entre registro e aplicação

**Regra:**
Toda Lição com **caso canônico real em código** DEVE ter PR de fix vinculado, não
apenas registro documental em `governance.md`. Registrar a lição educa o futuro,
mas **não corrige o bug presente**. Sem PR de fix vinculado, o bug continua exposto
em produção mesmo após o registro formal.

**Caso canônico — Lição #115 vs PR #1314 (29/05/2026):**

| Evento | Timestamp | Estado do produto |
|---|---|---|
| **Bug existente em produção** | < 21:12 BRT | `NovoProjeto.tsx:269-278` não mapeia `taxIdType`/`cpf` → usuário PF recebe 5 erros 400 |
| **PR #1312 mergeado** — registra Lição #115 ("script ≠ realidade UI") | 21:12 BRT | Bug **continua exposto** — Lição é apenas documental |
| **Bug reportado pelo P.O.** após teste E2E | ~22:00 BRT | "Erro ao criar projeto: ..." |
| **PR #1314 aberto** — fix de 2 linhas | 22:10 BRT | Fix entra em código |
| **Janela de produção exposta** | ~58 minutos | Lição registrada mas bug ativo |

A Lição #115 foi registrada com texto "fix em código" mas o PR vinculado **nunca foi aberto**. Resultado: 58 minutos de produção exposta entre o registro formal e o fix real.

**Anti-padrão:**

```
1. Bug observado em código real
2. Análise produz Lição genérica
3. PR docs-only registra Lição em governance.md
4. Tarefa "fechada" no board
5. Bug ORIGINAL continua exposto em produção
6. Bug reaparece em E2E → re-investigação → PR de fix tardio
```

**Pattern correto:**

```
1. Bug observado em código real
2. Análise produz Lição
3. Imediatamente: 2 PRs em paralelo (ou sequenciais, mas ambos):
   (a) chore/licao-N — registra Lição em governance.md
   (b) fix/bug-N — corrige o bug no código
4. Tarefa só fecha quando AMBOS estão merged
5. Bug eliminado de produção; Lição preserva o aprendizado
```

**Critério de aplicação:**

Aplica-se quando a Lição tem **caso canônico real, atualmente exposto em código**.

NÃO se aplica a:
- Lições preventivas (ex: Lição #116, marcada explicitamente "sem caso canônico real")
- Lições retroativas (caso canônico já resolvido em PR anterior)
- Lições de processo/governança puro (não tem código a corrigir)

**Vinculadas:**
- Lição #115 (script ≠ realidade UI — Lição que motivou o gap)
- BUG-PAYLOAD-CPF (PR #1314, 22:10 BRT — fix tardio que motivou esta Lição)
- REGRA-ORQ-27 (assemble ≠ consumption — pai conceitual: "registrar ≠ aplicar" é manifestação)
- REGRA-ORQ-17 (PRE-CLOSE-CHECKLIST — gates de fechamento devem incluir "Lição com caso canônico real tem fix PR aberto?")

## Lição #120 — Join path `tasks → risks_v4` é SEMPRE mediado por `action_plans`

**Data:** 2026-06-13 | **Origem:** BUG-GUIA-SQL-01 (PR #1409, FEAT-GUIA-PRÁTICO)
**Nota de numeração:** registrada como **#120** por decisão do P.O. — #118 e #119 estão reservados para lições pendentes (Manus). O último registro contíguo neste arquivo é #117.

### Regra

A tabela `tasks` **não tem coluna `risk_id`**. O vínculo tarefa→risco é **sempre** mediado por `action_plans`:

```
tasks.action_plan_id → action_plans.id → action_plans.risk_id → risks_v4.id
```

Qualquer query que precise do risco a partir de uma task DEVE usar o join de 2 saltos:

```sql
FROM tasks t
JOIN action_plans ap ON t.action_plan_id = ap.id
JOIN risks_v4 r ON ap.risk_id = r.id
```

O join direto `JOIN risks_v4 r ON t.risk_id = r.id` é **impossível de satisfazer** (coluna inexistente) → retorna 0 linhas → `NOT_FOUND` silencioso.

### Caso canônico

`guiaPratico.gerar` (`server/routers/guia-pratico.ts:128`) usava `JOIN risks_v4 r ON t.risk_id = r.id` → toda geração de guia falhava com `NOT_FOUND`. Fix (PR #1409): trocar pelo join mediado por `action_plans`.

O path correto é o mesmo já usado em `server/lib/db-queries-risks-v4.ts:302` (cascade delete `INNER JOIN action_plans ap ON t.action_plan_id = ap.id`) e confirmado pelo `INSERT action_plans (id, project_id, risk_id, …)` em `:407`.

### Aplicação prospectiva

Antes de escrever qualquer join `tasks ↔ risks_v4`, verificar o schema real (`drizzle/schema.ts` — `tasks` tem `action_plan_id`, não `risk_id`). Não inferir a coluna pelo nome esperado.

### Vinculadas

- REGRA-ORQ-35 (NUNCA ASSUMA — verificar schema antes de escrever a query)
- Gate 0 (verificação de schema obrigatória antes de tocar banco)
- Lição #65 (rastrear writers/readers end-to-end) · Lição #93 (mecanismo verificado, não inferido)
- BUG-GUIA-SQL-01 / PR #1409 (caso canônico) · `server/lib/db-queries-risks-v4.ts:302/407` (path correto de referência)

## Lição #121 — Metodologia existia fragmentada; consolidada por ORQ-43

**Origem:** Materialização SOLARIS-SPEC-FIRST (14/06/2026) — plano de governança para formalizar o fluxo spec-first

### Texto

A metodologia spec-first **já existia** no repositório, fragmentada em REGRA-ORQ-24 (classes), ORQ-28 (triade), ORQ-33 (RACI) e ORQ-41 (impact-tree). O plano inicial (v1.0) propôs **recriá-la**, afirmando que classes, RACI, templates e gate de CI "não existiam" — sem verificar o corpus. Cada iteração (v1.0 → v1.1 → v1.2) exigiu grep para corrigir o que a memória afirmou:

- v1.0 → v1.1: SPEC-01 já ocupada (colisão); Classes = ORQ-24; RACI = ORQ-33; skill em `.claude/skills/`, não `docs/governance/skills/`.
- v1.1 → v1.2 (Gate 0): `validate-pr.yml` já bloqueia sem `spec-aprovada` + 5 labels (PR-GOV-3 redundante); `sprint-issue.md` já tem Blocos 1→9 (`spec_feature.yml` redundante).

Resultado: o plano de 3 PRs colapsou para **1,5 PR** (ORQ-43 índice + ORQ-44 DoD negativo + edição da skill + templates residuais condicionais).

### Aplicação prospectiva

Antes de propor **qualquer** regra/template/gate novo, executar grep/`gh`/`ls` no corpus. Afirmar ausência sem verificação é o anti-padrão das Lições #66 (spec sem dados = ilusão) e #83 (issues pré-existentes) — e ocorreu **no próprio plano de governança que pretendia eliminá-lo**.

### Vinculadas

- REGRA-ORQ-43 (consolidação) · REGRA-ORQ-44 · Lição #66 · Lição #83 · Lição #93
- Gate 0 do plano v1.2 (`validate-pr.yml` + `sprint-issue.md` já cobriam 2 dos 5 gaps)

## Lição #122 — Review de PR de governança deve ser registrado no GitHub (Approve)

**Origem:** Auditoria pós-merge SPEC-FIRST v1.2 (14/06/2026) — PRs #1414/#1416/#1418

### Texto

O review de um PR (especialmente de governança) DEVE ser registrado **no GitHub como Approve**, pelo Validador (Manus, REGRA-ORQ-33), antes do merge. Veredicto de "APROVAR" em relatório de chat **não satisfaz ORQ-33** como evidência source-controlled — é declaração, não estado auditável (Lição #87: claim ≠ evidência).

Na auditoria pós-merge, os 3 PRs mostravam `reviews: []` no GitHub (`gh pr view <N> --json reviews`) apesar do report de chat afirmar "review técnico concluído com veredicto APROVAR para os 3". O merge ocorreu sem trilha de review source-controlled.

### Aplicação prospectiva

- Validador registra Approve no PR (`gh pr review <N> --approve`) — não apenas no chat.
- Auditoria de encerramento (ORQ-19) deve checar `reviews` no GitHub, não confiar em veredicto narrado.

### Exceção desta sessão (registrada honestamente)

Os 3 PRs eram **docs-only** (zero código de produção), P.O. presente na sessão, e os fatos foram **verificados deterministicamente** pelo Claude Code (estado, arquivos, ausência de conflito, conteúdo em main via `git cat-file`). O merge sem Approve formal foi tolerado **nesta sessão específica** — não vira precedente para PRs de código.

### Exceção estrutural — PAT compartilhado (D-PAT, 15/06/2026)

**Causa-raiz (auditoria #1275):** Claude Code (autor) e Manus (Validador) usam a **mesma identidade GitHub** (PAT compartilhado) → o GitHub bloqueia self-approve → **review independente é impossível**; PRs do épico #1219/#1275 ficaram com `reviews: []`. A Lição #122 é **inexequível** enquanto autor=validador na mesma conta.

**Critério de review válido enquanto o PAT for compartilhado** (vale também para PR de **código**, não só docs):
(a) comentário de **evidência de smoke E2E** no PR + (b) **aprovação explícita do P.O.** + (c) **merge pelo P.O.** (ou delegado). PR #1438 (#1275) cumpre esse critério.

**Tech-debt P3:** criar conta **`solaris-bot`** + PAT separado para o autor (ou validador) → restaura a possibilidade de Approve independente → Lição #122 volta a ser exequível na forma original.

### Vinculadas

- REGRA-ORQ-33 (RACI — Manus é o Validador) · Lição #87 (smoke estático ≠ consumo / claim ≠ evidência) · REGRA-ORQ-25 (report deve espelhar estado source-controlled)
- Caso canônico: PRs #1414/#1416/#1418 (14/06/2026) · auditoria `docs/governance/audits/v7.74-2026-06-14-sessao-spec-first-v1.2.md`
- Exceção PAT: PR #1438 (#1275, 15/06/2026) · tech-debt `solaris-bot` (P3)

## Lição #123 — Hotfix anti-truncado pode conflitar com feature de granularidade variável

**Origem:** GATE-NCM-NBS #1219 F1 (14/06/2026) — conflito entre aceitar grupo NCM/NBS e o hotfix #859

### Texto

Um hotfix que **rejeita** um formato "incompleto" como erro (ex: #859, 2026-04-28: NCM `"1201"` de 4 díg. = "truncado inválido") pode **conflitar diretamente** com uma feature futura que torna esse mesmo formato **válido** (ex: #1219/ADR-0035: `"1201"` = grupo/posição NCM). Ao aceitar **granularidade variável** de um identificador, é obrigatório:

1. **Grep das suites do hotfix anterior** antes de relaxar a validação (`grep -rn "<exemplo>" --include="*.test.ts"`). No caso, `"1201"` aparecia como exemplo canônico de rejeição em **5 suites** (`hotfix-suite-ncm-truncado`, `hotfix-p0-input-gate`, `m2-integration`, `perfil-router`, `ConfirmacaoPerfil.test`).
2. **Surgir o conflito ao P.O.** (decisão Nível 1 — REGRA-ORQ-22), não flipar testes unilateralmente. A reversão de um hotfix P0 é decisão de produto.
3. **Documentar a reversão no código** (`// Reversão intencional de #859 por ADR-0035/#1219`) e preservar os demais casos do hotfix que continuam válidos (`12.01`, `1201.90`, `12019000` seguem rejeitados — só o 4-díg. puro flipou).
4. **Mitigar o risco residual**: input ambíguo (`"1201"` = grupo OU início truncado de `1201.90.00`) é resolvido pelo resolver com `resolution_level='group'` + confiança reduzida + badge "grupo" visível — o sistema não silencia, sinaliza a interpretação.

### Caso canônico

#1219 F1: aceitar `^\d{4}$` (grupo NCM) reverteu #859. P.O. decidiu (Opção A) reverter, com nota no código + esta lição. Os 7 gates de validação foram relaxados (4 NCM + 3 NBS — o despacho listava 6; Gate 0 achou 7, Lição #74).

### Vinculadas

- REGRA-ORQ-22 (crítica Nível 1 ao P.O.) · REGRA-ORQ-35 (NUNCA ASSUMA) · Lição #74 (fix downstream incompleto / gates não rastreados) · Lição #114 (verificar premissa do despacho contra código)
- ADR-0035 (resolver cascata) · hotfix #859 (PR — anti-truncado revertido parcialmente) · #1219 F1 / PR #1424

## Lição #124 — DoD negativo deve falsificar a condição mais próxima do positivo (mudar 1 variável, não a principal)

**Origem:** Auditoria smoke E2E #1275 (15/06/2026) — o cenário negativo "NCM 8437 → ausente" não testou o gate real.

### Texto

Um DoD **negativo** só prova o gate se **falsificar a condição mais próxima do estado positivo** — ou seja, partir do caso positivo e **mudar exatamente UMA variável: a do gate em teste**, mantendo a variável principal de elegibilidade. Trocar a variável **principal** por algo trivialmente não-elegível NÃO testa o gate — testa só que "lixo não casa".

| | Cenário | O que prova |
|---|---|---|
| ❌ Proxy trivial | `NCM 8437 → ausente` | Só que um NCM não-seedado não casa regra. **NÃO** testa o gate. |
| ✅ Correto | positivo (`NCM 8436 + destinatário produtor rural`) com **1 variável mudada** → `NCM 8436 + destinatário NÃO produtor rural → não confirma` | Testa o **mecanismo do gate** (destinatário). |

### Caso canônico

#1275: o positivo é `NCM 8436 (elegível) + destinatário produtor rural não contribuinte → Art.197`. O smoke usou o negativo trivial `NCM 8437` (muda a variável **principal** = NCM elegível) — não testou o gate. O negativo correto muda **só** a variável do gate (`destinatário`), mantendo o NCM 8436 elegível.

> ⚠️ Correção adicional: o gate legal do Art.197 é **destinatário** (Art.110 LC 214), **não CNAE** do vendedor. Um negativo `CNAE 0111 + NCM 8436 → ausente` também seria enganoso, porque a **matriz não gateia por CNAE** (`engine-gap-analyzer` resolve por NCM apenas) → o caso casaria mesmo assim. A variável-do-gate correta é o destinatário (ver #1439).

### Aplicação prospectiva

Ao escrever DoD negativo: (1) escreva o positivo; (2) identifique a **variável do gate** em teste; (3) mude **só ela** para o valor que deveria bloquear; (4) mantenha as demais (inclusive a variável principal de elegibilidade) iguais ao positivo. Validar que a variável escolhida é de fato a do gate (não um proxy upstream — Lição #65/#93).

### Vinculadas

- REGRA-ORQ-34 Protocolo 3 (DoD negativo) · REGRA-ORQ-44 (DoD negativo por consumer crítico) · Lição #65 (rastrear fluxo / testar a coisa certa) · Lição #93 (mecanismo verificado)
- Caso canônico: smoke #1275 (15/06/2026) · gate destinatário #1439 (Fase 2)

## Lição #125 — Snippet proposto é direcional, não copiável

Origem: GOV-FIXES — snippet (a) do #1276 era **no-op duplo**.

Código sugerido em despacho/devolutiva/análise é **direcional**, não copiável. O implementador verifica **cada símbolo, campo e branch** contra a fonte antes de usar. Código sugerido sem verificação de existência dos campos pode ser **no-op silencioso**.

**Caso canônico (#1276):** o snippet proposto lia `c.cnaeGroups` — mas `RetrievedArticle` não carregava o campo (os 3 fetch maps o descartavam) → no-op. E usava `matchesCnaeBoundary`, cuja fallback `length < 50 → true` (rag-retriever.ts:288/292) classificaria `Art.139` (cnaeGroups "41,42,43,68") como match → no-op. O fix correto exigiu adicionar o campo aos 3 maps + membership **estrito** (`parts.includes(grupo)`).

Vinculadas: REGRA-ORQ-45 · REGRA-ORQ-27 (assemble ≠ consumption) · Lição #59 · Lição #93.

## Lição #126 — Fato normativo: PDF primário, nunca o corpus RAG

Origem: GOV-FIXES — PR #1108 errou um fato jurídico por consultar o corpus, não a lei.

Fato jurídico/normativo deve ser verificado contra o **PDF primário** (`pdftotext`/extração direta), **nunca** contra o corpus RAG (`rag-corpus-*.ts` / `ragDocuments`). O corpus é **derivado** e pode ter lacunas ou normalização; **a lei é a fonte**.

**Caso canônico:** PR #1108 concluiu *"NCM 2301 ausente do Anexo IX"* varrendo `lcs-novas.ts` (corpus) e manteve 2301 conservador por anti-alucinação. O **PDF** da LC 214 lista `23.01` **explícito** no Anexo IX Item 20 (mesma linha de 2304.00/23.06). O erro atrasou a confirmação de 23.01 por 3+ despachos (até v16).

Vinculadas: REGRA-ORQ-29 · REGRA-ORQ-37 (evidência de ingestão) · Lição #61 · Lição #66.

## Lição #127 — Despacho/board não citam issue planejada (extensão Lição #83)

Origem: GOV-FIXES — `#1451` duplicata de `#1276` + board reservando `#N` inexistentes.

Despacho e board **nunca citam `#N` de issue planejada** — apenas números de issues **já criadas e confirmadas** via `gh issue view`. `gh issue list --search` **antes** de criar é obrigatório (extensão da Lição #83).

**Casos:** Claude Code criou `#1451` sem buscar — era duplicata do `#1276` existente (remediado: spec movida para #1276, #1451 fechada). O board citou `#1447` (planejado → consumido pelo seed T2) e `#1276` (já existia) como números reservados.

Vinculadas: Lição #83 · REGRA-ORQ-28.

## Lição #128 — Gates declarados ≠ gates enforçados (auditar branch protection)

Origem: GOV-FIXES — auditoria do branch protection de `main` (16/06/2026).

Regra declarada como "bloqueante" no texto de governança **não é enforçada** a menos que o job esteja em **required status checks** do branch protection. Auditar a lista real antes de assumir que um gate bloqueia.

**Achado (16/06/2026), `gh api .../branches/main/protection`:**
- **Required (5):** `Governance gate` · `Invariant Check (GOV-03b)` · `Migration discipline` · `scope-check` · `autoaudit`.
- **NÃO required** (declarados, mas ausentes): `TypeScript + Vitest`, `Run Unit Tests`, `Validate PR body`, `Issue vinculada`, `Spec completa`, `Pre-Close Checklist`.

**Consequência:** REGRA-ORQ-CI-01 (TS+Vitest bloqueia), ORQ-16 (validate PR body/5 labels) e ORQ-17 (PRE-CLOSE) **não são enforçadas mecanicamente** — são disciplina manual. O épico GATE-NCM-NBS mergeou com `TypeScript + Vitest` vermelho **não por admin-override, mas porque o check não é required** (#1043 permanece tech-debt, mas não bloqueia). 

**Decisão pendente do P.O.:** ou registrar os jobs funcionais como required (após #1043 verde), ou reescrever ORQ-CI-01/16/17 como "disciplina manual, não mecânica" — eliminando a ficção de enforcement.

Vinculadas: REGRA-ORQ-CI-01 · REGRA-ORQ-16 · REGRA-ORQ-17 · #1043 · `docs/governance/SCHEMA-REFERENCE.md`.

**Correção (16/06/2026 — dogfooding PR #1461):** o required check **`Governance gate` executa `validate-pr-body.js`**. Logo, o **body do PR É enforçado mecanicamente** pelo required check — **não** é disciplina manual (corrige a afirmação acima de que "Validate PR body" não bloqueia). O que de fato segue fora dos required são os jobs `Issue vinculada` / `Spec completa` / `Pre-Close` do `validate-pr.yml` (que, até #1461, nem executavam — startup_failure). Resumo: **template de body é obrigatório de fato** (via Governance gate); ORQ-16/17 (issue-link/spec-completeness/pre-close) seguem não-required.

## Lição #129 — Template de PR que reprova o required check é uma armadilha

Origem: GOV-FIXES / dogfooding PR #1461.

Um template de PR que **não passa** no required check `Governance gate` (= `validate-pr-body.js`) é uma **armadilha**: força admin-override artificial em todo PR que o use. Um template só é válido se o `validate-pr-body.js` o **reconhece explicitamente** (seções, bloco JSON e Auto-auditoria Q1-5 esperados).

**Caso canônico:** `class_a_surgical.md` (entregue no PR #1460, FIX-GOV-5) foi **reprovado** pelo Governance gate em dogfooding (#1461) — faltavam as 8 seções + JSON + Q1-5 exigidos pelo validador. **Removido** (este PR). Lição: **não criar template de PR sem antes ensinar o `validate-pr-body.js` a aceitá-lo.** Um fast-track Classe A real exige primeiro uma exceção no validador.

Vinculadas: Lição #128 (correção) · REGRA-ORQ-45 · `.github/scripts/validate-pr-body.js` · PR #1460 (criou) / #1461 (expôs).

## Lição #130 — `enforce_admins: false` → required checks não bloqueiam admins

Origem: GOV-FIXES / dogfooding PR #1461 (branch protection — PR #1392, 12/06/2026).

`enforce_admins: false` no branch protection significa que os required status checks **não bloqueiam administradores** do repositório. **Admin-override não é exceção ao processo — é o caminho normal para admins.** A proteção real dos required checks vale apenas para contribuidores **não-admin**.

**Implicação:** ao reportar "mergeado apesar do check vermelho", distinguir (a) check **não-required** (não bloqueia ninguém) de (b) check **required + admin bypass** (`enforce_admins=false`). Documentar explicitamente em cada admin-override qual dos dois é o caso.

**Relação com #1043:** mudar para `enforce_admins: true` bloquearia admins em TODO PR enquanto TS+Vitest (#1043) estiver vermelho — inclusive PRs sem código TS. Avaliar junto com #1043.

Vinculadas: Lição #128 · REGRA-ORQ-CI-01 · #1043 · #1392 (branch protection).

## Lição #131 — Regenerar questionário ≠ confirmar fix de corpus

**Contexto:** Auditoria G1-T1 (16/06/2026) — Art.140 aparecia no pool Q.NCM para NCM 8436 (CNAE 28). Manus propôs invalidar cache e regenerar como fix. Claude Code verificou `server/rag-corpus-lcs-novas.ts` e constatou que `cnaeGroups` do Art.140 inclui CNAE 28 — portanto regenerar apenas reproduziria o bug, não o corrigiria.

**Regra:** Antes de propor regeneração como correção de bug de corpus, verificar o valor de `cnaeGroups` no arquivo fonte. Se o dado ainda está errado, regenerar é **TESTE** (confirma bug), não **fix**.

**Aplicação:**
```bash
grep -A3 "Art\. 140" server/rag-corpus-lcs-novas.ts
```
antes de qualquer proposta de regeneração pós-diagnóstico de corpus.

**Vinculadas:** Lição #132 · REGRA-ORQ-35 (NUNCA ASSUMA) · REGRA-ORQ-45 (Gate 0 do emissor) · Lição #93 (mecanismo verificado) · `docs/governance/corpus-audit-checklist.md` · CORPUS-FIX-01 #1466 · CORPUS-FIX-02 #1467

## Lição #132 — Afirmar cnaeGroups sem verificar o arquivo fonte é anti-padrão

**Contexto:** Auditoria G1-T1 (16/06/2026) — Manus afirmou que Art.140 tinha `cnaeGroups = "41,42,43,68"` (valor real do **Art.139**, `server/rag-corpus-lcs-novas.ts:2948`). Evidência real (Art.140, ~linha 2974): faixa industrial `10,11,…,33`, que inclui CNAE 28.

**Regra:** Nunca afirmar o valor de `cnaeGroups` de um artigo sem verificar o arquivo fonte. Art.139 e Art.140 têm valores superficialmente similares mas semanticamente distintos — confusão gera diagnósticos incorretos (limpeza de cache, regeneração desnecessária, issues incorretas).

**Aplicação:**
```bash
grep -B1 -A5 "Art\. 14[0-9]" server/rag-corpus-lcs-novas.ts
```
antes de qualquer afirmação sobre `cnaeGroups` de artigos nessa faixa.

**Evidência verificada (16/06/2026):** Art.139 = `"41,42,43,68"` (L2948) · Art.140 = faixa `10–33` incl. 28 (L2974) · Art.176 = `35–39,10–33` incl. 28 (L3783).

**Vinculadas:** Lição #131 · REGRA-ORQ-27 (assemble ≠ consumption) · REGRA-ORQ-45 · Lição #93 · `docs/governance/corpus-audit-checklist.md`

## Lição #133 — cnaeGroups é camada interpretativa, nunca normativa

**Contexto:** Despacho v34 (16/06/2026) — Gate 0 contra a fonte primária `lc214.json` (acervo RAG) ao reescopar CORPUS-FIX-01/02 (#1466/#1467).

**Texto:** A LC 214/2025 cita CNAE em **apenas 1 de seus ~544 artigos** — **Art. 273, § 2º, I** (CNAE **5620-1/01**, regime de bares/restaurantes), verificado na fonte primária `Lcp 214.pdf` (`pdftotext -enc UTF-8`: exatamente 1 ocorrência de "CNAE" na lei inteira, linha 2026). Para **todos os demais artigos** o mapeamento artigo→CNAE **não existe na lei** — o campo `cnaeGroups` do corpus é **camada editorial interpretativa da plataforma**, sem base no texto legal. Qualquer curadoria de `cnaeGroups` exige **gate jurídico humano** — não é determinística a partir do texto legal. Substituir um valor de `cnaeGroups` sem validação jurídica formal é substituir um palpite por outro (ruído auditável, não curadoria).

**Errata (16/06/2026):** a versão original desta lição (e o comentário inicial em #1466/#1467) afirmava que "a LC 214 não contém CNAE em nenhum artigo". **Factualmente incorreto** — há 1 exceção (Art. 273). A causa do erro: grep em `lc214.json` achou 1 ocorrência de "cnae" mas **não inspecionei a ocorrência** — assumi incidental. Verificação contra o **PDF primário** (Lição #126) + cross-validação com extração `pypdf` independente (P.O.) confirmou Art. 273. A conclusão central (cnaeGroups é camada interpretativa para os demais ~543 artigos) **permanece válida** — só o absoluto "nenhum" estava errado. Reforça: **1 hit de grep ≠ 0 mapeamento — inspecionar a ocorrência** ([[Lição #93]] mecanismo verificado, não inferido).

**Aplicação:** Antes de qualquer PR que altere `cnaeGroups`, verificar se há **parecer jurídico formal** no corpo da issue. Se não houver → label `blocked-legal-gate`.

**Caso canônico:** o bug "Art.140/176 no pool Q.NCM para NCM 8436" não era de 2 artigos — **136 chunks** de `rag-corpus-lcs-novas.ts` têm faixa industrial copy-paste (`10..33`), incluindo artigos gerais (Art.5 incidência, Art.10 fato gerador, Art.12 base de cálculo). Worklist de curadoria: `docs/governance/corpus-curation-worklist-industrial-10-33.md`.

**Vinculadas:** Lição #61 (metadado determinístico validado pelo jurídico) · Lição #126 (fonte primária, não corpus) · Lições #131/#132 · REGRA-ORQ-29/32 (no hardcode / sem requisito) · REGRA-ORQ-33 (escalação jurídica) · REGRA-ORQ-45/46 · CORPUS-FIX-01 #1466 · CORPUS-FIX-02 #1467 · `docs/governance/corpus-audit-checklist.md`

## Lição #134 — Reranker não substitui curadoria de dados

**Contexto:** Despacho v36 (16/06/2026) — smoke E2E do RERANKER-NCM-AWARE-01 Opção A (#1468, PR #1478) com DB+OpenAI.

**Texto:** Prompt injection no reranker (`rerankWithLLM`) é **ineficaz** quando o conteúdo do chunk disponível ao LLM é insuficiente para distinguir o contexto setorial — o prompt mostra apenas **~200 chars/chunk** (`rag-retriever.ts:530`). A solução correta para falsos positivos setoriais é **sempre curadoria de `cnaeGroups`** — fix **determinístico via filtro** (#1276), não heurística via LLM. Implementar a Opção B (score boost) sobre dado ruim é substituir um palpite por outro (Lição #133).

**Evidência (smoke 16/06/2026):** Art.140 (comunicação) e Art.176 (refinarias), ambos com `cnaeGroups` incluindo CNAE 28, **não** foram penalizados pelo reranker para NCM 8436 (agro); Art.197 (agro) foi mantido. A instrução foi injetada corretamente — faltou conteúdo, não instrução.

**Aplicação:** ao diagnosticar falso-positivo setorial em retrieval, priorizar **curadoria do metadado** (`cnaeGroups` via gate jurídico) sobre tuning do reranker. Reranker NCM-aware permanece como defense-in-depth (sem regressão), **não** como fix do dado.

**Vinculadas:** Lição #133 (cnaeGroups é camada interpretativa) · Lição #87 (smoke runtime ≠ estático) · Lição #88 (acoplamento de classificação setorial) · ADR-0036 §4 · #1468 · #1276 · #1466/#1467 (curadoria) · REGRA-ORQ-46

## Lição #135 — Fixar o predicado de um fix (ex: "pontilhado") em SQL único antes do protocolo, não inferir por ator/sessão

**Origem:** Fix #1484 (integridade lc227) — 17/06/2026. (Versão revisada após clarificação do P.O. — substitui o framing inicial "file≠DB", que era mecanismo não-confirmado, Lição #93.)

**Texto:** O predicado que dimensiona um fix destrutivo (ex: o que conta como "pontilhado") deve ser **fixado em SQL e único** do diagnóstico até o protocolo executado — não inferido ad-hoc por ator ou sessão. No #1484 conviveram **duas definições de "pontilhado"**: o diagnóstico (Consultor) usou *conteúdo > 70% pontos* e o protocolo usou `REGEXP '[.]{20,}'` (mais amplo) → contagens diferentes para o mesmo conjunto (29 vs 44 dotted entre os num>197). **Ambas válidas; a divergência é de predicado, não de execução** — o DoD do gate (`lc227 num>197 = 0`) foi satisfeito nas duas. Não fixar o predicado faz o `PRE-CHECK` do protocolo (`PARAR-se-divergir`) abortar por mismatch de contagem.

**Corolário (sem empirismo):** a contagem que dimensiona o fix vem da **query no DB real (Manus)**, não do arquivo de corpus `.ts` (proxy de build-time). Se `.ts` e `ragDocuments` divergirem em alguns chunks, o count file-based erra — **possível contribuinte adicional aqui, NÃO confirmado** (exigiria comparar file vs DB chunk-a-chunk; Lição #93 — não afirmar mecanismo não-verificado).

**O que funcionou:** os erros **estruturais** do Gate 0 (string-compare → 128 FP, `LIKE '%.%.%.%'` → 139 FP, aritmética `390→333`) foram pegos **independentes da contagem exata**; e o protocolo tinha `PRE-CHECK · PARAR-se-divergir`.

**Nota:** o executado (Opção X 44/57) **não** foi o script mergeado #1486 (89/72) → #1486 ficou stale (atualizado para refletir o real — ver protocolo `docs/governance/fix-1484-lc227-integrity-protocolo.md`; REGRA-ORQ-37 — executado deveria = revisado).

**Aplicação:** (a) definir o predicado de "pontilhado"/limite **uma vez em SQL**, reusado em diagnóstico e protocolo; (b) dimensionar pela query do Manus; (c) executado = revisado.

**Vinculadas:** Lição #71 (script versionado) · #72/#89 (corpus/scripts) · #93 (mecanismo verificado, não inferido) · REGRA-ORQ-37 (evidência) · feedback "sem empirismo — Manus executa queries" · #1484 / #1486 (caso canônico) · adendo ORQ-19 v7.77.1

## Lição #137 — Consolidação em helper único exige conectar TODOS os gates consumers (frontend E backend) no mesmo PR

**Origem:** Bug NCM 6-díg em produção (18/06/2026) — PR #1502 (consolidação) → #1504 (complemento)

> **Nota de numeração:** registrada como **#137** por decisão do P.O. (sessão 18/06). A #136 é candidata paralela ainda não commitada neste arquivo no momento deste registro (último contíguo aqui = #135).

### Texto

Quando um padrão de validação é consolidado num **helper compartilhado**, o PR DEVE migrar **todos** os pontos de uso (frontend, backend, resolver, testes) **no mesmo PR**. Deixar um gate de fora é **consolidação incompleta**: o helper existe mas não é consumido por aquele gate, e o bug persiste em produção para o subconjunto de inputs que **só aquele gate** rejeita.

### Caso canônico

- **PR #1502** (D2/D3/D4) consolidou os **3 gates frontend** (`PerfilEmpresaIntelligente.tsx:789`, `M1PerfilEntidade.tsx:129`, `ConfirmacaoPerfil.tsx:496`) no helper `shared/ncm-nbs-validation.ts` — mas **deixou o 4º gate** (`server/lib/archetype/validateM1Input.ts:23`) com regex inline divergente (`/^\d{4}$|^\d{4}\.\d{2}\.\d{2}$/`, sem subposição).
- Resultado: frontend + resolver + `normative_product_rules` (#1500) aceitavam `2304.00`/`1006.20` (6-díg), mas o backend `validateM1Input` (chamado em `perfil.ts:223/322`) lançava `NCM_INVALID_FORMAT` → bug em `/perfil-entidade` "após selecionar o CNAE".
- **PR #1504** conectou o 4º gate ao helper (`isValidNcm`/`isValidNbs` de `@shared/ncm-nbs-validation`) → consolidação completa (4/4 gates).

### Checklist obrigatório antes de fechar PR de consolidação

```bash
grep -rn "<padrão-antigo>|<regex-antiga>" server/ client/ shared/ --include="*.ts" --include="*.tsx"
```

Todos os callsites devem ser migrados **no mesmo PR** — OU ter issue aberta com justificativa de deferimento explícita. Estender o rastreio aos **testes** (CHECKLIST-VAL-01): todo assert do comportamento alterado deve ser atualizado no mesmo PR (no #1504: `hotfix-suite-ncm-truncado` e `perfil-router` T21 que assertavam 6-díg→throw).

### Vinculadas

- [[Lição #74]] (fix downstream incompleto / gate não rastreado) — padrão análogo, âncora desta lição
- CHECKLIST-VAL-01 (rastreamento end-to-end de gates de validação)
- REGRA-ORQ-35 (NUNCA ASSUMA — grep de TODOS os callsites antes de fechar)
- REGRA-ORQ-25 (drift de deploy — o bug só se manifestou em prod via checkpoint stale; correção exigiu re-deploy do HEAD limpo + reporte `git=<SHA>/checkpoint=<id>`)
- Casos: PR #1502 (consolidação parcial) · #1504 (complemento) · helper `shared/ncm-nbs-validation.ts`

## Lição #138 — DoD negativo deve EXERCITAR a escrita, não observar ausência

**Origem:** GATE-PO-REGIME-TRIBUTARIO T2 (sessão 19/06/2026, épico ADR-0038) — auditoria do fechamento

### Texto

Um DoD negativo afirmado por **ausência de dados** (`SELECT ... WHERE campo IS NOT NULL → 0 rows`) é **baseline trivial**, NÃO prova do gate, quando nenhum dado foi populado ainda. "0 rows não-null" só diz "ninguém escreveu" — exatamente o estado que existia **antes** da feature. Não prova que a normalização/persistência funciona.

DoD negativo correto **exercita a escrita** e confirma os DOIS estados via SQL:
- (a) criar registro com valor esperado → confirmar persistência (ex.: array JSON);
- (b) criar registro "negativo" → confirmar `NULL`/ausência (o caso que o gate deve produzir);
- (c) limpar (`ativo=0` ou DELETE) preservando auditoria.

### Caso canônico — GATE-PO T2 (épico regime tributário)

A auditoria do Manus declarou "DoD negativo ✅" com `WHERE tax_regimes IS NOT NULL → 0 rows`. Claude Code + Consultor identificaram: as 18 perguntas estavam todas `NULL` porque **ninguém curou regime** — baseline vazio, não prova de `normalizeTaxRegimes`. O T2 discriminante (executado pelo Manus) fechou a lacuna:

- SOL-061 criado com "Lucro Real" → `tax_regimes = ["lucro_real"]` (SQL) ✅
- SOL-060 criado com "Todos" (nenhum selecionado) → `tax_regimes = null` (SQL) ✅
- ambos desativados (`ativo=0`) ✅

Só então o gate ficou provado: a escrita persiste array para regime específico **e** NULL (universal) para "Todos".

### Aplicação prospectiva

Antes de declarar um DoD negativo PASS: perguntar "esta query retornaria o mesmo resultado **antes** da feature existir?". Se sim, é baseline trivial — exigir o teste de escrita (a)+(b). Estende [[Lição #124]] (DoD negativo muda 1 variável do positivo) e [[Lição #85]] (DoD de persistência exige SQL pós-escrita).

### Vinculadas

- [[Lição #124]] (DoD negativo falsifica a condição mais próxima do positivo) · [[Lição #85]] (persistência exige SQL, não estado de UI) · [[Lição #87]] (smoke estático ≠ consumo)
- REGRA-ORQ-44 (DoD negativo por consumer crítico) · REGRA-ORQ-34 Protocolo 3
- Caso canônico: GATE-PO T2 (SOL-060/SOL-061) · épico ADR-0038 F1-F6 · auditoria `docs/governance/audits/AUDITORIA_PROFUNDA_01de1c47.md` + `PARECER_AUDITORIA_01de1c47.md`

## Lição #139 — Teste de filtro/gate só prova com o caso NEGATIVO discriminante

**Origem:** BUG-REGIME-FILTER-01 (19/06/2026) — questões `lucro_presumido` exibidas em projeto `lucro_real`

### Texto

Um teste de **filtro/gate** que valida só o caso **positivo** (valor casa → inclui) **não prova nada** — ele passa **também** quando o gate está **permissivo/quebrado** (default que inclui tudo). O que prova o gate é o caso **negativo discriminante**: variar **a chave do filtro** para um valor **não-casante** e confirmar **exclusão**, em **dado real**.

### Caso canônico

F4 regime (ADR-0038): o projeto 9180001 (lucro_presumido) "passou" no teste positivo **por permissividade** (coluna `projects.taxRegime` NULL → regime `undefined` → `matchesRegimeDimension` retorna `true` → mostra tudo), **mascarando o bug**. Só o caso 9210001 (lucro_real → deveria **excluir** as perguntas LP) o revelou. O positivo passava tanto com o filtro funcionando quanto quebrado; só o negativo distingue.

### Aplicação prospectiva

DoD de filtro/gate exige os 3 casos (REGRA-ORQ-47): positivo (casa → inclui), **negativo discriminante** (chave diferente → exclui), neutro (universal/sem valor → documentado). O negativo varia **a chave do filtro**, não o estado universal/vazio.

### Vinculadas

[[Lição #138]] (DoD exercita a escrita) · [[Lição #124]] (varia 1 variável — aqui a chave do filtro) · [[Lição #93]] (mecanismo verificado) · REGRA-ORQ-44/47 · BUG-REGIME-FILTER-01 (PR fix A1)

## Lição #140 — Campo com dupla persistência: confirmar a fonte canônica antes de ler

**Origem:** BUG-REGIME-FILTER-01 (19/06/2026)

### Texto

Campo com **dual-storage** (coluna SQL + JSON; ex.: `taxRegime` em `projects.taxRegime` **e** `companyProfile.taxRegime`) → **antes de ler**, fazer `grep` dos readers existentes para achar a **fonte canônica**. Não assumir a coluna pelo nome. Preferir **helper único** de resolução.

### Caso canônico

F4 (`routers-fluxo-v3.ts:5057`) lia `(project).taxRegime` (coluna SQL = **NULL**) quando a fonte canônica era `companyProfile.taxRegime` (JSON, **~10 readers**, ex.: `:5269`). O `createProject` grava o regime só no JSON; a coluna fica NULL. Resultado: regime `undefined` → filtro permissivo → vazamento. O risco **havia sido flagado (🟡) no AS-IS do F4** e não virou item de DoD (ver REGRA-ORQ-47b).

### Aplicação prospectiva

`grep -rn "\.<campo>\b" server/ client/src` antes de escolher a fonte. Se houver dual-storage, documentar a canônica + usar helper. Backfill da coluna redundante é hardening, não a correção primária.

### Vinculadas

[[REGRA-ORQ-35]] (NUNCA ASSUMA) · [[Lição #113]] (campo/UI ≠ fonte real) · [[Lição #65]] (writers/readers) · REGRA-ORQ-47 · BUG-REGIME-FILTER-01

## Lição #141 — "Deploy OK / HEADs alinhados" pelo checkpoint ≠ artefato servido (verificar o que roda, não o id)

**Origem:** BUG-REGIME-FILTER-01 (19/06/2026) — o deploy tree do Manus ficou preso **pré-ADR-0038** por toda a epopeia, servindo código velho silenciosamente.

### Texto

"Deploy OK", "4 HEADs alinhados" e "smoke PASS" baseados no **id do checkpoint** (S3/Manus) **NÃO provam** que o **artefato servido em produção == git HEAD**. O checkpoint pode reportar "alinhado" enquanto o tree de deploy resetou para `origin` (= **S3 stale**, R-SYNC-02) em vez do GitHub → produção serve código antigo **sem erro visível**. A verificação tem de ser do **artefato realmente servido**, não do rótulo do checkpoint:

1. **Build hash exposto na UI** (`VITE_BUILD_HASH`) == git HEAD esperado.
2. **Arquivo sentinela existe no tree servido** (ex.: `solaris-context-filter.ts`).
3. **`git cat-file -t <id>`** — se "Not a valid object", é checkpoint, **não** git (REGRA-ORQ-25).
4. Reportar sempre **`git=<sha> / checkpoint=<id>`** — nunca só o checkpoint.

### Caso canônico

19/06/2026: produção (`d4b97025`, **não-git**) não tinha **nenhum** arquivo do ADR-0038 (F1-F6) — `getOnda1Questions` com 1 param, sem `solaris-context-filter.ts`, sem migration 0127. **Nada de F1-F6/A1 jamais foi deployado**, apesar dos relatórios de "deploy OK / HEADs alinhados". Detectado só quando "persiste o erro" forçou o diff `git HEAD (649bdf04) × tree servido`. O gate ADR-0037 ("4 HEADs") comparava o **id do checkpoint**, não o conteúdo servido — por isso a divergência passou ([[Lição #128]]: gate declarado ≠ enforçado).

### Mecanização (PR #1536)

- `scripts/deploy-guard.cjs` (1º passo do `pnpm build`): **árvore stale FALHA o build** (exit 1) em vez de servir código velho.
- `scripts/deploy-from-github.sh`: deploy a partir do **remote GitHub** (detectado por URL `github.com`, não `origin`/S3) — fetch+reset (R-SYNC-02) + guard + build.
- Build hash marker na UI Admin (`build: <sha>`) p/ verificação visual pós-deploy.

### Aplicação prospectiva

- O gate de deploy (ADR-0037) deve comparar o **artefato servido vs git** (build hash / sentinela / endpoint de health com SHA) — **não** o id do checkpoint.
- Nenhum "deploy OK" é aceito sem a verificação do artefato (1–4 acima).

### Vinculadas

REGRA-ORQ-25 (checkpoint Manus ≠ git SHA) · ADR-0037 (gate 4 HEADs — agora deve checar artefato) · [[Lição #128]] (gate declarado ≠ enforçado) · [[Lição #87]] (claim ≠ evidência) · R-SYNC-02 · BUG-REGIME-FILTER-01 · PR #1536 (mecanização)

## Lição #142 — Severidade do bug é medida pelo que o runtime CONSOME, não pela string no código-fonte

**Origem:** Errata IS Art.409 (CONS-IS-ART-01 / ERRATA-IS-ART-01, 23/06/2026).

### Texto

A severidade de um bug deve ser medida pelo que o **runtime consome** (valor no DB / resultado de query), **não** pela **string no código-fonte**. Classificar um bug pela **string de fallback** sem verificar o **valor do banco** é o anti-padrão de REGRA-ORQ-27 / Lições #59/#113. O gate correto é o **teste manual P.O. + query SQL direta** — e foi ele que revelou a verdade.

### Caso canônico

A errata "Art. 2 → Art. 409" no briefing IS foi disparada pela leitura do **fallback** `?? "Art. 2 LC 214/2025"` no código (`routers-fluxo-v3.ts:1804/4380`). Mas a **fonte primária** do artigo é `getArticleByCategory("imposto_seletivo")` = `risk_categories.artigo_base` = **"Art. 409"** (desde 21/05, migration 0099 / LEGAL-3). O fallback "Art. 2" era **dead code** (DB não-nulo) → o advogado já via Art. 409 na matriz (`categoria-artigos.ts:43`) e no briefing (DB). **Impacto user-facing da errata = zero** (higiene). Comprovado por query SQL direta (Manus: `artigo_base='Art. 409 LC 214/2025'`) + teste manual E2E (projeto 9750001 cita Art. 409). A errata foi correta de fazer, mas a **severidade** foi mal-classificada (lida da string, não do runtime).

### Vinculadas

- REGRA-ORQ-27 (assemble ≠ consumption) · [[Lição #59]] · [[Lição #113]] (UI/fonte ≠ DB persiste) · [[Lição #87]] (claim ≠ evidência) · [[Lição #93]] (mecanismo verificado)
- ERRATA-IS-ART-01 / CONS-IS-ART-01 · `risk_categories.artigo_base` / migration 0099 / LEGAL-3 #1388 · teste manual P.O. (gate correto)
## Lição #143 — "Artigo de disposições finais = transitório" é premissa falsa; chunks podem ser Anexos mis-taggeados

**Origem:** RAG-ART544 (#1551, 23/06/2026) — classificação chunk-a-chunk dos 46 fragmentos `Art. 544` do corpus lc214.

### Texto

Assumir que um artigo de "disposições finais" (ex.: Art. 544 LC 214, a cláusula de vigência) contém **apenas** texto transitório é premissa **não-verificada**. Na ingestão do corpus, os **Anexos** da lei (listas taxativas de NCM/serviços) podem ser **absorvidos** no chunk do último artigo com **tag incorreta** — aparecendo como `Art. 544 (parte N)` quando o conteúdo real é Anexo I/V/XVII etc.

**Gate 0 chunk-a-chunk (preview do conteúdo) é obrigatório antes de qualquer DELETE em lote por artigo.** A tag do chunk ≠ o conteúdo do chunk.

### Caso canônico

Despacho v122/v123 propôs "Art. 544 = transitório → deletar os 46 chunks (Opção B)". Gate 0 chunk-a-chunk (preview do DB, Manus) revelou: **23 dos 46 são substantivos** — cesta básica (Anexo I, carnes `0203`, óleos), saúde (dispositivos médicos `9018.x`, vacinas vet `3002.x`), agro (biofertilizantes `2839.x`), cultura/educação (Art. 139, audiovisual), e **veículos `8704` (id=766) = IS, Art. 409 inciso I**. Deletar todos seria **regressão** (perda de listas NCM que o motor precisa). Opção B cancelada (despacho v124/v125).

### Vinculadas

- [[Lição #144]] (DELETE em lote exige classificação prévia) · [[Lição #145]] (mis-tag + retrieval) · [[Lição #93]] (mecanismo verificado, não inferido) · [[Lição #132]] (afirmar metadado sem ver a fonte)
- REGRA-INGEST-01 · REGRA-ORQ-45 (Gate 0 do emissor) · RAG-ART544 #1551

## Lição #144 — DELETE em lote por artigo exige classificação individual prévia

**Origem:** RAG-ART544 (#1551, 23/06/2026).

### Texto

`DELETE WHERE artigo LIKE '%X%'` (ou por qualquer predicado de conteúdo) **sem classificação chunk-a-chunk prévia** é anti-padrão — risco de regressão por deletar substantivo junto com ruído. Escopo correto, em 3 passos:

1. **Gate 0 com preview** — `SELECT id, artigo, LEFT(conteudo, N)` de todos os candidatos.
2. **Classificar** cada chunk: ruído (deletável) vs substantivo (manter/re-tag).
3. **DELETE apenas por `id IN (...)` confirmados** — nunca por `LIKE` de conteúdo (Gate 0 da sessão provou que `conteudo LIKE '%entra em vigor%'` mira o caput id=751, não o alvo id=766).

Estende [[Lição #143]] e REGRA-INGEST-01.

### Caso canônico

RAG-ART544: script v121 `DELETE ... conteudo LIKE '%entra em vigor%'` deletaria o id=751 (caput) e deixaria o id=766 (alvo). Corrigido para DELETE por IDs confirmados (Tier 1 + Tier 2A: 23 IDs explícitos).

### Vinculadas

- [[Lição #143]] · [[Lição #135]] (predicado fixado em SQL antes do protocolo) · REGRA-ORQ-45 · REGRA-INGEST-01 · RAG-ART544 #1551

## Lição #145 — Bug de retrieval semântico não se resolve com DELETE; exige re-tag + cnaeGroups

**Origem:** RAG-ART544 / bug NCM 2402 (id=766), auditoria E2E 9750001 (23/06/2026).

### Texto

Quando o retrieval traz o **chunk errado** por proximidade semântica (ex.: lista de veículos `8704` casando com query de fumígenos `2402`, pela expressão comum "tratamento tributário diferenciado"), a causa é **mis-tag + semântica**, **não** "chunk indevido no corpus". **Deletar perde dados substantivos** (o chunk de veículos é IS, Art. 409 inciso I). O fix correto é:

1. **`UPDATE artigo`** — corrigir a tag do chunk (`Art. 544 parte N` → `Anexo [real] LC 214`), restaurando a citação correta.
2. **Revisar `cnaeGroups`** do chunk (evitar match indevido por CNAE).

Estende [[Lição #132]] (afirmar metadado sem verificar a fonte) e [[Lição #134]] (curadoria de dados, não heurística).

### Caso canônico

id=766 (`Art. 544 parte 16`) lista NCMs de veículos `8704`. O projeto 9750001 (NCM 2402 cigarros) gerou pergunta citando "Art. 544 parte 16" para fumígenos. DELETE perderia os veículos (IS). Fix = re-tag (issue RAG-ART544-RETAG, P2) + revisar cnaeGroups, mantendo o dado.

### Vinculadas

- [[Lição #143]] · [[Lição #144]] · [[Lição #132]] · [[Lição #134]] · ADR-0036 (reranker) · RAG-ART544-RETAG (issue P2) · auditoria E2E 9750001

## Lição #146 — Ler os caminhos de rejeição do código ANTES de assumir que "mover o gatilho" é trivial

**Origem:** Gate 0 Mud.1 (UI-FORM/otimização do fluxo E2E, 23/06/2026) — relocação de `perfil.confirm` para `confirmCnaes`.

### Texto

Antes de propor "mover/relocar um gatilho" (procedure, evento, botão), **ler os caminhos de REJEIÇÃO** do código que se vai mover. Uma procedure que parece "só persistir" pode **lançar erro** em validações intermediárias — e a tela/superfície de onde ela é chamada hoje pode ser exatamente o **lugar onde o usuário resolve** essas rejeições. Mover o gatilho sem mapear as rejeições + sua superfície de resolução = **regressão garantida** para os casos que rejeitam. Verificar o que o código **faz**, não o que se **presume** — preventivamente, antes da spec.

### Caso canônico

A premissa "Mud.1 = mover o código do botão Confirmar Perfil para o confirmCnaes (1 dia, Classe A)" estava certa na essência (maioria nunca mais vê a página) — mas o Gate 0 do corpo de `perfil.confirm` (`server/routers/perfil.ts:309/335/346`) revelou **3 caminhos de rejeição** invisíveis na premissa: 409 já-confirmado (ADR-0031), 400 PERFIL_NOT_CONFIRMABLE (perfil inconsistente), 400 PERFIL_HARD_BLOCKED (ex.: V-05-DENIED grupo econômico). A página `/perfil-entidade` é a **superfície de resolução** desses casos. Excluí-la (absoluto) seria regressão; o TO-BE correto é **condicional** (4 ramos: confirmável→skip, não-confirmável→página, já-confirmado→skip, in-flight→página acessível). Mesmo objetivo do P.O., um ramo a mais. Classe A → B.

### Vinculadas

- [[Lição #93]] (mecanismo verificado, não inferido) · [[Lição #142]] (severidade pelo runtime, não pela string) · [[Lição #74]] (fix downstream incompleto / gates não rastreados) · REGRA-ORQ-35 (NUNCA ASSUMA) · REGRA-ORQ-41 (impact-tree) · REGRA-ORQ-45 (Gate 0 do emissor)
- Mud.1 #1562 · despacho v130/v131 · ADR-MUDANCA-01 (página condicional)

## Lição #147 — Encontrar o código ≠ confirmar que ele roda (rota ativa)

**Origem:** Mud.5 #1561 — Gate 0 localizou o botão no componente legado (24/06/2026).

### Texto

Localizar um componente/handler por grep **não** confirma que ele está no fluxo ativo. Um componente pode existir, compilar e ter o `data-testid` certo, mas estar servido por uma **rota inativa** (`-legacy`, `-v2`, `-old`) que o usuário nunca alcança. Antes de implementar/Gate 0 em frontend: verificar a **rota ativa** em `App.tsx` (`arquivo:linha`) e confirmar que ela serve o componente-alvo. **Encontrar o código ≠ confirmar que roda.**

### Caso canônico

Mud.5 #1561: `btn-pular-questionario-cnae` localizado em `QuestionarioCNAE.tsx` (Gate 0 v128). Mas `App.tsx:134` mapeia `/questionario-cnae → QuestionarioV3` (desde Issue #1010 Wave 2); `QuestionarioCNAE` está em `/questionario-cnae-legacy` (`:135`, **inativa**). A Mud.5 modificou o componente **legado** → dead code no fluxo real. Descoberto só no teste E2E do P.O. (PDF da tela mostrando `QuestionarioV3`, sem o botão).

### Vinculadas

REGRA-ORQ-48 (Gate 0 de UI — operacionaliza esta lição) · [[Lição #59]] (assemble ≠ consumption) · [[Lição #65]] (rastrear fluxo end-to-end) · REGRA-ORQ-45 (Gate 0 do emissor) · Mud.5 #1561 · Issue #1010

## Lição #148 — "5 otimizações pontuais" ≠ "auto-pilot do fluxo"; o escopo escrito ficou aquém da intenção

**Origem:** Sessão E2E auto-pilot (24/06/2026) — Mud.1-5 + MUD-PERFIL-SILENCIOSO.

### Texto

Um conjunto de **otimizações pontuais** ("pular a página X", "rotear por Y", "auto-confirmar Z") **não é** equivalente a um **auto-pilot do fluxo inteiro**. O conceito do P.O. (fluidez ponta-a-ponta) pode estar certo, mas o **escopo escrito** das mudanças individuais fica **aquém** se a peça que costura tudo (o auto-chain — remover as paradas manuais entre etapas) **nunca for especificada**. No teste E2E, a soma das otimizações não entrega a percepção de "auto-pilot" porque os botões "Iniciar" entre questionários **continuam manuais** — ninguém os removeu, pois nenhuma das otimizações os cobria. O gap não é bug: é **escopo vs intenção**.

### Caso canônico

Mud.1 (auto-confirm perfil), Mud.2 (auto-advance), Mud.3 (roteamento NCM/NBS) foram implementadas e validadas — mas o P.O. testou e percebeu que "ainda há paradas". Diagnóstico: o **auto-chain** (SOLARIS → IA Gen → Produto → Serviço sem voltar ao hub) **nunca tinha sido especificado** — virou a **Mud.4**, a peça que faltava. As observações "IA Gen não foi auto-chamado", "Produto não foi auto-chamado" eram **esperadas** (fora do escopo das 1-3), não bugs.

### Aplicação prospectiva

Ao receber um objetivo de **experiência** ("fluxo sem fricção", "auto-pilot", "sem cliques extras"), mapear **explicitamente** todas as paradas/transições do fluxo end-to-end **antes** de fatiar em mudanças pontuais — para garantir que a soma das partes entrega o todo. A peça de "costura" (auto-chain/orquestração) deve ser uma mudança declarada, não emergir só no teste.

### Vinculadas

[[Lição #65]] (rastrear fluxo end-to-end) · [[Lição #66]] (spec sem dados = ilusão) · [[Lição #109]] (spec sem modelo conceitual entrega contrato, não produto) · REGRA-ORQ-41 (impact-tree) · Mud.4 (auto-chain) · auditoria v7.81

## Lição #149 — Teste de roteamento/condicional exige caso que DIFERE entre as opções (senão não discrimina)

**Origem:** GATE-PO-FLUXO Mud.3 — projeto 10020001 (NCM+NBS) não validava o roteamento (24/06/2026).

### Texto

Para validar um **roteamento condicional** (ou qualquer gate com múltiplos caminhos), o caso-teste precisa **diferir entre as opções** — produzir resultado **distinto** no caminho novo vs no antigo. Um caso que cai no ramo onde **ambos os roteamentos convergem** ao mesmo destino **não discrimina** nada (passa por sorte de convergência). Escolher o caso-teste pela **variável do gate**, garantindo que ele separa as opções.

### Caso canônico

Mud.3 (roteamento NCM/NBS): o projeto 10020001 tinha **NCM + NBS** = **Caso 1** → Produto → Serviço → CNAE. Mas o roteamento **antigo** (por `operationType` misto) **também** ia Produto → Serviço → CNAE → mesmo destino. Logo 10020001 **não discriminava** a Mud.3. O teste discriminante correto foi o **Caso 3 (só-NBS, zero NCM)** — antigo iria ao Q.Produto vazio; novo vai direto ao Q.Serviço — e o **Caso 4 (nenhum)** → CNAE direto. Os 4 casos SQL (10110001-10110004) então provaram o roteamento.

### Aplicação prospectiva

DoD de roteamento/gate (REGRA-ORQ-47): incluir o caso **discriminante** (que separa novo×antigo), não só um caso "feliz" que pode convergir. Antes de declarar PASS, perguntar: "este caso daria resultado **diferente** sem a mudança?". Se não → não discrimina.

### Vinculadas

[[Lição #124]] (DoD negativo falsifica a condição mais próxima do positivo) · [[Lição #139]] (filtro só prova com o negativo discriminante) · REGRA-ORQ-47 (DoD de filtro/gate) · REGRA-ORQ-34 Protocolo 4 (3 cenários ortogonais) · Mud.3 #1569

## Lição #150 — Campo no prompt LLM (Onda 2) ≠ campo no archetype; verificar o CAMINHO real de consumo

**Origem:** Análise de consumers dos campos do formulário de projeto (24/06/2026, REGRA-ORQ-27).

### Texto

Ao defender que um campo "é usado", **verificar o CAMINHO real de consumo** — não assumir o caminho intuitivo. Um campo pode **não** alimentar o pipeline que se imagina (ex.: o **archetype**) e ainda assim ser consumido por **outro** caminho (ex.: injeção direta no **prompt do questionário IA Gen / Onda 2**). Afirmar "usamos para o archetype" sem rastrear é mecanismo presumido (anti-padrão REGRA-ORQ-27 / Lição #59). A evidência forte e rastreável é a **citação `arquivo:linha` do prompt LLM final** onde o valor é interpolado (`${campo}`) — isso prova que o valor **chega ao LLM** (ORQ-27 critério b); se o LLM **gera saída diferente** por causa dele é uma camada a mais (spy/A-B, critério a).

### Caso canônico

Hipótese do P.O.: "os campos do form alimentam o **archetype**, usado na IA Gen/briefing". Rastreamento (3 agentes, `arquivo:linha`): o **archetype consome só ~9 campos** (identidade + derivação dimensional); a **maioria** (clientType, paymentMethods, governança, etc.) é injetada **direto no prompt da Onda 2** (`routers-fluxo-v3.ts:5367-5476`), **sem** passar pelo archetype. Defesa correta = "IA Gen Onda 2", não "archetype". Achados de remoção: `hasSpecialRegimes` (DEAD, declarado não-lido) e `taxCentralization` (só testes).

### Aplicação prospectiva

Antes de afirmar (ou negar) que um campo é usado: rastrear os **3 caminhos** (archetype, prompt de questionário, prompt de briefing/RAG) + o inventário downstream, com `arquivo:linha`. Distinguir VALOR injetado (consumo) de label fixa (assemble). Antes de **remover** um campo: AS-IS/TO-BE via skill `impact-tree` + confirmar o **nome exato** form↔código (Lição #140 — dual-name).

### Vinculadas

REGRA-ORQ-27 (assemble ≠ consumption — critérios a/b) · [[Lição #59]] · [[Lição #62]] (contexto vs evidência) · [[Lição #140]] (dual-storage / nome canônico) · REGRA-ORQ-41 (impact-tree) · análise de campos do form (`0-Projeto-1o.Form`)

## Lição #151 — Gate 0 / impact-tree deve cobrir `shared/` explicitamente (não só server/ + client/src)

**Origem:** PR F1 FORM-NOVO-PROJETO-V2 (24/06/2026) — `taxCentralization` quase removido como "dead".

### Texto

O mapa de consumers de um campo/tipo DEVE varrer `shared/` **explicitamente**, além de `server/` e `client/src`. Código compartilhado (helpers de prefill, validação, tipos canônicos) é consumido por backend **e** frontend — o caminho real de consumo pode estar **só** em `shared/` e escapar de um Gate 0 escopado às duas pastas de app. Afirmar "campo DEAD" sem grep em `shared/` é incompleto (REGRA-ORQ-27 / Lição #150).

### Caso canônico

No PR F1, o Gate 0 inicial varreu `server/` + `client/src` e classificou `taxCentralization` como DEAD (só `isPresent()` em confidence). Os **testes de integração** (`fase2-e2e-validation`) revelaram, **antes do commit**, o consumer real: `buildCorporatePrefill` em **`shared/questionario-prefill.ts:191-194`** — lê `companyProfile.taxCentralization` e **prefilla a pergunta `qc02_centralizacao`** (contrato ISSUE-001, evita o usuário responder duas vezes). O grep escopado a server/+client/src nunca tocou `shared/`. Resultado: `taxCentralization` foi **revertido** do PR F1; os 3 campos sem consumer (`hasSpecialRegimes`, `notificationFrequency`, `notificationEmail`) seguiram. Pego pela Lição #74 (fix downstream incompleto) + REGRA-ORQ-22 (parada Nível 1) — antes do commit.

### Aplicação prospectiva

Em todo Gate 0 / `impact-tree` (Passo 1/4/10), incluir:
```bash
grep -rn "\.<campo>\b" server/ client/src shared/   # shared/ OBRIGATÓRIO
```
A skill `impact-tree` Passo 1 já lista `shared/` no ast-grep — esta lição cristaliza que **pular `shared/` é a falha**, não a ferramenta.

### Vinculadas

[[Lição #74]] (fix downstream incompleto / gate não rastreado) · [[Lição #150]] (campo no prompt ≠ caminho real de consumo) · [[Lição #65]] (writers/readers end-to-end) · REGRA-ORQ-27 · REGRA-ORQ-22 (Nível 1) · REGRA-ORQ-41 (impact-tree — `shared/` no Passo 1) · PR F1 #1575 · `shared/questionario-prefill.ts:191-194` (ISSUE-001)

## Lição #152 — Pivot de mecanismo vs spec aprovada exige aprovação ANTES de implementar

**Origem:** CI-HYGIENE-02 (PR #1585, 25/06/2026) — CC pivotou a abordagem e comunicou depois.

### Texto

Quando o P.O. aprova uma **abordagem específica** (mecanismo) e, durante a implementação, descobre-se que ela é inviável/quebradiça, a mudança para um **mecanismo alternativo** deve ser **comunicada e aprovada ANTES de implementar** — não implementada e comunicada depois. Mesmo que o pivot esteja **tecnicamente correto** (mesmo objetivo, fix mais robusto), trocar o mecanismo sem aval prévio é um gap de processo (RACI: o P.O. é Accountable pela decisão de abordagem; o CC é Responsible pela execução — REGRA-ORQ-33).

Distinção (NUNCA ASSUMA / REGRA-ORQ-22):
- **Bug técnico durante a impl** (ex.: regex errada) → decisão autônoma do CC (corrige e segue).
- **Mudança de MECANISMO vs o aprovado** (ex.: "dbDescribe nos testes" → "test:unit no CI") → **PARAR e pedir aval ANTES** (Nível 1).

### Caso canônico

P.O. aprovou "Opção (b) — dbDescribe nos 13 testes de integração". Gate 0 revelou +12 DB-tests; remover `DATABASE_URL` quebrou ~60 testes com dependências indiretas. CC **pivotou** para `test-suite.yml → pnpm test:unit` (mesmo objetivo: CI não roda integração → não polui prod) e **só então comunicou**. O pivot estava correto, mas a ordem certa era: *descobri que (b) é inviável por X; proponho test:unit; aprova?* **antes** de editar.

### Aplicação prospectiva

Ao bater num bloqueio que force trocar o mecanismo aprovado: (1) parar; (2) reportar o achado + o mecanismo alternativo proposto (REGRA-ORQ-22 Nível 1); (3) implementar só após o "ok". Severidade baixa quando o pivot é correto — mas o gap de processo é real e repetível.

### Vinculadas

REGRA-ORQ-22 (crítica Nível 1) · REGRA-ORQ-33 (RACI — A=P.O. decide abordagem) · REGRA-ORQ-35 (NUNCA ASSUMA) · [[Lição #74]] (fix incompleto) · CI-HYGIENE-02 #1585 · #1584

## Lição #153 — Branch = frente: plano aprovado e implementação são branches separadas

**Origem:** F2-refactor (PR #1589, 25/06/2026) — o commit do F2.1 foi para a mesma branch do plano aprovado.

### Texto

Uma branch deve corresponder a **uma frente**. Um **plano** (AS-IS/TO-BE, docs-only, para aprovação P.O.) e a **implementação** que ele descreve são **frentes distintas** → **branches/PRs separados**, mesmo que o plano seja curto e a implementação venha logo após a aprovação. Misturar os dois numa branch: (a) muda uma PR já em review do revisor; (b) acopla o merge do plano ao da implementação; (c) confunde o título/diff (PR "docs" com código).

### Caso canônico

O plano impact-tree do F2-refactor foi entregue como PR docs-only #1589 (aprovado P.O.). Em vez de abrir branch nova para o F2.1, o commit do F2.1 foi para a **mesma branch** (`docs/f2-refactor-impact-tree`) → #1589 virou "plano + F2.1", com título "docs(...)" stale. Remediado tornando a PR coerente (título/body), mas o ideal era branch separada.

### Aplicação prospectiva

Ao terminar um plano aprovado, **`git checkout -b` nova** a partir da branch do plano (ou de main, após o plano mergear) antes do primeiro commit de implementação. Plano e impl podem ser stacked (impl baseia no plano), mas são PRs distintos.

### Vinculadas

REGRA-ORQ-26 (branch obrigatória) · REGRA-ORQ-33 (RACI — review do Validador) · [[Lição #122]] (review source-controlled) · F2-refactor #1589/#1590/#1591


## Lição #154 — Template do repo dessincronizado do validador: risco PT Baixo/Médio/Alto + chaves JSON (28/06/2026)

**Origem:** PR #1609 (docs/painel-po-v10) — gotcha identificado durante a sessão de merge e auditoria do painel PO v10.

### Texto

O `validate-pr-body.js` (validador de CI) e o template do PR body (`.github/PULL_REQUEST_TEMPLATE.md`) podem ficar **dessincronizados** quando o validador é atualizado sem atualizar o template (ou vice-versa). Isso gera falhas silenciosas: o PR body parece correto visualmente, mas o validador rejeita por não encontrar as chaves exatas.

Dois gotchas específicos desta dessincronização:

| # | Gotcha | Sintoma | Solução |
|---|---|---|---|
| 1 | **Nível de risco textual vs. enum** | Validador espera `PT Baixo`, `PT Médio`, `PT Alto` (com acento + maiúscula exata). Template antigo usa `Baixo`, `Médio`, `Alto` sem prefixo `PT`. Resultado: `grep` falha → "Nenhum nível de risco marcado" mesmo com risco preenchido. | Sempre usar `PT Baixo` / `PT Médio` / `PT Alto` no body. Verificar `.github/scripts/validate-pr-body.js` linha `riskLevel` antes de abrir PR. |
| 2 | **Chaves JSON do bloco de evidência** | Validador espera chaves `rag_impact`, `unexpected_behavior`, `tests_passed` no JSON do Bloco 9. Template antigo usa `impacto_rag`, `comportamento_inesperado`, `testes_passaram`. Resultado: parse do JSON falha → gate `autoaudit` rejeita. | Copiar o JSON de evidência de um PR recente aprovado (ex.: #1603, #1607) — não do template em disco. |

### Causa raiz

O template `.github/PULL_REQUEST_TEMPLATE.md` é atualizado com menos frequência que o validador `validate-pr-body.js`. A fonte canônica é o **validador**, não o template.

### Regra derivada

> Antes de abrir qualquer PR, rodar localmente: `PR_BODY="$(cat body.md)" PR_TITLE="..." node .github/scripts/validate-pr-body.js` e esperar `✅ PR body validado com sucesso`. Não confiar no template em disco como fonte de verdade.

### Caso canônico

PR #1609 (docs/painel-po-v10): o body foi escrito com o template em disco (chaves antigas), o validador rejeitou em `autoaudit`. Corrigido com empty commit após atualizar as chaves JSON e o nível de risco para `PT Baixo`.

### Errata + extensão (29/06/2026) — strings EXATAS verificadas na fonte + template corrigido

A redação original acima estava **imprecisa** (escrita de memória, sem verificar as strings — anti-padrão que a própria Lição #93 alerta). Correção determinística, lida em `origin/main`:

**Risco — strings reais (não há prefixo "PT"):**
- Template (ANTES, `.github/pull_request_template.md:42-44`): `- [ ] **low** — hotfix, chore, docs…` / `**medium**` / `**high**` — **inglês, em negrito**. (Não era "Baixo/Médio/Alto sem PT".)
- Validador (`validate-pr-body.js:99-101`) exige EXATAMENTE: `- [x] Baixo — sem impacto em dados ou fluxo principal` · `- [x] Médio — impacto controlado e reversível` · `- [x] Alto — impacto estrutural, requer aprovação explícita`. **Sem "PT", com o sufixo literal.**

**JSON — chaves reais:**
- Template (ANTES, `:86`): `testes_passando` + **faltavam** `rag_impact` e `unexpected_behavior`. (Não eram `impacto_rag`/`comportamento_inesperado`/`testes_passaram`.)
- Validador exige (`:62-70`): `data_integrity, regression, rag_impact, unexpected_behavior, tests_passed, typescript_errors, risk_level`.

**Fix de raiz aplicado (não só registro):** o template `.github/pull_request_template.md` foi **corrigido** para casar o validador (checkboxes PT exatos + JSON com `tests_passed`/`rag_impact`/`unexpected_behavior`). Isso resolve a armadilha da [[Lição #129]] (template que reprova o required check). A partir de agora, copiar o template em disco passa no Governance gate.

**Corolário reforçado:** registrar uma lição **de memória** reproduz o erro que ela denuncia. Toda lição que cita strings/arquivos DEVE ser escrita com as strings lidas na fonte (REGRA-ORQ-45 / Lição #93).

### Vinculadas

[[Lição #91]] (gotchas dos gates de CI — origem desta extensão) · [[Lição #93]] (mecanismo/strings verificados, não inferidos) · [[Lição #129]] (template que reprova o gate = armadilha — resolvida aqui) · REGRA-ORQ-45 (Gate 0 do emissor) · REGRA-ORQ-46 (lição = PR obrigatório) · REGRA-ORQ-15 (PR body template) · `.github/scripts/validate-pr-body.js` · `.github/pull_request_template.md` (corrigido) · PR #1609

## Lição #155 — Dupla-atribuição CC×Manus gera colisão: despacho deve nomear UM implementador

### Contexto
No Despacho 29/06/2026 12h16, a Fase 0 (CR-01) foi atribuída ao CC como implementador, mas o Manus também implementou em paralelo (branch `fix/cr-01-companyprofile-taxregime`). O CC corrigiu o body do PR do Manus usando o PAT compartilhado, gerando confusão de autoria e risco de merge duplicado. Convergência técnica confirmada — mesma solução, mesma linha — mas o processo foi ineficiente.

### Causa-raiz
O despacho usou a notação `CC → Fase 0 (CR-01)` sem marcar o Manus como "standby". Ambos interpretaram como GO simultâneo.

### Regra derivada
> Todo despacho que atribui implementação a um agente (CC ou Manus) DEVE incluir explicitamente o status do outro: `Manus: standby até PR aberto` ou `CC: standby até PR aberto`. Sem essa marcação, ambos podem iniciar em paralelo.

### Corolário
Quando dois agentes produzem a mesma solução em paralelo (convergência técnica), o PR do agente designado no despacho tem precedência. O outro agente fecha sua branch sem merge.

### Vinculadas
Despacho 29/06/2026 12h16 · PR #1625 · REGRA-ORQ-46 (lição = PR obrigatório)

---

## Lição #156 — Teste que chama getDb() é DB-dependente: extrair helper puro (padrão resolveTaxRegime)

### Contexto
O teste DoD CR-01 (`project-profile-extractor.cr01.test.ts`) mockava `drizzle-orm/mysql2` para interceptar chamadas ao banco. Esse padrão funciona em ambiente com `DATABASE_URL` configurado, mas falha em CI sem banco (o mock precisa ser aplicado antes da importação do módulo).

### Causa-raiz
`extractProjectProfile` instancia `getDb()` no momento da chamada, não no momento do import. O mock de `drizzle-orm/mysql2` funciona porque o `vi.mock` é hoistado pelo Vitest — mas qualquer teste que chame `getDb()` diretamente (sem mock) faz uma conexão real ao banco.

### Regra derivada
> Funções que dependem de banco devem expor um helper puro extraível para teste unitário. Padrão: `resolveTaxRegime(row: ProjectRow): string | null` — função pura, sem I/O, testável sem mock. O teste unitário testa o helper puro; o teste de integração testa o `extractProjectProfile` completo.

### Extensão de REGRA-ORQ-CI-01
> Adicionar ao checklist de PR: "O teste usa banco real ou mock? Se mock, o `vi.mock` está hoistado antes do import?"

### Vinculadas
[[Lição #110]] (testes DB-dependentes) · REGRA-ORQ-CI-01 · PR #1625 · `server/lib/project-profile-extractor.cr01.test.ts`

## Lição #157 — Teste que chama `getDb()` é DB-dependente; extrair helper puro (padrão `resolveTaxRegime`)

**Origem:** CR-01 #1607 Fase 0 (PR #1625, 29/06/2026) — teste falhou 5/8 no CI por DATABASE_URL.

### Texto

Um teste unitário que chama uma função cujo caminho passa por `getDb()` (ou qualquer acesso a `process.env.DATABASE_URL`) é **DB-dependente** e **falha no CI** sem banco — mesmo com `vi.mock("drizzle-orm/mysql2")`, porque o guard `if (!_db && process.env.DATABASE_URL)` **não cria `_db`** quando a env está ausente e então lança `"DATABASE_URL não configurado"` antes do mock ajudar. Para tornar a **lógica** testável de forma determinística, **extrair um helper puro** (sem DB) e testá-lo diretamente — padrão `resolveTaxRegime` (`project-profile-extractor.ts`).

### Caso canônico

O teste inicial do CR-01 chamava `extractProjectProfile(projectId)` → `query()` → `getDb()` → throw sem `DATABASE_URL`. 5 de 8 casos falharam no CI e localmente. Fix: extrair `export function resolveTaxRegime(rootTaxRegime, companyProfileRaw)` (lógica de resolução pura) e testar o helper → 7/7 PASS sem banco.

### Aplicação prospectiva

- Lógica de resolução/normalização/decisão dentro de função DB-bound → extrair helper puro exportado + testar o helper.
- Se o teste **precisa** exercitar o caminho com DB, usar `dbDescribe` (skipIf sem `DATABASE_URL`, REGRA-ORQ-CI-01) — mas isso **pula** no CI; o helper puro é preferível para cobertura real.
- Estende [[Lição #110]] (teste com schema/DB real) e REGRA-ORQ-CI-01 (dbDescribe).

### Vinculadas

REGRA-ORQ-CI-01 (dbDescribe / skipIf ambiental) · [[Lição #110]] (schema replicado / DB em teste) · [[Lição #72]] (mysql2 auto-parse) · CR-01 #1625 (`resolveTaxRegime`)

## Lição #158 — Colisão de número de artigo entre Lei e Decreto

**Origem:** ACHADO-1, arco #1607 (29/06/2026) — Dr. José citou "Art. 365"; verificação revelou que era do Decreto, não da LC.

### Texto

Artigos com o **mesmo número** podem existir em **diplomas diferentes** com conteúdos distintos. O **Art. 365 da LC 214** trata de alíquotas de referência 2033; o **Art. 365 do Decreto 12.955** funda-se no **Art. 255 §5º da LC** e trata de crédito condicionado em construção civil. Antes de declarar "citação errada", **verificar qual diploma (lei ou decreto)** o Consultor cita. Formulação precisa: *"Art. 365 do Decreto funda-se no Art. 255 §5º da LC"* — **não** *"Art. 365 = Art. 255 §5º"*.

### Caso canônico

O parecer/cruzamento (#1627) flagou "Art. 365 não casa" comparando com a **LC** (alíquotas). Mas Dr. José citava o **Decreto** (crédito construção). **Dr. José estava certo**; o erro era de comparação cross-diploma. Reconciliado pela fonte primária (`riscos-nao-identificados.pdf`).

### Vinculadas

REGRA-ORQ-35 (NUNCA ASSUMA) · [[Lição #126]] (fonte primária / PDF, não corpus) · [[Lição #133]] (curadoria jurídica) · ACHADO-1 #1647 · arco #1607

## Lição #159 — `buildActionPlans` não filtra por confidence; risco condicional vira plano completo

**Origem:** Q3 da auditoria 10860001, arco #1607 (29/06/2026).

### Texto

`buildActionPlans` (`action-plan-engine-v4.ts`) **não filtra por confidence** — um risco **condicional** (confidence 0.41, "potencial — a confirmar") gera **plano de ação completo** com prazo e responsável, igual a um risco afirmado. **Assemble ≠ consumption na camada de plano:** marcar o risco como condicional (confidence baixo + nota) **não impede** a geração do plano. Para um risco que pode não se aplicar (ex.: permuta numa construtora que nunca permutou), o usuário recebe um plano com prazo/responsável.

### Caso canônico

Auditoria 10860001 Q3: os 4 condicionais (`risco_permuta_imoveis`, `risco_tributacao_parcelas`, `risco_sujeicao_passiva_scp`, `risco_custos_historicos`, confidence 0.41) têm **1 plano aprovado cada**. Correção via qualificação por pergunta SOLARIS (TB-1, #1640).

### Vinculadas

REGRA-ORQ-27 (assemble ≠ consumption) · [[Lição #59]] · TB-1 #1640 · `action-plan-engine-v4.ts` · arco #1607 Fase 3a

## Lição #160 — Riscos de perfil (Path B) gateados upstream por `gaps.length === 0`

**Origem:** auditoria greenfield, arco #1607 (29/06/2026).

### Texto

Os riscos inferidos por **perfil** (Path B — CNAE + regime) são **gap-independentes** no pipeline interno (`generate-risks-pipeline.ts:106-114`), mas são **gateados upstream** por `gaps.length === 0` na procedure (`risks-v4.ts:932` — early-return antes do pipeline). Consequência: um projeto **pré-questionário** (sem gaps) vê **0 riscos setoriais**, mesmo o engine sendo capaz de inferi-los do CNAE+regime. No **fluxo real** (wizard → gaps → riscos) o guard é satisfeito; o efeito só aparece em projeto sem gaps (SQL direto). **Decisão de produto:** se a intenção é "construtora vê riscos setoriais desde o perfil", o guard `:932` deve deixar o Path B passar com `gaps=0`.

### Caso canônico

Greenfield via SQL direto (10800129, sem gaps) → 0 riscos → Manus copiou gaps. Greenfield via **wizard** (10860001, 149 gaps reais) → **8 riscos Fase 3a** ✅. Issue #1643.

### Vinculadas

REGRA-ORQ-27 (assemble ≠ consumption) · [[Lição #65]] (rastrear fluxo end-to-end) · #1643 · `risks-v4.ts:932` · `generate-risks-pipeline.ts:106-114` · arco #1607

## Lição #161 — health-score / score de qualidade ≠ contagem de corpus

**Origem:** D-E8 (painel P.O., #1652, 29/06/2026) — tentativa de tornar um "score" data-driven da contagem de chunks.

### Texto

Métricas de **produto/qualidade** (health-score 94/100; score de corpus 61.6/100 "em evolução") e métricas de **volume de dados** (contagem de chunks: 16.702 total / 5.435 normativos) são **dimensões distintas**. Tornar um "score /100" data-driven de uma **contagem** exige uma **fórmula de composição explícita e aprovada** — sem ela, apontar o score para `db_chunks_normative` é **hardcode disfarçado de automação** (pior que o hardcode honesto, porque parece automático e mente). Um score /100 só vira data-driven com fórmula declarada (cobertura, testes, gold set, etc.); senão permanece métrica manual.

### Caso canônico

Painel P.O.: `id="healthScore"` (94/100) e `id="rag7eScoreNum"` (61.6/100) — ambos scores de qualidade, mantidos manuais. O que É data-driven (E8-CORPUS) é a **contagem do corpus** (`7A — Estado do Corpus`), que renderizava de `RAG_CORPUS_BASELINE` hardcoded/defasado → passou a ler do `rag-manifest.json`.

### Vinculadas

REGRA-ORQ-27 (assemble ≠ consumption) · REGRA-ORQ-32 (no hardcode) · [[Lição #93]] (número verificado) · #1652 (painéis) · D-E8

## Lição #162 — endpoints "irmãos" com pipeline assimétrico: nova categoria pode existir no banco e nunca aparecer no relatório

**Origem:** BUG-ACTION-PLANS-01 (#1657, 29/06/2026) — DoD do PR #1655 (risco_credito_condicionado_obra).

### Texto

`generateRisksFromGaps` e `generateRisksAllSources` são endpoints distintos com **comportamento assimétrico**: o primeiro gera riscos **+ planos + tasks** (147-184+); o segundo só **riscos** (não chamava `buildActionPlans`). Ao adicionar uma categoria nova (migration + regra de engine), o risco passa a existir em `risks_v4` — mas se a **regeneração usa o endpoint que não completa o pipeline até `action_plans`**, a categoria **aparece na matriz e nunca vira plano** no relatório do cliente. Ao mexer numa categoria/risco, verificar **qual endpoint a regeneração usa** e se ele percorre o pipeline **até o output final** (risco → plano → tarefa), não só até o insert do risco.

### Caso canônico

#1655 inseriu `risco_credito_condicionado_obra` (migration 0129 + makeInferredRisk) — 17 riscos em `risks_v4`, **0 planos**. A regeneração (`generateRisksAllSources`) parava no insert dos riscos. Fix: replicar `buildActionPlans` + `insertActionPlanV4WithAudit` (paridade) com guard de idempotência (`riskIdsWithPlans`, padrão de `bulkGenerateActionPlans:1137-1141`).

### Vinculadas

[[Lição #65]] (rastrear fluxo end-to-end até o output) · [[Lição #59]] (assemble ≠ consumption) · [[Lição #88]] (categoria dispara, não só existe) · [[Lição #70]] (procedures "similares" com comportamento divergente) · REGRA-ORQ-34 (pipeline bugfix) · BUG-ACTION-PLANS-01 #1657 · PR #1655 (DoD)

## Lição #163 — título de plano é PERSISTIDO, não renderizado: fix de display não limpa dados gravados

**Origem:** fix labels construção civil (#1659, 30/06/2026) — teste manual P.O.

### Texto

`action_plans.titulo` é **gravado no banco no momento da geração** (`buildActionPlans` → `insertActionPlanV4WithAudit`), não renderizado a cada exibição. Logo, um fix em mapa de **display** (ex.: `CATEGORIA_LABELS`) humaniza **imediatamente** o que é resolvido em render (badges, labels, chips, PDF) **para todos os projetos** — mas **NÃO** altera títulos de plano **já gravados**. Projetos pré-fix ficam com o título congelado (ex.: "Avaliar e mitigar risco de `risco_cib_cadastro`").

**Distinção operacional:**

| Superfície | Resolvida em… | Fix de display (mapa) corrige projetos antigos? |
|---|---|---|
| Badge/label/chip/cabeçalho/PDF da categoria | **render** (lê o mapa) | ✅ sim, imediato |
| `action_plans.titulo` (e similares persistidos) | **geração** (gravado no banco) | ❌ não — só projetos **novos** |

**Para limpar projetos históricos:** **regenerar** via pipeline canônico (`buildActionPlans` recalcula com o mapa corrigido) — **não** `UPDATE SQL` direto (dado fora do pipeline = menos auditável, REGRA-ORQ-37).

### Caso canônico

#1659 humanizou `CATEGORIA_LABELS`. Projeto **novo** 10950002 saiu limpo. Projetos **antigos** 10860001/10890001: badge humanizado, mas `titulo` persistido manteve snake_case → resolvido por **regeneração** (Manus), não SQL.

### Vinculadas

[[Lição #74]] (fix downstream incompleto) · [[Lição #137]] (consolidação exige todos os consumers) · [[Lição #85]] (persistência exige verificação no estado gravado) · [[Lição #113]] (UI mostra ≠ DB persiste) · REGRA-ORQ-37 (evidência/pipeline) · #1659 · D-3

## Lição #164 — PR que institui uma regra deve ser o primeiro a cumpri-la (dogfooding de governança)

**Origem:** GOV-FIX-ENCERRAMENTO-01 / REGRA-ORQ-49 (30/06/2026).

### Texto

Um PR que institui uma **regra/template/gate** deve **demonstrar a própria regra no seu corpo** — ser o primeiro caso de uso. Instituir "todo PR deve trazer auditoria planejado×realizado" sem que o PR instituidor traga essa auditoria é **declarar sem provar** (mesma classe de [[Lição #129]]: template que não passa no próprio gate; [[Lição #122]]: review precisa ser source-controlled, não narrado). O dogfooding **força o autor a viver a regra**, expondo atritos antes de impô-la aos outros.

### Caso canônico

O PR de **REGRA-ORQ-49** preencheu a tabela planejado×realizado e, ao fazê-lo, **expôs que os 3 paths do próprio despacho estavam errados** (GOVERNANCE-SPLIT-01 renomeou os arquivos): `governance.md`→`governance-core.md`, `PULL_REQUEST_TEMPLATE/implementation.md`→`pull_request_template.md`, `docs/governance/governance-lessons.md`→`.claude/rules/governance-lessons.md`. A auditoria planejado×realizado **provou seu próprio valor na estreia** — pegou 3 deltas no Gate 0 (REGRA-ORQ-45).

### Vinculadas

REGRA-ORQ-49 (origem) · REGRA-ORQ-45 (Gate 0 do emissor — os 3 paths errados) · [[Lição #129]] (template dogfooding) · [[Lição #122]] (evidência source-controlled) · GOV-FIX-ENCERRAMENTO-01
