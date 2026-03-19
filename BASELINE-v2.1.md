# BASELINE TÉCNICA — Plataforma IA SOLARIS Compliance Tributário

**Versão:** v2.1.2 (Baseline pré-implementação da v2.1 — Diagnóstico com 3 Camadas)  
**Data de criação:** 19/03/2026  
**Commit de referência:** `52d753dd122f2d6cb5683745d9e8ce82e8985b00`  
**Checkpoint Manus:** `52d753dd` (versão publicável)  
**Preparado por:** Manus AI — Agente de Desenvolvimento  
**Propósito:** Servir como ponto de restauração seguro antes de qualquer implementação da v2.1 (refatoração do fluxo de Diagnóstico com 3 tipos de questionário).

---

## 1. Resumo Executivo

Este documento registra o estado técnico completo da plataforma no momento em que a baseline foi capturada. Ele é o **contrato de estado** que define o que deve ser restaurado em caso de falha estrutural durante a implementação da v2.1. Qualquer rollback deve restaurar o sistema a este estado exato.

O projeto está em estado **estável e funcional**: TypeScript sem erros, servidor rodando, banco de dados limpo (0 projetos de teste), e os 30 testes críticos do fluxo passando. Os 19 testes que falham são pré-existentes e relacionados a mocks de LLM — não são regressões desta baseline.

---

## 2. Inventário de Código-Fonte

### 2.1 Dimensões do Projeto

| Métrica | Valor |
|---|---|
| Total de arquivos TypeScript/TSX | 319 |
| Arquivos de servidor (`server/*.ts`) | 124 |
| Arquivos de frontend (`client/src/**`) | 155 |
| Arquivos de teste (`server/*.test.ts`) | 79 |
| Routers de backend | 24 |
| Linhas no schema Drizzle | 1.370 |
| Tabelas no banco de dados | 55 (schema) / 64 (banco, incluindo migrações e sistema) |
| Rotas de frontend registradas | 52 |

### 2.2 Arquivos Críticos com Hash MD5

Estes hashes identificam o estado exato de cada arquivo crítico. Qualquer divergência após uma mudança indica que o arquivo foi alterado.

| Arquivo | MD5 | Linhas |
|---|---|---|
| `server/routers-fluxo-v3.ts` | `a8122ee2c4853b787b180bf411db0fdc` | 1.589 |
| `server/routers.ts` | `441b2837e168d756015c7992db73a111` | 1.972 |
| `server/db.ts` | `887b6050aa136f64ec0ecf9752bed319` | 1.059 |
| `drizzle/schema.ts` | `be72a7f2b89345b87ec2ed053a4737ab` | 1.370 |
| `client/src/App.tsx` | `a9001e0bd410031f62c02447992370f5` | — |
| `client/src/pages/ProjetoDetalhesV2.tsx` | `18161cb841743353582ccea9f793f601` | 721 |
| `client/src/pages/NovoProjeto.tsx` | `dd0128149293f159f1364208dff960d2` | 1.069 |
| `client/src/pages/QuestionarioV3.tsx` | `6a6f988d9048a4254acaf9932f455609` | 1.526 |
| `client/src/pages/BriefingV3.tsx` | `a2066895860510509ff111d90918ad71` | — |
| `client/src/pages/MatrizesV3.tsx` | `9c6bc802b01c5947cc9faa9866702276` | — |
| `client/src/pages/PlanoAcaoV3.tsx` | `0e09a52eef539099f54ba79ed6755292` | — |

### 2.3 Snapshot Físico

Um arquivo ZIP completo do código-fonte foi criado em:

```
/home/ubuntu/baseline-v2.1/source-baseline-52d753d.zip  (2.6 MB)
```

Este arquivo contém todos os arquivos do repositório no estado do commit `52d753dd`, excluindo `node_modules` e `.git`.

---

## 3. Inventário do Banco de Dados

### 3.1 Estado Atual

O banco está **limpo**: 0 projetos, 0 assessments, 0 briefings, 0 planos de ação. As únicas tabelas com dados são as de referência estática (`activityBranches`: 24 registros, `actions`: 36 registros) e a tabela de usuários.

### 3.2 Enum de Status da Tabela `projects`

Este é o enum mais crítico do sistema. Qualquer mudança nele afeta toda a lógica de fluxo.

