# NCM-OBJETO-LOOKUP — camada de tradução regime → `objeto`

**Status:** DRAFT — aguardando ratificação do P.O.
**Data:** 2026-04-24 (refatorado 2026-04-24 pós-investigação AS-IS)
**Versão:** `ncm-objeto-v1.0.0` (referenciada em CANONICAL-RULES-MANIFEST §3.4 `derivations`)
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — artefato-filho de SPEC-RUNNER-RODADA-D §2.1
**Motivação:** Q-D1 Opção B aprovada — **camada de tradução** sobre o Decision Kernel existente, não lookup novo

## §1. Propósito

Derivar `objeto` (dimensão ADR-0031) a partir do **output do Decision Kernel já em produção** (`server/lib/decision-kernel/engine/ncm-engine.ts` · `lookupNcm()`).

**Princípios vinculantes (P.O. 2026-04-24 · Opção B):**

1. **NÃO criar novo lookup NCM** — reusar `lookupNcm()` existente
2. Consumir o campo `regime` retornado e **traduzir** para valor de `objeto`
3. **Fallback `regime_geral` NÃO é aceito** — dispara `AmbiguityError` → `status_arquetipo = "inconsistente"`
4. Translation layer é **explícita e determinística** — tabela declarativa, não inferência

## §2. Enum de saída `objeto[]` — v1.0.0

14 valores (pós-remoção de `"outros"` em 2026-04-24):

```
["combustivel", "bebida", "tabaco", "alimento", "medicamento",
 "energia_eletrica", "servico_financeiro", "servico_digital", "servico_regulado",
 "bens_industrializados", "bens_mercadoria_geral", "servico_geral",
 "agricola", "pecuario"]
```

Compartilhado com `NBS-OBJETO-LOOKUP.md §2`.

## §3. Contrato da camada de tradução

### §3.1. Assinatura

```ts
function deriveObjetoFromNcm(ncm: string): ObjetoValue {
  // Passo 1: reusa engine existente (NÃO tocar)
  const result = lookupNcm(ncm);
  
  // Passo 2: fallback regime_geral → AmbiguityError (regra 3 do P.O.)
  if (result.regime === "regime_geral") {
    throw new AmbiguityError(
      `NCM ${ncm} retornou fallback regime_geral — categorização objeto indeterminada`
    );
  }
  
  // Passo 3: regime conhecido → traduz via tabela §3.3
  const objeto = REGIME_TO_OBJETO_NCM[result.regime];
  
  if (!objeto) {
    throw new AmbiguityError(
      `Regime '${result.regime}' retornado por lookupNcm não tem tradução definida`
    );
  }
  
  return objeto;
}
```

### §3.2. Reuso do Decision Kernel (AS-IS preservado)

- **Arquivo:** `server/lib/decision-kernel/engine/ncm-engine.ts` — **NÃO TOCAR**
- **Arquivo:** `server/lib/decision-kernel/datasets/ncm-dataset.json` — **NÃO TOCAR** por este artefato (expansão futura via bump dataset em sprint separada)
- **Função:** `lookupNcm(ncm)` retorna `{regime, aliquota, confianca, fonte, ...}` — interface preservada

### §3.3. Tabela de tradução `REGIME_TUPLE_TO_OBJETO_NCM` (v2.0.0 — baseada em dados reais)

**Q-D1 v2 (2026-04-24):** tradução usa **tupla** `(regime, imposto_seletivo, chapter)` onde `chapter = primeiros 2 dígitos do NCM`. Enum `objeto` mantém 14 valores (Ajuste B 2026-04-24).

**Regimes reais confirmados no dataset (medição 2026-04-24):** `aliquota_zero` (12 entries), `condicional` (3), `reducao_60` (4), `regime_geral` (1 real + fallback).

**Tabela de decisão determinística (ordem top-down):**

