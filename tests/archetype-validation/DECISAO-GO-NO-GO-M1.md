# Decisão GO/NO-GO — M1 Arquétipo de Negócio

> Executado em 2026-04-23 · governado por `REGRA-M1-GO-NO-GO`
> Estado avaliado: suite `M1-arquetipo-go-no-go-brasil-v1` + spec UI v2 (recebida 2026-04-23)
> **Proibições respeitadas:** nenhum código gerado · nenhuma alteração em backend · nenhuma alteração em RAG · nenhuma implementação iniciada.

---

## 🔴 Decisão final: **NO-GO**

As 3 condições obrigatórias apresentam pendências. M1 **não pode iniciar**.

| Condição | Status | Resumo |
|---|---|---|
| **C1** Modelo determinístico | 🔴 FAIL | 6 pendências de explicitude/gaps de UI |
| **C2** Bateria de 15 cenários | 🟡 PARCIAL | 14/15 na rodada A; T03 diverge sob regras v2; 3 ambiguidades semânticas precisam resolver antes de re-rodar |
| **C3** Amarração formulário ↔ testes | 🔴 FAIL | Rule 10 (multi-CNPJ blocker) sem cenário positivo; 2 campos referenciados mas não declarados como UI |

---

## Avaliação detalhada por condição

### C1 — Modelo determinístico do arquétipo

| Subcritério | Status | Evidência |
|---|---|---|
| Todas as regras são explícitas | 🔴 FAIL | 4 ambiguidades não declaradas (N1, N4, N12, R8-regressão) |
| Nenhuma inferência por LLM | 🟢 PASS | LLM só participa da geração de CNAE (fluxo atual preservado, declarado como apoio); todas as demais regras são determinísticas |
| Todos os blocos possuem gatilho definido | 🟡 PARCIAL | `CADEIA_OPERACIONAL` no v2 novo não tem `required_fields` — bloco abre mas exibe o quê? |
| Nenhum campo obrigatório fica sem UI | 🔴 FAIL | `possui_filial_outra_uf` é referenciado em `conditional_required` mas não declarado como campo do bloco; `tipo_regime_especial` e `tipo_territorio_incentivado` sem blocker explícito |

**Veredito C1: 🔴 FAIL**

### C2 — Bateria de 15 cenários de negócio

| Subcritério | Status | Evidência |
|---|---|---|
| 15/15 cenários executados | 🟢 PASS | Rodada A (v1 JSON) executada em 2026-04-23 · `REPORT-M1-arquetipo-go-no-go-brasil-v1.md` |
| Todos com `status_arquetipo=valido` | 🟡 PARCIAL | 15/15 PASS sob v1 · Sob v2 por simulação: 14/15 PASS + T03 diverge (N5) |
| Nenhum cenário depende de texto livre | 🟢 PASS | `descricao_negocio_livre` é auxiliar em todos os 15 inputs; zero regra da spec consulta texto livre |
| Nenhum cenário gera inconsistência lógica | 🔴 FAIL | N14 permite **blocker silencioso** (possui_bens=true + tipo_objeto_economico=[] → bloqueia sem abrir UI) · N15 conflito de tipo (subnatureza singular nos inputs vs multi no schema v2) |

**Veredito C2: 🟡 PARCIAL** — não é FAIL pleno porque os 15 casos passam tecnicamente sob v1; é PARCIAL porque v2 introduziu inconsistências que impedem re-run limpo.

### C3 — Amarração formulário ↔ testes

| Subcritério | Status | Evidência |
|---|---|---|
| Cada campo do formulário existe nos testes | 🟡 PARCIAL | `possui_filial_outra_uf` é consumido por conditional_rules mas não declarado no bloco TERRITORIAL_EXPANDIDO (N3); `papel_operacional_especifico` (schema) vs `papel_operacional` (CADEIA no v2 anterior) — nome oscilou |
| Cada regra condicional coberta por ≥1 cenário | 🔴 FAIL | **Rule 10** (`integra_grupo_economico=true AND analise_1_cnpj_operacional=false`) **não tem cenário positivo** — nenhum dos 15 testa o bloqueio multi-CNPJ |
| Alteração no formulário invalida automaticamente a suite | 🟡 N/A | Depende de CI que só existirá após M1 (o runner atual precisa ser executado manualmente) |
| Suite é fonte de verdade do comportamento | 🟡 PARCIAL | Declaração de intenção; mas 6 cenários declaram `expected_open_blocks` subcompleto (ver REPORT rodada A), o que torna a suite permissiva, não autoritativa |

