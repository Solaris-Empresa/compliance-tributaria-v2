# Projeto IA SOLARIS — Compliance da Reforma Tributária
## Documento de Projeto

| Campo | Valor |
|---|---|
| **Versão** | 2.00 |
| **Data** | 23 de Março de 2026 |
| **Versão anterior** | 1.00 (documento fundacional — reposicionamento estratégico) |
| **Sprint de referência** | v5.3.0 (versão atual em produção) |
| **Status** | Em UAT — aguardando aprovação jurídica para ativar modo `new` |
| **Domínio de produção** | iasolaris.manus.space |
| **Repositório** | github.com/Solaris-Empresa/compliance-tributaria-v2 |

> **Sobre este documento:** O v1.00 registrou a visão estratégica e o reposicionamento do produto — de um fluxo centrado em CNAE para um fluxo centrado em requisitos regulatórios de compliance. O v2.00 registra o que foi **efetivamente construído e validado** a partir dessa visão, com as decisões arquiteturais tomadas, os motores implementados, as métricas reais de produção e o estado atual da plataforma.

---

## Sumário

1. O Que a Plataforma É (Visão Correta)
2. Reposicionamento Estratégico — De CNAE para Requisitos Regulatórios
3. Pipeline Completo da Plataforma (Estado Atual)
4. Como a IA Está Sendo Usada
5. Motores de Negócio Implementados
6. Arquitetura de Diagnóstico Dual V1/V3
7. Shadow Mode — Protocolo de Migração
8. Suite de Validação Automatizada
9. Estado Atual da Plataforma (Métricas de Produção)
10. Protocolo UAT com Advogados
11. Roadmap e Próximos Passos
12. Papéis e Responsabilidades
13. Definition of Done
14. Decisões Arquiteturais (ADRs)

---

## 1. O Que a Plataforma É (Visão Correta)

A **IA SOLARIS** não é um "assistente de IA". É um:

> **Sistema de Diagnóstico + Decisão + Execução orientado por IA** — um motor de compliance tributário orientado a requisitos regulatórios, com pipeline híbrido (LLM + RAG + scoring determinístico + workflow operacional).

**Em uma frase:** A IA SOLARIS é um **ERP cognitivo de compliance tributário** que transforma a Reforma Tributária Brasileira (EC 132/2023, LC 214/2025, LC 227/2024) em um processo estruturado e executável.

**Proposta de valor central:** Transformar 499 requisitos legais complexos em um diagnóstico empresarial acionável, com score de compliance por domínio, identificação de gaps classificados por nível e criticidade, e plano de ação com tarefas atômicas rastreáveis até o requisito de origem.

**O que o produto entrega:**

| Camada | Entrega |
|---|---|
| Diagnóstico | Score de compliance por domínio + score global |
| Gaps | Classificação por tipo, nível e criticidade |
| Riscos | Matriz derivada dos gaps (não de IA solta) |
| Plano | Tarefas atômicas com rastreabilidade requisito → gap → risco → ação |
| Visualização | Radar de compliance, painel de gaps, painel de riscos |

---

## 2. Reposicionamento Estratégico — De CNAE para Requisitos Regulatórios

### 2.1 O Erro Original e a Correção

O documento v1.00 identificou o erro estrutural central: o produto havia sido construído com **CNAE como camada raiz**, quando o correto é:

> **OBRIGAÇÕES DE COMPLIANCE 2026 → diagnóstico → gaps → plano**

O CNAE passou a ser **camada de contextualização e especialização**, não mais a camada de início. Isso preservou os embeddings e a personalização setorial já construídos, mas mudou o motor conceitual do produto.

| Antes (v1.00 — errado) | Depois (v2.00 — correto) |
|---|---|
| CNAE → perguntas → análise → plano | Requisitos regulatórios → assessment → gaps → riscos → plano |
| IA cria perguntas livremente | Sistema sabe o que precisa ser cumprido; IA investiga |
| Diagnóstico centrado em setor | Diagnóstico centrado em obrigação legal |
| Plano genérico derivado da IA | Plano atômico derivado dos gaps formalizados |

### 2.2 O Novo Funil (Implementado)

O funil em camadas proposto no v1.00 foi implementado no fluxo V3:

