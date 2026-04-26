# INPUT QUALITY GATE — M2 / RAG / Risk Engine

> **Status:** draft — spec dev-ready (endurecida na Rodada 3.1)
> **Versão:** 1.1.0
> **Data:** 2026-04-26
> **Owner:** P.O. (Uires)
> **Autor:** Claude Code (diretiva P.O. + Orquestrador, Rodada 3.1)
> **Epic:** #830 — RAG com Arquétipo
> **Milestone consumidor:** M2 (filtro pré-RAG por arquétipo + IQG + Elegibilidade)
> **Nível:** PRODUTO (decide aprovação) + ENGENHARIA (contrato técnico) + GOVERNANÇA (gold set + enums + calibração)

---

## 0. Sumário executivo

A entrega do Runner v3 (M1) garante **arquétipo dimensional determinístico**, mas o caso real **Agro Soja (Projeto 2001)** demonstrou que um arquétipo confirmado **não é suficiente** para tornar uma matriz de riscos confiável quando há:

- fallback NCM/NBS sobre item crítico (Decision Kernel sub-dimensionado);
- corpus RAG com tags setoriais incorretas (chunks agro classificados como financeiros, p.ex.);
- riscos gerados sem `gap_id` ou sem `source_reference`;
- riscos de Imposto Seletivo aplicados a entidades inelegíveis (transportador, soja in natura, agropecuário sem revisão);
- requisitos recuperados com âncora normativa fraca (sem `anchor_id`).

Este documento especifica o **Input Quality Gate (IQG)** — uma camada determinística que classifica a matriz de riscos resultante em um de 6 estados (`APPROVABLE`, `DRAFT_LOW_CONFIDENCE`, `BLOCKED_INPUT_QUALITY`, `BLOCKED_CORPUS_QUALITY`, `BLOCKED_ELIGIBILITY`, `NEEDS_HUMAN_REVIEW`). Apenas matrizes em `APPROVABLE` podem ser apresentadas ao usuário como aprovação automática.

### 0.1 Premissas estruturais (Rodada 3 — aceitas pelo P.O.)

- **Arquitetura híbrida** — hard gates (proteção binária P0) + IQS auxiliar (calibrável, observa) + gold set por família de arquétipo (instrumento de calibração)
- **98% de acurácia** = validação contra **gold set por família de arquétipo** — **NÃO** é IQS ≥ 0.98
- **IQS é v0.1** — score operacional auxiliar, **não** prova jurídica isolada; pesos sujeitos a calibração
- **Hard gates** = proteção binária contra erro crítico; bloqueiam mesmo com IQS alto
- **Gold set** = mecanismo de calibração + matriz de regressão multi-arquétipo
- **M1 = Runner do Arquétipo (não reabre)**; **M2 = IQG + RAG com Arquétipo + Elegibilidade da matriz**
- **Sem downgrade silencioso** — todo downgrade é **auditável e visível ao usuário**
- **Enums de gate sob governança formal** — change request obrigatório, não livre adição

### 0.2 Premissa anti-hallucination

O gate **não cria conhecimento novo** — apenas **mede a qualidade da cadeia de evidências** já produzida pelos engines existentes (M1 runner, briefing engine, gap engine, risk engine v4, eligibility) e bloqueia aprovação quando a evidência é frágil.

### 0.3 Meta operacional

98% de acurácia validada **contra gold set por família de arquétipo** na cadeia `entrada → arquétipo → RAG → requisito → gap → risco → plano`. Gold set v1 = mínimo 15 casos; v2 = 50+ casos OU 200+ decisões avaliadas.

---

## 1. Comparação de alternativas (A / B / C / D)

Antes de detalhar o IQG, esta seção registra **por que** a arquitetura híbrida (alternativa C) foi escolhida sobre as outras 3.

| Alternativa | Como funciona | Veredito |
|---|---|---|
| **A — IQS composto puro** | Score numérico (0-100) decide aprovabilidade isoladamente; threshold único define `APPROVABLE` | **REJEITAR** — score alto pode mascarar erro P0 (ex.: IS aplicado a transportador). Score numérico sem hard gates não detecta categoricamente errado. |
| **B — Hard gates puros** | Qualquer falha em qualquer critério → bloqueio total; nada calibrável | **PARCIAL** — protege contra P0 mas causa **overblocking**. Projetos com pequenas imperfeições (ex.: 1 NCM acessório fora do dataset) bloqueados sem necessidade. Não permite calibração progressiva. |
| **C — Híbrido (Hard gates + IQS observa/calibra + Gold set valida)** | Hard gates bloqueiam erros P0 (eligibility, integridade da cadeia, IS+fallback); IQS auxiliar reduz false positives e alimenta calibração; gold set por família valida acurácia macro | **RECOMENDADO** — combina proteção binária + observabilidade + base empírica. Esta SPEC implementa C. |
| **D — Gold set binário (apenas validar contra gold set)** | Sem hard gates nem IQS — só compara projeto novo com gold set existente | **COMPLEMENTAR** — vira **mecanismo de calibração de C**, não substitui hard gates. Gold set sozinho não cobre projetos novos fora da família catalogada. |

### 1.1 Por que NÃO alternativa A

Score composto sem hard gates falha em casos categoricamente errados:
- Transportadora com IS aprovado mas IQS=0.92 (porque corpus tem cobertura média e arquétipo é confirmado) → **IS sai aprovado** apesar de juridicamente impossível
- Solução: hard gate em eligibility independente do IQS

### 1.2 Por que NÃO alternativa B

Hard gate em **todos** os critérios cria overblocking:
- Projeto com NCM acessório de 2% da receita fora do dataset → bloqueio total
- Projeto sem subnatureza explícita (não-regulado normal) → bloqueio se threshold for restritivo
- Solução: graduação `INFO_FALLBACK` (não-bloqueante) vs `CRITICAL_FALLBACK` (bloqueante)

### 1.3 Por que C combina o melhor de B e D

- B oferece a proteção binária (hard gates contra P0)
- D oferece a base empírica (gold set por família)
- IQS auxiliar fica entre os dois — explica o "porquê" para o usuário sem decidir aprovação isoladamente

---

## 2. Estados do Gate

O gate emite **um único estado** por matriz de riscos avaliada, com precedência definida (primeira condição satisfeita determina o estado).

### 2.1 Tabela de estados

| Estado | Símbolo | Semântica | Precedência |
|---|---|---|---|
| `APPROVABLE` | 🟢 | Matriz pode ser apresentada como aprovação automática ao usuário. | (default — todos critérios passam) |
| `DRAFT_LOW_CONFIDENCE` | 🟡 | Matriz exibida ao usuário como `rascunho`; aprovação **manual obrigatória** com justificativa textual. | 5 (último) |
| `NEEDS_HUMAN_REVIEW` | 🟠 | Sinalizada para revisor humano interno (equipe SOLARIS). Usuário **não vê** matriz até revisão completar. | 4 |
| `BLOCKED_ELIGIBILITY` | 🔴 | Risco gerado para entidade inelegível detectado (ex.: IS para soja in natura). Matriz **não é gravada como aprovável**; gera audit log. | 3 |
| `BLOCKED_CORPUS_QUALITY` | 🔴 | Tags do corpus RAG inconsistentes com arquétipo (ex.: chunks agro com `cnaeGroups` financeiros). Matriz **não é gravada como aprovável**; gera issue de governança. | 2 |
| `BLOCKED_INPUT_QUALITY` | 🔴 | Entrada (arquétipo + dataset) tem qualidade insuficiente para qualquer matriz determinística. Matriz **não é gerada**. | 1 (mais alto) |

### 2.2 Diagrama de transição

```
     archetype.confirmado
              │
              ▼
   ┌─ INPUT_QUALITY_CHECK ─────────────┐
   │  (dataset_coverage, fallback,    │
   │   archetype hardness)            │
   └──────────────┬──────────────────┘
                  │ pass
                  ▼
   ┌─ CORPUS_QUALITY_CHECK ───────────┐
   │  (tag confidence, anchor_id,    │
   │   requirement_id coverage)       │
   └──────────────┬──────────────────┘
                  │ pass
                  ▼
   ┌─ RISKS_GENERATED (engine v4) ───┐
   └──────────────┬──────────────────┘
                  │
                  ▼
   ┌─ ELIGIBILITY_CHECK ──────────────┐
   │  (isCategoryAllowed por risco)   │
   └──────────────┬──────────────────┘
                  │ pass
                  ▼
   ┌─ APPROVABILITY_CHECK ────────────┐
   │  (rag_validated %, source_ref,  │
   │   gap chain integrity, IQS)     │
   └──────────────┬──────────────────┘
                  ▼
       APPROVABLE / DRAFT_LOW_CONFIDENCE
```

### 2.3 Comportamento da UI por estado

| Estado | UI no `RiskDashboardV4` | Botão "Aprovar" | Audit log |
|---|---|---|---|
| `APPROVABLE` | matriz normal (cards verdes/amarelos/vermelhos por severity) | habilitado | `approved` (no clique) |
| `DRAFT_LOW_CONFIDENCE` | banner amarelo `[RASCUNHO — Baixa Confiança]` + lista de motivos | habilitado **com modal de justificativa textual obrigatória** | `manual_approval_low_confidence` |
| `NEEDS_HUMAN_REVIEW` | banner laranja `[EM REVISÃO INTERNA]` | desabilitado | `routed_to_review` |
| `BLOCKED_*` | banner vermelho com motivo + CTA "Revisar dados de entrada" | desabilitado (sem matriz visível) | `blocked_<reason>` |

