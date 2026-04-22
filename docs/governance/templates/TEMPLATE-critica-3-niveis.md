# Template — Crítica de spec em 3 níveis

**Uso:** Claude Code ao criticar spec do Orquestrador.
**Fonte operacional:** REGRA-ORQ-22 em `.claude/rules/governance.md`

---

## Formato obrigatório de saída

Saída em Markdown com tabela + seções. Não usar formato livre.

```markdown
# Crítica — [Nome da spec] v[X.Y]

## Resumo executivo

- Total de observações: [N]
- Nível 1 (bloqueante): [N1]
- Nível 2 (design): [N2]
- Nível 3 (backlog): [N3]
- Recomendação: [APROVAR_COM_NIVEL_1 | APROVAR_DIRETO | REESCREVER]

## Tabela de observações

| ID | Nível | Descrição | Justificativa técnica | Destino |
|---|---|---|---|---|
| C1 | 1 | [curta] | [por que é bloqueante] | Amendment v1.x+1 |
| C2 | 2 | [curta] | [por que é design, não tecnico] | Nota F3 |
| C3 | 3 | [curta] | [por que é backlog] | Issue separada |

## Detalhamento dos Nível 1

[Descrição completa de cada Nível 1 com código/evidência]

## Notas sugeridas para F3 (Nível 2)

[Lista de instruções concretas para o implementador]

## Sugestões de issues futuras (Nível 3)

[Lista de títulos sugeridos para issues novas]
```

---

## Critérios de classificação

### Nível 1 — Bloqueante técnico

Marcar como Nível 1 **apenas** se a spec, como escrita, resulta em
código que:

- Não compila (tipo inexistente, API inexistente)
- Contradiz uma regra explícita da própria spec
- Requer comportamento fisicamente impossível
- Referencia arquivo/módulo/tabela que não existe no repo

**Exemplos reais (hotfix IS):**

- ✅ Nível 1: "Cast `as readonly string[]` contradiz critério T4 da
  própria spec que proíbe casts não justificados" (P2 residual, v1.1)
- ✅ Nível 1: "`user_id=0` sintético viola schema NOT NULL com FK
  implícita para `users.id`" (Q2, v1.1)

### Nível 2 — Design improvement

Marcar como Nível 2 se a observação melhora **como** algo é feito, sem
afetar **se** funciona:

- Nomenclatura
- Ordem de commits
- Estrutura de JSDoc
- Preferência de formatação
- Sugestão de teste adicional
- Organização de imports

**Exemplos reais (hotfix IS):**

- ✅ Nível 2: "usar `gap.gap_id` em vez de `eligibility:${suggested}`
  como `entity_id`" (Q1)
- ✅ Nível 2: "prefixo `[LIM-N:]` nos testes de bug intencional" (Q5)
- ✅ Nível 2: "JSDoc não pode ter `*/` interno" (Q8)

### Nível 3 — Observação/backlog

Marcar como Nível 3 se a observação é sobre algo **fora do escopo**
deste PR específico:

- Refactor estrutural futuro
- Tech debt pré-existente
- Sugestão de arquitetura alternativa
- Problema sistêmico que precisa de spec própria

**Exemplos reais (hotfix IS):**

- ✅ Nível 3: "ADR retention policy do audit_log" (Q7)
- ✅ Nível 3: "Workaround UX para LIM-2" (Q9)
- ✅ Nível 3: "Threshold OBS-2 empírico só após deploy" (Q6)

---

## Armadilhas comuns

### Armadilha 1 — Inflar Nível 1

Tentação: marcar tudo que parece importante como Nível 1.
Consequência: força amendment formal desnecessário.

**Teste:** "Se eu não mudar isso, o código ainda funciona
corretamente?" Se SIM → não é Nível 1.

### Armadilha 2 — Esconder bloqueantes em Nível 2

Tentação: marcar bloqueante como Nível 2 para evitar amendment.
Consequência: código quebrado chega à produção.

**Teste:** "Se o implementador seguir o F3 literal sem corrigir isso,
o PR vai passar no tsc + testes?" Se NÃO → é Nível 1.

### Armadilha 3 — Tratar estilo como Nível 3

Tentação: empurrar preferência pessoal para Nível 3 "para discutir
depois".
Consequência: backlog de estilo vira ruído.

**Teste:** "Isso aqui toca o código deste PR?" Se SIM e é estilo →
Nível 2. Nível 3 é só para coisas fora do PR.

---

## Checklist pré-envio ao Orquestrador

Antes de enviar a crítica:

- [ ] Todas as observações estão em uma única tabela com coluna Nível
- [ ] Cada observação tem justificativa técnica (não "parece melhor")
- [ ] Se há 0 Nível 1 → recomendação é APROVAR_DIRETO
- [ ] Se há 1+ Nível 1 → recomendação é APROVAR_COM_NIVEL_1
- [ ] Se há inconsistências estruturais graves → REESCREVER
- [ ] Cada Nível 3 tem título sugerido de issue

---

## Exemplo concreto — formato canônico

```markdown
# Crítica — SPEC-EXEMPLO v1.0

## Resumo executivo

- Total de observações: 6
- Nível 1 (bloqueante): 1
- Nível 2 (design): 3
- Nível 3 (backlog): 2
- Recomendação: APROVAR_COM_NIVEL_1

## Tabela de observações

| ID | Nível | Descrição | Justificativa técnica | Destino |
|---|---|---|---|---|
| C1 | 1 | `EligibilityRule.conditional` tipado como `readonly string[]` mas spec diz `readonly OperationType[]` | Incompatibilidade de tipo — código não compila | Amendment v1.1 |
| C2 | 2 | Usar `UPPER_SNAKE_CASE` para constantes | Convenção do repo | Nota F3 |
| C3 | 2 | Teste RED antes do GREEN em ordem de commits | Torna verificação mais clara | Nota F3 |
| C4 | 2 | JSDoc da função pública com exemplo de uso | Facilita consumo | Nota F3 |
| C5 | 3 | Considerar migrar ELIGIBILITY_TABLE para banco | Fora do escopo deste PR | Issue futura |
| C6 | 3 | Retention policy de audit_log | Tech debt pré-existente | Issue futura |

## Detalhamento dos Nível 1

**C1** — Linha 42 da spec: tipo `readonly string[]` em
`EligibilityRule.conditional`. Linha 58 da spec: "tabela deve usar
apenas tipos do enum OperationType". Contradição direta. Força
amendment para alinhar ou linha 42 ou linha 58.

## Notas sugeridas para F3 (Nível 2)

- Nomear constantes em UPPER_SNAKE_CASE (ex: `CANONIC_OPERATION_TYPES`)
- No PR, commit 2 = RED test, commit 3 = implementação (não inverter)
- Adicionar JSDoc em `isCategoryAllowed` com exemplo

## Sugestões de issues futuras (Nível 3)

- `[BACKLOG] Migrar ELIGIBILITY_TABLE para tabela versionada em banco`
- `[BACKLOG] Definir retention policy para audit_log`
```

---

## Rastreabilidade

- Regra: REGRA-ORQ-22 em `.claude/rules/governance.md`
- Documento narrativo: `docs/governance/SPEC-PROCESS-v2.md#regra-2`
- Versão: 1.0 (2026-04-22)
