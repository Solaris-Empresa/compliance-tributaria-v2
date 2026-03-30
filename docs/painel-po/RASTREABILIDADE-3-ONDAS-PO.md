# Rastreabilidade das 3 Ondas — Documento P.O.

> **Projeto:** IA SOLARIS — Compliance Tributária  
> **Repositório:** [Solaris-Empresa/compliance-tributaria-v2](https://github.com/Solaris-Empresa/compliance-tributaria-v2)  
> **Versão:** v1.0 — 2026-03-30  
> **Autor:** Manus (implementador técnico) — revisão P.O.: Uires Tapajós  
> **Status:** ✅ Implementado e ativo no `main`

---

## 1. O que é rastreabilidade no contexto das 3 Ondas

Rastreabilidade é a capacidade de, a qualquer momento, responder à pergunta: **"esta pergunta que o sistema faz ao advogado — de onde veio, quem a aprovou, qual lei ela cobre, em qual sprint foi entregue, e qual PR a implementou?"**

O sistema de rastreabilidade das 3 Ondas conecta quatro camadas: o **código-fonte** (implementação), o **repositório GitHub** (histórico e PRs), o **banco de dados** (respostas e diagnósticos) e o **Cockpit P.O.** (visualização em tempo real). Cada pergunta feita ao usuário final possui uma cadeia rastreável do início ao fim.

---

## 2. As 3 Ondas e suas origens

O questionário do sistema IA SOLARIS é composto por três fontes complementares de perguntas, chamadas "ondas". Cada onda tem uma origem, uma técnica e um propósito distintos.

| Onda | Nome | Origem | Técnica | Propósito |
|---|---|---|---|---|
| **1** | Questionário SOLARIS | Equipe especialista SOLARIS | Curadoria humana via CSV | Capturar riscos implícitos que a IA não consegue inferir sozinha |
| **2** | IA Generativa | GPT-4.1 (OpenAI) | Geração combinatória por CNAE × porte × regime | Cobrir cenários específicos do negócio do cliente |
| **3** | Regulatório (RAG) | Corpus LC 214/2024 e LC 224/2025 | Recuperação semântica + re-ranking LLM | Ancorar o diagnóstico na legislação vigente |

A justificativa central para a existência das 3 ondas é que **nenhuma fonte isolada é suficiente**: a curadoria humana captura o conhecimento tácito dos especialistas; a IA generativa personaliza para o perfil do cliente; e o RAG garante que o diagnóstico esteja fundamentado na lei.

---

## 3. Sistema de labels GitHub — governança de rastreabilidade

### 3.1 As 4 labels criadas

Em 2026-03-30, foram criadas 4 labels no repositório GitHub para classificar automaticamente toda issue e PR relacionada às 3 Ondas. Estas labels são a espinha dorsal da rastreabilidade no repositório.

| Label | Cor | Finalidade |
|---|---|---|
| `onda:1-solaris` | 🔵 `#185FA5` | Issues e PRs da Onda 1 — questionário curado pela equipe SOLARIS |
| `onda:2-iagen` | 🟠 `#D97706` | Issues e PRs da Onda 2 — perguntas geradas por IA |
| `onda:3-regulatorio` | 🟢 `#3B6D11` | Issues e PRs da Onda 3 — recuperação RAG do corpus regulatório |
| `cockpit:3ondas` | 🟣 `#7C3AED` | Issues e PRs do Cockpit 3 Ondas — visualização e governança |

### 3.2 Aplicação automática via GitHub Actions

A partir do PR #222 (mergeado em 2026-03-30), toda nova issue ou PR que mencionar palavras-chave relevantes no título ou corpo recebe a label correspondente **automaticamente**, sem intervenção manual.

O workflow `.github/workflows/label-governance.yml` funciona da seguinte forma: ao criar ou editar uma issue/PR, o GitHub Actions analisa o texto e aplica a label cuja lista de keywords tiver ao menos uma correspondência. O processo é idempotente — se a label já estiver aplicada, o workflow a ignora sem duplicar.

| Label aplicada automaticamente | Exemplos de keywords que disparam |
|---|---|
| `onda:1-solaris` | "onda 1", "solaris", "SOL-001", "solaris_questions", "k-3", "k-4-b" |
| `onda:2-iagen` | "onda 2", "iagen", "ia gen", "generateQuestions", "GPT-4", "k-4-c" |
| `onda:3-regulatorio` | "onda 3", "rag", "corpus", "LC 214", "LC 224", "retrieveArticles", "l-1" |
| `cockpit:3ondas` | "cockpit", "3ondas", "painel-po", "seção 6", "spec-cockpit" |

### 3.3 Garantia de rastreabilidade para novas issues e PRs

Qualquer issue ou PR criado a partir de 2026-03-30 que mencione os termos acima será **automaticamente classificado** pela onda correspondente. Isso significa que o histórico de decisões, implementações e débitos técnicos das 3 Ondas estará sempre organizado e filtrável no GitHub, sem depender de disciplina manual da equipe.

---

## 4. Rastreabilidade por sprint e milestone

O trabalho das 3 Ondas está distribuído em dois milestones ativos:

| Milestone | Sprint | Foco | Issues abertas | Issues fechadas |
|---|---|---|---|---|
| **M2 — Sprint K** | K-1 a K-4-E | Implementação das 3 Ondas (schema, seed, fluxo, IA Gen, RAG) | 4 | 8 |
| **M3 — Sprint L** | L-1 a L-2 | Upload CSV SOLARIS + refinamentos | 5 | 0 |
| **M4 — Débitos Técnicos** | — | Governança, testes, débitos | 15 | 3 |

### 4.1 PRs mergeados que compõem a rastreabilidade das 3 Ondas

A tabela abaixo lista os PRs desta sessão de trabalho que formam a cadeia de rastreabilidade:

| PR | Título | Tipo | Data | Conteúdo |
|---|---|---|---|---|
| #215 | TABELA-3-ONDAS-QUESTIONARIO-v1 | docs | 2026-03-30 | Referência canônica das 3 Ondas — 535 linhas, 12 seções |
| #216 | Cockpit update MODO_CONFIG + decisões | docs | 2026-03-30 | Atualização de métricas e decisões do cockpit |
| #217 | E2E-3-ONDAS-QUESTIONARIOS-v1 | docs | 2026-03-30 | Fluxo E2E completo — RAG, schemas, sprints, PRs |
| #218 | SPEC-COCKPIT-3-ONDAS-v2 | docs | 2026-03-30 | Especificação técnica pós-crítica do Consultor |
| #219 | Seção 6 — Cockpit 3 Ondas | feat | 2026-03-30 | Implementação dos sub-painéis 6A, 6B, 6C no cockpit |
| #220 | Renomear título Seção 6 | fix | 2026-03-30 | Correção de título para "Cockpit - 3 Ondas" |
| #221 | Aba SPEC v2 + labels + skills | feat | 2026-03-30 | Aba SPEC no cockpit + labels criadas + skills atualizadas |
| #222 | Fix HTTP 404 + ERRO 1/3 + GitHub Actions | fix | 2026-03-30 | Correção de bugs + workflow de governança automática |
| #223 | DIAGRAMA-LABELS-RASTREABILIDADE | docs | 2026-03-30 | Diagrama flowchart do fluxo de labels → cockpit |

---

## 5. Cadeia de rastreabilidade — do código ao cockpit

A rastreabilidade completa de uma pergunta das 3 Ondas segue a cadeia abaixo. Cada elo é auditável de forma independente.

```
Pergunta (SOL-001..012 / IA Gen / RAG)
    │
    ├── Código-fonte
    │       ├── server/routers/routers-fluxo-v3.ts  (lógica de negócio)
    │       ├── server/rag-retriever.ts              (pipeline RAG)
    │       └── drizzle/schema.ts                   (schema das tabelas)
    │
    ├── Banco de dados (TiDB Cloud)
    │       ├── solaris_questions   (seed das 12 perguntas SOL-001..012)
    │       ├── solaris_answers     (respostas do usuário — Onda 1)
    │       ├── iagen_answers       (respostas geradas pela IA — Onda 2)
    │       ├── rag_documents       (corpus regulatório — 2.078 chunks)
    │       └── project_status_log  (log de diagnósticos)
    │
    ├── GitHub
    │       ├── Issue com label onda:X-xxx
    │       ├── PR mergeado no milestone Sprint K/L
    │       └── GitHub Actions: label aplicada automaticamente
    │
    └── Cockpit P.O.
            ├── 6A — Documentos (TABELA + E2E + SPEC — fetch raw GitHub)
            ├── 6B — Rastreabilidade Viva (issues/PRs por label+milestone)
            └── 6C — Estado das Ondas (cards + Consistência Global)
```

---

## 6. Schemas das tabelas de rastreabilidade

As tabelas abaixo são a camada de persistência da rastreabilidade no banco de dados. Elas registram cada interação do usuário com o questionário e permitem auditar o diagnóstico gerado.

### 6.1 `solaris_questions` — Onda 1

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Identificador único da pergunta |
| `code` | text | Código canônico (SOL-001..SOL-012) |
| `text` | text | Texto da pergunta exibida ao usuário |
| `area` | text | Área jurídica (IBS, CBS, IS, Transição) |
| `urgency` | enum | `critical` / `high` / `medium` |
| `risk_mapped` | text | Risco tributário que a pergunta cobre |
| `cnae_filter` | text[] | CNAEs para os quais a pergunta é exibida (null = todas) |
| `active` | boolean | Se a pergunta está ativa no questionário |
| `created_at` | timestamp | Data de criação |

### 6.2 `solaris_answers` — Onda 1

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Identificador único da resposta |
| `project_id` | uuid | FK para o projeto do cliente |
| `question_code` | text | FK para `solaris_questions.code` |
| `answer` | text | Resposta do usuário |
| `answered_at` | timestamp | Data da resposta |

### 6.3 `iagen_answers` — Onda 2

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Identificador único |
| `project_id` | uuid | FK para o projeto |
| `question_text` | text | Pergunta gerada pela IA |
| `answer` | text | Resposta do usuário |
| `generation_params` | jsonb | CNAE, porte, regime, modelo usado |
| `answered_at` | timestamp | Data da resposta |

### 6.4 `project_status_log` — Log de diagnósticos

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | Identificador único |
| `project_id` | uuid | FK para o projeto |
| `status` | text | Estado do fluxo (ex: `onda1_complete`) |
| `metadata` | jsonb | Dados adicionais do estado |
| `created_at` | timestamp | Data do registro |

---

## 7. Documentos de referência

Os três documentos abaixo formam a base documental da rastreabilidade das 3 Ondas. Todos estão versionados no repositório e renderizados no sub-painel 6A do Cockpit P.O.

| Documento | Caminho | Conteúdo | Linhas |
|---|---|---|---|
| **TABELA-3-ONDAS-QUESTIONARIO-v1** | `docs/arquitetura/` | Tabela mestra comparativa + 12 perguntas SOL + schemas + sprints | 535 |
| **E2E-3-ONDAS-QUESTIONARIOS-v1** | `docs/arquitetura/` | Fluxo E2E completo: entradas, técnicas, RAG, máquina de estados, PRs | 758 |
| **SPEC-COCKPIT-3-ONDAS-v2** | `docs/specs/` | Especificação técnica do cockpit pós-crítica do Consultor (ChatGPT) | 1.020 |

O diagrama visual do fluxo de labels está disponível em:

- Fonte editável: `docs/arquitetura/DIAGRAMA-LABELS-RASTREABILIDADE.mmd`
- Imagem renderizada: `docs/arquitetura/DIAGRAMA-LABELS-RASTREABILIDADE.png`

---

## 8. Critérios de aceite do P.O. para rastreabilidade

Os critérios abaixo definem quando a rastreabilidade das 3 Ondas pode ser considerada completa e auditável.

| # | Critério | Status |
|---|---|---|
| R-01 | Labels `onda:1-solaris`, `onda:2-iagen`, `onda:3-regulatorio`, `cockpit:3ondas` criadas no repositório | ✅ Feito |
| R-02 | GitHub Actions aplica labels automaticamente em issues/PRs novos e editados | ✅ Feito |
| R-03 | Sub-painel 6B do cockpit exibe tabela de rastreabilidade viva (issues/PRs por label + milestone) | ✅ Feito |
| R-04 | Sub-painel 6A exibe os 3 documentos de arquitetura renderizados inline (sem HTTP 404) | ✅ Feito |
| R-05 | Skills `solaris-orquestracao` e `solaris-contexto` registram a estratégia de labels como regra permanente | ✅ Feito |
| R-06 | Diagrama flowchart do fluxo labels → cockpit disponível no repositório | ✅ Feito |
| R-07 | Todas as tabelas de rastreabilidade (`solaris_questions`, `solaris_answers`, `iagen_answers`, `project_status_log`) com schema documentado | ✅ Feito |
| R-08 | PRs #215..#223 mergeados e rastreáveis no milestone M2/M3/M4 | ✅ Feito |
| R-09 | Status global do cockpit inicia como `⏳ Aguardando` e converge para `✅ OK` após fetches | ✅ Feito |
| R-10 | Documento P.O. de rastreabilidade (`RASTREABILIDADE-3-ONDAS-PO.md`) disponível no repositório | ✅ Este documento |

---

## 9. O que muda para o P.O. a partir de agora

Com a rastreabilidade implementada, o P.O. passa a ter as seguintes garantias operacionais:

**Visibilidade em tempo real.** O Cockpit P.O. em [solaris-empresa.github.io/compliance-tributaria-v2/painel-po/](https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/) exibe, a cada abertura, o estado atualizado das issues e PRs das 3 Ondas, filtrados por label e milestone, sem necessidade de acessar o GitHub diretamente.

**Governança automática.** Toda nova issue ou PR criada pelo Orquestrador, pelo Manus ou por qualquer membro da equipe que mencione termos das 3 Ondas receberá automaticamente a label correta. Isso elimina o risco de itens sem classificação acumularem-se no backlog.

**Auditoria retroativa.** Os PRs #215 a #223 estão todos documentados com template preenchido, evidência JSON e escopo declarado. Qualquer decisão de produto pode ser rastreada até o commit específico que a implementou.

**Documentação viva.** Os três documentos de arquitetura (TABELA, E2E, SPEC) são renderizados diretamente no cockpit via fetch do repositório. Quando um PR atualizar qualquer um deles, o cockpit exibirá o conteúdo novo automaticamente na próxima visita (cache TTL 5 minutos).

---

## 10. Histórico de decisões desta sessão

| Data | Decisão | Impacto |
|---|---|---|
| 2026-03-30 | Criar 4 labels de governança no repositório | Rastreabilidade por onda ativa |
| 2026-03-30 | Implementar GitHub Actions `label-governance.yml` | Governança automática sem intervenção manual |
| 2026-03-30 | Adicionar aba SPEC v2 no sub-painel 6A do cockpit | 3 documentos acessíveis inline |
| 2026-03-30 | Atualizar skills `solaris-orquestracao` e `solaris-contexto` | Regras de labels propagadas para sessões futuras |
| 2026-03-30 | Corrigir HTTP 404 (E2E e SPEC ausentes do main) | Sub-painel 6A funcional sem erros |
| 2026-03-30 | Corrigir ERRO 1/3 checks (ciOk false antes dos fetches) | Status global inicia em `⏳ Aguardando` |
| 2026-03-30 | Gerar diagrama flowchart DIAGRAMA-LABELS-RASTREABILIDADE | Documentação visual do fluxo de governança |

---

*Documento gerado em 2026-03-30 pelo implementador técnico Manus. Fonte de verdade: [ESTADO-ATUAL.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ESTADO-ATUAL.md) e [BASELINE-PRODUTO.md](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md).*
