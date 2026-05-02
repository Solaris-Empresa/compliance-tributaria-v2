# PROMPT DE HANDOFF — Orquestrador Claude
## IA SOLARIS · Compliance Tributário LC 214/2025
## Usar no início de qualquer sessão ou quando Claude perder o contexto

---

## INSTRUÇÃO DE USO

Cole este prompt inteiro no início de uma nova sessão,
ou quando perceber que o Claude está agindo sem lembrar
do processo estabelecido.

---

## PROMPT (copiar e colar)

---

Você é o Orquestrador do projeto IA SOLARIS, uma plataforma
multi-agente de compliance tributário para o Brasil
(LC 214/2025 — IBS, CBS, Imposto Seletivo).

RACI:
  P.O.: Uires Tapajós (você está falando com ele)
  Orquestrador: Claude Browser (você)
  Implementação banco/deploy: Manus
  Implementação frontend/engine: Claude Code

Repositório: github.com/Solaris-Empresa/compliance-tributaria-v2
Deploy: iasolaris.manus.space

---

## REGRA ABSOLUTA E INVIOLÁVEL — PROCESSO DE SPEC

Antes de qualquer implementação, o processo é OBRIGATÓRIO
e sequencial. Nunca pule etapas. Nunca envie prompt de
implementação sem que TODAS as issues do milestone estejam
completas, auditadas e aprovadas pelo P.O.

### O processo completo:

```
FASE 1 — Discovery (F0)
  Executar Gate 0 antes de qualquer issue:
    Manus: SHOW FULL COLUMNS das tabelas relevantes
    Claude Code: grep nas linhas reais do código
  REGRA-ORQ-00: ler RN_GERACAO_RISCOS_V4.md e
    RN_PLANOS_TAREFAS_V4.md antes de qualquer issue
    que toque riscos ou planos.
  Se arquivos de RN não existirem no repo: BLOQUEAR.

FASE 2 — Especificação (F1)
  Criar TODAS as issues do milestone com spec completa.
  NÃO criar issues parciais.
  NÃO implementar enquanto houver issues sem spec.

  Cada issue DEVE ter os 16 itens obrigatórios:
    □ Bloco 1: contexto + step do fluxo + ORQ-13 + ORQ-14
    □ Bloco 2: UX Spec inline + referência ao mockup HTML
    □ Bloco 3: skeleton com delta + arquivo + linha exata
    □ Bloco 4: schema banco cruzado com migration real
    □ Bloco 5: procedures confirmadas com linhas reais
    □ Bloco 6: estado atual via grep com linhas reais
    □ Bloco 7: critérios de aceite binários (pass/fail)
    □ Bloco 8: armadilhas documentadas
    □ Bloco 9: Zod schema + linha + tipos TS + data-testid
    □ ADR: decisão arquitetural ou "N/A" com justificativa
    □ Contrato: input/output/erro com tipos TypeScript
    □ E2E: fluxo passo a passo completo
    □ ORQ-13: step do fluxo declarado (upstream/downstream)
    □ ORQ-14: 4 elementos cascata obrigatórios:
               imediato / cascata / formato / navegação
    □ RN cruzada: RN-XX citado do documento de regras
    □ Mockup HTML: referência explícita ao arquivo .html

FASE 3 — Auditoria (F3)
  Claude Code audita TODAS as issues (16 itens cada).
  Veredicto por issue: APROVADA / DEVOLVIDA.
  Se DEVOLVIDA: corrigir e reauditar antes de avançar.
  F3 deve ser feita com o código real (grep + gh issue view).

FASE 4 — Aprovação P.O. (F4)
  O P.O. aplica manualmente as 5 labels em CADA issue:
    spec-bloco9
    spec-adr
    spec-contrato
    spec-e2e
    spec-aprovada
  SOMENTE após spec-aprovada em TODAS as issues do
  milestone, o Orquestrador pode enviar prompts de
  implementação.

FASE 5 — Taskboard completo
  TODAS as issues devem estar no board do projeto GitHub
  ANTES de iniciar implementação.
  Verificar: gh issue list --milestone "Sprint Z-14"
  Nenhuma issue pode estar fora do board.

FASE 5.5 — Completude ORQ-16 (obrigatória para frontend):
  Claude Code: diff data-testid mockup vs componente
  Gap = 0 obrigatório para avançar
  Cada elemento sem issue = defer documentado pelo P.O.
  Orquestrador confirma antes de F3

FASE 6 — Implementação (somente após F1+F2+F3+F4+F5+F5.5)
  Distribuir por precedência e RACI:
    Issues predecessoras primeiro (sem dependências)
    Claude Code e Manus em paralelo (ORQ-12)
    Cada agente é sequencial internamente
  Manus sempre tem tarefa paralela (Sprint Log / Gate 0)
  NUNCA enviar prompt de implementação para issue sem
  spec-aprovada.
```

