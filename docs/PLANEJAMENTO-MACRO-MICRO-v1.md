# TABELA DE PLANEJAMENTO — IA SOLARIS
## Requisito de Negócio × Épico × Sprint × Milestone × Issue × Onda
## Versão 1.0 — 2026-03-27
## Visão macro → micro — do problema do advogado ao commit no GitHub

---

## LEITURA DESTA TABELA

**Macro → Micro:**
```
Requisito de Negócio (o que o advogado precisa)
  └── Épico (agrupamento de entrega)
        └── Sprint (fase de implementação)
              └── Milestone (marco de controle)
                    └── Issue GitHub (unidade de trabalho rastreável)
                          └── Onda (origem da pergunta no questionário)
```

---

## PARTE 1 — AS 3 ONDAS: REQUISITO DE NEGÓCIO

| Onda | Requisito de Negócio | Fonte | Quem cria | Status |
|---|---|---|---|---|
| **1ª** | O advogado precisa que perguntas curadas pelo escritório apareçam no questionário — riscos operacionais que não estão na lei (ex: "cadastro NCM atualizado?") | `solaris` | Equipe jurídica SOLARIS — revisadas por advogado sênior antes de publicar | ❌ Não implementada |
| **2ª** | O advogado precisa que empresas com perfis diferentes recebam perguntas diferentes — a IA combina parâmetros do perfil para gerar perguntas específicas | `ia_gen` | IA combina: regime + porte + CNAE + exportação + contrata Simples | ❌ Não implementada |
| **3ª** | O advogado precisa que a legislação tributária seja coberta — LC 214, LC 224, EC 132 e outras leis geram as perguntas regulatórias | `regulatorio` | RAG — busca nos chunks legislativos | ✅ Já existe |

---

## PARTE 2 — MATRIZ COMPLETA: MACRO → MICRO

### ONDA 1 — Perguntas curadas pela equipe SOLARIS

| Nível | Item | Descrição | Status |
|---|---|---|---|
| **Requisito** | RN-01 | O advogado sênior precisa adicionar perguntas próprias do escritório ao questionário — sem programação | ❌ |
| **Requisito** | RN-02 | As perguntas do escritório devem aparecer primeiro no questionário, antes das regulatórias | ❌ |
| **Requisito** | RN-03 | O advogado deve saber quais perguntas são do escritório (badge visual) | ❌ |
| **Épico** | E5 | Upload CSV SOLARIS: infraestrutura + tela admin | ✅🔧 Backend OK / ❌ UI |
| **Épico** | E6 | Questionário 3 Ondas: pipeline Onda 1 + badge visual | ❌ |
| **Milestone** | M2 | Sprint K: Questionário 3 Ondas | Aberto |
| **Milestone** | M3 | Sprint L: Upload CSV SOLARIS | Aberto |
| **Sprint** | K-1 | Criar tabela `solarisQuestions` no banco | ❌ A fazer |
| **Sprint** | K-2 | Pipeline Onda 1 no `questionEngine` | ❌ A fazer |
| **Sprint** | K-3 | Badge visual "Equipe Jurídica SOLARIS" no questionário | ❌ A fazer — **P.O. valida** |
| **Sprint** | L-1 | Tela de upload CSV em `/admin/solaris-questions` | ❌ A fazer — **P.O. valida** |
| **Sprint** | L-2 | Template CSV + documentação para equipe jurídica | ❌ A fazer |
| **Issue** | K-1 | `K-1: Criar tabela solarisQuestions no banco` | A criar |
| **Issue** | K-2 | `K-2: Pipeline Onda 1 no questionEngine` | A criar |
| **Issue** | K-3 🔴 | `K-3: Badge visual por onda no questionário` — **p.o.-valida** | A criar |
| **Issue** | L-1 🔴 | `L-1: Tela de upload CSV SOLARIS no painel admin` — **p.o.-valida** | A criar |
| **Issue** | L-2 | `L-2: Template CSV e documentação` | A criar |

**Critério de aceite do P.O. — Onda 1:**
> "Funcionou quando: faço upload de um CSV com 3 perguntas do escritório, crio um projeto de empresa atacadista, e vejo essas perguntas com badge azul 'Equipe Jurídica SOLARIS' aparecendo antes das perguntas de legislação."

---

### ONDA 2 — Perguntas geradas pela IA com base no perfil

