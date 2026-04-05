# EVIDENCE PACK — MILESTONE 1
## Decision Kernel · IA SOLARIS Compliance Tributária
**Data:** 2026-04-05 | **HEAD:** dad90ec | **Versão:** 1.0
**Preparado por:** Orquestrador Claude
**Para:** Gate Triplo — Técnico (Manus) + Jurídico (Dr. José Rodrigues) + P.O. (Uires Tapajós)

---

## SUMÁRIO EXECUTIVO

O Milestone 1 entrega o **Decision Kernel** — motor de decisão tributária determinístico que classifica produtos (NCM) e serviços (NBS) segundo a LC 214/2025, com rastreabilidade jurídica atômica e nível de confiança explícito em cada decisão.

| Indicador | Valor |
|---|---|
| PRs mergeados (M1) | #302 a #314 |
| Testes passando | 1.470 · 0 falhas |
| Erros TypeScript | 0 |
| Casos validados | 5/6 (1 pending IS — patch controlado) |
| Confiabilidade engine | 100% deterministico / ≤98% regra |
| Cobertura governança CI | 12 workflows ativos |

---

## PARTE 1 — EVIDÊNCIA TÉCNICA

### 1.1 Arquitetura implementada

```
server/lib/decision-kernel/
├── datasets/
│   ├── ncm-dataset.json          ← 3 NCM (2 confirmados + 1 pending)
│   └── nbs-dataset.json          ← 3 NBS (3 confirmados)
├── engine/
│   ├── ncm-engine.ts             ← lookupNcm() — deterministico/condicional/fallback
│   ├── nbs-engine.ts             ← lookupNbs() — regra/regime_especial/fallback
│   ├── constants.ts              ← DatasetStatus · tipos de confiança
│   └── decision-kernel.test.ts   ← 16 testes Vitest
server/lib/
└── engine-gap-analyzer.ts        ← integrador engine → project_gaps_v3
```

### 1.2 Contratos implementados

| Contrato | Arquivo | Status |
|---|---|---|
| CNT-01a | docs/contracts/CNT-01a.md | ✅ Mergeado PR #308 |
| CNT-01b | docs/contracts/CNT-01b.md | ✅ Mergeado PR #308 |
| CNT-02 v1.1 | docs/contracts/CNT-02.md | ✅ Mergeado PR #308 |
| CNT-03 | docs/contracts/CNT-03.md | ✅ Mergeado PR #308 |

### 1.3 Comportamento do engine por status

```typescript
// 'confirmado' → processa normalmente
lookupNcm('9619.00.00')
// → { regime: 'aliquota_zero', confianca: { valor: 100, tipo: 'deterministico' },
//     fonte: { lei: 'LC 214/2025', artigo: '147', ... } }

// 'pending_validation' → fallback explícito, sem invenção
lookupNcm('2202.10.00')
// → { confianca: { valor: 0, tipo: 'fallback' },
//     nota: 'Caso pendente de validação jurídica — não usar em produção' }
```

### 1.4 Integração na Onda 3

```typescript
// routers-fluxo-v3.ts — fire-and-forget, não bloqueia o pipeline
if (input.ncmCodes.length > 0 || input.nbsCodes.length > 0) {
  void analyzeEngineGaps(input.projectId, input.ncmCodes, input.nbsCodes)
    .catch((err) => console.error('[ENGINE-GAP] falhou — pipeline não afetado:', err));
}

// project_gaps_v3 — campo source='engine' (source é varchar(20), sem migration)
```

### 1.5 Gates de qualidade executados

| Gate | Resultado | PR |
|---|---|---|
| Q8 — schema `source` é varchar(20) | ✅ PASS | #312 |
| DK-Q1-A — campos obrigatórios NCM | ✅ PASS | #313 |
| DK-Q1-B — campos obrigatórios NBS | ✅ PASS | #313 |
| DK-Q1-C — status válidos (5 confirmados / 1 pending) | ✅ PASS | #313 |
| DK-Q1-D — confiança por tipo (pending = 0) | ✅ PASS* | #313 |
| DK-Q2 — gold set manual 5 casos | ✅ 5/5 PASS | #314 |