---

## 3. Critérios mínimos para APPROVABLE

Uma matriz só obtém estado `APPROVABLE` se **todos** os critérios abaixo forem satisfeitos. Falha em qualquer um determina o estado conforme tabela §2.1.

### 3.1 Critérios obrigatórios

| # | Critério | Origem do dado | Tipo |
|---|---|---|---|
| C-01 | `archetype.status_arquetipo === "confirmado"` | M1 runner | hard |
| C-02 | `archetype.hard_block_count === 0` | M1 runner | hard |
| C-03 | `archetype.lc_conflict_count === 0` (regras C1-C6) | M1 validateConflicts | hard |
| C-04 | `fallback_count_critical === 0` (ver §5) | M1 + dataset | hard |
| C-05 | `dataset_coverage >= 0.98` (ver §6) | medição | hard |
| C-06 | `corpus_tag_confidence >= 0.98` (ver §7) | medição | hard |
| C-07 | 100% dos gaps possuem `requirement_id` não-nulo | gapEngine | hard |
| C-08 | 100% dos riscos possuem `gap_id` não-nulo (RN-RISK-05) | risk-engine-v4 | hard |
| C-09 | 100% dos riscos possuem `source_reference` não-vazio | risk-engine-v4 | hard |
| C-10 | 100% dos riscos possuem `anchor_id` ou `legal_anchor` equivalente | risk-engine-v4 | hard |
| C-11 | `riscos_indesejados === 0` (ver §8) | eligibility | hard |
| C-12 | `eligibility_status === "allowed"` para cada risco aplicado | risk-eligibility.ts | hard |
| C-13 | `rag_validated_pct >= category_threshold` (ver §7.4) | rag-risk-validator | hard |
| C-14 | `briefing.coverage === 1.00` (todos requisitos aplicáveis cobertos) | briefingEngine | hard |
| C-15 | `iqs_score >= 0.85` (auxiliar — ver §9) | computeIqsScore (próx. tarefa) | hard (com governança v0.1) |

### 3.2 Hierarquia entre critérios

- **Falha em C-01..C-04** → `BLOCKED_INPUT_QUALITY` (arquétipo não é fonte confiável)
- **Falha em C-05** → `BLOCKED_INPUT_QUALITY` ou `DRAFT_LOW_CONFIDENCE` conforme severidade do fallback (§5)
- **Falha em C-06** → `BLOCKED_CORPUS_QUALITY`
- **Falha em C-07..C-10, C-14** → `BLOCKED_INPUT_QUALITY` (cadeia Requisito→Gap→Risco quebrada — invariante CLAUDE.md backend)
- **Falha em C-11..C-12** → `BLOCKED_ELIGIBILITY`
- **Falha em C-13** → `DRAFT_LOW_CONFIDENCE` ou `NEEDS_HUMAN_REVIEW` conforme categoria
- **Falha em C-15 isolado** → `DRAFT_LOW_CONFIDENCE` (IQS é auxiliar, não decide bloqueio sozinho)

---

## 4. Tipos enumerados sob governança (v1.0)

Esta seção lista os enums críticos cuja alteração exige Change Request formal (ver §17). Todos os valores listados são **v1.0** congelados.

### 4.1 `CriticalRiskCategory`

```typescript
type CriticalRiskCategory =
  | "imposto_seletivo"        // P0 — sujeito a hard gate de elegibilidade
  | "ibs_cbs"
  | "regime_diferenciado"
  | "aliquota_reduzida"
  | "aliquota_zero"
  | "cadastro_fiscal"
  | "split_payment"
  | "obrigacao_acessoria"
  | "transicao"
  | "enquadramento_geral";    // categoria fallback para downgrades
```

Sincronizado com `server/lib/risk-categorizer.ts` (Sprint Z-02 / DIV-Z01-005 Opção C). Adição de nova categoria exige Change Request (§17).

### 4.2 `CentralRequirementType`

```typescript
type CentralRequirementType =
  | "obligation_principal"     // ex.: declarar IBS no DFe
  | "obligation_accessory"     // ex.: emitir NFC-e
  | "registration"             // ex.: inscrição estadual
  | "documentation"            // ex.: livros fiscais
  | "transition_compliance"    // arts. 25-30 LC 214/2025
  | "regime_specific"          // regimes setoriais
  | "tax_credit_apuration";    // crédito presumido, não-cumulativo
```

Adição de novo tipo exige Change Request (§17). Tipos atuais cobrem 100% das categorias da LC 214/2025 conhecidas em 2026-04-26.

### 4.3 `FallbackCriticality`

```typescript
type FallbackCriticality =
  | "INFO"        // não-crítico — penaliza IQS, não bloqueia (-3 pp por ocorrência)
  | "CRITICAL"    // bloqueia APPROVABLE → DRAFT_LOW_CONFIDENCE
  | "REGULATED"   // setor regulado com fallback → NEEDS_HUMAN_REVIEW
  | "UNKNOWN";    // dado inválido → BLOCKED_INPUT_QUALITY
```

Adição de nova severidade exige Change Request (§17).

---

## 5. Classificação de fallback

O fallback acontece quando o engine não encontra entrada no Decision Kernel para um identificador (NCM/NBS). Já existe o blocker `V-10-FALLBACK` (severity INFO) emitido pelo M1 runner. Esta seção **classifica os fallbacks por criticidade** para alimentar o gate.

### 5.1 Tabela de severidades

| Severidade | Trigger | Comportamento no gate | Ação requerida |
|---|---|---|---|
| `INFO` | Item não-crítico (ex.: NCM acessório com peso baixo na receita) | reduz IQS em -3 pp por ocorrência; **não bloqueia** `APPROVABLE` | nenhuma ação imediata; backlog Decision Kernel |
| `CRITICAL` | Item crítico (NCM/NBS principal — primeiro da seed) | impede `APPROVABLE`; estado → `DRAFT_LOW_CONFIDENCE` | revisar dataset Decision Kernel; humano revisa cadeia de risco |
| `REGULATED` | Subnatureza ∈ {`telecomunicacoes`, `saude_regulada`, `financeiro`} **e** fallback ativo (já emite `V-10-FALLBACK-REGULATED` INFO no runner) | estado → `NEEDS_HUMAN_REVIEW` | revisão humana especializada (setor regulado) |
| `UNKNOWN` | NCM/NBS sem regime declarado **nem** entrada no dataset (raro — significa código inválido) | estado → `BLOCKED_INPUT_QUALITY` | corrigir dado de entrada |

### 5.2 Critério "item crítico"

Um NCM/NBS é **crítico** se **qualquer** das condições abaixo:

- (a) é o **primeiro** item declarado em `ncms_principais` ou `nbss_principais`;
- (b) está mencionado em ≥ 1 fonte de receita de peso ≥ 30% da receita total declarada;
- (c) o objeto derivado a partir dele participaria de uma **categoria de risco IS-relevante** (combustivel, bebida, tabaco) — fallback aqui é especialmente perigoso;
- (d) o objeto derivado é o **único objeto** do arquétipo (ou seja, o fallback decide a categoria semântica única).

### 5.3 Exemplos canônicos

| Caso real | NCM/NBS | Subnatureza | Severidade | Estado resultante |
|---|---|---|---|---|
| Agro Soja — NCM 1201 ausente | NCM 1201 (chapter 12 ausente do dataset) | — (não regulado) | `CRITICAL` | `DRAFT_LOW_CONFIDENCE` até NCM validado |
| Telecom — NBS 1.1401 ausente | NBS 1.1401.10.00 | `telecomunicacoes` | `REGULATED` | `NEEDS_HUMAN_REVIEW` |
| Combustível — NCM IS-relevante ausente | NCM 27xx fora do dataset | — | `CRITICAL` (IS-relevante por §5.2.c) | `BLOCKED_INPUT_QUALITY` (não admite fallback em IS) |
| Cosmético acessório — NCM 33xx ausente | NCM 33xx (item de receita marginal) | — | `INFO` | `APPROVABLE` (com penalty no IQS) |
| NCM com regime "pending_validation" | qualquer | — | `UNKNOWN` | `BLOCKED_INPUT_QUALITY` |

### 5.4 Regra dura: IS + fallback é incompatível com APPROVABLE

Se a categoria de risco gerada inclui `imposto_seletivo` **e** existe `CRITICAL` no NCM principal → o gate força `BLOCKED_INPUT_QUALITY` independentemente dos demais critérios. Justificativa: IS é a categoria com maior impacto financeiro e menor margem para inferência genérica.

---

## 6. Dataset Coverage

### 6.1 Definição

```
dataset_coverage = items_críticos_mapeados / items_críticos_declarados
```

Onde `items_críticos` (cf. §5.2) são determinados pela seed do projeto.

### 6.2 Componentes do cálculo

