# RAG Corpus Audit Setorial — v1.1 · Rodada 3.1
## Data: 2026-04-25 · Autor: Manus (IA SOLARIS Implementador Técnico)
## Corpus auditado: 2.515 documentos · 14 leis/normas

---

**Status:** NOT_APPROVED_FOR_EXECUTION
**Mutação produtiva:** BLOQUEADA até protocolo aprovado pelo P.O.
**Aprovação necessária:** P.O. (Uires Tapajós) + revisão anti-regressão pelo Orquestrador (Claude)
**Referência ao protocolo:** `docs/data-quality/CORPUS-MUTATION-PROTOCOL-v1.md`

---

## 1. Metodologia de Auditoria

A auditoria foi realizada por consulta direta ao banco de dados `ragDocuments`, cruzando os campos
`topicos`, `lei`, `artigo` e `cnaeGroups` para identificar divergências entre o setor econômico
esperado de cada artigo e o `cnaeGroups` efetivamente indexado. Para cada setor, foram definidos
os **artigos principais esperados** com base na legislação da Reforma Tributária (LC 214/2025,
EC 132/2023, LC 227/2025) e nas leis vigentes (LC 87/96, LC 116/2003, Lei 10.925/2004).

### 1.1 Escala de Severidade

| Severidade | Definição |
|---|---|
| **CRÍTICA** | Artigo principal do setor não retornado no RAG — causa gaps e riscos ausentes |
| **ALTA** | Artigo relevante com cnaeGroups incorreto — reduz precision@5 |
| **MÉDIA** | Artigo com cnaeGroups parcialmente correto — impacto moderado no retrieval |
| **BAIXA** | Artigo com cnaeGroups vazio — não filtrado, mas pode aparecer por similaridade semântica |
| **INFO** | Artigo correto — registrado para referência |

### 1.2 Escala `corpus_tag_confidence`

Para cada setor, o `corpus_tag_confidence` é calculado como:

```
corpus_tag_confidence = (artigos_com_cnaeGroups_correto / artigos_principais_esperados) × 100
```

| Faixa | Classificação | Ação |
|---|---|---|
| 90–100% | ADEQUADO | Monitoramento |
| 70–89% | PARCIAL | Correção P1 |
| 50–69% | INSUFICIENTE | Correção P0 |
| < 50% | CRÍTICO | Correção P0 imediata |

---

## 2. Setor: Agropecuário (CNAE 01–03)

### 2.1 Artigos Principais Esperados

| Artigo | Lei | Tema | cnaeGroups Esperado |
|---|---|---|---|
| Art. 128, I | LC 214/2025 | Alíquota zero — cesta básica nacional (inclui soja) | `01,02,03` |
| Art. 138 | LC 214/2025 | Redução 60% — insumos agropecuários | `01,02,03,10,11,12` |
| Art. 163 | LC 214/2025 | Produtor rural — lei ordinária federal | `01,02,03` |
| Art. 164 | LC 214/2025 | Limiar R$ 3,6M para contribuição obrigatória | `01,02,03` |
| Art. 165 | LC 214/2025 | Opção de inscrição como contribuinte | `01,02,03` |
| Art. 168 | LC 214/2025 | Crédito presumido — regime regular | `01,02,03` |

### 2.2 Divergências Identificadas

| ID | Artigo | cnaeGroups Atual | cnaeGroups Esperado | Severidade |
|---|---|---|---|---|
| 148 | LC 214 Art. 110 | `64,65,66` | `01,02,03,10,11,12,86,87,88` | **CRÍTICA** |
| 178 | LC 214 Art. 138 | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 179 | LC 214 Art. 138 (p2) | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 213 | LC 214 Art. 168 | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 214 | LC 214 Art. 168 (p2) | `64,65,66` | `01,02,03,10,11,12` | **CRÍTICA** |
| 39 | LC 214 Art. 26 | `86,87,88,45,46,47` | `01,02,03,10,11,12,86,87,88,45,46,47` | **ALTA** |
| 944 | LC 227 Art. 108 | `64,65,66` | `01,02,03,10,11,12` | **MÉDIA** |

### 2.3 Artigos Corretos (referência)

| ID | Artigo | cnaeGroups Atual | Observação |
|---|---|---|---|
| 180 | LC 214 Art. 138 (p3) | `01,02,03,10,11,12,13,14,15,16` | ✅ Correto |
| 208–212 | LC 214 Art. 163–167 | `01,02,03` | ✅ Corretos |

