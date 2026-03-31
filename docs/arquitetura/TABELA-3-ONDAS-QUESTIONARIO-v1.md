# TABELA MESTRA — AS 3 ONDAS DO QUESTIONÁRIO IA SOLARIS

**Versão:** 1.0
**Data:** 2026-03-30
**Autores:** Manus (implementador técnico) + Orquestrador (Claude — Anthropic)
**P.O.:** Uires Tapajós
**Status:** Documento de referência — Sprint K/L

---

## Sumário Executivo

Este documento é a referência canônica sobre a arquitetura das 3 Ondas do questionário de compliance tributário da plataforma IA SOLARIS. Ele consolida, em uma única fonte de verdade, o **motivador de negócio**, a **tabela mestra comparativa**, o **detalhamento aprofundado de cada onda** — com ênfase especial no questionário conduzido com a Equipe Jurídica SOLARIS (Onda 1) —, a **rastreabilidade técnica** e o **plano de implementação por sprint**.

O documento é destinado a três audiências simultâneas: o P.O. (Uires Tapajós), que precisa validar decisões de produto; o Orquestrador (Claude), que gera os prompts de implementação; e o Manus, que executa as tarefas técnicas.

---

## 1. O PROBLEMA QUE ORIGINOU AS 3 ONDAS

### 1.1 O gap identificado no UAT de março de 2026

Em março de 2026, o IA SOLARIS passou pelo primeiro round de UAT com a equipe jurídica do escritório. O sistema estava tecnicamente correto: o corpus RAG cobria a LC 214/2025, LC 224/2026, LC 227/2026 e EC 132/2023, com 2.078 chunks indexados e rastreabilidade de artigo. Os diagnósticos citavam dispositivos legais específicos. A cobertura regulatória existia.

Os advogados, no entanto, identificaram uma lacuna que não conseguiam nomear com precisão técnica. O sistema "funcionava", mas o diagnóstico parecia incompleto. Faltavam riscos que qualquer profissional experiente em direito tributário consideraria óbvios — riscos que toda empresa deveria verificar ao fazer um compliance tributário sério, mas que não estão escritos em nenhum artigo de lei.

O Dr. José Rodrigues, um dos advogados participantes do UAT, materializou o gap enviando duas matrizes de risco que ele mesmo construiu:

- **Matriz 1 — LC 214 Art. 45:** 12 riscos de alto impacto sobre confissão de dívida tributária
- **Matriz 2 — LC 224 Art. 4°:** 12 riscos com vigência 01/04/2026

A análise das matrizes revelou o diagnóstico: vários desses riscos não estavam em nenhum artigo de lei. Eram riscos práticos — consequências operacionais, comportamentos empresariais, falhas sistêmicas — que apenas um advogado com experiência reconhece como críticos.

| Risco identificado pelo advogado | Por que o RAG não encontra |
|---|---|
| "Confissão automática via NF-e" | Não está escrito assim em nenhum artigo |
| "Risco sistêmico de ERP mal parametrizado" | É prática de TI fiscal, não texto legal |
| "Responsabilização pessoal de administradores" | É consequência jurídica, não dispositivo |
| "Classificação NCM incorreta" | É operacional — depende do cadastro da empresa |
| "Confissão por inércia — não agir = aceitar débito" | É comportamento, não lei |

### 1.2 O diagnóstico do P.O. — visão de consultor de GRC

Uires Tapajós, com formação em consultoria de GRC (Governança, Risco e Compliance), identificou que o sistema cobria apenas uma das três dimensões de um diagnóstico de compliance completo:

```
DIMENSÃO 1 — Conformidade regulatória
  "O que a lei exige desta empresa?"
  → Rastreável, auditável, baseado em normas
  → Coberta pelo sistema (Onda 3)

DIMENSÃO 2 — Conhecimento especializado
  "O que a prática ensina sobre este setor?"
  → Acumulado por profissionais ao longo dos anos
  → GAP IDENTIFICADO (Onda 1 resolve)

DIMENSÃO 3 — Perfil específico da organização
  "O que é único desta empresa que cria riscos únicos?"
  → Combinação de características que gera riscos individuais
  → GAP IDENTIFICADO (Onda 2 resolve)
```

A Reforma Tributária de 2025-2026 (EC 132/2023 + LC 214/2025) não criou apenas novos artigos de lei — criou novos **comportamentos de risco** que nenhuma lei descreve explicitamente como "risco para a empresa X". A solução das 3 ondas é a resposta arquitetural a esse gap.

