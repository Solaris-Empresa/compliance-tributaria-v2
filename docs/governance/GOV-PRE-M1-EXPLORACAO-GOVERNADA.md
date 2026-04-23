# GOV-PRE-M1 — Exploração Governada antes da Implementação

> **Versão:** 1.0 (inicial)
> **Criado em:** 2026-04-23
> **Base empírica:** Epic #830 (RAG com Arquetipo) — primeira aplicação bem-sucedida
> **Família de regras:** GOV-*

## 1. Nome do processo

**GOV-PRE-M1 — Exploração Governada antes da Implementação**

## 2. Quando aplicar

Aplicar em Epics que atendam ao menos um dos critérios:

- Epic crítico (risco alto de falha estrutural)
- Nova arquitetura
- Mudança de modelo de dados
- Risco jurídico/fiscal
- Dependência entre milestones
- Alto risco de retrabalho se implementar cedo

### Quando NÃO aplicar (dispensar GOV-PRE-M1)

- Refactors isolados de componente
- Fixes pontuais
- Features simples sem decisão estrutural
- Hotfixes emergenciais (usam REGRAS-HOTFIX 1-5)
- Alterações de UI/UX puramente cosméticas

**Decisão final é do P.O.** — GOV-PRE-M1 é guia, não lei. Mas o P.O.
que dispensa em Epic que se encaixa nos critérios da seção 2 assume
o risco de retrabalho.

## 3. Objetivo

Validar modelo, blockers, contratos, UX, cenários e critérios GO/NO-GO
**antes de autorizar implementação**.

GOV-PRE-M1 não é fase opcional de polimento — é gate estrutural que
impede implementação prematura de soluções cujo contrato ou modelo
ainda está ambíguo.

## 4. Proibições durante PRÉ-M1

Durante a fase PRÉ-M1 de um Epic:

- ❌ Não implementar (zero código de produção)
- ❌ Não alterar backend
- ❌ Não alterar RAG
- ❌ Não alterar banco (sem migrations)
- ❌ Não alterar fluxo produtivo
- ❌ Não abrir PR de código

Permitido durante PRÉ-M1:

- ✅ Discussão P.O. + implementador
- ✅ Análise de material existente
- ✅ Mockups visuais (HTML, imagens)
- ✅ Testes mentais com cenários reais
- ✅ Consulta a consultor externo
- ✅ Redação de ADRs
- ✅ Commits em branch de documentação (`docs/pre-m1-<tema>`)

## 5. Artefatos mínimos

Todo Epic em PRÉ-M1 produz:

- **Issue de tracking** no GitHub (`[Docs] Pré-M1 — <Epic>`)
- **Branch** `docs/pre-m1-<tema>` (longa, sem merge em main até GO)
- **Estrutura de diretórios** em `docs/epic-<N>-<nome>/`:
  - `README.md` (índice vivo)
  - `specs/BLOCKERS-pre-m1.md` (lista viva de blockers)
  - `specs/PENDING-DECISIONS.md` (decisões abertas)
  - `specs/CONTRATOS-ENTRE-MILESTONES.md` (contratos)
  - `adr/` (decisões finais)
  - `decisions/` (decisões em debate)
  - `schema/` (estrutura de dados proposta)
  - `cenarios/` (cenários de validação)
  - `exploracao/` (hipóteses descartáveis)
  - `mockups/` (se houver componente visual)
- **Tag de checkpoint** (ver seção 9)

## 6. Sequência padrão

```
1. Epic aprovado
2. Milestone crítica identificada
3. Exploração técnica iniciada
4. Blockers documentados
5. Consulta crítica externa (consultor)
6. Ajustes estruturais aplicados
7. Documentação versionada
8. Critério GO/NO-GO definido
9. Aprovação formal do P.O.
10. Só então implementação começa
```

## 7. Gate GO/NO-GO

Cada Epic define seu próprio gate, com no mínimo 3 condições binárias:

```
REGRA-<EPIC>-GO-NO-GO:
- C1: <critério de corretude técnica>
- C2: <critério de cobertura de cenários>
- C3: <critério de amarração com testes>

PASS em todas as 3 → GO (implementação liberada)
FAIL em qualquer → NO-GO (continua exploração)
```

**Exemplo real — REGRA-M1-GO-NO-GO do Epic #830:**

- **C1** Modelo determinístico (regras explícitas, zero LLM, campo obrigatório com UI)
- **C2** 15/15 cenários de negócio com `arquetipo = valido`
- **C3** Amarração formulário↔testes (suite = fonte de verdade)

## 8. Regras obrigatórias

Regras mínimas durante PRÉ-M1:

1. **Decisão que muda modelo exige ADR** antes do próximo commit na spec
2. **Hipótese fica em `exploracao/`** (descartável, sem compromisso)
3. **Decisão em debate fica em `decisions/`** (debate estruturado, não descartável)
4. **Decisão final fica em `adr/`** (consolidada, imutável)
5. **Contratos entre milestones devem ser definidos antes da implementação**
6. **Blockers conhecidos não podem ficar fora do primeiro commit útil**
   (se já identificado, documenta imediatamente — estrutura vazia é antipadrão)

## 9. Checkpoints (tags Git)

Pontos formais de checkpoint na branch `docs/pre-m1-<tema>`:

- `pre-m1-estrutura-inicial` — estrutura criada com blockers populados
- `pre-m1-blockers-consolidados` — todos os blockers viraram ADR ou decisão
- `pre-m1-modelo-definido` — modelo canônico formalizado em ADR
- `pre-m1-cenarios-completos` — bateria de cenários completa
- `pre-m1-final` — GO declarado, pronto para merge em main

Cada tag deve corresponder a estado consolidado da exploração. Tag
permite rollback lógico e comunicação clara de progresso.

## 10. Exemplo real — Epic #830 (RAG com Arquetipo)

Primeira aplicação de GOV-PRE-M1. Referência para futuros Epics.

- **Epic:** #830
- **Issue de tracking:** #843
- **Branch:** `docs/pre-m1-exploracao`
- **Tags:** `pre-m1-estrutura-inicial` (criada em 2026-04-23)
- **Modelo emergente:** dimensional (objeto / papel_na_cadeia / tipo_de_relação / território / regime)
- **Blockers populados:** 8 identificados no primeiro commit útil
- **Contrato M1→M2:** esqueleto documentado em
  `specs/CONTRATOS-ENTRE-MILESTONES.md`
- **Gate formal:** REGRA-M1-GO-NO-GO (C1+C2+C3)
- **Decisões consolidadas:** imutabilidade do arquétipo, não-migração
  automática

## 11. Critério de encerramento da PRÉ-M1

PRÉ-M1 termina quando **todos** os itens abaixo forem verdadeiros:

- Blockers críticos resolvidos ou aceitos formalmente
- Contratos mínimos definidos (M1→M2 no mínimo)
- Cenários mínimos aprovados
- P.O. declara GO
- F1 da SPEC formal pode iniciar

Ao encerrar:
1. Tag `pre-m1-final` criada no HEAD da branch de documentação
2. Branch mergeada em main (via PR aprovado pelo P.O.)
3. Body do Epic atualizado: "PRÉ-M1 fechada. GO declarado em <data>"
4. Issue de tracking fechada
5. Orquestrador pode gerar F3 de implementação da M1

## 12. Antipadrões

Armadilhas observadas que devem ser evitadas:

- ❌ **Começar implementação "para testar"** — qualquer código viola o gate
- ❌ **Deixar decisão só no chat** — decisão não documentada é decisão perdida
- ❌ **Criar estrutura vazia sem conteúdo crítico já conhecido** — blockers conhecidos populam o primeiro commit, não depois
- ❌ **Misturar exploração com ADR final** — hipótese vai em `exploracao/`, não em `adr/`
- ❌ **Deixar contrato entre milestones implícito** — contrato M1→M2 é documento formal
- ❌ **Usar branch longa sem checkpoints** — sem tags, branch longa vira caos
- ❌ **Formalizar em massa no final** — document-as-you-go, não document-at-the-end
- ❌ **Ignorar consulta externa em decisão estrutural** — revisão barata evita retrabalho caro

## 13. Relacionamento com outras regras

- **REGRAS-HOTFIX 1-5:** hotfix é emergencial (SLA 3h, 3 etapas).
  GOV-PRE-M1 é para planejamento estrutural de Epics. Processos
  distintos e não se sobrepõem.
- **Framework ADR:** GOV-PRE-M1 usa ADRs como output de decisões
  finais. Nada muda no framework ADR.
- **REGRA-\<EPIC\>-GO-NO-GO:** cada Epic define o seu. GOV-PRE-M1
  fornece o template genérico (C1+C2+C3).

## 14. Limitações desta versão

**v1.0 é baseada em uma única aplicação** (Epic #830). Limitações
conhecidas:

- Não automatizado (sem workflows CI validando estrutura)
- Sem template de repositório (estrutura criada manualmente)
- Sem métricas de efetividade (tempo médio de PRÉ-M1, taxa de retrabalho)
- Dispensa do processo é julgamento P.O., sem critério formal auditável

**Evolução esperada:**

- Após 2-3 Epics aplicando → revisar v1.0 e decidir automação
- Após ~5 aplicações → v2.0 com lições aprendidas
- Template de repositório quando custo manual virar fricção

Esta regra evolui por uso, não por especulação.