**Camada 1 — Diagnóstico Base (universal):** Perguntas que valem para qualquer empresa, derivadas dos 499 requisitos canônicos organizados em 9 domínios.

**Camada 2 — Especialização por CNAE/Setor:** O CNAE ajusta o peso e a profundidade das perguntas, mas não é mais o ponto de partida. Os 1.332 CNAEs vetorizados com embeddings `text-embedding-3-small` permitem personalização semântica sem depender de correspondência exata.

**Camada 3 — Profundidade Operacional:** Instruções Normativas, layouts fiscais, ERP, processos reais — o nível de detalhe que transforma o diagnóstico em plano executável.

### 2.3 Os 499 Requisitos Canônicos

O mapa canônico de requisitos regulatórios foi implementado com 499 requisitos organizados em 9 domínios:

| Domínio | Descrição | Exemplos de Requisitos |
|---|---|---|
| `fiscal_tributario` | CBS/IBS, apuração, créditos, não cumulatividade | Adaptar apuração CBS/IBS, mapear crédito na cadeia |
| `obrigacoes_acessorias` | NF-e/NFS-e, declarações, integrações | Adaptar NF-e para novos campos CBS/IBS |
| `juridico` | Revisão de contratos, cláusulas tributárias | Inserir cláusula de repasse tributário |
| `operacional` | Processos internos, fluxos de trabalho | Revisar processo de compras para split payment |
| `tecnologia_erp` | ERP, parametrização fiscal, integrações | Atualizar CST para CBS, parametrizar alíquotas |
| `financeiro` | Impacto de caixa, formação de preço, margem | Recalcular margem com CBS/IBS |
| `contratos` | Contratos com fornecedores e clientes | Revisar contratos de longo prazo |
| `cadeia_valor` | Fornecedores, clientes, crédito na cadeia | Mapear crédito IBS na cadeia de fornecedores |
| `cadastro_classificacao` | NCM, CNAE, classificação fiscal | Reclassificar produtos conforme nova sistemática |

---

## 3. Pipeline Completo da Plataforma (Estado Atual)

O pipeline implementado no fluxo V3 tem 5 etapas sequenciais com gates obrigatórios:

```
INPUT (descrição do negócio)
       ↓
[Etapa 1] Extração e refinamento de CNAEs
          (embeddings + IA + fallback semântico)
       ↓
[Etapa 2] Questionário adaptativo
          (IA + RAG + 499 requisitos canônicos)
       ↓
[Etapa 3] Briefing executivo
          (IA + RAG + estrutura jurídica)
       ↓
[Etapa 4] Matrizes de Riscos
          (IA + Gap Engine + Risk Engine determinístico)
       ↓
[Etapa 5] Plano de Ação
          (IA + tarefas atômicas + rastreabilidade)
       ↓
OUTPUT FINAL:
→ Decisão executiva + plano operacional rastreável
→ Score por domínio + radar de compliance
→ Matriz de riscos derivada dos gaps
→ Tarefas atômicas: requisito → gap → risco → ação
```

### Gates Obrigatórios

Cada etapa tem um gate que impede o avanço sem os dados mínimos. O gate de retrocesso (ADR-007) executa `cleanupOnRetrocesso()` automaticamente ao retroceder, removendo os dados gerados pela IA na etapa abandonada e registrando a operação em `projectAuditLog`.

---

## 4. Como a IA Está Sendo Usada

A plataforma usa IA em 3 camadas inteligentes, não de forma genérica:

### Camada 1 — Memória Semântica (Embeddings)

O modelo `text-embedding-3-small` da OpenAI vetorizou os **1.332 CNAEs** da tabela IBGE. A busca usa similaridade de cosseno com multi-query e merge em 2 camadas. Esta é a maior inovação técnica da plataforma: resolve o problema crítico de mercado de identificação correta de atividade econômica sem depender de código exato.

**Fallback semântico:** Se o GPT-4.1 não responder em 25 segundos na extração de CNAEs, o sistema retorna automaticamente os top-5 CNAEs por similaridade de cosseno do cache de embeddings. O frontend exibe um banner amber informativo.

### Camada 2 — RAG Jurídico

O corpus RAG contém **1.241 documentos** — artigos legais da EC 132, LC 214, LC 227, LC 224, instruções normativas e cartilhas da Receita Federal. A busca usa estratégia híbrida (LIKE + re-ranking semântico) com temperatura 0.0 para precisão máxima. Isso garante redução de alucinação, auditabilidade e base jurídica defensável.