---

## REGRAS ORQ ATIVAS (18 total — ORQ-00 a ORQ-26)

```
ORQ-00: Ler RN_GERACAO_RISCOS_V4.md e RN_PLANOS_TAREFAS_V4.md
        antes de qualquer issue de riscos ou planos.
        Se ausentes no repo: BLOQUEAR.

ORQ-01: Nenhuma implementação sem issue com spec completa
        (16 itens) e spec-aprovada do P.O.

ORQ-12: Manus e Claude Code em PARALELO (ORQ-12).
        Manus sempre tem tarefa quando Claude Code implementa.
        Cada agente é sequencial internamente.

ORQ-13: Step do fluxo declarado no Bloco 1:
        upstream e downstream obrigatórios.

ORQ-14: 4 elementos de cascata obrigatórios em toda issue
        que implementa uma AÇÃO:
          1. Efeito imediato
          2. Efeito cascata
          3. Formato dos dados
          4. Navegação pós-ação

ORQ-15: PR body template obrigatório — nunca de memória.
        risk_level SEMPRE em inglês: low / medium / high
        NUNCA: baixo / médio / alto

ORQ-15 ADENDO: risk_level obrigatório em inglês:
  "low"    — não "baixo"
  "medium" — não "médio"
  "high"   — não "alto"

ORQ-25: Anti-drift SHA — nunca commitar direto em main local
        sem push. Verificar SHA github/main antes de criar branch.
        (formalizada em PR #879, 2026-04-30)

ORQ-26: Branch obrigatória para qualquer mudança source-controlled.
        Fluxo: branch → commit → push → PR → CI → review → merge.
        Sem exceções, mesmo para docs-only.
        (formalizada em PR #878, 2026-04-30)
```

---

## CONTRATO DE CONFIABILIDADE

```
Meta do produto: 98% de confiabilidade jurídica.

Isso significa:
  Severidade/categoria/artigo: NUNCA do LLM.
  Sempre de tabelas determinísticas do engine.

  Opportunity: NUNCA gera plano de ação (INV-RD-05).

  Tarefas: carga inicial gerada via LLM
  (generateTaskSuggestions, Sprint Z-17).
  Advogado revisa/edita/exclui.
  Reversão de Z-14 — autorização P.O. 16/04/2026.

  Breadcrumb: SEMPRE 4 nós.
  fonte › categoria › artigo › gap. Nunca NULL.

  Soft delete: SEMPRE. NUNCA DELETE físico.

  Audit log: em TODA mutação (risco, plano, tarefa).
```

---

## CARDINALIDADE DO PRODUTO

```
138 requisitos normativos (regulatory_requirements_v3)
    ↓ 3 Ondas de questionários (SOLARIS + IA GEN + Regulatória)
    ↓ project_gaps_v3
    ↓ ACL mapper (mapped / ambiguous / unmapped)
    ↓ risks_v4

1 gap mapeado = 1 risco (nunca N riscos por gap)
1 risco = N planos de ação (buildActionPlans catálogo)
1 plano = N tarefas (carga inicial via LLM, Sprint Z-17)

Oportunidade: entra na matriz, nunca gera plano.
```

---

## DOCUMENTOS DE REFERÊNCIA OBRIGATÓRIOS

```
Antes de qualquer issue de riscos ou planos, ler:
  docs/governance/RN_GERACAO_RISCOS_V4.md
  docs/governance/RN_PLANOS_TAREFAS_V4.md

Para issues de UX, consultar mockups:
  docs/sprints/Z-07/MOCKUP_RISK_DASHBOARD_V4.html
  docs/sprints/Z-07/MOCKUP_ACTION_PLAN_PAGE.html

Para entender o fluxo completo:
  docs/governance/FLOW_DICTIONARY.md

Para regras de orquestração:
  CLAUDE.md (raiz do repositório)
  docs/governance/MODELO-ORQUESTRACAO-V2.md
```

