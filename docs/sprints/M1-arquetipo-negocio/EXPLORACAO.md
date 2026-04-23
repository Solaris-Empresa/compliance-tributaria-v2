# M1 — Arquétipo de Negócio · Documento de Exploração

> Documento vivo · iniciado 2026-04-23 · mantido pelo Orquestrador + Claude Code
> **Status:** F0 — **validação de hipótese** (suspenso pré-spec até testes validarem o arquétipo)

Este documento consolida o trabalho exploratório antes da abertura formal da spec M1. Não substitui a SPEC (F1) nem o ADR; é o lugar onde acumulamos o entendimento do escopo, dependências, decisões em aberto e riscos antes de congelar um plano de implementação.

> ⛔ **PARADA DE PRODUÇÃO (2026-04-23):** P.O. declarou que **não avançaremos para implementação até testes com casos reais comprovarem que o arquétipo é a abstração correta** para orientar o RAG. O arquétipo é uma hipótese do P.O. — pode estar errada. Ver Seção 11.

---

## 1. Escopo declarado pelo P.O.

Grande output da M1: **arquétipo de negócio consistente e auditável, derivado do formulário de projeto após a confirmação do CNAE.**

### Restrições operacionais (travadas pelo P.O. em 2026-04-23)

| # | Restrição | Consequência |
|---|---|---|
| 1 | **Sem migração de dados.** Único dado preservado é o RAG. Projetos e tabelas satélites podem ser limpos (`db:reset`). | Elimina dual-read / snapshot / feature flag de paralelismo |
| 2 | **Sem mudança de fluxo nem de estrutura.** Apenas inserir campos novos e excluir campos obsoletos. | Não é wizard de 8 telas — mantém formulário em 1 tela |
| 3 | **CNAE free-text mantido.** Usuário digita descrição; sistema gera CNAE via LLM+RAG no avanço do form. | Elimina necessidade de autocomplete controlado para CNAE |
| 4 | **Tela de revisão do arquétipo no final do form.** Gate de avanço: só libera próxima etapa se arquétipo válido. | Único componente novo (`RevisaoArquetipo.tsx`) |
| 5 | **Arquétipo só fica completo após confirmação do CNAE.** | A tela de revisão vive **depois** da confirmação — antes não há arquétipo |

---

## 2. Inventário AS-IS (estado atual da base)

### 2.1 UX — Formulário atual

- **Rota principal:** `client/src/pages/NovoProjeto.tsx` (Etapa 1 do fluxo v3)
- **Componente principal:** `client/src/components/PerfilEmpresaIntelligente.tsx` (69 KB — limite aceitável)
- **Estrutura:** 1 tela, 2 colunas (formulário + painel de score ao vivo)
- **Campos atuais:** 19 em `PerfilEmpresaData` (linha 31)
  - **7 obrigatórios (70% peso):** cnpj, companyType, companySize, taxRegime, operationType, clientType, multiState
  - **12 opcionais (30% peso):** annualRevenueRange, hasMultipleEstablishments, hasImportExport, hasSpecialRegimes, paymentMethods, hasIntermediaries, hasTaxTeam, hasAudit, hasTaxIssues, isEconomicGroup, taxCentralization, principaisProdutos/principaisServicos
- **Score no front:** função `calcProfileScore` linha 169 (hardcoded, 7+12 campos)
- **data-testid:** **ausentes nos campos do perfil** — débito governance hoje

### 2.2 Dados — Schema atual (`drizzle/schema.ts:31-160`, tabela `projects`)

| Coluna JSON | Conteúdo |
|---|---|
| `companyProfile` | cnpj, companyType, companySize, taxRegime, annualRevenueRange |
| `operationProfile` | operationType, clientType[], multiState, principaisProdutos[], principaisServicos[] |
| `taxComplexity` | hasInternationalOps, usesTaxIncentives, usesMarketplace |
| `financialProfile` | paymentMethods[], hasIntermediaries |
| `governanceProfile` | hasTaxTeam, hasAudit, hasTaxIssues |
| `confirmedCnaes` | [{code, description, confidence}] |
| `questionnaireAnswers` | Respostas Q1-Q3 |
| `briefingStructured` | briefing com confidence_score |

### 2.3 Regra — Condicionamento existente

- Única lógica condicional: `calcularLimitePerguntas()` em `server/routers-fluxo-v3.ts:78-100`
- Função gating de **quantidade** de perguntas, não de blocos
- Consome: `hasInternationalOps`, `usesTaxIncentives`, `hasIntermediaries`, `hasTaxIssues`, `operationType` — **3 destes saem/mudam no TO-BE**

### 2.4 Saída — Arquétipo hoje

- **Não existe "arquétipo" como objeto de saída**
- `operationProfile.operationType` (string única) é consumido indiretamente por:
  - `server/lib/risk-categorizer.ts:1-80` (categorização de riscos)
  - Templates de briefing
  - PDF exporter
- Memória registra: "Epic RAG com Arquetipo" em **Etapa 0** (Hotfix IS concluído)

### 2.5 Briefing — Fórmula de confiança atual

**Arquivo:** `server/lib/calculate-briefing-confidence.ts` + `briefing-confidence-signals.ts`

| Pilar | Peso | Cálculo |
|---|---|---|
| Perfil (completude 7 obrig + 12 opc) | 8 | **19 campos hardcoded** |
| Q3 Produtos (NCM) | 10 | 30% cadastro + 70% respostas |
| Q3 Serviços (NBS) | 10 | 30% cadastro + 70% respostas |
| Q3 CNAE especializado | 10 | ratio respostas/total cache |
| Q1 SOLARIS (Onda 1) | 5 | ratio respostas/elegíveis |
| Q2 IA Gen (Onda 2) | 2 | binário |

- **Threshold P.O.:** ≥ 85% para briefing aprovável
- **Duplicação crítica:** `calcProfileScore` existe **tanto no front** (PerfilEmpresaIntelligente.tsx:169) **quanto no back** (briefing-confidence-signals.ts:69) — risco Z-17 redux

### 2.6 QA — Testes que pinam o shape atual

| Arquivo | O que pinará |
|---|---|
| `server/bug001-regression.test.ts` | `isEconomicGroup` + `taxCentralization` |
| `server/bloco-e-operation-profile.test.ts` | `principaisProdutos/Servicos` |
| `server/bloco-e-frontend.test.ts` | extração NCM/NBS do `operationProfile` |
| `server/lib/briefing-confidence-signals.test.ts` | 7 obrig + 12 opc hardcoded |
| `server/lib/calculate-briefing-confidence.test.ts` | Modelo composto atual |
| `server/m2-componente-d-update-operation-profile.test.ts` | Mutação `operationProfile` |
| `server/novo-fluxo-fase4.test.ts` | Confidence score pipeline |
| `tests/e2e/z17-pipeline-completo.spec.ts` | Fluxo completo perfil → briefing |

