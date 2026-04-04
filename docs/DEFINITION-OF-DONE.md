# Definition of Done — IA Solaris / Plataforma de Compliance Tributária

**Versão:** 1.3  
**Data:** 2026-04-01  
**Responsável:** P.O. (Uires Tapajós)  
**Aprovação:** Obrigatória do P.O. para qualquer alteração neste documento

---

## Princípio

Uma entrega está "done" quando qualquer pessoa do time — incluindo o Orquestrador e um novo agente sem contexto — consegue verificar objetivamente que ela está completa, correta e auditável. Sem evidência, não está done.

---

## DoD por Tipo de Entrega

### 1. Feature de Produto (código + comportamento visível ao usuário)

| Critério | Verificação |
|---|---|
| TypeScript: zero erros | `pnpm exec tsc --noEmit` → 0 erros |
| Testes passando | `pnpm test` → 100% passando |
| Testes novos adicionados | Arquivo `.test.ts` modificado ou criado |
| Invariants verificados | INV-001..INV-009 cobertos pelos testes (INV-005 = fonte perguntas) |
| PR template preenchido | Todos os campos obrigatórios + evidência JSON |
| Comportamento documentado | CHANGELOG.md atualizado |
| Sem regressão RAG | `rag_impact: false` na evidência JSON |

### 2. Correção de Bug (bugfix)

| Critério | Verificação |
|---|---|
| Causa raiz documentada | Seção "Causa raiz" no PR body |
| Teste de regressão adicionado | Arquivo `.test.ts` com caso que reproduz o bug |
| TypeScript: zero erros | `pnpm exec tsc --noEmit` → 0 erros |
| Testes passando | `pnpm test` → 100% passando |
| ERROS-CONHECIDOS.md atualizado | Status do erro alterado para `RESOLVIDO` |
| CHANGELOG.md atualizado | Entrada na seção `### Corrigido` |

### 3. Migration de Banco de Dados

| Critério | Verificação |
|---|---|
| Migration reversível documentada | Campo "Reversível: sim/não" no PR body |
| Testada em ambiente isolado | Declaração explícita no PR body |
| Não impacta dados existentes | Declaração explícita ou script de rollback |
| `pnpm db:push` executado | Sem erros de schema |
| Testes passando pós-migration | `pnpm test` → 100% passando |
| Label `db:migration` aplicada | Visível no PR |

### 4. Documentação

| Critério | Verificação |
|---|---|
| Arquivo criado em `docs/` | Path correto conforme INDICE-DOCUMENTACAO.md |
| INDICE-DOCUMENTACAO.md atualizado | Nova entrada na categoria correta |
| Links internos funcionando | Nenhum link quebrado |
| Versão e data no cabeçalho | Campos `Versão` e `Data` presentes |
| BASELINE-PRODUTO.md atualizado | Se a documentação reflete mudança de estado |

### 5. Infra / CI / Governança

| Critério | Verificação |
|---|---|
| Workflow YAML válido | `yamllint` ou validação GitHub Actions |
| Não quebra workflows existentes | Todos os jobs do `structural-fix-gate.yml` passando |
| Documentado no CHANGELOG.md | Entrada na seção `### Adicionado` ou `### Expandido` |
| Testado em branch antes de main | PR aberto, não push direto em main |

### 6. Observabilidade / Shadow Mode

| Critério | Verificação |
|---|---|
| Zero divergências críticas novas | Query `diagnostic_shadow_divergences` → 0 novas |
| Shadow Mode ativo após deploy | `DIAGNOSTIC_READ_MODE=shadow` confirmado |
| Relatório de divergências gerado | Arquivo em `docs/evidence-packs/` |
| Label `observability` aplicada | Visível no PR |

---

## Níveis de Aprovação

| Nível | Quem aprova | Quando se aplica |
|---|---|---|
| **Nível 1 — Seguro** | Autônomo (Manus) | Docs, CI, labels, configs sem impacto em código |
| **Nível 2 — Controlado** | Orquestrador | Features, bugfixes, migrations reversíveis |
| **Nível 3 — Crítico** | P.O. (Uires Tapajós) | DROP COLUMN, mudança de invariant, ativação de `DIAGNOSTIC_READ_MODE=new`, mudança em ADR |

