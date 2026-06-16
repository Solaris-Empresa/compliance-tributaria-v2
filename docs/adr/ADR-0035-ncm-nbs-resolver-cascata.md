# ADR-0035 — Resolver NCM/NBS em cascata (ponto único de decisão)

## Status: Proposto · 2026-06-14 · GATE-NCM-NBS #1219 · Classe C
## Relacionado: ADR-0010 (NCM/NBS), ADR-0012 (IS Art.57/Art.2), ADR-0017 (aviso NCM/NBS ausente)

---

## 1. Contexto

A demanda do Dr. José (UX da página do projeto: aceitar **grupos** NCM/NBS além do código específico) expôs, via AS-IS/TO-BE v5 (`docs/governance/relatorios/AS-IS-TO-BE-NCM-NBS-AGRUPAMENTO-v5-20260614.md`), que **não existe um resolver central** de NCM/NBS. Há **4 matchers independentes com granularidades divergentes**:

| Matcher | `arquivo:linha` | Granularidade atual | Comportamento com grupo (4 díg.) |
|---|---|---|---|
| Decision Kernel | `ncm-engine.ts:114` / `nbs-engine.ts:126` | EXATO 8/9 díg. | fallback genérico (conf. 60/55) |
| Gate IS | `risk-eligibility-is-ncm-cnae.ts:89-99` | prefixo 2 díg. (`startsWith`) | grupo **casa** (`"2402"`→cap. `"24"`) |
| Injeção Art.197 | `art197-injection.ts:34` | `startsWith("8436")` | grupo `"8436"` **casa** |
| Normative Inference | `normative-inference.ts:94-96` | `exact\|prefix` per-rule (sem hierarquia) | casa se houver regra de prefixo |

Achados empíricos da v5 (verificados):
- **F6:** 0 de 1.095 projetos têm NCM/NBS preenchido → caminho nunca exercido E2E (exige smoke greenfield).
- **F9/F10:** `deriveObjetoFromNcm/Nbs` (`deriveObjeto.ts:188-224,238-306`) cai em **fallback genérico antes** de `extractNcmChapter`/`extractNbsDivisao` quando o código não está no dataset exato → grupo degrada para `bens_mercadoria_geral`/`servico_geral`.
- **F11/#827:** Gate IS com `NCM/CNAE ausentes` → `eligible=true` (permissivo) — causa real do falso-positivo 5040001 (não over-match de capítulo).
- **Datasets minúsculos:** `ncm-dataset.json` ~24 entradas, `nbs-dataset.json` ~19 → o gargalo dos 98% é **maturidade de dados**, não granularidade (curadoria = F5).

## 2. Decisão

Criar um **resolver único em cascata** (`server/lib/ncm-nbs-resolver.ts`), ponto único de decisão consumido pelos 4 matchers:

```
resolução = específico(8/9) → grupo(4/5) → capítulo(2) → regime_geral
```

**Princípio:** *armazena-se o específico; decide-se pelo grupo; refina-se pelo específico apenas onde a lei distingue* (cesta básica Anexo I, IS Art.393 §1º).

## 3. Contrato de dados (formal)

```typescript
interface NcmNbsResolution {
  code: string;              // código informado pelo usuário (ex: "8436" ou "8436.99.00")
  resolution_level: 'specific' | 'group' | 'chapter' | 'fallback';
  resolved_code: string;     // código efetivamente usado para decisão
  regime: string;            // regime resultante (regime_geral, aliquota_zero, ...)
  confidence: number;        // 0..1 — specific=1.0 · group≈0.7 · chapter≈0.4 · fallback≈0.3 (placeholder; calibrar — F15/Lição da v5)
  source: 'normative_rules' | 'dataset' | 'fallback';
}
```

> Os pesos de confiança são **placeholder** até calibração empírica (não inventar valor final — crítica N2.4 da v5). Alimentam o Score Q3 (ADR-0016) → bump MINOR daquele ADR quando F2 calibrar.

## 4. Consumers afetados (lista canônica verificada — v5)

> A contagem "11" de versões anteriores do despacho foi **superada** pela v5: **9 consumers reais** (6 sensíveis à granularidade + 3 que herdam/derivam). Documentado aqui para evitar parroting (REGRA-ORQ-27).

