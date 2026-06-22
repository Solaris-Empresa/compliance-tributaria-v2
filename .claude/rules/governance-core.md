---
description: Governance CORE — REGRA-ORQ-00..47, gates (0/UX/F7), F1-F7 flow, R-SYNC, classes A/B/C, RACI, prompt conventions
globs:
  - "docs/governance/**"
---

# Governance Rules — Core (REGRA-ORQ + Gates + Flow)

> Parte 1 de 4 do corpus de governança (split GOVERNANCE-SPLIT-01).
> Lições → `governance-lessons.md` · SPEC-FIRST/checklists → `governance-spec-first.md` · ADRs → `governance-adr-ref.md`.

## REGRA-ORQ-00 — Leitura obrigatoria pre-sprint

Antes de qualquer issue de riscos ou planos:
1. `cat docs/governance/RN_GERACAO_RISCOS_V4.md`
2. `cat docs/governance/RN_PLANOS_TAREFAS_V4.md`

Verificar especificamente:
- SEVERITY/URGENCIA/TYPE — tabelas deterministicas
- Catalogo PLANS — titulos canonicos por ruleId
- Invariantes RN-RISK-05 e RN-AP-09: opportunity → NUNCA gera plano
- RN-AP-02: status inicial = 'rascunho'
- prazo: 30_dias | 60_dias | 90_dias | 180_dias (nao date)

Se estes arquivos nao existirem no repo: **BLOQUEAR** — criar antes de qualquer issue.

## BLOQUEIO OBRIGATORIO — Antes de qualquer implementacao

Claude Code DEVE executar antes de escrever qualquer codigo:

1. **Ler a issue:**
   `gh issue view [N] --json body,labels --jq '{labels: [.labels[].name]}'`

2. **Verificar 5 labels:** `spec-bloco9`, `spec-adr`, `spec-contrato`, `spec-e2e`, `spec-aprovada`
   Se qualquer label ausente: **PARAR. NAO criar branch. Reportar ao Orquestrador.**

3. **Verificar conteudo:** "Bloco 9", "ADR" ou "N/A", "Contrato", "Fluxo E2E"
   Se qualquer secao ausente: **PARAR. Reportar secoes faltantes.**

4. **Confirmar:** "Issue #N verificada — 5 labels + 4 secoes — iniciando implementacao"

**SEM EXCECAO** — nem para fixes de 1 linha. A responsabilidade e do Claude Code.

## Gate 0 — Verificacao de Schema (OBRIGATORIO)

ANTES de qualquer implementacao que toca banco de dados:

1. **Orquestrador** consulta `docs/governance/DATA_DICTIONARY.md`
2. Se campo nao estiver documentado:
   - Acionar agente: `.claude/agents/db-schema-validator.md`
   - **Manus** executa: `SHOW FULL COLUMNS FROM [tabela]`
   - **Manus** executa: `SELECT JSON_KEYS([campo]) FROM [tabela] WHERE [campo] IS NOT NULL LIMIT 3`
3. **Orquestrador** confirma nomes reais e atualiza DATA_DICTIONARY se necessario
4. **Claude Code** implementa somente com nomes confirmados

**SEM EXCECAO** — nem para fixes "simples".
Violacao desta regra = causa raiz garantida de bug (post-mortem B-Z13.5-001/002).

## Gate UX — Verificacao de spec (obrigatorio para frontend)

ANTES de qualquer implementacao de componente frontend:

1. **Orquestrador** consulta `docs/governance/UX_DICTIONARY.md` — verificar estado atual da tela
2. **Claude Code** executa agente `.claude/agents/ux-spec-validator.md` — reportar gaps vs spec
3. **Orquestrador** cria issue com spec HIBRIDA:
   - Conteudo copiado no corpo da issue
   - Link para arquivo fonte
   - Lock apos aprovacao P.O.
   - PATCH (<=5 linhas): comentario na issue
   - AMENDMENT (estrutural): nova issue
4. **P.O.** aprova issue com spec congelada
5. **Claude Code** implementa somente apos aprovacao — todo prompt DEVE iniciar com `gh issue view [N]`

**SEM EXCECAO** — nem para ajustes visuais "simples".
Violacao desta regra = causa raiz do retrabalho Z-07 (spec existia mas nao foi incluida no prompt).

## REGRA-ORQ-08

Todo prompt de implementacao DEVE iniciar com `gh issue view [N]`.
O implementador le a issue diretamente do GitHub. Nunca depende do orquestrador copiar a spec.

## REGRA-ORQ-09

Gate UX obrigatorio antes de qualquer frontend.
`ux-spec-validator` deve reportar LIBERAR antes de codar.

### Mockup HTML (complemento REGRA-ORQ-09)

Antes de criar issue de frontend, verificar: `ls docs/sprints/Z-XX/MOCKUP_*.html`
- Se nao existe: solicitar ao Orquestrador criacao do mockup HTML antes de produzir a issue
- Se existe: referenciar no Bloco 2 + documentar seletores no Bloco 9 baseados no HTML

## REGRA-ORQ-10

Integration Checkpoint (F4.5) obrigatorio antes do merge:
- `grep -n "trpc\." [componente]` executado
- Cruzar com Contrato API da issue
- 100% das procedures da issue devem estar sendo chamadas
- Procedure nao chamada = merge bloqueado

## REGRA-ORQ-11 — Fast-track hotfix P0

Para bugs criticos em producao que nao podem esperar o fluxo normal.

1. Gate 0 minimo (5 min): confirmar root cause com evidencia JSON
2. PR: titulo `[HOTFIX] descricao`, body com `Closes #N` + root cause + fix + evidencia
3. P.O. aprova diretamente (sem auditoria dupla)
4. CI normal se aplica (tsc + testes obrigatorios)
5. Apos deploy: criar issue de governanca para prevenir recorrencia

## REGRA-ORQ-12 — Manus sempre em paralelo

Ao despachar qualquer prompt de implementacao para Claude Code,
o Orquestrador DEVE simultaneamente despachar para o Manus:
- Atualizar Sprint Log com inicio da implementacao
- Se issue toca banco: verificar schema afetado
- Se issue e E2E: confirmar ambiente + projeto de referencia
- Se issue toca deploy: verificar health endpoint

**SEM EXCECAO** — Sprint Log e sempre responsabilidade do Manus.

## REGRA-ORQ-13 — Fluxo declarado obrigatorio

Toda issue de frontend DEVE no Bloco 1:
- **Step:** X — nome do step (ver `docs/governance/FLOW_DICTIONARY.md`)
- **Upstream:** de onde vem o usuario
- **Downstream:** para onde vai apos esta tela
- **Integracoes obrigatorias:** triggers automaticos

Sem fluxo declarado = issue invalida no F3.

## REGRA-ORQ-14 — Efeitos cascata obrigatorios (4 elementos)

Antes de criar issue que implementa qualquer ACAO de usuario:
1. Consultar `docs/governance/FLOW_DICTIONARY.md` secao "Efeitos cascata"
2. Declarar no Bloco 1 os **4 elementos obrigatorios:**
   - Efeito imediato
   - Efeito cascata
   - Formato correto dos dados
   - Navegacao pos-acao
3. Incluir no Bloco 7 criterio para CADA efeito
4. Incluir no Bloco 7 invariante do estado final

Acoes com efeito cascata confirmado:
- aprovar briefing → gerar riscos (B-01)
- aprovar risco → gerar plano formato correto (B-02/B-03)
- bulk approve → gerar planos + redirect /planos-v4 (B-04)
- aprovar plano → desbloquear tarefas

"Gerar plano" nao e suficiente. Deve especificar: `status='rascunho'`, `prazo=ENUM`, `insertActionPlanV4WithAudit`.

## REGRA-ORQ-15 — PR body template obrigatorio

Todo PR DEVE conter no body os campos exatos do `.github/PULL_REQUEST_TEMPLATE.md`:
- Checkboxes de declaracao de escopo
- F4.5 Integration Checkpoint
- JSON de evidencia com 7 campos obrigatorios

Nunca confiar em memoria para gerar PR body. Copiar do template.
Sem este bloco: `validate-pr` FALHA no CI.

**ORQ-15 ADENDO — risk_level OBRIGATORIO em ingles:**
O campo `risk_level` no JSON de evidencia DEVE ser em ingles:
- `"low"` — nao `"baixo"`
- `"medium"` — nao `"medio"`
- `"high"` — nao `"alto"`
Valor em portugues: `validate-pr` FALHA com `RISK_LEVEL INVALIDO`.

## REGRA-ORQ-16 — GOVERNANCE GATE (HARD-ENFORCED)

F1 (Definicao):
  - Produz spec em /docs/specs/
  - Requer aprovacao do P.O.
  - Gera governance/APPROVED_SPEC.json com hash SHA-256

F2 (Execucao):
  - So inicia se APPROVED_SPEC.json existir e for valido
  - CI bloqueia merge se gate falhar (validate-governance.sh)

Checklist obrigatorio antes de F3 (frontend):
  1. diff data-testid mockup vs componente
  2. Gap = 0 obrigatorio
  3. Cada elemento sem issue = defer aprovado pelo P.O.

Proibicoes absolutas:
  - Codigo sem gate aprovado
  - Prompt de implementacao sem artefato
  - Fechar sprint com gap mockup > 0
  - Alterar spec apos aprovacao (hash invalida)

## REGRA-ORQ-17 — PRE-CLOSE-CHECKLIST (obrigatorio antes de fechar issue)

Antes de mergear qualquer PR que contém `Closes #N`:
executar `docs/governance/PRE-CLOSE-CHECKLIST.md` gates PC-1..PC-5.

5 gates obrigatórios:
  PC-1: PR toca os arquivos do Bloco 3 da issue?
  PC-2: data-testid do Bloco 9 presentes no componente?
  PC-3: critérios do Bloco 7 verificáveis no código?
  PC-4: procedures do Bloco 5 chamadas pelo componente?
  PC-5: tipo do PR compatível com tipo da issue?

Se qualquer gate FALHA: remover `Closes #N` do PR body.
PR de migration/docs NUNCA fecha issue de UI/frontend.

Causa raiz: Sprint Z-16 — #614 fechada por PR #639 (migration)
sem UI do modal implementada. 3/5 gates teriam bloqueado.

## REGRA-ORQ-18 — Sincronizacao board obrigatoria

Issue na coluna "Bloqueada" DEVE ter bloqueio explicito:
  - label `on-hold` presente, OU
  - dependencia tecnica declarada na issue (predecessora OPEN)

Se a issue:
  - tem `spec-aprovada`
  - NAO possui label `on-hold`
  - NAO possui bloqueio tecnico explicito
entao DEVE estar em "Todo" (ou "In Progress" se PR aberto).

R-SYNC-01 obrigatorio ANTES de qualquer operacao no board.
Apos cada decisao do P.O. (labels, on-hold, merge):
  sincronizar board imediatamente.

Causa raiz: Sprint Z-16 — #613 e #616 ficaram em "Bloqueada"
por horas apos remocao de on-hold e aprovacao do P.O.
Estado operacional nao sincronizado com decisao formal.

## REGRA-ORQ-19 — Auditoria de fim de sessão (obrigatória)

Toda sessão que produzir lote de mudanças DEVE ser encerrada com
execução do template `docs/governance/AUDITORIA-FIM-DE-SESSAO-TEMPLATE.md`
antes de liberar próxima sprint.

**Gatilhos (qualquer condição dispara):**
- ≥3 PRs mergeados na sessão
- Sprint encerrada (Gate 7 PASS)
- UAT Wave encerrada
- Deploy de lote (múltiplos checkpoints em sequência)
- Divergência detectada entre GitHub e S3 Manus

**Atores:**
- **Claude Code:** passos 0 (sincronia local), 2 (inventário PRs via gh CLI),
  3 (greps de artefatos), 5 (unit tests locais)
- **Manus:** passos 1 (4 HEADs alinhados), 4 (HTTP prod), 6 (smoke UX)
- **P.O.:** passo 7 (veredito 🟢/🟡/🔴 consolidado)

**Consequências:**
- Sessão NÃO encerra sem veredito 🟢 arquivado em `docs/governance/audits/`
- Próxima sprint NÃO abre sem relatório arquivado
- Se 🟡 ou 🔴: issue urgente + pausar todos os merges até resolver

