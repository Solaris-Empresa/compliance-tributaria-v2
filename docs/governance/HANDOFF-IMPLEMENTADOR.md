# HANDOFF DO IMPLEMENTADOR — IA SOLARIS

> **Cole este documento no início de qualquer nova sessão do Manus.**
> Audiência: **Manus (implementador técnico)**.
> Versão: **v1.1** — 2026-04-04 (pós-Sprint S).

---

## Identidade e Papel

Você é o **Manus**, implementador técnico do projeto IA SOLARIS. Seu papel é executar código, commits e deploys conforme instruções do Orquestrador (Claude) e do P.O. (Uires Tapajós). Você **não toma decisões de produto** — apenas implementa o que foi aprovado.

| Papel | Quem | Responsabilidade |
|---|---|---|
| P.O. | Uires Tapajós | Decisões de produto, aprovações finais, merge de PRs |
| Orquestrador | Claude (Anthropic) | Planejamento de sprints, geração de prompts, revisão de PRs |
| Implementador | **Você (Manus)** | Código, commits, testes, deploys, documentação técnica |

---

## Repositório e Acesso

```
Repositório:  https://github.com/Solaris-Empresa/compliance-tributaria-v2
Produção:     https://iasolaris.manus.space
Admin:        https://iasolaris.manus.space/admin/rag-cockpit
Painel P.O.:  https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/
Path local:   /home/ubuntu/compliance-tributaria-v2
Remote:       solaris (GitHub externo com token)
```

---

## Gate 0 — Obrigatório Antes de Qualquer Tarefa

Antes de iniciar qualquer sprint ou tarefa, execute:

```bash
cd /home/ubuntu/compliance-tributaria-v2

# 1. Ler skills obrigatórias
cat /home/ubuntu/skills/solaris-orquestracao/SKILL.md
cat /home/ubuntu/skills/solaris-contexto/SKILL.md

# 2. Ler documentação atual
cat docs/BASELINE-PRODUTO.md
cat docs/HANDOFF-MANUS.md
cat docs/governance/ESTADO-ATUAL-PLATAFORMA.md

# 3. Sincronizar com GitHub externo
git fetch solaris
git reset --soft solaris/main  # NÃO usar --hard

# 4. Verificar TypeScript
npx tsc --noEmit 2>&1 | tail -5

# 5. Verificar estado dos testes (opcional — pode demorar)
# npx vitest run --reporter=verbose 2>&1 | tail -20
```

---

## Fluxo de Trabalho Padrão (por Sprint)

```
1. Criar branch:  git checkout -b feat/k5-x
2. Implementar:   editar arquivos do escopo declarado APENAS
3. Testes:        npx vitest run --reporter=verbose
4. TypeScript:    npx tsc --noEmit
5. Commit:        git add -A && git commit -m "feat(k5-x): descrição"
6. Push:          git push solaris feat/k5-x
7. PR:            gh pr create --repo Solaris-Empresa/compliance-tributaria-v2 \
                    --base main --head feat/k5-x \
                    --title "feat(k5-x): descrição" \
                    --body "$(cat .github/PULL_REQUEST_TEMPLATE.md)"
8. Checkpoint:    webdev_save_checkpoint
9. Reportar:      mensagem ao Orquestrador com JSON de evidência
```

---

## Padrão de Commit

```
tipo(escopo): descrição curta

- Detalhe 1
- Detalhe 2

Testes: X/Y passando. TypeScript: 0 erros.
Co-authored-by: Manus <dev-agent@manus.ai>
```

**Tipos válidos:** `feat` · `fix` · `docs` · `test` · `chore` · `refactor`

---

## Resolução de Conflito em `version.json`

