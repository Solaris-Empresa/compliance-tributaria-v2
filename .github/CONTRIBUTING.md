# Guia de Contribuição — Sprint 98% Confidence

## Visão geral

Este repositório segue a metodologia da **Sprint Crítica 98% Confidence** para a Plataforma IA SOLARIS Compliance Tributário. Toda contribuição deve respeitar os padrões de rastreabilidade, qualidade de conteúdo e governança definidos neste guia.

---

## Padrão de commits

Todos os commits devem seguir o formato `tipo(escopo): descrição`:

| Tipo | Escopo | Exemplo |
|------|--------|---------|
| `feat` | engine, router, ui | `feat(question-engine): implementar contrato canônico da pergunta` |
| `fix` | engine, router, ui | `fix(gap-engine): corrigir derivação de evidência insuficiente` |
| `docs` | adr, produto, api | `docs(adr): adicionar ADR-010 arquitetura canônica de conteúdo` |
| `test` | engine, e2e | `test(risk-engine): adicionar testes de scoring híbrido` |
| `refactor` | engine, db | `refactor(coverage-engine): extrair lógica de gate para helper` |
| `chore` | ci, governance | `chore(governance): adicionar PR template e labels da sprint 98%` |
| `db` | schema, migration | `db(schema): adicionar tabela requirement_coverage` |

**Regras:**
- Commits em português ou inglês (consistente no PR)
- Mensagem no imperativo: "implementar", "corrigir", "adicionar" (não "implementado")
- Máximo 72 caracteres na primeira linha
- Corpo do commit pode detalhar o "por quê" da mudança

---

## Fluxo de PR

### Antes de abrir o PR

1. Certifique-se de que há uma issue aberta para a mudança
2. Execute `pnpm test` — todos os testes devem passar
3. Execute `tsc --noEmit` — zero erros TypeScript
4. Se a issue tem label `shadow-required`: execute o Shadow Mode e colete evidência
5. Se a issue tem label `checkpoint-required`: crie um checkpoint no Manus

### Ao abrir o PR

1. Use o título no formato: `feat(question-engine): implementar contrato canônico`
2. Preencha o PR template completamente
3. Referencie a issue com `Closes #N`
4. Atribua o milestone `Sprint-98-Confidence-Content-Engine`
5. Adicione as labels de domínio relevantes

### Critérios de merge

| Critério | Obrigatório |
|----------|-------------|
| `pnpm test` passando | ✅ Sempre |
| `tsc --noEmit` sem erros | ✅ Sempre |
| Issue referenciada | ✅ Sempre |
| Milestone atribuída | ✅ Sempre |
| Shadow Mode (se `shadow-required`) | ✅ Quando aplicável |
| Checkpoint (se `checkpoint-required`) | ✅ Quando aplicável |
| Aprovação do Orquestrador (se `needs-orchestrator`) | ✅ Quando aplicável |

---

## Regras de conteúdo (engines)

Toda implementação de engine deve respeitar as **5 regras fundamentais da Sprint 98%**:

**Regra 1 — Fonte obrigatória:** toda pergunta gerada deve ter `source_type`, `source_reference`, `requirement_id` e `confidence`. Perguntas sem fonte são bloqueadas pelo protocolo NO_QUESTION.

**Regra 2 — Coverage total:** nenhum requisito aplicável pode ficar sem pergunta, resposta e avaliação de gap. Coverage < 100% bloqueia a geração do briefing.

**Regra 3 — Cadeia obrigatória:** a cadeia `Requisito → Gap → Risco → Ação` é inviolável. Risco sem `gap_id` não existe. Ação sem `risk_id` não existe.

**Regra 4 — Anti-alucinação:** o LLM não cria conhecimento novo. Ele apenas transforma conhecimento validado via RAG. Toda afirmação deve ter base normativa verificável.

**Regra 5 — CNAE condicionado:** CNAE sem requisito aplicável no corpus RAG não gera questionário. O sistema registra o CNAE como `skipped` com motivo `no_applicable_requirements`.

---

## Rotina operacional do Manus

Para cada bloco de implementação (B0, B1, B2...):

1. **Antes de começar:** verificar se o gate anterior foi aprovado pelo Orquestrador
2. **Durante:** um commit por mudança significativa (não acumular)
3. **Push:** ao concluir cada bloco, não ao final de tudo
4. **Checkpoint:** ao concluir cada engine implementada
5. **Evidência:** output de `pnpm test` + screenshot do Shadow Monitor

---

## Estrutura de arquivos