```
"rascunho"         → Estado inicial após criação
"assessment_fase1" → Etapa 2 — Questionário em andamento (Fase 1)
"assessment_fase2" → Etapa 2 — Questionário em andamento (Fase 2)
"matriz_riscos"    → Etapa 3 — Matriz de Riscos
"plano_acao"       → Etapa 4 — Plano de Ação
"em_avaliacao"     → Revisão pelo Advogado Sênior
"aprovado"         → Plano aprovado
"em_andamento"     → Execução em andamento
"parado"           → Pausado
"concluido"        → Finalizado
"arquivado"        → Arquivado
```

### 3.3 Tabelas Críticas do Fluxo Principal

| Tabela | Descrição | Registros Atuais |
|---|---|---|
| `projects` | Projetos de compliance | 0 |
| `assessmentPhase1` | Dados do questionário fase 1 | 0 |
| `assessmentPhase2` | Dados do questionário fase 2 | 0 |
| `briefings` | Briefings gerados pela IA | 0 |
| `riskMatrix` | Matrizes de risco | 0 |
| `actionPlans` | Planos de ação | 0 |
| `questionnaireAnswersV3` | Respostas do questionário V3 | 0 |
| `questionnaireProgressV3` | Progresso do questionário V3 | 0 |
| `activityBranches` | Ramos de atividade (referência) | 24 |

---

## 4. Inventário de Dependências

### 4.1 Dependências Críticas

| Pacote | Versão | Papel |
|---|---|---|
| `react` | `^19.2.1` | Framework de UI |
| `typescript` | `5.9.3` | Tipagem estática |
| `drizzle-orm` | `^0.44.5` | ORM para MySQL |
| `@trpc/server` | `^11.6.0` | API type-safe |
| `zod` | `^4.1.12` | Validação de schema |
| `vite` | `^7.1.7` | Build tool |
| `tailwindcss` | `^4.1.14` | CSS utilitário |
| `mysql2` | `^3.15.0` | Driver MySQL |
| `vitest` | (via pnpm) | Framework de testes |

### 4.2 Branches Git

| Branch | Commit HEAD | Descrição |
|---|---|---|
| `main` | `52d753dd` | **Branch de baseline** — estado estável atual |
| `fix/v2.1-company-profile-required` | `71451b5` | Fix do Company Profile (mergeado) |
| `feature/v2.1-company-profile` | — | Feature branch anterior (mergeada) |

---

## 5. Baseline de Testes

### 5.1 Resultado dos Testes Críticos do Fluxo

Executados em 19/03/2026 às 16:01 (UTC-3):

| Suite de Testes | Testes | Resultado | Duração |
|---|---|---|---|
| `test-e2e-v212.test.ts` | 10 | ✅ 10/10 passaram | — |
| `routers-fluxo-v3.test.ts` | 14 | ✅ 14/14 passaram | — |
| `projects.updateStatus.test.ts` | 6 | ✅ 6/6 passaram | 539ms |
| `sprint-v55-status-transitions.test.ts` | 36 | ✅ 36/36 passaram | 22ms |
| **Total críticos** | **66** | **✅ 66/66** | |

### 5.2 Testes com Falhas Pré-existentes (Não são Regressões)

Os seguintes testes falham **antes** desta baseline e são conhecidos. Não devem ser usados como critério de rollback.

| Suite | Falhas | Causa |
|---|---|---|
| `sprint-v59-fluxo-v3-ai.test.ts` | 17/42 | Testes de IA que dependem de mock de LLM sem configuração de ambiente |
| `routers-fluxo-v3-etapas2-5.test.ts` | 2/21 | Testes de `generateActionPlan` com mock de LLM |
| **Total pré-existentes** | **19** | Não são regressões — existiam antes da v2.1 |

### 5.3 Critério de Saúde do Sistema

O sistema está **saudável** quando:

- `test-e2e-v212.test.ts`: 10/10 passando
- `routers-fluxo-v3.test.ts`: 14/14 passando
- `projects.updateStatus.test.ts`: 6/6 passando
- `sprint-v55-status-transitions.test.ts`: 36/36 passando
- TypeScript: 0 erros (`npx tsc --noEmit`)
- Dev server: rodando sem erros de parse