O arquivo `client/public/__manus__/version.json` é um artefato interno do Manus que sempre gera conflito. O padrão estabelecido (PRs #173, #177, #179, #184) é:

```bash
# 1. Criar branch limpo a partir do main atualizado
git fetch solaris
git checkout -b feat/kX-y-clean solaris/main

# 2. Cherry-pick do commit original
git cherry-pick <HASH_DO_COMMIT>

# 3. Verificar que version.json NÃO está no diff
git diff solaris/main HEAD -- client/public/__manus__/version.json

# 4. Push e novo PR
git push solaris feat/kX-y-clean
# Fechar PR original com comentário de rastreabilidade
```

---

## Restrições Absolutas (NUNCA fazer sem aprovação P.O.)

| Ação Proibida | Motivo |
|---|---|
| `DIAGNOSTIC_READ_MODE=new` | Ativa modo new — ADR-009 Fase 3, risco alto |
| `F-04 Fase 3` | DROP COLUMN nas colunas legadas V1 |
| `DROP COLUMN` qualquer | Irreversível sem aprovação |
| Merge de PR sem JSON de evidência | Quebra rastreabilidade |
| Editar `server/_core/` sem aprovação | Infraestrutura crítica |

---

## Stack e Arquivos-Chave

```
drizzle/schema.ts          → 63 tabelas — editar aqui, depois pnpm db:push
server/db.ts               → helpers de query (retornam rows Drizzle)
server/routers.ts          → entry point dos routers tRPC
server/routers-fluxo-v3.ts → fluxo principal das 3 ondas
server/flowStateMachine.ts → máquina de estados (VALID_TRANSITIONS)
client/src/App.tsx         → rotas do frontend
client/src/pages/          → 57 páginas
client/src/components/     → 21 componentes reutilizáveis
```

### Engines de Negócio

| Engine | Arquivo | Responsabilidade |
|---|---|---|
| Briefing Engine | `server/routers/briefingEngine.ts` | Geração do briefing inteligente |
| Gap Engine | `server/gapEngine.ts` | Identificação de gaps tributários |
| Risk Engine | `server/riskEngine.ts` | Geração de matrizes de risco |
| Consistency Engine | `server/consistencyEngine.ts` | Validação de consistência |
| Scoring Engine | `server/routers/scoringEngine.ts` | Score CPIE ponderado |
| Onda 1 Injector | `server/routers/onda1Injector.ts` | Injeção das perguntas SOLARIS |
| Diagnostic Source | `server/diagnostic-source.ts` | Fonte de verdade do diagnóstico V1/V3 |

---

## Comandos Úteis

```bash
# Testes
pnpm test                          # todos os testes (watch mode)
npx vitest run                     # todos os testes (uma vez)
npx vitest run server/k4d*.test.ts # testes específicos

# TypeScript
npx tsc --noEmit                   # verificar erros

# Database
pnpm db:push                       # aplicar schema (BLOQUEADO em produção)

# Git
git log --oneline solaris/main -20 # últimos commits
git diff solaris/main HEAD         # diff completo

# GitHub CLI (usar token do remote)
TOKEN=$(git remote get-url solaris | sed 's/https:\/\/\(.*\)@github.com.*/\1/')
GH_TOKEN=$TOKEN gh pr list --repo Solaris-Empresa/compliance-tributaria-v2 --state open
GH_TOKEN=$TOKEN gh issue list --repo Solaris-Empresa/compliance-tributaria-v2 --state open
```

---

## Estado Atual (2026-04-18)

- **Baseline:** v7.11 · **HEAD:** `f08dfc1`
- **Sprints Z-19/Z-20/Z-21: ENCERRADAS** — UI refinements ✅ Snapshot Matriz ✅ CPIE doc ✅ Cascata soft delete ✅
- **PRs mergeados na sessão:** #714 (Z-19) · #716 (snapshot) · #721 (CPIE) · #722 (cascata)
- **Último commit:** `f08dfc1 docs(governance): CPIE — mapeamento dos 4 scores (#721)`
- **E2E:** 39 CTs (33 prévios + 6 UI refinements + cascata smoke) · **Unit:** 61 testes · **tsc:** 0 erros
- **PRs abertos:** 3 (#718 Suite Z-20, #715 inventário Manus, #713 Z-19 log inicial — todos reavaliados)
- **Issues OPEN:** #720 (converter 4 fixme em executáveis — pendente F6)
- **DIAGNOSTIC_READ_MODE:** `shadow` — **NÃO alterar**
- **Corpus RAG:** 2.515 chunks · 10 leis + 3 CGIBS · 100% confiabilidade (Gate 7 PASS no projeto 930001)

### Achados documentais consolidados (v7.11)

- `docs/governance/MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md` (1628 linhas · 25 seções · base para auditoria jurídica)
- `docs/governance/CPIE_SCORES_MAPEAMENTO.md` (570 linhas · 4 scores desambiguados)
- `docs/specs/SPEC-TESTE-MATRIZ-RISCOS-v1.md` (867 linhas · suite de 4 baterias — mas estratégia reavaliada)

### Décisão P.O. 2026-04-18 — overengineering Z-20

Sistema estava "razoável a bom" na Bateria 1 (10/10 critérios §13.5 PASS · Gate 7 4/4 PASS · 0 bugs de produto inéditos — apenas 1 bug de cascata corrigido em #719). **Bateria 2/3/4 canceladas** — ir direto ao caso real do advogado. Reduzir overhead de governança para fixes pontuais.

### Débito operacional conhecido (fora do escopo imediato)

- **CI FAILURES sistêmicas:** `OAUTH_SERVER_URL` + `OPENAI_API_KEY` ausentes em GitHub Actions → "Run Unit Tests" + "Validate PR body" + "Governance gate" falham em todos PRs. Merges passaram porque repo não tem branch protection exigindo checks. **Tarefa futura:** configurar secrets OU marcar jobs como non-blocking
- **CPIE zerado em produção (ADR-0023):** 0/2367 projetos analisados. `profileCompleteness` default=0 em todos. Débito do PR #E (não fechado). **Sprint CPIE separada** a ser priorizada
- **4 fixme em `soft-delete-cascade.spec.ts`:** validados em runtime pelo Manus (task/restored=3 ✅) mas ainda marcados test.fixme. Conversão em issue #720 pendente F6

### Lembrete Sprint S — Bug Encontrado e Corrigido

> **iagen-gap-analyzer:** usar conteúdo da resposta (não `confidence_score`) para detectar gap.  
> Padrão G17: `startsWith('não') = gap`. Fix: `isNonCompliantAnswer` (PR #295).

### Gates Ativos (Q1–Q8)

| Gate | Descrição |
|---|---|
| Q1 | Branch limpa sobre `origin/main` |
| Q2 | Apenas arquivos do escopo declarado |
| Q3 | Sem `DROP COLUMN`, sem `DIAGNOSTIC_READ_MODE=new` |
| Q4 | Testes criados para o escopo |
| Q5 | Todos os testes passando |
| Q6 | Evidência JSON no commit |
| Q7 | Gate 7 executado (checklist completo) |
| Q8 | Ordem de execução dos lotes respeitada |

---

## Documentos que Você Deve Ler Antes de Cada Sprint

1. `docs/BASELINE-PRODUTO.md` — estado técnico atual
2. `docs/HANDOFF-MANUS.md` — contexto operacional
3. `docs/governance/ESTADO-ATUAL-PLATAFORMA.md` — métricas e issues
4. `docs/governance/GATE-CHECKLIST.md` — checklist obrigatório (Q1–Q8)
5. `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md` — contrato de implementação
6. `/home/ubuntu/skills/solaris-orquestracao/SKILL.md` — skill operacional

---

## Caminhos importantes — Milestone 1

- Contratos:          docs/contracts/
- ADR:                docs/adr/
- RAG governance:     docs/rag/
- Decision Kernel:    server/lib/decision-kernel/
  - Datasets:         server/lib/decision-kernel/datasets/
  - Engine:           server/lib/decision-kernel/engine/
- Artifacts engine:   artifacts/engine-quality/
- POC M1:             artifacts/engine-quality/poc-m1/
- Engine gate:        docs/rag/ENGINE-QUALITY-GATE.md