---

## 2. TABELA MESTRA — AS 3 ONDAS

### 2.1 Visão comparativa completa

| Dimensão | Onda 1 — Equipe SOLARIS | Onda 2 — IA Generativa | Onda 3 — Legislação |
|---|---|---|---|
| **Nome canônico** | Questionário SOLARIS | Questionário IA Gen | Questionário Regulatório |
| **Fonte técnica** | `solaris` | `ia_gen` | `regulatorio` |
| **Quem cria as perguntas** | Equipe jurídica SOLARIS, curadas por advogado sênior | IA combina parâmetros do perfil da empresa | Sistema RAG nas leis (LC 214, LC 224, LC 227, EC 132) |
| **O que cobre** | Riscos práticos que a experiência ensina | Riscos específicos desta empresa | O que a legislação exige explicitamente |
| **Quantidade (empresa com 5 CNAEs)** | **1 questionário único** | **1 questionário único** | **7 questionários** (1 corporativo + 1 operacional + 5 por CNAE) |
| **Persistência** | Tabela `solaris_answers` | Tabela `iagen_answers` | Tabelas existentes (respostas regulatórias) |
| **Badge visual** | 🔵 Azul — "Equipe Jurídica SOLARIS" | 🟠 Laranja — "Perfil da empresa" | 🟢 Verde — "Legislação" |
| **Personalização por empresa** | Não — mesmas perguntas para todos (filtro por CNAE) | Sim — gerado dinamicamente por perfil | Parcial — filtrado por CNAE |
| **Dependência de IA** | Não — perguntas fixas no banco | Sim — LLM gera on-the-fly | Sim — RAG + LLM |
| **Fallback se IA falhar** | N/A — não depende de IA | 5 perguntas hardcoded com `confidence_score = 0.5` | N/A — corpus fixo |
| **Gate de qualidade** | Dry-run + confirmação do advogado sênior | Filtro `confidence_score >= 0.7` | Validação por anchor_id |
| **Etapa no stepper TO-BE** | Etapa 1 | Etapa 2 | Etapas 3–5 (QC, QO, QCNAE) |
| **Status do enum ao concluir** | `onda1_solaris` | `onda2_iagen` | `diagnostico_corporativo` → `diagnostico_cnae` |
| **Sprint de implementação** | K-1 (banco) + K-2 (pipeline) + K-3 (badge) | K-4-C | K-4-A (stepper) |
| **Issue GitHub** | #153 (K-1), #154 (K-2), #155 (K-3) | #156 (K-4) | Existente |
| **Diferencial competitivo** | **Único** — conhecimento do escritório que nenhuma tecnologia replica | Médio — qualquer IA pode tentar | Commodity — qualquer RAG legislativo faz |

### 2.2 Quantidade de questionários por onda (empresa com N CNAEs)

| Elemento | 1ª Onda | 2ª Onda | 3ª Onda |
|---|---|---|---|
| Questionário base (advogados SOLARIS) | **1** | 0 | — |
| Questionário IA Gen | 0 | **1** | — |
| Questionário corporativo | 0 | 0 | **1** |
| Questionário operacional | 0 | 0 | **1** |
| Questionários por CNAE | 0 | 0 | **N** (1 por CNAE) |
| **Total** | **1** | **1** | **N + 2** |

> **Regra crítica:** As ondas NÃO são partes de um mesmo questionário. Elas são **modelos distintos de geração de questionários**, apresentados em sequência independente antes do fluxo regulatório atual.

---

## 3. ONDA 1 — QUESTIONÁRIO DA EQUIPE JURÍDICA SOLARIS

### 3.1 Motivação e diferencial

A Onda 1 é o diferencial competitivo central da plataforma. Qualquer sistema de RAG legislativo consegue fazer a Onda 3. Qualquer IA generativa tenta fazer a Onda 2. A Onda 1 é única — é o conhecimento acumulado específico deste escritório, curado por humanos, que nenhuma tecnologia replica sozinha.

O processo de criação da Onda 1 começou com o UAT de março de 2026: o Dr. José Rodrigues enviou duas matrizes de risco construídas com base em anos de prática tributária. Essas matrizes foram a semente das primeiras 12 perguntas (SOL-001 a SOL-012), que cobrem os riscos práticos mais críticos da Reforma Tributária de 2025-2026.

### 3.2 As 12 perguntas do questionário SOLARIS (seed do K-1)

As perguntas foram extraídas diretamente das matrizes de risco enviadas pelo Dr. José Rodrigues no UAT. Elas cobrem quatro áreas: Contabilidade Fiscal, TI, Jurídico e Negócio.