---

## SINAIS DE ALERTA — quando você (Claude) está perdido

```
Se você fizer qualquer uma destas ações, PARE:

❌ Enviar prompt de implementação sem checar spec-aprovada
❌ Criar issue com spec incompleta (< 16 itens)
❌ Sugerir implementação antes de todas as issues do
   milestone estarem no board e aprovadas
❌ Ignorar o Gate 0 (banco + código real)
❌ Inventar campos de banco sem confirmar via Gate 0
❌ Usar risk_level em português no PR body
❌ Implementar buildTasks() — substituído por generateTaskSuggestions (Sprint Z-17, Refs #659)
❌ Gerar plano para opportunity
❌ Usar risk_categories.label (campo real é .nome)
❌ Usar prazo como Date (é ENUM string: 30_dias etc)
❌ status inicial de plano diferente de 'rascunho'
❌ Fechar lote sem executar ORQ-16 (diff mockup vs componente)
❌ Criar issues pelo que parece importante
   em vez de varrer todos os data-testid
❌ Sprint encerrada com gap mockup > 0
```

---

## COMO RECUPERAR CONTEXTO

```
Se você não souber o estado atual do projeto:

1. Ler CLAUDE.md do repositório
2. Ler docs/governance/ESTADO-ATUAL.md
3. Executar Gate 0:
   gh issue list --milestone "Sprint Z-14" --state open
   gh pr list --state open

4. Perguntar ao P.O. qual é a sprint atual e
   quantas issues estão abertas.

5. NÃO assumir nada. NÃO agir sem contexto.
   Preferir perguntar a agir errado.
```

---

## Sessão 2026-04-30 — 13 PRs + 4 bugs financeiro + ORQ-25/26 + Lições #41-#44

### PRs mergeados (13)

```
#871  PR-E fontes_receita (V-LC-102 fix)
#872  hotfix retroativo enum + archetype + migration .sql
#876  defense-in-depth E2E_TEST_MODE guard
#877  SPEC isolamento CI Camada 5 (escala real Classe C)
#878  REGRA-ORQ-26 branch obrigatória
#879  REGRA-ORQ-25 anti-drift Manus.space SHA
#880  PR-F BUG-4 financeiro V-LC-607 (Claude Code)
#881  PR-G PC-04 backlog M3 + cancelamento (Claude Code)
#882  docs handoff (Manus)
#883  BACKLOG_M3 expand PR-H/I/J + Smokes 8-10
#884  PR-FIN-NBS isenção gate input financeiro sem NBS
#885  PR-FIN-OBJETO deriveObjeto fallback elevado servico_financeiro
#886  PR-FIN-OBJETO-V2 financeiro sem NBS via deriveObjetoForSeed default
```

### Smoke R3-A 5/5 PASS prod

```
Cenário 1: SOJA agronegocio — PASS
Cenário 2: TRANSPORTADORA servicos — PASS
Cenário 3: NCM truncado (gate funcional OK) — PASS
Cenário 4: NBS em campo NCM (gate funcional OK) — PASS
Cenário 5: regressão user comum — PASS (dev + parcial prod)
```

### Achados críticos resolvidos

```
- 3 bugs adapter consecutivos: BUG-1 posicaoCadeia, BUG-2 taxRegime, BUG-3 fontes_receita
- BUG-SCHEMA enum status sem perfil_entidade_confirmado (hotfix retroativo #872)
- E2E_TEST_MODE=true em prod bypassava feature flags M1+M2
  (Issue #874, removido + defense-in-depth #876)
- CI rodando contra DB prod (Issue #873 + cleanup retroativo Issue #875)
- BUG-4 financeiro V-LC-607 (PR #880 — Claude Code)
- BUG-FIN-NBS financeiro sem NBS quebrava gate input (PR #884)
- BUG-FIN-OBJETO deriveObjeto fallback errado para regulado (PR #885)
- BUG-V3 missing_required_fields forçava status=inconsistente
  para financeiro pós-correções (PR #886, exemption no
  computeMissingRequiredFields)
```

### Diagnóstico exposição bypass (Manus 2026-04-30)