| # | Regra (entrada) | Saída `objeto` | Observação |
|---|---|---|---|
| R-N-01 | `result.confianca.valor === 0` (pending_validation) | **AmbiguityError** `V-10-PENDING` severity=HARD_BLOCK | Entry pendente jurídico — não usar em produção |
| R-N-02 | `regime == "regime_geral"` AND `confianca.tipo == "fallback"` (NCM fora do dataset) | `bens_mercadoria_geral` + blocker `V-10-FALLBACK` severity=INFO | **Ajuste A 2026-04-24:** fallback NÃO quebra runner; mapeia para genérico com confiança baixa (observabilidade via blocker INFO) |
| R-N-03 | `regime == "regime_geral"` AND `imposto_seletivo == true` AND `chapter == "22"` | `bebida` | 2202.10.00 bebida açucarada confirmed no dataset |
| R-N-04 | `regime == "regime_geral"` AND `imposto_seletivo == true` AND `chapter == "24"` | `tabaco` | (tabela estende conforme dataset cresce) |
| R-N-05 | `regime == "regime_geral"` AND `imposto_seletivo == true` AND `chapter == "27"` | `combustivel` | (aguarda entry NCM 27 com IS=true) |
| R-N-06 | `regime == "aliquota_zero"` AND `chapter ∈ {"04","05"}` | `pecuario` | dataset: 0402, 0405 (laticínios) |
| R-N-07 | `regime == "aliquota_zero"` AND `chapter ∈ {"17","19","20","21"}` | `alimento` | dataset: 1905 (panificação), 1701 (açúcar) |
| R-N-08 | `regime == "aliquota_zero"` AND `chapter == "30"` | `medicamento` | farmacêuticos |
| R-N-09 | `regime == "aliquota_zero"` AND `chapter == "96"` | `bens_mercadoria_geral` | 9619 saúde menstrual (sem categoria melhor no enum v1) |
| R-N-10 | `regime == "condicional"` AND `chapter == "31"` | `agricola` | dataset: 3101 (fertilizantes) |
| R-N-11 | `regime == "reducao_60"` AND `chapter ∈ {"49"}` | `bens_mercadoria_geral` | livros/impressos (tratamento educacional indireto) |
| R-N-12 | `regime == "reducao_60"` AND outros chapters | **AmbiguityError** `V-10-UNMAPPED-TUPLE` severity=HARD_BLOCK | 4 entries reducao_60 no dataset precisam categorização caso-a-caso |
| R-N-13 | Qualquer tupla `(regime, IS, chapter)` fora das regras acima | **AmbiguityError** `V-10-UNMAPPED-TUPLE` severity=HARD_BLOCK | Proteção contra regimes adicionados sem atualizar tradução |

### §3.4. Dúvida vinculada — D-N6 (decisão disambiguação)

**Problema:** tradução `regime → objeto` é **1-para-muitos** para vários regimes (IS cobre 3 categorias; aliquota_zero cobre 2+; regime_diferenciado cobre múltiplos). O Decision Kernel atual (dataset de ~50 NCMs) retorna `regime` mas **não retorna** a categoria específica do objeto.

**3 alternativas propostas:**

- **D-N6-A:** Estender dataset NCM adicionando campo `objeto_canonico` em cada registro. `lookupNcm()` passa a retornar esse campo. Tradução fica trivial (copy)
  - **Pró:** fecha a tradução num único lookup; fonte de verdade = dataset
  - **Contra:** muda interface de `lookupNcm()`; exige bump dataset; carga de maintanância
- **D-N6-B:** Função de tradução consome `(regime, ncm)` — usa 2 primeiros dígitos do NCM (capítulo) para disambiguar quando regime é ambíguo
  - **Pró:** não muda Decision Kernel
  - **Contra:** dupla fonte de verdade (dataset tem regime; translation tem chapter→objeto)
- **D-N6-C:** Para regimes ambíguos, retorna erro `AmbiguityRequiresEnrichment` forçando P.O. resolver pelo caminho A no tempo certo
  - **Pró:** explicito; ganha tempo
  - **Contra:** bloqueia runner v3 até A ou B ser decidido

**Recomendação:** D-N6-A (extensão do dataset com `objeto_canonico`) — fecha a fonte de verdade num lugar, mantém princípio ADR-0031 Princípio 1 (dimensões como fonte de verdade).

**Até D-N6 ser resolvida:** para os regimes ambíguos (R-N-01 a R-N-04), `deriveObjetoFromNcm()` lança `AmbiguityError` (via R-N-99). Runner v3 só funciona se os 51 cenários usarem NCMs cujo regime retornado seja 1-para-1 mapeado.