| Nível | Item | Descrição | Status |
|---|---|---|---|
| **Requisito** | RN-04 | Empresa com Lucro Presumido + exportação + contrata Simples deve receber perguntas que empresa Simples Nacional sem exportação não recebe | ❌ |
| **Requisito** | RN-05 | As perguntas combinatórias devem ser identificadas como geradas pelo perfil (badge laranja) | ❌ |
| **Épico** | E6 | Questionário 3 Ondas: Onda 2 combinatória | ❌ |
| **Milestone** | M2 | Sprint K: Questionário 3 Ondas | Aberto |
| **Sprint** | K-4 | Onda 2 — lógica combinatória por parâmetros de perfil | ❌ A fazer — **P.O. valida** |
| **Issue** | K-4 🔴 | `K-4: Onda 2 — perguntas combinatórias por perfil (ia_gen)` — **p.o.-valida** | A criar |

**Parâmetros combinatórios (a implementar):**

| Combinação | Pergunta gerada | Não aparece para |
|---|---|---|
| Lucro Presumido + exportação + contrata Simples | "Como está o creditamento CBS na cadeia exportadora com prestadores do Simples?" | Simples Nacional sem exportação |
| Lucro Real + operação interestadual | "Qual o impacto do diferencial de alíquota IBS nas suas operações interestaduais?" | Empresa apenas local |
| Qualquer regime + CNAE alimentício + cesta básica | "Seus produtos estão corretamente classificados no Anexo I da LC 214 (alíquota zero)?" | Empresa de serviços |
| Qualquer regime + contrata MEI/Simples | "Como será o tratamento CBS dos serviços de prestadores do Simples Nacional?" | Sem prestadores Simples |
| Médio/Grande porte + ativo fixo relevante | "Está prevista a exclusão de bens do ativo imobilizado do regime de crédito IBS/CBS?" | Micro/pequena sem ativo |

**Critério de aceite do P.O. — Onda 2:**
> "Funcionou quando: crio projeto A (Lucro Presumido + exportação + Simples) e projeto B (Simples Nacional + sem exportação). Os questionários são diferentes — projeto A tem perguntas com badge laranja 'Perfil da empresa' que projeto B não tem."

---

### ONDA 3 — Perguntas regulatórias via RAG (já implementada)

| Nível | Item | Descrição | Status |
|---|---|---|---|
| **Requisito** | RN-06 | O questionário deve cobrir os artigos das leis tributárias relevantes para o CNAE da empresa | ✅ |
| **Requisito** | RN-07 | EC 132, LC 214, LC 224, LC 227 devem gerar perguntas específicas | ✅ |
| **Épico** | E1 | Corpus RAG — 2.078 chunks, 100% anchor_id | ✅ |
| **Épico** | E2 | Labels e retrieval corretos | ✅ |
| **Épico** | E3 | Qualidade do diagnóstico — RAG por área, perfil injetado | ✅ |
| **Milestone** | M1 | UAT Round 1 — fechado | ✅ Fechado |
| **Sprint** | A | G1, G2, G5, G6 — labels e corpus | ✅ PR #105 |
| **Sprint** | B | G7, G8 — RAG por área + companyProfile | ✅ PR #106 |
| **Sprint** | C | G9, G10 — schema Zod obrigatório | ✅ PR #108 |
| **Sprint** | D | G3, G4 — EC 132 + Anexos LC 214 | ✅ PR #109 |
| **Sprint** | E | G11 — fonte_risco_tipo | ✅ PR #110 |
| **Sprint** | H | Sprint H — retrieval cross-lei | ✅ corpus |
| **Sprint** | J | G15-schema — campos rastreabilidade | ✅ PR #142 |

**Critério de aceite P.O. — Onda 3:**
> "O diagnóstico cita artigos específicos da LC 214, EC 132 e LC 224 como evidências. Cada risco tem referência legal rastreável."

---

## PARTE 3 — VISÃO CONSOLIDADA: ÉPICO × MILESTONE × ISSUES × ONDAS

| Épico | Milestone | Issues | Onda relacionada | P.O. valida? | Status |
|---|---|---|---|---|---|
| E1 — Corpus RAG | M1 (fechado) | — histórico | 3ª | ❌ (técnico) | ✅ |
| E2 — Labels/retrieval | M1 (fechado) | — histórico | 3ª | ❌ (técnico) | ✅ |
| E3 — Qualidade diagnóstico | M1 (fechado) | — histórico | 3ª | ✅ nos testes UAT | ✅ |
| E4 — UX advogados | M1 (fechado) | — histórico | — | ✅ nos testes UAT | ✅ |
| E5 — Upload SOLARIS | M3 (Sprint L) | E5, L-1🔴, L-2 | 1ª | ✅ L-1 obrigatório | ✅🔧 |
| E6 — 3 Ondas | M2 (Sprint K) | E6, K-1, K-2, K-3🔴, K-4🔴 | 1ª + 2ª | ✅ K-3 e K-4 obrigatórios | ❌ |