| Componente | Peso no cálculo | Como medir |
|---|---|---|
| NCMs principais | 0.30 | proporção de `ncms_principais` que retornam regime ≠ fallback no Decision Kernel |
| NBSs principais | 0.30 | proporção de `nbss_principais` que retornam regime ≠ fallback no Decision Kernel |
| CNAEs confirmados | 0.15 | proporção de `confirmedCnaes` que retornam ≥ 1 requisito aplicável no RAG (não-skipped) |
| Setor econômico (CNAE → setor) | 0.10 | binário: setor derivado bate com macro_setor declarado |
| Subnatureza setorial | 0.10 | binário: subnatureza ∈ enum v1 (não rejeitada por filtro) |
| Regime tributário | 0.05 | binário: regime ∈ {simples, presumido, real, mei} (não `indefinido`) |

### 6.3 Threshold

```
dataset_coverage >= 0.98 → APPROVABLE permitido
0.85 <= dataset_coverage < 0.98 → DRAFT_LOW_CONFIDENCE
dataset_coverage < 0.85 → BLOCKED_INPUT_QUALITY
```

Threshold v0.1 — sujeito a calibração (§19).

### 6.4 Pseudo-código

```typescript
function computeDatasetCoverage(seed: Seed, archetype: Arquetipo): number {
  const componentes: Array<{ peso: number; valor: number }> = [];

  // NCMs (peso 0.30)
  const ncmCritical = identifyCriticalNcms(seed); // primeiro + por receita >=30%
  const ncmMapped = ncmCritical.filter(ncm => {
    const r = lookupNcm({ codigo: ncm, sistema: "NCM" });
    return r.confianca.tipo !== "fallback" && r.confianca.valor > 0;
  });
  componentes.push({
    peso: 0.30,
    valor: ncmCritical.length === 0 ? 1 : ncmMapped.length / ncmCritical.length,
  });

  // NBSs (peso 0.30) — análogo
  // CNAEs (peso 0.15) — proporção de CNAEs com requirements no RAG
  // Setor (peso 0.10) — derivedSetor === seed.macro_setor ? 1 : 0
  // Subnatureza (peso 0.10) — archetype.subnatureza_setorial.length > 0 ? 1 : 0
  // Regime (peso 0.05) — archetype.regime !== "indefinido" ? 1 : 0

  return componentes.reduce((acc, c) => acc + c.peso * c.valor, 0);
}
```

---

## 7. Corpus Tag Confidence

### 7.1 Definição

Mede a **consistência das tags do corpus RAG** com o arquétipo do projeto. Detecta o cenário onde chunks RAG estão indexados com tags setoriais incorretas (ex.: artigo agropecuário marcado com `cnaeGroups: ["64xx-financeiro"]`).

### 7.2 Fontes de evidência por chunk

Cada chunk do corpus deve ter:

| Tag | Origem | Obrigatoriedade | Verificação |
|---|---|---|---|
| `cnaeGroups[]` | indexação | obrigatória | compatível com `archetype.derived_legacy_operation_type`? |
| `legal_topic` | indexação | obrigatória | compatível com setor (ex.: "imposto seletivo" em chunk agro = INCONSISTENTE)? |
| `applicable_articles[]` | indexação | obrigatória | artigo está na lei + cobre o setor? |
| `anchor_id` | indexação | obrigatória | não-vazio (id único do parágrafo/item) |
| `requirement_id` | derivação RAG | obrigatória | não-vazio (id do requisito derivado) |

### 7.3 Cálculo

Para o conjunto de chunks recuperados (top-K do retrieval) para uma consulta:

```
chunks_total = top-K recuperados
chunks_compatíveis = chunks com:
  - cnaeGroups intersect archetype.cnaes != []
  - legal_topic compatível com derived_legacy_operation_type
  - applicable_articles aplicáveis ao setor (ver tabela §7.5)
  - anchor_id != ""
  - requirement_id != ""

corpus_tag_confidence = chunks_compatíveis / chunks_total
```

### 7.4 Threshold por categoria

| Categoria de risco | `rag_validated_pct` mínimo (C-13) |
|---|---|
| `imposto_seletivo` | 1.00 (não admite ruído) |
| `regime_diferenciado` | 0.90 |
| `aliquota_zero` | 0.95 |
| `aliquota_reduzida` | 0.95 |
| `split_payment` | 0.90 |
| `ibs_cbs` | 0.85 |
| `cadastro_fiscal` | 0.80 |
| `obrigacao_acessoria` | 0.80 |
| `transicao` | 0.70 |
| `enquadramento_geral` | 0.50 (fallback — não exige alta validação) |

Thresholds v0.1 — sujeitos a calibração (§19).

### 7.5 Tabela de incompatibilidade tag × arquétipo (exemplos)

| Tag do chunk | Arquétipo | Sinal |
|---|---|---|
| `legal_topic="imposto seletivo"` | `objeto=[agricola]`, `derived=agronegocio` | 🔴 forte — chunk irrelevante; deduz erro de indexação |
| `cnaeGroups=["64xx-financeiro"]` | `derived=agronegocio` | 🔴 forte — incompatibilidade setorial |
| `legal_topic="regime diferenciado agropecuário"` | `derived=agronegocio` | ✅ compatível |
| `applicable_articles=["art. 138 LC 214/2025"]` | `papel=fabricante` + `objeto=agricola` | ✅ compatível (art. 138 = produtor rural PJ) |

### 7.6 Detecção de "tag setorial incorreta"

Heurística determinística (sem LLM):

```typescript
function detectTagInconsistency(chunk: RagChunk, archetype: Arquetipo): boolean {
  // Setor declarado pelo chunk vs setor derivado do arquétipo
  const chunkSetor = inferSetorFromCnaeGroups(chunk.cnaeGroups);
  const archSetor = archetype.derived_legacy_operation_type;

  if (chunkSetor !== null && chunkSetor !== archSetor) {
    return true; // INCONSISTÊNCIA
  }

  // Topic declarado vs categoria semântica do arquétipo
  if (chunk.legal_topic === "imposto seletivo" && archSetor === "agronegocio") {
    return true; // soja não é IS
  }
  if (chunk.legal_topic === "regime diferenciado financeiro" && archSetor !== "financeiro") {
    return true;
  }
  // ... (tabela determinística)

  return false;
}
```

---

## 8. Eligibility Gate

### 8.1 Regra base

```
Risco gerado é elegível ⟺ isCategoryAllowed(risk.category, archetype) === { allowed: true }
```

A função `isCategoryAllowed` já existe em `server/lib/risk-eligibility.ts` (Hotfix IS v1.2 + ADR-0030 D-6) e é a **fonte de verdade**. Este gate apenas a invoca por risco e agrega o resultado.

### 8.2 Comportamento por resultado

| `EligibilityResult` | Ação |
|---|---|
| `{ allowed: true, reason: null }` | aceita risco como está |
| `{ allowed: true, reason: "operation_type_ausente" }` | aceita + warning (no `warnings[]` do gate output) |
| `{ allowed: true, reason: "operation_type_desconhecido" }` | aceita + warning + audit log |
| `{ allowed: true, reason: "agro_requer_revisao" }` (reservado) | downgrade categoria para `enquadramento_geral` + flag para revisão humana |
| `{ allowed: false, reason: "sujeito_passivo_incompativel" }` | **descartar** risco; somar a `riscos_indesejados`; audit log obrigatório com registro completo (§10) |

### 8.3 Tabela de elegibilidade (sincronizada com `risk-eligibility.ts`)

| Categoria | Operation types permitidos | Comportamento se não permitido |
|---|---|---|
| `imposto_seletivo` | `industria`, `comercio`, `misto` | downgrade auditável → `enquadramento_geral`; **bloqueado para `agronegocio`, `servicos`, `financeiro`** |
| (demais categorias) | sem restrição | n/a |

### 8.4 Exemplos canônicos

| Risco proposto pelo LLM | operationType | Comportamento esperado |
|---|---|---|
| IS sobre transportador (papel=transportador, derived=servicos) | `servicos` | ❌ DENIED → downgrade auditável `enquadramento_geral`; risco visível com `was_downgraded_from: "imposto_seletivo"` |
| IS sobre soja in natura (papel=fabricante, objeto=agricola, derived=agronegocio) | `agronegocio` | ❌ DENIED → downgrade auditável; risco visível com motivo + evidencia_arquetipo |
| IS sobre refinaria de petróleo (papel=fabricante, objeto=combustivel, derived=industria) | `industria` | ✅ ALLOWED — risco mantido |
| IS sobre usina sucroenergética (etanol — papel=fabricante, objeto=combustivel) | `industria` | ✅ ALLOWED + warning sugerido (ADR-0030 D-6 v1.2 — reservar `agro_requer_revisao` para casos limítrofes futuros) |
| Regime diferenciado para agropecuária | `agronegocio` | ✅ ALLOWED |

### 8.5 Métrica `riscos_indesejados`

```
riscos_indesejados = count(riscos onde isCategoryAllowed(...).allowed === false)
```

Se `riscos_indesejados > 0` → estado `BLOCKED_ELIGIBILITY`. Audit log obrigatório com lista dos riscos descartados.

---

## 9. IQS — Score auxiliar (v0.1)

### 9.1 Premissa

**IQS NÃO é probabilidade jurídica.** **IQS NÃO prova 98% de acurácia.** **IQS é score operacional auxiliar** — explica ao usuário o "porquê" de um estado e alimenta a calibração.

A acurácia de 98% **só é demonstrável contra gold set por família de arquétipo** (§17). IQS sozinho não substitui validação empírica.