| Código | Pergunta | Área | Urgência | Risco mapeado |
|---|---|---|---|---|
| **SOL-001** | "A empresa possui rotina de validação automática antes da NF-e para conferência de CFOP, CST, alíquota IBS/CBS?" | Contabilidade Fiscal | 🔴 Crítica | Confissão automática via NF-e mal emitida |
| **SOL-002** | "Existe rotina diária de conferência da apuração assistida CGIBS para evitar confissão por inércia?" | Contabilidade Fiscal | 🔴 Crítica | Confissão por inércia — não agir = aceitar débito |
| **SOL-003** | "A empresa tem SLA interno de correção fiscal com prazo máximo de D+2?" | Contabilidade Fiscal | 🟠 Alta | Acúmulo de débitos por ausência de prazo de correção |
| **SOL-004** | "O ERP foi parametrizado e auditado para as novas regras IBS/CBS com trilha de auditoria?" | TI | 🔴 Crítica | Risco sistêmico de ERP mal parametrizado |
| **SOL-005** | "Existe controle em tempo real dos débitos constituídos por confissão e monitoramento de dívida ativa?" | Jurídico | 🔴 Crítica | Dívida ativa não monitorada — surpresa em execução fiscal |
| **SOL-006** | "A empresa avaliou necessidade de blindagem jurídica sobre a validade da confissão automática da LC 214?" | Jurídico | 🟠 Alta | Responsabilização por confissão sem contestação jurídica |
| **SOL-007** | "Existe governança documentada com trilha de auditoria que demonstre diligência dos administradores?" | Jurídico | 🟠 Alta | Responsabilização pessoal de administradores |
| **SOL-008** | "O cadastro NCM dos produtos está revisado para as novas alíquotas da LC 224/2026?" | Contabilidade Fiscal | 🟠 Alta — vigência 01/04 | Classificação NCM incorreta → alíquota errada |
| **SOL-009** | "A estratégia de pricing foi revisada para absorver o fim de alíquota zero/isenções da LC 224?" | Negócio | 🟠 Alta | Impacto de margem por não repasse de custo tributário |
| **SOL-010** | "O crédito não cumulativo foi recalculado considerando o limite de 90% imposto pela LC 224?" | Contabilidade Fiscal | 🟠 Alta | Perda de crédito por não observar limite da LC 224 |
| **SOL-011** | "Existe planejamento de capital de giro para o impacto no fluxo de caixa da LC 224?" | Negócio | 🟠 Alta | Crise de caixa por não antecipação do impacto tributário |
| **SOL-012** | "Os contratos com fornecedores foram revisados para absorver o efeito cadeia da LC 224?" | Negócio | 🟡 Média | Conflito contratual por cláusulas sem previsão tributária |

### 3.3 Distribuição por área e urgência

| Área | Qtd. perguntas | Críticas | Altas | Médias |
|---|---|---|---|---|
| Contabilidade Fiscal | 5 | 2 (SOL-001, SOL-002) | 3 (SOL-003, SOL-008, SOL-010) | 0 |
| Jurídico | 3 | 1 (SOL-005) | 2 (SOL-006, SOL-007) | 0 |
| Negócio | 3 | 0 | 2 (SOL-009, SOL-011) | 1 (SOL-012) |
| TI | 1 | 1 (SOL-004) | 0 | 0 |
| **Total** | **12** | **4** | **7** | **1** |

### 3.4 Cobertura por legislação

| Legislação | Perguntas cobertas | Códigos |
|---|---|---|
| LC 214/2025 (IBS/CBS — confissão, NF-e, CGIBS) | 7 | SOL-001, SOL-002, SOL-003, SOL-004, SOL-005, SOL-006, SOL-007 |
| LC 224/2026 (NCM, alíquotas, crédito, contratos) | 5 | SOL-008, SOL-009, SOL-010, SOL-011, SOL-012 |

### 3.5 Processo de curadoria — como a Onda 1 é alimentada

O processo de alimentação da Onda 1 é deliberadamente humano. A equipe jurídica SOLARIS é a única fonte autorizada para inserir perguntas no corpus `solaris`. O fluxo tem três etapas:

**Etapa 1 — Redação pelo advogado sênior**

O advogado redige as perguntas em formato CSV, seguindo o schema definido no DEC-002 (aprovado pelo P.O. em 2026-03-26):

