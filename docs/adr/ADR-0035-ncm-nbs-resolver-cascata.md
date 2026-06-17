# ADR-0035 — Resolver NCM/NBS em cascata (ponto único de decisão)

## Status: Proposto · 2026-06-14 · GATE-NCM-NBS #1219 · Classe C
## Amendments: §10 — precedência negativa (exclusion list) · 2026-06-18 · #1492 · bump MINOR
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

## 10. Amendment — Regra de precedência negativa (exclusion list) · 2026-06-18

**Âncora:** Decisão P.O. v54 Q1 + Issue #1492 (BUG-001) · Classe A (docs-only) · bump **MINOR** deste ADR.
**Status do amendment:** Proposto — aguarda revisão semântica do Consultor + aprovação P.O. (REGRA-ORQ-33).

### 10.1 — Problema (verificado no código — Gate 0)

`loadActiveRules` (`ncm-nbs-resolver.ts:128-140`) carrega **apenas** regras `WHERE active = 1`. Logo, uma regra **específica** desativada (ex.: `1006.10` `sem_beneficio`/`active=0`, criada na Decisão P.O. v17 justamente para **negar** o benefício a esse específico) **não é carregada** → `classifyResolution` (`:89-91`, vencedor = mais dígitos) não a vê → o **grupo pai** `1006` (`active=1`, `match_mode='prefix'`, ex.: `cesta_basica_pendente`) **captura por prefixo** → o resolver retorna o regime **do grupo pai**, contrariando a decisão de desativar o específico.

Isto é **sistêmico** (não só `1006.10`): qualquer específico futuro marcado `active=0` para "cair" em regime mais geral cai na mesma armadilha.

### 10.2 — Decisão: precedência negativa (a exclusion list é **extensão**, não contradição, da cascata)

A cascata do §2 (`específico → grupo → capítulo → regime_geral`) decide pela regra **mais específica que casa**. O amendment apenas estende o conjunto de regras consideradas para **incluir as desativadas como bloqueadoras**, preservando o mesmo princípio "o mais específico vence":

> **Regra de precedência negativa:** quando existe uma regra **mais específica** que casa o código e essa regra está **`active=0`**, ela **vence** sobre qualquer regra **menos específica** (grupo/capítulo) `active=1`. O resolver **não propaga** o match do grupo pai — retorna o regime declarado pela regra inativa (ex.: `sem_beneficio`) ou, na ausência de regime explícito, `regime_geral`.

Em uma frase: **um específico inativo "sombreia" (shadows) o grupo pai ativo.** Não há contradição com a cascata — `active=0` no nível específico é um sinal curatorial deliberado registrado na base normativa da plataforma, de "este código **não** herda o benefício do grupo", e respeitá-lo é a leitura **correta** do princípio "decide-se pelo grupo; refina-se pelo específico onde a lei distingue" (§2). A desativação do específico **é** a distinção que a curadoria (alinhada à lei — ex.: P.O. v17) faz.

> **Correção factual (parecer Consultor 2026-06-18):** a regra de grupo `1006` com `match_mode='prefix'` (`cesta_basica_pendente`) captura **mais largo que a lei autoriza**. A LC 214/2025 (Art. 125 + Anexo I, Item 1) enumera apenas `1006.20`, `1006.30` e `1006.40.00` — **não** o grupo `1006`. Essa modelagem ampla é a **causa-raiz estrutural**; a precedência negativa (Opção A) resolve o **sintoma** sem deixar lacunas no cap. 10 (posições 1001–1005, 1007–1008 ainda não curadas). O fix definitivo (Opção B — trocar a regra de grupo pelas 3 regras específicas) fica condicionado à curadoria completa do cap. 10 — ver issue tech-debt vinculada em §10.7.

### 10.3 — Semântica precisa (para a implementação em #1492)

Considerando **todas** as regras (ativas e inativas) que casam o código, seja `W` a de **maior** número de dígitos (mais específica):

