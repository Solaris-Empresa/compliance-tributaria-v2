# FRAMEWORK DE GOVERNANÇA — IA SOLARIS
## Mitigação de Falhas do Orquestrador e do Implementador
**Versão:** 1.0 — 2026-03-26
**Audiência:** P.O. · Orquestrador (Claude) · Implementador (Manus)

> Este documento registra o nível de maturidade de governança atingido ao final da Sprint 98% B2.
> Criado após identificação de 4 falhas de controle em 2026-03-26. É o "porquê" por trás de cada controle ativo.

---

## Sumário executivo

| Indicador | Valor |
|---|---|
| Gates ativos | **4** (Gate 0 · Gate 1 · Gate 2 · Gate 3) |
| Skills permanentes | **2** (solaris-contexto · solaris-orquestracao) |
| Bloqueios ativos | **3** (DIAGNOSTIC_READ_MODE · F-04 · DROP COLUMN) |
| Invariants testados automaticamente | **8** (INV-001..INV-008) |

---

## Seção 1 — Ciclo de vida e controles por fase

| Fase | Quando | Por que | O que está sendo feito | Como fazer | Responsável |
|---|---|---|---|---|---|
| **Abertura de sessão** | Todo chat | Sem verificação inicial, Claude opera com contexto desatualizado e replica erros | **Gate 0** — ler baseline, confirmar commit HEAD, verificar se o que será implementado já existe | Skill `solaris-contexto` executa Gate 0 automaticamente | Claude |
| **Planejamento de sprint** | Pré-prompt | Sprints foram planejadas sem verificar implementações existentes (engines B2–B7 ignoradas) | **Gate 1** — buscar no repo se o que será implementado já existe antes de gerar qualquer prompt | `project_knowledge_search` obrigatório antes de qualquer prompt técnico | Claude |
| **Implementação** | Por PR | Manus pode implementar na direção errada, criar regressões ou sair do escopo sem controle | Skill `/solaris-orquestracao` — checklist de início, padrão de commits, bloqueios permanentes | Manus digita `/solaris-orquestracao` antes de qualquer tarefa | Manus |
| **Revisão de PR** | Por PR | Contagem de testes 44 vs 99 foi aprovada sem verificação; arquivos fora do escopo passaram | **Gate 2** — número exato de testes, arquivos declarados = arquivos alterados | Claude verifica o PDF do PR antes de autorizar merge | Claude + P.O. |
| **Pós-merge** | Por PR | Baseline ficou desatualizado por 4 sprints; HANDOFF não refletia o estado real | **Gate 3** — confirmar commit HEAD, atualizar baseline, HANDOFF-MANUS | Prompt de rollout gerado pelo Claude; Manus abre PR de documentação | Claude + Manus |
| **Encerramento de sessão** | Por sessão | Sem handoff, a próxima sessão começa do zero; decisões e contexto são perdidos | Handoff de sessão + Snapshot imutável + Baseline atualizado | P.O. pede rollout → Claude gera prompt → Manus executa PR Nível 1 | P.O. → Claude → Manus |
| **Retomada de sessão** | Próximo chat | Claude não tem memória entre sessões — sem contexto explícito, retrabalho é inevitável | P.O. cola handoff de sessão no novo chat; Claude executa Gate 0 e confirma estado | Copiar texto de `docs/handoffs/HANDOFF-SESSAO-[data].md` | P.O. |

---

## Seção 2 — Falhas do Orquestrador identificadas e corrigidas

