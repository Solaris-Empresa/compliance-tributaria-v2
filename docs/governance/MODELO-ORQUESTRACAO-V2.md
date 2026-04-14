# MODELO DE ORQUESTRACAO — IA SOLARIS v1.1
## Aprovado: 14/04/2026 | Validado: Claude Code + Consultor ChatGPT

---

## PRINCIPIO

Spec → Dictionary → Validator → Issue → Code → Checkpoint → Deploy

Todo erro de implementacao tem origem em informacao ausente no momento
da codificacao. Este modelo garante que a informacao esteja presente
ANTES de qualquer linha ser escrita.

---

## FLUXO OBRIGATORIO (nunca pular fases)

### PASSO 0.0 — SYNC (SEMPRE PRIMEIRO)

```
Manus:
  git fetch origin && git diff --stat origin/main
  Se divergente: git reset --hard origin/main

Criterio de done: repo local = origin/main
Por que: schema reportado de repo desatualizado = bug garantido (R-SYNC-01)
```

### F0 — Discovery

```
Manus:
  SHOW FULL COLUMNS FROM [tabelas afetadas]
  grep procedures no router relevante

GATE 0 — VERIFICACAO DUPLA OBRIGATORIA:
  Passo 1: SHOW FULL COLUMNS FROM [tabela] (banco real)
  Passo 2: Cruzar com migration correspondente:
    grep -n "prazo\|status\|[campo]" drizzle/[migration].sql
  Se banco != migration:
    BLOQUEAR — reportar divergencia ao Orquestrador
    NAO documentar dados do banco desatualizado
    A migration e a fonte de verdade — nao o banco
  Motivo: banco de producao pode ter migration pendente.
  Evidencia: B-Z14-001 — prazo reportado como date (banco)
             mas ENUM('30_dias',...) na migration 0064

Claude Code:
  Executar .claude/agents/ux-spec-validator.md nos componentes afetados
  Reportar: o que existe vs o que a spec exige

Se novo agente: executar onboarding checklist (ver secao abaixo)

Criterio de done:
  Schema real confirmado no DATA_DICTIONARY
  Estado real dos componentes reportado
  Nenhuma suposicao sobre campo ou procedure
```

### F1 — Planejamento = Draft Issues no GitHub

```
ORDEM OBRIGATORIA NO F1:
  1. Verificar que project-automation.yml esta em main
     com job add-issue-to-project ativo
  2. Criar Project (board) no GitHub Projects
     gh api graphql → anotar PROJECT_ID retornado
  3. Se PROJECT_ID mudou: atualizar em project-automation.yml
  4. Criar Milestone com lotes e estimativas
  5. Criar Sprint Log: docs/governance/SPRINT-ZXX-LOG.md
  6. SO ENTAO criar as issues (draft)
     → entram no board automaticamente via workflow

Orquestrador cria DRAFT issues diretamente no GitHub:
  gh issue create --draft --title "..." --body "..."

Se issues foram criadas ANTES do workflow ativo:
  Executar para cada issue:
    ISSUE_ID=$(gh api repos/[repo]/issues/[N] --jq '.node_id')
    gh api graphql -f query="mutation {
      addProjectV2ItemById(input: {
        projectId: \"[PROJECT_ID]\"
        contentId: \"$ISSUE_ID\"
      }) { item { id } }
    }"

P.O. aprova o planejamento no GitHub (nao em chat)

Criterio de done:
  Project (board) criado e com PROJECT_ID anotado
  Milestone criado com lotes definidos
  Sprint Log iniciado
  Todas as issues existem como draft no GitHub E no board
```

### F2 — Producao das issues (8 blocos, em lotes)

```
Cada issue produzida com template obrigatorio (.github/ISSUE_TEMPLATE/sprint-issue.md)
Blocos 1-8 obrigatorios + Bloco 9 se componente existente >200L

Regra de lotes:
  Criterio de corte: "usuario consegue usar a feature sem o lote anterior?"
  Dentro do lote: desenvolvimento PARALELO, merge respeita ordem
  1 issue = 1 executor principal (nunca 2 executores no mesmo PR)
  Se 2 executores necessarios: dividir em sub-issues (#Xa + #Xb)

Criterio de done:
  Cada issue tem 8 blocos preenchidos
  Schema real (bloco 4) veio do Manus — nao de memoria
  Estado atual (bloco 6) gerado via grep (nao estimado)
```