## §4. Comportamento — 3 classes de saída (Q-D1 v2 + Ajustes A/B 2026-04-24)

### §4.1. Classe 1 — Tradução determinística (caminho feliz)

Tupla `(regime, imposto_seletivo, chapter)` bate em alguma regra R-N-03 a R-N-11 → retorna valor do enum §2 com confiança original do Decision Kernel. **~80% dos casos esperados** quando dataset estiver populado para os cenários da suite.

### §4.2. Classe 2 — Fallback tolerante (Ajuste A 2026-04-24)

**`regime === "regime_geral"` com `confianca.tipo === "fallback"`** (NCM fora do dataset):
- `deriveObjetoFromNcm(ncm)` **NÃO lança `AmbiguityError`**
- Retorna `objeto = "bens_mercadoria_geral"` (valor do enum v1 com 14 valores)
- Emite blocker `{id:"V-10-FALLBACK", severity:"INFO", rule:"NCM <codigo> não mapeado no dataset — categoria genérica bens_mercadoria_geral aplicada com confiança baixa"}`
- `status_arquetipo` **inalterado** (INFO não bloqueia — IS-7)
- Test result do runner: **PASS** (não FAIL)
- **Runner não quebra** com dataset atual (20 NCMs) — gate GO pode passar mesmo com fallback frequente

**Motivação:** runner precisa rodar com dataset como está; AmbiguityError estrito inviabilizaria suite (82% fallback medido). Observabilidade preservada via blocker INFO acumulado para auditoria posterior.

### §4.3. Classe 3 — AmbiguityError (só restringe o necessário)

Três situações disparam HARD_BLOCK → `status_arquetipo=inconsistente`:

- **R-N-01** `pending_validation` (entry existe mas não certificada juridicamente) → `V-10-PENDING`
- **R-N-12** `reducao_60` em chapter sem regra (4 entries aguardando categorização) → `V-10-UNMAPPED-TUPLE`
- **R-N-13** Tupla inédita (regime novo, chapter não previsto) → `V-10-UNMAPPED-TUPLE`

Estas são situações onde fallback mascara problema estrutural real (pending) ou quebra determinismo (tupla nova requer atualização de tabela).

### §4.4. Consequência operacional

| Caso | Impacto | Observabilidade |
|---|---|---|
| Tupla mapeada (caminho feliz) | PASS, objeto correto | `confianca.valor` original |
| NCM fora do dataset | PASS, `bens_mercadoria_geral` genérico | `V-10-FALLBACK` severity INFO |
| pending_validation | FAIL, `status=inconsistente` | `V-10-PENDING` severity HARD_BLOCK |
| Tupla não-mapeada | FAIL, `status=inconsistente` | `V-10-UNMAPPED-TUPLE` severity HARD_BLOCK |

### §4.5. Invariantes

- **I-NCM-1:** `deriveObjetoFromNcm(ncm)` é **total** — retorna sempre valor do enum §2 OU lança `AmbiguityError`. Nunca retorna `undefined`, `null`, ou categoria fora do enum
- **I-NCM-2 (Ajuste A):** `regime_geral + fallback` sempre produz `bens_mercadoria_geral` + `V-10-FALLBACK` severity INFO. **Runner não quebra com dataset sub-dimensionado**
- **I-NCM-3:** Frequência de `V-10-FALLBACK` informa prioridade de expansão do dataset (observabilidade operacional, não erro de spec)

## §5. Cobertura sobre os 51 cenários

### §5.1. Validação obrigatória antes da implementação

Sobre suite v3 populada, verificar para cada NCM seed:
1. `lookupNcm(ncm).regime !== "regime_geral"` (NCM está no dataset)
2. Regime retornado está em `REGIME_TO_OBJETO_NCM` com valor não-ambíguo (pós D-N6)

Se qualquer falha → suite tem NCM incompatível OU lookup precisa expansão OU tradução precisa enriquecimento.

### §5.2. Casos conhecidos (base seeds v2)

| Cenário | NCM(s) | Provável regime (hipótese) | `objeto` (pós D-N6) |
|---|---|---|---|
| S01 Supermercado | 1905, 2105, 2202 | aliquota_zero? regime_diferenciado? | `alimento`, `bebida` |
| S25 Geradora energia | 2716 | regime_diferenciado (energia) | `energia_eletrica` |