### Camada 3 — LLM (GPT-4.1)

O GPT-4.1 é responsável por 7 pontos críticos do pipeline, sempre com controle rigoroso:

| Ponto | Procedure | Temperatura | Timeout |
|---|---|---|---|
| Extração de CNAEs | `extractCnaes` | 0.1 | 25s (com fallback) |
| Refinamento de CNAEs | `refineCnaes` | 0.2 | 180s |
| Geração de questionário | `generateQuestions` | 0.3 | 180s |
| Geração de briefing | `generateBriefing` | 0.2 | 180s |
| Geração de matrizes | `generateRiskMatrices` | 0.1 | 180s |
| Geração do plano | `generateActionPlan` | 0.2 | 180s |
| Decisão executiva | `generateDecision` | 0.35 | 180s |

Todos os outputs são validados por schema Zod antes de persistência. Retry automático em caso de falha.

### Camada 4 — Motor Determinístico

O scoring de risco, impacto financeiro e classificação de gaps são **calculados deterministicamente**, não inferidos pela IA. Isso é crítico: a plataforma não depende da IA para decisões finais.

---

## 5. Motores de Negócio Implementados

### 5.1 Gap Engine

Transforma respostas do assessment em gaps auditáveis. Todo gap nasce de um requisito regulatório e de evidências do assessment.

```
score = round((compliant + 0.5×parcial) / total_aplicavel × 100)

Resposta "sim"           → compliant
Resposta "nao"           → nao_compliant + severity alta
Resposta "parcial"       → parcial + severity media
Resposta "nao_aplicavel" → excluído do score
```

**Modelo de gap implementado:**

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Identificador único |
| `requisito_id` | string | Requisito canônico de origem |
| `dominio` | enum | Um dos 9 domínios |
| `tipo_gap` | enum | normativo, processo, sistema, cadastro, contrato, fiscal, acessoria, governanca |
| `status_atendimento` | enum | atendido, parcialmente_atendido, nao_atendido, inconclusivo |
| `nivel_gap` | enum | estrategico, tatico, operacional, tecnico |
| `criticidade` | enum | critico, alto, medio, baixo |
| `confidence_score` | float | Confiança da classificação (0–1) |

### 5.2 Risk Engine

Deriva a matriz de riscos a partir dos gaps formalizados — não de inferência aberta da IA.

```
Regra: gap → risco

base_score:
  obrigacao/vedacao + critica = 100 | alta = 80 | media = 60 | baixa = 40
  direito           + critica = 70  | alta = 50 | media = 35 | baixa = 20
  opcao             + critica = 45  | alta = 30 | media = 20 | baixa = 15

gap_multiplier:
  nao_compliant = 1.0 | parcial = 0.5 | compliant = 0 | nao_aplicavel = 0

risk_score = base_score × gap_multiplier (cap: 100)

risk_level:
  critico (≥70) | alto (50–69) | medio (25–49) | baixo (0–24)
```

### 5.3 Consistency Engine

Implementado na Sprint v5.2.0. Realiza análise determinística e IA de consistência dos dados do projeto antes de permitir o avanço para o diagnóstico:

**Análise determinística:** Faturamento vs. porte declarado, regime tributário vs. faturamento, número de funcionários vs. porte, CNAE vs. setor declarado.

**Análise IA (GPT-4.1):** Consistência entre perfil e atividades, coerência dos dados financeiros, identificação de inconsistências sutis.

**Gate de consistência:**
- `critical` → bloqueia diagnóstico (usuário deve corrigir)
- `high` → exige confirmação explícita ("assumir risco")
- `medium/low` → exibe aviso, não bloqueia

### 5.4 Plano de Ação com Tarefas Atômicas

O plano de ação é derivado dos riscos aprovados, no menor nível viável de tarefa. A rastreabilidade é completa: `requisito → gap → risco → ação → tarefa atômica`.

**Modelo de tarefa atômica implementado:**