### F3 — Auditoria assimetrica (checklist binario)

```
P0/critica: Manus + Claude Code (ambos obrigatorio)
P1 frontend: Claude Code obrigatorio, Manus opcional
P2 UI pura:  Claude Code obrigatorio, Manus dispensado

Checklist binario por issue (todos devem estar marcados):
  [ ] Bloco 1: contexto e dependencias claros
  [ ] Bloco 2: spec inline suficiente para implementar sem arquivo externo
  [ ] Bloco 3: skeleton mostra O QUE MUDA (nao estrutura completa)
  [ ] Bloco 4: schema veio de SHOW FULL COLUMNS real (nao de memoria)
  [ ] Bloco 5: procedures com status "existe? chamado?" confirmados
  [ ] Bloco 6: estado atual gerado via grep (linhas + procedures reais)
  [ ] Bloco 7: criterios de aceite sao binarios (pass/fail, nao subjetivos)
  [ ] Bloco 8: armadilhas e impacto documentados (se historico relevante)
  [ ] Bloco 9 (se componente existente >200L):
      Zod schema lido do router real?
      Linha de insercao documentada?
      Tipos TypeScript confirmados?
  [ ] Gate 0 verificacao dupla:
      SHOW FULL COLUMNS cruzado com migration?
      banco != migration → BLOQUEAR (migration e fonte de verdade)

Criterio de done:
  Todos os 8 checkboxes marcados pelo auditor
  Auditor declara "APROVADA" na issue
```

### F4 — Aprovacao P.O. (spec congelada)

```
P0: P.O. aprova individualmente
P1/P2: Orquestrador aprova apos auditoria (P.O. so em desacordo)

Spec congelada apos aprovacao:
  PATCH (<=5 linhas): comentario na issue
  AMENDMENT (estrutural): nova issue, Closes original

Sprint Log atualizado com decisoes desta fase

Criterio de done:
  Issues aprovadas tem label "spec-aprovada"
  Sprint Log tem registro das decisoes
```

### F4 (implementacao) — 1 issue = 1 PR = 1 executor

```
PRIMEIRO COMANDO OBRIGATORIO:
  gh issue view [N]
  (implementador le a issue diretamente — nunca depende do prompt)

PR obrigatoriamente contem:
  "Closes #N" no body
  Confirmacao "100% procedures da issue sendo chamadas"

Mini-gate antes de abrir PR:
  tsc --noEmit: 0 erros
  vitest: todos passando

Criterio de done:
  PR aberto com Closes #N
  CI verde (tsc + testes)
```

### F4.5 — Integration Checkpoint (gate humano, CI avisa)

```
Executor executa nos arquivos modificados:
  git diff --name-only HEAD~1 | xargs grep -l "trpc\."

CI emite WARN se procedure da issue nao encontrada no diff
Executor declara no PR body: "F4.5: 100% procedures chamadas"
Procedure ausente → BLOQUEAR merge → reportar ao Orquestrador

Criterio de done:
  Declaracao F4.5 presente no PR body
  WARN do CI verificado (nao ignorado)
```

### F5 — Gate C (CI automatico — bloqueia merge)

```
FAIL (bloqueia merge):
  tsc --noEmit: qualquer erro
  vitest: qualquer falha
  closingIssuesReferences: PR sem issue vinculada
  label "spec-aprovada": ausente na issue

WARN (nao bloqueia, deve ser verificado):
  procedure check: procedure da issue nao encontrada no diff

Criterio de done:
  Todos os FAIL checks verdes
  WARNs verificados e justificados no PR
```

### F6 — Gate final

