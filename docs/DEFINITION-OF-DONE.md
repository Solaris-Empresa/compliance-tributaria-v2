# Definition of Done — IA Solaris / Plataforma de Compliance Tributária

**Versão:** 1.1  
**Data:** 2026-03-29  
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
| Invariants verificados | INV-001..INV-008 cobertos pelos testes |
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

---

## Adições da Sprint K (2026-03-29)

### DoD adicional para entregas de Cockpit / Governança
- [ ] Seção do cockpit com status visual para cada documento
- [ ] Fetch dinâmico de dados via API GitHub implementado
- [ ] PR com evidência JSON preenchida
- [ ] Apenas arquivos do escopo declarado alterados
- [ ] Restrições absolutas verificadas (DIAGNOSTIC_READ_MODE, F-04 Fase 3, DROP COLUMN)

*Atualizado em 2026-03-29 — Sprint K concluída.*