**Veredito C3: 🔴 FAIL**

---

## Tabela PASS/FAIL dos 15 cenários (consolidada)

Avaliação simultânea sob (a) regras v1 JSON (rodada A original) e (b) regras v2 (simulação):

| ID  | Cenário | Rodada A (v1) | Simulação v2 | Notas |
|-----|---------|---------------|---------------|-------|
| T01 | Saúde — operadora ANS | ✅ PASS | ✅ PASS | — |
| T02 | Farmácia ANVISA | ✅ PASS | ✅ PASS | — |
| T03 | Distribuidora combustíveis | ✅ PASS | ⚠️ CAD diverge (N5) | Gatilho v2 exige ops='Logistica', input tem 'Transporte' |
| T04 | Transporte perigoso | ✅ PASS | ⚠️ N15 | Subnatureza singular vs multi |
| T05 | Fintech BACEN | ✅ PASS | ⚠️ N15 | Idem |
| T06 | Trading import+export | ✅ PASS | ✅ PASS | — |
| T07 | Agronegócio MAPA | ✅ PASS | ⚠️ N15 | Idem |
| T08 | Química | ✅ PASS | ✅ PASS | — |
| T09 | Atacado | ✅ PASS | ✅ PASS | — |
| T10 | TI serviços | ✅ PASS | ✅ PASS | — |
| T11 | Metalúrgica | ✅ PASS | ✅ PASS | — |
| T12 | ZFM | ✅ PASS | ⚠️ N15 | Idem |
| T13 | Pequeno comércio | ✅ PASS | ✅ PASS | — |
| T14 | Marketplace | ✅ PASS | ✅ PASS | — |
| T15 | Logística integrada | ✅ PASS | ✅ PASS | — |

**Legenda:** ✅ PASS pleno · ⚠️ PASS sob suposição implícita (N15: schema aceita coerção string→array; ou T03: regra CAD a redefinir)

---

## Lista consolidada de gaps (ordenada por prioridade)

### Gaps P0 (bloqueantes — precisam resolver antes de GO)

| # | Gap | Condição afetada | Ação necessária |
|---|---|---|---|
| N1 | Semântica `when[]` ambígua (OR ou AND?) | C1 | Declarar explicitamente `"array_when_semantics": "OR"` em `rules_policy` |
| N5 | T03 CAD divergente — gatilho v2 não cobre `ops_secundarias=Transporte` | C2 | Decisão: alargar gatilho (CONTAINS Logistica OR Transporte) OU remover expectativa de CAD para T03 |
| N12 | `CONTAINS` sem case-sensitivity declarada | C1 | Declarar `"contains_case_sensitive": false` em `rules_policy` |
| N14 | Conflito `possui_bens` (blocker) ↔ `tipo_objeto_economico` (gatilho) — gera blocker silencioso | C1, C2 | Unificar: usar uma única fonte da verdade (recomendo `possui_bens`/`possui_servicos` como source, e `tipo_objeto_economico` como derivado) |
| N15 | Inputs atuais usam `subnatureza_setorial` string; spec v2 exige multi | C2, C3 | Declarar coerção implícita string→array OU reescrever inputs dos 15 cenários como array |
| R8-regressão | `[] treated as empty` removido no v2 novo | C1 | Restaurar `consistency_rules` |
| Rule-10-uncovered | Nenhum cenário testa `integra_grupo + análise != 1_CNPJ → BLOCK` | C3 | Adicionar cenário T16 positivo que deve bloquear |

### Gaps P1 (importantes — não bloqueiam mas degradam qualidade)

| # | Gap | Condição | Ação |
|---|---|---|---|
| N2 | `CADEIA_OPERACIONAL` sem `required_fields` no v2 novo | C1 | Declarar campos do bloco ou marcar como "informational-only" |
| N3 | `possui_filial_outra_uf` é referenciado mas não declarado como campo do bloco | C1, C3 | Adicionar à lista de campos de `TERRITORIAL_EXPANDIDO` |
| N4 | Semântica de `auto_mark` não declarada (quando dispara) | C1 | Declarar "ao preencher campo gatilho no T2, marca target imediatamente; respeita último override do user" |
| N7 | `TERRITORIO_INCENTIVADO.required_fields` sem blocker em `blocking_rules` | C1 | Adicionar blocker explícito ou declarar política global "required_fields não preenchido = BLOCK" |
| N8 | `REGIMES_ESPECIAIS.required_fields` sem blocker em `blocking_rules` | C1 | Idem N7 |
| N13 | Em qual tela o toggle `setor_regulado` é exibido (para permitir override)? | C1 | Declarar explicitamente — se for T6 e T6 só abre com setor=true, há deadlock |

