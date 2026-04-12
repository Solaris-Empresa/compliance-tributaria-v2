# Governança Operacional do Manus — Sprint 98% Confidence

**Versão:** 1.0  
**Data:** 2026-03-23  
**Milestone:** [Sprint-98-Confidence-Content-Engine](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)

---

## Sequência de blocos (ordem obrigatória)

| Bloco | Conteúdo | Gate | Status |
|-------|----------|------|--------|
| **B0** | Governança GitHub: milestone, labels, 34 issues, PR template, CONTRIBUTING.md, MANUS-GOVERNANCE.md | Checkpoint + Push | ✅ Concluído |
| **B1** | ADR-010, Matriz canônica inputs/outputs, Matriz de rastreabilidade req→pergunta→gap→risco→ação | Aprovação do Orquestrador | 🟡 Aguardando gate |
| **B2** | Implementação das 6 engines + briefing + shadow + CI | Checkpoint por engine + Shadow validation | 🔵 Backlog |

**Regra crítica:** nenhum bloco pode ser iniciado sem o gate do bloco anterior aprovado pelo Orquestrador.

---

## Rotina por bloco

### Ao iniciar um bloco
1. Verificar se o gate do bloco anterior foi aprovado
2. Ler as issues do bloco no GitHub (milestone `Sprint-98-Confidence-Content-Engine`)
3. Verificar `pnpm test` — todos os testes devem estar passando antes de começar

### Durante a implementação
1. Um commit por mudança significativa (não acumular)
2. Formato: `tipo(escopo): descrição` (ver CONTRIBUTING.md)
3. Push ao concluir cada issue (não ao final do bloco)
4. Atualizar o status da issue no GitHub ao concluir

### Ao concluir uma engine (B2)
1. Executar `pnpm test` — todos os testes passando
2. Executar `tsc --noEmit` — zero erros TypeScript
   > **Nota:** `tsc --noEmit` verifica compilação TypeScript. Gate Q7 (seção abaixo) é diferente — valida nomenclatura de interfaces. São verificações distintas e ambas são obrigatórias.
3. Executar Shadow Mode — zero divergências críticas novas
4. Criar checkpoint no Manus
5. Registrar evidências (output de test + screenshot Shadow Monitor)
6. Fechar a issue no GitHub com `Closes #N`

### Ao concluir um bloco
1. Push de todos os commits do bloco
2. Criar checkpoint no Manus com descrição do bloco
3. Notificar o Orquestrador para aprovação do gate
4. Aguardar aprovação antes de iniciar o próximo bloco

---

## Evidências obrigatórias por tipo de issue

| Label | Evidência obrigatória |
|-------|----------------------|
| `checkpoint-required` | Versão do checkpoint Manus registrada no PR |
| `shadow-required` | Screenshot do Shadow Monitor ou query SQL com resultado |
| `evidence-required` | Output de `pnpm test` + link do commit |
| `needs-orchestrator` | Aprovação explícita do Orquestrador antes do merge |

---

## Confidence Score — dimensões e pesos

O Confidence Score 98% é calculado sobre as seguintes dimensões:

| Dimensão | Peso | Métrica | Meta |
|----------|------|---------|------|
| Coverage regulatório | 25% | requisitos_cobertos / requisitos_aplicáveis | 100% |
| Qualidade de gaps | 15% | gaps_com_evidência / total_gaps | ≥ 95% |
| Consistência cross-stage | 15% | 1 - (contradições / total_checks) | ≥ 98% |
| Qualidade de perguntas | 10% | média dos scores LLM-as-judge | ≥ 4.0/5.0 |
| Precisão de riscos | 15% | riscos_com_origem_gap / total_riscos | 100% |
| Qualidade de ações | 10% | ações_com_template / total_ações | ≥ 95% |
| Estabilidade Shadow | 10% | 1 - (divergências_críticas / total_checks) | 100% |

**Score mínimo para promoção a produção:** 95%  
**Score alvo da sprint:** 98%

---

## Regras fundamentais (invioláveis)

