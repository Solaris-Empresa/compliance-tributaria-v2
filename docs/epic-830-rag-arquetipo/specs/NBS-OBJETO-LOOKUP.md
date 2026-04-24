# NBS-OBJETO-LOOKUP — camada de tradução regime → `objeto` (serviços)

**Status:** DRAFT — aguardando ratificação do P.O.
**Data:** 2026-04-24 (refatorado 2026-04-24 pós-investigação AS-IS)
**Versão:** `nbs-objeto-v1.0.0` (referenciada em CANONICAL-RULES-MANIFEST §3.4 `derivations`)
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — artefato-filho de SPEC-RUNNER-RODADA-D §2.1
**Motivação:** Q-D1 Opção B aprovada — **camada de tradução** sobre o Decision Kernel existente

## §1. Propósito

Derivar `objeto` (dimensão ADR-0031) a partir do output de `server/lib/decision-kernel/engine/nbs-engine.ts` · `lookupNbs()`. Artefato-irmão de `NCM-OBJETO-LOOKUP.md` aplicando mesma estratégia à taxonomia de serviços.

**Princípios vinculantes** — idênticos a NCM-OBJETO-LOOKUP §1:
1. Não criar novo lookup NBS — reusar `lookupNbs()`
2. Consumir `regime` retornado e traduzir
3. Fallback `regime_geral` proibido → `AmbiguityError` → `inconsistente`
4. Translation layer explícita e determinística

## §2. Enum de saída `objeto[]`

Compartilhado com NCM-OBJETO-LOOKUP §2 — 14 valores idênticos.

## §3. Contrato da camada de tradução

### §3.1. Assinatura

```ts
function deriveObjetoFromNbs(nbs: string): ObjetoValue {
  const result = lookupNbs(nbs);
  
  if (result.regime === "regime_geral") {
    throw new AmbiguityError(
      `NBS ${nbs} retornou fallback regime_geral — categorização objeto indeterminada`
    );
  }
  
  const objeto = REGIME_TO_OBJETO_NBS[result.regime];
  
  if (!objeto) {
    throw new AmbiguityError(
      `Regime '${result.regime}' retornado por lookupNbs não tem tradução definida`
    );
  }
  
  return objeto;
}
```

### §3.2. Reuso do Decision Kernel

- **Arquivo:** `server/lib/decision-kernel/engine/nbs-engine.ts` — **NÃO TOCAR**
- **Arquivo:** `server/lib/decision-kernel/datasets/nbs-dataset.json` — **NÃO TOCAR** (expansão futura fora deste artefato)
- **Função:** `lookupNbs(nbs)` com `clampConfiancaNbs()` (máx 98%) — preservada intacta

### §3.3. Tabela de tradução `REGIME_TUPLE_TO_OBJETO_NBS` (v2.0.0 — baseada em dados reais)

**Q-D1 v2 (2026-04-24):** tradução usa **tupla** `(regime, imposto_seletivo, divisao)` onde `divisao = primeiros 4 dígitos do NBS após "1."` (ex.: `"1.1401.10.00"` → `"1.1401"`). Enum `objeto` mantém 14 valores (Ajuste B).

**Regimes reais confirmados no dataset (medição 2026-04-24):** `regime_geral` (8), `reducao_60` (6), `regime_especial` (5), `pending_validation` (1).

**Tabela de decisão determinística (ordem top-down):**