| Campo | Tipo | Obrigatório | Exemplo |
|---|---|---|---|
| `titulo` | string | ✅ | "Validação fiscal pré-emissão NF-e" |
| `conteudo` | texto | ✅ | Fundamentação completa da questão |
| `topicos` | texto | ✅ | "IBS, CBS, NF-e, confissão de dívida" |
| `cnaeGroups` | texto | ✅ | "01-96" (todos) ou "46,49" (específicos) |
| `lei` | fixo | ✅ | sempre "solaris" |
| `artigo` | string | ✅ | "SOL-001", "SOL-002"... |
| `area` | enum | ✅ | contabilidade_fiscal / negocio / ti / juridico |
| `severidade_base` | enum | ✅ | baixa / media / alta / critica |
| `vigencia_inicio` | data | ❌ | "2026-04-01" |

**Etapa 2 — Upload via interface administrativa**

O advogado acessa `/admin/solaris-questions` e faz upload do CSV. O sistema executa um **dry-run** — o advogado vê o preview completo das perguntas antes de qualquer persistência.

**Etapa 3 — Confirmação e publicação**

Após revisão do preview, o advogado confirma. O sistema persiste as perguntas na tabela `solaris_questions` com `lei='solaris'` e registra o `upload_batch_id` para rastreabilidade de lote.

> **Gate de qualidade:** Toda pergunta da Onda 1 passa por revisão do advogado sênior antes de publicar. O dry-run garante que o corpus `solaris` tem qualidade jurídica validada por humano. Não há publicação automática.

### 3.6 Lógica de filtro por CNAE

As perguntas da Onda 1 podem ser universais (aparecem para todos os projetos) ou específicas por setor:

```
cnaeGroups = null → pergunta universal (aparece para todos os projetos)
cnaeGroups = ["11", "1113-5"] → aparece se o CNAE do projeto começa
                                  com algum dos prefixos listados
```

As 12 perguntas do seed inicial (SOL-001 a SOL-012) são universais (`cnaeGroups = null`), pois os riscos que cobrem são relevantes para qualquer empresa sujeita à Reforma Tributária.

### 3.7 Persistência das respostas — tabela `solaris_answers`

As respostas do advogado às perguntas da Onda 1 são persistidas na tabela `solaris_answers`, criada em K-4-A:

```typescript
// drizzle/schema.ts — adicionado em K-4-A
export const solarisAnswers = mysqlTable('solaris_answers', {
  id:         int('id').autoincrement().primaryKey(),
  projectId:  int('project_id').notNull()
              .references(() => projects.id),
  questionId: int('question_id').notNull()
              .references(() => solarisQuestions.id),
  codigo:     varchar('codigo', { length: 10 }).notNull(), // SOL-001..012
  resposta:   text('resposta').notNull(),
  fonte:      varchar('fonte', { length: 20 }).default('solaris'),
  createdAt:  bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:  bigint('updated_at', { mode: 'number' }).notNull(),
})
// Índice único: (project_id, codigo)
```

### 3.8 Como a Onda 1 alimenta o diagnóstico final

As respostas de `solaris_answers` são injetadas como contexto adicional no prompt de `generateRiskMatrices`. A lógica é direta:

- Uma resposta **"NÃO"** na SOL-002 (monitoramento CGIBS) gera risco crítico de confissão por inércia na matriz de riscos.
- Uma resposta **"SIM"** na SOL-002 reduz ou mitiga o risco correspondente.
- As respostas aparecem no briefing como "riscos práticos identificados pela equipe jurídica SOLARIS".

> **Critério de validação (K-4-D):** O diagnóstico está correto quando uma empresa que respondeu "NÃO" em SOL-002 recebe risco crítico de confissão por inércia, e uma empresa que respondeu "SIM" recebe risco mitigado ou não recebe o risco.

---

## 4. ONDA 2 — QUESTIONÁRIO IA GENERATIVA

### 4.1 Motivação

A Onda 2 resolve a terceira dimensão do compliance: o que é único desta empresa que cria riscos únicos. A lógica é combinatória — certas combinações de características criam riscos que não existiriam isoladamente e que nem a lei (Onda 3) nem o escritório (Onda 1) conseguem capturar de forma universal.

**Exemplo do P.O.:** Uma empresa com `Lucro Presumido + faz exportação + contrata Simples Nacional` tem um risco específico de creditamento CBS em cadeia exportadora com prestadores do Simples que não está escrito em nenhuma lei, não foi curado pelo escritório para todos os casos, e só existe para essa combinação específica de perfil.