### Gaps P2 (gaps de produto — podem virar backlog M1.1)

| # | Gap | Ação |
|---|---|---|
| R9 | Sem campo discriminante para marketplace + estoque próprio | Backlog — pode ser M1.1 |
| R10 | Formato do bloqueio multi-CNPJ (banner/modal/tela) não definido | Backlog UX |

---

## Aplicação das regras de bloqueio (do JSON REGRA-M1-GO-NO-GO)

| Regra de bloqueio | Dispara? | Evidência |
|---|---|---|
| Se qualquer cenário falhar → BLOQUEAR | 🔴 Parcialmente | T03 diverge sob v2 (N5); depende de resolução semântica (N14, N15) |
| Se existir inferência implícita → BLOQUEAR | 🔴 **Sim** | `when[]` ambíguo (N1), `CONTAINS` ambíguo (N12), `auto_mark` ambíguo (N4) — 3 inferências implícitas presentes |
| Se existir campo obrigatório sem regra → BLOQUEAR | 🔴 **Sim** | `possui_filial_outra_uf` (N3); `tipo_territorio_incentivado` e `tipo_regime_especial` sem blocker (N7, N8) |
| Se existir divergência formulário vs testes → BLOQUEAR | 🔴 **Sim** | Rule 10 sem cenário de teste; `papel_operacional` vs `papel_operacional_especifico` oscila; `subnatureza_setorial` singular nos inputs vs multi no schema |

**4 de 4 regras de bloqueio disparam → NO-GO reforçado.**

---

## Decisão

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              🔴  NO-GO                          │
│                                                 │
│  C1: 🔴 FAIL   C2: 🟡 PARCIAL   C3: 🔴 FAIL      │
│                                                 │
│  Pendências bloqueantes: 7 (P0)                 │
│  Pendências importantes: 6 (P1)                 │
│  Backlog M1.1: 2 (P2)                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**M1 NÃO pode iniciar.** Implementação permanece suspensa (coerente com §11 da EXPLORACAO).

---

## Caminho para virar GO

Sequência mínima para reabrir avaliação (sugerido ao consultor / P.O.):

1. **Resolver os 7 P0** na spec (produzir v3):
   - Declarar semânticas ausentes (N1, N12, N4)
   - Alinhar gatilho ↔ blocker NCM/NBS (N14)
   - Restaurar `[] = empty` (R8)
   - Decidir T03 CAD (N5)
   - Adicionar cenário T16 para Rule 10
   - Resolver subnatureza singular↔multi (N15)
2. **Atualizar inputs da suite** se N15 escolher "reescrever inputs" em vez de "coerção"
3. **Re-rodar** rodada A + rodada B + edge cases contra v3
4. **Re-avaliar** C1, C2, C3
5. Se **tudo PASS** → GO autorizado
6. **Só então** iniciar F1 (SPEC formal) de M1

---

## Nota ao consultor

O v2 fez avanços concretos em 8 das 10 recomendações R1–R10 da rodada B. Os gaps restantes são **pontuais e resolvíveis em uma iteração curta**. O NO-GO atual reflete rigor da governance REGRA-M1-GO-NO-GO, não problema estrutural do modelo de arquétipo.

A hipótese central da §11 da EXPLORACAO — "arquétipo determinístico dá base correta para RAG" — **continua viável**. Os 14/15 cenários que passam sob v2 + o par discriminante E07 (transporte perigoso × carga geral) que o meu CRITIQUE levantou validam que o modelo **discrimina** o que precisa.

Recomendação: consultor produz v3 respondendo os 7 P0 acima; roda-se a bateria; vira GO em 1 ciclo curto. Depois, sim, abre F1 da SPEC M1.

---

## Histórico

| Data | Decisão | Evento |
|---|---|---|
| 2026-04-23 | 🟢 GO suite v1 | Rodada A executada — 15/15 PASS sob regras v1 |
| 2026-04-23 | 🟡 AMARELO spec UI | Rodada B — 2 divergências de matriz + 10 findings em 10 edge cases |
| 2026-04-23 | — | Consultor envia spec v2 endereçando 8/10 recomendações |
| 2026-04-23 | 🔴 **NO-GO atual** | Avaliação contra REGRA-M1-GO-NO-GO — 7 P0 pendentes |