### 9.2 Composição (v0.1)

```
iqs_score = w1 * archetype_quality       (peso 0.20)
          + w2 * dataset_coverage        (peso 0.25)
          + w3 * corpus_tag_confidence   (peso 0.25)
          + w4 * rag_evidence_quality    (peso 0.20)
          + w5 * eligibility_quality     (peso 0.10)
```

Onde:
- `archetype_quality` ∈ [0,1] — `1.0` se status=confirmado E hard_block=0 E lc_conflict=0; reduz proporcionalmente caso contrário
- `dataset_coverage` ∈ [0,1] — §6
- `corpus_tag_confidence` ∈ [0,1] — §7
- `rag_evidence_quality` ∈ [0,1] — proporção de riscos com `source_reference` + `anchor_id` + `requirement_id` completos
- `eligibility_quality` ∈ [0,1] — `1.0` se zero downgrade; reduz proporcionalmente conforme % de downgrade

### 9.3 Status v0.1

- **Pesos `[0.20, 0.25, 0.25, 0.20, 0.10]` são v0.1** — escolhidos por inspeção visual + intuição P.O./Orquestrador, **não validados empiricamente ainda**
- **Sujeitos a calibração** após gold set v1 (mínimo 15 casos) e correlação com sucesso/falha real
- **Mecanismo de evolução**: Change Request formal (§17) baseado em correlação com gold set
- **Threshold C-15 `iqs_score >= 0.85`** também é v0.1; pode ser elevado/abaixado conforme calibração

### 9.4 Exemplo Agro Soja (Projeto 2001)

Aplicando v0.1 ao caso (HOJE, sem expansão de dataset):

```
archetype_quality      = 1.0   (status=confirmado, sem hard_block, sem lc_conflict)
dataset_coverage       = 0.70  (NCM 1201 ausente, demais ok)
corpus_tag_confidence  = 0.85  (estimado — não medido empiricamente sem RAG real)
rag_evidence_quality   = 0.90  (assumindo 90% riscos com anchor_id após M2)
eligibility_quality    = 1.00  (sem downgrade; arquétipo agro não tenta IS)

iqs_score = 0.20*1.00 + 0.25*0.70 + 0.25*0.85 + 0.20*0.90 + 0.10*1.00
          = 0.20 + 0.175 + 0.2125 + 0.18 + 0.10
          = 0.8675 (≈ 87)
```

IQS de 87 está acima do threshold v0.1 (`>= 85`), mas **C-04 falha** (fallback crítico em NCM 1201) → estado vai para `DRAFT_LOW_CONFIDENCE` independentemente do IQS. Hard gates prevalecem.

### 9.5 Por que IQS não decide sozinho

O exemplo §9.4 ilustra a regra C: IQS=87 sugere que a maior parte da matriz é boa, mas o hard gate em C-04 ainda força DRAFT. Inversamente, se IQS=92 mas há 1 risco com IS para soja → eligibility hard gate força BLOCKED. **Hard gates sempre prevalecem.** IQS apenas explica.

---

## 10. Downgrade Auditável (sem silêncio)

### 10.1 Premissa

**NÃO existe "downgrade silencioso"** nesta arquitetura. Todo downgrade de categoria de risco é **persistido**, **auditável** e **visível ao usuário**.

### 10.2 Schema de persistência por downgrade

Para cada risco que sofreu downgrade, o gate persiste:

```typescript
interface DowngradeAuditRecord {
  risk_id: string;
  gap_id: string;                       // RN-RISK-05 — invariante
  categoria_original: CriticalRiskCategory;  // ex.: "imposto_seletivo"
  categoria_final: CriticalRiskCategory;     // ex.: "enquadramento_geral"
  motivo: EligibilityReason;            // "sujeito_passivo_incompativel" etc.
  evidencia_arquetipo: {                // o que da arquétipo motivou o downgrade
    perfil_hash: string;
    derived_legacy_operation_type: string;
    objeto: readonly string[];
    papel_na_cadeia: string;
  };
  source_reference: string;             // citação normativa que ainda se aplica
  visible_to_user: true;                // INVARIANTE — sempre visível
  downgraded_at: string;                // ISO-8601
}
```

### 10.3 Threshold de escalation

```
downgraded_risks / total_risks >= 0.30 → estado escalado para NEEDS_HUMAN_REVIEW
```

Justificativa: ≥30% de downgrades indica classificação sistematicamente errada (LLM ou categorizer com viés). Threshold v0.1 — recalibrar após **30 projetos OU 30 dias OU primeiro gold set** (o que vier primeiro).

### 10.4 Visibilidade UI

| Cenário | UI esperada |
|---|---|
| Risco com `was_downgraded_from` populado | card amarelo com seção "Reclassificação" mostrando categoria original + motivo + evidência |
| Matriz com `downgraded_risks > 0` | banner informativo `[N riscos reclassificados — clique para ver]` |
| Matriz com `downgraded_risks / total >= 0.30` | banner laranja `[Em revisão interna — alto volume de reclassificações]` |

### 10.5 Audit log obrigatório

```
INSERT INTO audit_logs (
  project_id, entity, entity_id, action,
  before_state, after_state, user_id, user_name, user_role
) VALUES (
  <project>, 'risk', <risk_id>, 'downgraded',
  '{"category":"<original>"}', '{"category":"<final>"}',
  -1, 'system:iqg-gate', 'system'
);
```

---

## 11. Output Contract

### 11.1 Interface TypeScript canônica

```typescript
/**
 * Resultado da avaliação do Input Quality Gate.
 * Função pura — input determinístico produz output determinístico.
 */
export interface InputQualityGateResult {
  /** Estado emitido pelo gate (ver §2) */
  status:
    | "APPROVABLE"
    | "DRAFT_LOW_CONFIDENCE"
    | "BLOCKED_INPUT_QUALITY"
    | "BLOCKED_CORPUS_QUALITY"
    | "BLOCKED_ELIGIBILITY"
    | "NEEDS_HUMAN_REVIEW";

  /** IQS — score auxiliar 0.0-1.0 (ver §9) */
  iqs_score: number;

  /** Componentes do IQS (rastreabilidade da composição) */
  archetype_quality: number;
  dataset_coverage: number;          // ver §6
  corpus_tag_confidence: number;     // ver §7
  rag_evidence_quality: number;
  eligibility_quality: number;

  /** Resumo dos fallbacks por severidade */
  fallback_summary: {
    info_count: number;
    critical_count: number;
    regulated_count: number;
    unknown_count: number;
    items: Array<{
      identifier: string;          // ex.: "NCM 1201"
      severity: FallbackCriticality;
      reason: string;
      is_relevant_to_is: boolean;  // §5.2.c — fallback em código IS-relevante
    }>;
  };

  /** Resumo da elegibilidade dos riscos */
  eligibility_summary: {
    total_risks: number;
    allowed: number;
    downgraded: number;            // ver §10 — downgrades auditáveis
    discarded: number;             // riscos_indesejados (§8.5)
    by_reason: Record<EligibilityReason, number>;
  };

  /** Lista de downgrades auditáveis (visíveis ao usuário) */
  downgraded_risks: DowngradeAuditRecord[];

  /** Issues detectadas no corpus (chunks com tags inconsistentes) */
  corpus_issues: Array<{
    chunk_id: string;
    issue: "tag_mismatch" | "missing_anchor" | "missing_requirement_id";
    detail: string;
  }>;

  /** Issues de eligibility por risco */
  eligibility_issues: Array<{
    risk_id: string;
    reason: EligibilityReason;
    detail: string;
  }>;

  /** Razões que tornaram a matriz não-aprovável (vazio se status=APPROVABLE) */
  blocking_reasons: string[];

  /** Avisos não-bloqueantes (visibilidade no DRAFT_LOW_CONFIDENCE) */
  warnings: string[];

  /** Ações que o usuário (ou equipe SOLARIS) deve tomar */
  required_actions: string[];

  /** Metadata de auditoria */
  audit: {
    archetype_version: string;     // ex.: "m1-v1.1.0"
    perfil_hash: string;           // sha256:...
    rules_hash: string;            // sha256:...
    evaluated_at: string;          // ISO-8601
    evaluator_version: string;     // "iqg-v0.1.0"
  };
}
```

### 11.2 Tipos auxiliares

```typescript
type EligibilityReason =
  | "sujeito_passivo_incompativel"
  | "operation_type_ausente"
  | "operation_type_desconhecido"
  | "agro_requer_revisao";

interface FallbackItem {
  identifier: string;
  severity: FallbackCriticality;
  reason: string;
  is_relevant_to_is: boolean;
}
```

### 11.3 Invariantes do output

| Invariante | Verificação |
|---|---|
| `status === "APPROVABLE"` ⟹ `blocking_reasons.length === 0` | hard |
| `status` em `BLOCKED_*` ⟹ `blocking_reasons.length >= 1` | hard |
| `eligibility_summary.allowed + downgraded + discarded === total_risks` | hard |
| `0 <= iqs_score <= 1` | hard |
| `0 <= dataset_coverage <= 1` | hard |
| `0 <= corpus_tag_confidence <= 1` | hard |
| `audit.perfil_hash` é o mesmo do snapshot M1 do projeto | hard (rastreabilidade) |
| Cada item em `downgraded_risks` tem `visible_to_user === true` | hard (anti-silêncio) |