```
server/
  engines/
    requirement-engine.ts    ← Requirement Engine
    question-engine.ts       ← Question Engine
    gap-engine.ts            ← Gap Engine
    coverage-engine.ts       ← Coverage Engine
    consistency-engine.ts    ← Consistency Engine
    risk-engine.ts           ← Risk Engine
    action-engine.ts         ← Action Engine
  prompts/
    briefing-template.ts     ← Template fixo do briefing
    risk-matrix-template.ts  ← Template da matriz de riscos
    action-plan-template.ts  ← Template do plano de ação
  routers/
    requirementEngine.ts     ← Procedures do Requirement Engine
    questionEngine.ts        ← Procedures do Question Engine
    gapEngine.ts             ← Procedures do Gap Engine
    riskEngine.ts            ← Procedures do Risk Engine
    actionEngine.ts          ← Procedures do Action Engine
    briefing.ts              ← Procedures do Briefing
docs/
  adr/
    ADR-010-content-architecture-98.md
  product/cpie-v2/produto/
    MATRIZ-CANONICA-INPUTS-OUTPUTS.md
    MATRIZ-RASTREABILIDADE-REQ-PERGUNTA-GAP-RISCO-ACAO.md
```

---

## Referências

- [ADR-010 — Arquitetura canônica de conteúdo diagnóstico](../docs/adr/ADR-010-content-architecture-98.md) *(a criar)*
- [Matriz canônica de inputs/outputs](../docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md) *(a criar)*
- [Tabela de melhorias técnicas (How)](../docs/product/cpie-v2/produto/TABELA-MELHORIAS-TECNICAS-HOW-v1.md)
- [Requisitos Funcionais v6.0](../docs/product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md)
- [Playbook da Plataforma v3.0](../docs/product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md)
- [Milestone Sprint-98-Confidence-Content-Engine](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)

---

## Regra de sincronização do Cockpit P.O.

Toda sprint que atualizar o `BASELINE-PRODUTO.md` deve também executar:

```bash
pnpm cockpit:sync
```

Isso sincroniza automaticamente no Cockpit P.O. (`docs/painel-po/index.html`):
- Versão do produto nos cards de status
- Contagem de testes no radar
- Data de atualização no cabeçalho
- Data e versão do BASELINE na biblioteca (via âncora `data-key="doc-baseline"`)

Itens que requerem atualização manual (incluir no mesmo PR):
- `INITIAL_KANBAN` — estado das tarefas
- `INITIAL_DECISIONS` — log de decisões
- Card "Próxima ação obrigatória"
- Sub-texto dos cards de status (ex: `517 testes`)
- Documentos novos na biblioteca

---

## Gates de Qualidade — Auto-auditoria por PR

Todo PR deve incluir a declaração Q1–Q6 no body. Use N/A quando o gate não se aplica.

### Q1 — Tipos nulos
Verificar se inputs recebem `null` ou `undefined` sem guard. Aplicável em PRs que adicionam ou alteram procedures tRPC, funções de banco ou transformações de dados.

### Q2 — SQL DISTINCT / ORDER BY em TiDB
Verificar se queries com `DISTINCT` ou `ORDER BY` estão fora de subqueries sem `LIMIT`. TiDB tem restrições específicas que diferem do MySQL padrão.

### Q3 — Filtros NULL / string vazia
Verificar se filtros WHERE cobrem tanto `IS NULL` quanto `= ''` quando relevante. Gaps SOLARIS com `gap_classification` vazia são o caso canônico.

### Q4 — Endpoint registrado
Verificar se procedures novas estão registradas no router correto e acessíveis via tRPC.

### Q5 — Testes mínimos
Verificar se há pelo menos 1 teste cobrindo o caminho feliz e 1 cobrindo o caminho de erro para cada procedure nova ou modificada.

### Q6 — Validação de Dados Reais (Gate de Cobertura)

**Quando se aplica:** obrigatório em PRs que alteram qualquer um destes arquivos:
- `server/config/solaris-gaps-map.ts`
- `server/lib/solaris-gap-analyzer.ts`
- `server/config/` (qualquer arquivo de mapeamento ou config de dados)
- `drizzle/seeds/` (qualquer seed)
- Qualquer arquivo que contenha dicionários/mapas de tópicos, categorias ou enums

**Quando NÃO se aplica (N/A):**
- PRs que tocam apenas routers, componentes React, testes, docs
- PRs tipo `chore`, `fix` sem alteração de mapeamento
- PRs de infra (CI, workflows)

