## Objetivo
[Descrever claramente o que esta PR resolve]

## Arquivos que serão tocados
<!-- Liste TODOS os arquivos que esta PR vai modificar -->
<!-- O CI verifica se arquivos não declarados foram tocados -->

- `caminho/do/arquivo.ts`

<!-- Se tocar arquivo protegido por CODEOWNERS: justificar abaixo -->
**Justificativa para arquivo crítico (se aplicável):**

## Escopo da alteração

**Tipo:**
- [ ] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Migration (DB)
- [ ] Observabilidade
- [ ] Governança / Docs
- [ ] Infra / CI

**Componentes afetados:**
- [ ] Backend (Node / tRPC)
- [ ] Frontend (React)
- [ ] Banco de dados / Schema
- [ ] RAG (CNAE / requisitos) ❗
- [ ] Infraestrutura / CI
- [ ] Apenas documentação

## Classificação de risco (Gate 0 D3 / Gate 2.5)

- [ ] **low** — hotfix, chore, docs: Gate 2.5 dispensado
- [ ] **medium** — nova procedure, componente, migration: revisão Claude obrigatória
- [ ] **high** — novo pipeline, integração externa, mudança de enum global: revisão Claude + parecer ChatGPT

**Risk Score (Gate 2.5):**

| Critério | Pontos |
|---|---|
| Novo arquivo em `server/lib/` | +1 |
| Nova migration | +2 |
| Alteração em pipeline de dados existente | +2 |
| Integração com sistema externo | +2 |
| Mudança em enum global | +2 |
| Fire-and-forget sem teste de integração | +1 |
| Feature flag ausente (risco medium/high) | +1 |

**Score total:** ___ → **[ low | medium | high ]**

**Justificativa:**
[Descrever objetivamente]

## Declaração de escopo (obrigatório)
Esta PR:
- [ ] NÃO altera comportamento visível ao usuário final
- [ ] NÃO toca no adaptador `getDiagnosticSource()`
- [ ] NÃO impacta o domínio RAG
- [ ] NÃO ativa `DIAGNOSTIC_READ_MODE=new`
- [ ] NÃO executa DROP COLUMN em colunas legadas

Se qualquer item acima for falso → explicar aqui:

## Validação executada

**Testes:**
- [ ] `pnpm tsc --noEmit` — 0 erros
- [ ] `pnpm test` — 100% passando
- [ ] Invariants verificados (INV-001..INV-008)

**Evidência estruturada (obrigatório):**
```json
{
  "head": "COMMIT_SHA",
  "branch": "nome-do-branch",
  "arquivos": ["arquivo1.ts", "arquivo2.ts"],
  "testes_passando": 0,
  "typescript_errors": 0,
  "risk_level": "low",
  "data_integrity": true,
  "regression": false
}
```

## Migração de banco (preencher apenas se aplicável)

- [ ] Tipo: ADD COLUMN / UPDATE / DROP / INDEX
- [ ] Reversível: sim / não
- [ ] Testado em ambiente isolado antes do merge
- [ ] Não impacta dados existentes

**S6 — Estratégia de rollback (obrigatório se migration):**
```
DEPLOY STRATEGY:
  [ ] direto — feature sem risco de regressão
  [ ] feature flag — habilitar por usuário/ambiente
  [ ] migration reversível — DOWN migration declarada

ROLLBACK PROCEDURE:
  1. [ação imediata]
  2. [ação de dados]
  3. [verificação — SELECT que confirma rollback]

CRITÉRIO DE ROLLBACK:
  "Fazer rollback se: [condição mensurável]"
```

## Classificação da task
- [ ] Nível 1 — Seguro (autônomo — não precisa de revisão humana)
- [ ] Nível 2 — Controlado (requer revisão do Orquestrador)
- [ ] Nível 3 — Crítico (requer aprovação explícita do P.O.)

## Sincronização P0/P1 + Skills (obrigatório em PRs de fechamento de sprint)

> Marcar apenas se este PR fecha uma sprint ou altera o estado do produto.
> Se não se aplica, deixar em branco — mas justificar abaixo.

- [ ] `docs/governance/ESTADO-ATUAL.md` — HEAD, PRs, testes, sprint concluída (**P0**)
- [ ] `docs/BASELINE-PRODUTO.md` — versão, HEAD, indicadores (**P1**)
- [ ] `docs/HANDOFF-MANUS.md` — estado operacional atual (**P1**)
- [ ] `skills/solaris-contexto/SKILL.md` — seção "Estado atual do produto" + `Versão do skill`
- [ ] `skills/solaris-orquestracao/SKILL.md` — campo `Versão do skill` no topo

⚠️ **Se qualquer um dos 5 arquivos acima não foi atualizado, este PR NÃO deve ser mergeado.**

Justificativa (se não aplicável):

## Gate ADR — Architecture Decision Record (v4.4)