### 2.4 `corpus_tag_confidence` — Agro

```
Artigos principais esperados: 6
Artigos com cnaeGroups correto: 4 (Art. 128 I, Art. 163, Art. 164, Art. 165)
Artigos com cnaeGroups incorreto: 2 (Art. 138, Art. 168)

corpus_tag_confidence = 4/6 × 100 = 67% → INSUFICIENTE
```

**Trigger de correção:** `corpus_tag_confidence < 70%` → Correção P0 obrigatória.

### 2.5 Impacto no RAG

Com os 5 artigos críticos incorretos, o retrieval para CNAE `0115-6/00` retorna apenas os artigos
163–167 (regime do produtor rural) mas **não retorna** os artigos 138 (insumos) e 168 (crédito
presumido), que são os mais relevantes para a apuração fiscal. Isso causa ausência de ~4 gaps
críticos e ~3 riscos relevantes nos relatórios de compliance para o setor agro.

**Prioridade de correção: P0 — imediata.**

---

## 3. Setor: Saúde (CNAE 86–88)

### 3.1 Artigos Principais Esperados

| Artigo | Lei | Tema | cnaeGroups Esperado |
|---|---|---|---|
| Art. 128, II | LC 214/2025 | Alíquota zero — medicamentos e dispositivos médicos | `86,87,88` |
| Art. 233–243 | LC 214/2025 | Regime específico — serviços de saúde | `86,87,88` |
| Art. 153, VIII | EC 132/2023 | IS — não incide sobre serviços de saúde | `86,87,88` |
| Art. 156-A §6º | EC 132/2023 | Regimes específicos — saúde | `86,87,88` |

### 3.2 Divergências Identificadas

| ID | Artigo | cnaeGroups Atual | cnaeGroups Esperado | Severidade |
|---|---|---|---|---|
| 30845 | EC 132 Art. 153 VIII | `COM,IND,SER` | `86,87,88,COM,IND,SER` | **ALTA** |
| 30851 | EC 132 Art. 156-A §6º | `COM,IND,SER` | `86,87,88,COM,IND,SER` | **ALTA** |

### 3.3 Artigos Corretos (referência)

| IDs | Artigos | cnaeGroups Atual | Observação |
|---|---|---|---|
| 297–308 | LC 214 Art. 233–243 | `86,87,88,45,46,47` | ✅ Corretos (inclui construção hospitalar) |

### 3.4 `corpus_tag_confidence` — Saúde

```
Artigos principais esperados: 4
Artigos com cnaeGroups correto: 2 (Art. 128 II, Art. 233–243)
Artigos com cnaeGroups incorreto: 2 (Art. 153 VIII, Art. 156-A §6º)

corpus_tag_confidence = 2/4 × 100 = 50% → INSUFICIENTE
```

**Trigger de correção:** `corpus_tag_confidence < 70%` → Correção P1 (não bloqueia setor).

**Prioridade de correção: P1 — alta, mas não bloqueia o setor.**

---

## 4. Setor: Financeiro (CNAE 64–66)

### 4.1 Artigos Principais Esperados

| Artigo | Lei | Tema | cnaeGroups Esperado |
|---|---|---|---|
| Art. 169–174 | LC 214/2025 | Regime específico — serviços financeiros | `64,65,66` |
| Art. 179–184 | LC 214/2025 | Seguros e previdência privada | `64,65,66` |
| Art. 10 (p2) | LC 214/2025 | Operações financeiras — regras gerais | `64,65,66` |

### 4.2 Divergências Identificadas

O setor financeiro é o **único setor sem divergências estruturais** no corpus. Os artigos 169–184
e os artigos gerais de operações financeiras estão corretamente indexados com `cnaeGroups = "64,65,66"`.

**Problema inverso identificado:** Os artigos 138 e 168 (agro) foram incorretamente indexados com
`cnaeGroups = "64,65,66"` — eles aparecem no retrieval financeiro mas **não** no retrieval agro.
Este é o problema raiz documentado no Setor Agro (Seção 2).

### 4.3 `corpus_tag_confidence` — Financeiro