| Caso | `W.active` | Resultado |
|---|---|---|
| `W` é a vencedora e está **ativa** | 1 | comportamento atual (regime de `W`) — **sem mudança** |
| `W` é a vencedora e está **inativa** | 0 | **precedência negativa**: regime de `W` se declarado (ex.: `sem_beneficio`), senão `regime_geral`; **NÃO** cai no grupo pai ativo |
| nenhuma regra casa | — | `fallback`/`regime_geral` — **sem mudança** |

`resolution_level`/`confidence`/`source` do caso de bloqueio ficam a cargo da spec de #1492 (sugestão: marcar como `specific` + `source` distinguindo o bloqueio; **não** definido aqui para não congelar implementação — REGRA-ORQ-21).

### 10.4 — Anti-regressão (invariante)

- Específicos `active=1` e grupos `active=1` **sem** específico inativo concorrente → **inalterados**.
- A regra de precedência negativa só altera o resultado quando coexistem (a) específico `active=0` e (b) grupo/capítulo pai `active=1` que casa o mesmo código.

### 10.5 — DoD (herda REGRA-ORQ-44)

- **POSITIVO:** `resolveNcm('1006.10')` → `sem_beneficio`/`regime_geral` (respeita P.O. v17).
- **NEGATIVO:** `resolveNcm('1006.10')` **NÃO** retorna `cesta_basica_pendente` (regime do grupo pai `1006`).
- **Auditoria de amplitude (query Manus):** quantos específicos `active=0` têm grupo pai `active=1` hoje? (dimensiona o impacto antes do fix).
- **Salvaguarda pré-fix (D2 — REGRA-ORQ-44 DoD negativo, parecer Consultor 2026-06-18):** executar, **antes do merge de #1492**, a query de integridade que cruza os `active=0` contra os **códigos literais do Anexo I** (não contra o grupo `1006`):

  ```sql
  -- Resultado esperado: VAZIO (0 rows). Se não-vazio → ABORTAR o fix:
  -- a desativação contradiz a lei (código beneficiado pelo Anexo I marcado active=0).
  SELECT ncm_code, regime
  FROM normative_product_rules
  WHERE active = 0
    AND ncm_code IN (
      -- Códigos LITERAIS do Anexo I LC 214/2025 (Art. 125 — Cesta Básica).
      -- Array literal Anexo I: aguarda Consultor (oferta aceita — ~80 NCMs / 26 itens).
      '1006.20', '1006.30', '1006.40.00'  -- arroz (Item 1) — demais a completar
    );
  -- 1006.10 NÃO consta do Anexo I → desativação legítima → não dispara alerta.
  ```

### 10.6 — Para o Consultor (revisão semântica solicitada)

Confirmar que a regra de precedência negativa **não conflita** com nenhuma regra normativa nem com o contrato da cascata (§2/§3): especificamente, que "específico `active=0` bloqueia grupo pai `active=1`" é a leitura juridicamente correta de uma desativação curada de regra específica (ex.: P.O. v17 para `1006.10`), e não introduz risco de **negar** benefício legítimo onde a lei o concede pelo grupo.

### 10.7 — Vinculadas (amendment)

Issue #1492 (BUG-001 — Opção A, sintoma) · **Issue #1498 (Opção B — fix definitivo: regra de grupo 1006 → 3 regras específicas do Anexo I, gate: cap. 10 100% curado)** · `ncm-nbs-resolver.ts:128-140` (`loadActiveRules`) · `:89-99` (`classifyResolution`) · Decisão P.O. v17 (`1006.10`) + v54 Q1 + v62 (emenda §10.2/§10.5) · Parecer Consultor 2026-06-18 · LC 214/2025 Art. 125 + Anexo I · REGRA-ORQ-41 (impact-tree) · REGRA-ORQ-44 (DoD negativo) · REGRA-ORQ-21 (não congelar implementação na spec).