---

## 3. TO-BE — Campos do arquétipo (spec detalhada do P.O.)

### 3.1 Diretriz de UX

- ❌ Evitar campo aberto
- ✅ Priorizar seleção guiada, chips, radio, checkbox, autocomplete controlado
- Descrição do negócio continua existindo como **apoio**, não define arquétipo sozinha

### 3.2 Blocos de campos (9 blocos)

#### Bloco 1 — Identificação da empresa

| Campo | UX | Opções | Obrigatório |
|---|---|---|---|
| CNPJ | máscara + validação | 14 dígitos válidos | ✅ |
| Natureza jurídica | select pesquisável | LTDA, S.A., SLU, EIRELI, MEI, Cooperativa, Associação, Outros | ✅ |
| Nome empresarial | texto curto | livre | ✅ |

#### Bloco 2 — Estrutura do negócio

| Campo | UX | Opções | Obrigatório |
|---|---|---|---|
| Natureza da operação principal | cards (single) | Produção, Comércio, Serviço, Transporte, Intermediação, Plataforma digital, Agro, Financeiro, Saúde, Energia/Combustíveis, Construção, Educação, Tecnologia | ✅ |
| Operações secundárias | chips (multi) | mesmas opções da principal | ✅ |
| Fontes de receita | chips (multi) | Venda de mercadoria, Prestação de serviço, Frete, Comissão, Assinatura, Royalties, Juros/tarifas, Produção própria, Aluguel, Outras | ✅ |
| Objeto econômico principal | cards (multi) | Bens/mercadorias, Serviços, Direitos/licenças, Ativos financeiros, Produção agropecuária, Energia/combustíveis, Saúde/medicamentos | ✅ |
| Posição na cadeia econômica | radio/select | Produtor, Importador, Distribuidor, Atacadista, Varejista, Prestador, Transportador, Marketplace, Intermediador, Operadora, Franqueadora, Outra | ✅ |

#### Bloco 3 — Classificação oficial

| Campo | UX | Obrigatório | Regra de exibição |
|---|---|---|---|
| CNAE principal confirmado | **geração via LLM+RAG a partir de descrição livre** | ✅ | sempre (fluxo atual preservado) |
| CNAEs secundários relevantes | autocomplete multi | ⚠️ | se multiatividade |
| Possui bens/mercadorias? | radio | ✅ | sempre |
| Possui serviços prestados? | radio | ✅ | sempre |
| NCMs principais | autocomplete multi | ⚠️ | se "possui bens = sim" |
| NBSs principais | autocomplete multi | ⚠️ | se "possui serviços = sim" |

#### Bloco 4 — Territorialidade

| Campo | UX | Opções | Obrigatório |
|---|---|---|---|
| Abrangência operacional | cards multi | Municipal, Intermunicipal, Interestadual, Nacional, Importação, Exportação | ✅ |
| Opera em múltiplos estados? | radio | Sim/Não | ✅ |
| UF principal | select | 27 UFs | ✅ |
| Possui filial em outra UF? | radio | Sim/Não | ⚠️ se multiestado |
| Atua com exportação? | radio | Sim/Não | ⚠️ |
| Atua com importação? | radio | Sim/Não | ⚠️ |

#### Bloco 5 — Regime e porte

| Campo | UX | Opções | Obrigatório |
|---|---|---|---|
| Regime tributário | cards/select | Simples, Presumido, Real, Específico | ✅ |
| Faixa de faturamento anual | select | até 360k, 360k–4,8M, 4,8M–78M, >78M, >300M | ✅ |
| Porte da empresa | select | MEI, Micro, Pequena, Média, Grande | ✅ |

#### Bloco 6 — Complexidade operacional

| Campo | UX | Obrigatório |
|---|---|---|
| Múltiplos estabelecimentos | radio | ⚠️ |
| Estrutura de operação | radio | ⚠️ se múltiplos = sim |
| Operação própria + terceiros? | radio | ⚠️ transporte/logística/agro |
| Tipo de cliente predominante | chips multi | ⚠️ (B2B, B2C, B2G, B2B2C) |
| Atua como marketplace? | radio | ⚠️ |

#### Bloco 7 — Setores complexos e regulados

| Campo | UX | Obrigatório |
|---|---|---|
| Setor regulado? | radio | ✅ |
| Órgão regulador | chips multi | ⚠️ ANP, ANVISA, ANS, BACEN, SUSEP, ANAC, MAPA, ANEEL, ANATEL |
| Subnatureza setorial | select dependente | ⚠️ |
| Tipo de operação específica | select dependente | ⚠️ |
| Papel operacional específico | select dependente | ⚠️ |

**Subnatureza setorial (cascata):**
- Saúde: Clínica, Hospital, Laboratório, Farmácia, Operadora, Diagnóstico
- Financeiro: Banco, Fintech, IP, SCD, Seguradora, Administradora
- Combustíveis: Refinaria, Distribuidora, Revendedora, Transportadora, Armazenadora
- Transporte: Carga, Passageiros, Produtos perigosos, Internacional, Logística integrada
- Agro: Produtor rural, Agroindústria, Cerealista, Trading, Cooperativa
- Aviação: Passageiros, Carga, Manutenção, Táxi aéreo, Escola

#### Bloco 8 — Comércio exterior e territórios especiais

| Campo | Obrigatório |
|---|---|
| Papel no comércio exterior | ⚠️ se importa/exporta |
| Opera em território incentivado? | ⚠️ |
| Tipo de território incentivado | ⚠️ se incentivado = sim |
| Possui regime especial? | ⚠️ |
| Tipo de regime especial | ⚠️ se regime = sim |

#### Bloco 9 — Estrutura societária e escopo

| Campo | Obrigatório | Regra especial |
|---|---|---|
| Integra grupo econômico? | ⚠️ | — |
| Análise para 1 único CNPJ operacional? | ✅ | — |
| Nível da análise | ✅ | CNPJ operacional único / Estabelecimento único |

**Bloqueio obrigatório:** se `integra_grupo = sim` AND `análise_1_cnpj = não` → bloqueia fluxo.

### 3.3 AS-IS vs TO-BE (tabela consolidada)