Validação depende de D-N6 resolvida + dataset enrichment.

## §6. Versionamento

- **Versão:** `ncm-objeto-v1.0.0` — apenas camada de tradução, sem dependência de dataset version
- **Chave manifesto:** `derivations.objeto_from_ncm = "NCM-OBJETO-LOOKUP.md@v1.0.0"`
- **Coupling com dataset:** tabela §3.3 depende dos regimes válidos no dataset Decision Kernel. Bump dataset pode obrigar bump translation
- **Política de não-migração:** idêntica a artefatos pré-M1 (ADR-0032 §4)

## §7. Testes obrigatórios

### §7.1. Tradução 1-para-1

- **T-N-R1:** NCM com regime válido mapeado → retorna valor de `objeto` correto (1 teste por regime não-ambíguo — pós D-N6)

### §7.2. Comportamento por classe (Ajuste A 2026-04-24)

- **T-F1 (Classe 2 — fallback tolerante):** NCM `"9999"` (fora do dataset) → `objeto = "bens_mercadoria_geral"` + blocker `V-10-FALLBACK` severity INFO → test status = PASS
- **T-F2 (Classe 3 — pending):** NCM com `status = pending_validation` → lança AmbiguityError → `V-10-PENDING` HARD_BLOCK → status=inconsistente → FAIL
- **T-F3 (Classe 3 — tupla nova):** regime + chapter sem regra na tabela → lança AmbiguityError → `V-10-UNMAPPED-TUPLE` HARD_BLOCK → FAIL
- **T-F4:** NCM vazio/null → não dispara classe nenhuma; entra em `missing_required_fields` (SPEC §2.7)

### §7.3. Determinismo

- **T-D1:** mesmo NCM 100× → mesmo `objeto` (propagado da determinismo de `lookupNcm()`)

### §7.4. Cobertura

- **T-S1:** rodar sobre suite v3 (51 cenários) → zero `V-10-UNMAPPED` ativado

## §8. Relação com outras specs

| Spec | Relação |
|---|---|
| `server/lib/decision-kernel/engine/ncm-engine.ts` | Função `lookupNcm()` consumida (NÃO TOCAR) |
| `server/lib/decision-kernel/datasets/ncm-dataset.json` | Fonte de dados consumida indiretamente |
| `NBS-OBJETO-LOOKUP.md` | Artefato-irmão — mesma estrutura para NBS |
| `CANONICAL-RULES-MANIFEST.md` §3.4 | Registra `objeto_from_ncm = NCM-OBJETO-LOOKUP.md@v1.0.0` |
| `DERIVATION-OPERATIONTYPE.md` | Consome `objeto[]` derivado desta função |
| `SPEC-RUNNER-RODADA-D.md` §2.1 | Cita este artefato como tradução oficial |

## §9. Dúvidas pendentes

- **D-N1** — ratificar enum `objeto[]` v1.0.0 (§2) — 14 valores; P.O. pode adicionar/remover
- **~~D-N2~~** — **RESOLVIDA 2026-04-24**: sem fallback `"outros"`
- **D-N3** — refinar `bebida` em `bebida_alcoolica` vs `bebida_nao_alcoolica`? Fica para v1.1
- **D-N4** — bump v1.1 com regimes/NCMs da suite v3 não-cobertos
- **D-N5** — overrides específicos em chapter 27 (gás natural vs petróleo)?
- **D-N6** (NOVA 2026-04-24 · bloqueador de runner) — disambiguação quando regime é 1-para-muitos. Opções A/B/C em §3.4. **Recomendação: A** (extensão dataset)

## §10. Não-escopo

- Modificação do Decision Kernel (`ncm-engine.ts`) — intocado
- Reescrita do dataset NCM — pode ser expansão futura, fora deste artefato
- Integração com categorização de alíquotas em runtime
- Migração de gaps históricos (ADR-0032 §4)

## §11. Status

DRAFT — aguardando:
1. Ratificação P.O. da estrutura translation-layer (§3) + enum §2
2. Decisão D-N6 (disambiguação) — **bloqueadora** do runner v3
3. Validação de cobertura após suite v3 populada (§5.1)

Nenhuma implementação antes dos 3 itens acima.