> Obrigatório quando este PR modifica: `flowStateMachine.ts` · `schema.ts` · `routers-fluxo-v3.ts` · `App.tsx` · `DiagnosticoStepper.tsx` · `lib/*.ts`

```bash
./scripts/gate-adr.sh
```

```
Arquivos arquiteturais modificados: [lista ou "nenhum"]
ADR referenciado: [ ADR-XXXX | N/A — nenhuma mudança arquitetural ]
Contrato atualizado: [ docs/contratos/CONTRATO-*.md | N/A ]
Fitness Functions: [ pnpm vitest run server/integration/fitness-functions.test.ts ]
Resultado: [ PASS | BLOQUEADO | N/A ]
```

- [ ] ADR criado/atualizado: `docs/adr/ADR-XXXX-descricao.md`
- [ ] Contrato criado/atualizado: `docs/contratos/CONTRATO-*.md` (se mudança de interface)
- [ ] DIVs abertas documentadas: `docs/divergencias/DIV-*.md`
- [ ] `docs/adr/ADR-INDEX.md` atualizado

**ADR relacionado:** ADR-XXXX (ou N/A)

---

## Gate FC — Feature Completeness (v4.3)

> Obrigatório quando este PR adiciona procedures tRPC novas.

```bash
./scripts/gate-fc.sh
```

```
Procedures novas: [lista ou "nenhuma"]
Consumidores no frontend: [componentes ou N/A]
Resultado: [ PASS | BLOQUEADO | N/A ]
```

---

## Gate Wiring de Navegação (v4.7)

> Obrigatório quando este PR toca `DiagnosticoStepper.tsx`, `ProjetoDetalhesV2.tsx`, `App.tsx` (rotas), ou qualquer componente de stepper/hub de diagnóstico.
> Dispensado para PRs que não tocam componentes de navegação.

- [ ] `ProjetoDetalhesV2.tsx` ou equivalente navega para as rotas corretas (TO-BE)
- [ ] Labels visuais nos steps correspondem ao fluxo implementado
- [ ] IDs internos de steps (`StepId`) documentados no contrato se alterados (CONTRATO-DEC-M3-05-v3 §2.5)
- [ ] Enum `z.enum()` no router atualizado se `StepId` mudar
- [ ] Testes W03/W04 (rotas legadas removidas / TO-BE presentes) passando
- [ ] Testes W06 (sem valores em inglês no `operationType`) passando

```
Wiring verificado: [ SIM | N/A — PR não toca navegação ]
Rotas legadas removidas: [ SIM | N/A ]
Labels atualizados: [ SIM | N/A ]
Resultado: [ PASS | BLOQUEADO | N/A ]
```

---
## Gate EVIDENCE — Componentes LLM
> Se o PR toca `generateBriefingFromDiagnostic`, `generateRiskMatrices`
> ou qualquer função que chama o LLM para gerar conteúdo jurídico:

- [ ] Teste com LLM REAL executado (não mock)
- [ ] Output completo capturado como evidência
- [ ] IS mencionado quando `cnaeAnswers.IS = sim`
- [ ] Art. 2 citado quando IS identificado
- [ ] alíquota zero mencionada quando elegível
- [ ] Art. 14 citado quando alíquota zero identificada
- [ ] Evidência salva em `docs/evidencias/`
- [ ] Orquestrador aprovou após leitura do output real

⚠️ PRs que tocam pipeline LLM sem evidência não devem ser mergeados.

---

## Auto-auditoria Q1–Q7 + observabilidade (Gate 2 v5.0)

> Obrigatório para feat, fix, hotfix, schema, procedure e componente com useQuery.
> Dispensado apenas para `chore(...)` e `docs(...)`.

```
Q1 — Tipos nulos:         [ OK | N/A ] — [evidência]
Q2 — SQL TiDB:            [ OK | N/A ] — [evidência]
Q3 — Filtros NULL/'':     [ OK | N/A ] — [evidência]
Q4 — Endpoint registrado: [ OK | N/A ] — [evidência]
Q5 — isError ≠ vazio:     [ OK | N/A ] — [evidência]
Q6 — Retorno explícito:   [ OK | N/A ] — [inserted confirmado via SELECT]
Q7 — Driver único:        [ OK | N/A ] — [Opção A/B/C declarada]
R9 — Evento estruturado:  [ OK | N/A ] — [evento emitido no início/sucesso/falha]
S6 — Rollback declarado:  [ OK | N/A ] — [estratégia acima preenchida]

Risk score (herdado Gate 0): [ low | medium | high ]
Resultado: [ APTO | BLOQUEADO — motivo ]
```

## Checklist final
- [ ] Código revisado pelo próprio autor
- [ ] Evidência JSON preenchida e verdadeira
- [ ] Sem arquivos fora do escopo declarado modificados
- [ ] Documentação atualizada se necessário
- [ ] Feature flag criada se risk score ≥ medium

## Declaração final
Declaro que a implementação é determinística, não há risco oculto,
a alteração é auditável e atende o nível de confiabilidade exigido.