| Falha identificada | Data | Impacto real | Causa raiz | Controle implementado | Status |
|---|---|---|---|---|---|
| Engines B2–B7 já existiam; planejamento ignorou | 2026-03-26 | Sprint B2 reescrita; ciclo de diagnóstico adicional | Gate 0 não executado — Claude não buscou no repo antes de planejar | Gate 0 item 5: "para cada sprint, buscar no repo se já existe implementação" | ✅ Corrigido |
| G12/G13 planejados sem saber cobertura do B2 | 2026-03-26 | Sprint F suspensa corretamente; evitou retrabalho maior | Gate 0 não verificou gaps propostos contra arquitetura planejada | Gate 0 item 6: "gaps propostos não cobertos por arquitetura já planejada?" | ✅ Corrigido |
| Baseline desatualizado por 4 sprints | 2026-03-26 | Handoff com estado errado; risco de decisões baseadas em dados obsoletos | Gate 3 não executado após merges; dívida de documentação acumulada | Gate 3: "baseline atualizado ou PR agendado imediatamente após merge" | ✅ Corrigido |
| Contagem 44 vs 99 testes aprovada sem verificação | 2026-03-26 | Ciclo extra de correção; confiabilidade do report questionada | Gate 2 não verificou número exato de testes antes de aprovar merge | Gate 2 item 1: "número no PR body bate com o esperado — nunca aproximado" | ✅ Corrigido |
| Operação sem memória entre sessões | Estrutural | Contexto perdido; decisões repetidas; retrabalho em toda nova sessão | Limitação arquitetural — Claude não persiste memória entre chats | Skill `solaris-contexto` + Handoff de sessão + Baseline vivo | 🔵 Mitigado |
| Egress de rede bloqueado no bash_tool | Estrutural | Impossibilidade de push autônomo ao GitHub; autonomia técnica limitada | Restrição de segurança da Anthropic — sem contorno via chat | Modus operandi atual mantido; Deploy key criada para futuro com Claude Code | 🟡 Aceito |

---

## Seção 3 — Riscos do Implementador e controles