### 4.2 Parâmetros combinatórios de entrada

| Parâmetro | Valores possíveis |
|---|---|
| Regime tributário | Simples Nacional / Lucro Presumido / Lucro Real / Lucro Arbitrado |
| Porte | MEI / Micro / Pequena / Média / Grande |
| CNAE | Código específico (setor) |
| Operação interestadual | Sim / Não |
| Faz exportação | Sim / Não |
| Contrata prestadores Simples Nacional | Sim / Não |
| Tem ativo imobilizado relevante | Sim / Não |

### 4.3 Exemplos de combinações e perguntas geradas

| Combinação do perfil | Pergunta gerada pela IA |
|---|---|
| Lucro Presumido + exportação + contrata Simples | "Como está estruturado o creditamento de CBS na cadeia exportadora com prestadores do Simples Nacional?" |
| Lucro Real + operação interestadual | "Qual o impacto do diferencial de alíquota IBS nas operações interestaduais?" |
| Qualquer regime + CNAE alimentício | "Seus produtos estão classificados no Anexo I da LC 214 (alíquota zero)?" |
| Médio/Grande porte + ativo imobilizado | "A exclusão de bens do ativo imobilizado do regime de crédito IBS/CBS foi avaliada?" |
| Qualquer + contrata MEI/Simples | "Como será o tratamento CBS dos serviços de prestadores do Simples Nacional?" |

### 4.4 Regras de geração e qualidade

```
Quantidade: mínimo 5, máximo 10 perguntas por projeto
Timeout: 30 segundos (após isso → fallback obrigatório)
Temperatura LLM: 0.3 (consistência)
MaxTokens: 2.000 (suficiente para 10 perguntas)
Filtro de qualidade: confidence_score < 0.7 → pergunta descartada
```

### 4.5 Fallback obrigatório

Se a IA falhar (timeout, erro de API, resposta inválida), o sistema executa o fallback sem bloquear o fluxo:

1. Logar o erro (não silencioso)
2. Exibir conjunto padrão de 5 perguntas genéricas hardcoded em `server/routers/onda2Fallback.ts`
3. Marcar as perguntas fallback com `confidence_score = 0.5`
4. O advogado prossegue normalmente

### 4.6 Persistência — tabela `iagen_answers`

```typescript
// drizzle/schema.ts — adicionado em K-4-A
export const iagenAnswers = mysqlTable('iagen_answers', {
  id:              int('id').autoincrement().primaryKey(),
  projectId:       int('project_id').notNull()
                   .references(() => projects.id),
  questionText:    text('question_text').notNull(),
  resposta:        text('resposta').notNull(),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),
  fonte:           varchar('fonte', { length: 20 }).default('ia_gen'),
  createdAt:       bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:       bigint('updated_at', { mode: 'number' }).notNull(),
})
// Índice: (project_id)
```

---

## 5. ONDA 3 — QUESTIONÁRIO REGULATÓRIO (FUNCIONAMENTO ATUAL)

### 5.1 O que está implementado

A Onda 3 é o funcionamento atual da plataforma — o corpus RAG que gera perguntas baseadas nos artigos das leis tributárias relevantes para o CNAE da empresa.

| Corpus | Chunks | Cobertura |
|---|---|---|
| LC 214/2025 | 1.573 chunks (artigos) + 819 chunks (Anexos NCM) | IBS, CBS, confissão, regimes |
| LC 227/2026 | 434 chunks | Ajustes e complementações |
| LC 224/2026 | 28 chunks | NCM, alíquotas, crédito |
| EC 132/2023 | 18 chunks | Fundamento constitucional |
| LC 123 (Simples Nacional) | 25 chunks | Regime do Simples |
| **Total** | **2.078 chunks** | 100% com anchor_id |

### 5.2 Estrutura do questionário regulatório

A Onda 3 gera três tipos de questionários por projeto:

- **Questionário Corporativo (QC):** Dados gerais da empresa, regime tributário, porte, operações
- **Questionário Operacional (QO):** Processos fiscais, ERP, rotinas de apuração
- **Questionário por CNAE (QCNAE):** Um questionário específico para cada CNAE cadastrado no projeto

---

## 6. FLUXO UNIFICADO — AS 8 ETAPAS DO STEPPER TO-BE

### 6.1 Diagrama de rotas TO-BE