| Campo | Descrição |
|---|---|
| `requisito_id` | Requisito canônico de origem |
| `gap_id` | Gap que originou a ação |
| `risk_id` | Risco que originou a tarefa |
| `tipo_tarefa` | configuracao_erp, ajuste_cadastro, revisao_contrato, parametrizacao_fiscal, treinamento, etc. |
| `area` | Área responsável (TI, Fiscal, Jurídico, etc.) |
| `responsavel_sugerido` | Perfil sugerido pelo sistema |
| `prazo_sugerido` | Prazo em dias |
| `criterio_conclusao` | Critério objetivo de conclusão |
| `evidencia_esperada` | Evidência documental esperada |

---

## 6. Arquitetura de Diagnóstico Dual V1/V3

### 6.1 Contexto e Decisão

Durante a implementação do fluxo V3 (requisitos canônicos), surgiu o desafio de manter compatibilidade com os **2.145 projetos existentes** criados no fluxo V1 (centrado em CNAE). A decisão arquitetural (ADR-005) foi manter os dois motores coexistentes com um adaptador unificado de leitura.

### 6.2 O Adaptador `getDiagnosticSource()`

**Regra de ouro:** Toda leitura de dados de diagnóstico deve passar por este adaptador. Nunca acessar as colunas de diagnóstico diretamente.

O adaptador verifica o campo `flowVersion` do projeto e retorna os dados do motor correto (V1 ou V3), normalizando a interface para o consumidor. Isso permite que o frontend e os routers usem sempre a mesma interface, independentemente do motor subjacente.

### 6.3 Fases de Implementação

| Fase | Escopo | Status |
|---|---|---|
| F-01 | Criação do `diagnostic-source.ts` + 75 testes unitários | ✅ Concluído |
| F-02A–D | Migração de 121 leituras diretas para o adaptador | ✅ Concluído |
| F-03 | Gate de limpeza no retrocesso (`retrocesso-cleanup.ts`) | ✅ Concluído |
| F-04 | Estratégia de migração de schema (ADR-008) | 🔄 Em implementação |

### 6.4 Gate de Retrocesso (ADR-007)

Ao retroceder da Etapa N para N-1, o sistema executa `cleanupOnRetrocesso()` automaticamente. O gate remove fisicamente os dados gerados pela IA na etapa abandonada, registra a operação em `projectAuditLog` e exibe modal de confirmação ao usuário. Isso garante que não existam dados "órfãos" de etapas abandonadas que possam contaminar diagnósticos futuros.

---

## 7. Shadow Mode — Protocolo de Migração

### 7.1 A Variável de Controle

A variável de ambiente `DIAGNOSTIC_READ_MODE` controla qual motor serve os dados de diagnóstico:

| Valor | Comportamento | Quando usar |
|---|---|---|
| `legacy` | Apenas V1. **Padrão de produção atual** | Antes da migração completa |
| `shadow` | V1 + V3 em paralelo. V1 retornado ao usuário. Divergências registradas | Durante o período de observação |
| `new` | Apenas V3 | Após UAT aprovado e 0 divergências críticas |

### 7.2 Estado Atual do Shadow Monitor (23/03/2026 — T=0)

| Indicador | Valor | Status |
|---|---|---|
| Total de divergências | 274 | ✅ Baseline esperado |
| Divergências críticas | **0** | ✅ Seguro |
| Conflitos reais (ambos com valores diferentes) | **0** | ✅ Seguro |
| Projetos afetados | 38 de 2.145 (1,8%) | ✅ Normal |
| Tipo de divergência | "legado tem valor, nova é null" | ✅ Esperado (projetos pré-v2.1) |

### 7.3 Critérios para Ativar o Modo `new`

1. 0 divergências críticas (tipo "ambos com valores diferentes")
2. 0 projetos `[UAT]` com divergência
3. Total de divergências ≤ 288 (5% acima do baseline)
4. UAT aprovado (≥ 80% de aprovação nos 8 cenários, feedback jurídico positivo)

---

## 8. Suite de Validação Automatizada

### 8.1 Visão Geral

A plataforma possui **107 testes automatizados** organizados em duas ondas de stress e integração, todos passando em produção:

| Onda | Suites | Foco | Asserções |
|---|---|---|---|
| Onda 1 | T01–T10 | Criação paralela, race conditions, retrocesso, persistência, limpeza, leituras concorrentes, integridade, auditoria, permissões, rollback | 75 |
| Onda 2 | T11–T14 | 50 projetos em paralelo, race conditions extremas, integridade de CNAEs e respostas, retrocesso múltiplo acumulado, loop adversarial 10x | 32 |
| **Total** | | | **107 / 107 ✅** |