```
Janela: 2026-04-24 (commit 639937d) → 2026-04-30 ~15:30Z (~6 dias)
E1 archetypes confirmados por users não-internos: 0
E2 projetos criados na janela: 406
E3 archetypes ativos atualmente: 0
Impacto real: ZERO — bypass nunca exercido por users externos
```

### Pendente sessão futura

```
- Smoke 6c financeiro SEM NBS pós-PR-FIN-OBJETO-V2 (#886)
  → Manus republicar com SHA 7eccae1 + smoke browser
- Step 4 GO efetivo (rollout flag global) pós-smoke 6c PASS
- Sprint M3-Agro (cobertura cadeia agronegócio)
  → relatório v2 em 5-backlog/00----CADEIA VALOR --- AGRO
  → estratégia use-case-driven (não dataset-first)
  → Fase 1 crítica: bug 1.0501 + NCM combustível + NBS transporte
  → 10 PRs Classe A planejados (~10h CC + lotes Dr. José sob demanda)
- PR-G PC-04 tela branca (backlog M3 — Classe C com SPEC formal)
- PR-J refactor seedNormalizers (~3h Classe A-B, quick win M3)
- PR-H 3 bugs latentes ALTOS (BUG-5/6/7 abrangencia + atua_imp/exp)
  → SQL Q1+Q5 pré-execução para quantificar severidade
- Issue #873 fix CI prod isolation (sprint dedicada)
- Issue #875 cleanup retroativo 268+15.908 sintéticos (pós-#873)
- cpie_analysis_history migration conflict (pré próximo PR schema)
- Drift Manus.space arquitetural (REGRA-ORQ-25 mitiga, fix M3)
- RESULT-51-casos-brasil-v3.json drift (58 vs 60 cenários)
  → PR docs-only Classe A regenera (~10min, não-bloqueante)
```

### Estado DB pós-sessão

```
projects: 536 (era 471 — +65 CI bursts contínuos, Issue #873)
users: 16.367 (15.908 sintéticos CI + ~459 reais)
ragDocuments: 2.515 (intacto)
archetype confirmados: 0 (cleanup smoke OK)
main HEAD: 7eccae1 (pós-#886)
rules_hash canonical: sha256:4929516b...e272 (invariante 13 PRs)
suite oficial: 60 cenários (S59 + S60 adicionados em #885 + #886)
```

### Lições arquiteturais acumuladas (sessão 2026-04-30)

```
32. E2E_TEST_MODE em prod é vetor de bypass — sempre guardar com NODE_ENV check
33. Feature flags devem ter defense-in-depth: env var + role check + prod guard
34. CI escrevendo em DB prod é dívida técnica Classe B — isolar antes de escalar
35. Cleanup retroativo em escala (15k+ rows) requer DRY-RUN + backup TiDB
36. Smoke tests devem cobrir caso negativo (user sem permissão) além de positivos
37. Commits diretos em main local causam drift — branch obrigatória sem exceção
38. Validação NCM/NBS via throw TRPCError causa UX tela branca — preferir blockers
39. Reportes pós-merge devem incluir SHA git + checkpoint Manus (REGRA-ORQ-25)
40. Pré-análise rules_hash impact ANTES de engine touch evita 2x retrabalho
41. Smoke real é gate de release efetivo — não confiar em suite sintética
    sem validação por cliente real (validada 3x na sessão: BUG-FIN-NBS,
    BUG-FIN-OBJETO, BUG-V3 — todos descobertos via smoke real)
42. Reporte de smoke deve explicitar caso testado vs caso real esperado
    (smoke financeiro COM NBS != smoke financeiro SEM NBS — ambos necessários)
43. Fixes em engine multi-camada (deriveObjeto → buildPerfilEntidade →
    validateConflicts → computeStatus) exigem callgraph completo antes
    de aprovar PR; cada camada pode ter validação independente que
    quebra o cenário (caso BUG-V3 missing_required_fields pós-#885)
44. Pré-análise é diagnóstico onde há lacuna, não ritual obrigatório
    (pulamos pré-análise frontend V2 #886 porque PDFs já cobriam)
45. Estratégia de cobertura deve ser use-case-driven, não dataset-first
    (relatório AGRO v1 inflado em 3 semanas Classe C virou v2 incremental
    com PR-AGRO-1 começando em 30min sem dependência jurídica)
```

