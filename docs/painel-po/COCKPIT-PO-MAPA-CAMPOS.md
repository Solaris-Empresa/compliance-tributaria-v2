# Cockpit P.O. — Mapa de Seções e Campos

**Versão:** 1.0 — 2026-04-08  
**Arquivo-fonte:** `docs/painel-po/index.html`  
**URL pública:** https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/  
**Propósito:** Referência para manutenção do cockpit — distingue campos alimentados automaticamente pela API do GitHub dos campos que exigem atualização manual estática.

---

## Sumário de Seções

| # | ID / Âncora | Título | Tipo de dados |
|---|-------------|--------|---------------|
| 0 | `SECAO 0` | Entrada para Agentes de IA (I1) | 🔒 Estático |
| 0B | `SECAO 0B` | Checklist de Execução por Modo (I2) | 🔒 Estático |
| 1 | `SECAO 1` | Status do Projeto (I4: status acionável) | 🔄 Misto (API + estático) |
| 2 | `SECAO 2` | Radar de Governança | 🔄 Misto (API + estático) |
| 3 | `SECAO 3` | Painel de Sprint (Kanban) | 🔒 Estático |
| 4 | `SECAO 4` | Relatório de Documentação | 🌐 API GitHub (commits) |
| 5 | `SECAO 5` | Log de Decisões (C5: rastreabilidade) | 🔒 Estático |
| 6 | `SECAO 6` | Cockpit — 3 Ondas | 🔄 Misto (API + estático) |
| 6D | `secao6d-consistencia` | Consistência Global | 🌐 API GitHub (lazy) |
| 7 | `secao7-rag` | RAG — Rastreabilidade | 🔄 Misto (API + estático) |
| 7E | `secao7e-qualidade` | Qualidade do RAG | 🔒 Estático |
| 7E.7 | `secao7e7-desbloqueio` | Desbloqueio do RAG | 🔒 Estático |

**Legenda:**
- 🌐 **API GitHub** — campo atualizado automaticamente via `fetch` para `api.github.com`
- 🔒 **Estático** — campo hardcoded no HTML; requer edição manual do `index.html`
- 🔄 **Misto** — parte dos campos vem da API, parte é estática com fallback

---

## Seção 1 — Campos alimentados pela API GitHub

Função JavaScript: `fetchGitHubData()` (linha ~1867 do index.html)

| Campo no cockpit | ID HTML | Endpoint GitHub | Fallback estático |
|-----------------|---------|-----------------|-------------------|
| Score de Saúde (I3) — número | `healthScore` | `GET /repos/{repo}/commits/main` + `/actions/runs` + `/search/issues` | `94/100` |
| Issues abertas — detalhe | `radarIssuesDetail` | `GET /search/issues?q=repo:…+type:issue+state:open` | `24 abertas` |
| PRs abertos — detalhe | `radarPrsDetail` | `GET /repos/{repo}/pulls?state=open&per_page=100` | `0 PRs pendentes` |
| CI/CD — status | `radarCicdDetail` | `GET /repos/{repo}/actions/runs?per_page=1&branch=main` | `Verde` |
| CI — linha de detalhe | `radarCiDetail` | `GET /repos/{repo}/actions/runs` | `CI verde · 1.500+ testes` |
| HEAD — SHA + msg + data | `statusTestes` | `GET /repos/{repo}/commits/main` | `f22ea22 · docs: atualizar… · 2026-04-08` |
| Semáforo Issues | `sem-issues` | calculado de `openIssues` | âmbar |
| Semáforo PRs | `sem-prs` | calculado de `openPrs` | verde |
| Semáforo CI/CD | `sem-cicd` | calculado de `ciConclusion` | verde |
| Status GitHub (rodapé) | `ghStatus` | atualizado a cada ciclo | `⚠ GitHub offline — dados de 2026-04-08` |

---

## Seção 4 — Documentos monitorados via API GitHub

Função JavaScript: `fetchDocDates()` (linha ~2134 do index.html)  
Endpoint: `GET /repos/{repo}/commits?path={arquivo}&per_page=1`  
Para cada documento, o cockpit exibe: **data do último commit** + **SHA** + **badge de status** (✓ Atualizado / ⚠ Desatualizado).

