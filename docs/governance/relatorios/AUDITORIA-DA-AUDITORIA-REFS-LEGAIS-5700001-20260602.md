# Auditoria-da-auditoria — Referências Legais 5700001 v2.00

**Data:** 2026-06-02 · **Objeto auditado:** `Auditoria Determinística — Referências Legais dos Planos de Ação (1).md` (Manus AI v2.00)
**Identidade:** arquivo SHA-256 `1b30fc0d4aeb3be88ae5d7de1eea7a1c56b8e79cf62aa43678e62861fc981a88` (`(1)` é re-download — byte-idêntico ao original entregue às 16:38)
**Metodologia auditor:** REGRA-ORQ-22 (3 níveis) + Lição #93 (mecanismo verificado) aplicadas ao relatório Manus
**Resultado em uma frase:** Substância técnica correta; inconsistência aritmética bloqueante na contagem total; transparência metodológica precisa ajustes

---

## Sumário do veredicto

| Item | Veredicto |
|---|---|
| Metodologia declarada (pdftotext + grep + sed) | 🟢 Modelar — determinística e reproduzível |
| Identidade dos 29 artigos individualmente auditados na tabela | 🟢 100% existem nos PDFs e batem com contexto |
| **Aritmética interna (29 vs 36)** | 🔴 **INCONSISTENTE — não-reconciliada** |
| Score 89.7% derivado | 🔴 Depende da base (29 ou 36) — discrepância afeta valor declarado |
| Cobertura de ranges como auditados | 🔴 Amostragem endpoints declarada como completa |
| Reprodutibilidade (hash dos PDFs) | 🟡 Faltante |
| Recomendação Seção 7.1 (primary/context) | 🟢 Útil — backlog Sprint 5 candidato |

---

## Seção 1 — Auditoria empírica das afirmações

### V1 — Identidade dos arquivos auditados

```bash
$ sha256sum "Auditoria Determinística..."*
1b30fc0d4aeb3be88ae5d7de1eea7a1c56b8e79cf62aa43678e62861fc981a88  *<arquivo>.md
1b30fc0d4aeb3be88ae5d7de1eea7a1c56b8e79cf62aa43678e62861fc981a88  *<arquivo (1)>.md

$ diff <arquivo>.md <arquivo (1)>.md   # 0 bytes de diff
```

**Confirmado:** `(1)` é re-download. Análise prévia (turno anterior) aplicável.

### V2 — Cada artigo individual da tabela existe (validação por categoria type + PR #1333)

Manus auditou 6 categorias × N artigos = 36 linhas nas tabelas individuais (Seção 4):

| Plano | Tabela linhas | Categorias batem com `Categoria` type? |
|---|---|---|
| 4.1 Transição ISS/IBS | 4 | ✅ `transicao_iss_ibs` |
| 4.2 Regime Diferenciado | 5 | ✅ `regime_diferenciado` |
| 4.3 Split Payment | 8 | ✅ `split_payment` |
| 4.4 Obrigação Acessória | 8 | ✅ `obrigacao_acessoria` |
| 4.5 Inscrição Cadastral | 5 | ✅ `inscricao_cadastral` |
| 4.6 Confissão Automática | 6 | ✅ `confissao_automatica` |

**6/6 categorias batem com `Categoria` type em `risk-engine-v4.ts:27-37`.** Coerência semântica preservada.

### V3 — Output em produção confirma fix PR #1333 (Opção D) em runtime

| Plano | Manus reporta | Esperado pós-PR #1333 |
|---|---|---|
| Transição ISS/IBS | `"Arts. 596-598 Resolução CGIBS"` | ✅ Range CONSECUTIVO real (596,597,598) → range compacto preservado |
| Regime Diferenciado | `"Arts. 200, 201, 203, 245 Decreto"` | ✅ Conjunto DISCRETO (200,201,203,245 — falta 202) → lista por vírgulas |
| Split Payment | `"Arts. 28-37 Decreto"` + `"Arts. 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 593, 594, 595 Resolução"` | ✅ Range consecutivo 28-37 + lista discreta com salto até 593-595 |
| Obrigação Acessória | `"Arts. 112-115 Decreto"` + `"Arts. 112, 113, 114, 115, 575, 576, 577, 578, 579, 580, 581 Resolução"` | ✅ Mesmo padrão dual |

