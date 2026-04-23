# Crítica — Spec UI "Fluxo da UI para os 15 casos"

> Executado em 2026-04-23 · runner `run-ui-matrix.mjs` · comparação entre a matriz declarada (Seção 3.1) e as regras da Seção 2 + 10 edge cases de combinação.

---

## Veredito

**🟡 AMARELO — spec precisa ajustes antes de virar base para implementação.**

| Eixo | Status |
|---|---|
| Matriz declarada × regras Seção 2 (Interpretação B) | **13/15 OK · 2/15 DIVERGE** (T03, T15) |
| Gatilhos de bloco completos na Seção 2 | **❌ falta gatilho para `possui_regime_especial_negocio`** |
| Regras não-ambíguas | **❌ 4 ambiguidades (ver F4, F7)** |
| Cobertura de blockers na Seção 5 | **❌ 3 blockers implícitos do JSON não estão na Seção 5** |
| Edge cases críticos cobertos | **❌ 6 dos 10 edge cases não têm comportamento definido** |

---

## A — Divergências matriz vs regras (erros)

### E1 — T03 Distribuidora combustíveis: T7 EXT=✓ sem gatilho definido

**Matriz declara:** `T7 EXT/ZFM = ✓`
**Inputs:** `atua_importacao=false`, `atua_exportacao=false`, `opera_territorio_incentivado=false`
**Regras da Seção 2:** "abre se importação/exportação=sim OU território incentivado=sim" — **nenhuma condição satisfeita.**

**Hipótese:** o gatilho implícito é `possui_regime_especial_negocio=true` com `tipo_regime_especial=["Monofasico"]`. Mas isso **não é regra escrita**.

**Comparação com outros casos que também têm `regime_especial=true`:**

| Caso | tipo_regime_especial | Matriz T7 |
|---|---|---|
| T01 Saúde | `["Saude"]` | `-` |
| T02 Farmácia | `["Saude"]` | `-` |
| **T03 Combustíveis** | `["Monofasico", "Transporte regulado"]` | `✓` |
| T05 Fintech | `["Financeiro"]` | `-` |
| T07 Agro | `["Agro especifico"]` | `-` |
| **T12 ZFM** | `["ZFM"]` | `✓` |

**Padrão detectado (não-escrito):** regimes **fiscais** (Monofásico, ZFM) → abrem T7. Regimes **setoriais** (Saúde, Financeiro, Agro específico) → NÃO abrem T7. Distinção importante **não documentada**.

---

### E2 — T15 Logística integrada: REG=- contradiz regra auto

**Matriz declara:** `T6 REG = -`
**Inputs:** `natureza_operacao_principal=["Transporte"]`, `setor_regulado=false`
**Regras da Seção 2:** "natureza setorial = saúde, financeiro, energia, **transporte**, agro → abrir bloco regulatório **mesmo sem inferência livre**"

**A regra literal obriga REG=✓ mas matriz diz REG=-.**

**Resolução possível (Interpretação B "user-first"):** a regra auto só pré-preenche `setor_regulado=true` como sugestão, user pode desmarcar. Se user desmarca, REG não abre.

**Problema:** essa interpretação **não está escrita**. A frase "mesmo sem inferência livre" sugere o contrário (abrir independentemente).

---

## B — Regras faltando na Seção 2

### F1 — Sem gatilho para `possui_regime_especial_negocio=true`

A Seção 2 tem 9 gatilhos. **Nenhum cobre regime especial de negócio.** Mas:

- O campo está em `core_required_fields`
- `conditional_rules` exige `tipo_regime_especial` quando true
- A matriz mostra T7=✓ para regimes fiscais (T03, T12) e REG=✓ para regimes setoriais quando setor_regulado=true

**Gap:** em que tela/bloco o usuário vê e preenche `tipo_regime_especial`? Não há coluna dedicada na matriz.

**Recomendação:** adicionar regra explícita à Seção 2:
- Se `tipo_regime_especial ∈ {Monofasico, ZFM}` → abrir **T7** (território incentivado/regime fiscal)
- Se `tipo_regime_especial ∈ {Saude, Financeiro, Agro, Transporte regulado}` → abrir **T6 REG** (setorial)
- Ou criar bloco dedicado "regimes especiais" com campo multi-select

---

### F2 — Seção 5 (blockers) sub-cobre os `conditional_rules`

A Seção 5 lista 5 blockers. O JSON original tem 10 `conditional_rules`. **3 blockers implícitos do JSON faltam na Seção 5:**

| Regra JSON | Blocker correspondente na Seção 5? |
|---|---|
| `opera_multiplos_estados=true → possui_filial_outra_uf required` | ❌ ausente |
| `possui_filial_outra_uf=true → estrutura_operacao required` | ❌ ausente |
| `opera_territorio_incentivado=true → tipo_territorio_incentivado required` | ❌ ausente (explícito) |
| `possui_regime_especial_negocio=true → tipo_regime_especial required` | ❌ ausente (explícito) |
| `natureza ∈ [Transporte, Agro] OR ops contains Logistica → realiza_operacao_propria_terceiros required` | ❌ ausente |