| ID HTML (data) | Arquivo monitorado |
|----------------|-------------------|
| `doc-date-baseline` | `docs/BASELINE-PRODUTO.md` |
| `doc-date-changelog` | `CHANGELOG.md` |
| `doc-date-lifecycle` | `docs/PRODUCT-LIFECYCLE.md` |
| `doc-date-modelo-op` | `docs/MODELO-OPERACIONAL.md` |
| `doc-date-dod` | `docs/DEFINITION-OF-DONE.md` |
| `doc-date-adr010` | `docs/product/cpie-v2/produto/ADR-010-arquitetura-98pct.md` |
| `doc-date-adr008` | `docs/product/cpie-v2/produto/ADR-008-F04-schema-migration-strategy.md` |
| `doc-date-matriz-io` | `docs/product/cpie-v2/produto/MATRIZ-CANONICA-INPUTS-OUTPUTS.md` |
| `doc-date-matriz-rast` | `docs/product/cpie-v2/produto/MATRIZ-RASTREABILIDADE-REQ-PERGUNTA-GAP-RISCO-ACAO.md` |
| `doc-date-guia-uat` | `docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md` |
| `doc-date-faq` | `docs/suporte/FAQ.md` |
| `doc-date-manual` | `docs/suporte/MANUAL-USUARIO.md` |
| `doc-date-erros` | `docs/ERROS-CONHECIDOS.md` |
| `doc-date-auditoria` | `docs/product/cpie-v2/produto/AUDITORIA-COMPLIANCE-PLATAFORMA-v1.1.md` |
| `doc-date-handoff-manus` | `docs/HANDOFF-MANUS.md` |
| `doc-date-handoff-manus-4a` | `docs/HANDOFF-MANUS.md` *(duplicata — aba 4A)* |
| `doc-date-skill-orquestracao` | `skills/solaris-orquestracao/SKILL.md` |
| `doc-date-skill-contexto` | `skills/solaris-contexto/SKILL.md` |
| `doc-date-gate` | `docs/GATE-CHECKLIST.md` |
| `doc-date-manus-gov` | `docs/governance/MANUS-GOVERNANCE.md` |
| `doc-date-invariants` | `docs/governance/invariant-registry.md` |
| `doc-date-playrun` | `docs/governance/PLAYRUN-TEMPLATE.md` |
| `doc-date-estado-atual` | `docs/governance/ESTADO-ATUAL.md` |
| `doc-date-estado-atual-4a` | `docs/governance/ESTADO-ATUAL.md` *(duplicata — aba 4A)* |
| `doc-date-estado-plat` | `docs/governance/ESTADO-ATUAL-PLATAFORMA.md` |
| `doc-date-handoff-impl` | `docs/governance/HANDOFF-IMPLEMENTADOR.md` |
| `doc-date-ctx-orch` | `docs/governance/CONTEXTO-ORQUESTRADOR.md` |
| `doc-date-rastr-comp` | `docs/governance/RASTREABILIDADE-COMPLETA.md` |
| `doc-date-framework-gov` | `docs/governanca/FRAMEWORK-GOVERNANCA-IA-SOLARIS.md` |
| `doc-date-guia-rollout` | `docs/guias/GUIA-PO-ROLLOUT-ENTRE-SESSOES.md` |
| `doc-date-handoff-sess` | `docs/handoffs/HANDOFF-SESSAO-2026-03-26.md` |
| `doc-date-snapshot` | `docs/handoffs/SNAPSHOT-SPRINT-98-B2.md` |

> **Nota:** Estes campos são atualizados **automaticamente** quando o cockpit é aberto no browser. Não requerem edição manual no HTML.

---

## Campos Estáticos — Requerem Edição Manual no index.html

Estes campos **não são atualizados pela API** e precisam ser editados manualmente no `docs/painel-po/index.html` a cada sprint ou gate.

### Header do Cockpit

| Campo | Valor atual | Linha aprox. | Como atualizar |
|-------|-------------|--------------|----------------|
| Data do header | `2026-04-08` | ~8 | Alterar a data no `<span>` do header |
| Nome do P.O. | `Uires Tapajos` | ~8 | Alterar se mudar o P.O. |

### Seção 1 — Status do Projeto

| Campo | Valor atual | Como atualizar |
|-------|-------------|----------------|
| Versão do produto | `v4.8 Gate B ✅` | Editar o badge de versão |
| Sprint atual | `Sprint Z — Gate B ✅` | Editar o texto da sprint ativa |
| Próxima sprint | `Sprint Z-07` | Editar o texto da próxima sprint |
| Score de Saúde — fallback | `94/100` | Editar `FALLBACK` no JS (linha ~1875) |
| Linha de testes (fallback) | `1.500+ testes unitários (Gate B ✅)` | Editar `setText('scoreTsLine', ...)` |
| Linha TypeScript (fallback) | `TypeScript: 0 erros (Milestone 1)` | Editar `setText('scoreTsLine', ...)` |
| lastCommitSha (fallback) | `f22ea22` | Editar `FALLBACK.lastCommitSha` |
| lastCommitMsg (fallback) | `docs: atualizar documentação pós Gate B…` | Editar `FALLBACK.lastCommitMsg` |
| lastCommitDate (fallback) | `2026-04-08` | Editar `FALLBACK.lastCommitDate` |
| openIssues (fallback) | `24` | Editar `FALLBACK.openIssues` |
| openPrs (fallback) | `0` | Editar `FALLBACK.openPrs` |