| Campo atual (AS-IS) | Ação | Campo novo / ajuste (TO-BE) | Motivo |
|---|---|---|---|
| Nome do Projeto | ✔ manter | — | identificação operacional |
| Descrição do Negócio | ⚠️ manter como apoio | não estrutural | não pode definir arquétipo sozinha |
| CNPJ | ✔ manter | — | ancora contribuinte |
| Tipo Jurídico | ✔ manter | — | contexto societário |
| Porte da Empresa | ⚠️ manter (apoio) | — | não define negócio |
| Regime Tributário | ✔ manter | — | necessário |
| Faturamento Anual | ⚠️ manter (apoio) | — | contexto |
| Tipo de Operação Principal | ❌ substituir | Natureza da operação (multi) | hoje limitado |
| Tipo de Cliente | ⚠️ manter opcional | — | apoio |
| Produtos e Serviços (campo único) | ❌ dividir | NCM + NBS separados | hoje mistura |
| Opera em múltiplos estados | ✔ manter | integrar em Abrangência territorial | correto |
| Múltiplos estabelecimentos | ✔ manter | — | refina estrutura |
| Importação/exportação | ✔ manter | expandir com papel operacional | hoje incompleto |
| Regimes especiais (sim/não) | ❌ expandir | Tipo de regime especial (multi) | hoje binário |
| Meios de pagamento | ❌ remover do arquétipo | mover para fase 2 | não define negócio |
| Intermediários financeiros | ❌ remover | fase 2 | idem |
| Grupo econômico | ⚠️ manter | + bloqueio multi-CNPJ | escopo |
| Centralização fiscal | ❌ remover | fase 2 | obrigação, não negócio |
| Governança tributária (todos) | ❌ remover | fase posterior | não define arquétipo |

### 3.4 Saída esperada (exemplo)

```json
{
  "cnpj": "00.000.000/0001-00",
  "natureza_da_operacao": ["transporte"],
  "fontes_de_receita": ["frete"],
  "tipo_de_objeto_economico": ["bens", "servicos"],
  "cnae_principal_confirmado": "4930-2/02",
  "cnaes_secundarios": [],
  "ncm_produtos": ["2710", "2711"],
  "nbs_servicos": ["1.0501.14.51"],
  "abrangencia_territorial": ["interestadual"],
  "regime_tributario": "lucro_real",
  "posicao_na_cadeia_economica": "transportador",
  "subnatureza_setorial": "produtos_perigosos",
  "papel_operacional": "transportador",
  "tipo_operacao_especifica": "frete_rodoviario",
  "status_arquetipo": "valido"
}
```

### 3.5 Regras de consistência (hard blockers — aplicados na Revisão)

| Condição | Ação |
|---|---|
| bens = sim AND NCM vazio | bloquear avanço |
| serviços = sim AND NBS vazio | bloquear avanço |
| exportação = sim AND papel exterior vazio | bloquear avanço |
| setor regulado = sim AND subnatureza vazia | bloquear avanço |
| integra grupo = sim AND análise 1 CNPJ = não | bloquear fluxo |
| operação principal incompatível com receita | alerta + pedir ajuste |

---

## 4. Classificação de impacto

### 4.1 REGRA-ORQ-24

**Classe B (feature média)** após aplicação das restrições #1–#5:
- ~600 linhas estimadas (~5 arquivos core + ~8 testes)
- 1 componente novo (`RevisaoArquetipo.tsx`)
- 1 round de crítica
- ADR opcional, **mas recomendável** (schema + fórmula de confiança mudam)

### 4.2 REGRA-ORQ-20 — Gatilhos ativos

- ✅ Schema DB (reshape de 3 colunas JSON)
- ✅ Cross-file (≥5 módulos: client + server + shared + drizzle + tests)
- ✅ Amplitude (~500–600 linhas)
- ✅ Engine determinística (risk-categorizer lê `operationType`)

→ **Bloco RiskAssessment obrigatório na SPEC.**

---

## 5. Fluxo mermaid — estado de entendimento atual

```mermaid
flowchart TD
  Start([Usuário entra em Novo Projeto]) --> Form

  subgraph Tela1["TELA 1 — Formulário (mantém 1 tela)"]
    direction TB
    Form[Preenche campos estruturados<br/>+ descrição livre do negócio]
    Panel[Painel lateral<br/>score de completude ao vivo]
    Form --- Panel
  end

  Tela1 --> Submit([Avançar])

  Submit --> CNAEGen

  subgraph CNAEBlock["FLUXO CNAE (preservado)"]
    direction TB
    CNAEGen[LLM + RAG gera sugestão<br/>a partir da descrição]
    CNAEConfirm{Usuário<br/>confirma CNAE?}
    CNAEGen --> CNAEConfirm
    CNAEConfirm -- ajustar --> CNAEGen
  end

  CNAEConfirm -- confirmado --> Build

  subgraph ArqBlock["NOVO NA M1 — Construção do Arquétipo"]
    direction TB
    Build[buildArchetype<br/>campos form + confirmedCnaes]
    Revisao[Tela de Revisão do Arquétipo<br/>exibe JSON em cards]
    Validate{status_arquetipo<br/>= valido?}
    Blockers[Mostra blockers ativos<br/>bens+NCM · serviços+NBS<br/>export+papel · regulado+subnatureza<br/>operação↔receita · multi-CNPJ]
    Build --> Revisao --> Validate
    Validate -- incompleto --> Blockers
    Blockers -. voltar e editar .-> Form
  end

  Validate -- válido --> Next

  subgraph Downstream["Próximas etapas (a jusante)"]
    direction TB
    Next[Etapa 2 — Questionário Q1]
    QLimit[calcularLimitePerguntas]
    Q1Q2Q3[Respostas Q1/Q2/Q3]
    RiskCat[risk-categorizer<br/>gera matriz de riscos]
    Briefing[Briefing + score de confiança]
    Next --> QLimit --> Q1Q2Q3 --> RiskCat --> Briefing
  end

  C1[P1 — Recalibrar fórmula<br/>confidence vs threshold 85%]:::crit -.-> Briefing
  C2[P2 — calcularLimitePerguntas<br/>lê 5 campos; 3 mudam]:::crit -.-> QLimit
  C3[P3 — risk-categorizer hoje lê<br/>operationType string]:::crit -.-> RiskCat
  C4[P4 — calcProfileScore duplicado<br/>front e back]:::crit -.-> Panel
  C5[P5 — buildArchetype fonte única<br/>@shared/archetype.ts]:::crit -.-> Build
  C6[P6 — 6 regras hard só<br/>na Revisão, não no form]:::crit -.-> Validate

  D1{{D1 — shape<br/>3 JSONs OU 1 coluna nova?}}:::unclear -.-> Form
  D2{{D2 — threshold 85%<br/>literal OU recalibrar?}}:::unclear -.-> Briefing
  D3{{D3 — campos fase-2<br/>deletar OU mover?}}:::unclear -.-> Form
  D4{{D4 — M1 é Etapa 1 Epic RAG<br/>OU sprint standalone?}}:::unclear -.-> ArqBlock
  D5{{D5 — lista canônica<br/>de campos é final?}}:::unclear -.-> Tela1
  D6{{D6 — campos novos<br/>exigem CNAE antes?<br/>ou valem sempre?}}:::unclear -.-> Build

  classDef crit fill:#ffe0e0,stroke:#c00,stroke-width:2px
  classDef unclear fill:#fff5cc,stroke:#b8860b,stroke-width:2px,stroke-dasharray: 5 5
```