**Recomendação:** estender Seção 5 para cobrir 100% das `conditional_rules`, ou fazer o JSON ser fonte única e a Seção 5 apontar para ele.

---

## C — Ambiguidades da spec

### F3 — O que é "operação mista/híbrida" (regra CAD)?

Seção 2 diz: "operação mista/híbrida → abrir bloco cadeia/operação específica". **Não define.** Minha derivação testada (que bateu em todos os casos exceto os divergentes):

```
CAD abre se:
  - natureza ∈ {Transporte, Agro, Plataforma digital}  OR
  - atua_como_marketplace_plataforma = true  OR
  - natureza ∈ {Comércio, Energia/Combustíveis}
    AND operacoes_secundarias contém Logistica OR Transporte
```

**Recomendação:** congelar essa definição (ou outra que o P.O. prefira) antes do F1.

---

### F4 — Conflito interpretação "auto-REG" vs "user desmarca"

Seção 2 diz: "natureza setorial = {saúde, financeiro, energia, transporte, agro} → abrir bloco regulatório **mesmo sem inferência livre**". Isso sugere que a natureza força REG. Mas a matriz T15 mostra que user pode desmarcar e REG fica fechado.

**Interpretação A (literal, strict):** natureza ∈ lista → REG abre sempre. `setor_regulado=false` é inconsistente (UX deveria alertar).

**Interpretação B (user-first, loose):** natureza ∈ lista → `setor_regulado` é pré-marcado como sugestão. User pode desmarcar. REG abre só se `setor_regulado=true`.

**Recomendação:** declarar explicitamente **qual interpretação vale**. Se B (parece ser a da matriz), reescrever a regra como:
> "Natureza setorial ∈ {saúde, financeiro, energia, transporte, agro} → **pré-preencher** `setor_regulado=true` (usuário pode desmarcar)."

---

### F5 — Gatilho de `territorial_expandido`: multiestado OU filial?

Spec UI Seção 2: `multiestado = sim → abrir bloco territorial expandido`
JSON conditional: `opera_multiplos_estados=true → possui_filial_outra_uf required` (exige campo, não bloco)
JSON conditional: `possui_filial_outra_uf=true → estrutura_operacao required`

**Reconciliação possível:** bloco abre em `multiestado=true`, exibe a pergunta `possui_filial_outra_uf?`. Se user responde true, campo `estrutura_operacao` fica obrigatório (também no bloco). Consistente com a matriz.

**Status:** funciona mas merece explicitar na spec.

---

## D — Edge cases não cobertos pela spec

Rodei 10 combinações fora dos 15 casos do P.O. Resultados relevantes:

### E01 — Bloqueio multi-CNPJ: grupo + análise ≠ 1 CNPJ

✅ Blocker dispara corretamente. **Mas** spec UI não define:
- Como mostrar o bloqueio? (banner? modal? tela inteira?)
- Usuário pode editar e desfazer? (toggling `analise_1_cnpj_operacional` reabre fluxo)
- Mensagem exata?

Seção 5 tem só uma mensagem genérica. Insuficiente para UX de produto.

### E04 — 3 setores simultâneos (saúde + financeiro + tecnologia)

Input: `natureza=["Saude", "Financeiro", "Tecnologia"]`, setor_regulado=true.

Blocos abertos corretamente. **Mas campos obrigatórios criam conflito:**

| Campo | Cardinalidade | Problema |
|---|---|---|
| `orgao_regulador_principal` | multi ✅ | OK — aceita `["ANS", "BACEN"]` |
| `subnatureza_setorial` | **singular** ❌ | Qual vale? ANS-operadora? BACEN-fintech? |
| `tipo_operacao_especifica` | singular ❌ | Idem |
| `papel_operacional_especifico` | singular ❌ | Idem |

**Recomendação:** converter subnatureza/tipo/papel em multi OU agrupar por órgão regulador (`[{orgao: "ANS", subnatureza: "Operadora", ...}, {orgao: "BACEN", subnatureza: "Fintech", ...}]`).

### E05 — Produto cartesiano: Saúde em ZFM (D9 da EXPLORACAO)

Input: `natureza=["Saude"]`, `tipo_territorio_incentivado="ZFM"`, setor=true, regime_especial=true.

Blocos abertos: REG ✓, EXT ✓, territorial ✓. **Funciona.** Mas:
- Subnatureza setorial = saúde + território ZFM → como o arquétipo consolida?
- `tipo_regime_especial` recebe `["ZFM", "Saude"]` ou só `["ZFM"]`?
- Saída de arquétipo é a soma? Ou pondera? Não está definido.

**Recomendação:** desenhar caso-teste explícito de produto cartesiano e congelar a saída esperada.

### E06 — Usuário com natureza vazia (`[]`)

Nada abre. Conditional rules não disparam. **Mas `status_arquetipo` deveria ficar `incompleto`** porque `natureza_operacao_principal` é campo core obrigatório. A spec UI não define se o gate detecta "campo core vazio mesmo que presente".

**Recomendação:** gate da T8 deve tratar `[]` como ausente para arrays multi obrigatórios.

### E07 — Transporte carga NÃO perigosa (par discriminante de T04)