```
FLUXO UNIFICADO — 8 etapas (DiagnosticoStepper expandido)
==========================================================

[Início]
  └─ ProjetoDetalhesV2 (/projetos/:id)
       └─ DiagnosticoStepper (8 etapas)
            ├─ [Etapa 1] Onda 1 SOLARIS → /questionario-solaris
            ├─ [Etapa 2] Onda 2 IA Gen  → /questionario-iagen
            ├─ [Etapa 3] QC             → /questionario-corporativo-v2
            ├─ [Etapa 4] QO             → /questionario-operacional
            ├─ [Etapa 5] QCNAE          → /questionario-cnae
            ├─ [Etapa 6] Briefing       → /briefing-v3
            ├─ [Etapa 7] Matrizes       → /matrizes-v3
            └─ [Etapa 8] Plano          → /plano-v3
```

### 6.2 Máquina de estados — enum `status`

| Status | Significado | Etapa | Quem seta |
|---|---|---|---|
| `rascunho` | Projeto criado, CNAEs confirmados | — | Frontend |
| `onda1_solaris` | **NOVO** — Onda 1 concluída e validada | Etapa 1 | Backend (`completeOnda1`) |
| `onda2_iagen` | **NOVO** — Onda 2 concluída e validada | Etapa 2 | Backend (`completeOnda2`) |
| `diagnostico_corporativo` | QC concluído | Etapa 3 | Backend |
| `diagnostico_operacional` | QO concluído | Etapa 4 | Backend |
| `diagnostico_cnae` | QCNAE concluído | Etapa 5 | Backend |
| `briefing` | Briefing gerado | Etapa 6 | Backend |
| `matriz_riscos` | Matrizes geradas | Etapa 7 | Backend |
| `aprovado` | Plano aprovado | Etapa 8 | Backend |

> **Regra de enforcement:** O campo `status` é a fonte de verdade do fluxo. O frontend nunca altera o `status` diretamente. O backend valida a pré-condição antes de aceitar qualquer transição e retorna `TRPCError({ code: 'FORBIDDEN' })` se a pré-condição não for atendida.

### 6.3 Enforcement por rota

| Rota | Pré-condição no backend | Status setado ao sair | Erro se não atendido |
|---|---|---|---|
| `/questionario-solaris` | Projeto existe + ondas não iniciadas | `onda1_solaris` | FORBIDDEN |
| `/questionario-iagen` | `status = 'onda1_solaris'` | `onda2_iagen` | FORBIDDEN |
| `/questionario-corporativo-v2` | `status = 'onda2_iagen'` | `diagnostico_corporativo` | FORBIDDEN |
| `/questionario-operacional` | `status = 'diagnostico_corporativo'` | `diagnostico_operacional` | FORBIDDEN |
| `/questionario-cnae` | `status = 'diagnostico_operacional'` | `diagnostico_cnae` | FORBIDDEN |
| `/briefing-v3` | `status = 'diagnostico_cnae'` | `briefing` | FORBIDDEN |
| `/matrizes-v3` | `status = 'briefing'` | `matriz_riscos` | FORBIDDEN |
| `/plano-v3` | `status = 'matriz_riscos'` | `aprovado` | FORBIDDEN |

---

## 7. RASTREABILIDADE — O FIO CONDUTOR

### 7.1 Cadeia completa de rastreabilidade

```
PERGUNTA — de onde veio esta pergunta?
    ↓
RISCO — qual artigo ou conhecimento identificou este risco?
    ↓
AÇÃO — qual a ação concreta e verificável para mitigar?
```

### 7.2 Campos de rastreabilidade por camada

**No questionário (perguntas):**

| Campo | O que rastreia | Onda 1 | Onda 2 | Onda 3 |
|---|---|---|---|---|
| `fonte` | Origem da pergunta | `solaris` | `ia_gen` | `regulatorio` |
| `requirement_id` | Identificador canônico | `SOL-001`..`SOL-012` | `ia-gen-001`.. | `RF-045`.. |
| `source_reference` | Referência específica | "SOLARIS — Contabilidade Fiscal" | "Lucro Presumido + exportação" | "LC 214/2025 Art. 45 §4º" |

**Na matriz de riscos:**

| Campo | O que rastreia |
|---|---|
| `fonte_risco_tipo` | Origem do risco: `regulatorio` / `solaris` / `ia_gen` |
| `evidencia_regulatoria` | Artigo específico que fundamenta o risco |
| `causa_raiz` | Causa identificada que originou o risco |

**No plano de ação:**

| Campo | O que rastreia |
|---|---|
| `evidencia_regulatoria` | Base legal ou interna da ação |
| `acao_concreta` | O que fazer — específico, não genérico |
| `criterio_de_conclusao` | Como saber que foi feito — verificável |