---

## 12. Integração no fluxo E2E

### 12.1 Pontos de execução do gate

O gate **roda mais de uma vez** ao longo do fluxo (re-avaliação a cada nova evidência):

| # | Quando | Onde | Estado mínimo aceito para prosseguir |
|---|---|---|---|
| **G-1** | Após confirmação do arquétipo (STEP 1.5) | `ConfirmacaoPerfil.tsx` mount | `APPROVABLE`, `DRAFT_LOW_CONFIDENCE`, `NEEDS_HUMAN_REVIEW` |
| **G-2** | Antes de gerar briefing (STEP 4 mount) | `briefingEngine.ts` start | qualquer ≠ `BLOCKED_*` |
| **G-3** | Antes de gerar gaps | `gapEngine.ts` entry | qualquer ≠ `BLOCKED_*` |
| **G-4** | Após geração de matriz de riscos (STEP 5 useEffect) | `risksV4.generateRisks` post-process | resultado armazenado em `input_quality_gate_evaluations` |
| **G-5** | Antes de aprovação de plano (STEP 6) | `ActionPlanPage.tsx` approve | `APPROVABLE` ou `DRAFT_LOW_CONFIDENCE` (com modal) |

### 12.2 Persistência (schema completo)

Cada execução do gate grava resultado em tabela `input_quality_gate_evaluations`. **Append-only**: nunca sobrescrever avaliação; rollback gera nova avaliação.

```sql
CREATE TABLE input_quality_gate_evaluations (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_id               INT NOT NULL,
  archetype_hash           VARCHAR(80) NOT NULL,    -- perfil_hash do snapshot M1
  rules_hash               VARCHAR(80) NOT NULL,    -- rules_hash do manifesto M1
  gate_status              VARCHAR(50) NOT NULL,    -- APPROVABLE / BLOCKED_* / etc.
  iqs_score                DECIMAL(5,4) NOT NULL,
  archetype_quality        DECIMAL(5,4) NOT NULL,
  dataset_coverage         DECIMAL(5,4) NOT NULL,
  corpus_tag_confidence    DECIMAL(5,4) NOT NULL,
  rag_evidence_quality     DECIMAL(5,4) NOT NULL,
  eligibility_quality      DECIMAL(5,4) NOT NULL,
  fallback_summary_json    JSON NOT NULL,
  corpus_issues_json       JSON NOT NULL,
  eligibility_issues_json  JSON NOT NULL,
  downgraded_risks_json    JSON NOT NULL,
  blocking_reasons_json    JSON NOT NULL,
  required_actions_json    JSON NOT NULL,
  evaluated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  evaluator_version        VARCHAR(20) NOT NULL,    -- ex.: "iqg-v0.1.0"
  gate_point               ENUM('G-1','G-2','G-3','G-4','G-5') NOT NULL,

  INDEX idx_project_evaluated (project_id, evaluated_at),
  INDEX idx_gate_status (gate_status),
  INDEX idx_archetype_hash (archetype_hash),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

**Política append-only:**
- Nunca executar `UPDATE` sobre linha existente
- Nunca executar `DELETE` sobre avaliação histórica
- Rollback de estado = nova linha com `gate_status="rolled_back"` + referência cruzada

**Índices mínimos obrigatórios:**
- `(project_id, evaluated_at)` — listagem cronológica por projeto
- `(gate_status)` — filtros de painel administrativo
- `(archetype_hash)` — comparação cross-projetos com mesmo arquétipo

### 12.3 Comportamento de re-avaliação

- Se G-1 retorna `APPROVABLE` mas G-4 retorna `BLOCKED_ELIGIBILITY` → matriz é descartada; usuário vê motivo
- Se G-4 retorna `DRAFT_LOW_CONFIDENCE` → G-5 exige justificativa textual obrigatória do P.O. para aprovar planos
- O gate **não recomputa** estados anteriores; cada ponto avalia o estado vigente

### 12.4 Integração com FLOW_DICTIONARY

Adicionar à seção "Integrações críticas":

```
| STEP 1.5 (Perfil) | Gate G-1 | mount confirma | A IMPLEMENTAR |
| STEP 4 (Briefing) | Gate G-2 | start engine | A IMPLEMENTAR |
| STEP 5 (Risk Dashboard) | Gate G-4 | post-generateRisks | A IMPLEMENTAR |
| STEP 6 (Action Plan) | Gate G-5 | approve plan | A IMPLEMENTAR |
```

---

## 13. Aplicação ao caso Agro Soja (Projeto 2001) — caso piloto, NÃO prova do método

> ⚠️ **Importante:** Agro Soja é **caso piloto**, não prova final do método. A acurácia 98% só é demonstrável contra **gold set por família de arquétipo** (§17), não contra um caso isolado.

### 13.1 Estado HOJE (sem dataset/corpus expandidos)

**Arquétipo (M1 runner — verificado empiricamente em 2026-04-25):**

```json
{
  "objeto": ["bens_mercadoria_geral"],   // ← FALLBACK GENÉRICO
  "papel_na_cadeia": "fabricante",
  "tipo_de_relacao": ["producao", "venda"],
  "territorio": ["nacional"],
  "regime": "lucro_presumido",
  "subnatureza_setorial": [],            // não-regulado
  "derived_legacy_operation_type": "agronegocio",
  "status_arquetipo": "confirmado",
  "blockers_triggered": [
    { "id": "V-10-FALLBACK", "severity": "INFO",
      "rule": "NCM 1201 não mapeado no dataset" }
  ]
}
```

**Avaliação do gate G-1:**

| Critério | Valor | Pass? |
|---|---|---|
| C-01 status_arquetipo === "confirmado" | ✅ | pass |
| C-02 hard_block_count === 0 | ✅ | pass |
| C-03 lc_conflict_count === 0 | ✅ | pass |
| C-04 fallback_count_critical === 0 | ❌ NCM 1201 é primeiro NCM (crítico §5.2.a) — `CRITICAL` | **fail** |
| C-05 dataset_coverage >= 0.98 | ❌ NCMs principais: 0/1 mapeados → coverage estimado ≈ 0.70 | **fail** |
| C-06 corpus_tag_confidence | (depende do RAG real — não medido aqui) | n/a |

**Estado emitido HOJE:** `DRAFT_LOW_CONFIDENCE` (por C-04 + C-05; sem violar elegibilidade nem corpus quality)

### 13.2 Estado após patch corpus em staging

- Corpus revisado: arts. 138, 163, 164, 165, 166, 168 LC 214/2025 indexados com `cnaeGroups: ["01xx-agropecuária"]`
- Tags de chunks incompatíveis corrigidas (ex.: chunks IS removidos da recuperação para projeto agro)
- **Resultado:** `corpus_tag_confidence` melhora de ≈0.85 → ≈0.98
- **Estado emitido:** ainda `DRAFT_LOW_CONFIDENCE` se NCM 1201 permanecer ausente do dataset (C-04 + C-05 ainda falhando)

### 13.3 Estado após NCM validated + corpus corrigido + gold set smoke aprovado

- NCM 1201 adicionado ao Decision Kernel com regime apropriado
- Corpus corrigido (§13.2)
- Smoke gold set v0 aprovado (mínimo 5 casos da família `agro_produtor_commodity` validados)
- **Resultado:** todos C-01..C-15 podem passar
- **Estado emitido:** **candidato a `APPROVABLE`** (ainda sujeito a C-13 por categoria, IQS ≥ 0.85, etc.)

### 13.4 Quadro evolutivo

| Fase | NCM 1201 | Corpus | Gold set | Estado esperado |
|---|---|---|---|---|
| HOJE | ausente | tags potencialmente erradas | inexistente | `DRAFT_LOW_CONFIDENCE` |
| Após patch corpus | ausente | tags corrigidas | inexistente | `DRAFT_LOW_CONFIDENCE` |
| Após NCM validated | presente | corrigidas | smoke v0 ok | candidato a `APPROVABLE` |
| Após gold set v1 | presente | corrigidas | v1 (15+ casos agro) | `APPROVABLE` empiricamente validado |

---

## 14. Critérios de aceite

A implementação do Input Quality Gate só é considerada **completa** se demonstrar empiricamente:

### 14.1 Casos de teste obrigatórios

| ID | Cenário | Estado esperado | Razão |
|---|---|---|---|
| **AC-01** | Transportadora → LLM gera IS por descuido | matriz NÃO contém risco IS aprovado; downgrade auditável → `enquadramento_geral` (visível) | gate eligibility filtra |
| **AC-02** | Agro soja → LLM gera IS por keyword "combustível" em chunk irrelevante | risco IS sofre downgrade auditável; matriz pode ser `APPROVABLE` se demais critérios passam | gate eligibility filtra |
| **AC-03** | Telecom com fallback NBS regulado | matriz nunca em `APPROVABLE` automático; estado `NEEDS_HUMAN_REVIEW` | §5 `REGULATED` |
| **AC-04** | Risco gerado sem `gap_id` | matriz inteira em `BLOCKED_INPUT_QUALITY` | C-08 viola RN-RISK-05 |
| **AC-05** | Plano gerado para risco categoria=`oportunidade` | plano nunca criado (RN-AP-09 invariante) — gate detecta e bloqueia se aparecer | invariante engine v4 |
| **AC-06** | Requisito sem `source_reference` no RAG | requisito não vira pergunta; coverage < 1.00; gate em `BLOCKED_INPUT_QUALITY` | invariante CLAUDE.md content engine §1 |
| **AC-07** | Chunk com `cnaeGroups=["64xx-financeiro"]` em projeto agro | `corpus_tag_confidence` cai abaixo de 0.98; estado `BLOCKED_CORPUS_QUALITY` | §7.6 |
| **AC-08** | NCM 27xx (combustível IS-relevante) ausente do dataset em projeto industrial | `BLOCKED_INPUT_QUALITY` (§5.4) | IS + fallback é incompatível |
| **AC-09** | Projeto sem nenhum NCM/NBS (puro serviço com cnae_principal apenas) | gate considera `dataset_coverage=1.00` (n/a numerador) | §6.4 edge case |
| **AC-10** | IQS < 0.85 com demais critérios passando | estado `DRAFT_LOW_CONFIDENCE` | C-15 |
| **AC-11** | ≥30% riscos com downgrade auditável | estado escala para `NEEDS_HUMAN_REVIEW` | §10.3 |
| **AC-12** | Downgrade ocorrido com `visible_to_user=false` | falha de teste — invariante quebrada | §10 anti-silêncio |

### 14.2 Smoke test E2E (a definir em ADR de implementação)

- Projeto Soja Cerrado real → matriz gerada → gate avaliado → estado documentado em audit
- Projeto Telecom real → matriz com `REGULATED_FALLBACK` → estado `NEEDS_HUMAN_REVIEW`
- Projeto fictício "transportadora com IS errado" → estado `BLOCKED_ELIGIBILITY` (downgrade auditável visível)

### 14.3 Regressão multi-arquétipo (gold set)

Validação macro contra gold set por família (§17):

- ≥ 95% acurácia em `transportador_combustiveis` (não pode dar IS a transportador)
- ≥ 95% acurácia em `agro_produtor_commodity` (não pode dar IS a soja)
- ≥ 90% acurácia em `operadora_regulada_telecom` (deve ir para NEEDS_HUMAN_REVIEW se NBS ausente)
- ≥ 95% acurácia em `servico_financeiro`
- ≥ 95% acurácia em `saude_regulada`
- ≥ 95% acurácia em `combustivel_fabricante_refinaria` (deve aceitar IS com warnings)

---

## 15. Tabela de regras consolidada

| Regra | Origem | Tipo | Verificação |
|---|---|---|---|
| **R-IQG-01** | C-01..C-04 | hard | arquétipo confirmado, sem hard_block, sem conflito C1-C6, sem critical/unknown fallback |
| **R-IQG-02** | C-05 | hard | dataset_coverage ≥ 0.98 |
| **R-IQG-03** | C-06 | hard | corpus_tag_confidence ≥ 0.98 |
| **R-IQG-04** | C-07..C-10 | hard | cadeia Requisito→Gap→Risco→Plano íntegra (gap_id, requirement_id, source_reference, anchor_id obrigatórios) |
| **R-IQG-05** | C-11..C-12 | hard | nenhum risco com `eligibility.allowed=false` aprovado |
| **R-IQG-06** | §5.4 | hard | `imposto_seletivo` + qualquer fallback crítico = `BLOCKED_INPUT_QUALITY` |
| **R-IQG-07** | §5.1 (REGULATED) | hard | `REGULATED` força `NEEDS_HUMAN_REVIEW` |
| **R-IQG-08** | C-13 | hard | `rag_validated_pct ≥ category_threshold` (§7.4) |
| **R-IQG-09** | C-14 | hard | `briefing.coverage === 1.00` (todos requisitos cobertos) |
| **R-IQG-10** | C-15 | hard (v0.1) | `iqs_score ≥ 0.85` |
| **R-IQG-11** | §10.3 | hard | `downgraded_risks / total >= 0.30` força `NEEDS_HUMAN_REVIEW` |
| **R-IQG-12** | §12 | hard | gate roda em G-1, G-2, G-3, G-4, G-5 sem exceção |
| **R-IQG-13** | §10.1 | hard | todo downgrade tem `visible_to_user=true` (sem silêncio) |
| **R-IQG-14** | §17 | hard | persistência append-only — nunca update/delete |

---

## 16. Pseudo-código consolidado

```typescript
// server/lib/input-quality-gate.ts (a criar — função pura)