### 8.2 Métricas de Performance (Baseline 23/03/2026)

| Operação | Tempo Medido | Limite Aceitável |
|---|---|---|
| 50 projetos criados em paralelo | 141ms | 10.000ms |
| 50 updates concorrentes | 38ms | 8.000ms |
| 35 inserts CNAE em paralelo | 67ms | 8.000ms |
| Retrocesso loop adversarial 10x | < 1s | 5.000ms |
| Deadlocks detectados | 0 | 0 |
| Corrupções de dados | 0 | 0 |

### 8.3 Lições Técnicas da Onda 2

Durante a implementação da Onda 2, três problemas foram identificados e corrigidos, gerando novos padrões de código obrigatórios:

**Problema 1 — `createConnection` vs. `createPool`:** Testes que usavam `createConnection` causavam conflitos quando múltiplos arquivos rodavam em paralelo. Solução: todos os testes de banco usam `createPool` com `connectionLimit: 5`.

**Problema 2 — JSON nativo do mysql2:** O driver mysql2 retorna colunas JSON como objetos JavaScript nativos, não como strings. Chamar `JSON.parse()` em valores já parseados causava "Unexpected end of JSON input". Solução: sempre verificar `typeof value === "string"` antes de parsear.

**Problema 3 — Schema divergente:** Os testes foram escritos para um schema que ainda não havia sido migrado (colunas `flowVersion`, `revenueRange`, etc. inexistentes no banco de produção). Solução: sempre verificar o schema real do banco antes de escrever testes.

---

## 9. Estado Atual da Plataforma (Métricas de Produção)

### 9.1 Métricas do Banco de Dados

| Indicador | Valor |
|---|---|
| Projetos criados | 2.145 |
| Usuários cadastrados | 1.497 |
| CNAEs com embedding | 1.332 / 1.332 (100%) |
| Documentos no corpus RAG | 1.241 |
| Tabelas no schema | 64 |

### 9.2 Métricas de Qualidade

| Indicador | Valor |
|---|---|
| Testes automatizados | 107 / 107 ✅ |
| Arquivos de teste | 102 |
| TypeScript: `tsc --noEmit` | Exit 0 (zero erros) |
| ADRs publicados | 8 |
| Divergências Shadow Mode | 274 (0 críticas) |

### 9.3 Checkpoints de Segurança

| Checkpoint | Versão | Data | Estado |
|---|---|---|---|
| TypeScript limpo (tsc Exit 0) | `a45bcead` | 23/03/2026 | ✅ Estável |
| Documentação v6.0/v5.0 | `0774db0c` | 23/03/2026 | ✅ Estável |
| Kit UAT completo | `1f079c80` | 23/03/2026 | ✅ Estável |
| Onda 2 completa (107/107) | `d19d193b` | 23/03/2026 | ✅ Estável |
| Onda 1 completa (75/75) | `f10cc327` | 22/03/2026 | ✅ Estável |
| ADR-007 gate retrocesso | `270f5f78` | 22/03/2026 | ✅ Estável |
| ADR-005 diagnóstico dual | `3a49480b` | 21/03/2026 | ✅ Estável |
| v2.1 Diagnostic Flow | `f74273e` | 20/03/2026 | ✅ Estável |

### 9.4 Documentação Publicada

| Documento | Versão | Localização |
|---|---|---|
| Requisitos Funcionais | v6.0 (153 RFs, 24 seções) | `docs/product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md` |
| Documentação IA Generativa | v5.0 (23 seções) | `docs/product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.md` |
| Playbook da Plataforma | v3.0 (15 seções) | `docs/product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md` |
| Guia UAT para Advogados | v2.0 (8 cenários) | `docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md` |
| Relatório de Testes | Onda 1+2 | `docs/product/cpie-v2/produto/RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md` |

---

## 10. Protocolo UAT com Advogados

### 10.1 Objetivo

Validar com advogados tributaristas que a plataforma produz diagnósticos juridicamente corretos, com linguagem adequada para o público-alvo (advogados e contadores), e que o fluxo V3 (requisitos canônicos) produz resultados superiores ao fluxo V1 (centrado em CNAE).