**PR #1333 Opção D confirmado funcional em produção** — auditoria entrega esta validação cruzada (não explicitada).

---

## Seção 2 — 🔴 Nível 1 — Bloqueante: aritmética não reconcilia

### N1.1 — Total declarado **29** ≠ soma das tabelas **36**

Manus declara em 3 lugares:
- Seção 2 (Resumo Executivo): "Total de referências auditadas | **29**"
- Seção 6.1 (Matriz consolidação): "TOTAL | **29** [^1]"
- Seção 9 (Conclusão): "Total de referências auditadas | **29**"

**Mas a soma literal das 6 tabelas individuais (Seção 4) é:**

```
4.1 Transição:       4 linhas
4.2 Regime Dif:      5 linhas
4.3 Split Payment:   8 linhas
4.4 Obrig Acess:     8 linhas
4.5 Inscrição:       5 linhas
4.6 Confissão:       6 linhas
                    ──
SOMA:               36 linhas
```

**Discrepância: 36 − 29 = 7 referências.**

Footnote `[^1]` em Seção 6.1 diz:
> "Contagem considera artigos distintos por documento. Arts. 596-598 contados como 3 referências individuais."

**Footnote NÃO explica os 7 não-reconciliados** — apenas confirma que ranges foram expandidos (596-598 = 3 entries, não 1).

**Hipóteses de reconciliação (todas testadas):**

| Hipótese | Cálculo | Resultado | Bate? |
|---|---|---|---|
| Deduplicação Art. 1 Portaria (citado 3×) | 36 − 2 = 34 | 34 | ❌ |
| Deduplicar Art. 1 + Arts. 112+115 (Dec/CGIBS duplicado) | 36 − 2 − 2 = 32 | 32 | ❌ |
| Idem + Arts. 28+37 (Dec/CGIBS) | 36 − 2 − 2 − 2 = 30 | 30 | ❌ |
| Idem + Arts. 104+110 (Dec/CGIBS) + Arts. 44+46 (Dec/CGIBS) | 36 − 2 − 2 − 2 − 2 − 2 = 26 | 26 | ❌ |

**Nenhuma combinação resulta em 29.** Inconsistência interna não-resolvida.

### N1.2 — Score 89.7% depende da base

```
Se base = 29: 26/29 = 89.66% ≈ 89.7%  ← valor declarado
Se base = 36: 26/36 = 72.22%          ← se tabelas individuais forem a verdade
```

**Diferença de 17 pontos percentuais** entre os dois cálculos. Para um produto cuja meta de confiabilidade é 98% (REGRA-ORQ-31), 17 pp é material.

**Bloqueante:** P.O. ou auditor externo NÃO pode reproduzir o score 89.7% sem premissas não-declaradas.

### N1.3 — Amostragem em ranges declarada como auditoria completa

**Para `"Arts. 28-37 Decreto"`** (Plano 4.3 Split Payment):
- Tabela auditou apenas: `Art. 28 Decreto` + `Art. 37 Decreto` (= 2 endpoints)
- Range cita: Arts. 28, 29, 30, 31, 32, 33, 34, 35, 36, 37 (= **10 artigos**)
- **8 artigos intermediários NÃO foram individualmente verificados via `grep -n "^Art\. <N>\." <arquivo.txt>`**