**O que deve ser executado (query real — grep NÃO é evidência):**

```sql
-- Exemplo para SOLARIS_GAPS_MAP:
-- Q6-A: quantos valores distintos existem no banco?
SELECT COUNT(DISTINCT valor_campo) as total_banco
FROM tabela_relevante
WHERE condicao;

-- Q6-B: quantas chaves o mapa/config cobre?
-- (via grep ou inspeção do arquivo)

-- Q6-C: cobertura = Q6-B / Q6-A
-- Deve ser >= 80% ou justificado
```

**Formato obrigatório no body do PR:**

```
Q6 — Cobertura de dados reais:
  Arquivo alterado: [nome do arquivo de config/mapeamento]
  Total no banco (query SQL): [N valores distintos]
  Total no mapa/config: [N chaves]
  Cobertura: [N%]
  Query executada: [SQL exato]
  Resultado: [ OK (≥80%) | JUSTIFICADO | BLOQUEADO ]
  Justificativa (se < 80%): [motivo]
```

**Gate de bloqueio:**
- `grep` como evidência → **BLOQUEADO** (grep verifica código, não banco)
- Cobertura < 80% sem justificativa → **BLOQUEADO**
- Campo "Query executada" vazio → **BLOQUEADO**

---

## Dados permanentes — proteção obrigatória

As tabelas abaixo contêm dados reais de produção e NUNCA devem ser
limpas, mesmo em ambiente de teste ou durante limpeza de base:

| Tabela | Conteúdo | Risco se apagado |
|---|---|---|
| `rag_documents` / `rag_chunks` | 2.078 chunks · 5 leis reais | Corpus RAG irrecuperável sem reprocessamento |
| `cnaes` | Tabela oficial de CNAEs | Filtros setoriais quebram em todo o sistema |
| `solaris_questions` | Perguntas jurídicas curadas | Onda 1 para de funcionar |

**Gate de bloqueio:** qualquer PR que contenha `DROP TABLE`, `TRUNCATE` ou
`DELETE FROM` sem cláusula `WHERE` nessas tabelas → **BLOQUEADO** pelo
Orquestrador independente do contexto.

---

### Gate 7 — Auto-auditoria de sprint (obrigatório antes da validação do P.O.)

**Quando se aplica:** obrigatório ao final de toda sprint, antes que o P.O.
execute testes manuais ou validação em produção.

**Quem dispara:** o Orquestrador Claude — não o P.O. e não o Manus.

**O que o Manus executa (6 blocos em uma única resposta):**

#### Bloco 1 — Integridade dos PRs
```bash
git log main --oneline -5
git show --stat [HEAD_COMMIT]
gh pr list --state open
```

#### Bloco 2 — Q1–Q5 do último PR
Reexecutar os greps de Q1–Q5 no código mergeado — não confiar apenas
no body do PR.

#### Bloco 3 — CI/CD
```bash
gh run list --limit 3
gh pr checks [ULTIMO_PR]
```

#### Bloco 4 — Integridade do código pós-merge
Verificar que os arquivos alterados no PR estão de acordo com o que
foi descrito no body. Grep nos pontos críticos.

#### Bloco 5 — Side findings e dados reais (Q6)
Para PRs que tocaram config/ ou mapeamento:
```sql
-- Executar query real de cobertura — não usar grep
SELECT COUNT(DISTINCT campo) FROM tabela_relevante;
```

#### Bloco 6 — Bloqueios permanentes intactos
```bash
grep -rn "DIAGNOSTIC_READ_MODE" server/ | head -5
grep -rn "DROP COLUMN" drizzle/ | head -5
# Confirmar rag_chunks, cnaes, solaris_questions intocados
```

**Formato de resposta obrigatório (Passo 7):**
```
### OUTPUTS BRUTOS
[outputs exatos de cada bloco]

### RESULTADO GERAL
[ APROVADO | APROVADO COM RESSALVAS | REPROVADO ]

Ressalvas:
- [item]: [evidência]

Ações necessárias antes da validação do P.O.:
- [ação] ou NENHUMA
```

**Gate de bloqueio:**

| Condição | Ação |
|---|---|
| Bloco 5 executado com grep em vez de SQL | REPROVADO — repetir com query real |
| PRs abertos sem baseline atualizado | REPROVADO |
| Resultado REPROVADO | Orquestrador NÃO libera validação ao P.O. |
| Resultado APROVADO COM RESSALVAS | Orquestrador lista ações antes de liberar |
| P.O. solicitou auditoria antes do Orquestrador | Registrar como falha de processo |
