# Template — Classificação de classe de impacto

**Uso:** Orquestrador, no ato de criar uma spec.
**Fonte operacional:** REGRA-ORQ-24 em `.claude/rules/governance.md`

---

## Declaração obrigatória no cabeçalho da spec

Toda spec **DEVE** começar com:

```markdown
# SPEC — [Nome]

**Classe de impacto:** [A | B | C]
**Justificativa:** [1-2 frases com critérios objetivos]
```

Exemplos de justificativas aceitáveis:

- "Classe A: corrige 1 função em 1 arquivo, ~20 linhas de código"
- "Classe B: novo router tRPC (~200 linhas), 3 arquivos (router +
  types + testes)"
- "Classe C: refactor transversal da engine de risco, 8+ arquivos,
  migração de schema, dependências cruzadas"

---

## Critérios objetivos de cada classe

### Classe A — Cirúrgico

**Todos os critérios abaixo devem ser satisfeitos:**

- [ ] Até 50 linhas de código novo ou modificado
- [ ] Até 2 arquivos de código afetados (excluindo testes)
- [ ] 1 função ou componente específico como alvo
- [ ] Sem migração de banco de dados
- [ ] Sem mudança de contrato público (API externa, tRPC procedure assinatura)
- [ ] Sem dependências entre módulos

**Governança aplicável:**

- SPEC: 1 página, 1 arquivo
- ADR: opcional
- Template de implementação: F3 direto
- Crítica do Claude Code: 1 round, Regra 1 (Caminho C default)
- Aprovação P.O.: em 1-2 ciclos

**Exemplos típicos:**

- Bug fix pontual (ex: hotfix IS — recalibrado)
- Correção de texto visível (label, placeholder)
- Ajuste de validação
- Adição de campo opcional em formulário existente

### Classe B — Feature média

**Pelo menos 2 dos critérios abaixo devem ser satisfeitos:**

- Até 500 linhas de código novo ou modificado
- Até 5 arquivos de código afetados
- Novo módulo ou extensão substantiva de módulo existente
- Migração de banco simples (adicionar coluna nullable, nova tabela)
- Novo contrato público (novo endpoint, novo tipo exportado)

**Governança aplicável:**

- SPEC: completa, com seções UX/backend/testes
- ADR: opcional (obrigatório se decisão arquitetural)
- Template de implementação: F3 com Gate 0 formal
- Crítica do Claude Code: 1 round
- Aprovação P.O.: em 2-3 ciclos

**Exemplos típicos:**

- Novo router tRPC
- Novo componente com integração a endpoint
- Refactor de função crítica com mudança de assinatura
- Nova skill para Claude Code
- Novo workflow GitHub Actions

### Classe C — Mudança estrutural

**Pelo menos 1 dos critérios abaixo caracteriza Classe C:**

- Mais de 500 linhas de código novo ou modificado
- Mais de 5 arquivos de código afetados
- Refactor transversal (múltiplos módulos)
- Novo subsistema (novo domínio de negócio)
- Migração de banco destrutiva (alter column, drop, rename)
- Mudança de contrato público que quebra compatibilidade
- Introdução de nova dependência externa

**Governança aplicável:**

- SPEC: extensa, com múltiplas seções e subcomponentes
- ADR: obrigatório
- Template de implementação: F3 detalhado + sub-milestones
- Crítica do Claude Code: até 2 rounds
- Consultor externo (ChatGPT): opcional
- Aprovação P.O.: em 3-5 ciclos
- Plano de rollback: obrigatório

**Exemplos típicos:**

- M1 Arquetipo (novo subsistema de contexto de empresa)
- Refactor do risk-categorizer para matriz explícita
- Migração de MySQL para TiDB
- Introdução de nova tecnologia (Redis, etc.)

---

## Validação da classe no Gate 0 do Claude Code

Quando Claude Code recebe o F3 para implementar, **no Gate 0** ele
valida se a classe declarada corresponde ao escopo real:

```bash
# Exemplo de checagem no Gate 0:
# Spec declarou Classe A. Contrato estima:
#   - Arquivos afetados: 3 → limite é 2 → DIVERGE
#   - Linhas estimadas: 120 → limite é 50 → DIVERGE
# Ação: parar e escalar ao Orquestrador. Pedir reclassificação.
```

### O que fazer em caso de divergência

1. Claude Code para no Gate 0 e reporta
2. Orquestrador e P.O. reavaliam:
   - Era realmente Classe A mas a spec cresceu? → reclassificar para B
   - Era Classe A mas o contrato está over-engineered? → enxugar contrato
3. Se reclassificação muda governança (ex: A → B precisa de ADR),
   produzir artefatos faltantes antes de prosseguir
4. Não é aceitável "prosseguir sob classificação errada"

---

## Tabela comparativa rápida

| Dimensão | Classe A | Classe B | Classe C |
|---|---|---|---|
| Linhas de código | ≤ 50 | ≤ 500 | > 500 |
| Arquivos afetados | ≤ 2 | ≤ 5 | > 5 |
| Migração de banco | não | simples | destrutiva |
| Contrato público | não muda | novo | quebra compat |
| Páginas da SPEC | 1 | 3-5 | 10+ |
| ADR necessário | não | opcional | obrigatório |
| Rounds de crítica | 1 | 1 | até 2 |
| Ciclos até aprovação | 1-2 | 2-3 | 3-5 |
| Tempo típico | minutos-horas | horas-dia | dia-semana |

---

## Armadilhas comuns

### Armadilha 1 — Subestimar para ganhar velocidade

Tentação: classificar uma feature B como A para pular ADR.
Consequência: implementação descobre escopo real, trava no Gate 0,
retrabalho da spec.

**Teste:** se alguma linha do "exemplo típico" da classe acima está
próxima do seu caso, use ela. Se está no meio do caminho, **classifique
acima**, não abaixo.

### Armadilha 2 — Superestimar "por segurança"

Tentação: classificar um bug fix como B "só por garantia".
Consequência: overhead de ADR, múltiplos ciclos, atraso sem benefício.

**Teste:** se o código cabe em 1 função, é Classe A. Não tem meio termo.

### Armadilha 3 — Classe flutuante durante ciclo

Tentação: começar como A, descobrir que é B, continuar como A "porque
já começamos".
Consequência: governança insuficiente vira risco técnico.

**Teste:** reclassificar é cheap, retrabalho pós-merge é caro.

---

## Exemplo de declaração em spec

```markdown
# SPEC — Hotfix IS (exemplo retrospectivo)

**Classe de impacto:** A
**Justificativa:** Bug fix cirúrgico em 1 função (`isCategoryAllowed`).
Novo arquivo `server/lib/risk-eligibility.ts` (~100 linhas), modificação
pequena em `server/routers/riskEngine.ts` (~10 linhas). Zero migração,
zero mudança de contrato público.

## Contexto
[...]

## Implementação
[...]
```

---

## Rastreabilidade

- Regra: REGRA-ORQ-24 em `.claude/rules/governance.md`
- Documento narrativo: `docs/governance/SPEC-PROCESS-v2.md#regra-4`
- Versão: 1.0 (2026-04-22)