import type { Arquetipo } from "../archetype/types";
import type { RiskV4 } from "../risk-engine-v4/types";
import { isCategoryAllowed } from "../risk-eligibility";
import { lookupNcm, lookupNbs } from "../decision-kernel/engine";

export function evaluateInputQualityGate(
  archetype: Arquetipo,
  seed: Seed,
  ragChunks: readonly RagChunk[],
  risks: readonly RiskV4[],
  briefingCoverage: number,
): InputQualityGateResult {
  const blocking_reasons: string[] = [];
  const warnings: string[] = [];
  const required_actions: string[] = [];
  const downgraded_risks: DowngradeAuditRecord[] = [];

  // ── ETAPA 1 — INPUT QUALITY ──────────────────────────────────
  if (archetype.status_arquetipo !== "confirmado") {
    blocking_reasons.push("R-IQG-01: arquétipo não confirmado");
    return buildResult("BLOCKED_INPUT_QUALITY", ...);
  }
  if (countHardBlocks(archetype) > 0) {
    blocking_reasons.push("R-IQG-01: hard_block_count > 0");
  }
  if (countLcConflicts(archetype) > 0) {
    blocking_reasons.push("R-IQG-01: lc_conflict_count > 0");
  }

  const fallbackSummary = classifyFallbacks(archetype, seed);
  if (fallbackSummary.unknown_count > 0) {
    blocking_reasons.push("R-IQG-01: fallback UNKNOWN detectado");
    return buildResult("BLOCKED_INPUT_QUALITY", ...);
  }

  // R-IQG-06: IS + critical fallback
  const hasIsRiskCategory = risks.some(r => r.category === "imposto_seletivo");
  const hasIsRelevantFallback = fallbackSummary.items.some(f => f.is_relevant_to_is);
  if (hasIsRiskCategory && hasIsRelevantFallback) {
    blocking_reasons.push("R-IQG-06: IS com fallback crítico");
    return buildResult("BLOCKED_INPUT_QUALITY", ...);
  }

  const datasetCov = computeDatasetCoverage(seed, archetype);
  if (datasetCov < 0.85) {
    blocking_reasons.push(`R-IQG-02: dataset_coverage ${datasetCov.toFixed(2)} < 0.85`);
    return buildResult("BLOCKED_INPUT_QUALITY", ...);
  }

  // ── ETAPA 2 — CORPUS QUALITY ─────────────────────────────────
  const corpusConf = computeCorpusTagConfidence(ragChunks, archetype);
  if (corpusConf < 0.85) {
    blocking_reasons.push(`R-IQG-03: corpus_tag_confidence ${corpusConf.toFixed(2)} < 0.85`);
    return buildResult("BLOCKED_CORPUS_QUALITY", ...);
  }

  // ── ETAPA 3 — CHAIN INTEGRITY ────────────────────────────────
  const chainBroken = risks.filter(r =>
    !r.gap_id || !r.source_reference || !r.anchor_id
  );
  if (chainBroken.length > 0) {
    blocking_reasons.push(`R-IQG-04: ${chainBroken.length} riscos com cadeia quebrada`);
    return buildResult("BLOCKED_INPUT_QUALITY", ...);
  }

  // ── ETAPA 4 — ELIGIBILITY (downgrade auditável) ──────────────
  const eligibilityResult = evaluateEligibilityWithAudit(risks, archetype);
  downgraded_risks.push(...eligibilityResult.downgrades);

  // R-IQG-11: escalation por % downgrade
  if (eligibilityResult.downgrades.length / risks.length >= 0.30) {
    return buildResult("NEEDS_HUMAN_REVIEW", ...);
  }
  if (eligibilityResult.discarded > 0) {
    blocking_reasons.push("R-IQG-05: riscos com eligibility.allowed=false detectados");
    return buildResult("BLOCKED_ELIGIBILITY", ...);
  }

  // ── ETAPA 5 — APPROVABILITY ──────────────────────────────────
  if (briefingCoverage < 1.00) {
    blocking_reasons.push("R-IQG-09: briefing coverage < 100%");
  }

  const categoryFails = checkRagValidatedByCategory(risks);
  if (categoryFails.length > 0) {
    warnings.push(...categoryFails);
  }

  // ── IQS auxiliar ─────────────────────────────────────────────
  const iqs = computeIqsScoreV01(archetype, datasetCov, corpusConf, risks, eligibilityResult);

  // ── ETAPA 6 — DRAFT / NEEDS_HUMAN_REVIEW / APPROVABLE ────────
  if (fallbackSummary.regulated_count > 0) {
    return buildResult("NEEDS_HUMAN_REVIEW", ...);
  }
  if (fallbackSummary.critical_count > 0 || datasetCov < 0.98 ||
      corpusConf < 0.98 || iqs < 0.85) {
    return buildResult("DRAFT_LOW_CONFIDENCE", ...);
  }

  return buildResult("APPROVABLE", ...);
}
```

---

## 17. Exit Criteria por Fase (rollout faseado)

A implementação do IQG segue **6 fases** com critérios objetivos para cada transição. Nenhuma fase avança sem todos os critérios da fase atual atendidos.

### 17.1 Fase 0 — Especificação (atual)

**Saída para Fase 1:**
- ✅ SPEC `INPUT-QUALITY-GATE-M2.md` aprovada (v1.1.0 ou superior)
- ⏳ SPEC `GOLD-SET-ARCHETYPE-SPEC-v1.md` aprovada (a criar)
- ⏳ Gold set smoke v0 com **mínimo 5 casos** entregue
- ⏳ SPEC `CORPUS-MUTATION-PROTOCOL-v1.md` aprovada (a criar)
- ⏳ **Nenhum SQL/dataset executado** até aqui

### 17.2 Fase 1 — Observe-only (sem enforcement)

Implementação inicial roda em **modo observe-only** — gate avaliado, resultado persistido, mas **nenhum bloqueio** aplicado ao fluxo do usuário.

**Saída para Fase 2:**
- ✅ Modo OBSERVE_ONLY rodou por **30 dias** OU **30 projetos** (o que vier primeiro)
- ✅ **Zero falso positivo crítico** no smoke set v0 (5 casos)
- ✅ Relatório P.O. emitido com distribuição de estados observados
- ✅ **Nenhuma regressão** nos arquétipos de famílias críticas: Transportadora, Agro, Telecom, Financeiro, Saúde

### 17.3 Fase 2 — Enforcement P0 apenas (hard gates)

Apenas hard gates de eligibility e integridade da cadeia são enforced. IQS continua observando.

**Saída para Fase 3:**
- ✅ Enforcement P0 aplicado em **pelo menos 15 projetos**
- ✅ **Zero bloqueio indevido** confirmado pelo P.O./jurídico (audit review)
- ✅ Todos os downgrades **auditáveis** e visíveis na UI (R-IQG-13 verificado)
- ✅ Logs do gate **completos** (todos campos do schema §12.2 populados)

### 17.4 Fase 3 — IQS observado em volume

IQS calculado para todo projeto, dados acumulam para análise.

**Saída para Fase 4:**
- ✅ IQS calculado em **pelo menos 50 projetos**
- ✅ **Distribuição de IQS** documentada (histograma, percentis)
- ✅ **Correlação** entre IQS e gold set analisada (estatística + qualitativa)
- ✅ Pesos v0.1 `[0.20, 0.25, 0.25, 0.20, 0.10]` revisados — manter ou propor v0.2

### 17.5 Fase 4 — Calibração formal

Pesos e thresholds são revisados contra gold set v1.

**Saída para Fase 5:**
- ✅ Pesos calibrados contra **gold set v1** (mínimo 15 casos por família × 6 famílias = 90+ casos)
- ✅ Thresholds aprovados pelo P.O. (formal)
- ✅ Matriz de regressão multi-arquétipo aprovada (todas as 6 famílias)
- ✅ Plano de rollout gradual aprovado (% projetos → 100%)

### 17.6 Fase 5 — Rollout completo

**Critérios contínuos:**
- ✅ Rollout gradual com observabilidade ativa (canary 10% → 50% → 100%)
- ✅ Procedimento de **rollback documentado** (volta a Fase 2 enforcement)
- ✅ Alertas automáticos funcionando (Slack/email — equipe SOLARIS)

---

## 18. Gold Set Operacional — famílias por arquétipo

Acurácia 98% **só é demonstrável contra gold set por família de arquétipo**. Esta seção define a estrutura operacional.

### 18.1 Unidade de avaliação

**Decisão avaliável**, NÃO projeto. Um projeto pode conter múltiplas decisões (gerar/aprovar risco X; classificar gap Y; aceitar plano Z), cada uma é uma unidade de avaliação contra ground truth.

### 18.2 Volumes mínimos por versão do gold set

| Versão | Tamanho mínimo | Decisões avaliadas (proxy) |
|---|---|---|
| **smoke v0** | 5 casos | ~25 decisões |
| **v1** | 15 casos | ~75 decisões |
| **v2** | 50+ casos OU 200+ decisões avaliadas | — |

### 18.3 Famílias iniciais (6)

Cada família terá seu próprio gold set:

| Família | Identificador canônico | Casos críticos cobertos |
|---|---|---|
| Transportador de combustíveis | `transportador_combustiveis` | NÃO pode receber IS apesar de carregar combustível |
| Produtor agro de commodity | `agro_produtor_commodity` | NÃO pode receber IS para soja in natura |
| Operadora regulada telecom | `operadora_regulada_telecom` | DEVE ir para NEEDS_HUMAN_REVIEW se NBS ausente |
| Serviço financeiro | `servico_financeiro` | NBS regime_especial mapeado; órgão regulador BCB/CVM/SUSEP |
| Saúde regulada | `saude_regulada` | NBS regime_especial 1.0910; órgão ANS |
| Combustível fabricante/refinaria | `combustivel_fabricante_refinaria` | DEVE aceitar IS com warnings sugeridos |

### 18.4 Estrutura mínima de cada caso de gold set

```yaml
case_id: "GS-AGRO-001"
family: "agro_produtor_commodity"
input:
  cnae: "0115-6/00"
  ncms: ["1201.90.00"]
  nbss: []
  fontes_receita: ["Producao propria", "Venda de mercadoria"]
  posicao: "Produtor/fabricante"
  regime: "Lucro Presumido"