**Padrão similar:**
| Plano | Range declarado | Artigos individuais | Auditados | Não-amostrados |
|---|---|---|---|---|
| 4.3 | `Arts. 28-37 Decreto` | 10 | 2 (28, 37) | 8 (29-36) |
| 4.3 | `Arts. 28-37 CGIBS` | 10 | 2 (28, 37) | 8 (29-36) |
| 4.3 | `Arts. 593-595 CGIBS` | 3 | 2 (593, 595) | 1 (594) |
| 4.4 | `Arts. 112-115 Dec` | 4 | 2 (112, 115) | 2 (113, 114) |
| 4.4 | `Arts. 112-115 CGIBS` | 4 | 2 (112, 115) | 2 (113, 114) |
| 4.4 | `Arts. 575-581 CGIBS` | 7 | 2 (575, 581) | 5 (576-580) |
| 4.5 | `Arts. 104-110 Dec` | 7 | 2 (104, 110) | 5 (105-109) |
| 4.5 | `Arts. 104-110 CGIBS` | 7 | 2 (104, 110) | 5 (105-109) |
| 4.6 | `Arts. 44-46 CGIBS` | 3 | 2 (44, 46) | 1 (45) |

**Total não-amostrado:** 8+8+1+2+2+5+5+5+1 = **37 artigos** dentro de ranges declarados como auditados.

**Problema:** auditoria declara "29 referências auditadas" mas se considerarmos cada artigo individualmente em ranges, são **29 + 37 = 66 artigos cobertos pelos planos**. Auditoria amostrou endpoints (~44% dos artigos em range).

Não é falha grave — endpoints + amostra individual capturam estrutura. Mas a **declaração de cobertura precisa ser explícita**:
- ✅ "29 referências auditadas literalmente (amostra) + ~37 artigos intermediários inferidos por extensão de range" — honesto
- ❌ "29 referências auditadas — cobertura documental 100%" — esconde a amostragem

---

## Seção 3 — 🟡 Nível 2 — Design (3 itens)

### N2.1 — "Parcialmente impreciso" tratado como erro no score 89.7%

Definição de Manus (Seção 8.2):
> "Parcialmente impreciso: artigo existe E pertence ao mesmo Título/tema geral, MAS não trata diretamente do risco específico"

Os 3 casos (Arts. 201, 203, 245 Decreto em `regime_diferenciado`) pertencem ao **mesmo Título V** do Decreto ("Dos Regimes Diferenciados da CBS"). **Não são erros** — são contexto procedimental.

Score honesto deveria distinguir 3 categorias:

| Categoria | Quantidade | % |
|---|---|---|
| ✅ Primário (trata diretamente do risco) | 26 | 89.7% |
| 🔵 Contextual (mesmo Título, procedural) | 3 | 10.3% |
| ❌ Erro (fora do tema OU inexistente) | 0 | 0% |

Score "0% de erros" comunica corretamente. Score "89.7% corretas" implicitamente trata os 3 contextuais como erros (deixa 10.3% como "imprecisão" que soa próximo de erro).

### N2.2 — Hash dos 4 PDFs não declarado (Lição #71 + #93)

Manus cita "Cobertura documental 100% (4/4 PDFs)" mas **não declara SHA-256 ou versão dos PDFs**:

```
| LC 214/2025                  | Lcp214.pdf                    | ~5.200 linhas |
| Decreto 12.955/2026          | decreto--129555--d12955.pdf   | 15.673 linhas |
| Resolução CGIBS 6/2026       | resolucao-cgibs-6-*.pdf       | 17.917 linhas |
| Portaria MF/CGIBS 7/2026     | portaria-mf-cgibs-7.pdf       | 175 linhas |
```

**Problema:** se um PDF for re-baixado de fonte oficial com atualização (errata, retificação), as **linhas de cada artigo mudam** — todas as referências `linha 4028` do Art. 342 LC se tornam inválidas.

**Reprodutibilidade comprometida.** Lição #71 (scripts DoD commitados) + Lição #93 — hash documenta versão imutável.

**Backlog recomendado:**
```bash
sha256sum *.pdf >> auditoria_pdfs.lock
```

### N2.3 — PR #1333 (BUG-RAG-ARTIGO-RANGE Opção D) não citado na metodologia

A auditoria valida implicitamente PR #1333:
- "Arts. 200, 201, 203, 245" — lista discreta (Opção D ativa)
- "Arts. 596-598" — range consecutivo preservado