### Seção 3 — Kanban de Sprint

| Campo | Valor atual | Como atualizar |
|-------|-------------|----------------|
| Cards da coluna "Concluído" | PRs #414, #416, #417, #418, #419, #420, #421 | Adicionar/mover cards HTML |
| Cards da coluna "Em andamento" | *(vazio — Sprint Z-07 não iniciada)* | Adicionar cards quando Sprint Z-07 iniciar |
| Cards da coluna "Backlog" | Sprint Z-07 — Sistema de Riscos v4 | Editar cards HTML |
| Milestone bar | `🟢 Sprint Z — Gate B ✅ (FIX_01+FIX_02+FIX_03)` | Editar `<span class="milestone-bar-label">` |

### Seção 5 — Log de Decisões

| Campo | Valor atual | Como atualizar |
|-------|-------------|----------------|
| Entradas do log (array JS) | DEC-001 a DEC-017 | Adicionar novo objeto `{ date, decision, status, link }` no array `DECISIONS` |
| Última entrada | `DEC-017 · 2026-04-08` | Inserir nova entrada no topo do array |

### Seção 6 — Cockpit 3 Ondas

| Campo | Valor atual | Como atualizar |
|-------|-------------|----------------|
| Onda 1 — perguntas | `12` | Editar `<span class="metric-val">12</span>` |
| Onda 1 — áreas | `4` | Editar `<span class="metric-val">4</span>` |
| Onda 1 — sprint badge | `Sprint Z ✅ (Gate B)` | Editar `<span class="onda-sprint done">` |
| Onda 2 — perguntas geradas | `5–10` | Editar `<span class="metric-val">` |
| Onda 2 — modelo LLM | `GPT-4.1` | Editar `<span class="metric-val">` |
| Onda 3 — chunks | `2.509` | Editar `<span class="metric-val">2.509</span>` |
| Onda 3 — leis | `10` | Editar `<span class="metric-val">10</span>` |
| Badge de versão baseline | `baseline v4.8 (atualizado Gate B 2026-04-08)` | Editar `<span class="gov-badge static">` |

### Seção 7 — RAG Rastreabilidade

| Campo | Valor atual | Como atualizar |
|-------|-------------|----------------|
| Versão do corpus | `v4.8` | Editar `<div class="val" id="rag7eCorpusVersion">v4.8</div>` |
| Score RAG atual | `61,6/100 ⚠` | Editar texto em `secao7e-qualidade` |
| Meta Sprint Z-07 | `≥ 85/100` | Editar texto em `secao7e7-desbloqueio` |
| Chunks totais | `2.454 chunks · 10 leis · 0 duplicatas críticas` | Editar linha de evidência em Seção 7E |
| Baseline RAG | `Baseline v4.8 · 2026-04-08 · L-RAG-01 implementado` | Editar linha de fonte |

---

## Fluxo de Atualização Recomendado por Tipo de Evento

| Evento | Campos a atualizar | Tipo |
|--------|-------------------|------|
| Novo commit em main | Nenhum — API atualiza automaticamente | 🌐 Auto |
| Novo PR mergeado | Nenhum — API atualiza automaticamente | 🌐 Auto |
| CI/CD rodou | Nenhum — API atualiza automaticamente | 🌐 Auto |
| Documento atualizado (Seção 4) | Nenhum — API busca data do último commit | 🌐 Auto |
| Sprint encerrada / Gate aprovado | Header (data), Seção 1 (versão, sprint), Seção 3 (kanban), Seção 5 (DEC), Seção 6 (badges), FALLBACK JS | 🔒 Manual |
| Novo corpus RAG | Seção 6 (chunks, leis), Seção 7 (versão, score) | 🔒 Manual |
| Nova decisão (DEC-N) | Array `DECISIONS` na Seção 5 | 🔒 Manual |
| Mudança de P.O. | Header (nome) | 🔒 Manual |

---

## Limites da API GitHub

| Situação | Limite | Comportamento |
|----------|--------|---------------|
| Sem token (anônimo) | 60 req/hora por IP | Usa `FALLBACK` após expirar |
| Com token (classic, `public_repo`) | 5.000 req/hora | Recomendado para uso intenso |
| Configuração do token | Botão "🔑 Token GitHub" no header do cockpit | Salvo em `localStorage` |

---

*COCKPIT-PO-MAPA-CAMPOS.md — IA Solaris v1.0 · 2026-04-08*  
*Gerado a partir de análise do `docs/painel-po/index.html` (3.899 linhas)*  
*Aprovador: P.O. Uires Tapajós*