ground_truth_decisions:
  - decision_id: "D-1"
    type: "risk_category_classification"
    expected: "regime_diferenciado"
    forbidden: ["imposto_seletivo"]
  - decision_id: "D-2"
    type: "matrix_status"
    expected_states: ["DRAFT_LOW_CONFIDENCE", "APPROVABLE"]
    forbidden_states: ["BLOCKED_ELIGIBILITY"]
metadata:
  validated_by: "P.O. + jurídico"
  validated_at: "2026-04-26"
  source_reference: "LC 214/2025 art. 138, 163-168"
```

### 18.5 Spec separada

Gold set tem spec própria: `GOLD-SET-ARCHETYPE-SPEC-v1.md` (a criar). Esta SPEC apenas referencia volumes, famílias e estrutura mínima.

---

## 19. Governança dos Enums de Gate

### 19.1 Enums sob governança v1.0

- `CriticalRiskCategory` (§4.1)
- `CentralRequirementType` (§4.2)
- `FallbackCriticality` (§4.3)

### 19.2 Regra inviolável

> **Enums incompletos são risco P1, mas enum aberto sem governança é risco P0.**

Valores atuais são **v1.0 congelados**. Qualquer adição/remoção/renomeação exige **Change Request formal**.

### 19.3 Conteúdo obrigatório do Change Request

Toda CR deve conter:

1. **Justificativa jurídica/técnica** — base normativa (lei/regulamento) ou requisito técnico que motiva a mudança
2. **Impacto em gold set** — quais casos do gold set são afetados; quais novos casos precisam ser criados
3. **Impacto em IQG** — quais hard gates / regras (R-IQG-XX) mudam comportamento; quais thresholds podem precisar recalibração
4. **Teste de regressão** — matriz de testes mostrando que famílias existentes não regridem
5. **Plano de migração** — se aplicável (renomeação ou remoção)

### 19.4 Aprovação

- **Desenvolvedor (Manus / Claude Code) NÃO pode adicionar valor diretamente**
- Aprovação obrigatória: **P.O. + jurídico (ou Orquestrador, conforme delegação)**
- Aprovação registrada em ADR dedicado da CR

### 19.5 Versionamento

Cada CR aprovada incrementa:
- v1.0 → v1.1 (adição compatível, não remove valores)
- v1.x → v2.0 (mudança breaking — remoção/renomeação)

Versão do enum referenciada no `evaluator_version` (ex.: `iqg-v0.1.0+enum-v1.0`).

---

## 20. Mecanismo de Disparo da Calibração

A calibração dos pesos do IQS, dos thresholds e das tabelas de incompatibilidade tag×arquétipo é **disparada automaticamente** quando ao menos um trigger é satisfeito.

### 20.1 Triggers automáticos

| ID | Condição | Significado |
|---|---|---|
| **T-CAL-A** | 24 de 30 projetos avaliados desde a última calibração | massa crítica de dados acumulada |
| **T-CAL-B** | 24 de 30 dias em modo observe-only desde a última calibração | tempo decorrido suficiente para detecção de drift |
| **T-CAL-C** | Gold set v1 entregue (15+ casos por família) | base empírica disponível |
| **T-CAL-D** | > 50% dos projetos em `NEEDS_HUMAN_REVIEW` na janela móvel de 7 dias | sinal de excesso de bloqueio — calibração urgente |

### 20.2 Procedimento ao trigger atingido

1. **Sistema emite alerta** (manual ou automático via cron):
   - Slack/email para equipe SOLARIS
   - Item de backlog obrigatório criado em GitHub
2. **Responsável primário:** **P.O.** (decide se calibra agora ou backlog)
3. **Executor técnico:** **Orquestrador** (despacha tarefas) + **Claude Code** (implementa cálculo)
4. **Auditoria/deploy:** **Manus** (audita resultado, valida em staging, deploy gradual)

### 20.3 Output da calibração

- ADR de versão do IQS (ex.: `ADR-XXXX-iqs-v0.2-calibration.md`)
- Novos pesos `[w1, w2, w3, w4, w5]` com justificativa estatística (correlação com gold set)
- Novo threshold C-15 se aplicável
- Atualização de `evaluator_version` em produção
- Backfill opcional: re-avaliar projetos da janela com nova versão para análise comparativa

### 20.4 Periodicidade mínima

Mesmo sem trigger, calibração formal **mínimo a cada 6 meses** após Fase 4 atingida.

---

## 21. Riscos e mitigação

### 21.1 Riscos P0 (críticos — endereçar antes do MVP)

| Risco | Mitigação |
|---|---|
| **P0-01** Threshold `0.98` muito alto inicialmente — quase nenhum projeto consegue `APPROVABLE` | Calibração progressiva: começar com `0.85` em piloto e elevar conforme dataset/corpus amadurecem; expor threshold em config |
| **P0-02** `corpus_tag_confidence` requer indexação correta do corpus existente — pode falhar em massa hoje | Auditoria do corpus RAG ANTES de ativar gate em produção; fixar tags incorretas em sprint dedicada |
| **P0-03** Eligibility table com bug — bloqueia matrizes legítimas | Modo observe-only nas Fase 1-2; ativar enforcement gradual; audit log mandatório |
| **P0-04** `fallback_count_critical` muito sensível pode bloquear projetos viáveis | Expor calibração de "item crítico" (§5.2) em config; permitir override com justificativa P.O. |
| **P0-05** Enum aberto sem governança permite valores arbitrários quebrando hard gates | §19 Change Request obrigatório; P.O. + jurídico aprovam; ADR registra |
| **P0-06** Downgrade silencioso esconde erros sistemáticos | §10 anti-silêncio: invariante `visible_to_user=true`; threshold 30% escala para revisão humana |

### 21.2 Riscos P1 (importantes — pós-MVP)

| Risco | Mitigação |
|---|---|
| **P1-01** Performance — gate roda 5x no fluxo, cada vez carrega corpus inteiro | Cache TTL 1h por `perfil_hash`; invalidação só em mudança de arquétipo |
| **P1-02** `iqs_score` depende de `computeIqsScoreV01` (tarefa paralela em fila) — bloqueia release | Implementar gate sem C-15 inicialmente; adicionar quando layer de IQS chegar |
| **P1-03** Feedback negativo da UI — usuário frustrado com `DRAFT_LOW_CONFIDENCE` frequente | UX explica claramente o motivo + o que fazer; escalável via `required_actions[]` |
| **P1-04** Pesos v0.1 do IQS não correlatos com sucesso real | Calibração formal §20 após gold set v1; correlação estatística obrigatória |
| **P1-05** Famílias do gold set incompletas — alguns arquétipos sem cobertura | Roadmap explícito de novas famílias; CR para adição de família |

### 21.3 Riscos P2 (menores — backlog)

| Risco | Mitigação |
|---|---|
| **P2-01** Falsos positivos no detector de tag inconsistente (§7.6) | Heurística começa conservadora; logs analisados manualmente em piloto |
| **P2-02** `BLOCKED_CORPUS_QUALITY` pode esconder problema real do usuário se for raro | sempre exibir motivo + canal de contato P.O. |
| **P2-03** Schema append-only cresce indefinidamente | Política de archival após 12 meses (mover para tabela fria); manter índices compactos |

---

## 22. Próximos passos de implementação

### 22.1 Sprint 1 (proposta — MVP do gate em modo observe-only)

1. **ADR-0033** — Decisão arquitetural sobre gate (modo observe-only inicial; threshold inicial; pontos G-1 a G-5)
2. **Migration** — tabela `input_quality_gate_evaluations` (schema completo §12.2)
3. **`server/lib/input-quality-gate.ts`** — função pura `evaluateInputQualityGate(...)` conforme §16
4. **Testes unitários** — cobrir AC-01..AC-12 (§14.1)
5. **Integração G-4** — chamar gate após `risksV4.generateRisks` e gravar resultado (sem enforcement)
6. **UI** — banner por estado em `RiskDashboardV4.tsx` (modo informativo, não-bloqueante)

### 22.2 Sprint 2 (calibração inicial)

7. **Auditoria corpus RAG** — corrigir `cnaeGroups` e `legal_topic` em chunks com tag inconsistente
8. **Expansão dataset Decision Kernel** — adicionar NCMs/NBSs de chapters críticos faltantes (12 — soja; 27 — combustíveis; etc.)
9. **Integração G-1, G-2, G-3, G-5** — todos os pontos de execução
10. **Gold set smoke v0** — 5 casos por família (mínimo 30 casos) + spec `GOLD-SET-ARCHETYPE-SPEC-v1.md`
11. **Calibração thresholds** — ajustar 0.85 → 0.98 conforme pilotos comprovam estabilidade

### 22.3 Sprint 3 (P.O. dashboard + Fase 2 enforcement)

12. **Painel administrativo** — tabela `input_quality_gate_evaluations` com filtros (estado, projeto, motivo)
13. **Métricas agregadas** — % matrizes em cada estado, top motivos de bloqueio, evolução do `dataset_coverage` médio
14. **Alerta automático** — Slack/email para equipe SOLARIS quando volume de `BLOCKED_*` excede limiar
15. **Ativação enforcement P0** — hard gates de eligibility e integridade ligados em produção

### 22.4 Dependências externas

| Dependência | Bloqueia |
|---|---|
| `computeIqsScoreV01()` (tarefa paralela em fila) | C-15 |
| Auditoria corpus RAG | C-06, threshold calibração |
| Expansão dataset Decision Kernel | C-04, C-05 |
| M2 implementação (filtro pré-RAG por arquétipo) | corpus_tag_confidence ganha eficácia |
| ADR-0030 D-6 v1.2 (refinamento eligibility agro) | enriquecimento `agro_requer_revisao` |
| `GOLD-SET-ARCHETYPE-SPEC-v1.md` | Fase 0 → Fase 1 |
| `CORPUS-MUTATION-PROTOCOL-v1.md` | Fase 0 → Fase 1 |

---

## 23. Ligações com artefatos existentes

| Artefato | Relação |
|---|---|
| `server/lib/risk-eligibility.ts` | invocada pelo gate em §8 — fonte de verdade de elegibilidade |
| `server/lib/risk-categorizer.ts` | gate observa categoria antes/depois de eligibility para detectar downgrade |
| `server/lib/archetype/buildPerfilEntidade.ts` | produz arquétipo + blockers consumidos pelo gate em §5 |
| `server/lib/archetype/validateConflicts.ts` | produz `lc_conflict_count` para C-03 |
| `server/lib/decision-kernel/engine/*` | fornece resultados de lookup para `dataset_coverage` em §6 |
| `server/lib/rag-risk-validator.ts` | fornece `rag_validated_pct` para C-13 |
| `server/lib/briefing-quality.ts` + `briefing-confidence-signals.ts` | alimentam C-14 (coverage) e parte do IQS |
| `docs/epic-830-rag-arquetipo/specs/SPEC-RUNNER-RODADA-D.md` | define semântica do M1 consumido pelo gate |
| `docs/epic-830-rag-arquetipo/specs/CONTRATOS-ENTRE-MILESTONES.md` | contrato M1→M2 que este gate materializa |
| `docs/governance/RN_GERACAO_RISCOS_V4.md` | invariantes RN-RISK-05, RN-AP-02, RN-AP-09 que o gate verifica |
| `docs/governance/FLOW_DICTIONARY.md` | atualização a fazer — adicionar G-1..G-5 às integrações críticas |
| `docs/data-quality/GOLD-SET-ARCHETYPE-SPEC-v1.md` | a criar — instrumento de calibração (§18) |
| `docs/data-quality/CORPUS-MUTATION-PROTOCOL-v1.md` | a criar — protocolo de mudança no corpus (Fase 0) |
| `docs/adr/ADR-0030-hotfix-is-elegibilidade-por-operationtype-v1.1.md` | base do hard gate em §8 |

---

## 24. Histórico de versões

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0.0 | 2026-04-25 | Claude Code (diretiva P.O.) | Spec inicial — 6 estados, 15 critérios, 10 ACs, pseudo-código completo. Caso Agro Soja como driver. |
| **1.1.0** | **2026-04-26** | **Claude Code (diretiva Orquestrador, Rodada 3.1)** | **Endurecimento:** (a) Comparação A/B/C/D explicitada (§1); (b) Governança dos Enums v1.0 (§4 + §19); (c) IQS reposicionado como auxiliar v0.1, com pesos sujeitos a calibração (§9); (d) Downgrade Auditável formalizado, sem silêncio (§10); (e) Exit Criteria por 6 fases (§17); (f) Gold Set Operacional com 6 famílias (§18); (g) Mecanismo de Disparo da Calibração com 4 triggers (§20); (h) Schema persistência ampliado e append-only (§12.2); (i) Caso Agro Soja softened como piloto, não prova (§13). |

---

## 25. Constraints respeitados (regras desta Rodada 3.1)

- ✅ Não alterar código (apenas spec)
- ✅ Não alterar dataset
- ✅ Não alterar corpus
- ✅ Não executar SQL
- ✅ Não implementar IQG
- ✅ Não alterar runner
- ✅ Não mexer no PR #847 do runtime M1
- ✅ Não commitar sem aprovação P.O.
- ✅ Trabalhar APENAS em documentação/specs

**FIM.**