1. **Fonte obrigatória:** toda pergunta tem `requirement_id` + `source_reference`
2. **Coverage total:** 100% dos requisitos aplicáveis avaliados antes do briefing
3. **Cadeia obrigatória:** Requisito → Gap → Risco → Ação (sem exceção)
4. **Anti-alucinação:** LLM transforma RAG, não cria conhecimento
5. **CNAE condicionado:** sem requisito aplicável → sem questionário

---

## Processos obrigatórios por sprint

| Processo | Momento | Responsável | Critério de aprovação |
|---|---|---|---|
| Gate 0 | Início de cada tarefa | Manus | HEAD confirmado + arquivos de governança lidos |
| Q1–Q5 | Em todo PR | Manus | Declaração explícita no body do PR |
| Q6 | PRs que tocam config/ ou mapeamento | Manus | Query SQL real executada, cobertura ≥ 80% |
| Gate 7 — Auto-auditoria | Fim de cada sprint | Manus executa 6 blocos · Orquestrador analisa · P.O. só valida após APROVADO ou APROVADO COM RESSALVAS resolvidas |

---

## Checkpoints da sprint

| Bloco | Versão Manus | Data | Status |
|-------|-------------|------|--------|
| B0 — Governança GitHub | *(a preencher)* | 2026-03-23 | 🟡 Em andamento |
| B1 — Modelo canônico | *(a preencher)* | *(a definir)* | 🔵 Aguardando B0 |
| B2 — Requirement Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Question Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Gap + Consistency Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Risk + Action Engine | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Briefing + Relatório | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |
| B2 — Shadow + CI + QA | *(a preencher)* | *(a definir)* | 🔵 Aguardando B1 |

---

## Links rápidos