*Correção aplicada: 2202.10.00 tinha confiança 100 indevidamente — corrigido para 0/fallback.

### 1.6 Governança instalada no M1

| Item | Status |
|---|---|
| Skill solaris-contexto v4.1 (RRI + DoD + Q8 + escopo de branch) | ✅ PR #301 |
| branch-scope-check.yml | ✅ PR #304 |
| CODEOWNERS 15 entradas | ✅ PR #305 |
| file-declaration-check.yml + PR template | ✅ PR #306 |
| autoaudit-check.yml | ✅ PR #307 |
| RFC MIG-001 (source depreciado como enum) | ✅ PR #300 |
| RRIs executadas corretamente | 7 RRIs |

---

## PARTE 2 — EVIDÊNCIA JURÍDICA

### 2.1 Fonte canônica

**LC 214/2025** — Lei Complementar nº 214, de 16 de janeiro de 2025
Fonte utilizada: `lc214-2025.pdf` (6.7 MB, origem: reformatributaria.com, confrontado com planalto.gov.br)
**NBS 2.0** — Nomenclatura Brasileira de Serviços (MDIC/SECEX)
Fonte utilizada: `nbs-2-0-utf8.csv` (1.237 registros, origem: gov.br/mdic)

### 2.2 Validação DK-Q2 — 5 casos confirmados

#### NCM 9619.00.00 — Absorventes / fraldas / tampões

| Campo | Valor |
|---|---|
| Regime | aliquota_zero |
| Confiança | 100 / deterministico |
| Artigo | LC 214/2025, Art. 147, caput + incisos I, II, III |
| Condicionante | § único — requisitos Anvisa obrigatórios |
| Texto legal | "Ficam reduzidas a zero as alíquotas do IBS e da CBS incidentes sobre o fornecimento dos seguintes produtos de cuidados básicos à saúde menstrual" |
| Validado por | Dr. José Rodrigues ✅ |

#### NCM 3101.00.00 — Fertilizantes / insumos agropecuários

| Campo | Valor |
|---|---|
| Regime | condicional → reducao_60 (se MAPA) / regime_geral (sem MAPA) |
| Confiança | 100 / condicional |
| Artigo principal | LC 214/2025, Art. 138, caput + § 1º |
| Artigo base | LC 214/2025, Art. 128, inciso IX |
| Anexo | Anexo IX — item 2 (Fertilizantes) — NCM Capítulo 31 |
| Texto § 1º | "A redução de alíquotas prevista no caput somente se aplica aos produtos que, quando exigido, estejam registrados como insumos agropecuários no órgão competente do Ministério da Agricultura e Pecuária." |
| Instrução engine | Retornar tipo=condicional. Sem comprovação de registro: tratar como regime_geral |
| Validado por | Dr. José Rodrigues ✅ |

#### NBS 1.1506.21.00 — SaaS (Software como Serviço)

| Campo | Valor |
|---|---|
| Regime | regime_geral |
| Confiança | 98 / regra |
| Artigos | LC 214/2025, Arts. 11 + 15 (inciso I, alíneas a/b) + 21 |
| Art. 15, I | "A alíquota do IBS corresponderá à soma: a) da alíquota do Estado de destino; b) da alíquota do Município de destino" |
| Gap compliance | Migração ISS (prestador) → IBS/CBS (destino): inscrição por município de destino |
| NBS 2.0 | "Serviços de hospedagem de aplicativos e programas software como serviço (SaaS)" — confirmado |
| Validado por | Dr. José Rodrigues ✅ |

#### NBS 1.0901.33.00 — Empréstimos e financiamentos pessoais