---

## O que NÃO é Done

- Código funcionando apenas no ambiente local
- Testes passando mas sem cobertura do comportamento novo
- PR aberto sem evidência JSON preenchida
- Migration sem declaração de reversibilidade
- Feature sem entrada no CHANGELOG.md
- Documentação sem atualização do INDICE-DOCUMENTACAO.md

---

## Histórico de Versões

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0 | 2026-03-25 | Manus (Sprint Governança) | Criação inicial |
| 1.1 | 2026-03-29 | Manus (Sprint K) | Adições de Cockpit/Governança |
| 1.2 | 2026-03-31 | Manus (Sprint M) | DoD para E2E Playwright + bugs UAT resolvidos |
| 1.3 | 2026-04-01 | Manus (Sprint N) | DoD para Gates v5.0 + post-mortem + feature flags |

---

## Adições da Sprint K (2026-03-29)

### DoD adicional para entregas de Cockpit / Governança
- [ ] Seção do cockpit com status visual para cada documento
- [ ] Fetch dinâmico de dados via API GitHub implementado
- [ ] PR com evidência JSON preenchida
- [ ] Apenas arquivos do escopo declarado alterados
- [ ] Restrições absolutas verificadas (DIAGNOSTIC_READ_MODE, F-04 Fase 3, DROP COLUMN)

*Atualizado em 2026-03-29 — Sprint K concluída.*

---

## Adições da Sprint M (2026-03-31)

### DoD adicional para entregas de testes E2E Playwright

| Critério | Verificação |
|---|---|
| Suite em `tests/e2e/` com fixture `loginViaTestEndpoint` | Endpoint `auth.testLogin` ativo apenas com `E2E_TEST_MODE=true` |
| Casos de teste cobrem caminho crítico do UAT | CT-01, CT-04, CT-06, CT-07, CT-37 mínimo |
| `E2E_TEST_MODE=false` em produção | Endpoint retorna `FORBIDDEN` sem a variável |
| `E2E_TEST_SECRET` configurado como secret | Não hardcoded no código |
| `tests/e2e/README.md` atualizado | Instruções de execução para advogados |

### Bugs UAT resolvidos nesta sprint

| Bug | Descrição | Status |
|---|---|---|
| BUG-UAT-02 | Onda 2 não avançava para Corporativo | ✅ Resolvido (PR #254) |
| BUG-UAT-03 | `completeOnda2` gravava status de origem em vez de destino | ✅ Resolvido (PR #254) |
| BUG-UAT-05 | `DiagnosticoStepper` exibia hardcode `SOL-001 a SOL-012` | ✅ Resolvido (PR #256) |

*Atualizado em 2026-03-31 — Sprint M concluída.*

---

## Adições da Sprint N (2026-04-01)

### DoD adicional para entregas com Gates v5.0

| Critério | Verificação |
|---|---|
| Gate 0 Discovery executado | D1–D4 respondidos no PR body |
| Risk Score declarado | `risk_level: low/medium/high` no PR body |
| Q1–Q7 + R9 respondidos | Seção `Auto-auditoria` no PR template preenchida |
| Feature flag criada | `server/config/feature-flags.ts` atualizado se feature nova |
| INV-005 coberto | Testes em `server/schema-g15-question.test.ts` passando |
| Post-mortem criado | Se incidente P1/P2 ocorreu: `docs/governance/post-mortems/` |

### Entregas Sprint N

| Entrega | Status |
|---|---|
| G17 P0 — analyzeSolarisAnswers → server/lib | ✅ PR #263 |
| G11 — fonte_risco em project_risks_v3 | ✅ PR #267 |
| G15 — ONDA_BADGE + ADR-0002 + INV-005 | ✅ PR #269 |
| Gates v5.0 — Q1–Q7+R9/R10+Skills v4.0 | ✅ PR #266 |
| Post-mortem G17 INSERT silencioso | ✅ PR #269 |

*Atualizado em 2026-04-01 — Sprint N concluída.*