- [Milestone Sprint-98-Confidence](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)
- [Issues abertas da sprint](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues?q=milestone%3ASprint-98-Confidence-Content-Engine+is%3Aopen)
- [ADR-010](../docs/adr/ADR-010-content-architecture-98.md) *(a criar em B1)*
- [Tabela de melhorias técnicas](../docs/product/cpie-v2/produto/TABELA-MELHORIAS-TECNICAS-HOW-v1.md)
- [Playbook v3.0](../docs/product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md)
- [Shadow Monitor](https://iasolaris.manus.space/admin/shadow-monitor)

---

## Erros Recorrentes e Lições Aprendidas

| Data | Erro | Causa Raiz | Resolução |
|------|------|-----------|-----------|
| 2026-04-01 | SOLARIS_GAPS_MAP 96% ineficaz | 7/10 chaves com acentos vs snake_case no banco — grep aceitou como OK, query real revelou falha | Q6 adicionado ao CONTRIBUTING.md |
| 2026-04-07 | Gate Q7 implementado como tsc check | Manus interpretou validação de interface como TypeScript check — `npx tsc --noEmit` não captura divergências de nomenclatura (DIV-Z01-003) | Gate Q7 corrigido para grep de interfaces neste PR |
| 2026-04-07 | Backend implementado sem frontend | product-questions.ts Z-01: 198 testes PASS, UI nunca conectada. Gate FC ausente (DIV-Z01-006) | Gate FC implementado neste PR |

---

## Gate Q7 — Validação de Interface (v4.2 · 2026-04-07)

> **ATENÇÃO:** Gate Q7 NÃO é TypeScript check.
> `npx tsc --noEmit` verifica compilação — já coberto pelo critério "TypeScript 0 erros" desde Sprint K.
> Gate Q7 valida **nomenclatura de campos de interface** contra a spec. São verificações diferentes.

**Quando aplicar:** obrigatório antes de qualquer prompt de testes que
referencie tipos do sistema: DiagnosticLayer · CompleteBriefing ·
TrackedQuestion · GapScore · RiskScore · CpieScore · QuestionResult ·
ou qualquer interface declarada em `server/lib/*.ts`

**Comando obrigatório:**
```bash
grep -rn "export interface\|export type\|export class" \
  server/lib/*.ts server/routers-fluxo-v3.ts \
  | grep -Ei "(diagnostic|briefing|gap|risk|cpie|tracked|question|score)" \
  | sort
```

**O que fazer com o resultado:**
1. Retornar output completo ao Orquestrador
2. Orquestrador confronta com spec (ADR-0009, DEC-M3-*, prompts)
3. SE campo real ≠ campo da spec → abrir DIV antes de prosseguir
4. SE campo real = campo da spec → Gate Q7 PASS · prosseguir

**Resultado obrigatório no body do PR:**
```
## Gate Q7 — Validação de Interface
Interfaces verificadas: [lista]
Divergências encontradas: [N] → [lista de DIVs abertas ou "nenhuma"]
Resultado: [ PASS | DIVERGÊNCIA DOCUMENTADA ]
```

---

## Regra DIV — Divergência de Spec vs Implementação

**O que é uma divergência:**
Qualquer diferença entre o campo/tipo/nome descrito na spec (prompt, ADR,
DEC) e o campo/tipo/nome real no código.

Exemplos:
- Spec: `result.layer` → Código: `result.cnaeCode`
- Spec: `result.sections` → Código: `result.section_identificacao`
- Spec: `status='insuficiente'` → Código: `status='parcial'`

**O que NÃO fazer:**
```
❌ Adaptar o assert silenciosamente
❌ Colocar a divergência só em comentário de código
❌ Ignorar e continuar
❌ Decidir sozinho qual está certo
```

**O que fazer SEMPRE:**
```
1. PARAR a implementação do bloco afetado
2. NÃO adaptar o assert — mantê-lo como na spec
3. CRIAR: docs/divergencias/DIV-{SPRINT}-{ID}-{campo}.md
   (usar template em docs/templates/DIV-TEMPLATE.md)
4. REPORTAR ao Orquestrador com o arquivo gerado
5. AGUARDAR decisão antes de continuar

O Orquestrador decide uma de três opções:
  A) Spec está errada → atualizar ADR/DEC com nome real
  B) Código está errado → corrigir código antes de testar
  C) São equivalentes → registrar como alias no ADR + adaptar assert
```

**Prioridade de reporte:**
```
CRÍTICO (parar sprint): campo inexistente · tipo incompatível · array vs objeto
ALTO (reportar antes do PR): nome diferente · campo opcional vs obrigatório
MÉDIO (reportar no body do PR): valor enum diferente · ordem de campos
```

**Histórico Z-01:**
| ID | Campo | Decisão |
|---|---|---|
| DIV-Z01-001 | DiagnosticLayer.layer vs cnaeCode | Opção A — spec atualizada |
| DIV-Z01-002 | CpieScore hasData | Opção A — spec atualizada |
| DIV-Z01-003 | Gate Q7 tsc vs grep | Opção B — código corrigido (este PR) |

---

## Gate FC — Feature Completeness (v4.3 · 2026-04-07)

**Origem:** BUG-MANUAL-02 — `product-questions.ts` implementado na Sprint Z-01
sem nenhum consumidor no frontend. 198 testes passaram, E2E manual revelou
que o fluxo não existia na UI.

**Quando aplicar:** obrigatório em todo PR que adiciona procedures tRPC novas.

**Comando obrigatório:**
```bash
./scripts/gate-fc.sh
```

**Resultado obrigatório no body do PR:**
```
## Gate FC
Procedures novas: [lista ou "nenhuma"]
Consumidores no frontend: [componentes ou N/A]
Resultado: [ PASS | BLOQUEADO ]
```

**O que o gate teria dito na Sprint Z-01:**
```
❌ BLOQUEADO: 'getProductQuestions' não tem consumidor em client/src/
❌ BLOQUEADO: 'getServiceQuestions' não tem consumidor em client/src/
```

---

## Gate ADR — Architecture Decision Record (v4.4 · 2026-04-07)

**Origem:** E2E manual descobriu que DEC-M3-05 nunca teve ADR no fluxo de
desenvolvimento. O ADR-0010 foi criado APÓS a falha — não antes.

**Quando aplicar:** obrigatório em todo PR que modifica:
  - `server/flowStateMachine.ts`
  - `drizzle/schema.ts`
  - `server/routers-fluxo-v3.ts`
  - `client/src/App.tsx`
  - `client/src/pages/DiagnosticoStepper.tsx`
  - `server/lib/tracked-question.ts`
  - `server/lib/completeness.ts`
  - `server/lib/risk-categorizer.ts`

**Comando obrigatório:**
```bash
./scripts/gate-adr.sh
```

**Fitness Functions automáticas:**
```bash
pnpm vitest run server/integration/fitness-functions.test.ts
```

**Resultado obrigatório no body do PR:**
```
## Gate ADR
Arquivos arquiteturais: [lista]
ADR referenciado: [ ADR-XXXX | N/A ]
Contrato atualizado: [ sim | N/A ]
Fitness: [ PASS | FALHAS ]
Resultado: [ PASS | BLOQUEADO ]
```

**O que fazer SE bloqueado:**
  1. Criar ADR em `docs/adr/ADR-XXXX-descricao.md`
  2. Se mudança de interface: criar `docs/contratos/CONTRATO-*.md`
  3. Atualizar `docs/adr/ADR-INDEX.md`
  4. Re-executar `gate-adr.sh`

**Definição de "done" atualizada — features arquiteturais:**
```
✅ Testes backend PASS
✅ TypeScript 0 erros
✅ Gate Q7 PASS
✅ Gate FC PASS
✅ Gate ADR PASS              ← NOVO v4.4
✅ Fitness Functions PASS     ← NOVO v4.4
✅ PR template preenchido     ← NOVO v4.4
✅ E2E manual pelo P.O.
```

**Princípio:**
> Documentos não participam da entrega. Testes sim.
> Um ADR documenta a decisão. Uma Fitness Function garante a decisão.
> — *Building Evolutionary Architectures* · Neal Ford, Rebecca Parsons, Patrick Kua

---

## Erros recorrentes — histórico

| Data | Erro | Causa | Prevenção ativa |
|---|---|---|---|
| 2026-04-01 | SOLARIS_GAPS_MAP 96% ineficaz | 7/10 chaves com acentos vs snake_case | Q6 adicionado |
| 2026-04-07 | Gate Q7 como tsc check | Manus interpretou validação de interface como TypeScript check | Gate Q7 corrigido para grep |
| 2026-04-07 | Backend sem frontend (BUG-MANUAL-02) | product-questions.ts Z-01 sem consumidor | Gate FC implementado |
| 2026-04-07 | DEC-M3-05 sem ADR no fluxo de dev | ADR-0010 criado após E2E manual revelar falha | Gate ADR implementado |

---

## Gate E2E — Cobertura de Frontend (v4.5 · 2026-04-07)

**Origem:** BUG-MANUAL-02 — 198 testes backend PASS, UI entregava fluxo errado.
O P.O. validou manualmente o que deveria ser verificado automaticamente.

**Princípio:**
> P.O. NÃO valida manualmente antes do workflow e2e-frontend.yml estar verde.
> P.O. valida julgamento, não cliques.

### Quando o Gate E2E é obrigatório

Todo PR que altere qualquer arquivo em:
- `client/src/pages/**`
- `client/src/components/**`
- `client/src/App.tsx`

**Deve ter:**
1. Spec E2E correspondente em `playwright/e2e/`
2. Workflow `e2e-frontend.yml` passando no CI

### Estrutura dos specs E2E

```
playwright/e2e/
  helpers/
    auth.ts          ← loginViaTestEndpoint (sem OAuth)
    projeto.ts       ← criarProjetoViaApi + aguardarStatus
  fluxo-produto.spec.ts    ← E2E-P-01..E2E-P-05
  fluxo-servico.spec.ts    ← E2E-S-01..E2E-S-04
  fluxo-misto.spec.ts      ← E2E-M-01..E2E-M-04
```

### Testes TO-BE (documentação de bugs como contratos)

Testes marcados com `[TO-BE Z-02]` **falham intencionalmente** até Z-02 mergear.
Quando Z-02 mergear, estes testes passam automaticamente — zero alteração nos specs.

| Spec | TO-BE | Documenta |
|---|---|---|
| `fluxo-produto.spec.ts` | E2E-P-03, E2E-P-04, E2E-P-05 | QuestionarioProduto + NaoAplicavelBanner |
| `fluxo-servico.spec.ts` | E2E-S-03, E2E-S-04 | QuestionarioServico + NaoAplicavelBanner |
| `fluxo-misto.spec.ts` | E2E-M-03, E2E-M-04 | Fluxo misto sem banner |

### Configuração de secrets (GitHub)

| Secret | Valor | Onde obter |
|---|---|---|
| `E2E_TEST_SECRET` | Valor de `E2E_TEST_SECRET` no servidor | Manus Secrets |
| `PLAYWRIGHT_BASE_URL` | `https://iasolaris.manus.space` | Fixo |

### Seed do usuário de teste

```bash
npx tsx scripts/seed-test-user.ts
# Cria: e2e-test@solaris.internal (openId: e2e-test-user, role: admin)
```

### Definição de "done" atualizada — features de frontend

```
✅ Testes backend PASS
✅ TypeScript 0 erros
✅ Gate Q7 PASS
✅ Gate FC PASS
✅ Gate ADR PASS
✅ Fitness Functions PASS (FF-23/24/25 incluídas)
✅ E2E specs criados para páginas novas
✅ e2e-frontend.yml PASS no CI
✅ PR template preenchido
✅ E2E manual pelo P.O. (após CI verde)
```

---

## Gate POST-DEPLOY — Smoke Tests de Produção (v4.6 · 2026-04-07)

**Origem:** Z-02 mergeado com 47/47 PASS mas produção exibia QC legado.
Descoberto no E2E manual do P.O. 40 minutos após o merge.
Gate POST-DEPLOY detecta o mesmo problema em < 3 minutos.

### Quando executar

Obrigatório **após todo merge para main** — antes do E2E manual do P.O.

```bash
# Smoke tests de produção (< 60s)
./scripts/smoke.sh https://iasolaris.manus.space

# Com SHA esperado (recomendado):
EXPECTED_SHA=<7-chars-do-commit-mergeado> ./scripts/smoke.sh https://iasolaris.manus.space
```

### Smoke Tests (S-01..S-05)

| ID | Verificação | Critério |
|----|-------------|----------|
| S-01 | `/api/health` responde | `status=healthy` |
| S-02 | SHA match | SHA deployado = SHA esperado |
| S-03 | `/questionario-produto` existe | HTTP 200/302/401 (não 404) |
| S-04 | `/questionario-servico` existe | HTTP 200/302/401 (não 404) |
| S-05 | OAuth API responde | HTTP 200/302/400/401 (não 404) |

### GitHub Action

`.github/workflows/smoke-post-deploy.yml` — dispara automaticamente em `deployment_status`.
Comenta resultado no commit. Falha o workflow se smoke tests falharem.

### Resultado no body do PR

```
## Gate POST-DEPLOY
SHA: [sha-7-chars]
Health: [ healthy | degraded ]
Smoke: [ PASS | FALHOU ]
Resultado: [ PASS | BLOQUEADO ]
```

### Definição de "done" atualizada — qualquer PR (v4.6)

```
✅ Testes backend PASS
✅ TypeScript 0 erros
✅ Gate Q7 PASS
✅ Gate FC PASS
✅ Gate ADR PASS
✅ Fitness Functions PASS (FF-23/24/25 incluídas)
✅ E2E specs criados para páginas novas
✅ e2e-frontend.yml PASS no CI
✅ PR template preenchido
✅ Gate POST-DEPLOY PASS (smoke.sh em produção)  ← NOVO v4.6
✅ E2E manual pelo P.O. (após Gate POST-DEPLOY verde)
```

---

## Regras Operacionais — Manus + Claude Code

### Regra R-SYNC-01 — Sync antes de checkpoint

Antes de executar qualquer checkpoint ou push para S3:
  1. git fetch origin
  2. git reset --hard origin/main
  3. Confirmar que HEAD local == HEAD do GitHub
  4. Só então executar o checkpoint

Violação desta regra causa bifurcação entre
S3 e GitHub — requer force-push para correção.

Gatilho de bifurcação: sempre que Claude Code
mergear PRs diretamente no GitHub sem passar
pelo sistema de checkpoint do Manus.

**Causa raiz documentada:** PRs #473/#474 (Claude Code, Sprint Z-12)
criaram bifurcação detectada em 2026-04-12.
Correção aplicada via autorização do P.O. (Uires Tapajós).