| # | Consumer | `arquivo:linha` | Sensível à granularidade |
|---|---|---|---|
| C1 | Q.Produto | `product-questions.ts:60-66,164-181` | 🟡 médio (filtro RAG) |
| C2 | Q.Serviço | `service-questions.ts:59-65,87-106` | 🟡 médio |
| C3 | Decision Kernel / Gaps | `engine-gap-analyzer.ts:79-80` → `ncm-engine.ts:111-172` / `nbs-engine.ts:123-185` | 🔴 crítico (exato→fallback) |
| C4 | Gate IS | `risk-eligibility-is-ncm-cnae.ts:42-50,89-99` | 🔴 crítico (estreitar + travar #827) |
| C5 | Injeção Art.197 | `art197-injection.ts:31-36` | 🟡 médio (já opera como grupo) |
| C6 | Normative Inference | `normative-inference.ts:82-99` | 🟢 baixo (já tem prefix) |
| C7 | `buildPerfilEntidade` (orquestra deriveObjeto) | `buildPerfilEntidade.ts:80-88` | 🔴 crítico (grupo→genérico via F9/F10) |
| C8 | `completeness` (Score Q3) | `completeness.ts:226-232` | 🟡 médio (grupo conta "completo" sem distinção) |
| C9 | `diagnostic-consolidator` | `diagnostic-consolidator.ts:454,477,487` | 🟢 baixo (cosmético) |

**4 matchers a migrar para o resolver (F3):** C3 (ncm/nbs-engine), C4 (IS), C5 (Art.197), C6 (normative-inference — alinhar interface).

## 5. DoD negativo por consumer crítico (REGRA-ORQ-44)

Cada consumer 🔴 exige critério POSITIVO + NEGATIVO. Os negativos testam o **comportamento real atual** (não o desejado — anti-padrão "DoD invertido", caso da devolutiva Manus na v5):

| Consumer | POSITIVO | NEGATIVO |
|---|---|---|
| C4 Gate IS | `NCM 2710.19.21 (diesel) → IS elegível` | `NCM=[] + CNAE não-92 → IS NÃO elegível` (trava #827/F11); `NCM 2306.10.00 (fora Art.393, arrays não-vazios) → NÃO elegível` |
| C5 Art.197 | `NCM 8436 + CNAE 28 → injeta a pergunta` (injeção NÃO gateia destinatário — ver §9.4) | `NCM ausente → NÃO injeta` |
| Cesta básica (via C3/C6) | `NCM específico do Anexo I → aliquota_zero` | `grupo (4 díg.) sozinho → NÃO concede aliquota_zero` (refino específico obrigatório) |
| C3/C7 resolver | `NCM 8436 → resolution_level='group'` | `NCM 8436 → NÃO cair em 'fallback'/genérico` |

## 6. Rollback

**Feature flag `ENABLE_NCM_RESOLVER`** (env): `false` (default inicial) = comportamento atual dos 4 matchers preservado; `true` = roteia pelo resolver. Permite cold→hot por ambiente e rollback imediato sem deploy. Migração F3 envolve cada matcher chamar o resolver **apenas** sob a flag.

## 7. Fases (resumo — detalhe no board #1219)

F0 (este ADR) → F1 (UX 4 gates aceitam grupo) → F2 (`ncm-nbs-resolver.ts` + testes) → F3 (migrar 4 matchers; fecha #827) → F4 (DoD negativo ORQ-44) → F5 (curadoria `normative_*_rules` com grupos).

## 8. Vinculadas

- AS-IS/TO-BE v5 (`docs/governance/relatorios/AS-IS-TO-BE-NCM-NBS-AGRUPAMENTO-v5-20260614.md`) — base técnica
- REGRA-ORQ-43 (fluxo SPEC-FIRST) · REGRA-ORQ-44 (DoD negativo) · REGRA-ORQ-24 (Classe C) · REGRA-ORQ-27 (consumo)
- ADR-0010 (NCM/NBS) · ADR-0012 (IS) · ADR-0016 (Score/confiança — bump MINOR em F2) · ADR-0017 (aviso ausente)
- Issue #1219 (GATE-NCM-NBS) · #827 (IS falso-positivo — fechado em F3) · #1043 (ci-hygiene, ortogonal)

## 9. Errata normativa (2026-06-16 — verificação determinística LC 214 + Decreto 12.955 + Resolução CGIBS 6)

Correções/esclarecimentos com extração `pdftotext` (citação por linha do PDF). Origem: análise do gate Art. 197 (#1439a/#1439b) e da curadoria do Dr. José.

**9.1 — Destinatário (corrige a redação "PF" do §5/C5).** O sujeito da alíquota zero do Art. 197, I é **produtor rural não contribuinte** — não restrito a PF. O **Art. 164 da LC 214/2025** (l.3318) define não contribuinte como produtor rural **PF ou PJ** com receita < R$ 3,6M/ano (+ produtor integrado). O termo "PF" da norma pertence ao **inciso II** (transportador autônomo de carga), não ao inciso I (produtor rural).

**9.2 — Base legal.** A base da alíquota zero agro é o **Art. 110 da LC 214/2025** (`LC 214 Art. 110` — zera IBS+CBS). O **Art. 197 da própria LC 214** (l.4065) trata de cooperativas/serviços financeiros — **não** é base agro. O "Art. 197" agro existe apenas nos **regulamentos**: Decreto 12.955/2026 (lado CBS) e Resolução CGIBS 6/2026 (lado IBS), ambos c/c Art. 110 da LC 214.

**9.3 — Citação canônica da Tabela de bens.** A lista de tratores/máquinas/implementos agrícolas (Art. 197, I) está, de forma **internamente consistente**, na **Resolução CGIBS 6/2026, Anexo IV, Tabela II**. No **Decreto 12.955/2026** a mesma tabela está fisicamente no **Anexo V, Tabela I** (erro de diagramação do Decreto: o texto do artigo remete a "Anexo IV", mas a tabela está no Anexo V — o Anexo IV do Decreto é do Art. 196/suspensão).

**9.4 — Eixo de elegibilidade (#1439b).** O gate de destinatário (produtor rural não contribuinte) é aplicado na **MATRIZ de riscos** (`consolidateRisks` → confidence high se confirmado / medium + nota se não), **NÃO na injeção** da pergunta. `shouldInjectArt197` gateia apenas CNAE 28 + NCM família 8436 — a pergunta SOL-059 colhe a condição do destinatário, logo não se pode gatear a injeção pela própria resposta.

**Nota de estado:** este ADR foi redigido como "Proposto" com roadmap F0-F5; o épico entregou também F6 + #1275 (NEW-CAT) + #1439 (gate). Atualização de status (Proposto → Aceito) e do roadmap fica como follow-up de governança.