| Risco | Probabilidade | Impacto | Controle preventivo | Controle detectivo | Responsável |
|---|---|---|---|---|---|
| Implementar na direção errada (escopo incorreto) | Médio | Alto | Skill: leitura obrigatória + 3 perguntas críticas antes de qualquer código | Claude verifica arquivos alterados vs escopo declarado no Gate 2 | Claude (Gate 2) |
| Introduzir regressões em testes existentes | Médio | Alto | Skill: `pnpm test` obrigatório antes de qualquer commit | CI/CD: 4 checks obrigatórios no ruleset `main-protection` | CI/CD automático |
| Ativar bloqueios permanentes | Baixo | Crítico | Skill: seção "Bloqueios permanentes" — DIAGNOSTIC_READ_MODE, F-04, DROP COLUMN | Governance gate no CI bloqueia commits que toquem nas flags bloqueadas | Skill + CI/CD |
| Não atualizar baseline após sprint | Médio | Médio | Skill: "Obrigações pós-implementação" — BASELINE e HANDOFF obrigatórios | Gate 0 do Orquestrador detecta desatualização na próxima sessão | Manus (skill) + Claude (Gate 0) |
| Conflito de merge por branch desatualizada | Médio | Baixo | Skill: `git fetch + rebase` antes de push | GitHub indica "Merge conflicts" no PR — Claude instrui resolução | Manus |
| Testes travados no CI (Issue #101) | Baixo | Baixo | `skipIf(isCI)` aplicado nos 9 testes de corpus com chamadas reais de rede | CI passa com 14/18 checks; os 4 restantes são conhecidos e rastreados | Rastreado — Sprint I |
| Commit com TypeScript errors | Baixo | Médio | Skill: `npx tsc --noEmit` obrigatório antes de PR | CI check "Validate PR body" bloqueia merge se TypeScript falhar | CI/CD automático |

---

## Seção 4 — Gates 0–3: definição completa

### Gate 0 — Abertura de sessão
**Executar:** antes de qualquer trabalho em qualquer sessão
**O que bloqueia se falhar:** qualquer prompt de implementação

```
□ Versão e commit do BASELINE-PRODUTO.md
□ Último PR mergeado bate com versão do baseline?
□ Há PRs abertos sem baseline atualizado?
□ HANDOFF-MANUS.md reflete o estado real?
□ Para cada sprint planejada: o que vou implementar já existe no repo?
□ Gaps propostos não cobertos por arquitetura já planejada?
```

### Gate 1 — Pré-prompt de implementação
**Executar:** antes de gerar qualquer prompt técnico para o Manus
**O que bloqueia se falhar:** geração do prompt para Manus

```
□ O que será implementado já existe no repositório?
□ Engines/funções referenciadas existem nos arquivos corretos?
□ Campos/schemas referenciados já existem?
□ Issue do Milestone correspondente está aberta?
□ Prompt inclui leitura obrigatória dos arquivos relevantes?
□ Prompt inclui perguntas de confirmação antes da implementação?
```

### Gate 2 — Revisão de PR
**Executar:** antes de autorizar merge de qualquer PR
**O que bloqueia se falhar:** merge do PR

```
□ Número de testes bate com baseline anterior + novos declarados?
□ Arquivos alterados = escopo declarado no PR body?
□ Nenhum arquivo fora do escopo?
□ Double-run executado (quando aplicável)?
□ BASELINE atualizado neste PR ou PR agendado imediatamente?
□ Issues fechadas por este PR estão corretas?
```

### Gate 3 — Pós-merge
**Executar:** imediatamente após todo merge
**O que bloqueia se falhar:** início da próxima sprint

```
□ Commit HEAD bate com o do PR mergeado?
□ Contagem de testes pós-merge confirmada?
□ Baseline atualizado — se não: prompt gerado agora?
□ HANDOFF-MANUS atualizado se necessário?
```

### Regra de ouro

> **Nenhum prompt de implementação sem Gate 0 + Gate 1.**
> **Nenhum merge sem Gate 2.**
> **Baseline nunca desatualizado por mais de 1 sprint.**

---

## Seção 5 — Skills e mecanismos de persistência de contexto

| Mecanismo | Plataforma | Como ativar | O que contém | Problema que resolve | Status |
|---|---|---|---|---|---|
| **solaris-contexto** | Claude (claude.ai) | Global — ativa automaticamente em toda sessão do Project | Gate 0 obrigatório · estado atual · bloqueios permanentes · referências rápidas | Claude operava sem contexto do projeto em cada nova sessão | ✅ Ativo |
| **solaris-orquestracao** | Manus | Manus digita `/solaris-orquestracao` no início de qualquer tarefa | Checklist de início · padrão de commits · template de PR · obrigações pós-sprint · bloqueios | Regras eram repetidas em cada prompt — inconsistências e omissões | ✅ Ativo |
| **GATE-CHECKLIST.md** | Repositório | Leitura obrigatória via `docs/GATE-CHECKLIST.md` | Definição formal dos Gates 0–3 · histórico de falhas · regra de ouro | Controles existiam apenas na memória da sessão — não persistiam | ✅ Na main |
| **HANDOFF-SESSAO** | Repositório | P.O. cola conteúdo no início do próximo chat | O que foi feito · decisões tomadas · como retomar · texto de handoff pronto | Sem handoff, cada sessão começava do zero sem contexto das decisões | ✅ Por sessão |
| **SNAPSHOT-[sprint]** | Repositório | Criado automaticamente ao final de cada bloco de sprint | Estado imutável do produto · cadeia de rastreabilidade · métricas do bloco | Sem ponto de auditoria imutável, impossível saber o que estava correto antes de uma regressão | ✅ Por bloco |

---

## Referências

- `docs/GATE-CHECKLIST.md` — gates em formato de checklist
- `docs/HANDOFF-MANUS.md` — estado atual para handoff ao Manus
- `docs/guias/GUIA-PO-ROLLOUT-ENTRE-SESSOES.md` — visão do P.O. sobre rollout
- `.claude/skills/solaris-contexto/SKILL.md` — skill do Claude
- `.manus/skills/solaris-orquestracao/SKILL.md` — skill do Manus
- `docs/BASELINE-PRODUTO.md` — fonte de verdade do produto

---

*Criado pelo Orquestrador (Claude — Anthropic) em 2026-03-26*
*Atualizar sempre que um novo controle for implementado ou uma nova falha identificada*