| Campo | Valor |
|---|---|
| Regime | regime_especial (serviços financeiros) |
| Confiança | 98 / regra |
| Artigo 181 | "Os serviços financeiros ficam sujeitos a regime específico de incidência do IBS e da CBS" |
| Artigo 182, I | "operações de crédito, incluídas... empréstimo, financiamento..." — enquadra NBS 1.0901.33.00 |
| Base de cálculo | Arts. 183–199 — escopo M2 (não detalhado no M1) |
| NBS 2.0 | "Serviços de empréstimos e financiamentos pessoais" — confirmado |
| Validado por | Dr. José Rodrigues ✅ |

#### NBS 1.1303.10.00 — Consultoria tributária para PJ

| Campo | Valor |
|---|---|
| Regime | regime_geral |
| Confiança | 95 / regra |
| Artigos | LC 214/2025, Arts. 11 + 15 + 21 |
| Gap compliance | Escritório em SP atendendo cliente no PA: obrigação IBS no estado/município do cliente |
| NBS 2.0 | "Serviços de consultoria tributária para pessoas jurídicas" — confirmado |
| Relevância IA SOLARIS | O próprio cliente da plataforma (escritório tributário) está sujeito a este gap |
| Validado por | Dr. José Rodrigues ✅ |

### 2.3 Caso pending — 2202.10.00 (IS)

| Campo | Valor |
|---|---|
| Status | pending_validation |
| Conteúdo juridicamente confirmado | IS incide sobre bebidas açucaradas, incidência única |
| Pendência | Numeração dos artigos do IS na versão compilada (Art. 409 original vs Arts. 393–397 compilados) |
| Comportamento engine | confianca.valor=0, tipo=fallback, nota obrigatória |
| Desbloqueio | Patch controlado após confirmação dos artigos na versão compilada |

### 2.4 Diretrizes do Dr. Rodrigues para o M1

O engine **deve:**
- Classificar corretamente o regime
- Apontar base legal com precisão (lei + artigo)
- Indicar condicionantes quando existirem
- Explicitar nível de confiança

O engine **não deve:**
- Resolver condicionantes complexas
- Determinar sujeito passivo
- Inferir situações fáticas não informadas
- Substituir análise jurídica contextual

**Critério de aprovação:** 6/6 casos corretos · base legal correta · sem inferência indevida · sem omissão de condicionantes.
**Status atual:** 5/6 confirmados (6/6 após patch IS) · todos os critérios atendidos nos 5 casos.

---

## PARTE 3 — PENDÊNCIAS FORMAIS

| Item | Prioridade | Bloqueante para produção? | Responsável |
|---|---|---|---|
| Patch 2202.10.00 (IS) | P1 | Não — fallback controlado no engine | Dr. Rodrigues + Orquestrador |
| Bloco E — schema projetos (principaisProdutos/Servicos) | P2 | Não — Opção A ativa | P.O. aprovação |
| GOV-03b — invariant check CI | P3 | Não | Pré-M2 |
| Dívida técnica riskEngine.ts duplicado | P3 | Não | Pós-M1 |

---

## PARTE 4 — DECLARAÇÃO PARA O GATE TRIPLO

### Técnico (Manus)
O Decision Kernel está implementado, testado (16 testes unitários + 8 de integração) e integrado na Onda 3 do pipeline. Todos os checks de qualidade (DK-Q1 e DK-Q2) foram executados e aprovados. O código está em estado limpo com 0 erros TypeScript e 1.470 testes passando.

### Jurídico (Dr. José Rodrigues)
Validação concluída em 2026-04-05. 5/6 casos aprovados com base legal correta, condicionantes documentadas e sem inferência indevida. O caso 2202.10.00 (IS) aguarda confirmação de artigos na versão compilada — tratamento de fallback adequado implementado.

### P.O. (Uires Tapajós)
[ ] Milestone 1 aprovado para encerramento formal
[ ] Baseline v3.3 registrado
[ ] Sprint U pode iniciar (Bloco E + patch IS)

---

*Evidence Pack gerado em 2026-04-05*
*Repositório: github.com/Solaris-Empresa/compliance-tributaria-v2*
*HEAD no momento da geração: dad90ec*
