# ADR-0029 — CPIE v3: Mudança de estratégia @deprecated → DROP + exceções autorizadas a restrições absolutas
## Status: Proposto · 2026-04-19 · Aprovação P.O. pendente
## Supersedia parcialmente: SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.0 (Blocos 3.3, 3.4, 4, 7-waveB, 8-#2)
## Referência: SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.1 (amendment formal deste ADR)

---

## Contexto

A `SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.0` aprovada em 2026-04-18 estabeleceu em:

- **Bloco 3.3:** "Arquivos DEPRECADOS (marcar `@deprecated`, NÃO deletar)"
- **Bloco 3.4:** "Tabelas `cpieAnalysisHistory`, `cpieSettings`, `cpie_score_history` — Preservadas — drop em sprint futura"
- **Bloco 8 item #2:** "NÃO deletar código CPIE legado — apenas marcar `@deprecated`. Drop ficará em sprint de limpeza futura (decisão D9.b)"

A Wave A.1 foi implementada e mergeada sob essa estratégia (PR #728 · commit `9ad75c0`). Para a Wave A.2 + B, surgiram três fatos novos:

**Fato 1 — Decisão P.O. 2026-04-18 sobre estratégia.** Após discussão do PR #728, o P.O. autorizou explicitamente a estratégia **(c) DROP tudo**: apagar dados do banco e deletar os arquivos, sem passo intermediário `@deprecated`. Justificativa registrada: *"cresce débito a cada dia"*.

**Fato 2 — Escopo real do legado é maior que o listado na spec v1.** Auditoria via `grep` sobre `trpc.cpie*`, `trpc.scoringEngine` e imports de componentes `Cpie*` revelou:

- 5 testes órfãos não listados no Bloco 3.3 v1 (`cpie.test.ts`, `cpie-v2.test.ts`, `cpieV2Router.test.ts`, `sprint-s-lotes-be.test.ts`, `integration/routers-scoring-engine.test.ts`)
- 1 script na raiz do repo (`cpie_stress_runner.ts`)
- 5 consumers frontend com import/chamada ao CPIE legado não listados na v1: `Painel.tsx`, `Projetos.tsx`, `AdminConsistencia.tsx`, `compliance-v3/ComplianceDashboardV3.tsx`, `compliance-v3/ScoreView.tsx`

**Fato 3 — Dois arquivos tocados pelo DROP estão em restrição absoluta do `HANDOFF-IMPLEMENTADOR.md` v1.1:**

- `server/_core/index.ts` — linha 13 (import `initMonthlyReportJob`) + linha 143 (chamada). É consequência mecânica da deleção de `server/jobs/monthlyReportJob.ts` (Bloco 3.3 v1 item 23). Sem essa edição de 2 linhas, build TypeScript quebra por import órfão. `server/_core/*` está explicitamente proibido de editar sem aprovação.
- `server/routers-fluxo-v3.ts:~1653-1657` — chamada `persistCpieScoreForProject` em fluxo fire-and-forget após aprovação de plano. O próprio comentário inline do código declara *"pipeline não afetado"*. Não está em restrição absoluta, mas é remoção comportamental que exige registro formal.

A regra **REGRA-ORQ-16 (HARD-ENFORCED)** em `.claude/rules/governance.md` proíbe absolutamente *"alterar spec após aprovação (hash invalida)"*. A REGRA-ORQ-09 estabelece *"AMENDMENT (estrutural): nova issue"*. Ou seja, a decisão do Fato 1 + o escopo do Fato 2 + as exceções do Fato 3 não podem ser endereçadas por aprovação verbal no chat — exigem spec v1.1 + ADR formalizando a decisão arquitetural.

---

## Decisão

**D-1. Mudança de estratégia de depreciação.** CPIE legado deixa de ser depreciado por etapas e passa a ser removido em uma única operação coesa (Wave B), combinando deleção de código + `DROP TABLE`/`DROP COLUMN` + apagamento de dados (exceto RAG, CNAEs, solaris_questions).

**D-2. Autorização explícita de dados.** Os seguintes dados são apagáveis sem backup nem período de retenção, conforme declaração P.O. 2026-04-18 (*"todos os dados do banco podem ser apagados, com exceção RAG"*):

- Tabela `cpieAnalysisHistory` — integridade histórica abdicada
- Tabela `cpieSettings` — sem uso em produção
- Tabela `cpie_score_history` — 0 registros úteis (ADR-0023)
- Colunas em `projects`: `profileCompleteness`, `profileConfidence`, `profileLastAnalyzedAt`, `profileIntelligenceData`

**D-3. Exceções autorizadas a restrições absolutas do `HANDOFF-IMPLEMENTADOR.md` v1.1:**

| ID | Arquivo / ação | Tipo | Justificativa |
|---|---|---|---|
| **EX-1** | `server/_core/index.ts` — remover linhas 13 + 143 (import + invocação `initMonthlyReportJob`) | Subtrativa, 2 linhas, sem lógica nova | Consequência mecânica de D-1; sem a edição, build TS quebra |
| **EX-2** | `server/routers-fluxo-v3.ts:~1653-1657` — remover chamada `persistCpieScoreForProject` | Subtrativa, remoção de código morto | Próprio código declara "pipeline não afetado"; função inexistente após D-1 |
| **EX-3** | `DROP COLUMN` em `projects` (4 colunas) via migration Drizzle nova | Schema destrutivo | Restrição absoluta "DROP COLUMN qualquer" é levantada apenas para as 4 colunas listadas em D-2 |

**D-4. Escopo congelado com base em evidência grep (não em relato).** A SPEC v1.1 registra a lista completa de arquivos com numeração e justificativa por item. O grep que produziu a lista fica registrado na seção `Bloco 6` da spec v1.1 como comando reproduzível.

**D-5. Fora de escopo deste ADR.** A pasta `client/src/components/compliance-v3/` e `client/src/pages/compliance-v3/` **não** são CPIE legado — não importam `trpc.cpie*` diretamente (apenas `ScoreView.tsx` usa `trpc.scoringEngine`). Ficam preservadas, exceto ajuste pontual em `ComplianceDashboardV3.tsx` e `ScoreView.tsx`.

---

## Guardrails obrigatórios

1. **Ordem de execução na Wave B é inflexível:**
   - (1) remover consumidores frontend que importam `trpc.cpie*` / `trpc.scoringEngine` / componentes `Cpie*`
   - (2) remover chamadas backend a funções que serão deletadas (EX-2, outros)
   - (3) remover `initMonthlyReportJob` de `server/_core/index.ts` (EX-1)
   - (4) deletar arquivos `.ts` / `.tsx` CPIE legados
   - (5) aplicar migration destrutiva (EX-3 + DROP TABLE)
   - (6) rodar `pnpm tsc --noEmit` + suite de testes + E2E
   - Violação da ordem = build quebrado em estado intermediário sem possibilidade de rollback limpo.

2. **Preservação obrigatória (invariante):**
   - `rag_documents`, `rag_chunks` — 2.515 chunks são base jurídica irrecuperável
   - `cnaes` — filtro setorial
   - `solaris_questions` — corpus Dr. José Rodrigues
   - `server/lib/compliance-score-v4.ts` — core Step 7
   - `server/routers/risks-v4.ts` procedure `calculateAndSaveScore` — Step 7 snapshot
   - `client/src/pages/ConsolidacaoV4.tsx` — Step 7 entregável
   - `client/src/components/compliance-v3/**` e `client/src/pages/compliance-v3/**` (exceto ScoreView.tsx e ComplianceDashboardV3.tsx, que recebem edição cirúrgica)

3. **Migration destrutiva irreversível:** a migration Wave B não terá `down()` reversível — DROP TABLE/COLUMN é terminal. P.O. já autorizou em D-2. Isso DEVE constar no body do PR no campo `risk_level: "high"` (override explícito do padrão "low" de PRs destrutivos rotineiros).

4. **Teste E2E obrigatório:** a suite `compliance-dashboard.spec.ts` (5 CTs, já verde em Wave A.1) DEVE continuar passando 5/5 após Wave B. Adicionalmente, adicionar 2 CTs de regressão: (a) "criar projeto sem trigger de CPIE analyze" (valida remoção do gate), (b) "aprovar plano sem persistCpieScoreForProject" (valida EX-2).

5. **Governance Gate ORQ-16:** a spec v1.1 **não** é incluída em `governance/APPROVED_SPEC.json` neste ciclo, porque o validator atual (`scripts/validate-governance.sh`) suporta apenas 1 entry e está congelado na meta-spec ORQ-16 (hash `329ae5e8...`). Extensão do validator para array de specs fica registrada como **débito de governança** (issue nova a abrir), não bloqueador deste ADR.

6. **Manus bloqueado:** enquanto o deploy Manus estiver congelado, a UAT P.O. da Wave B é feita via dev server Manus em URL temporária; produção fica em Wave A.1 até destravar. CI/CD gates (tsc, vitest, playwright) continuam válidos e bloqueiam merge normalmente.

---

## Consequências

**Positivas:**
- (+) Elimina débito crescente de código CPIE legado coexistindo com Compliance v4
- (+) Uma única operação coesa de DROP em vez de duas sprints separadas (@deprecated → DROP futuro)
- (+) Escopo auditável e rastreável (grep reproduzível em Bloco 6 da spec v1.1)
- (+) Registro formal das 3 exceções (EX-1, EX-2, EX-3) impede que o precedente seja usado para justificar outras edições em `server/_core/*` ou `DROP COLUMN` no futuro

**Negativas:**
- (−) Impossibilidade de rollback por via de dados (P.O. aceitou explicitamente em D-2)
- (−) Sessão de implementação maior e mais arriscada (mitigação: ordem de execução inflexível no guardrail 1, review F4.5 obrigatório)
- (−) Aumento do escopo em relação à spec v1 (14 @deprecated + 6 modificados → 24 deletados + 14 modificados) — mitigação: este ADR + amendment v1.1 são o registro formal

**Precedente criado (intencional):**
- Edição de `server/_core/*` por razão mecânica (remover import que ficaria órfão após deleção de módulo) é permitida **desde que registrada em ADR novo**. Esta permissão não se estende a edição que adicione lógica.
- `DROP COLUMN` é permitido **desde que registrado em ADR novo com autorização P.O. explícita sobre os dados afetados**. Esta permissão não é transferível para colunas não listadas em D-2.

---

## Alternativas consideradas e rejeitadas

- **ALT-1: manter a spec v1 e fazer @deprecated primeiro, DROP depois.** Rejeitada pela justificativa P.O. de 2026-04-18 ("cresce débito a cada dia") e porque cria intermediário de meses com código morto convivendo com código novo.
- **ALT-2: dois PRs separados (2.a código + 2.b migration).** Rejeitada porque criaria estado intermediário onde a migration está aplicada e o código consumidor ainda vive (build quebra até 2.b mergear) OU o código foi removido e a migration não veio (tabelas órfãs). Operação coesa é mais segura.
- **ALT-3: aprovação verbal no chat sem amendment + ADR.** Rejeitada explicitamente pela REGRA-ORQ-16 (HARD-ENFORCED) e pela REGRA-ORQ-09 (amendment estrutural = nova issue, não remendo verbal).

---

## Rastreabilidade

- Sprint: Z-22 · Wave A.2 + B
- Issue: #725 (CPIE v3 Dashboard de Compliance on-demand) — amendment formalizado via comentário de aprovação P.O. referenciando este ADR
- PR da Wave A.1 (já mergeado): #728 (commit `9ad75c0`)
- PR #731/#732 (já mergeado em 2026-04-19, HEAD pós-merge `307316b`): fix(z22) remove item "Dashboard Compliance" do sidebar global; CT-4 reescrito para testar `btn-ver-score-projeto` em `ProjetoDetalhesV2.tsx` em vez do sidebar
- PR #733 (hotfix UX transparência — pode mergear antes do F6): modal fórmula humanizado + remove item admin "Dashboard CPIE" + `CpieScoreBadge` fora de `/projetos` + renomeia "Período" → "Prazo do plano" + badge "Snapshot persistido" em `ConsolidacaoV4.tsx` + banner "Calculado agora on-demand" em `ComplianceDashboard.tsx`
- PR da Wave A.2 + B (a abrir após aprovação deste ADR): TBD · branch parte de `origin/main` **no momento do despacho F6** (não de SHA fixo) · R-SYNC-01 obrigatório
- Spec superseded (parcial): `docs/specs/SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.md` v1.0
- Spec amendment: `docs/specs/SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.1.md`
- Restrições absolutas referenciadas: `docs/governance/HANDOFF-IMPLEMENTADOR.md` v1.1 (tabela "Restrições Absolutas")
- Regras de governança referenciadas: `.claude/rules/governance.md` — REGRA-ORQ-09, REGRA-ORQ-16, REGRA-ORQ-17
- P.O.: Uires Tapajós
- Orquestrador: Claude (Anthropic)
- Implementador solo da sprint: Claude Code (autorização P.O. 2026-04-18)
- Consultor arquitetural: ChatGPT (previsto — parecer sobre consequência crítica em Z-23)

---

## Hash de integridade

Este ADR DEVE ser referenciado pela spec v1.1 em três lugares:
1. Header da spec v1.1 (metadata)
2. Bloco EX (exceções autorizadas) — cada EX aponta para este ADR
3. Bloco 4 (schema destrutivo) — DROP COLUMN aponta para EX-3 deste ADR
