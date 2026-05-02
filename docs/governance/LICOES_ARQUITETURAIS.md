# Lições Arquiteturais

Documento referência atemporal das lições do projeto IA SOLARIS.

Lições consolidadas em 2026-04-30 (mergeadas em 2026-05-01 via PR #888).

## Lições consolidadas nesta sessão

### #41 — Smoke real em prod é gate de release efetivo

Smoke real em produção é o único gate efetivo de release. Suite passar não substitui validação empírica em prod com dados reais. Validada empiricamente 4 vezes na sessão 2026-04-30:

- BUG-FIN-NBS descoberto via smoke (PR #884)
- BUG-FIN-OBJETO descoberto via smoke (PR #885)
- BUG-V3 descoberto via smoke + pré-análise (PR #886)
- M3-PROMPT-0-BIS PASS empírico via projeto 2460001

### #42 — Reporte de smoke deve explicitar caso testado vs caso real esperado

Smoke pode passar para um caso e falhar para outro. Reporte deve explicitar exatamente qual cenário foi exercitado. Sem isso, falsos positivos. Validada quando Manus reportou Smoke 6 PASS com NBS canonical mas o caso real (sem NBS) ainda quebrava.

### #43 — Engine multi-camada exige callgraph completo

Fixes em engine multi-camada exigem mapear callgraph completo do input ao output, antes de definir escopo. Para cada caminho de input distinto (campo presente/vazio/inválido), validar manualmente que fix proposto é alcançado. Validada quando PR #885 corrigiu deriveObjeto mas não alcançava deriveObjetoForSeed quando nbss=[] — bug latente capturado em pré-análise.

### #44 — Pré-análise é diagnóstico onde há lacuna, não ritual obrigatório

Quando smoke real, PDFs, logs ou screenshots cobrem o comportamento de uma camada, incorporar evidência ao mapeamento sem repetir investigação estática. Sem este critério, Lição #43 vira micro-management procedimental que atrita ciclo de entrega. Validada quando pré-análise frontend foi pulada (PDFs do smoke já eram evidência) e M3-PROMPT-0-BIS reaproveitou projeto 2460001 em vez de criar novo.

### #45 — Despachos paralelos exigem isolamento de working tree

Paralelização literal de múltiplas tarefas git no mesmo working tree é fisicamente impossível. HEAD é único. Soluções: (a) sequencial, (b) `git worktree add` separados, (c) executor diferente por máquina.

Aplicação adicional: paths absolutos em prompts devem confirmar OS de destino — `/tmp/` (Unix) ≠ `D:\...\temp\` (Windows). Validar paths antes de despachar.

Validada empiricamente esta sessão via crítica Claude Code do despacho M3 paralelo V1 antes de execução.

### #46 — Validar empiricamente o estado de ambiente antes de propor guard

Antes de afirmar "guard X resolve cenário Y", confirmar:

- Variáveis de ambiente reais no contexto-alvo (CI, dev, prod)
- Secrets configurados (visibilidade limitada — pedir Manus auditar quando necessário)
- Estado de infra (DB acessível? firewall? timeout?)

Sem isso, guard pode ser **cosmético** (não disparar pelo critério que se imagina) ou **ineficaz** (não cobrir o cenário real).

Validada empiricamente em PR #896 (graceful skip DB tests):

- Claude Code propôs `SKIP_DB_TESTS = !process.env.DATABASE_URL || process.env.CI === "true"`
- Manus auditou AUTH-4 e mostrou que `DATABASE_URL` está configurado como secret no CI — primeiro check do Claude Code era cosmético (sempre falso)
- Estratégia A do Manus adotada: `process.env.CI === "true" && !process.env.CI_HAS_TEST_DB`
- Future-proof: pós Issue #873, secret `CI_HAS_TEST_DB=true` desativa guard sem PR

Aplicação direta de Lição #43 (callgraph completo) ao domínio de variáveis de ambiente. Subordinada à Lição #44: validação empírica é diagnóstico onde há lacuna de visibilidade entre agentes (Claude Code não vê secrets GitHub; Manus vê).

## Trigger PR-FIN-OBJETO-V3 (reativo)

PR-FIN-OBJETO-V3 (generalização Mudança 1 + Mudança 2 V2 para outros setores regulados) é REATIVO, não preemptivo.

Trigger: cliente saúde regulada OU energia OU telecom OU combustíveis OU transporte entra na carteira E reproduz cenário análogo BUG-FIN-OBJETO (papel=operadora_regulada + objeto incorreto OU status="inconsistente" por NBS ausente).

Sem esse trigger, V3 fica em backlog M3 indefinidamente. Aplicação Lição #41 (smoke real é gate) + Lição #44 (pré-análise onde há lacuna).

## Lições #1-#40 — Consolidação pendente

Status: lições espalhadas em PRs antigos, sprint logs e comentários históricos.

Sprint dedicado futuro deve varrer:

- `git log --all --grep="Lição"`
- `docs/governance/PROMPT_HANDOFF_ORQUESTRADOR.md` histórico
- `.claude/rules/governance.md` (lições #32, #39 referenciadas)
- `docs/governance/BACKLOG_M3.md` histórico
- Corpos PR #100-#870

| # | Lição | Fonte conhecida |
|---|---|---|
| #1-#31 | placeholder | git log + handoffs |
| #32 | Adapter sem cobertura → bugs sequenciais | governance.md |
| #33-#38 | placeholder | git log + handoffs |
| #39 | [referenciada governance.md] | governance.md |
| #40 | placeholder | git log + handoffs |
| #41-#45 | consolidadas acima | sessão 2026-04-30 (mergeada via PR #890) |
| #46 | Validar empiricamente o estado de ambiente antes de propor guard | sessão 2026-05-01 (PR #896) |

## Próximas lições

Documento crescerá conforme novas lições emergem. Cada PR/sprint que produzir aprendizado arquitetural deve adicionar lição numerada sequencialmente.