### 10.2 Cronograma

| Dia | Data | Atividade |
|---|---|---|
| Dia 1 | 2026-03-23 | Onboarding + Cenários 1 e 2 (fluxo completo, retrocesso) |
| Dia 2 | 2026-03-24 | Cenários 3–7 (múltiplos CNAEs, avaliação jurídica do briefing/matrizes/plano) |
| Dia 3 | 2026-03-25 | Cenário 8 (UX) + formulário de feedback |
| Dia 4 | 2026-03-26 | Reunião de revisão + decisão sobre ativar modo `new` |

### 10.3 Critérios de Aprovação do UAT

Para aprovar o UAT e ativar o modo `new`:
- ≥ 80% de aprovação nos 8 cenários de teste
- 0 erros críticos de fluxo (bloqueios, perda de dados, inconsistências)
- Feedback jurídico positivo sobre a qualidade do briefing e das matrizes
- Shadow Monitor: 0 divergências críticas e total ≤ 288

### 10.4 Prefixo Obrigatório

Todos os projetos criados durante o UAT devem usar o prefixo `[UAT]` no nome, para monitoramento automático no Shadow Monitor e limpeza pós-UAT.

---

## 11. Roadmap e Próximos Passos

### 11.1 Sprint v5.4.0 (Próxima)

| Item | Prioridade | Descrição |
|---|---|---|
| Ativar modo `new` | **Crítica** | Após aprovação do UAT — alterar `DIAGNOSTIC_READ_MODE` de `legacy` para `new` |
| F-04 Schema Migration | **Alta** | Executar estratégia de migração de schema (ADR-008) para consolidar dados V1 em V3 |
| Dashboard de Compliance | **Alta** | Radar de compliance por domínio (Fase 2 do v1.00) |
| Limpeza de projetos de teste | **Média** | `DELETE FROM projects WHERE name LIKE '[ONDA%]'` |

### 11.2 Sprint v5.5.0 (Futuro)

| Item | Prioridade | Descrição |
|---|---|---|
| Engine de Apresentação Executiva | **Alta** | Score por domínio, radar/satélite, drill-down requisito → gap → risco → tarefa |
| Exportação de relatório PDF | **Média** | Relatório executivo para apresentação ao board |
| Integração com ERP | **Baixa** | API para integração com sistemas ERP dos clientes |

### 11.3 O Que Ainda Não Foi Implementado (do v1.00)

O documento v1.00 propôs funcionalidades que ainda estão pendentes de implementação:

| Funcionalidade | Status | Sprint Prevista |
|---|---|---|
| Radar/satélite de compliance por domínio | ⏳ Pendente | v5.5.0 |
| Drill-down domínio → requisito → gap → risco → tarefa | ⏳ Pendente | v5.5.0 |
| Visual de gaps no dashboard | ⏳ Pendente | v5.5.0 |
| Visual de execução do plano (kanban) | ⏳ Pendente | v5.5.0 |
| Score por domínio no painel | ⏳ Pendente | v5.4.0 |

---

## 12. Papéis e Responsabilidades

### P.O. (Product Owner)

Responsável por validar o modelo de negócio, priorizar requisitos, aprovar checkpoints, aprovar a semântica de compliance (os 499 requisitos canônicos) e aprovar o dashboard e a linguagem executiva.

### Orquestrador (IA SOLARIS / Manus AI)

O Manus AI atua como **orquestrador de diagnóstico**, não como gerador de conteúdo. Suas funções são: escolher qual obrigação validar, decidir o nível de profundidade, detectar inconsistências, classificar gaps e acionar o plano. Responsável por implementar, testar, documentar, versionar e registrar checkpoints no GitHub.

### Equipe Jurídica (UAT)

Responsável por validar a qualidade jurídica dos diagnósticos, a adequação da linguagem para o público-alvo e a completude do mapa de requisitos regulatórios.

---

## 13. Definition of Done

Uma entrega só é marcada como **DONE** quando:

- [ ] Objetivo do ciclo implementado
- [ ] TypeScript: `npx tsc --noEmit` → Exit 0 (zero erros)
- [ ] Double check funcional executado (atende o objetivo do produto?)
- [ ] Double check técnico executado (schema, rotas, loops, gates, logs, tipos)
- [ ] Testes vitest escritos e passando (100%)
- [ ] Persistência validada no banco (dados gravados e recuperados)
- [ ] Evidência visual (screenshot ou log de output)
- [ ] `todo.md` atualizado com item marcado como `[x]`
- [ ] Commit com mensagem descritiva (`git commit -m "feat: descrição"`)
- [ ] Push no GitHub (`git push github main`)
- [ ] `webdev_save_checkpoint` executado
- [ ] Checkpoint markdown criado em `/docs/product/cpie-v2/produto/`
- [ ] Documentação atualizada (se feature crítica)
- [ ] Suite Onda 1+2 executada (se feature toca diagnóstico)
- [ ] Shadow Monitor verificado (se feature toca diagnóstico)

---

## 14. Decisões Arquiteturais (ADRs)

Os ADRs registram as decisões arquiteturais tomadas durante o projeto, com contexto, decisão, consequências e alternativas rejeitadas:

| ADR | Título | Status |
|---|---|---|
| ADR-001 | Arquitetura de Diagnóstico (compliance antes de CNAE) | ✅ Aprovado |
| ADR-002 | Plano de Implementação e Rollback | ✅ Aprovado |
| ADR-003 | Exaustão de Riscos (gap → risco, não IA solta) | ✅ Aprovado |
| ADR-004 | Fonte de Verdade do Diagnóstico | ✅ Aprovado |
| ADR-005 | Isolamento Físico do Diagnóstico (adaptador `getDiagnosticSource`) | ✅ Aprovado |
| ADR-006 | Relatório de Validação Prática do ADR-005 | ✅ Aprovado |
| ADR-007 | Gate de Limpeza no Retrocesso (`cleanupOnRetrocesso`) | ✅ Aprovado |
| ADR-008 | Estratégia de Migração de Schema F-04 | 🔄 Em implementação |

Todos os ADRs estão publicados em `docs/product/cpie-v2/produto/ADR-0XX-*.md` no GitHub.

---

## Apêndice A — Protocolo de Branches e Commits

### Branch Pattern

```
feature/compliance-engine-v3
feature/gap-engine-v2
feature/risk-matrix-from-gaps
feature/action-plan-atomic-tasks
feature/compliance-radar-dashboard
feature/shadow-mode-migration
docs/compliance-architecture-v2
```

### Commit Pattern

```
feat(compliance): add canonical regulatory requirements engine
feat(assessment): implement requirement-based assessment flow
feat(gaps): add gap classification and persistence
feat(risks): derive risk matrix from compliance gaps
feat(plan): generate atomic action tasks from approved risks
feat(dashboard): add compliance radar and domain scoring
feat(shadow): implement shadow mode migration protocol
docs(architecture): document compliance engine v2
docs(checkpoint): add sprint checkpoint
fix(flow): preserve CNAE as contextual layer only
test(compliance): add validation coverage for requirement scoring
```

---

## Apêndice B — Estrutura de Documentação no GitHub

```
/docs
  /product
    /cpie-v2
      /produto
        REQUISITOS-FUNCIONAIS-v6.md
        DOCUMENTACAO-IA-GENERATIVA-v5.md
        PLAYBOOK-DA-PLATAFORMA-v3.md
        GUIA-UAT-ADVOGADOS-v2.md
        SHADOW-MONITOR-BASELINE-UAT-2026-03-23.md
        RELATORIO-COMPLETO-TESTES-ONDA1-ONDA2-2026-03-23.md
        projeto-compliance-reforma-tributaria-v2.00.md
        ADR-001-arquitetura-diagnostico.md
        ADR-002-plano-implementacao-rollback.md
        ADR-003-exaustao-de-riscos.md
        ADR-004-fonte-de-verdade-diagnostico.md
        ADR-005-isolamento-fisico-diagnostico.md
        ADR-006-relatorio-validacao-pratica-adr005.md
        ADR-007-gate-limpeza-retrocesso.md
        ADR-008-F04-schema-migration-strategy.md
```

---

*Documento atualizado em 23/03/2026 — IA SOLARIS Compliance Tributária*
*Versão anterior: v1.00 (documento fundacional — reposicionamento estratégico)*
*Próxima revisão prevista: Após ativação do modo `new` (Sprint v5.4.0)*
*Mantido por: Equipe SOLARIS*