---

## 6. Pontos críticos (P1–P6)

| # | O que é | Por que é crítico | Onde vive |
|---|---|---|---|
| **P1** | Recalibração da fórmula de confiança | Remover/adicionar campos desloca o peso dos pilares; o 85% do P.O. deixa de ser o mesmo 85% | `server/lib/calculate-briefing-confidence.ts` · `briefing-confidence-signals.ts` |
| **P2** | `calcularLimitePerguntas` | Consome `hasInternationalOps`, `usesTaxIncentives`, `hasIntermediaries`, `hasTaxIssues`, `operationType` — 3 mudam/somem | `server/routers-fluxo-v3.ts:78-100` |
| **P3** | `risk-categorizer` | Lê `operationProfile.operationType` (string única) — arquétipo novo tem `natureza_operacao[]` (array) | `server/lib/risk-categorizer.ts:1-80` |
| **P4** | `calcProfileScore` duplicado | Existe no front e no back — Z-17 redux se não unificar em `@shared/` | `client/src/components/PerfilEmpresaIntelligente.tsx:169` + `server/lib/briefing-confidence-signals.ts:69` |
| **P5** | `buildArchetype` fonte única | Se UI e servidor computarem diferente, o gate da Revisão mente | A criar em `shared/archetype.ts` |
| **P6** | 6 regras hard só na Revisão | Usuário preenche livre e só descobre blockers no final — UX precisa sinalização durante preenchimento para evitar frustração | `RevisaoArquetipo.tsx` a criar |

---

## 7. Decisões em aberto (D1–D6)

| # | Pergunta | Impacto | Quem decide |
|---|---|---|---|
| **D1** | Shape de persistência: 3 JSONs reshaped (`company/operation/tax`) **ou** 1 coluna nova `archetypeProfile`? | Tamanho do diff e clareza semântica | P.O. / arquitetura |
| **D2** | Threshold briefing 85% mantém literal **ou** recalibra com UAT em 3–5 projetos? | Governança do briefing | P.O. |
| **D3** | Campos fase-2 (paymentMethods, governance, taxCentralization): deletar do schema **ou** mover para tabela `project_phase2_extras`? | Débito técnico vs escopo M1 | P.O. |
| **D4** | M1 entra como Etapa 1 do Epic RAG com Arquétipo (Etapa 0 = Hotfix IS) **ou** sprint independente? | Rotulagem governance + narrativa | P.O. + governance |
| **D5** | Tabela detalhada de campos é v-final **ou** admite revisão? | Congelamento antes do F1 | P.O. |
| **D6** | Campos do arquétipo (subnatureza_setorial, papel_operacional, etc.) são preenchidos **antes** do CNAE (no form inicial) **ou** surgem **depois** da confirmação do CNAE (como campos condicionais na Revisão)? | Ambíguo na spec atual: restrição #5 diz "só após CNAE" mas tabela lista todos no form inicial | P.O. |

---

## 8. Dependências cruzadas (mapa de acoplamento)

```
Formulário ──┬──► calcularLimitePerguntas  (questionário Q3)
             ├──► calcProfileScore × 2     (confidence front + back)
             ├──► risk-categorizer         (categorias LC 214)
             ├──► briefing generator       (prosa + tópicos)
             ├──► PDF exporter             (campos literal)
             └──► decision-kernel          (NCM/NBS classification)
```

**Regra:** qualquer consumer com leitura direta de `operationProfile.X` precisa ser auditado no Gate 0 com `grep -rn "operationProfile\." server/`.

---

## 9. Próximos passos — SUSPENSOS

> **Status 2026-04-23:** todas as opções abaixo ficam **congeladas** até a Seção 11 (Validação de Hipótese) concluir com veredito "arquétipo é a abstração certa" OU "arquétipo precisa ser revisto".

### ~~Opção A — ADR rascunho primeiro~~ (aguarda validação)
1. ~~Claude Code produz ADR de 1 página respondendo D1/D3/D4~~
2. ~~P.O. revisa direção antes de código~~
3. ~~Se OK → SPEC F1~~

### ~~Opção B — SPEC v1.0 com decisões em aberto~~ (aguarda validação)
1. ~~Orquestrador gera SPEC listando D1–D6 como "decisões pendentes" no topo~~
2. ~~Claude Code produz 1 round de crítica 3-níveis (REGRA-ORQ-22)~~
3. ~~P.O. trava decisões e aprova v1.1~~

### ~~Opção C — Responder D1–D6 agora~~ (aguarda validação)
1. ~~P.O. responde as 6 decisões~~
2. ~~Orquestrador gera SPEC final v1.0 já travada~~
3. ~~Aprovação direta~~

**Fluxo real agora:** Seção 11 → testes passam → **aí sim** retomamos A/B/C.

---

## 10. Histórico de alterações deste documento