```
Artigos principais esperados: 3
Artigos com cnaeGroups correto: 3 (todos)
Artigos incorretos de outros setores presentes: 5 (IDs 178, 179, 213, 214, 944)

corpus_tag_confidence = 3/3 × 100 = 100% → ADEQUADO
Contaminação por falsos positivos: PRESENTE (5 artigos agro)
```

**Trigger de monitoramento:** após patch agro, verificar que `precision@5` financeiro não regride.

**Prioridade de correção: P2 — baixa (efeito colateral do patch agro).**

---

## 5. Setor: Telecom (CNAE 61)

### 5.1 Artigos Principais Esperados

| Artigo | Lei | Tema | cnaeGroups Esperado |
|---|---|---|---|
| Art. 156-A §6º | EC 132/2023 | Regimes específicos — telecom | `61,COM,IND,SER` |
| Art. 7º | CG-IBS | Regras de apuração — telecom | `61` |
| Art. 17 | LC 87/96 | ICMS — telecom | `61,COM,IND,SER,AGR` |

### 5.2 Divergências Identificadas

| ID | Artigo | cnaeGroups Atual | cnaeGroups Esperado | Severidade |
|---|---|---|---|---|
| 60363 | CG-IBS Art. 7º | `` (vazio) | `61` | **ALTA** |

### 5.3 `corpus_tag_confidence` — Telecom

```
Artigos principais esperados: 3
Artigos com cnaeGroups correto: 2 (Art. 156-A §6º com formato genérico, Art. 17 LC 87/96)
Artigos com cnaeGroups incorreto/vazio: 1 (CG-IBS Art. 7º)

corpus_tag_confidence = 2/3 × 100 = 67% → INSUFICIENTE
Corpus total de telecom: 4 artigos (muito escasso)
```

**Trigger de correção:** `corpus_tag_confidence < 70%` + `corpus_total < 10` → Ampliação P1.

**Prioridade de correção: P1 — alta, corpus insuficiente.**

---

## 6. Setor: Combustíveis (CNAE 19, 46.81, 47.31)

### 6.1 Artigos Principais Esperados

| Artigo | Lei | Tema | cnaeGroups Esperado |
|---|---|---|---|
| Art. 10 | LC 214/2025 | Regime monofásico — combustíveis | `19,46,47,35` |
| Art. 100 | LC 214/2025 | Regras específicas — combustíveis | `19,46,47,35` |
| Art. 116 | LC 214/2025 | Regime monofásico — combustíveis (central) | `19,46,47,35` |
| Art. 118 | LC 214/2025 | Substituição tributária — combustíveis | `19,46,47,35` |
| Art. 413 | LC 214/2025 | Transição — combustíveis | `19,46,47,35` |
| Art. 11 (p2) | LC 227/2025 | IS — combustíveis fósseis | `19,46,47,35` |
| Art. 12 | LC 227/2025 | IS — alíquotas combustíveis | `19,46,47,35` |

### 6.2 Divergências Identificadas

| ID | Artigo | cnaeGroups Atual | cnaeGroups Esperado | Severidade |
|---|---|---|---|---|
| 154 | LC 214 Art. 116 | `64,65,66` | `19,46,47,35` | **CRÍTICA** |
| 43 | LC 214 Art. 28 | `64,65,66` | `19,46,47,35` | **ALTA** |
| 3 | LC 214 Art. 3 | `64,65,66` | `19,46,47,35,64,65,66` | **MÉDIA** |
| 382 | LC 214 Art. 309 | `64,65,66` | `19,46,47,35` | **MÉDIA** |

### 6.3 Artigos Corretos (referência)

| IDs | Artigos | cnaeGroups Atual | Observação |
|---|---|---|---|
| 14, 135, 156, 511 | LC 214 Art. 10, 100, 118, 413 | `35,36,37,...,33` | ✅ Corretos (inclui CNAE 19) |
| 1075, 1076 | LC 227 Art. 11, 12 | `35,36,37,...,33` | ✅ Corretos |

### 6.4 `corpus_tag_confidence` — Combustíveis

```
Artigos principais esperados: 7
Artigos com cnaeGroups correto: 5 (Art. 10, 100, 118, 413, IS)
Artigos com cnaeGroups incorreto: 2 (Art. 116 CRÍTICO, Art. 28)

corpus_tag_confidence = 5/7 × 100 = 71% → PARCIAL
```

**Trigger de correção:** `corpus_tag_confidence < 75%` + artigo CRÍTICO ausente → Correção P0.