```
tsc global: 0 erros
Testes integration: todos passando
UAT P.O.: checklist da issue (criterios de aceite bloco 7)

Criterio de done:
  P.O. aprova o PR
  Gate 7 executado
```

### F7 — Deploy + Smoke test (OBRIGATORIO)

```
Manus: deploy em producao

Claude Code — projeto de referencia:
  Regenerar riscos do projeto de teste
  Verificar 4 provas do Gate E:
    PROVA 1: 10 <= riscos <= 40
    PROVA 2: aliquota_zero + credito_presumido presentes
    PROVA 3: titulos sem "[categoria]" e sem "geral"
    PROVA 4: >=50% rag_validated=true

Criterio de done:
  4 provas passando
  Sprint Log atualizado com resultado do deploy
```

---

## REGRA-ORQ-11: Fast-track hotfix P0

```
Para bugs criticos em producao. Pula F1/F2/F3.

Passo 1: Gate 0 minimo (5 min)
  Confirmar root cause no banco/codigo
  Evidencia JSON obrigatoria

Passo 2: PR com formato:
  Titulo: [HOTFIX] descricao do bug
  Body: Closes #N + Root cause + Fix + Evidencia JSON

Passo 3: P.O. aprova diretamente (sem auditoria dupla)

CI normal se aplica (tsc + testes obrigatorios mesmo em hotfix)
Sprint Log: registrar como [HOTFIX] com causa raiz

IMPORTANTE: Hotfix nao substitui issue de governanca.
Apos deploy, criar issue de governanca para prevenir recorrencia.
```

---

## ONBOARDING CHECKLIST — Novo agente

```
1. git fetch origin && git reset --hard origin/main
2. cat CLAUDE.md
3. cat docs/governance/ESTADO-ATUAL.md
4. cat docs/governance/MODELO-ORQUESTRACAO-V2.md
5. gh issue list --milestone "Sprint ZXX" --json number,title,state
6. cat docs/governance/SPRINT-ZXX-LOG.md (se existir)
```

---

## MATRIZ DE RESPONSABILIDADE

| Area | Manus | Claude Code | P.O. |
|---|---|---|---|
| Banco / SQL / Migrations | PRINCIPAL | suporte | — |
| Deploy / Ambiente | PRINCIPAL | — | — |
| Frontend React / TS | — | PRINCIPAL | valida |
| Engine / logica | — | PRINCIPAL | — |
| Testes unitarios | — | PRINCIPAL | — |
| grep / auditoria codigo | — | PRINCIPAL | — |
| Auditoria banco | PRINCIPAL | suporte | — |
| Aprovacao spec P0 / UAT | — | suporte | PRINCIPAL |
| Aprovacao spec P1/P2 | Orquestrador | Orquestrador | so em desacordo |

---

## 11 REGRAS MANDATORIAS

| Regra | Descricao |
|---|---|
| ORQ-01 | Nenhuma implementacao sem issue completa (8 blocos) |
| ORQ-02 | Spec hibrida: resumo inline OBRIGATORIO + link arquivo completo |
| ORQ-03 | Auditoria assimetrica antes de codar (checklist binario) |
| ORQ-04 | Claude Code implementa frontend/logica |
| ORQ-05 | Manus valida banco/ambiente |
| ORQ-06 | UAT so apos batch completo aprovado |
| ORQ-07 | R-SYNC-01 obrigatorio (passo 0.0 — antes de tudo) |
| ORQ-08 | gh issue view [N] obrigatorio como primeiro comando |
| ORQ-09 | Gate UX obrigatorio antes de qualquer frontend |
| ORQ-10 | F4.5 Integration Checkpoint obrigatorio antes do merge |
| ORQ-11 | Fast-track hotfix P0: Gate 0 minimo → PR [HOTFIX] → P.O. direto |

---

## REGRA DE MUDANCA DE SPEC

| Tipo | Definicao | Acao |
|---|---|---|
| **PATCH** | Ajuste <= 5 linhas, nao muda estrutura | Comentario na issue existente |
| **AMENDMENT** | Mudanca estrutural, novo comportamento | Nova issue obrigatoria |