| Data | Autor | O que mudou |
|---|---|---|
| 2026-04-23 | Claude Code | Versão inicial: escopo + AS-IS + TO-BE + fluxo mermaid + pontos críticos P1–P6 + decisões D1–D6 |
| 2026-04-23 | Claude Code | **Pivot:** adicionada Seção 11 (Validação de Hipótese) por decisão do P.O. · status muda de "pré-spec" para "validação de hipótese" · Seção 9 suspensa até testes validarem |
| 2026-04-23 | Claude Code | Rodada 2 de requisitos do P.O.: adicionada Seção 12 (7 requisitos adicionais) · clarificação que "sem alteração no fluxo" = E2E preservado MAS UX dentro do form muda com progressive disclosure |
| 2026-04-23 | Claude Code | Clarificação P.O. §12.3: modelo mental da UX on-the-fly atual é "NCM/NBS só aparecem se serviço OU produto OU misto" — código implementa via subtipos (industria/comercio/agro para produto; servicos/financeiro para serviço) |
| 2026-04-23 | Claude Code | **Suite 1 executada — rodada A**: `M1-arquetipo-go-no-go-brasil-v1` · 15 cenários · **🟢 GO 15/15** · zero gap de campo · 6 findings de desalinhamento `expected_open_blocks` (não-bloqueantes) · ver `tests/archetype-validation/REPORT-*.md` |
| 2026-04-23 | Claude Code | **Rodada B — crítica da spec UI**: matriz P.O. × regras Seção 2 + 10 edge cases. **🟡 AMARELO** · 2 divergências matriz (T03, T15) · 1 regra faltando (regime_especial) · 4 ambiguidades · 10 recomendações (R1-R10) · ver `tests/archetype-validation/CRITIQUE-UI-SPEC.md` |
| 2026-04-23 | Claude Code | **Rodada C — spec UI v2 recebida do consultor** · 8 das 10 recomendações endereçadas · simulação mental sob v2 identifica 15 red flags (N1-N15) · spec-ui-v2.json salva localmente (não commitada) |
| 2026-04-23 | Claude Code | **Decisão REGRA-M1-GO-NO-GO: 🔴 NO-GO** · C1 FAIL · C2 PARCIAL · C3 FAIL · 7 P0 pendentes · 6 P1 · 2 P2 backlog · 4 de 4 regras de bloqueio disparam · implementação M1 segue suspensa · ver `DECISAO-GO-NO-GO-M1.md` |
| 2026-04-23 | Consultor | **Decisão B — REVISE_SPEC** · P.O. deve corrigir P0 e enviar v3 antes de nova validação · 5 P0 selecionados: N1, N5, N14, N15, R8 · 2 P0 da lista Claude Code NÃO selecionados (ver nota abaixo) · aguardando v3 |
| 2026-04-23 | Consultor | **Confirmação:** N12 (CONTAINS case_insensitive) e RULE_MULTI_CNPJ_TEST incluídos na v3 · "ambos são P0 reais, não podem ser rebaixados nem ignorados" · **7/7 P0 confirmados para v3** |
| 2026-04-23 | Claude Code | **Pesquisa de mercado executada** · 9 áreas cobertas (OSS BR, DDD archetypes, tax-tech global, form engines, structured RAG, KYC/AML, rule engines, taxonomias BR, UX progressive disclosure) · validação ao vivo 2026-04-23 confirma design alinhado com padrões maduros · **descoberta:** LC 227/2026 publicada (gap no RAG) + cClassTrib IBS/CBS oficial · arxiv 2510.24402 (Meta-RAG financeiro) é caso análogo · ver `PESQUISA-MERCADO.md` |
| 2026-04-23 | Claude Code | **Mockups HTML produzidos** · 6 estados progressivos do fluxo (A início, B industria, C misto, D ZFM sub-bloco, E HARD BLOCK validação, F sucesso) · cada campo com EFEITO visível · painel lateral mostra arquétipo em construção como JSON vivo · ver `MOCKUP_arquetipo_deterministico.html` |
| 2026-04-23 | Claude Code | **Bateria 50 cenários v1** · 0 PASS · 1 BLOCKED (S27 controle negativo ok) · 49 AMBIGUOUS por seeds parciais · verdict NO-GO inicial (seeds precisam enriquecimento) · 8 must_cover_rules todas acionadas |
| 2026-04-23 | Claude Code | **Bateria v2 enriquecida** · 49 PASS · 1 BLOCKED (S27) · 0 FAIL · 0 AMBIGUOUS · PASS rate 98% · confidence média 0.619 (vs 0.200 na v1) · max 82% (casos regulados completos) · ver `RESULT-50-casos-brasil-v2.json` |
| 2026-04-23 | P.O. | **🟢 GO (restrito):** "GO para avançar para SPEC v3 (pré-M1) · NÃO é GO para implementação ainda" · escopo autorizado: produção da spec v3 pelo consultor resolvendo os 7 P0 · implementação **segue suspensa** · REGRA-M1-GO-NO-GO permanece em vigor · próxima validação: rodar a bateria v2 contra a spec v3 quando consultor entregar |
| 2026-04-23 | P.O. | **Nova regra E2E `STOP_IF_NOT_ELIGIBLE`** enviada para inclusão na SPEC v3 · escopo: gate obrigatório que para TODO o pipeline downstream (RAG · perguntas · briefing · riscos · plano) quando `arquetipo.status != 'valido' OR eligibility.overall != 'allowed'` · UI mostra BLOCKED com missing_fields + conflicts · audit log obrigatório · **Novo conceito:** `eligibility.overall` (campo não-definido ainda — consultor deve definir semântica na v3) · reafirmação: "pode avançar sem implementar nada ainda" · ver `REGRA-STOP-IF-NOT-ELIGIBLE.md` |
| 2026-04-23 | P.O. | **Correção importante (Claude Code confundiu métricas):** 98% é **pass rate** das regras determinísticas, **NÃO confiabilidade da plataforma**. Confidence média 0.619 (não 0.98) — reflete % médio de campos do arquétipo preenchidos, não garantia de correção. **GO permanece restrito apenas a:** (1) avançar com SPEC v3 · (2) consolidar o modelo do arquétipo. **NÃO é GO para:** (1) iniciar implementação M1 · (2) afirmar confiabilidade de 98%. **3 condições obrigatórias para GO de implementação:** (1) v3 resolve os 7 P0 · (2) revalidação da bateria contra v3 · (3) travar regra global `STOP_IF_NOT_ELIGIBLE` no E2E |
| 2026-04-23 | Claude Code | **Levantamento do código real executado** · 7 blocos cobertos (validações cruzadas, campos condicionais, status final, arquétipo atual, rastreabilidade do risco, avaliação redesenho, achados adicionais) · fonte única para respostas do consultor pré-SPEC v3 · descobertas principais: 5 regras DET-001..005 já existentes · breadcrumb é apenas 4 labels sem justificativa LLM · SEM `updateRisk` nem `addRiskManual` tRPC · dual-schema camelCase+snake_case tech debt · `hasSpecialRegimes`/`hasTaxTeam`/`hasAudit` são campos decorativos sem efeito · ver `CODIGO-ATUAL-VERDADE.md` |
| 2026-04-23 | Claude Code | **SPEC v3.1 DRAFT produzida** (branch `docs/m1-arquetipo-exploracao`, commit `78b7855`) · 3 camadas explícitas (AS-IS / Transitional / Target) · enum canônico decidido (`pendente/inconsistente/bloqueado/confirmado`) · 6 injection points do `STOP_IF_NOT_ELIGIBLE` declarados · companyProfile incluído nas origens · backlog M1.1 firme · ver `SPEC-v3.1-M1-PERFIL-ENTIDADE.md` + `.json` |
| 2026-04-23 | P.O. | **AMARELO POSITIVO** · aprovação condicional da v3.1 · 7 ajustes obrigatórios para rev1 (score=explicabilidade · justificativa não eleva · rename `acceptRisk`→`acknowledgeInconsistency` · injection E restrito a `archetype_required=true` · multi-CNPJ 2 níveis · marketplace+estoque backlog M1.1 firme · alinhamento mockup v4.1-rev1) · Rodada D autorizada após rev1 |
| 2026-04-23 | Claude Code | **SPEC v3.1-rev1 publicada** · commit `03ca41e` · 7 ajustes P.O. incorporados · §13 nova (PC-01..PC-06 com papéis gate/informativo/exploratório · GATE-04 materializa score≠gate) · `invokeLLM` com opt-in `archetype_required` · rename semântico preserva colunas físicas · Rodada D autorizada pendente consultor entregar APPROVED_SPEC hash-locked · ver `SPEC-v3.1-rev1-M1-PERFIL-ENTIDADE.md` + `.json` |
| 2026-04-23 | Claude Code | **F3 v1 — estrutura inicial pré-M1 criada** (branch NOVA `docs/pre-m1-exploracao`, commit `00e5013`) · 6 diretórios + 4 placeholders em `docs/epic-830-rag-arquetipo/` · sem PR (branch longa) · base para Epic #830 independente do trabalho em `docs/m1-arquetipo-exploracao` |
| 2026-04-23 | Claude Code | **F3 v2.1 — populate conteúdo crítico** · commit `1b245d0` em `docs/pre-m1-exploracao` (incremental sobre v1) · diretório `decisions/` adicionado · README com modelo dimensional (objeto/papel/relação/território/regime) + política de imutabilidade + governança · BLOCKERS-pre-m1.md populado com 8 BLOCKERS (docx+PDF) · CONTRATOS-ENTRE-MILESTONES.md (esqueleto M1→M2) · PENDING-DECISIONS.md (3 abertas + 2 consolidadas) · tag `pre-m1-estrutura-inicial` no novo HEAD · **issue #843** criada `[Docs] Pré-M1 Exploração — Epic #830` |
| 2026-04-23 | Claude Code | **GOV-PRE-M1 v1.0 formalizada** (branch `docs/gov-pre-m1-exploracao-governada`, commit `e63dba2`) · novo arquivo `docs/governance/GOV-PRE-M1-EXPLORACAO-GOVERNADA.md` (216 linhas) · 14 seções (quando aplicar, proibições, artefatos mínimos, sequência, gate GO/NO-GO, 6 regras obrigatórias, 5 tags de checkpoint, 8 antipadrões, exemplo Epic #830) · **PR #844 aberto** aguardando aprovação final |
| 2026-04-23 | Claude Code | **3 ajustes consultor em GOV-PRE-M1** · commit `6d9b7f5` no PR #844 · §8 nova regra 7 (contratos atualizados quando ADRs mudam modelo) · §8 nova regra 8 (versionamento base do modelo gerado na PRÉ-M1) · §11 novo 1º item (modelo canônico em ADR como critério de encerramento) · 8 regras totais em §8 · 6 itens em §11 · PR #844 continua aberto |

---

## 11. Validação da hipótese "arquétipo" (P.O., 2026-04-23)

### 11.1 A hipótese

O P.O. propõe que o problema central do RAG e de toda a plataforma é **ausência de estrutura determinística do negócio do cliente**. A hipótese é:

> Se extrairmos de cada empresa um **arquétipo** (conjunto estruturado de dimensões: natureza da operação, objetos econômicos, posição na cadeia, subnatureza setorial, papel operacional, territorialidade, regime, etc.), então o RAG e os motores a jusante (risk-categorizer, briefing, plano de ação) produzirão saídas corretas e auditáveis — eliminando a "inferência por adivinhação" que ocorre hoje.

### 11.2 Declaração do P.O. (verbatim)

> "não avançar até ter os testes simulando casos reais, o arquetipo é uma criação minha, uma necessidade para o rag. mas eu posso estar errado, vamos explorar testes, aguarde as instruções para os testes. Os testes precisam gerar o arquetipo, sem o arquetipo certo, não vamos continuar errando no rag, ou seja, em toda a plataforma."

### 11.3 Implicações imediatas

1. **Todo o plano M1 (A/B/C da Seção 9) está congelado** até a validação concluir
2. A hipótese precisa ser **falsificável** — precisa existir um cenário de teste que, se falhar, descarta o arquétipo como abstração
3. Os testes precisam **gerar o arquétipo** a partir de casos reais de empresas — não só validar o schema
4. O arquétipo só é "o correto" se casos reais produzirem saídas coerentes no RAG

### 11.4 O que o teste precisa demonstrar

Um teste é **aprovador da hipótese** se satisfizer todas as condições:

| # | Condição | Como medir |
|---|---|---|
| T1 | Caso real de empresa produz um arquétipo **determinístico** (mesmos inputs → mesmo arquétipo) | executar N vezes, comparar JSONs |
| T2 | O arquétipo gerado **bate com o julgamento de especialista** para aquele caso | comparar com gabarito manual |
| T3 | O arquétipo alimenta o RAG e a saída RAG é **correta** para aquele caso | comparar categorias/riscos produzidos com esperado |
| T4 | Casos **fronteiriços** (empresa híbrida, multi-setor, regime especial) produzem arquétipo coerente, não "genérico" | bateria específica de edge cases |
| T5 | O arquétipo **discrimina entre dois negócios parecidos** (ex: transportadora comum × transportadora de produtos perigosos) | par de casos com gabaritos diferentes |

Um teste é **refutador** se:
- Dois casos reais diferentes produzem arquétipo idêntico mas comportamento RAG diferente (arquétipo não carrega informação suficiente)
- Mesmo caso produz arquétipos inconsistentes (arquétipo é ambíguo)
- Arquétipo bate com gabarito mas RAG erra do mesmo jeito (arquétipo não é o gargalo)

### 11.5 O que estamos esperando do P.O.

Aguardamos do P.O.:

1. **Casos reais** (ou sintéticos realistas) a servir de entrada:
   - descrição do negócio (texto livre como usuário digitaria)
   - metadados conhecidos (CNPJ, porte, regime, etc.)
   - CNAE esperado (gabarito)
2. **Gabaritos** (arquétipo esperado + saídas RAG esperadas) de cada caso
3. **Instruções específicas** sobre como os testes devem rodar:
   - Fixtures em arquivo? tabela? JSON?
   - Onde ficam os arquivos de teste? (`tests/archetype-validation/`?)
   - Executados via Vitest? Script à parte?
   - Integração com LLM real (via `OPENAI_API_KEY`) ou mock?

### 11.6 Sugestão preliminar de estrutura de testes (a validar com P.O.)

**Proposta provisória** (aguarda instruções do P.O. para virar definição):

```
tests/archetype-validation/
├── fixtures/
│   ├── caso-01-transportadora-carga-simples.json
│   ├── caso-02-transportadora-produtos-perigosos.json
│   ├── caso-03-industria-farmaceutica.json
│   ├── caso-04-marketplace-b2c.json
│   ├── caso-05-clinica-medica.json
│   └── ... (N casos do P.O.)
├── gabaritos/
│   ├── caso-01-expected-archetype.json
│   ├── caso-01-expected-rag-output.json
│   └── ...
├── buildArchetype.test.ts         # T1, T2, T4, T5 — testa a geração
├── ragOutputFromArchetype.test.ts # T3 — testa o fluxo arquétipo → RAG
└── README.md                      # como rodar, como adicionar caso novo
```

**Por que essa estrutura (preliminar):**
- Separação fixture vs gabarito permite evoluir casos sem tocar código
- Vitest já é o runner do projeto (`pnpm test`)
- Integration test com LLM real exige `OPENAI_API_KEY` (convenção `testing.md`)
- README permite P.O. adicionar caso novo sem passar pelo Claude Code

### 11.7 O que NÃO pode acontecer

- ❌ Abrir PR de implementação do formulário novo antes dos testes passarem
- ❌ Tocar schema DB (`drizzle/`) antes dos testes passarem
- ❌ Mudar `risk-categorizer` antes dos testes passarem
- ❌ Rodar teste só com casos sintéticos gerados pelo Claude Code — tem que vir do P.O.
- ❌ Declarar "hipótese validada" sem refutador explícito testado

### 11.8 Próxima ação (Claude Code)

**Status:** AGUARDANDO instruções do P.O. sobre os testes.

Quando o P.O. enviar:
1. Claude Code revisa o conjunto de casos/gabaritos
2. Propõe estrutura final de fixtures
3. Implementa apenas a camada de **teste** (sem tocar em produção)
4. Roda a bateria
5. Relata: quantos passam T1–T5, onde refutam, onde validam

**Não há próximo passo de implementação M1 enquanto esta seção não fechar.**

---

## 12. Rodada 2 — Requisitos adicionais do P.O. (2026-04-23)

> Pacote de 7 requisitos enviados pelo P.O. após a Seção 11, refinando o escopo e a UX do arquétipo. Nenhum deles desbloqueia a validação — todos ficam subordinados à Seção 11.

### 12.1 KPI de cobertura — 95% dos casos blindados

**Requisito:** o arquétipo deve cobrir **95% dos casos reais**. Os 5% restantes precisam rota de escape (fallback / auditoria manual).

**Implicações operacionais:**
- Define **critério numérico de sucesso** da bateria de testes da Seção 11
- A bateria precisa ter **N ≥ 20 casos** para que 95% tenha significado estatístico (1 em 20 é o teto aceitável de falha)
- Casos que caem nos 5% precisam ser catalogados (não descartados) — viram input para evolução futura do arquétipo
- Saída do arquétipo precisa de estado `"inconclusivo"` ou `"fallback"` quando atinge borda — não só `valido`/`incompleto`

**Pergunta aberta (D7):** o que acontece com os 5% na UX? Bloqueia o usuário, libera com "baixa confiança", ou aciona revisão manual?

### 12.2 Fluxo E2E preservado

**Clarificação da restrição #2 (Seção 1):** "sem alteração no fluxo" refere-se ao **fluxo E2E**, não à UX interna do formulário.

Fluxo preservado:
```
NovoProjeto → Form → CNAE (LLM+RAG) → Questionário → Briefing → Matriz → Plano
```

**O que muda:** apenas os campos dentro do Form + experiência visual do preenchimento. Nenhuma etapa E2E nova, nenhuma removida.

### 12.3 UX on-the-fly (progressive disclosure inline) — o grande desafio

**Modelo mental do padrão atual** (confirmado pelo P.O. 2026-04-23):

> Os campos NCM e NBS só aparecem se o usuário escolher **serviço OU produto OU misto**.

**Implementação atual** (já em `PerfilEmpresaIntelligente.tsx`):

| Linha | Condição técnica | Modelo mental | Efeito |
|---|---|---|---|
| 1005 | `operationType ∈ {industria, comercio, misto, agronegocio}` | "tem produto" | Revela bloco NCM |
| 1111 | `operationType ∈ {servicos, misto, financeiro}` | "tem serviço" | Revela bloco NBS |

Na prática: **se o tipo de operação envolve produto → NCM aparece; se envolve serviço → NBS aparece; misto → ambos aparecem.** O detalhe `industria/comercio/agronegocio` são subtipos de "tem produto"; `servicos/financeiro` são subtipos de "tem serviço".

Isso é **2 blocos condicionais** seguindo o modelo "produto/serviço/misto". M1 escala esse mesmo padrão para **N contextos setoriais e territoriais**.

**Meta M1 — gatilhos que revelam blocos novos:**

| Gatilho | Bloco revelado |
|---|---|
| `territorio_incentivado = ZFM` | Campos específicos ZFM (regime monofásico, Suframa, tipo de mercadoria incentivada) |
| `territorio_incentivado = ALC` | Campos Área de Livre Comércio |
| `setor = Saúde` | Subnatureza (clínica/hospital/lab/...) + órgão regulador (ANVISA/ANS) |
| `setor = Financeiro` | Subnatureza (banco/fintech/IP/SCD/seguradora) + órgão (BACEN/SUSEP) |
| `setor = Combustíveis` | Subnatureza (refinaria/distribuidora/revendedora) + ANP |
| `setor = Transporte` | Tipo de carga (geral/perigosos/passageiros) + ANAC/ANTT |
| `setor = Agro` | Subnatureza (produtor/agroindústria/cooperativa) + MAPA |
| `setor = Aviação` | Subnatureza (passageiros/carga/manutenção) + ANAC |
| `importa OR exporta = sim` | Papel no comércio exterior + tipo de operação |
| `multiEstado = sim` | Filial em outra UF + estrutura operacional |
| `regime_especial = sim` | Tipo de regime especial (multi) |
| `integra_grupo + não_unico_cnpj` | **BLOQUEIO** multi-CNPJ |

**Consequência de engenharia:** a matriz acima tem ~12+ gatilhos independentes, com **combinações possíveis**. If-spaghetti inline no JSX é inviável — precisa de **registro declarativo** (JSON/TS) lido por uma função de render.

**Proposta provisória (a validar pós-testes):**

```ts
// shared/archetype-disclosure-rules.ts
type DisclosureRule = {
  id: string;
  trigger: (state: Partial<Archetype>) => boolean;
  fields: FieldDef[];  // campos a revelar
  blocker?: boolean;   // se true, bloqueia avanço quando ativo
};

const rules: DisclosureRule[] = [
  { id: "bloco_ncm", trigger: (s) => hasIntersection(s.tipo_objeto_economico, ["bens", "combustiveis", "saude_medicamentos"]), fields: [...] },
  { id: "bloco_zfm", trigger: (s) => s.territorio_incentivado === "ZFM", fields: [...] },
  ...
];
```

Vantagem: mesma fonte alimenta (a) render condicional no front, (b) validação server-side, (c) teste declarativo de cada regra.

### 12.4 Exploração contínua de testes

Reforça Seção 11. P.O. enviará casos; Claude Code aguarda.

### 12.5 Diff de campos — entradas e saídas (revisitar após testes)

**O que ENTRA** (consolidado da spec):
- Natureza da operação (multi)
- Operações secundárias
- Fontes de receita (multi)
- Tipo de objeto econômico (multi)
- Posição na cadeia econômica
- Possui bens? / Possui serviços? (gatilhos)
- Abrangência operacional (multi)
- UF principal
- Papel no comércio exterior
- Território incentivado + tipo
- Regime especial + tipo
- Setor regulado + órgão + subnatureza + papel + tipo de operação específica
- Nível da análise (CNPJ único / estabelecimento único)

**O que SAI do arquétipo (vai para "fase 2" ou deleção):**
- paymentMethods
- hasIntermediaries
- taxCentralization
- hasTaxTeam
- hasAudit
- hasTaxIssues

**A revalidar após testes da Seção 11:** quais destes "o que entra" são de fato **discriminantes** para o RAG? Testes podem indicar que alguns são ruído.

### 12.6 Catálogo de setores com campos especiais (a completar com P.O.)

**Candidatos iniciais** (da spec do P.O. + exploração):

| Setor | Subnatureza | Órgão regulador | Papel operacional típico |
|---|---|---|---|
| Saúde | Clínica, Hospital, Laboratório, Farmácia, Operadora, Diagnóstico | ANVISA, ANS | Prestador, Operadora |
| Financeiro | Banco, Fintech, Instituição de pagamento, SCD, Seguradora, Administradora | BACEN, SUSEP, CVM | Intermediador, Operadora |
| Combustíveis | Refinaria, Distribuidora, Revendedora, Transportadora, Armazenadora | ANP | Produtor, Distribuidor, Varejista |
| Transporte | Carga, Passageiros, Produtos perigosos, Internacional, Logística integrada | ANAC, ANTT | Transportador |
| Agro | Produtor rural, Agroindústria, Cerealista, Trading, Cooperativa | MAPA | Produtor, Distribuidor |
| Aviação | Passageiros, Carga, Manutenção, Táxi aéreo, Escola | ANAC | Prestador |
| Telecom | Operadora fixa/móvel, provedor, SVA | ANATEL | Operadora |
| Energia | Geradora, Distribuidora, Comercializadora | ANEEL | Produtor, Distribuidor |
| Educação | EaD, Presencial, Corporativa | MEC | Prestador |
| Construção | Incorporadora, Construtora, Empreiteira | CAU/CREA | Prestador, Produtor |
| Tecnologia | SaaS, PaaS, IaaS, Marketplace | — | Prestador, Intermediador |

**Territórios especiais** (ortogonal a setor):
- Zona Franca de Manaus (ZFM) — Suframa
- Área de Livre Comércio (ALC)
- Amazônia Ocidental
- Zona de Processamento de Exportação (ZPE)
- Outros (a catalogar com P.O.)

**Pergunta aberta (D8):** esse catálogo é completo ou faltam setores? P.O. precisa fechar a lista antes do F1.

**Pergunta aberta (D9):** setor × território formam **produto cartesiano** (uma empresa de saúde em ZFM precisa dos dois conjuntos de campos)?

### 12.7 UX anti-abandono — regra de produto

**Princípio:** se o usuário desiste de preencher, não há arquétipo. Sem arquétipo, sem produto.

**Regras operacionais derivadas:**

| Regra | Implementação |
|---|---|
| Máximo de campos fechados | chips, radio, select, autocomplete — nunca texto livre obrigatório |
| Texto livre só como apoio | descrição do negócio é única exceção e não-estrutural |
| Exibição progressiva | só mostra o que for relevante ao contexto atual |
| Micro-etapas digeríveis | agrupar em blocos pequenos, revelar um por vez |
| Painel lateral "arquétipo em construção" | feedback contínuo de progresso — motivacional |
| Microcopy curta e não-jurídica | evitar jargão fiscal |
| Defaults inteligentes | CNAE já sugere CNAE; aproveitar para sugerir setor, regime, etc. |
| Salvamento contínuo (auto-save) | usuário não perde progresso se sair |

**Métrica de produto a instrumentar** (fora do escopo M1, mas a registrar):
- **Taxa de conclusão do formulário** (abandono = perda de produto)
- **Tempo médio de preenchimento**
- **Campo mais abandonado** (heatmap de frustração)

**Implicação cross-frente:**
- UX → não pode ter 40 campos visíveis de uma vez (viola 12.7)
- Regras → precisa motor declarativo escalável (12.3)
- Testes → precisam incluir métrica de "carga cognitiva" (número de campos ativos no estado final)

---

## 13. Decisões em aberto — atualizadas após rodadas 1+2

| # | Pergunta | Origem | Status |
|---|---|---|---|
| D1 | Shape: 3 JSONs reshaped OU 1 coluna `archetypeProfile`? | Rodada 1 | aberto |
| D2 | Threshold 85% literal OU recalibrar pós-UAT? | Rodada 1 | aberto |
| D3 | Campos fase-2: deletar OU mover p/ tabela separada? | Rodada 1 | aberto |
| D4 | M1 é Etapa 1 Epic RAG OU standalone? | Rodada 1 | aberto |
| D5 | Lista canônica de campos é final? | Rodada 1 | aberto |
| D6 | Campos novos exigem CNAE antes OU valem sempre? | Rodada 1 | aberto |
| **D7** | O que acontece com os 5% não-cobertos na UX? (bloqueia / libera com flag / revisão manual) | **Rodada 2 §12.1** | **aberto** |
| **D8** | Catálogo de setores especiais (§12.6) está completo? | **Rodada 2 §12.6** | **aberto** |
| **D9** | Setor × Território formam produto cartesiano? (saúde em ZFM → soma campos) | **Rodada 2 §12.6** | **aberto** |

---

## 14. O que mudou no entendimento anterior (registro de correções)

| Antes eu disse... | Correção |
|---|---|
| "Sem wizard de 8 telas — mantém formulário em 1 tela" (Seção 1 restrição #2) | **Correto.** Mas **a UX dentro do form muda** com progressive disclosure on-the-fly |
| "Elimina necessidade de rule engine" (Análise pós-clarificações) | **Incorreto.** Rule engine declarativo é necessário para escalar o padrão atual (2 blocos) para N contextos setoriais+territoriais (~12+ gatilhos) |
| "Regras condicionais são spaghetti de ifs no componente" (risco citado) | **Reforçado.** Rule engine declarativo é mandatório para viabilizar 12.7 (anti-abandono) sem código explodir |
| "6 regras hard só na Revisão, não no form" (P6) | **Parcialmente correto.** Bloqueios cruzados ficam na Revisão; mas sinalização durante preenchimento é necessária (12.7) para evitar frustração |