**Prioridade de correção: P0 — imediata (mesmo nível que agro).**

---

## 7. Setor: Transporte (CNAE 49–53)

### 7.1 Artigos Principais Esperados

| Artigo | Lei | Tema | cnaeGroups Esperado |
|---|---|---|---|
| Art. 13 | LC 87/96 | ICMS — base de cálculo no transporte | `49,50,51,52,53` |
| Art. 17 | LC 87/96 | ICMS — crédito no transporte | `49,50,51,52,53` |
| Cláusula TRIG-p147–151 | Conv. ICMS | ST — transporte | `49,50,51,52,53` |

### 7.2 Divergências Identificadas

| ID | Artigo | cnaeGroups Atual | cnaeGroups Esperado | Severidade |
|---|---|---|---|---|
| 60089 | Conv. ICMS Cláusula D-p2 | `` (vazio) | `49,50,51,52,53` | **MÉDIA** |
| 60274–60278 | Conv. ICMS Cláusula TRIG-p147–151 | `` (vazio) | `49,50,51,52,53` | **MÉDIA** |
| 60116 | Conv. ICMS Cláusula VIG-p2 | `` (vazio) | `49,50,51,52,53` | **BAIXA** |

### 7.3 `corpus_tag_confidence` — Transporte

```
Artigos principais esperados: 3
Artigos com cnaeGroups correto: 2 (Art. 13 e 17 LC 87/96 — formato genérico COM,IND,SER,AGR)
Artigos com cnaeGroups vazio: 6 (todos os Conv. ICMS)

corpus_tag_confidence = 2/3 × 100 = 67% → INSUFICIENTE
Problema sistêmico: todos os conv_icms têm cnaeGroups vazio
```

**Trigger de correção:** `corpus_tag_confidence < 70%` → Correção P2 (impacto moderado, Conv. ICMS é corpus legado).

**Prioridade de correção: P2 — baixa.**

---

## 8. Resumo Executivo — `corpus_tag_confidence` por Setor

| Setor | CNAE Groups | `corpus_tag_confidence` | Classificação | Artigos Críticos Ausentes | Prioridade |
|---|---|---|---|---|---|
| **Agropecuário** | 01–03 | **67%** | INSUFICIENTE | Art. 138, Art. 168 | **P0** |
| **Combustíveis** | 19, 46, 47 | **71%** | PARCIAL | Art. 116 | **P0** |
| **Saúde** | 86–88 | **50%** | INSUFICIENTE | Art. 153 VIII (EC 132) | **P1** |
| **Telecom** | 61 | **67%** | INSUFICIENTE | CG-IBS Art. 7º + corpus escasso | **P1** |
| **Financeiro** | 64–66 | **100%** | ADEQUADO | Nenhum (problema inverso) | **P2** |
| **Transporte** | 49–53 | **67%** | INSUFICIENTE | Conv. ICMS (vazio) | **P2** |

**Meta de qualidade do corpus:** `corpus_tag_confidence ≥ 85%` para todos os setores P0/P1.
**Estado atual:** Nenhum setor P0 ou P1 atinge a meta.

---

## 9. Estimativa de Esforço — Fase 0 (Detalhada)
## Versão: v1.2 · Rodada 3.2 (Prompt 2) · 2026-04-26

> **Nota metodológica:** As estimativas abaixo são em **dias úteis** e separam três tipos de
> esforço: (T) técnico/Manus, (J) jurídico/P.O., (R) revisão/Orquestrador. Os cenários
> otimista/realista/pessimista refletem variação de disponibilidade de stakeholders, complexidade
> jurídica e número de iterações de revisão.

---

### 9.1 Tabela de Esforço por Artefato

