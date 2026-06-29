# Auditoria do Cockpit P.O. → v10 (Governança Viva)

> **Data:** 2026-06-28 · **Autor:** Claude Code (Orquestrador) · **Para:** Uires Tapajós (P.O.)
> **Alvo:** `docs/painel-po/index.html` (GitHub Pages: solaris-empresa.github.io/compliance-tributaria-v2/painel-po/)
> **Base sincronizada:** `origin/main` @ `5958095b` (após R-SYNC-01 — ver §0)
> **Método:** determinístico, fonte da verdade = repositório (código + corpus). Dado de runtime/banco → Manus.

---

## 0. Achado de processo (R-SYNC-01 / REGRA-ORQ-35)

Ao iniciar, meu working tree estava **atrás do main**: o `index.html` que eu lia era v5.6, mas o `origin/main` já tinha o **PR #1608 (v9.2)** mergeado. Sincronizei (`git merge origin/main` → `5958095b`) antes de editar — senão teria clobrado a v9.2. **Lição operacional:** o painel publicado, o `main` e o working tree podem divergir; sempre R-SYNC-01 antes de tocar o painel ([[Lição #141]] — artefato servido ≠ fonte).

---

## 1. Drift estrutural (a causa-raiz)

**O painel não referenciava o corpus de governança que o Orquestrador realmente usa e atualiza toda sessão.** Ele foi construído sobre o conjunto antigo `docs/` + `docs/governance/`, e nunca integrou `.claude/`:

| Corpus REAL (usado/atualizado toda sessão) | Estava no painel v9.2? |
|---|---|
| `.claude/rules/governance-core.md` — **44 REGRA-ORQ** | ❌ ausente |
| `.claude/rules/governance-lessons.md` — **67 Lições (#61–#153)** | ❌ ausente |
| `.claude/rules/governance-spec-first.md` (SPEC-FIRST + CHECKLIST-VAL/REVIEW-01) | ❌ ausente |
| `.claude/rules/governance-adr-ref.md` | ❌ ausente |
| `.claude/rules/{backend,frontend,database,testing}.md` | ❌ ausente |
| `CLAUDE.md` (instruções-raiz) | ❌ ausente |
| `.claude/skills/` — **9 skills** (impact-tree, investigate-deep, safe-fix-pipeline, sync, gate-check, db-schema-check, pre-commit, ux-spec-check, solaris-contexto) | ❌ só 2 "skills" de contexto citadas |
| `docs/adr/` — **31 ADRs reais** (ADR-0009..ADR-0039 + ADR-INDEX) | ❌ só ADR-010/ADR-008 (numeração antiga) |
| `docs/governance/audits/` — **34 auditorias** (ORQ-19) | ❌ ausente |
| `docs/governance/post-mortems/` — 2 | ❌ ausente |
| `docs/governance/relatorios/` — **51 relatórios** (AS-IS/TO-BE) | ❌ ausente |

**Causa-raiz da drift:** a Seção 4 ("Relatório de Documentação") é uma **tabela mantida à mão** → envelhece e nunca cobre arquivos novos. Qualquer painel hand-maintained diverge do repo.

---

## 2. Inconsistências internas e erros (v9.2)

O PR #1608 patchou só os *doc-comments* da Seção 4 para v9.2, deixando o núcleo estático em epóca anterior — painel **internamente contraditório**:

| # | Erro / desatualização | Onde (linha v9.2) | Correto |
|---|---|---|---|
| E1 | "v5.6 — Sprint Z-22 UAT ENCERRADA" como **status atual** | `630` | v9.2 — Form Wizard ativo · GATE-NCM-NBS · RAG-ART544 |
| E2 | Onda 3: **2.515 chunks · 13 leis** | `1169/1170` | 16.702 chunks · 25 leis |
| E3 | Onda 1: **12 perguntas** SOLARIS | `1123` | 54 |
| E4 | Disclaimer "baseline v5.0 · Sprint Z-22 · 2026-04-21" | `1045/1225` | baseline v9.2 · 16.702 · 2026-06-28 |
| E5 | Tooltips "Fonte: baseline v5.0" / "Baseline v5.0" | `1124/1148/1149/1264` | baseline v9.2 |
| E6 | **ADRs com numeração antiga** ADR-010/ADR-008 + links para `docs/product/cpie-v2/produto/ADR-008-...md` (caminho provavelmente inexistente) | `795/802` | ADRs reais em `docs/adr/` (ADR-0009..0039) — ver Seção 8E |
| E7 | Timeline de sprints **congelada em Sprint Z-22** (não reflete M3.x, P2, GATE-NCM-NBS, ADR-0038, Form Wizard) | `1083-1097` | histórico pós-Z-22 ausente |
| E8 | "Score de Saúde 94/100" **hardcoded**; testes "1.500+" | `558-561` | métrica estática sem fonte viva |
| E9 | "Blockers ativos: F-04 #56/#61/#62" (março/2026, obsoletos) | Seção 1 | backlog atual (M4 / construção civil #1607) |
| E10 | Gold set "10 queries" (7E) diverge do gold set real (8 queries em `ragInventory.ts`) | 7E.4 | alinhar com `server/routers/ragInventory.ts:23-110` |

**Corrigidos nesta v10:** E1–E5 (dados estáticos factuais). **Documentados como recomendação:** E6–E10 (exigem decisão/escopo — ver §4).

---

## 3. O que a v10 ENTREGA

### 3.1 Seção 8 — Governança Viva (nova, data-driven)
Nova seção em `index.html` que renderiza **todo o corpus `.claude/` + ADRs + auditorias** a partir de um manifesto:
- **8A** Corpus `.claude/rules` (tabela: arquivo, tamanho, atualizado, conteúdo)
- **8B** Skills (`.claude/skills`) — 9 cards com descrição
- **8C** Catálogo REGRA-ORQ (44)
- **8D** Catálogo de Lições (67, até #153)
- **8E** ADRs reais (31)
- **8F** Auditorias (34) · Post-mortems (2) · Relatórios (51)
- KPI strip + rodapé com HEAD + timestamp do manifesto

### 3.2 Gerador determinístico (resolve a causa-raiz da drift)
`docs/painel-po/sync-governance.mjs` varre o corpus real e emite `docs/painel-po/governance-manifest.json`. O painel **lê o manifesto** (não dados à mão). **Auto-atualizável:** `node docs/painel-po/sync-governance.mjs` antes de cada checkpoint mantém o painel fiel ao repo. Recomendo um job de CI que regenere e falhe se o manifesto estiver defasado.

### 3.3 Correções factuais
E1–E5 acima (status, chunks, leis, perguntas, baseline, tooltips) alinhados à v9.2.

### 3.4 Versão
Header marca **Painel v10**; data do header é dinâmica (JS).

---

## 4. Recomendações pendentes (decisão P.O. — não implementadas)

| Prioridade | Item | Ação proposta |
|---|---|---|
| **P1** | E6 — Seção 4 + 6A com ADR-010/008 antigos e links quebrados | Trocar por `docs/adr/` real ou remover (Seção 8E já é a fonte viva). |
| **P1** | E7 — Timeline de sprints congelada em Z-22 | Tornar data-driven (gerar de `docs/governance/audits/` via manifesto) ou atualizar manualmente até a sessão atual. |
| **P2** | E10 — gold set 10 (7E) vs 8 real (`ragInventory.ts`) | Alinhar a tabela 7E ao gold set efetivo do código. |
| **P2** | E8 — Score de Saúde hardcoded | Derivar de CI/checks reais (a Consistência Global 6D já busca GitHub API). |
| **P2** | E9 — Blockers obsoletos | Apontar para issues abertas atuais (ex.: #1607 construção civil). |
| **P3** | Seção 4 inteira (hand-maintained) | Migrar para o manifesto (estender `sync-governance.mjs` para cobrir `docs/`). |
| **P3** | CI gate | `.github/workflows` que roda `sync-governance.mjs` e bloqueia se manifesto desatualizado (paridade com `sync-baseline.mjs`). |

---

## 5. Como publicar

O painel publica via GitHub Pages a partir do `main` (ou da branch configurada em Settings → Pages). Para a v10 ir ao ar:
1. PR docs-only desta branch → merge em `main`.
2. Garantir que `governance-manifest.json` está commitado ao lado do `index.html` (o painel faz `fetch("./governance-manifest.json")` — caminho relativo, mesma origem).
3. Após o deploy do Pages, validar a Seção 8 carregada (KPIs preenchidos). Em `file://` local o fetch é bloqueado (mensagem de fallback exibida) — testar via http/Pages.

---

## 6. Evidência / arquivos

- **Editado:** `docs/painel-po/index.html` (v9.2 → v10: nova Seção 8 + render script + correções E1–E5).
- **Novo:** `docs/painel-po/sync-governance.mjs` (gerador) · `docs/painel-po/governance-manifest.json` (44 ORQ · 67 Lições · 9 skills · 31 ADRs · 8 rules · 34 audits · 51 relatórios) · este relatório.
- **Validação:** `div` 423/423 balanceado · `</body>` único · JSON válido · render script `node --check` OK.

## 7. Vinculadas
REGRA-ORQ-19 (auditoria) · REGRA-ORQ-25/[[Lição #141]] (artefato servido ≠ fonte) · REGRA-ORQ-35 (NUNCA ASSUMA) · REGRA-ORQ-46 (lições commitadas) · [[Lição #66]]/[[Lição #83]] (não afirmar sem grep) · PR #1608 (v9.2 parcial).