### 7.3 Status de implementação dos campos

| Camada | Campo | Status | PR |
|---|---|---|---|
| Perguntas | `fonte` / `requirement_id` / `source_reference` no schema | ✅ Implementado | #142 |
| Perguntas | Fluxo que popula `fonte` com valor real por onda | ✅ K-2 (onda1Injector) | #154 |
| Perguntas | Badge visual de origem no questionário | ✅ K-3 | #155 |
| Riscos | `fonte_risco_tipo` no RiskItemSchema | ✅ Implementado | #110 |
| Riscos | `evidencia_regulatoria` obrigatória com enforcement | ✅ Implementado | #108 |
| Ações | `acao_concreta` obrigatória | ✅ Implementado | #108 |
| Ações | `criterio_de_conclusao` | ✅ Implementado | #108 |
| Onda 1 | `solaris_answers` (tabela + procedure) | ⏳ K-4-A/B | — |
| Onda 2 | `iagen_answers` (tabela + procedure) | ⏳ K-4-A/C | — |
| Auditoria | `project_status_log` (transições de estado) | ✅ K-4-E | #213 |

---

## 8. PLANO DE IMPLEMENTAÇÃO — SPRINTS K E L

### 8.1 Sprint K — Questionário 3 Ondas (Milestone M2)

| Sprint | Escopo | Status | Issue | Gate P.O. |
|---|---|---|---|---|
| **K-1** | Criar tabela `solaris_questions` + seed com 12 questões do UAT | ✅ Concluído | #153 | Não |
| **K-2** | Pipeline Onda 1 no questionEngine — perguntas `solaris` antes das regulatórias | ✅ Concluído | #154 | Não |
| **K-3** | Badge visual por onda no questionário | ✅ Concluído | #155 | **Sim — P.O. validou** |
| **K-4-A** | Migrations: `codigo` em `solaris_questions`, `solaris_answers`, `iagen_answers`. Expandir DiagnosticoStepper para 8 etapas (visual). | ✅ Concluído | — | Não |
| **K-4-B** | Tela `QuestionarioSolaris.tsx` + procedure `completeOnda1` | ⏳ Pendente | — | **Sim — P.O. testa** |
| **K-4-C** | Tela `QuestionarioIagen.tsx` + procedure `completeOnda2` | ⏳ Pendente | — | **Sim — P.O. testa** |
| **K-4-D** | Integração no diagnóstico: `solaris_answers` e `iagen_answers` injetados nos prompts | ⏳ Pendente | — | **Sim — P.O. valida diagnóstico** |
| **K-4-E** | `project_status_log` + limpeza Fluxo B (LEGACY_MODE) | ✅ Concluído | — | Não |

### 8.2 Sprint L — Upload CSV SOLARIS (Milestone M3)

| Sprint | Escopo | Status | Issue | Gate P.O. |
|---|---|---|---|---|
| **L-1** | Tela de upload CSV em `/admin/solaris-questions` com dry-run | ⏳ Pendente | #157 | **Sim — P.O. obrigatório** |
| **L-2** | Template CSV + guia para equipe jurídica | ⏳ Pendente | #158 | Não |

> **Após L-1:** O Dr. José Rodrigues pode adicionar novas matrizes diretamente pela interface — sem depender de programação.

---

## 9. CRITÉRIOS DE ACEITE DO P.O.

### K-3 — Badge visual (concluído)

> "Funcionou quando: crio projeto com CNAE 4639-7/01 (comércio atacadista), abro o questionário e vejo perguntas com badge azul 'Equipe Jurídica SOLARIS' separadas das perguntas com badge verde 'Legislação'. Consigo identificar a origem de cada pergunta sem precisar perguntar a ninguém."

### K-4-B — Tela Onda 1

> "Funcionou quando: abro um projeto novo, a primeira etapa do stepper é o Questionário SOLARIS com as 12 perguntas SOL-001 a SOL-012, respondo todas, clico em 'Concluir Onda 1' e o sistema avança para a Onda 2."

### K-4-C — Tela Onda 2

> "Funcionou quando: crio dois projetos — um com Lucro Presumido + exportação + contrata Simples, outro com Simples Nacional + sem exportação. Os questionários da Onda 2 são diferentes. O primeiro recebe perguntas sobre creditamento CBS que o segundo não recebe."

### K-4-D — Integração no diagnóstico