**Formato canônico do relatório:**
- 7 passos com evidências (sincronia, HEADs, inventário, greps, tsc, tests, UX)
- Resumo executivo tabular (HEAD / PRs auditados / Greps / tsc / tests / HTTP / smoke UX)
- Veredito 🟢/🟡/🔴 + próximos passos
- Lista de bugs/bloqueadores residuais

**Artefatos obrigatórios:**
- `docs/governance/AUDITORIA-FIM-DE-SESSAO-TEMPLATE.md` — template genérico (placeholders)
- `docs/governance/AUDITORIA-FIM-DE-SESSAO-LATEST.md` — cópia/link do mais recente
- `docs/governance/audits/vX.XX-YYYY-MM-DD.md` — histórico arquivado por execução

**Baseado em:**
- Z-12: PRs #473/#474 criaram bifurcação silenciosa detectada só depois
- Z-17: 5 hotfixes #664/#666/#667/#673/#674 por falta de auditoria pós-merge
- Z-22 UAT Wave 2026-04-20: 2 crashes P0 (#778 projectName, #792 useMemo)
  auditoria formal teria pego antes de produção
- Primeiro caso concreto arquivado: `docs/governance/audits/v7.42-2026-04-20.md`

### Adendo (2026-05-05) — Audit dual quando pipeline ≠ feature

Para sprints onde escopo de pipeline (dados, engine, persistência) e UX/feature (auto-trigger, testes runtime, cobertura observável ao usuário) divergem em maturidade, o veredito ORQ-19 pode ser **dual**:

- **Pipeline 🟢:** dados corretos, engine funcional, evidência reproduzível por query SQL
- **Feature 🟡:** UX/automação incompleta, cobertura de testes parcial, ações manuais ainda exigidas do usuário

Este formato substitui o veredito único 🟢/🟡/🔴 apenas quando ambas as dimensões precisam ser comunicadas separadamente para evitar:

- (a) Falso 🟢 (pipeline funciona, mas UX cobre só metade dos casos)
- (b) Falso 🟡 (UX incompleta esconde que dados estão corretos e prontos para produção)

**Quando usar:** sprint produz fix de pipeline com regressão funcional residual em UX, OU feature nova com pipeline completo mas testes runtime ausentes. Quando em dúvida, prefira veredito único — dual exige justificativa explícita no audit.

**Caso canônico:** Sprint M3.10 — ver `docs/governance/audits/v7.64-2026-05-05-audit-m3.10-multi-fonte.md`. Pipeline multi-fonte (agregado e por risco) entregue e validado por query direta; auto-trigger guard `activeRisks.length === 0` e testes runtime do helper `getSourceContributors` permanecem como tech debt P2/P3.

**Convenção de path para audit dual:** `vX.XX-YYYY-MM-DD-audit-mX.XX-DESCRIPTOR.md` (em vez de `-sprint-mX.XX-encerrada.md`), refletindo que sprint não está totalmente encerrada — apenas o pipeline.

### Adendo (2026-06-16) — Passo 8: Lições da sessão commitadas (REGRA-ORQ-46)

Antes de consolidar o veredito (Passo 7), o Claude Code executa o **Passo 8**:

| Passo 8 | Lições da sessão commitadas? | Claude Code |
|---|---|---|
| — | `grep "Lição #" .claude/rules/governance.md` → confirmar número mais alto = última commitada | — |
| — | Se há lições novas não commitadas → abrir PR `chore/licoes-*` ANTES de fechar ORQ-19 | — |
| — | Se não há lições novas → registrar "Lições: nenhuma nova nesta sessão" | — |

Sessão que encerra com lições novas não commitadas → veredito ORQ-19 = 🟡 Processo (ver REGRA-ORQ-46).

## REGRA-ORQ-20 — Avaliação de risco estrutural obrigatória

Antes de QUALQUER alteração com sinais de risco estrutural, a issue
(ou PR direto em hotfix P0) DEVE conter o bloco "Avaliação de Risco"
padronizado. Previne incidentes que seriam descobertos só em produção.

**Gatilhos (qualquer sinal dispara exigência):**

| Gatilho | Sinal |
|---|---|
| Schema DB | ALTER TABLE · DROP COLUMN · novo JSON column · migration |
| Cross-file | mudança toca ≥3 arquivos em módulos diferentes |
| Amplitude | PR estimado ≥200 linhas OU ≥3 procedures tRPC |
| Runtime crítico | BriefingV3 · RiskDashboardV4 · QuestionarioCNAE · generateBriefing |
| Engine determinística | risk-engine-v4 · calculateComplianceScore · classifyInconsistenciaImpacto |
| Guardrail removido | remover @ts-nocheck · remover feature flag · remover gate |
| Dependência externa | upgrade de lib · mudança tRPC version · nova biblioteca |
| Infra/deploy | mudança checkpoint strategy · branch protection · CI/CD |

**Bloco obrigatório na issue:**
- Amplitude (arquivos/linhas/procedures/schema)
- Classificação (tier 1/2/3 · reversibilidade)
- Riscos identificados (severidade 🔴🟠🟡🟢 · mitigação)
- Estratégia de rollout (direto · feature flag · snapshot→cold→hot · fases)
- Plano de rollback (4 níveis: CI · tela branca · cascata · catastrófico)
- Abort criteria (quando pausar)

**Templates pré-preenchidos em `docs/governance/risk-assessment/`:**
- `template-schema-change.md` — ALTER/DROP
- `template-crossfile-refactor.md` — mudanças amplas
- `template-remove-guardrail.md` — @ts-nocheck/feature flag
- `template-engine-change.md` — risk-engine/score

**Consequências hard-enforced:**
- Issue SEM bloco quando gatilho aplica → Orquestrador REJEITA em F1/F2
  → label `spec-aprovada` NÃO aplicada → Manus NÃO implementa
- Hotfix P0 sem issue: PR body DEVE ter bloco resumido + título
  declarando tier `[HOTFIX-P0-TIER-N]`

**Baseado em lições:**
- Z-13.5 `operationProfile` string vs objeto — análise teria antecipado dual-schema
- Z-17 LLM silencioso — análise teria exigido cobertura de testes antes
- Z-22 `@ts-nocheck` — análise atual do issue #793 é o exemplo canônico do que
  deveria sempre acontecer antes, não depois do incidente
- Z-22 UAT Wave — 37 PRs sem formalização de risco; sorte não houve mais crashes

**Exemplo concreto de referência:** análise do #793 (migração @ts-nocheck) com
snapshot→cold→hot + 4 níveis de rollback + abort criteria. Ver comentários da
issue #793 para padrão-ouro.

## PASSO 0.0 — R-SYNC-01 (ANTES DE TUDO)

Antes de qualquer trabalho em qualquer sprint:

```
git fetch origin && git diff --stat origin/main
Se divergente: git reset --hard origin/main
```

**SEM EXCECAO** — nem para fixes "simples".
Violacao: schema reportado errado → bugs garantidos.

## R-SYNC-01 — Regra anti-bifurcacao — Manus + Claude Code

Quando Claude Code e Manus trabalham em paralelo,
o S3 (storage de checkpoint do Manus) pode divergir
do GitHub se o Claude Code mergear PRs diretamente.

OBRIGATORIO antes de qualquer checkpoint ou push:
  git fetch origin && git reset --hard origin/main

Isso garante que o S3 sempre espelha o GitHub.
Causa raiz documentada: PRs #473/#474 (Claude Code)
criaram bifurcacao detectada na Sprint Z-12.

## R-SYNC-02 — Fetch com refspec explicito (Manus apenas)

Projeto tem 3 remotes: `origin` (S3 Manus), `github` e `solaris` (ambos GitHub).
O fetch config de `origin` mapeia `refs/heads/*:refs/remotes/origin/*`,
o que pode criar ref local ambigua `refs/heads/origin/main` quando se roda
`git fetch github main` ou `git fetch solaris main` sem refspec explicito.

Sintoma: `warning: refname 'origin/main' is ambiguous` + `webdev_save_checkpoint`
falha com `unable to push to remote` (bloqueio historico sprint Z-22 2026-04-20).

REGRA:
  - **NUNCA** usar `git fetch github main` ou `git fetch solaris main`
  - **SEMPRE** usar refspec completo:
    `git fetch github refs/heads/main:refs/remotes/github/main`
    `git fetch solaris refs/heads/main:refs/remotes/solaris/main`
  - Se ambiguidade ocorrer: `git update-ref -d refs/heads/origin/main`

Causa raiz documentada: sessao 2026-04-20, checkpoint v7.16 bloqueado por 3h.

## F7 — Deploy + Smoke test (OBRIGATORIO)

Apos todo Gate 7, antes de declarar sprint encerrada:

1. **Manus:** deploy em producao
2. **Claude Code:** regenerar riscos no projeto de referencia
3. Verificar 4 provas:
   - PROVA 1: 10 <= riscos <= 40
   - PROVA 2: aliquota_zero + credito_presumido presentes
   - PROVA 3: titulos sem "[categoria]" e sem "geral"
   - PROVA 4: >= 50% rag_validated=true

Sprint nao encerra sem F7 passando.

## Convencao de prompts para Manus (implementador)

O Manus perde contexto frequentemente (compactacao de chat sem aviso).
Todo prompt DEVE ser autocontido — nunca depender de contexto anterior.

1. **1 tarefa por prompt.** Nunca 2+ tarefas no mesmo prompt.
2. **Incluir HEAD atual** no inicio: `git fetch origin && git reset --hard origin/main`
3. **Incluir TODO o contexto:** arquivos, linhas, comandos exatos. Nunca "conforme discutido".
4. **Terminar com "FIM."** — sinal claro de que nao ha mais nada a fazer.
5. **Se divagar:** interromper e reenviar o prompt original. Nao tentar corrigir.
6. **git add:** SEMPRE especificar arquivos por nome. NUNCA `git add .` ou `git add -A`.

Licao aprendida Sprint Z-17: Manus gerou PR com 72 arquivos (git add .),
perdeu contexto 5+ vezes, e demorou horas em tarefas de 1 minuto.

## Template de prompt Manus (F1)

Ao despachar F1 para o Manus:
- Usar template: `.claude/templates/manus-issue-create.md`
- SEMPRE fornecer body-file com spec completa
- NUNCA permitir reescrita do body pelo Manus
- Se Manus reescrever: Claude Code corrige via `gh issue edit --body-file`

Lição Z-18: Manus reescreveu specs 3x (#697 #701 #705) — 30+ min de retrabalho.

## Key Documentation

- `docs/governance/ESTADO-ATUAL.md` — Current sprint state
- `docs/governance/HANDOFF-IMPLEMENTADOR.md` — Developer operational guide
- `docs/adr/` — Architecture Decision Records (ADR-010 content architecture, etc.)
- `.github/CONTRIBUTING.md` — Full contribution guidelines
- `.github/MANUS-GOVERNANCE.md` — AI implementer operational rules

## REGRA-ORQ-21 — Caminho C é default (última spec é formal)

A última versão aprovada de uma spec é a **última revisão formal**.

Qualquer crítica pós-aprovação que **não afete correção técnica** deve ir
como instrução operacional no prompt F3 ao implementador, **não** como
amendment formal da spec.

Critérios para crítica forçar amendment formal (v1.x+1):
- Contradição interna da spec
- Referência a API/tipo inexistente
- Requisito técnico impossível de implementar como escrito

Críticas sobre nomenclatura, ordem de commits, estilo de teste, JSDoc,
observações UX e sugestões de melhoria **vão para o F3 como notas**,
nunca regeram a spec.

Objetivo: eliminar ciclos infinitos v1.0→v1.1→v1.2→v1.N.

Referência narrativa: `docs/governance/SPEC-PROCESS-v2.md#regra-1`

## REGRA-ORQ-22 — Crítica de spec em 3 níveis

Ao Claude Code criticar uma spec do Orquestrador, a saída **DEVE** ser
classificada em 3 níveis:

**Nivel 1 — Bloqueante tecnico.** Entra em amendment formal (v1.x+1).
- Contradicao interna
- Tipo/API incompativel
- Tabela/enum inexistente

**Nivel 2 — Design improvement.** Vai como nota no F3 ao implementador.
- Nomenclatura
- Ordem de commits
- Template/formato de teste
- Organizacao de comentarios/JSDoc
- Preferencia de estilo

**Nivel 3 — Observacao/backlog.** NAO entra no PR; vira issue separada.
- Refactor estrutural futuro
- Tech debt pre-existente nao criado pelo PR
- Sugestao de arquitetura alternativa
- Workaround UX sem motivo tecnico

Saida em formato tabular obrigatorio: ver
`docs/governance/templates/TEMPLATE-critica-3-niveis.md`.

Objetivo: P.O. decide em segundos, nao em 30 minutos lendo 13 pontos
misturados.

## REGRA-ORQ-23 — Tempo-box de aprovação (1 round)

Cada spec tem direito a **1 round formal de crítica** pelo Claude Code.

Fluxo:
1. Orquestrador gera v1.0
2. Claude Code critica uma vez (saída em 3 níveis — REGRA-ORQ-22)
3. Orquestrador triaga com P.O., gera v1.1 com Nível 1 incorporado
4. P.O. aprova v1.1

**Não há v1.2 formal** exceto se aparecer bug técnico real durante
implementação (Gate 0 do F3 pelo Claude Code) — nesse caso v1.2 é
amendment mínimo, não novo round de crítica livre.

Objetivo: cortar o padrão v1.0→v1.1→v1.2→v1.3 observado no hotfix IS.

## REGRA-ORQ-24 — Classe de impacto determina governança

Toda spec é classificada pelo Orquestrador em uma de 3 classes no ato
de criação:

**Classe A — cirurgico.**
- Ate 50 linhas de codigo
- Ate 2 arquivos afetados
- 1 funcao/componente isolado
- Bug fix ou feature pequena
- Governanca: SPEC curta (1 pagina), Caminho C default, aprovacao
  em 1-2 ciclos

**Classe B — feature media.**
- Ate 500 linhas de codigo
- Ate 5 arquivos afetados
- Modulo novo ou extensao substantiva
- Governanca: SPEC completa, 1 round de critica, ADR opcional

**Classe C — mudanca estrutural.**
- >500 linhas de codigo OU refactor transversal OU novo subsistema
- Multiplos modulos afetados
- Governanca: SPEC extensa, ate 2 rounds, ADR obrigatorio,
  consultor externo (ChatGPT) opcional

A classe é declarada explicitamente no cabeçalho da spec. O Claude
Code valida no Gate 0 se a classe declarada corresponde ao escopo
real — divergência força reclassificação antes de prosseguir.

Referência narrativa: `docs/governance/SPEC-PROCESS-v2.md#regra-4`

Template de classificação: `docs/governance/templates/TEMPLATE-classe-impacto.md`

## Observação operacional — contexto histórico e lição aprendida

As REGRAs ORQ-21 a ORQ-24 foram motivadas pelo hotfix IS (2026-04-21),
que passou por 3 ciclos formais de spec (v1.0, v1.1, v1.2) quando era
Classe A cirúrgica — deveria ter passado por 1 ciclo apenas.

O hotfix IS é mantido como **case de estudo narrativo** em
`docs/governance/SPEC-PROCESS-v2.md#caso-estudo-hotfix-is` — sem
reclassificação retroativa.

**Lição operacional registrada 2026-04-22 (durante implementação do P1):**
Antes de adicionar nova REGRA-ORQ-NN ao governance.md, o Orquestrador
DEVE executar `grep -E "^## REGRA-ORQ-" .claude/rules/governance.md`
para confirmar o próximo número livre. A primeira versão deste append
(PR #829 commit 1efd36d) usou ORQ-19 a ORQ-22 indevidamente —
colidindo com ORQ-19 e ORQ-20 já existentes. Correção via force-push
renumerou para ORQ-21 a ORQ-24.

## REGRA-ORQ-25 — Anti-drift SHA Manus.space sandbox

**Vigência:** permanente, a partir de 2026-04-30
**Origem:** 6+ incidentes de drift documentados em sessão R3-A SOJA + smoke
**Severidade:** governança crítica — auditoria comprometida

### Regra

Manus.space mantém checkpoints internos (S3 IDs como `597552e2`, `e1ffc00`,
`8e49abe8`, `f44fea1b`) que NÃO existem como commits git válidos. Esses
identificadores não devem ser confundidos com SHAs git ou serem usados
como referência de auditoria source-controlled.

### Aplicação

1. Reportes de SHA pós-deploy/merge devem incluir AMBOS:
   - SHA git real (`git rev-parse origin/main` ou similar)
   - Checkpoint Manus.space (S3 ID, se houver)

   Formato: `git=10b1a24 / checkpoint=f44fea1b`

2. Validação cruzada obrigatória pré-merge:
   - `git cat-file -t <SHA>` deve retornar `commit`
   - Se retorna `fatal: Not a valid object name` → SHA é fictício/checkpoint

3. Reportes que mencionam apenas checkpoint Manus.space (sem git SHA) devem
   ser rejeitados ou esclarecidos antes de qualquer decisão downstream.

4. Drift estrutural Manus.space (cherry-pick em sandbox vs pull origin/main)
   é backlog M3 — esta regra mitiga sintomas até fix arquitetural.

### Histórico de incidentes

- 2026-04-29: hotfix-P0 #869 reportou checkpoint sandbox
- 2026-04-30: smoke SOJA SHA `e1ffc00` + checkpoint `8e49abe8` (não-git)
- 2026-04-30: PR #872 reportou `597552e2` (não-git)
- 2026-04-30: PR #876 reportou `f44fea1b` (não-git)
- (e outros)

### Vinculadas

- REGRA-ORQ-26 (branch obrigatória source-controlled)
- REGRA-HOTFIX-1 a 5
- Backlog M3: drift arquitetural Manus.space (fix definitivo)

## REGRA-ORQ-26 — Branch obrigatória para arquivos source-controlled

**Vigência:** permanente, a partir de 2026-04-30
**Origem:** P1 incidente Manus 0f53dd0 (commit direto em main local)
**Severidade:** governança crítica — equiparada à REGRA-HOTFIX-1/3 (Gate 0 + backup)

### Regra

Toda alteração em arquivos rastreados pelo git (`server/`, `client/`, `docs/`,
`.github/`, `drizzle/`, qualquer caminho versionado) segue fluxo obrigatório:

  branch → edit → commit → push → PR → CI → review → merge

Commits diretos em `main` local (mesmo sem `push`) são proibidos. Mesmo que
o working tree não vá para `origin/main`, o ato de commitar em main local
cria estado divergente difícil de auditar e foi causa raiz documentada
do incidente P1 0f53dd0 em 2026-04-30.

### Aplicação obrigatória

1. Anti-contamination procedure SEMPRE inclui `git checkout -B <branch>`
   ANTES de qualquer edit.

2. Edit em main local descoberto = remediar via:
   - `git reset --soft origin/main`
   - `git checkout -B <branch-nova>`
   - Re-commit + push + PR

3. Hooks pre-commit recomendados para bloquear commits em main local
   (não obrigatório enquanto disciplina manual funcionar).

### Validação

Procedimento de auditoria pré-push:
- `git rev-parse HEAD` ≠ `git rev-parse origin/main` (deve estar em branch)
- `git branch --show-current` ≠ `main` nem `master`

### Não-bloqueia

Commits em outras branches locais (feature/fix/chore/etc.) sem push imediato
são permitidos — só `main` local é proibido.

### Vinculadas

- REGRA-ORQ-25 (anti-drift SHA Manus.space) — em formalização futura
- REGRA-HOTFIX-1 a 5 (Gate 0 + backup + 3h SLA)
- REGRA-ORQ-12 SPRINT_FAST_TRACK

**Caso concreto referenciado:**
PR #877 (`chore/spec-ci-isolation-camada5`, commit 408025e) é o exemplo
canônico de remediação correta após violação: soft reset para `origin/main`,
branch nova, stage seletivo, commit + push + PR. Manter como case de estudo
em `docs/governance/SPEC-PROCESS-v2.md` se houver futura compilação narrativa.

## REGRA-ORQ-27 — Validação de consumo (Lição #59)

Toda afirmação de "engine X consome dado Y" em audit, PR body, sprint closure 
ou relatório DEVE ser comprovada por uma das duas formas:

### (a) Teste com spy no caller final

- Spy em `invokeLLM` / `retrieveArticles` / `queryRag` / função análoga
- Asserção: argumento de prompt/queryCtx CONTÉM o valor dinâmico de Y
- `expect(prompt).toContain("label fixa")` NÃO basta — precisa testar valor dinâmico

Exemplo correto:
```typescript
const spyLLM = vi.spyOn(llmModule, 'invokeLLM');
await caller({ ..., dynamicValue: "transportador" });
const promptArg = spyLLM.mock.calls[0][0];
expect(promptArg).toContain("transportador");  // valor dinâmico
```

Exemplo INCORRETO (assemble, não consumption):
```typescript
expect(montagemUpstream).toContain("Perfil da Entidade:");  // string fixa montada upstream
```

### (b) Citação arquivo:linha

- Linha exata do prompt LLM final OU contextQuery RAG final onde Y é concatenado
- Assemble point upstream NÃO conta

### NÃO basta:

- Grep por nome da função (mostra chamada, não consumo)
- Verificar type signature (structural typing TypeScript oculta dead code)
- Aparência de output (campo no PDF não prova consumo do dado)

### Cosméticos vs ATIVO:

| Estado | Critério | Marcação |
|---|---|---|
| ✅ ATIVO | Provado por (a) ou (b) | Conta como engine ativo |
| 🟡 Cosmético | Texto em campo não consumido por inferência downstream | NUNCA marcar como ATIVO |
| 🟡 Rastreio | Gravação em schema sem leitura downstream | NUNCA marcar como ATIVO |
| ❌ Dead code | Campo passado mas nunca lido (structural typing) | Bug — abrir issue |
| ⚠️ Não verificado | Sem prova (a) nem (b) disponível | Default — nunca ✅ |

### Aplicação:

- PR sem prova ao afirmar consumo → validate-pr FALHA (Camada B futura)
- Audit sem prova → orquestrador rejeita F1/F2
- Score "engines com X" só conta provas arquivadas

### Aplicação prospectiva

PRs abertos antes do merge desta REGRA-ORQ-27 não exigem retroativamente. PRs criados após o merge devem cumprir.

### Origem

- Lição #59 capturada Sprint M3 (caso EMPRESA TRANSPORTE COMBUSTÍVEL)
- 3 engines (Q.CNAE, Q.NBS, Q.NCM) passaram tests + CI + APPROVE em dead code
- E2E P.O. revelou que código existia mas não alterava prompt LLM final

### Vinculadas

- Lição #59 (assemble ≠ consumption)
- Lição #60 (score técnico ≠ produto)
- ORQ-08 (spec aprovada)
- ORQ-15 (PR body template)
- ORQ-20 (Avaliação de Risco)

## REGRA-ORQ-28 — Triade de Garantia para Bugs/Features Técnicas

Vigência: permanente, a partir de 2026-05-04
Origem: Sprint M3.6 — padrão estabelecido para evitar "documenta e esquece"
Severidade: governança operacional — define artefatos obrigatórios pré-implementação

### Regra

Toda issue de **bug** ou **feature técnica** que envolva mudanças em código de produção (server/, client/, drizzle/) DEVE produzir **3 artefatos** antes que a implementação seja iniciada. Cada artefato é um PR distinto, mergeado em ordem.

### Artefato 1 — Issue ultra-detalhada (8 seções)

Issue no GitHub seguindo template fixo:

1. **Contexto** — caso de teste, screenshots, sintomas observados, HEAD analisado
2. **Diagnóstico empírico** — causa-raiz com `arquivo:linha` exato + fluxo do bug
3. **Spec técnica** — diff exato (antes/depois), arquivos tocados, LOC estimado
4. **ADR mínimo** — decisões arquiteturais + justificativa
5. **Critério de aceite empírico** — checkboxes verificáveis com comandos reproduzíveis
6. **Test contracts** — lista de `it.todo()` com asserts mapeados aos critérios
7. **Não-implementar** — escopo explicitamente excluído (anti scope creep)
8. **Vinculadas** — PRs anteriores, REGRAs aplicáveis, screenshots, análises

### Artefato 2 — PR docs-only com test contracts skeleton

PR commitando arquivos `.test.ts` com `it.todo()` em `server/lib/{issue-id}-*.test.ts` ou caminho equivalente.

- Garantia média: testes ficam visíveis no repo até serem implementados
- `it.todo()` aparece como pending no CI (não falha)
- Implementação propriamente dita transforma `it.todo()` em `it()` com código real
- Cada test contract mapeia 1:1 a um critério de aceite da Seção 5 da issue

### Artefato 3 — PR docs-only com workflow CI gate específico

PR commitando `.github/workflows/validate-spec-{issue-id}.yml` que:

- Dispara apenas em PRs com label `{issue-id}-impl` (escape hatch — outros PRs imunes)
- Executa **greps** contra arquivos esperados pela Spec Técnica (Seção 3 da issue)
- Verifica que **todos os `it.todo()` foram convertidos** para `it()` no PR de implementação
- Executa os testes via vitest e exige **100% PASS**
- Diff size guard — warning se LOC do PR exceder 2x estimativa do spec

### Hierarquia de garantias (ser honesto)

- 🟢 **Garantia REAL:** Artefato 2 (test contracts executados via vitest)
- 🟡 **Complemento útil:** Artefato 3 (CI greps — frágil a renames/comentários, mas detecta ausências grosseiras)
- 🟦 **Documentação:** Artefato 1 (referência permanente)

Artefato 3 NÃO é "garantia máxima" — é camada adicional de segurança. Test contracts (Artefato 2) é o gate real.

### Aplicação

- Implementação só inicia após Artefato 1 mergeado + Artefatos 2 e 3 mergeados
- PR de implementação **deve receber label `{issue-id}-impl`**, disparando Artefato 3
- Artefato 3 verde + branch protection = merge somente com conformidade
- Reviewer (Manus ou Claude Code, quem não implementou) confirma que cada gate corresponde ao critério da issue

### Casos onde NÃO se aplica

- Hotfix P0 (REGRA-ORQ-11) — fast-track sem triade completa, mas mantém PR body com critério de aceite
- PRs docs-only sem mudança de código — apenas Artefato 1 se necessário
- Mudanças triviais (≤5 LOC, sem lógica) — exigir triade completa é overhead injustificado

### Limitações conhecidas

- **Greps frágeis:** rename de identificadores quebra grep. Mitigação: complementar com test contracts em vez de substituir.
- **`it.todo()` não falha CI:** apenas pending. Mitigação: Artefato 3 verifica que `it.todo()` foi convertido para `it()` no PR de implementação.
- **Nem tudo cabe em template:** features de UI ou refactor podem precisar adaptar Seções 3 e 6.

### Origem

Sprint M3.6 (Issue #932 + PR #933 + PR #934) estabeleceu padrão. Manus + Claude Code documentaram falhas de "documenta e esquece" em sprints anteriores (M3 dead code, mislabeling Q.CNAE 4 vezes, score 10/10 inflado).

### Vinculadas

- REGRA-ORQ-15 (PR body template)
- REGRA-ORQ-17 (PRE-CLOSE-CHECKLIST)
- REGRA-ORQ-27 (Validação de consumo / Lição #59)
- Lição #59 (assemble ≠ consumption)
- Lição #60 (score técnico ≠ produto)

### Refinamento futuro

- AST-based check (substituir greps por análise de árvore TypeScript via `ts-morph`) — mais robusto contra renames e comentários
- Script `scripts/spec-gate-init.sh {issue-id} {file-paths}` — gera Artefatos 2 e 3 a partir de template
- Spec hash invariance — capturar SHA da issue no PR body, detectar drift se issue for editada

## REGRA-ORQ-29 — Sem Requisito = Sem Pergunta = Sem Gap

Vigência: permanente, a partir de 2026-05-04
Origem: Decisão P.O. Sprint M3.6 + ADR-010 Regra 5 + Lição #61
Severidade: bloqueante — viola integridade do diagnóstico

### Regra

Se não existe requisito normativo verificável no corpus RAG (ou metadado equivalente em fonte curada com `lei_ref` + `artigo_ref` + `cnaeGroups` validado) para o CNAE/NBS/NCM do projeto, o sistema NÃO DEVE gerar perguntas. O protocolo NO_QUESTION deve ser ativado com motivo `no_applicable_requirements`.

Proibido:
- Perguntas sem `source_reference` verificável no corpus
- Fallbacks genéricos com `confidence < 0.8`
- Hardcode de perguntas em código TypeScript (arrays de objetos com `texto: "..."` e `confidence: 0.5`)
- Mascaramento de fallback como `fonte: "ia_gen"` (disfarça hardcode como conteúdo gerado)

### Aplicação

CI gate sugerido em `.github/workflows/invariant-check.yml` (INV-06):

```bash
grep -rP "fonte.*['\"]fallback['\"]|fonte.*['\"]ia_gen['\"][\s,].*confidence_score:\s*0\.5" \
  server/ --include="*.ts" --exclude="*.test.ts"
```

Se match > 0 → FAIL.

**Nota técnica:** usar `grep -rP` (Perl regex), não `grep -rE` (POSIX ERE). Razão: `\s` é extensão Perl. POSIX equivalente seria `[[:space:]]`. Verificado empiricamente em 2026-05-04 (review Manus do PR #939) — `grep -E` com `\s` não captura nenhum dos 5 casos de `FALLBACK_QUESTIONS:3826-3832`.

### Vinculadas

- ADR-010 Regra 1 (`source_required`) e Regra 5 (CNAE condicionado)
- Content Engine Rule #1 (`.claude/rules/backend.md:18`)
- NO_QUESTION protocol
- Test T-B3-07 (`server/integration/routers-question-engine.test.ts:306-331`)
- REGRA-ORQ-32 (meta-regra "no hardcode")
- Lição #61

### Origem documentada

Sprint M3.6 — auditoria E2E identificou 9 perguntas hardcoded em código:
- `server/lib/service-questions.ts:24-43` `buildServiceFallback` (2 perguntas, `fonte:"fallback"`)
- `server/lib/product-questions.ts:24-43` `buildProductFallback` (2 perguntas)
- `server/routers-fluxo-v3.ts:3826-3832` `FALLBACK_QUESTIONS` (5 perguntas, `fonte:'ia_gen'` mascarado)

Comentário em `routers-fluxo-v3.ts:3784` declara intencional ("fallback obrigatório (5 perguntas hardcoded)") — prova que sem regra explícita + CI gate, atalhos foram introduzidos deliberadamente.

## REGRA-ORQ-30 — Temperature Máxima 0.1

Vigência: permanente, a partir de 2026-05-04
Origem: Decisão P.O. Sprint M3.6 — determinismo > criatividade em compliance
Severidade: bloqueante — temperature > 0.1 compromete reprodutibilidade

### Regra

Todo `invokeLLM()` ou chamada equivalente em código de produção (`server/`) DEVE usar `temperature <= 0.1`.

- Extração / classificação / re-ranking → `temperature: 0` (preferencial)
- Geração textual (perguntas, riscos, ações, briefings) → `temperature: 0.1` (máximo)
- `temperature > 0.1` é **proibido** em código de produção

Exceções requerem aprovação explícita do P.O. com justificativa documentada em ADR.

### Aplicação

CI gate sugerido em `.github/workflows/invariant-check.yml` (INV-07):

```bash
grep -rnP "temperature:\s*0\.(1[1-9]|[2-9])" server/ --include="*.ts" \
  | grep -v "test\|voiceTranscription"
```

(Excluir `*.test.ts` para permitir testes simularem cenários; excluir `voiceTranscription.ts:44` que é definição de tipo, não valor.)

Se match > 0 → FAIL.

**Nota técnica:** o regex captura `0.11`-`0.19` via `1[1-9]` e `0.2`-`0.9` via `[2-9]`. NÃO captura `0.1` (valor válido) nem `0.10` (idem). Verificado empiricamente em 2026-05-04 (review Manus do PR #939) — regex anterior `temperature:\s*0?\.[2-9]` deixava `0.15` (`routers-fluxo-v3.ts:2356` `generateActionPlan`) escapar do gate. Usar `grep -P` (Perl) — `grep -E` não suporta `\s`.

### Origem documentada

Sprint M3.6 — auditoria identificou 8 violações em produção:

| Arquivo:linha | Função | Temp | Comentário no código |
|---|---|---|---|
| `routers-fluxo-v3.ts:308` | refineCnaes inicial | 0.1 | (manter) |
| `routers-fluxo-v3.ts:466` | refineCnaes iter | 0.1 | (manter) |
| `routers-fluxo-v3.ts:709` | generateQuestions | **0.2** | reduzir a 0.1 |
| `routers-fluxo-v3.ts:2140` | generateRiskMatrices | **0.2** | reduzir a 0.1 |
| `routers-fluxo-v3.ts:2356` | generateActionPlan | **0.15** | reduzir a 0.1 |
| `routers-fluxo-v3.ts:2636` | generateDecision | **0.35** | *"Temperatura ligeiramente maior para insight criativo"* — viola princípio |
| `routers-fluxo-v3.ts:3891` | Onda 2 IA Gen | **0.1** | *"Z-11: determinístico"* (contradição: comentário diz determinístico mas valor não é zero) |
| `task-generator-v4.ts:134` | task generator | **0.3** | reduzir a 0.1 |

Caso canônico: linha 3891 prova que comentário de intenção ("determinístico") sem CI gate é ignorado.

### Vinculadas

- REGRA-ORQ-31 (Meta 98% — determinismo é pré-requisito)
- REGRA-ORQ-32 (no hardcode — temperature > 0 é "atalho de criatividade" sem rastreabilidade)

## REGRA-ORQ-31 — Meta de Confiança 98%

Vigência: permanente, a partir de 2026-05-04
Origem: ADR-010 + DEC-06 §13.5 + Decisão P.O. Sprint M3.6
Severidade: gate de qualidade — outputs abaixo de 98% não são entregues ao cliente

### Regra

Todo output do pipeline de diagnóstico (perguntas, gaps, riscos, ações) DEVE atingir confiança >= 98% medida pelos 10 critérios de DEC-06 §13.5. Outputs com confiança < 98% devem ser marcados como `draft` e não exibidos ao advogado até revisão.

A métrica é calculada como: `(critérios atendidos / 10 critérios totais) * 100`.

### Os 10 critérios (ref `docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` §13.5)

1. Fonte normativa rastreável (artigo + lei).
2. CNAE-condicionado (não universal sem justificativa).
3. Confidence score >= 0.8.
4. Sem alucinação (anti-hallucination check).
5. Cadeia completa (Requisito → Gap → Risco → Ação).
6. Determinístico (mesma entrada = mesma classificação).
7. Coverage >= 100% dos requisitos aplicáveis.
8. Consistência cross-stage (sem contradições).
9. Evidência suficiente (não "genérico").
10. Prazo determinístico (não "em breve").

### Aplicação

Gate de release: nenhum deploy para produção com critérios < 10/10 PASS para o projeto de referência (definido em `docs/governance/ESTADO-ATUAL.md`).

### Vinculadas

- DEC-06 (`MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` §13.5)
- ADR-010 Content Architecture 98%
- ADR-0025 Risk Categories Configurable
- `docs/governance/GOVERNANCA-E2E-IA-SOLARIS.md`
- REGRA-ORQ-29 (sem requisito = sem pergunta — pré-requisito da meta 98%)
- REGRA-ORQ-30 (determinismo — pré-requisito do critério 6)

### Origem documentada

DEC-06 (P.O., 2026-04-18) consolidou os 10 critérios. ADR-010 (título "Content Architecture 98%"), GOVERNANCA-E2E-IA-SOLARIS.md ("Meta do produto: 98% de confiabilidade jurídica") e ADR-0025 referenciam a meta. Esta REGRA-ORQ-31 formaliza como gate hard-enforced.

## REGRA-ORQ-32 — Proibição de Hardcode (Visão Sistêmica)

Vigência: permanente, a partir de 2026-05-04
Origem: Decisão P.O. Sprint M3.6 — *"não aceito hardcode, precisamos pensar na visão sistêmica (holística)"*
Severidade: arquitetural — viola princípio de manutenibilidade e escalabilidade

### Regra (meta-regra)

Toda decisão do sistema que depende de dados mutáveis (leis aplicáveis, CNAEs elegíveis, thresholds de confiança, listas de fontes, perguntas/riscos/ações) DEVE ser configurável via:

- Banco de dados (tabela com campos estruturados)
- Variável de ambiente
- Tabela de configuração com CRUD admin

Hardcode de valores que podem mudar é **proibido**:

- ❌ `if (lei === "lc224") skip()`
- ❌ `const FALLBACK_QUESTIONS = [{ texto: "A empresa possui...", confidence: 0.5 }]`
- ❌ `temperature: 0.35 // criativo`

### Exceções permitidas

- Constantes verdadeiramente imutáveis (nome do produto, versão de API)
- Valores que mudam apenas com release (schema version)
- Whitelists temporárias com tech debt registrado e issue de migração para tabela de config

### Caminho correto

| Decisão hoje hardcoded | Caminho data-driven |
|---|---|
| Leis aplicáveis | Campo `lei_ref` no banco + query dinâmica |
| CNAEs elegíveis | Campo `cnaeGroups` no banco + filtro genérico |
| Thresholds de confiança | Variável de ambiente ou tabela `system_config` |
| Whitelists de fonte | Tabela de configuração com CRUD admin |
| Perguntas curadas | Tabela `solaris_questions` (já data-driven, mas falta `lei_ref`) |
| Aprovação jurídica | Campo `mappingReviewStatus` (já existe, falta gate em query) |

### Natureza desta regra

REGRA-ORQ-32 é **meta-regra**: princípio orientador que justifica e sustenta REGRA-ORQ-29 (no_question), REGRA-ORQ-30 (determinismo) e REGRA-ORQ-31 (meta 98%). Não tem regex CI direto — serve como critério de decisão em code review e priorização de scope de PR.

### Tech debt registrado

A whitelist `["lc214", "lc227"]` em `server/lib/service-questions.ts:101` (PR #937) é hardcode tolerado para a Sprint M3.6 (funcional, scope cirúrgico). **Migração para tabela de configuração** é tech debt vinculado a esta REGRA-ORQ-32 — issue de tracking deve referenciá-la.

### Vinculadas

- REGRA-ORQ-29 (operacional: sem requisito = sem pergunta)
- REGRA-ORQ-30 (operacional: temperature ≤ 0.1)
- REGRA-ORQ-31 (operacional: meta 98%)
- ADR-0025 (categorias configuráveis — exemplo de aplicação correta)
- Lição #61

### Origem documentada

Princípio declarado pelo P.O. em 2026-05-04 após auditoria E2E identificar 18 atalhos acumulados em produção (9 hardcode + 8 temperature > 0 + 1 badge null). Sem regra explícita anti-atalho, pressão de velocidade venceu qualidade — regra-meta fecha esta porta.

## REGRA-ORQ-33 — Matriz RACI Operacional

Vigência: permanente, a partir de 2026-05-04
Origem: Decisão P.O. Sprint M3.7 — definição formal de papéis
Severidade: governança operacional — define ownership de cada etapa do fluxo

### Matriz de papéis

| Papel | Pessoa/Sistema | Atribuição |
|---|---|---|
| **R** — Responsible | Claude Code | Implementar código (escreve PRs, aplica REGRA-ORQ-28 quando aplicável) · **aplica/remove labels de rastreabilidade (v59)** |
| **A** — Accountable | P.O. (Uires Tapajós) | Dúvidas técnicas + spec de regras + aprovação final de specs e merges (v59) |
| **C** — Consulted | Consultor (ChatGPT) | Análise crítica, sugestão de design, parecer técnico/jurídico |
| **I** — Informed (executor) | Manus | Review pós-implementação + merge + queries SQL/deploy (**não mais labels — v59**) |

### Adendo (2026-06-18 v59) — labels migram de Manus para Claude Code

Origem: Decisão P.O. v59 (Despacho Nominal). A aplicação/remoção de labels de rastreabilidade em issues e PRs passa a ser **responsabilidade do Claude Code** (antes: Manus). Manus mantém review, merge, queries SQL e deploy. Consultor jurídico é o **ChatGPT** (explicitado). P.O. atua em dúvidas técnicas + spec de regras + aprovação.

Reflexo operacional: trechos do governance que atribuíam labels ao Manus ou ao P.O. (ex.: REGRA-ORQ-12 "Manus em paralelo"; Gate UX "após labels aplicados") leem-se, a partir de v59, com o Claude Code como executor das labels — a aprovação de quais labels aplicar permanece decisão do P.O. (A).

### Aplicação operacional

#### Fluxo padrão de uma frente técnica

```
1. Issue criada com spec (P.O. aprova)
2. Claude Code implementa (PR aberto)
3. Manus revisa (comenta APROVADO/GAPS no PR)
4. P.O. autoriza merge
5. Claude Code mergeia
6. Manus deploya em produção
```

#### Fluxo de governança (REGRAs ORQ, ADRs, Lições)

```
1. Claude Code propõe (rascunho/análise técnica)
2. Manus + Consultor revisam em paralelo
3. P.O. aprova
4. Claude Code documenta no governance.md
5. Manus deploya (se aplicável)
```

#### Autonomia do Implementador

Claude Code **pode implementar autonomamente**:
- Sem perguntar a cada passo dentro de uma issue aprovada pelo P.O.
- Aplicando julgamento sobre triade ORQ-28 (clausulas de não-aplicação para mudanças triviais)
- Despachando PRs em sequência respeitando dependências técnicas
- Corrigindo bugs detectados durante implementação (ex: regex INV-06/INV-07 review Manus)

Claude Code **NÃO pode autonomamente**:
- Mergear PRs sem autorização explícita do P.O. (ações irreversíveis)
- Modificar specs aprovadas sem reconfirmar com P.O.
- Saltar review do Manus para frentes Médio/Alto risco
- Deployar em produção (escopo do Manus)

#### Critério de escalação

| Situação | Encaminhar para |
|---|---|
| Bug técnico durante impl | Decisão autônoma do Claude Code |
| Decisão de domínio jurídico | P.O. + equipe SOLARIS jurídica |
| Conflito entre 2 specs aprovadas | P.O. (decisão A) |
| Sugestão de melhoria fora do escopo da issue | Backlog (issue separada) — não inflar scope |
| Architectural decision (ADR-level) | P.O. + Consultor (parecer ChatGPT) |
| Hotfix P0 produção | REGRA-ORQ-11 (fast-track, P.O. aprova diretamente) |

### Vinculadas

- REGRA-ORQ-11 (Fast-track hotfix P0)
- REGRA-ORQ-12 (Manus sempre em paralelo)
- REGRA-ORQ-21 (Caminho C — última spec é formal)
- REGRA-ORQ-28 (Triade de garantia)

### Origem documentada

P.O. declarou matriz RACI em 2026-05-04 após Sprint M3.6 + Sprint M3.7 governance. Antes desta regra, papéis eram implícitos — risco de overlap (Manus implementando + Claude Code implementando paralelamente = bifurcação documentada na sessão M3.7 quando Manus foi pausado e Claude Code assumiu impl). Esta REGRA-ORQ-33 cristaliza a decisão e remove ambiguidade.

## REGRA-ORQ-34 — Pipeline de Dados Bugfix Protocol

Vigência: permanente, a partir de 2026-05-05
Origem: Sprint M3.10 — 4 fixes consecutivos (#968 M3.8-1B, #973 M3.8.1, #976+#977 Fix B/A1, #979 Fix C-bis) para o mesmo bug arquitetural ("matriz mono-fonte")
Severidade: governança crítica — perenização de técnicas que evitariam reincidência

### Regra

Todo PR que altera **pipeline de dados** (definição abaixo) DEVE seguir 4 protocolos obrigatórios. Falha em qualquer um → `validate-pr` reprova e merge bloqueado.

### Definição de "pipeline de dados"

Funções/procedures que orquestram fluxo `input → transformação → persistência → output`. No projeto atual:

| Camada | Exemplos |
|---|---|
| Writers | `gapEngine.analyzeGaps`, `solaris-gap-analyzer.ts`, `iagen-gap-analyzer.ts`, `analyzeGapsFromQuestionnaires` |
| Readers | `getAllGapsForProject`, `result.gaps` em frontend |
| Engine | `consolidateRisks`, `getBestSourcePriority`, `GapToRuleMapper.mapMany`, `generateRisksV4Pipeline` |
| Procedures | `risksV4.generateRisks`, `risksV4.generateRisksFromGaps`, `risksV4.generateRisksAllSources`, `risksV4.mapGapsToRules` |
| Tabelas | `project_gaps_v3`, `risks_v4`, `action_plans`, `tasks` |

**Disparo do protocolo:** PR toca esses arquivos OU adiciona/altera procedure tRPC em `server/routers/*` que orquestra escrita+leitura. Frontend que muda chamada a procedures de pipeline também dispara (caso M3.10 Fix C-bis).

### Protocolo 1 — Validação Greenfield Obrigatória

**Definição greenfield:** projeto criado APÓS o deploy do PR (zero estado pré-existente). Critério SQL: `SELECT created_at FROM projects WHERE id = <X>` deve ser maior que timestamp de deploy.

**Aplicação:** validador (Manus ou outro) NÃO PODE testar apenas em projeto pré-existente. Pelo menos 1 cenário deve ser greenfield.

**Justificativa:** projetos antigos podem ter dados de execuções pré-deploy que mascaram regressão. Greenfield expõe o caminho real do código novo. Caso canônico: PR #977 validado em #3570002 (gaps v1 pré-existentes mascararam regressão); falhou em #3690001 greenfield onde 0 gaps v1 foram escritos.

### Protocolo 2 — Dry-run pré-implementação para bugs recorrentes

**Definição "bug recorrente":** mesmo sintoma com 2+ PRs de fix prévios mal-sucedidos. Marcar PR/issue com label `incident-recurrent` + listar PRs vinculados no body.

**Aplicação:** nenhuma implementação inicia sem dry-run empírico do diagnóstico. Dry-run é:
- Queries SQL ao banco real (read-only)
- Simulação em memória do pipeline com gaps reais
- Output observável (counts, distribuições, JSON parseado)

P.O. pode autorizar pular dry-run em situações excepcionais — mas exceção deve ser registrada em PR body com justificativa.

**Justificativa:** após 2 fixes errados, hipótese de causa raiz tem alta probabilidade de estar incorreta. Dry-run move risco de "implementar com hipótese" para "implementar com prova". Caso canônico: dry-run Manus 2026-05-05 confirmou diagnóstico antes de Fix C-bis.

### Protocolo 3 — DoD com critério NEGATIVO SQL bloqueante

**Definição:** PR DEVE declarar tanto:

| Tipo | Função | Exemplo |
|---|---|---|
| **POSITIVO** | Query SQL retorna estado esperado pós-fix | `SELECT COUNT(DISTINCT source_priority) >= 2` |
| **NEGATIVO** | Query SQL DEVE retornar 0 linhas (estado proibido) | `SELECT 'BUG' FROM ... HAVING COUNT(DISTINCT) = 1` |

**Aplicação:** ambas obrigatórias no PR body, executáveis em staging pelo validador.

**Justificativa:** critério positivo simples pode ser satisfeito por sorte de dados (caso M3.10 #3570002 passou DoD positivo mas bug latente persistia em greenfield). Critério negativo impede que estado-bug reapareça mascarado.

### Protocolo 4 — Validação em 3 cenários ortogonais

**Definição:** Validador (≠ Implementador, REGRA-ORQ-33) deve testar em pelo menos 3 cenários:

1. **Greenfield** (Protocolo 1) — projeto novo
2. **Pré-existente** com estado válido — regression check
3. **Edge case** explícito do bug — input vazio, malformado, ou condição limite

**Aplicação:** PR body declara os 3 cenários no campo "Validação obrigatória do Validador". DoD verde requer screenshot/output de cada um.

**Justificativa:** validar 1 cenário = sorte de coverage. Validar 3 ortogonais = cobertura razoável. Caso canônico: M3.10 Fix C-bis (greenfield + pré-existente + edge evidence vazio).

### Consequências

- PR sem evidência dos 4 protocolos → `validate-pr` FALHA (Camada B futura — implementar gate)
- Audit/sprint encerrado sem 4 protocolos → 🟡 retroativo
- Bug que se manifesta em greenfield após PR mergeado → revert obrigatório, reabrir Sprint
- Repetição (3+ fixes consecutivos no mesmo bug sem aplicar protocolos) → escalar para P.O. + consultor externo

### Exceções

- **Hotfix P0** (REGRA-ORQ-11) — Protocolo 2 (dry-run) pode ser pulado se janela de impacto > 1h. Outros 3 protocolos mantidos.
- **Mudanças triviais** (≤5 LOC, sem lógica) — Protocolos 1+4 (greenfield + 3 cenários) opcionais. Protocolos 2+3 (dry-run + DoD negativo) obrigatórios.
- **Docs-only** — protocolos não se aplicam (docs não tocam pipeline).

### Origem documentada

Sprint M3.10 (2026-05-04 a 2026-05-05) — 4 fixes consecutivos para o mesmo bug arquitetural "matriz mono-fonte":

| PR | Hipótese | Resultado |
|---|---|---|
| #968 (M3.8-1B) | Hardcode no client | Trocou string fixa, bug persistiu |
| #973 (M3.8.1) | Default ranking | Trocou nome do mascarador, bug persistiu |
| #976 + #977 (Fix B + A1) | Gaps órfãos | Conectou pipeline; validado em pré-existente, regredido em greenfield |
| #979 (Fix C-bis) | Regressão write + UI mono-valor | Fix duplo + DoD em 3 cenários — caso canônico desta REGRA |

Lições #65 (rastrear fluxo end-to-end) + #66 (spec sem dados = ilusão) + #67 (try/catch graceful) + #68 (coluna mono + JSON multi) capturadas. Esta REGRA consolida os 4 protocolos que evitariam reincidência futura.

### Vinculadas

- REGRA-ORQ-19 (auditoria fim-de-sessão) — protocolos integram com audit verde
- REGRA-ORQ-20 (avaliação risco estrutural) — pipeline de dados sempre Tier 2-3
- REGRA-ORQ-27 (Lição #59 — assemble ≠ consumption) — estendida pelos protocolos
- REGRA-ORQ-28 (Triade) — DoD com critério NEGATIVO complementa test contracts
- REGRA-ORQ-33 (RACI Implementador ≠ Validador) — Protocolo 4 reforça com 3 cenários
- Lição #59, #62, #63, #64, #65, #66, #67, #68
- Sprint M3.10 (caso canônico) — Post-mortem #975
- Post-mortem 2026-05-05 (`docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md`)

## REGRA-ORQ-35 — NUNCA ASSUMA (Read Before Write Enforcement)

Vigência: permanente, a partir de 2026-05-05
Origem: Sprint M3.10 — auto-avaliação Claude Code após 4 fixes consecutivos errados em variações do mesmo bug
Severidade: governança fundamental — declarativa (Fase 1); enforcement mecânico via hooks na Fase 3

POSIÇÃO: Esta regra tem PRIORIDADE sobre velocidade de entrega.

### Threshold de Leitura por LOC

Antes de qualquer Edit/Write, leitura mínima exigida:

| Tamanho do arquivo | Estratégia |
|---|---|
| ≤ 300 LOC | Ler arquivo inteiro antes de editar |
| 300-1000 LOC | Ler: declaração do alvo + 2 call sites + testes relacionados |
| > 1000 LOC | Ler arquivo inteiro SE for o alvo do fix; senão, 3 trechos ortogonais (declaração + 2 usos diferentes) |

**Fallback para arquivos extremos (>3000 LOC):** leitura por seções de 500 linhas com índice (`grep -n "^export\|^function"`) para navegação cirúrgica.

### Checklist Obrigatório (4 perguntas antes de QUALQUER Edit)

1. Li o arquivo inteiro (ou trechos conforme threshold)?
2. Identifiquei TODOS os consumers/importers com `rg -l "import.*<Modulo>"`?
3. Verifiquei se existe procedure similar que já resolve o problema?
4. Formulei hipótese E tenho evidência (query SQL ou leitura de código) que a suporta?

Se qualquer resposta for NÃO → PARE, investigue mais.

### Gatilho de Ativação

- Qualquer PR que modifica lógica de negócio
- Qualquer fix em pipeline de dados (REGRA-ORQ-34 também ativa)
- Qualquer refactor que altera assinaturas
- Qualquer mudança em procedure tRPC consumida por frontend

### Enforcement (Fases sequenciais)

| Fase | Mecanismo | Status |
|------|-----------|--------|
| Atual (declarativa) | Checklist no PR template — reviewer valida evidência de leitura | Ativo |
| Fase 3 (mecânica) | Hook PreToolUse bloqueia Edit sem evidência de investigação | Pendente implementação |

> **Honestidade:** Esta REGRA é declarativa até Fase 3 ser implementada.
> Sem hook, depende de disciplina voluntária — historicamente insuficiente (4 sprints com falha).
> Enforcement real virá via `.claude/hooks/require-investigation.sh` (exit 2 = bloqueio mecânico).

### Vinculadas

- REGRA-ORQ-27 (Lição #59 — assemble ≠ consumption) — esta REGRA endereça falha repetida
- REGRA-ORQ-28 (Triade) — checklist obrigatório complementa
- REGRA-ORQ-34 (Pipeline de Dados Bugfix Protocol) — combinada para PRs de pipeline
- REGRA-ORQ-36 (Técnicas de Investigação Profunda) — define COMO ler/investigar
- Sprint M3.10 — 4 fixes consecutivos sem leitura completa do contexto

## REGRA-ORQ-36 — Técnicas de Investigação Profunda

Vigência: permanente, a partir de 2026-05-05
Origem: Sprint M3.10 — 5 técnicas que descobriram bugs invisíveis para grep raso
Severidade: governança operacional — define COMO investigar antes de fixar

### Matriz de Aplicação (T1-T5)

| Técnica | Quando usar | Caso canônico (Sprint M3.10) |
|---|---|---|
| **T1 — Tracing transversal** | Bug em pipeline multi-camada (input → transformação → persistência → output) | G17-B em `routers-fluxo-v3.ts:3711-3744` — caminho paralelo `deriveRisksFromGaps` → `project_risks_v3` (legado) |
| **T2 — Comparação cirúrgica** | Procedures "similares" com bugs (mesmo objetivo, comportamento divergente) | `gapEngine.analyzeGaps:268` (`WHERE createdById = ?`) vs `risksV4.generateRisksAllSources` (sem filtro) — assimetria de auth |
| **T3 — Hipótese-refutação SQL** | Antes de implementar qualquer fix em pipeline | Dry-run Manus 2026-05-05: 36 gaps órfãos em memória → provou diagnóstico antes de Fix C-bis |
| **T4 — Mapa writers/readers** | Fix em tabela compartilhada (multi-writer ou multi-reader) | `project_gaps_v3`: 3 writers (gapEngine, solaris-analyzer, iagen-analyzer) × 1 reader (UI listagem). 0 readers no caminho de risco — bug arquitetural óbvio quando visualizado |
| **T5 — Análise contrastiva** | Validação pós-fix (testar em N≥2 estados) | #3570002 (gaps v1 pré-existentes — passou) vs #3690001 (greenfield — falhou) — exposição da regressão simétrica |

### Regra de Ouro

- Bug em **1 camada** → T2 + T3 bastam
- Bug em **pipeline multi-camada** → T1 + T4 obrigatórios
- Bug **intermitente** → T5 obrigatório (testar em N≥2 estados ortogonais)
- Bug **recorrente** (2+ PRs prévios) → T1 + T2 + T3 + T4 + T5 todos obrigatórios (REGRA-ORQ-34 Protocolo 2)

### Ferramentas Preferidas (em ordem de preferência)

1. **`ast-grep`** — busca semântica (assinaturas, tipos, estrutura de código). Ideal para refactor, comparação cirúrgica, detecção de assimetrias estruturais. Instalação: `npm install -g @ast-grep/cli` (autorizada Sprint M3.10 Fase 4)
2. **`rg -C 10 "TERMO"`** — busca textual com contexto amplo (10 linhas antes/depois). Default para análise de código existente
3. **`rg -l "import.*<Modulo>"`** — mapeamento de consumers (quem importa o módulo). Aplicar antes de qualquer mudança em assinatura pública
4. **`grep -rn "INSERT INTO\|SELECT.*FROM"`** — mapeamento de writers/readers em tabelas (T4)
5. **Query SQL direta** — validação empírica de hipótese (T3). Read-only sempre que possível

### Comandos auxiliares para cada técnica

**T1 — Tracing transversal:**
```bash
# Mapear writers de uma tabela
grep -rn "INSERT INTO <tabela>\|insert<Tipo>" server/ --include="*.ts" | grep -v "\.test\."

# Mapear readers
grep -rn "FROM <tabela>\|SELECT.*<tabela>" server/ --include="*.ts" | grep -v "\.test\."

# Mapear callers de função
grep -rn "<funcaoNome>\s*(" server/ client/src --include="*.ts" --include="*.tsx" | grep -v "\.test\."
```

**T2 — Comparação cirúrgica:**
```bash
# Listar 2+ procedures similares
ast-grep --pattern '<procedureName>: protectedProcedure.input($$$).mutation($$$)' --lang typescript

# Comparar manualmente: input schemas, queries SQL, validações de auth, return types
```

**T3 — Hipótese-refutação SQL:**
```sql
-- Pattern: "Se hipótese H é verdadeira, query Q deve retornar resultado R"
-- Se Q retorna ≠R → H refutada → reabrir investigação
-- Se Q retorna =R → H confirmada → autorizar fix
```

**T4 — Mapa writers/readers:**
- Tabela em coluna A: writer (quem chama INSERT/UPDATE)
- Tabela em coluna B: reader (quem chama SELECT/FROM)
- Visualização explícita expõe órfãos (writer sem reader = dead write; reader sem writer = leitura vazia)

**T5 — Análise contrastiva:**
- Cenário A: greenfield (zero estado pré-existente)
- Cenário B: pré-existente (estado de execuções anteriores)
- Cenário C (opcional): edge case (input vazio, malformado, condição limite)
- Validar em N≥2 cenários antes de declarar fix completo

### Vinculadas

- REGRA-ORQ-34 (Pipeline de Dados Bugfix Protocol) — protocolos 1-4 são manifestações concretas de T5
- REGRA-ORQ-35 (NUNCA ASSUMA) — define QUANDO investigar; ORQ-36 define COMO
- Lição #65 (rastrear fluxo end-to-end) — T1 é manifestação operacional
- Lição #70 (assimetria auth em procedures) — T2 é manifestação operacional
- Sprint M3.10 — todos os casos canônicos vêm da resolução do bug mono-fonte

## REGRA-ORQ-37 — Evidência Obrigatória de Ingestão de Corpus

Nenhuma ingestão de corpus será reportada como "executada" sem que o PR body
contenha o resultado literal da query SQL executada no banco de produção.
O PR body é especificação — não é evidência de execução.
Detalhes: docs/governance/REGRA-ORQ-37-corpus-ingest-evidence.md
Gate: .github/workflows/validate-corpus-ingest.yml (label: corpus-ingest)

## REGRA-ORQ-CI-01 — CI verde como pré-requisito de merge

**Vigência:** permanente, a partir de 2026-05-08
**Origem:** PR #970 mergeou com CI vermelho — propagou 4 assertions desatualizadas
detectadas só 16 dias depois. Issue ci/hygiene 2026-05-08 identificou 13 test
files failing por causa raiz não-funcional (DB ausente no CI + assertions stale
do M3.8-3).
**Severidade:** governança crítica — blocker estrutural de merge

### Regra

Nenhum PR pode ser mergeado em `main` com os checks `Run Unit Tests` ou
`TypeScript + Vitest` em estado FAILURE. Admin override permitido apenas com
justificativa documentada no PR body (campo "Admin override reason") + issue
de follow-up obrigatória antes do merge.

### Aplicação

#### Passo 1 — Branch protection no GitHub (configurar uma vez)

```
GitHub → Settings → Branches → Branch protection rules → main
[x] Require status checks to pass before merging
    [x] Require branches to be up to date before merging
    Required status checks:
      [x] Run Unit Tests
      [x] TypeScript + Vitest
```

Verificação via CLI:
```bash
gh api repos/Solaris-Empresa/compliance-tributaria-v2/branches/main/protection
# Esperado: 200 com required_status_checks contendo "Run Unit Tests" e "TypeScript + Vitest"
# Se 404 "Branch not protected": ativar via Settings > Branches
```

**Estado em 2026-05-08:** branch protection AUSENTE (404). Pendente de
configuração pelo P.O. ou Manus com permissão admin.

#### Passo 2 — Padrão de skipIf em testes ambientais

Tests que dependem de recursos externos (DB, OpenAI, network) DEVEM usar
o padrão `dbDescribe` / `openaiDescribe` de `server/test-helpers.ts`:

```typescript
import { dbDescribe, openaiDescribe } from "./test-helpers";

dbDescribe("Suite que requer DATABASE_URL", () => {
  // tests que precisam de DB
});

openaiDescribe("Suite que requer OPENAI_API_KEY", () => {
  // tests que precisam de chave OpenAI
});
```

#### Passo 3 — Quando alterar comportamento testado

Ao alterar comportamento de função coberta por testes, atualizar **TODOS**
os arquivos de teste que asseram o valor antigo no MESMO PR. Caso contrário,
CI vermelho e merge bloqueado pelo Passo 1.

### Exceções permitidas

- **Hotfix P0** (REGRA-ORQ-11) — admin override permitido, mas:
  - Documentar no PR body: `## Admin Override\nMotivo: <descrição>\nFollow-up: <issue para fix CI>`
  - Issue de follow-up obrigatória, criada antes do merge
- **Tests pré-existentes failing por infra** (DB ausente no CI, OpenAI key
  ausente) — usar `dbDescribe`/`openaiDescribe`, não bypass de CI

### Origem documentada

- PR #970 (commit `a528257`, 2026-05-04, autor utapajos): alterou `downgrade_to`
  de `"enquadramento_geral"` → `"unmapped"` em `risk-eligibility.ts`. Não
  atualizou 4 assertions em `hotfix-classe-erro-2026-04-28.test.ts` e
  `hotfix-suite-is-gate-2026-04-28.test.ts`. CI ficou vermelho mas branch
  protection ausente permitiu merge. Bug latente até 2026-05-08 (16 dias).

### Vinculadas

- Issue ci/hygiene 2026-05-08 — fix das 4 assertions + skipIf nos 13 tests
  failing identificados (com expansão para outros via padrão `dbDescribe`)
- REGRA-ORQ-11 (Hotfix P0) — única exceção permitida ao gate
- REGRA-ORQ-26 (branch obrigatória) — fluxo upstream desta regra
- `server/test-helpers.ts` — implementação dos helpers `dbDescribe`/`openaiDescribe`

## REGRA-INGEST-01 — Contrato de Ingestão (19/05/2026)

**Origem:** Lição #79 — incidente 12.577 chunks sem anchor_id/autor (sessão 19/05/2026)

Todo INSERT em `ragDocuments` DEVE:
1. Chamar `validateChunkBeforeInsert()` de `server/lib/ingest-validator.ts`
2. Popular `anchor_id` no formato `{lei}-{artigo_slug}-id{id}`
3. Popular `autor` no formato `{pipeline}-{sprint}-{data}`
4. Garantir `conteudo` entre 10 e 5.000 chars (REGRA-ORQ-40)

Scripts que violem esta regra são bloqueados pelo CI (`rag-quality-gate`) e
rejeitados no code review.

Ver contrato completo: `docs/governance/INGEST-CONTRACT.md`

## REGRA-ORQ-40 — Threshold Chunk Size (19/05/2026)

**Status:** ✅ Implementada (CI warning + build-time enforcement via ingest-validator)

Todo chunk inserido em `ragDocuments` DEVE ter `conteudo` entre **10 e 5.000 chars**.

- **Build-time:** `validateChunkBeforeInsert()` lança exceção se violado
- **CI:** step `check-chunk-size` em `rag-quality-gate.yml` (warning para scripts legados)
- **Scripts de referência:** `scripts/fix-lc214-art544-chunks.ts:52` + `scripts/normalize-rag-corpus-lcs-novas.ts:33`

## REGRA-ORQ-41 — Protocolo AS-IS/TO-BE com impact-tree (29/05/2026)

**Vigência:** permanente, a partir de 2026-05-29
**Severidade:** governança crítica — bloqueante para implementação de mudanças cross-cutting
**Origem:** sessão 29/05/2026 — caso canônico AS-IS/TO-BE CPF agro (v1 75% → v4 99%)

### Quando aplicar

Toda mudança que cumpra qualquer gatilho:
- campo persistido (schema column ou JSON shape compartilhado)
- tipo compartilhado (interface usada por backend + frontend + shared)
- identidade (`cnpj`, `cpf`, `user_id`, `project_id`, e similares)
- enum global (`companyType`, `taxRegime`, `status`, etc.)
- contrato canônico governado por ADR (`perfilHash`, `archetypeVersion`, etc.)

### 10 itens hard-enforced no AS-IS/TO-BE

1. Toda afirmação com citação `arquivo:linha` (sem exceção)
2. Skill `impact-tree` aplicada (11 passos — `.claude/skills/impact-tree/SKILL.md`)
3. LOC reais medidos (`wc -l`) antes de classificar Classe B vs C (REGRA-ORQ-24)
4. Snapshots `.snap` LIDOS (não assumidos)
5. ADRs afetados identificados com bump declarado (MAJOR/MINOR/PATCH)
6. UX_DICTIONARY analisado (regra Z-13.5) — se toca frontend
7. Plano de rollback com N níveis declarado
8. Spec do banco (`DB-SPEC-*.md`) separada do AS-IS/TO-BE
9. Plano de testes de aceitação (`PLANO-TESTES-*.md`) separado com DoD por fase
10. Issues pré-existentes verificadas (`gh issue search` — Lição #83)

### Tooling obrigatório (instalável globalmente)

- `ast-grep`: padrões semânticos em corpo de função/expressão
- `knip` / `ts-prune`: dead-exports (NÃO dead-fields — usar grep manual para fields)
- `dependency-cruiser`: grafo formal de dependências
- `grep` / `gh` CLI: padrões textuais simples + busca de issues

Guia operacional: `docs/governance/relatorios/TOOLING-IMPACT-TREE-GUIDE-20260529.md`.

### Limitações conhecidas (Lição #93)

- `knip`/`ts-prune` detectam dead-EXPORTS, não dead-FIELDS de schema
  → para campos: `grep -rn "\.<campo>\b" server/ client/src`
- `ast-grep` tem limitação com padrões em interfaces TS
  → usar para corpo de função/expressão; grep para tipos em interfaces
- `depcruise` global emite warning recomendando devDependency local
  → funcional, ignorável em uso pontual

### 4 entregáveis obrigatórios antes de implementar

1. `AS-IS-TO-BE-<feature>-v<N>.md` — spec principal (9 seções da skill `impact-tree`)
2. `DB-SPEC-<feature>.md` — spec do banco + migrations UP/DOWN + queries de verificação
3. `PLANO-TESTES-<feature>.md` — contratos de teste por fase + DoD
4. `CHECKLIST-ACEITE-<feature>.md` — checklist P.O. com assinatura antes de F0

### Refutação técnica obrigatória (Lição #93)

Se outro agente (Manus, ChatGPT, outro Claude) fornecer análise técnica de comportamento de campo/função sem citação `arquivo:linha`, Claude Code DEVE validar via Read antes de incorporar ao TO-BE.

**Caso canônico (29/05/2026):** Manus afirmou que a flag `analise_1_cnpj_operacional` "verifica se o CNPJ existe". Read em `buildPerfilEntidade.ts:346-369` + `routers/perfil.ts:186` mostrou que a flag é sobre "escopo unitário de 1 entidade vs consolidação multi-CNPJ de grupo econômico". Conclusão (manter o nome) permaneceu correta, pela razão certa.

### Consequências

- Mudança cross-cutting **sem AS-IS/TO-BE compliant** → P.O. NÃO autoriza F0
- Implementação iniciada sem os 4 artefatos → `validate-pr` reprova
- Afirmação técnica sem citação `arquivo:linha` no AS-IS → review reprova
- Skill `impact-tree` não aplicada → cobertura declarada considerada <90% e bloqueada

### Exceções

- Hotfix P0 (REGRA-ORQ-11): fast-track com AS-IS resumido + DB-SPEC + CHECKLIST
- Mudanças triviais Classe A (≤50 LOC · 1 arquivo · sem schema · sem ADR): AS-IS curto suficiente

### Vinculadas

- REGRA-ORQ-24 · REGRA-ORQ-26 · REGRA-ORQ-27 · REGRA-ORQ-28 · REGRA-ORQ-34 · REGRA-ORQ-35 · REGRA-ORQ-36
- Lições #59, #64, #65, #66, #83, #87, **#93**
- Skill: `.claude/skills/impact-tree/SKILL.md` (PR #1287)
- Espelho completo: `docs/governance/relatorios/REGRA-ORQ-41-AS-IS-TO-BE-IMPACT-TREE.md`
- Caso canônico (4 versões): `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-*.md`

## REGRA-ORQ-SPEC-01 — Precisão em Specs de CI (19/05/2026)

**Origem:** Auditoria Manus — PR #1114 (19/05/2026)

Toda referência a "step X" em specs de CI DEVE:
1. Incluir o `name:` exato do step conforme o YAML (verificável via `grep`)
2. Se o step não existir, dizer explicitamente **"criar novo step"** em vez de "adicionar após step X"
3. Se a regra referenciada não estiver implementada no CI, indicar **"proposta — não implementada"**

**Violação detectada:** Spec do PR #1114 referenciou step "chunk-size" inexistente.
**Resolução:** Claude Code adaptou corretamente (Lição #80).

## REGRA-ORQ-FILENAME-01 — Migrations em tabelas com "rag" no nome (20/05/2026)

**Origem:** PR #1116 Gate 0 — achado empírico

O guard `touchesRag` usa regex `f.toLowerCase().includes('rag')` (case-insensitive substring).
Qualquer arquivo `.sql` numerado com "rag" no nome dispara `REGRA 5 hard-block` quando
combinado com `touchesMigration` (.sql numerado, schema.ts, drizzle/).

**Regra:** Migrations DDL em tabelas cujo nome contém "rag" (ex: `ragDocuments`) DEVEM
omitir a substring "rag" do filename da migration.

✅ Correto:  `0097_anchor_id_autor_not_null.sql`
❌ Bloqueado: `0097_ragdocuments_anchor_autor_not_null.sql`

## REGRA-ORQ-42 — Spec de formulário multi-perfil exige tabela de visibilidade

**Origem:** Lição #109 · BUG-AGRO-CPF · 29/05/2026

**Regra:**
Qualquer despacho que altere um formulário com mais de um perfil de usuário
(ex: PJ/PF, admin/cliente, contribuinte/não-contribuinte) é BLOQUEADO até que
o despacho inclua:

1. **Tabela de visibilidade de campos** — para cada campo do formulário,
   qual perfil o vê e se é obrigatório.
2. **Cenário E2E no DoD** — "selecionar perfil X → preencher → avançar → confirmar".
3. **Critério de aceite no schema backend** — confirmar que o schema Zod/backend
   aceita payload do perfil novo sem valores do perfil antigo.

**Aplicação:**
Claude Code deve levantar Nível 1 (bloqueante técnico — REGRA-ORQ-22) se receber
despacho de formulário multi-perfil sem os 3 itens acima.

**Não se aplica a:**
- Formulários com perfil único
- Alterações de campo único sem mudança de perfil
- Componentes não-formulário (PDF, hash, schema DB)

### Lição #111 — Testes de schema devem usar o valor real que o frontend produz

**Data:** 29/05/2026 | **Origem:** BUG-AGRO-CPF-UX F6/F8 | **PR:** #1304

**Anti-padrão:**
```typescript
// ❌ ERRADO — usa null como atalho conveniente
companyType: null,   // frontend NÃO produz null; produz ""
taxRegime: null,
```

**Padrão correto:**
```typescript
// ✅ CORRETO — usa o valor que o frontend realmente envia
companyType: "",     // useEffect zera com string vazia
taxRegime: "",
```

**Regra:** Antes de escrever um teste de schema, verificar o valor exato que o
frontend produz para o campo em questão (inspecionar o useEffect/onChange/submit).
Testar com `null` quando o frontend envia `""` é um falso positivo — o teste passa
mas o produto está quebrado.

**Corolário:** `z.enum().optional().nullable()` aceita `null` e `undefined` mas
rejeita `""`. O teste verde com `null` não prova que `""` passa.

---

### Lição #112 — useEffect que zera campos com "" é contrato implícito — documentar na tabela de visibilidade

**Data:** 29/05/2026 | **Origem:** BUG-AGRO-CPF-UX F6/F8 | **PR:** #1304

**Problema:** `useEffect` que zera campos ao trocar de perfil (PJ→PF) usando `""`
em vez de `null`/`undefined` cria um contrato implícito entre frontend e backend
que não aparece no schema Zod nem no tipo TypeScript.

**Regra (REGRA-ORQ-42 extensão):** Qualquer `useEffect` de limpeza de campos em
formulário multi-perfil DEVE ser documentado na **tabela de visibilidade** do
despacho, incluindo:

| Campo | Valor ao limpar | Motivo |
|---|---|---|
| `companyType` | `""` (string vazia) | `<select>` HTML retorna `""` por padrão |
| `taxRegime` | `""` | idem |

**Fix canônico quando o frontend zera com `""`:**
Usar `z.preprocess(v => v === "" ? undefined : v, z.enum([...]).optional())`
no schema backend — não alterar o frontend (risco de cascata em N callsites).

**Referência:** Fix implementado em `server/routers-fluxo-v3.ts` via
helper `emptyToUndefined` (PR #1304, BUG-AGRO-CPF-UX-F8).

## REGRA-ORQ-43 — SPEC-FIRST (índice consolidador da metodologia)

**Vigência:** permanente, a partir de 2026-06-14
**Origem:** Materialização SOLARIS-SPEC-FIRST v1.2 — a metodologia já existia fragmentada; esta regra consolida sem duplicar
**Severidade:** governança operacional — define o fluxo único obrigatório para specs de feature/bug
**Classe da própria mudança:** A (índice; não cria mecanismo novo, referencia os existentes)

### Regra

Toda feature ou bug de Classe B/C segue um **fluxo SPEC-FIRST único**, composto pelas regras já existentes. Esta REGRA-ORQ-43 é um **índice** — não redefine nenhuma delas; aponta para a fonte canônica de cada etapa:

| Etapa | Regra canônica | O que define |
|---|---|---|
| 1. Classificar impacto (A/B/C) | **REGRA-ORQ-24** | Critérios objetivos: LOC, arquivos, ADR, curadoria humana |
| 2. Análise de impacto cross-cutting | **REGRA-ORQ-41** + skill `.claude/skills/impact-tree/SKILL.md` | AS-IS/TO-BE com 11 passos, consumers/producers, ADR bump |
| 3. Artefatos obrigatórios da issue | **REGRA-ORQ-28** (Triade) | Issue ultra-detalhada (8 seções) + test contracts + CI gate |
| 4. Template canônico da issue | `.github/ISSUE_TEMPLATE/sprint-issue.md` | Blocos 1→9 (Contexto…Referências de código) + checkbox `spec-bloco9` + DoD |
| 5. Papéis (quem faz o quê) | **REGRA-ORQ-33** (RACI) | R=Claude Code · A=P.O. · C=Consultor · I=Manus |
| 6. DoD negativo por consumer crítico | **REGRA-ORQ-44** | Cada consumer crítico do AS-IS exige critério SQL/teste negativo |
| 7. Enforcement de merge | `validate-pr.yml` | Já bloqueia: `Closes #N` + label `spec-aprovada` + 5 labels `spec-*` + conteúdo |

### Aplicação

- **Não duplicar** estas etapas em regras novas — referenciar ORQ-43.
- PR de Classe B/C **sem** issue vinculada com `spec-aprovada` já é bloqueado por `validate-pr.yml` (não precisa de gate adicional).
- Antes de afirmar que um artefato/gate "não existe", **grep no corpus** (Lição #66/#83 — o próprio plano SPEC-FIRST violou isso 2×).

### Não se aplica

- Classe A cirúrgica (≤50 LOC · ≤2 arquivos · sem schema · sem ADR) — spec curta basta (ORQ-24).
- Hotfix P0 (REGRA-ORQ-11) — fast-track.
- PRs docs/chore — sem spec formal.

### Vinculadas

- REGRA-ORQ-24 (classes) · REGRA-ORQ-28 (triade) · REGRA-ORQ-33 (RACI) · REGRA-ORQ-34 (pipeline bugfix) · REGRA-ORQ-41 (impact-tree) · REGRA-ORQ-44 (DoD negativo)
- `.github/ISSUE_TEMPLATE/sprint-issue.md` (template canônico) · `.github/workflows/validate-pr.yml` (gate de merge)
- Lição #121 (consolidação) · Lição #66/#83 (não afirmar ausência sem grep)

## REGRA-ORQ-44 — DoD negativo obrigatório por consumer crítico

**Vigência:** permanente, a partir de 2026-06-14
**Origem:** generaliza REGRA-ORQ-34 Protocolo 3 (DoD negativo) para qualquer mudança com consumers críticos identificados no AS-IS
**Severidade:** governança crítica — DoD positivo sozinho pode passar por sorte de dados

### Regra

Toda mudança de Classe B/C cujo AS-IS (REGRA-ORQ-41) identifique **consumer crítico** (🔴) DEVE declarar, para cada um, um **DoD negativo**: uma query SQL ou teste que **prova que o estado proibido NÃO ocorre**. O DoD positivo ("o esperado aconteceu") é necessário mas insuficiente.

| Tipo | Função | Exemplo |
|---|---|---|
| POSITIVO | prova que o estado esperado ocorre | `COUNT(DISTINCT x) >= 2` |
| **NEGATIVO** | prova que o estado proibido NÃO ocorre | `SELECT 'BUG' ... HAVING ... = 1 → 0 linhas` |

### Aplicação

- Para cada consumer 🔴 do AS-IS: 1 DoD positivo + 1 DoD negativo, ambos executáveis pelo Validador (Manus, REGRA-ORQ-33).
- O DoD negativo deve testar o **comportamento real atual**, não o desejado — testar o estado errado-mas-existente é o anti-padrão "DoD invertido".

### Caso canônico (anti-padrão)

GATE-NCM-NBS #1219: a devolutiva propôs DoD negativo `NCM grupo "2402" → IS NÃO elegível`, mas o código (`risk-eligibility-is-ncm-cnae.ts:96`) usa `startsWith("24")` → `"2402"` **casa** (eligible=true). O DoD invertido teria forçado regressão da semântica 2-díg. existente. DoD negativo correto: travar o fallback permissivo de NCM ausente (`NCM=[] + CNAE não-92 → NÃO elegível`, Bug #827/F11).

### Vinculadas

- REGRA-ORQ-34 Protocolo 3 (origem) · REGRA-ORQ-41 (consumers do AS-IS) · REGRA-ORQ-43 (etapa 6) · REGRA-ORQ-27 (assemble ≠ consumption)
- Lição #85 (DoD de persistência exige SQL) · Lição #93 (mecanismo verificado)
- GATE-NCM-NBS #1219 (caso canônico do DoD invertido)

## REGRA-ORQ-45 — Gate 0 do Emissor de Despacho

**Vigência:** permanente, a partir de 2026-06-16
**Origem:** GOV-FIXES — 7 premissas erradas em despachos consecutivos (v8→v18) pegas só pelo Gate 0 do implementador, após N rounds
**Severidade:** governança crítica — corta a causa nº1 de retrabalho (ciclos de despacho)

### Regra

Todo despacho que prescreve **SQL, nome de coluna, regime, enum ou snippet de código** DEVE:

1. Carregar **evidência verificada no corpo** (`DESCRIBE tabela`, `SELECT` do estado atual, `grep arquivo:linha`, ou consulta a `docs/governance/SCHEMA-REFERENCE.md`); **OU**
2. Marcar explicitamente **⚠️ A verificar pelo implementador (Gate 0)** para cada premissa não verificada.

Snippet de código proposto deve declarar que **todos os símbolos/campos citados existem** na fonte. Snippet não verificado = **direcional, não copiável** (Lição #125).

Violação = despacho rejeitado pelo implementador via **REGRA-ORQ-22 Nível 1** (bloqueante técnico).

### Incidentes que motivaram (todos pegos tarde, pelo Gate 0 do implementador)

| Despacho | Premissa errada | Realidade |
|---|---|---|
| v8/v10 | coluna `status` | não existe (mig 0076) |
| v18 | coluna `source_basis` | não existe — usa `legal_reference` |
| v10 | regime `aliquota_reduzida_60_insumos_agro` | committed é `aliquota_reduzida_60` (#1108) |
| v10 | "criar 2302/2303/2304/2306/2309" | já feitos (PR #1108) |
| v16 | `ncm LIKE '23.01%'` | formato real `'2301'` |
| v20 | regime `aliquota_reduzida_bens_capital` | não existe nos seeds |
| #1276 | snippet `c.cnaeGroups` + `matchesCnaeBoundary` | no-op duplo (campo descartado + fallback `<50`) |

### Vinculadas

- REGRA-ORQ-22 (crítica Nível 1) · REGRA-ORQ-database (Gate 0 schema) · REGRA-ORQ-35 (NUNCA ASSUMA) · REGRA-ORQ-41 (impact-tree)
- `docs/governance/SCHEMA-REFERENCE.md` (fonte de verdade de schema, mantida por Claude Code)
- Lições #125 (snippet direcional) · #126 (PDF > corpus) · #127 (issues planejadas) · #128 (gates não-required)

## REGRA-ORQ-46 — Lição identificada = PR obrigatório na mesma sessão

**Regra:** Toda lição identificada durante uma sessão DEVE ser commitada em `.claude/rules/governance.md` antes do encerramento (ORQ-19 Passo 8). Não é permitido adiar lições para "próxima sessão" ou deixá-las apenas em memo.

**Gatilho:** Qualquer despacho que contenha "Lição #NNN" ou "registrar em governance.md" aciona obrigação de PR `chore/licoes-*` antes do ORQ-19.

**Responsável:** Claude Code abre o PR; P.O. autoriza merge.

**Anti-padrão proibido:**
- ❌ "Lição #NNN — registrar em próxima sessão"
- ❌ "Lição #NNN — backlog"
- ❌ Lição apenas em memo do Orquestrador

**Padrão correto:**
- ✅ Lição identificada → PR `chore/licoes-*` → merge antes do ORQ-19
- ✅ Se sessão encerrar sem PR de lições: ORQ-19 veredito = 🟡 Processo

**Vinculadas:** REGRA-ORQ-19 (Passo 8) · REGRA-ORQ-45 (Gate 0 do emissor) · Lições #131/#132 (origem)

## REGRA-ORQ-47 — DoD obrigatório de filtro + 🟡 do impact-tree vira item rastreável

**Vigência:** permanente, a partir de 19/06/2026
**Origem:** BUG-REGIME-FILTER-01 — "spec clara, bug básico passou" (DoD não-discriminante + 🟡 do AS-IS evaporado)
**Severidade:** governança — fecha a classe de filtro permissivo mascarado + análise que não vira DoD

### (a) DoD obrigatório de filtro/gate

Toda feature de **filtro/gate de exibição** (regime, CNAE, elegibilidade, scope, visibilidade condicional) tem DoD **inválido** sem **3 casos** — todos em **dado real no consumer final**:

1. **Positivo:** a chave casa → **inclui**.
2. **Negativo discriminante:** a chave **diferente** (não-casante) → **exclui**. (Lição #139 — é o que prova o gate; o positivo pode passar por permissividade.)
3. **Neutro:** universal/sem valor → comportamento **documentado** (permissivo ou restritivo, explícito).

### (b) 🟡 do impact-tree vira item rastreável

Todo risco **🟡 levantado na skill `impact-tree`/AS-IS** DEVE virar **item explícito de DoD ou blocker** no PR — **não pode permanecer só como nota**. Se um 🟡 do AS-IS não tem item de DoD correspondente, `validate-pr`/review **reprova**. *(Fecha o gap "a análise viu, a implementação não tratou" — caso canônico: o dual-storage do `taxRegime` flagado no AS-IS do F4 e ignorado.)*

### Enforcement

- **Imediato (declarativo):** checklist no PR template — "Feature de filtro/gate? → 3 casos de DoD (a)"; "🟡 do AS-IS sem item de DoD? → blocker (b)".
- **Futuro (mecânico):** `validate-pr` exige, em PRs com label `filtro`/`gate`, a seção "DoD discriminante (positivo+negativo+neutro)".

### Vinculadas

REGRA-ORQ-44 (DoD negativo por consumer) — esta estende p/ filtros · REGRA-ORQ-41 (impact-tree) · [[Lição #138]] · [[Lição #139]] · [[Lição #140]] · [[Lição #124]] · BUG-REGIME-FILTER-01