**Legenda:** 🔴 = issue com label `p.o.-valida` — não avança sem aprovação do P.O.

---

## PARTE 4 — ROADMAP VISUAL

```
PASSADO ──────────────────────────────────────────────────────► FUTURO

M1 — UAT Round 1 (fechado)
│
├── E1 Corpus RAG ✅
├── E2 Labels ✅
├── E3 Qualidade ✅
└── E4 UX ✅

M2 — Sprint K: 3 Ondas (aberto — meta: 01/04/2026)
│
├── K-1: banco solarisQuestions ────────────► Técnico
├── K-2: pipeline Onda 1 ───────────────────► Técnico
├── K-3: badge visual 🔴 ───────────────────► P.O. VALIDA → K-4
└── K-4: Onda 2 combinatória 🔴 ────────────► P.O. VALIDA → UAT

M3 — Sprint L: Upload CSV (aberto — meta: 01/04/2026)
│
├── L-1: tela upload admin 🔴 ──────────────► P.O. VALIDA → L-2
└── L-2: documentação ──────────────────────► Técnico

M4 — Modo new (bloqueado — aguarda M2 + M3 + UAT aprovado)
│
├── Issue #56 — F-04 Fase 3
├── Issue #61 — modo new
├── Issue #62 — DROP COLUMN
└── Issues #99, #101 — débito técnico
```

---

## PARTE 5 — TABELA DE RASTREABILIDADE ATUALIZADA

| # | Requisito de Negócio | Onda | Épico | Milestone | Issue | Sprint | PR | Status |
|---|---|---|---|---|---|---|---|---|
| RN-01 | Advogado adiciona perguntas do escritório via CSV | 1ª | E5 | M3 | L-1 🔴 | Sprint L | — | ❌ |
| RN-02 | Perguntas SOLARIS aparecem primeiro no questionário | 1ª | E6 | M2 | K-2 | Sprint K | — | ❌ |
| RN-03 | Badge visual identifica origem das perguntas | 1ª + 2ª | E6 | M2 | K-3 🔴 | Sprint K | — | ❌ |
| RN-04 | Perfis diferentes geram questionários diferentes | 2ª | E6 | M2 | K-4 🔴 | Sprint K | — | ❌ |
| RN-05 | Badge laranja para perguntas combinatórias | 2ª | E6 | M2 | K-4 🔴 | Sprint K | — | ❌ |
| RN-06 | Cobertura legislativa via RAG | 3ª | E1-E3 | M1 | — | A-J | #105–#142 | ✅ |
| RN-07 | Evidência regulatória rastreável por risco | 3ª | E3 | M1 | — | C, E, J | #108, #110, #142 | ✅ |
| RN-08 | Briefing personalizado por perfil da empresa | — | E3 | M1 | — | B | #106 | ✅ |
| RN-09 | Riscos distintos por área jurídica | — | E3 | M1 | — | B | #106 | ✅ |
| RN-10 | Labels legais corretos nos diagnósticos | — | E2 | M1 | — | A | #105 | ✅ |
| RN-11 | Sem placeholders visíveis ao advogado | — | E4 | M1 | — | H | #134 | ✅ |
| RN-12 | Label "Contabilidade e Fiscal" | — | E4 | M1 | — | H | #134 | ✅ |

---

## PARTE 6 — O QUE O P.O. PRECISA APROVAR ANTES DO UAT ROUND 2

```
[ ] K-3: vejo as perguntas com badge de origem no questionário — APROVADO
[ ] K-4: dois projetos com perfis diferentes têm questionários diferentes — APROVADO
[ ] L-1: fiz upload de CSV e as questões aparecem no questionário — APROVADO

Apenas com os 3 itens marcados: agendar UAT Round 2 com advogados.
```

---

*Tabela de Planejamento v1.0 — IA SOLARIS — 2026-03-27*
*Framework de Comunicação P.O. + Orquestrador v1.0 aplicado*
*Visão macro (requisito de negócio) → micro (issue GitHub + onda)*