| # | Regra (entrada) | Saída `objeto` | Observação |
|---|---|---|---|
| R-B-01 | `result.confianca.valor === 0` (pending_validation) | **AmbiguityError** `V-10-PENDING` HARD_BLOCK | 1 entry no dataset (1.0906.11.00 — corretagem de seguros) |
| R-B-02 | `regime == "regime_geral"` AND `confianca.tipo == "fallback"` (NBS fora do dataset) | `servico_geral` + blocker `V-10-FALLBACK` INFO | **Ajuste A 2026-04-24:** fallback NÃO quebra runner; mapeia para genérico com confiança baixa |
| R-B-03 | `regime == "regime_especial"` AND `divisao ∈ {"1.0501"}` | `servico_financeiro` | Serviços financeiros (dataset) |
| R-B-04 | `regime == "regime_especial"` AND `divisao ∈ {"1.0601","1.0602"}` | `servico_regulado` | Planos de saúde / ANS (se entries existirem com esta divisão) |
| R-B-05 | `regime == "regime_especial"` AND outras divisoes | **AmbiguityError** `V-10-UNMAPPED-TUPLE` HARD_BLOCK | Subtype não-mapeado |
| R-B-06 | `regime == "regime_geral"` AND `divisao ∈ {"1.1501"}` (confirmado dataset) | `servico_digital` | 1.1501 = consultoria TI (dataset confirmed) |
| R-B-07 | `regime == "regime_geral"` AND outros | `servico_geral` | Default serviços no dataset real |
| R-B-08 | `regime == "reducao_60"` AND `divisao ∈ {"1.09","1.10","1.11"}` | `servico_geral` | Educação — mapeia para servico_geral (enum v1 não tem servico_educacional — Ajuste B) |
| R-B-09 | `regime == "reducao_60"` AND `divisao ∈ {"1.18"}` | `servico_regulado` | Saúde — mapeia para servico_regulado existente |
| R-B-10 | `regime == "reducao_60"` AND outros | **AmbiguityError** `V-10-UNMAPPED-TUPLE` HARD_BLOCK | Outros setores reducao_60 |
| R-B-99 | Qualquer tupla fora das regras | **AmbiguityError** `V-10-UNMAPPED-TUPLE` HARD_BLOCK | Proteção |

### §3.4. Dúvida vinculada — D-B6 (análoga a D-N6)

**Problema:** regimes em NBS ainda menos padronizados que NCM — `servico_regulado` pode cobrir telecom (ANATEL), saúde (ANVISA), energia (ANEEL), saneamento (agências estaduais). Tradução 1-para-1 nem sempre é natural.

**Alternativas:** idênticas a D-N6 de NCM (A: estender dataset com `objeto_canonico`; B: compor com NBS prefix; C: AmbiguityError forçado).

**Recomendação:** D-B6-A (extensão dataset).

**Até D-B6 ser resolvida:** para regimes ambíguos (R-B-03, R-B-05), `deriveObjetoFromNbs()` lança `AmbiguityError`.

## §4. Comportamento — 3 classes de saída (Q-D1 v2 + Ajustes A/B 2026-04-24)

### §4.1. Classe 1 — Tradução determinística

Tupla `(regime, imposto_seletivo, divisao)` bate em R-B-03 a R-B-09 → valor do enum §2. Caminho feliz.

### §4.2. Classe 2 — Fallback tolerante (Ajuste A 2026-04-24)

**`regime === "regime_geral"` com `confianca.tipo === "fallback"`** (NBS fora do dataset):
- `deriveObjetoFromNbs(nbs)` **NÃO lança AmbiguityError**
- Retorna `objeto = "servico_geral"` (valor genérico do enum v1)
- Emite blocker `{id:"V-10-FALLBACK", severity:"INFO", rule:"NBS <codigo> não mapeado no dataset — categoria genérica servico_geral aplicada com confiança baixa"}`
- `status_arquetipo` inalterado
- Test result: **PASS**
- **Runner não quebra** com 89.7% fallback medido na suite v2

### §4.3. Classe 3 — AmbiguityError

Situações que disparam HARD_BLOCK → status_arquetipo=inconsistente:

- **R-B-01** `pending_validation` (1 entry no dataset: 1.0906.11.00) → `V-10-PENDING`
- **R-B-05** `regime_especial` em divisão sem regra (subtype não-mapeado) → `V-10-UNMAPPED-TUPLE`
- **R-B-10** `reducao_60` em setor não-coberto → `V-10-UNMAPPED-TUPLE`
- **R-B-99** Tupla inédita → `V-10-UNMAPPED-TUPLE`

### §4.4. Consequência operacional

| Caso | Impacto | Observabilidade |
|---|---|---|
| Tupla mapeada | PASS, objeto correto | `confianca.valor` (cap 98%) |
| NBS fora do dataset | PASS, `servico_geral` genérico | `V-10-FALLBACK` INFO |
| pending_validation | FAIL, inconsistente | `V-10-PENDING` HARD_BLOCK |
| Tupla não-mapeada | FAIL, inconsistente | `V-10-UNMAPPED-TUPLE` HARD_BLOCK |

### §4.5. Invariantes

- **I-NBS-1:** `deriveObjetoFromNbs(nbs)` é **total** — retorna sempre valor do enum §2 OU lança AmbiguityError
- **I-NBS-2 (Ajuste A):** `regime_geral + fallback` → `servico_geral` + `V-10-FALLBACK` INFO. **Runner não quebra**
- **I-NBS-3:** Frequência de `V-10-FALLBACK` informa expansão futura do dataset NBS