> "Funcionou quando: empresa que respondeu 'NÃO' em SOL-002 recebe risco crítico de confissão por inércia na matriz de riscos. Empresa que respondeu 'SIM' recebe risco mitigado ou não recebe o risco."

### L-1 — Tela de upload

> "Funcionou quando: acesso /admin/solaris-questions, faço upload do CSV de teste, vejo o preview com as 12 questões, confirmo a publicação e as questões aparecem no questionário com badge azul."

---

## 10. O QUE MUDA PARA O ADVOGADO

### Antes das 3 ondas

O advogado recebia um questionário com perguntas baseadas na legislação. Eficiente para cobertura regulatória, mas incompleto para um compliance real. Riscos práticos e operacionais não apareciam.

### Depois das 3 ondas

O advogado vê três tipos de perguntas claramente identificadas:

**🔵 "Equipe Jurídica SOLARIS" (Onda 1)**
Riscos que o escritório sabe que toda empresa precisa verificar. Curados por humanos. Baseados em anos de prática tributária.

**🟠 "Perfil da empresa" (Onda 2)**
Perguntas geradas especificamente para as características desta empresa. Só aparecem para empresas com aquele perfil específico.

**🟢 "Legislação" (Onda 3)**
Fundamentação regulatória rastreável até o artigo. Base legislativa do compliance.

O diagnóstico resultante é mais completo (cobre os 3 tipos de risco), mais credível (o advogado sabe de onde veio cada pergunta), mais personalizado (a Onda 2 é única para esta empresa) e mais auditável (rastreabilidade completa da pergunta ao plano de ação).

---

## 11. HISTÓRICO DE DECISÕES

| Data | Decisão | Quem |
|---|---|---|
| 2026-03-26 | AS-IS documentado: G15 identificado como gap crítico de rastreabilidade | Orquestrador |
| 2026-03-26 | P.O. define arquitetura de 3 ondas com fonte regulatorio/solaris/ia_gen | Uires Tapajós |
| 2026-03-26 | DEC-002: schema CSV SOLARIS aprovado com 9 campos | P.O. |
| 2026-03-26 | DEC-004: publicação direta com log de auditoria (sem gate manual) | P.O. |
| 2026-03-27 | PR #142: campos fonte/requirement_id/source_reference no QuestionSchema | Manus |
| 2026-03-27 | UAT Round 1: advogados identificam ausência das ondas 1 e 2 | Equipe jurídica |
| 2026-03-27 | Dr. José Rodrigues envia 2 matrizes → viram seed da Onda 1 | José Rodrigues |
| 2026-03-27 | Issues #153-#158 criadas no GitHub (Sprint K e L) | Manus |
| 2026-03-27 | CSV-ONDA1-SOLARIS-TESTE-K1.csv gerado com 12 questões reais | Orquestrador |
| 2026-03-27 | K-1 concluído: tabela `solaris_questions` + seed SOL-001..012 | Manus |
| 2026-03-27 | K-2 concluído: `onda1Injector.ts` — pipeline Onda 1 no questionEngine | Manus |
| 2026-03-27 | K-3 concluído: badges visuais por onda no questionário | Manus |
| 2026-03-27 | Decisões P.O. formalizadas: 5 questões respondidas (tabelas separadas, LEGACY_MODE, stepper 8 etapas) | Uires Tapajós |
| 2026-03-27 | FLUXO-3-ONDAS-AS-IS-TO-BE.md v1.1 aprovado pelo P.O. | Uires Tapajós |
| 2026-03-29 | K-4-E concluído: `project_status_log` + limpeza Fluxo B (PR #213) | Manus |
| 2026-03-30 | Este documento criado como referência canônica das 3 ondas | Manus |

---

## 12. LIÇÃO APRENDIDA

A lição mais importante desta jornada:

> **Tecnologia resolve o que é explícito. Experiência resolve o que é implícito.**

O sistema RAG era excelente para o que está explícito — os artigos das leis. Mas compliance tributário tem uma enorme dimensão implícita: o que os advogados sabem que toda empresa deveria verificar, mas que nenhuma lei escreve como tal.

As 3 ondas é a ponte entre essas duas dimensões. A Onda 1 captura o implícito do escritório. A Onda 2 captura o implícito do perfil da empresa. A Onda 3 captura o explícito da lei. Juntas: diagnóstico completo de GRC tributário.

---

*Documento criado em 2026-03-30*
*IA SOLARIS — Compliance Tributário da Reforma Tributária*
*P.O.: Uires Tapajós | Orquestrador: Claude (Anthropic) | Implementador: Manus*