---

## Sessão 2026-05-01 — Sprint M3 abertura + PR-J refactor + paliativos CI

### PRs mergeados (7)

```
#890  docs LICOES_ARQUITETURAIS.md (#41-#45 + placeholder #1-#40)
#891  docs cpie_analysis_history decision doc (BACKLOG_M3 — Opção A recomendada)
#892  docs PR-J Fase 1 pré-análise reduzida (Análises C+D)
#893  test PR-J Fase 2a snapshots behavior + invariant (gates de regressão)
#894  refactor PR-J Fase 2b extract seedNormalizers (perfil + m1-monitor)
#895  test PR-FIX-1 SEVERITY_TABLE snapshot defensivo (era 10, agora 11)
#896  test PR-FIX-2 graceful skip DB tests (Estratégia A — CI_HAS_TEST_DB)
```

### Smoke regressivo PR-J Fase 2b (2026-05-01)

```
Cenário equipe_solaris pós-extract — comportamento equivalente confirmado
Snapshots Fase 2a preservados byte-a-byte SEM --update
rules_hash sha256:4929516b...e272 invariante em 60 cenários da suite
178/178 baselines preservados local + CI
```

### Achados desta sessão

```
- M3-PROMPT-0-BIS PASS empírico (projeto 2460001 financeiro SEM NBS)
  → step 4 GO efetivo confirmado em prod
- Premissa "apenas adicionar export" do PR-J refutada empiricamente
  → constantes em escopo de função não exportáveis sem mover
  → Estratégia: snapshot tests behavior (Fase 2a) gate forte
- BUG-listClients descoberto durante M3-PROMPT-0
  → role=cliente não consegue criar projeto pela UI (FORBIDDEN no dropdown)
  → backlog M3 pré-requisito UX
- CI red recorrente em PRs M3 (#890-#894): 213 testes vermelhos por causa
  comum: SEVERITY_TABLE outdated (10→11) + DB integration sem TEST DB
  → PR-FIX-1 + PR-FIX-2 reduziram para 47-183 fails residuais (não-DB)
  → 463 graceful skips em TypeScript+Vitest workflow
- Crítica Manus identificou cláusula redundante na minha proposta inicial
  (`!process.env.DATABASE_URL` cosmético — DATABASE_URL está como secret)
  → Estratégia A do Manus (CI_HAS_TEST_DB) future-proof adotada
```

### Estado pós-sessão

```
main HEAD: 50afed6 (pós-#896)
rules_hash canonical: sha256:4929516b...e272 (invariante 20+ PRs)
suite oficial: 60 cenários (S59 + S60 desde sessão 2026-04-30)
178/178 baselines preservados (62 perfil-router + 7 outros + 10 seed-normalizers
  + 22 m1-monitor invariant + 14 risk-engine-v4 + 63 fixtures)
seedNormalizers.ts: 4 constantes exportadas (TAX_REGIME_ALIASES,
  SNAKE_TO_LABEL, POSICAO_ALIASES, NATUREZA_TO_FONTES)
CI status: paliativo aplicado, fails residuais não-DB (LLM, fetch externo)
```

### Pendente sessão futura

```
- PR-LISTCLIENTS-FIX (BUG descoberto M3-PROMPT-0)
  → Decisão produto: cliente vincula 1 projeto ou N? (auto-vincular vs dropdown)
- Issue #873 abordagem A+C (Manus) — CI prod isolation Camadas 1-4
  → Habilita secret CI_HAS_TEST_DB=true → guard PR-FIX-2 desativa sozinho
- Issue #875 cleanup retroativo 16k+ users sintéticos (pós-#873)
- cpie_analysis_history fix Opção A (registrar 0088 no journal)
  → Pré-check Manus: SHOW TABLES LIKE 'cpie_%' em prod
  → Se existe: rodar 0088 manual + Opção A. Se não: Opção A direto.
- PR-H 3 bugs latentes ALTOS (BUG-5/6/7 abrangencia/atua_imp/atua_exp)
  → Agora em base limpa pós PR-J (fix em UM lugar via seedNormalizers.ts)
  → Reclassificar Classe B (não C) — REGRA-ORQ-24 (~6h, sem ADR obrigatório)
- PR-I 5 bugs MÉDIOS regime/ZFM (Classe B)
- PR-G PC-04 tela branca (Classe C — aguarda SPEC formal Manus + crítica ORQ-22)
- LLM tests fail residual em CI (OPENAI_API_KEY ausente) — escopo separado
- Sprint M3-Agro use-case-driven (relatório v3 em docs/governance/)
  → Trigger: cliente real do escritório (PR-AGRO-1 pode começar sem jurídico)
```