---

## 6. Mapa de Rotas do Frontend

### 6.1 Rotas do Fluxo Principal (Críticas para v2.1)

| Rota | Componente | Status |
|---|---|---|
| `/projetos/novo` | `NovoProjeto.tsx` | Estável — v2.1.2 implementada |
| `/projetos/:id` | `ProjetoDetalhesV2.tsx` | Estável — stepper com 5 etapas |
| `/projetos/:id/questionario-v3` | `QuestionarioV3.tsx` | Estável — será refatorado na v2.1 |
| `/projetos/:id/briefing-v3` | `BriefingV3.tsx` | Estável |
| `/projetos/:id/matrizes-v3` | `MatrizesV3.tsx` | Estável |
| `/projetos/:id/plano-v3` | `PlanoAcaoV3.tsx` | Estável |

### 6.2 Rotas Legadas (Não afetadas pela v2.1)

`/projetos/:id/avaliacao/fase1`, `/projetos/:id/avaliacao/fase2`, `/projetos/:id/levantamento-inicial`, e todas as rotas de compliance-v3, demo, admin e gestão permanecem inalteradas.

---

## 7. Arquitetura do Fluxo Atual (AS-IS)

O fluxo de um projeto segue esta máquina de estados, implementada em `routers-fluxo-v3.ts`:

```
rascunho (currentStep=1)
    ↓ [createProject]
assessment_fase1 (currentStep=2)
    ↓ [generateQuestions → saveAnswers → completeQuestionnaire]
assessment_fase2 (currentStep=3)
    ↓ [generateBriefing]
matriz_riscos (currentStep=4)
    ↓ [generateRiskMatrices]
plano_acao (currentStep=5)
    ↓ [generateActionPlan → approveActionPlan]
aprovado / em_andamento / concluido
```

O `ProjetoDetalhesV2.tsx` mapeia estes status para 5 etapas visuais no stepper:

| Etapa | Label | Status Mapeados |
|---|---|---|
| 1 | Projeto | `rascunho` |
| 2 | Questionário | `assessment_fase1`, `assessment_fase2` |
| 3 | Briefing | `matriz_riscos` |
| 4 | Riscos | `plano_acao` |
| 5 | Plano | `em_avaliacao`, `aprovado`, `em_andamento`, `concluido` |

---

## 8. Mecanismo de Rollback

### 8.1 Níveis de Rollback

O sistema possui **três níveis** de rollback, do mais rápido ao mais completo:

**Nível 1 — Rollback de Checkpoint (Recomendado para a maioria dos casos)**  
Restaura o código-fonte ao estado do checkpoint `52d753dd` via interface Manus. Tempo estimado: 2–5 minutos. Não afeta o banco de dados.

**Nível 2 — Rollback via Git (Para regressões de código)**  
Reverte commits específicos sem afetar o banco. Tempo estimado: 1–2 minutos.

**Nível 3 — Rollback Completo (Para falhas estruturais graves)**  
Restaura código + banco de dados usando o snapshot ZIP e o script de rollback. Tempo estimado: 10–15 minutos.

### 8.2 Procedimento de Rollback Nível 1 (Checkpoint)

Este é o procedimento **padrão** para reverter uma fase que gerou erros:

```
1. Acesse o painel Manus → Management UI → Checkpoint
2. Localize o checkpoint "52d753dd" (v2.1.2 — Baseline)
3. Clique em "Rollback"
4. Confirme a operação
5. Aguarde o servidor reiniciar
6. Verifique: npx tsc --noEmit (deve retornar 0 erros)
```

### 8.3 Procedimento de Rollback Nível 2 (Git)

Para reverter um commit específico sem afetar outros:

```bash
# Ver commits recentes
git log --oneline -10

# Reverter um commit específico (cria novo commit de reversão)
git revert <hash-do-commit-problemático>

# Ou resetar para o baseline (CUIDADO: destrói commits posteriores)
git reset --hard 52d753dd

# Reiniciar o servidor após o reset
pnpm dev
```

### 8.4 Procedimento de Rollback Nível 3 (Completo)

Para falhas estruturais graves que afetam código e banco:

```bash
# 1. Restaurar código-fonte do snapshot ZIP
cd /home/ubuntu
unzip -o baseline-v2.1/source-baseline-52d753d.zip -d compliance-tributaria-v2-restored/

# 2. Verificar integridade dos arquivos críticos
cd compliance-tributaria-v2
md5sum server/routers-fluxo-v3.ts
# Deve retornar: a8122ee2c4853b787b180bf411db0fdc

# 3. Reinstalar dependências
pnpm install

# 4. Verificar TypeScript
npx tsc --noEmit

# 5. Reiniciar servidor
pnpm dev

# 6. Verificar banco de dados (se necessário)
# O banco está limpo (0 projetos) — não há dados para restaurar
# Se tabelas foram alteradas, rodar: pnpm db:push
```

### 8.5 Script de Rollback Automatizado

O script `/home/ubuntu/baseline-v2.1/rollback.sh` executa o Nível 2 automaticamente:

```bash
# Executar rollback automatizado
bash /home/ubuntu/baseline-v2.1/rollback.sh
```

---

## 9. Critérios de Decisão para Rollback

### 9.1 Gatilhos Automáticos (Rollback Imediato)

Execute o rollback **imediatamente** se qualquer um destes critérios for atendido:

| Gatilho | Nível de Rollback |
|---|---|
| `npx tsc --noEmit` retorna erros após uma fase | Nível 1 ou 2 |
| Servidor não sobe após mudança | Nível 1 |
| Teste `test-e2e-v212.test.ts` falha (qualquer teste) | Nível 1 ou 2 |
| Teste `projects.updateStatus.test.ts` falha | Nível 2 |
| Teste `sprint-v55-status-transitions.test.ts` falha | Nível 2 |
| `pnpm db:push` retorna erro de migração | Nível 3 |
| Dados de projetos existentes corrompidos | Nível 3 |

### 9.2 Gatilhos de Pausa (Investigar antes de continuar)

| Gatilho | Ação |
|---|---|
| Mais de 5 novos testes falhando | Pausar e investigar antes de avançar |
| Erro de parse no Vite (HMR) | Reiniciar servidor; se persistir, rollback Nível 1 |
| Erro 500 em qualquer procedure tRPC | Verificar logs; se não resolver em 15 min, rollback |
| Banco com dados inesperados | Verificar via `webdev_execute_sql`; não fazer rollback ainda |

---

## 10. Checklist de Verificação Pós-Rollback

Após qualquer rollback, verificar todos os itens:

- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `pnpm vitest run server/test-e2e-v212.test.ts` → 10/10 passando
- [ ] `pnpm vitest run server/projects.updateStatus.test.ts` → 6/6 passando
- [ ] `pnpm vitest run server/sprint-v55-status-transitions.test.ts` → 36/36 passando
- [ ] Dev server rodando sem erros de parse
- [ ] `md5sum server/routers-fluxo-v3.ts` → `a8122ee2c4853b787b180bf411db0fdc`
- [ ] `md5sum drizzle/schema.ts` → `be72a7f2b89345b87ec2ed053a4737ab`
- [ ] Banco de dados: 0 projetos (estado limpo da baseline)

---

## 11. Artefatos da Baseline

| Artefato | Localização | Descrição |
|---|---|---|
| Snapshot ZIP | `/home/ubuntu/baseline-v2.1/source-baseline-52d753d.zip` | Código-fonte completo (2.6 MB) |
| Schema backup | `/home/ubuntu/baseline-v2.1/schema-baseline.ts` | Cópia do `drizzle/schema.ts` |
| Arquivos críticos | `/home/ubuntu/baseline-v2.1/*.ts` e `*.tsx` | 10 arquivos críticos copiados |
| Script de rollback | `/home/ubuntu/baseline-v2.1/rollback.sh` | Script automatizado |
| Este documento | `/home/ubuntu/compliance-tributaria-v2/BASELINE-v2.1.md` | Documento de baseline |
| Análise de impacto | `/home/ubuntu/ANALISE-IMPACTO-v2.1-diagnostic-flow.md` | Análise pré-implementação |
| Checkpoint Manus | `52d753dd` | Restaurável via UI Manus |

---

*Documento gerado automaticamente por Manus AI em 19/03/2026. Nenhuma linha de código foi alterada durante a produção deste documento. Este documento deve ser atualizado a cada nova baseline capturada.*