Mas a Seção 8 (Metodologia) não menciona que esse formato é **resultado de fix recente** (PR #1333 mergeado em 2026-06-01). Leitor não sabe que o formato "lista discreta" é novo — pode achar que sempre foi assim.

**Pequena melhoria:** Seção 8 poderia incluir nota:
> "Formato dos ranges (consecutivos compactos `Arts. 596-598` vs discretos por vírgula `Arts. 200, 201, 203, 245`) é resultado de fix PR #1333 (Sprint 4 — Opção D `formatArticleRange`). Esta auditoria implicitamente valida que o fix está em produção."

---

## Seção 4 — 🟢 Nível 3 — Observações (3 itens)

### N3.1 — "v2.00" sem changelog vs v1.00

Manus declara "Versão: 2.00" mas não cita o que mudou vs v1.00. Inferência razoável: v2.00 ampliou para 4 PDFs (Portaria foi adicionada). Mas não está documentado.

**Backlog:** changelog explícito ajuda terceiros entenderem evolução.

### N3.2 — Recomendação Seção 7.1 (`primary` + `context` references) merece ADR

A proposta de Manus:
```
primary_references:  Art. 126 LC + Art. 200 Decreto
context_references:  Arts. 201, 203, 245 Decreto
```

Implementar isso significa:
- Mudar schema de `action_plans.artigo` (string) para `risco.primary_articles[] + risco.context_articles[]` (arrays)
- OU adicionar coluna `primary` em `risk_categories.normative_bundle`
- Mudança estrutural Classe B-C

**Recomendação:** se P.O. aprovar, criar ADR-0033 (proposta) — refactor de schema de citação legal. Não é fix de bug — é melhoria de produto.

### N3.3 — Universo dos 6 planos não declarado

Auditoria fala "6 planos de ação gerados pela engine v4 para o projeto 5700001". Não confirma se 6 é o **total** ou **amostra**.

**Hipótese provável:** 6 = todos os planos do projeto (auditoria 5640001 anterior também mostrou 6 planos). Mas seria útil declarar:
> "Universo: 6 planos = 100% dos planos ativos do projeto 5700001 em 02/06/2026 (validar com `SELECT COUNT(*) FROM action_plans WHERE project_id=5700001 AND status != 'deleted'`)"

---

## Seção 5 — Pontos onde Manus acerta de forma exemplar (4 reconhecimentos)

### R1 — Metodologia 100% determinística

> "Extração de texto via `pdftotext` + busca determinística (`grep -n` / `sed -n`)"
> "Zero consultas externas, zero interpretação jurídica, zero especulação."

**Modelo de auditoria reproduzível.** Cada linha citada da tabela (ex: `Art. 596 | linha 9897`) é verificável por qualquer terceiro com mesmo PDF + mesmas tools.

### R2 — Zero alucinações em 29 amostras

Para um produto cuja meta de confiabilidade é 98% (REGRA-ORQ-31), encontrar **zero artigos inexistentes** em 29 amostras é achado material. Aplicado também à validação implícita de PR #1333 (lista discreta vs range consecutivo distinguidos corretamente em produção).

### R3 — Recomendação útil (Seção 7.1)

Sugestão de `primary` vs `context` é refinamento de produto, não bug — vai para backlog formal com ADR proposta (N3.2).

### R4 — Análise honesta da Portaria 7/2026

Seção 3 + Seção 5 reconhecem que a Portaria é "âncora de validação normativa" (não obrigação substantiva) e cita literalmente o texto integral (2 artigos). Honesto sobre o escopo limitado dela.

---

## Seção 6 — Veredicto auditor

### Status por critério

| Critério | Status |
|---|---|
| Metodologia (pdftotext + grep + sed) | 🟢 |
| Identidade dos 29 artigos individualmente auditados | 🟢 |
| Existência dos artigos nos PDFs (verificação literal por Manus) | 🟢 |
| Coerência semântica das categorias com `Categoria` type | 🟢 |
| **Consistência aritmética (29 vs soma 36)** | 🔴 |
| **Transparência sobre amostragem em ranges** | 🔴 |
| Score derivado (89.7% reproduzível) | 🔴 (dependente de N1.1) |
| Hash/versão dos PDFs declarados | 🟡 |
| Distinção entre "erro" e "contextual" no score | 🟡 |
| Conexão com PR #1333 (validação cruzada implícita) | 🟡 |
| Changelog v1.00 → v2.00 | 🟢 (minor) |
| Universo dos 6 planos declarado | 🟢 (minor) |
| Recomendação refactor primary/context | 🟢 |

### Veredicto

**APROVADA com 3 ressalvas bloqueantes para reprodutibilidade:**

1. **N1.1** — Manus precisa reconciliar 29 vs 36 OU declarar deduplicação metodológica explícita
2. **N1.2** — Score 89.7% precisa especificar base (29 ou 36)
3. **N1.3** — Ranges declarados precisam distinguir "endpoints amostrados" vs "todos auditados"

**Sem ressalvas no conteúdo:**
- ✅ Substância semântica correta
- ✅ Zero alucinações
- ✅ Metodologia reproduzível
- ✅ Validação cruzada implícita de PRs #1333 e #1339 em runtime

---

## Seção 7 — Recomendações para revisão Manus (v2.01)

Se Manus aceitar publicar correção, priorize:

| # | Ajuste | Severidade |
|---|---|---|
| 1 | Reconciliar 29 vs 36: ou justificar deduplicação OU usar 36 e recalcular score | 🔴 N1.1 |
| 2 | Declarar amostragem em ranges: "X amostrados de Y total no range" | 🔴 N1.2/N1.3 |
| 3 | Reformular score: 3 categorias (Primário/Contextual/Erro) em vez de 2 | 🟡 N2.1 |
| 4 | Hash SHA-256 dos 4 PDFs no cabeçalho | 🟡 N2.2 |
| 5 | Nota sobre PR #1333 (formato range vs lista discreta) | 🟡 N2.3 |
| 6 | Changelog v1.00 → v2.00 | 🟢 N3.1 |
| 7 | Declaração explícita: 6 planos = 100% do universo do projeto 5700001 | 🟢 N3.3 |

## Seção 8 — Para o Board Sprint 4

| # | Item | Status |
|---|---|---|
| Auditoria refs legais 5700001 | ✅ Recebida + Auditada por Claude Code |
| **AUD-V2-1** (N1.1 reconciliação) | 🔴 Bloqueante para reprodutibilidade — Manus revisa |
| **AUD-V2-2** (N1.2 amostragem ranges) | 🔴 Bloqueante para honestidade declarada |
| **AUD-V2-3** (N2.1 score 3 categorias) | 🟡 Melhoria comunicação |
| **AUD-V2-4** (N2.2 hash PDFs) | 🟡 Reprodutibilidade futura |
| **ADR-0033 proposta** (primary/context refs) | 🟢 Backlog Sprint 5+ |

---

## Vinculações

- **Original auditado:** `Auditoria Determinística — Referências Legais dos Planos de Ação (1).md` (Manus v2.00, SHA-256 `1b30fc0d...`)
- **PR #1333** (BUG-RAG-ARTIGO-RANGE Opção D) — validação cruzada implícita
- **PR #1339** (BUG-PLAN-TITLE) — 6/6 categorias com PLANS entry confirmadas
- **REGRA-ORQ-22** (crítica 3 níveis) — aplicada
- **REGRA-ORQ-31** (meta 98% confiabilidade) — score 89.7% vs 72.22% é diferença material
- **Lição #71** (scripts DoD commitados / hash de fontes)
- **Lição #87** (smoke estático ≠ runtime) — auditoria entrega runtime evidence
- **Lição #93** (mecanismo verificado, não inferido) — modelar na metodologia, falha na aritmética
- **Tabela do Manus Sections 4.1-4.6:** 36 linhas (não 29)

**Não vou implementar nada.** Auditoria-da-auditoria entregue. Aguardo:
- (a) Manus revisar v2.01 com correções de N1.1/N1.2/N1.3, ou
- (b) P.O. aceitar v2.00 com ressalvas registradas neste documento.
