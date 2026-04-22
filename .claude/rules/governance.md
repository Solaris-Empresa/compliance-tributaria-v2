---
description: Governance rules, ORQ rules, gates, sprint flow, PR conventions, and orchestrator protocols
globs:
  - "docs/governance/**"
---

# Governance Rules

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