Mesmo CNAE base (4930-x). Diferença: `subnatureza_setorial = "Carga geral"` (vs "Produtos perigosos" em T04). Todos os outros blocos iguais.

**Questão crítica:** o arquétipo final DEVE sair diferente. Se os dois produzem o mesmo JSON, a hipótese "arquétipo discrimina" falha (critério T5 da §11.4 da EXPLORACAO).

**Saída parcial de T04 (expected_arquetipo_minimo):**
```json
"subnatureza_setorial": "produtos_perigosos"
```
**Saída esperada de E07 (derivada):**
```json
"subnatureza_setorial": "carga_geral"
```

✅ O campo `subnatureza_setorial` leva a diferença. **Confirma que o arquétipo discrimina desde que subnatureza esteja presente.**

### E08 — Regime Monofásico SEM setor regulado nem ZFM

Input: indústria química + `possui_regime_especial_negocio=true`, `tipo_regime_especial=["Monofasico"]`, setor=false, incentivado=false.

**Problema:** nenhum bloco abre para o regime especial. T6 REG=-, T7 EXT=-.
**Mas `tipo_regime_especial` é campo obrigatório condicional.** Onde o usuário preenche?

**Gap explícito na spec.** Campo obrigatório sem local de entrada visível no fluxo.

### E09 — Exportação isolada (só export, sem import)

✅ EXT abre. Consistente com T07 Agro. OK.

### E10 — Marketplace + produto físico (híbrido extremo)

Blocos: NCM ✓, NBS ✓, CAD ✓. Funciona estruturalmente.
**Mas:** o arquétipo final distingue "marketplace puro" de "marketplace com estoque"? A saída `posicao_na_cadeia_economica = "Marketplace/plataforma"` é a mesma para ambos. Perde informação.

**Recomendação:** adicionar campo `opera_estoque_proprio?` quando marketplace=true.

---

## E — Recomendações consolidadas

Em ordem de criticidade:

| # | O que | Prioridade |
|---|---|---|
| R1 | Adicionar regra à Seção 2 para `possui_regime_especial_negocio` (escolher: T7 / T6 REG / novo bloco) | **P0** — gap bloqueante |
| R2 | Decidir Interpretação A ou B da regra "natureza → auto REG" e reescrever | **P0** — ambiguidade bloqueante |
| R3 | Corrigir/justificar T03 na matriz (ou declarar regra que abre T7 para Monofásico) | **P0** — divergência matriz |
| R4 | Corrigir/justificar T15 na matriz (ou declarar interpretação B explicitamente) | **P0** — divergência matriz |
| R5 | Congelar definição formal de "operação mista/híbrida" (regra CAD) | **P1** — ambiguidade |
| R6 | Estender Seção 5 (blockers) para cobrir 100% dos `conditional_rules` | **P1** — UX |
| R7 | Converter `subnatureza_setorial`, `tipo_operacao_especifica`, `papel_operacional_especifico` para multi quando user tem multi-setor | **P1** — edge case E04 |
| R8 | Tratar `[]` como ausente no gate T8 para arrays multi obrigatórios | **P2** — edge case E06 |
| R9 | Adicionar campo discriminante para marketplace com estoque próprio | **P2** — edge case E10 |
| R10 | Definir UX exata do bloqueio multi-CNPJ (banner/modal/tela) | **P2** — UX |

---

## F — O que a spec UI fez certo

Para balancear a crítica:

1. **Fluxo linear base (T1–T8) + blocos condicionais** é mental model correto — spec casa com o padrão atual de `PerfilEmpresaIntelligente.tsx` (operationType → revela NCM/NBS) e escala bem.
2. **Tela 8 como gate final** com visão do arquétipo é estrategicamente certa — resolve o anti-abandono (§12.7) porque o usuário SÓ vê a revisão depois de preencher, não antes.
3. **13/15 casos bateram perfeitamente** com as regras derivadas sob Interpretação B — indica que as regras estão quase corretas, precisam só refinamento nas bordas.
4. **Separação `setor_regulado` × `natureza ∈ lista`** é um padrão de produto interessante (auto-sugestão + override do usuário). Só precisa ser explicitado.
5. **`expected_arquetipo_minimo` por caso** dá ao teste um gabarito determinístico. Boa prática.
6. **Subnatureza como discriminante** (E07) funciona — os dois Transportes saem diferentes mesmo com CNAE igual. Valida a hipótese §11 na borda.

---

## G — Próximo passo sugerido

Gerar **spec UI v2** com:

1. 10 regras na Seção 2 (9 atuais + 1 nova para regime especial)
2. Interpretação B explícita em 2 lugares (auto-REG e auto-subnatureza)
3. Seção 5 expandida com 10 blockers (espelhando JSON)
4. 5 edge cases do §D tratados explicitamente (E04, E05, E06, E08, E10)
5. Novo caso na bateria: **E07 par discriminante** — prova que arquétipo separa transporte perigoso vs carga geral

Após v2, rodar esta bateria de novo. Se passar, a spec está pronta para F1 (criação da SPEC formal do M1).

**Implementação M1 continua SUSPENSA.**