| # | Artefato | Esforço Técnico (ot/re/pe) | Esforço Jurídico/P.O. (ot/re/pe) | Esforço Revisão Orquestrador (ot/re/pe) | Quem executa |
|---|---|---|---|---|---|
| 1 | `INPUT-QUALITY-GATE-M2.md` revisão | 0,5d / 1d / 2d | 0,5d / 1d / 2d | 0,5d / 1d / 1,5d | Claude Code + P.O. |
| 2 | `GOLD-SET-ARCHETYPE-SPEC-v1.md` | 0,5d / 1d / 2d | 1d / 2d / 3d | 0,5d / 1d / 2d | Manus + jurídico |
| 3 | `CORPUS-MUTATION-PROTOCOL-v1.md` | 0d / 0d / 0d | 0,5d / 1d / 2d | 0,5d / 1d / 1d | Manus (pronto) + P.O. |
| 4 | `RAG-CORPUS-QUALITY-PATCH-AGRO-v1.md` | 0,5d / 1d / 2d | 0,5d / 1d / 2d | 0,5d / 1d / 1,5d | Manus + P.O. |
| 5 | `NCM-DATASET-CANDIDATE-AGRO-1201-90-00-v1.md` | 0d / 0d / 0d | 1d / 2d / 4d | 1d / 2d / 3d | Manus (pronto) + jurídico |
| 6 | `RAG-CORPUS-AUDIT-SETORIAL-v1.md` | 0d / 0d / 0d | 0,5d / 1d / 1,5d | 0,5d / 1d / 1d | Manus (pronto) + P.O. |
| 7 | `AGRO-SOJA-RAG-AB-TEST-PLAN-v1.md` | 0d / 0d / 0d | 0,5d / 1d / 1,5d | 0,5d / 1d / 1d | Manus (pronto) + P.O. |
| 8 | Gold set smoke v0 (5 casos) | 1d / 2d / 3d | 1d / 2d / 3d | 1d / 2d / 3d | jurídico + Manus |

> **Legenda:** ot = otimista · re = realista · pe = pessimista · d = dias úteis

---

### 9.2 Estimativa Total — Fase 0

A Fase 0 compreende os artefatos 1–8 acima. O total é calculado pelo **caminho crítico** (não
pela soma simples), pois vários artefatos podem rodar em paralelo.

| Cenário | Dias Úteis | Semanas | Premissas |
|---|---|---|---|
| **Otimista** | **7 dias úteis** | **~1,5 semanas** | P.O. e jurídico disponíveis em 24h; 0 iterações de revisão; NCM aprovado sem ressalvas; smoke test passa na 1ª execução |
| **Realista** | **15 dias úteis** | **~3 semanas** | P.O. disponível em 48h; 1 iteração de revisão por artefato; NCM exige 1 consulta jurídica adicional; smoke test com 1 ajuste |
| **Pessimista** | **28 dias úteis** | **~5,5 semanas** | P.O. com agenda restrita (>3 dias de espera); NCM exige 2+ consultas jurídicas; Gold Set smoke falha e exige retrabalho; novo Change Request para `archetype_family` |

---

### 9.3 Caminho Crítico

A sequência que define o tempo total da Fase 0 é:

```
[1] INPUT-QUALITY-GATE-M2 revisão
    ↓
[3] CORPUS-MUTATION-PROTOCOL aprovação P.O.
    ↓
[4] RAG-CORPUS-QUALITY-PATCH-AGRO aprovação P.O. + execução SQL
    ↓
[5] NCM-DATASET-CANDIDATE aprovação jurídica + promoção
    ↓
[8] Gold set smoke v0 (5 casos) — execução + validação
```

**Bloqueio externo principal:** A aprovação jurídica do NCM 1201.90.00 (artefato 5) é o
bloqueio de maior variância. No cenário pessimista, uma consulta jurídica sobre alíquota zero
para soja in natura (Art. 128 I da LC 214) pode levar até 4 dias úteis de espera.

---

### 9.4 Paralelismo Possível

Os seguintes artefatos são **independentes entre si** e podem ser executados em paralelo:

| Grupo Paralelo | Artefatos | Pré-requisito |
|---|---|---|
| **Grupo A** (docs prontos) | 3, 6, 7 | Apenas aprovação P.O. (sem dependência técnica) |
| **Grupo B** (revisão técnica) | 1, 2 | Disponibilidade Claude Code + P.O. |
| **Grupo C** (jurídico) | 5 | Disponibilidade jurídico externo |
| **Grupo D** (execução) | 4, 8 | Depende de 3 (protocolo aprovado) e 5 (NCM aprovado) |

Com paralelismo máximo (Grupos A + B + C simultâneos), o caminho crítico cai para ~7 dias
(cenário otimista). No cenário realista, o Grupo C (jurídico) é o gargalo.

---

### 9.5 Dependências Externas