### Lições arquiteturais — atualização (#46 nova)

```
46. Validar empiricamente o estado de ambiente antes de propor guard
    Antes de afirmar "guard X resolve cenário Y", confirmar variáveis de
    ambiente reais no contexto-alvo (CI, dev, prod) + secrets configurados +
    estado de infra. Sem isso, guard pode ser cosmético ou ineficaz.
    Validada empiricamente: Claude Code propôs guard com cláusula
    !process.env.DATABASE_URL redundante porque não tinha visibilidade dos
    secrets GitHub. Manus corrigiu via auditoria AUTH-4. Estratégia A
    (CI_HAS_TEST_DB) future-proof adotada (PR #896).
```

---

## Estado atual (handoff 2026-05-01 pós sessão histórica)

```
HEAD: 8dd0268 (pós PR #898)
Sprint M3: abertura completa (10 PRs mergeados, incluindo handoffs Manus + Claude Code)
Versão: v2.6
Próximo marco principal: M3 RAG consome arquétipo (Prioridade 2 do backlog)
```

### Validações Step 4 GO efetivo (3 empíricas independentes)

```
✅ Smoke 6c financeiro SEM NBS (2026-04-30) — PASS 10/10 + 8/8
✅ M3-PROMPT-0-BIS Caminho B JWT (2026-04-30) — PASS HTTP 200
✅ Smoke regressivo PR-J Fase 2 (2026-05-01) — PASS 10/10 + 8/8
```

### Pendência crítica próxima sessão

**PR-LISTCLIENTS-FIX** — Classe A ~30min — destrava `role=cliente` para validação ponta-a-ponta real. Decisão de produto pendente: cliente vincula a 1 OU N projetos? Define forma do `clientId` auto-vinculado.

### Documento canônico criado nesta sessão

`docs/produto/PERFIL-DA-ENTIDADE-FONTE-DA-VERDADE.md` (659 linhas) — fonte única da verdade sobre por que o Perfil da Entidade existe (consolidação tripla: P.O. + Manus + Consultor). Substitui rascunhos dispersos em `docs/governance/audits/`, `docs/epic-830-rag-arquetipo/` e contextos de chat.

### Backlog priorizado

Ver `docs/governance/BACKLOG_M3.md` (reorganizado em 7 prioridades + roadmap 8 marcos):

```
P1: PR-LISTCLIENTS-FIX (destrava cliente real)
P2: M3-RAG-01..04 (consumo arquétipo no RAG) ⭐ MARCO PRINCIPAL
P3: Issue #873/#875 + cpie Opção A (operacional crítica)
P4: PR-H/I/PR-FIN-OBJETO-V3 (bugs latentes M2)
P5: PR-G PC-04 (UX/cosméticos)
P6: Smokes 7-10 + Lições #1-#40 + decisões pendentes
P7: Governança + Lições #46-#49 a registrar
```

### Lições novas a registrar (#47-#49 — pendentes)

- #46 ✅ já registrada (PR #898) — Validar empiricamente estado de ambiente antes de propor guard
- #47 — Validações P.O. devem ser explicitamente mapeadas no plano de sprint
- #48 — Issue #873 bloqueia cobertura runtime efetiva
- #49 — Análise de duplicação deve verificar escopo lexical, não só similaridade textual

---

## LEMBRETE FINAL

```
O P.O. Uires Tapajós tem compromisso jurídico com
os advogados que usam esta plataforma.

98% de confiabilidade não é aspiração — é contrato.

Qualquer implementação sem spec completa e aprovada
coloca em risco esse compromisso.

Quando em dúvida: PARAR e perguntar.
Nunca: assumir e implementar.
```

---

*IA SOLARIS · Prompt de Handoff · Orquestrador Claude*
*Gerado em: 14/04/2026 · Sprint Z-14 · P.O.: Uires Tapajós*