## §5. Cobertura sobre os 51 cenários

Validação idêntica a NCM §5.1 — rodar sobre NBS das seeds v3, verificar cada um:
1. `lookupNbs(nbs).regime !== "regime_geral"`
2. Regime retornado mapeado em `REGIME_TO_OBJETO_NBS` sem ambiguidade

### §5.1. Casos conhecidos (base seeds v2)

| Cenário | NBS(s) | Regime (hipótese) | `objeto` (pós D-B6) |
|---|---|---|---|
| S23 Restaurante | 1.1101.10.00 | servico_geral | `servico_geral` |
| S24 Telecom (ANATEL) | 1.1401.10.00 | servico_regulado (hipótese; pode precisar enriquecimento) | `servico_regulado` |
| S26 Saneamento | 1.2301.10.00 | servico_regulado (hipótese) | `servico_regulado` |
| S27 Holding | 1.1601.10.00 | servico_geral | `servico_geral` |

Depende de D-B6 para regimes ambíguos.

## §6. Versionamento

- **Versão:** `nbs-objeto-v1.0.0` — camada de tradução
- **Chave manifesto:** `derivations.objeto_from_nbs = "NBS-OBJETO-LOOKUP.md@v1.0.0"`
- **Coupling com dataset:** idem NCM §6

## §7. Testes obrigatórios

### §7.1. Tradução 1-para-1

- **T-B-R1..04:** 1 teste por regime não-ambíguo mapeado

### §7.2. Comportamento por classe (Ajuste A 2026-04-24)

- **T-F1 (Classe 2):** NBS `"9.9999.99.99"` (fora do dataset) → `objeto = "servico_geral"` + `V-10-FALLBACK` INFO → PASS
- **T-F2 (Classe 3 — pending):** 1.0906.11.00 → AmbiguityError → `V-10-PENDING` HARD_BLOCK → FAIL
- **T-F3 (Classe 3 — tupla nova):** `regime_especial` em divisão não-mapeada → AmbiguityError → `V-10-UNMAPPED-TUPLE` → FAIL
- **T-F4:** NBS vazio/null → não dispara classe nenhuma; entra em `missing_required_fields` (SPEC §2.7)

### §7.3. Determinismo

- **T-D1:** mesmo NBS 100× → mesmo `objeto`

### §7.4. Cobertura

- **T-S1:** suite v3 → zero `V-10-UNMAPPED`

## §8. Relação com outras specs

| Spec | Relação |
|---|---|
| `server/lib/decision-kernel/engine/nbs-engine.ts` | Função `lookupNbs()` consumida (NÃO TOCAR) |
| `server/lib/decision-kernel/datasets/nbs-dataset.json` | Fonte consumida indiretamente |
| `NCM-OBJETO-LOOKUP.md` | Artefato-irmão |
| `CANONICAL-RULES-MANIFEST.md` §3.4 | Registra `objeto_from_nbs = NBS-OBJETO-LOOKUP.md@v1.0.0` |
| `DERIVATION-OPERATIONTYPE.md` | Consome `objeto[]` |
| `SPEC-RUNNER-RODADA-D.md` §2.1 | Cita este artefato |

## §9. Dúvidas pendentes

- **D-B1** — ratificar enum `objeto[]` v1.0.0 (§2) — 14 valores
- **D-B2** — validação da tabela §3.3 contra regimes reais do dataset NBS (investigação necessária)
- **D-B3** — popular suite v3 com NBSs + validar cobertura (§5)
- **~~D-B4~~** — **RESOLVIDA 2026-04-24**: sem fallback
- **D-B5** — granularidade de `servico_regulado` (sub-categorias por agência?)
- **D-B6** (NOVA 2026-04-24 · bloqueador de runner) — disambiguação de regimes ambíguos. Recomendação: A (extensão dataset)

## §10. Não-escopo

- Modificação do Decision Kernel (`nbs-engine.ts`) — intocado
- Expansão do dataset NBS
- Regra `clampConfiancaNbs()` máx 98% — preservada
- Migração de gaps históricos (ADR-0032 §4)

## §11. Status

DRAFT — aguardando:
1. Ratificação P.O. da estrutura + enum §2
2. D-B6 resolvida — **bloqueadora** do runner v3
3. Investigação dos valores reais de `regime` no dataset NBS (D-B2)
4. Validação cobertura suite v3 (§5)

Nenhuma implementação antes.
