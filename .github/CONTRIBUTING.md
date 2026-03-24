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