| Dependência | Artefatos afetados | Variância | Mitigação |
|---|---|---|---|
| **Jurídico externo** (validação NCM 1201.90.00) | 5, 8 | Alta (1–4 dias úteis) | Iniciar consulta jurídica em paralelo com aprovação do protocolo |
| **Dataset oficial Receita Federal** (alíquotas IBS/CBS 2026) | 5 | Média (pode não estar publicado) | Usar LC 214 Art. 128 I como referência provisória |
| **Disponibilidade P.O.** | 1, 2, 3, 4, 6, 7 | Média (1–3 dias úteis por artefato) | Agrupar aprovações em sessão única |
| **Corpus RAG atualizado** (após PATCH-AGRO-001) | 8 | Baixa (técnico) | Executar smoke test imediatamente após SQL aprovado |

---

### 9.6 Riscos de Cronograma

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **P0** — NCM 1201.90.00 rejeitado juridicamente (alíquota incorreta) | Média | Alto (+5 dias) | Usar `status=pending_validation` e bloquear apenas o smoke test do GS-001 |
| **P0** — SQL PATCH-AGRO-001 falha no smoke test (cnaeGroups incorreto) | Baixa | Alto (+3 dias) | Rollback automático + re-análise dos IDs afetados |
| **P1** — P.O. solicita Change Request para novo `archetype_family` | Média | Médio (+2 dias) | Manter `*(a definir)*` nos 14 casos DRAFT até curadoria explícita |
| **P1** — Gold set smoke v0 falha em > 2 dos 5 casos | Baixa | Médio (+3 dias) | Reduzir smoke v0 para 2 casos ACTIVE (GS-001 + GS-013) |
| **P2** — Dataset oficial IBS/CBS não publicado até fim da Fase 0 | Alta | Baixo | Usar alíquotas provisórias da LC 214 e marcar como `pending_official_dataset` |

---

### 9.7 Recomendação Final

| Cenário | Prazo Fase 0 | Premissa principal |
|---|---|---|
| **Otimista** | **7 dias úteis (~1,5 semanas)** | Aprovações em 24h, sem iterações jurídicas |
| **Realista** | **15 dias úteis (~3 semanas)** | 1 iteração por artefato, NCM com 1 consulta jurídica |
| **Pessimista** | **28 dias úteis (~5,5 semanas)** | NCM bloqueado, P.O. com agenda restrita, retrabalho no smoke test |

**Recomendação:** Planejar a Fase 0 com **prazo realista de 3 semanas** (15 dias úteis), com
gate de revisão ao final da semana 1 (artefatos 1–7 aprovados) e gate de execução ao final
da semana 2 (SQL executado + smoke test passando). O smoke v0 do Gold Set fecha a semana 3.

O risco P0 de rejeição jurídica do NCM deve ser mitigado iniciando a consulta jurídica
imediatamente após aprovação do `CORPUS-MUTATION-PROTOCOL-v1.md`, em paralelo com os
demais artefatos.

---

## 10. Problema Sistêmico: Conv. ICMS com cnaeGroups Vazio

Todos os documentos com `lei = "conv_icms"` têm `cnaeGroups = ""` (vazio). Isso afeta **todos
os setores** que dependem de convênios ICMS para regras de substituição tributária. O impacto
é moderado porque o retrieval semântico ainda pode retornar esses documentos por similaridade
de texto, mas a filtragem por setor não funciona.

**Trigger de correção sistêmica:** `COUNT(ragDocuments WHERE lei='conv_icms' AND cnaeGroups='') > 0`
→ Criar script de enriquecimento automático. Escopo: sprint separado (Fase 1).

---

## 11. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| v1.0 | 2026-04-25 | Criação inicial — auditoria setorial mapeada |
| v1.1 | 2026-04-25 | Rodada 3.1 — status NOT_APPROVED_FOR_EXECUTION, `corpus_tag_confidence` por setor, escala de triggers, estimativa Fase 0, meta de qualidade ≥ 85% |
| v1.2 | 2026-04-26 | Rodada 3.2 (Prompt 2) — Seção 9 reescrita com estimativa detalhada: 8 artefatos, 3 cenários (ot/re/pe), caminho crítico, paralelismo, dependências externas e riscos de cronograma |

---

*Documento gerado pelo Implementador Técnico IA SOLARIS · Rodada 3.1 · 2026-04-25*
*NÃO executar correções sem aprovação formal do P.O. e revisão anti-regressão do Orquestrador.*
