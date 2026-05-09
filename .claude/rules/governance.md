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

## REGRA-ORQ-33 — Matriz RACI Operacional

Vigência: permanente, a partir de 2026-05-04
Origem: Decisão P.O. Sprint M3.7 — definição formal de papéis
Severidade: governança operacional — define ownership de cada etapa do fluxo

### Matriz de papéis

| Papel | Pessoa/Sistema | Atribuição |
|---|---|---|
| **R** — Responsible | Claude Code | Implementar código (escreve PRs, aplica REGRA-ORQ-28 quando aplicável) |
| **A** — Accountable | P.O. (Uires Tapajós) | Aprovação final de specs e merges |
| **C** — Consulted | Consultor (ChatGPT) | Análise crítica, sugestão de design, parecer técnico |
| **I** — Informed (executor) | Manus | Review pós-implementação + deploy em produção |

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

## CHECKLIST-VAL-01 — Rastreamento end-to-end obrigatório para fixes de validação

Vigência: permanente, a partir de 2026-05-07
Origem: Lição #74 (caso canônico PR #1015)
Severidade: bloqueante — fix não pode ser implementado sem checklist respondido

### Quando aplicar

SEMPRE que o fix tocar um dos seguintes arquivos/funções:

- `validateM1Input.ts` (e variantes `validateM1Seed*`)
- `computeMissing*` (qualquer função que produza `missing_required_fields`)
- `computeStatus.ts` (qualquer função que derive `status_arquetipo`)
- `buildSnapshot` (composição final do snapshot)
- `buildPerfilEntidade.ts` (engine principal)
- Qualquer função que produza ou consuma `status_arquetipo`,
  `missing_required_fields` ou `blockers_triggered`

### 5 perguntas obrigatórias antes de codar

**Q1.** Qual é o sintoma exato reportado pelo P.O. **na UI**?
(Não o erro técnico — o que o usuário **vê**.)

> Exemplo PR #1015: "Botão 'Confirmar Perfil da Entidade' desabilitado"
> NÃO: "validateM1Seed lança NBS_REQUIRED"

**Q2.** Mapa completo do fluxo end-to-end:

```
campo no form → mutation → DB → query → snapshot →
JSON de resposta → componente → estado UI → indicador visual
```

Listar **todos** os arquivos e funções no caminho. Citar `arquivo:linha`
para cada nó (REGRA-ORQ-27).

**Q3.** Para cada arquivo no caminho Q2: existe validação/gate que também
verifica o campo que estou alterando?

Listar `arquivo:linha` de **cada** gate encontrado. Verificar:
- Throws (TRPCError, Error customizado)
- Adições a arrays de erro/missing/blockers
- Branches condicionais que afetam status downstream
- Filtros que descartam dado

**Q4.** Se eu aplicar meu fix e simular mentalmente o cenário do P.O.,
qual é o valor de `status_arquetipo` retornado ao frontend?

É `"confirmado"`? Se não — **por quê?** Detalhar a função e linha que
força o valor não-confirmado.

> Exemplo PR #1015: pós-fix, `status_arquetipo === "inconsistente"`
> porque `computeStatus.ts:96-102` força quando
> `missing_required_fields.length > 0`.

**Q5.** Existe test existente que documenta o comportamento que estou
alterando?

Se sim:
- O test vai **FALHAR** após meu fix (comportamento mudou) **OU**
- O test vai **PASSAR** (comportamento preservado)?

Se passar: **confirmar explicitamente** que "passar" significa
"problema resolvido" e não "comportamento bloqueante preservado"
(Lição #59 — assemble vs consumption).

> Exemplo PR #1015: test `T73` em `build-perfil-entidade-pr-fin-objeto-v2.test.ts:137-146`
> documenta `status_arquetipo === "inconsistente"`. Pós-fix #1015 o test
> ainda passa **porque o comportamento bloqueante foi preservado**.
> Sinal de fix incompleto, não de fix correto.

### Aplicação

- Respostas Q1-Q5 devem estar **no PR body** antes de abrir
- Sem CHECKLIST-VAL-01 respondido → PR rejeitado em review
- Respostas vagas ou inferidas (sem `arquivo:linha`) → autor solicitado
  a refazer antes de avançar

### Vinculadas

- Lição #74 (motivação — fix downstream incompleto)
- REGRA-ORQ-27 (validação de consumo — citação `arquivo:linha`)
- REGRA-ORQ-35 (NUNCA ASSUMA — checklist Read Before Write)
- Lição #59 (assemble vs consumption)
- Lição #65 (fluxo end-to-end)
- CHECKLIST-REVIEW-01 (contramedida revisor)

## CHECKLIST-REVIEW-01 — Revisão obrigatória de PR que toca validação

Vigência: permanente, a partir de 2026-05-07
Origem: Lição #74 (caso canônico PR #1015)
Severidade: bloqueante — PR não pode ser mergeado sem checklist do revisor

### Quando aplicar

Aplicar pelo revisor (Manus) **antes de aprovar** qualquer PR que toque
os arquivos listados em CHECKLIST-VAL-01.

### 4 perguntas obrigatórias para revisor

**R1.** O PR body inclui as respostas ao CHECKLIST-VAL-01 (Q1 a Q5)?

Se não → solicitar antes de aprovar. PR sem CHECKLIST-VAL-01 respondido
**não pode ser mergeado**.

**R2.** A resposta Q4 do autor confirma `status_arquetipo === "confirmado"`
para o cenário reportado pelo P.O.?

Se não → **PR não resolve o sintoma**. Não aprovar. Solicitar autor
ampliar escopo para cobrir gates downstream.

> Caso canônico negativo: se autor responde Q4 com
> `"status_arquetipo === 'inconsistente'"` e justifica como
> "comportamento preservado por test T73", revisor deve **bloquear**.
> Comportamento preservado bloqueante = fix não resolve sintoma.

**R3.** Existe test E2E ou de integração que cobre o cenário completo
(form → `perfil.build` → `status_arquetipo === "confirmado"`)?

Se não → solicitar inclusão **OU** registrar como tech debt **explícito**
no PR body com:
- Justificativa de por que o test não foi incluído
- Issue de tracking para sprint futura
- Risco aceito declarado pelo P.O.

Tech debt sem justificativa explícita não é aceitável — solicitar antes
de aprovar.

**R4.** O diff toca apenas os arquivos declarados no escopo do fix?

Se sim **e** o sintoma envolve múltiplos gates (R2 negativo) → questionar
se o escopo está completo. Possível indicador de spec do P.O. cirúrgica
demais que não cobre o problema real.

> Caso canônico PR #1015: diff tocou apenas `validateM1Input.ts` (escopo
> declarado da spec) — mas sintoma "botão bloqueado" é controlado por
> `computeStatus.ts`. Diff cirúrgico não cobre o sintoma. R4 negativo
> → ampliar escopo OU bloquear merge.

### Aplicação

- Revisor responde R1-R4 **no comentário de review do PR**
- Respostas R1-R4 são **gate de aprovação** (não advisório)
- Se R1 ausente → bloquear merge sem fricção
- Se R2 negativo → bloquear merge mesmo com testes verdes
- Se R4 indica escopo insuficiente → escalar para P.O. (decisão de produto
  sobre ampliar spec ou aceitar fix parcial com tech debt declarado)

### Vinculadas

- Lição #74 (motivação)
- CHECKLIST-VAL-01 (autor produz respostas; revisor verifica)
- REGRA-ORQ-33 (RACI — Manus é o Validador)
- REGRA-ORQ-15 (PR body template — base para incluir CHECKLIST-VAL-01)

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
