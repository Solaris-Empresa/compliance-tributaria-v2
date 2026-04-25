# Guia de Teste — Transportadora de Combustíveis Perigosos
**Tela:** `/admin/m1-perfil` · **Ambiente:** Produção controlada (iasolaris.manus.space)
**Versão:** 1.0 · **Data:** 2026-04-25 · **Autor:** Manus (Runner v3 / M1)

---

## Contexto do Caso

A empresa atua no **transporte rodoviário de combustíveis perigosos** (gasolina, diesel, etanol, derivados). Coleta em bases de distribuição e entrega em postos revendedores e clientes industriais, com operações em múltiplos estados. Envolve NF-e, riscos logísticos e ambientais, ANP, ANTT, ERP fiscal e apuração de créditos.

Este guia orienta o P.O. a preencher a seed correta, executar o Runner v3 e interpretar o resultado.

---

## ⚠️ Alerta Técnico Antes de Começar

O formulário atual da tela M1 tem **dois campos críticos ausentes** que o runner usa internamente para derivar o papel `transportador`:

| Campo interno (Seed) | Como o runner usa | Status no formulário |
|---|---|---|
| `natureza_operacao_principal` | Deve conter `"Transporte"` para derivar `papel=transportador` | **Ausente** no formulário |
| `posicao_na_cadeia_economica` | Alternativa: `"Prestador de servico"` deriva `prestador` | **Ausente** no formulário |

O campo `papel_na_cadeia_input` do formulário atual **não está mapeado** para esses campos internos da Seed — ele é passado como `passthrough()` mas o runner não o lê diretamente. Isso significa que, com o formulário atual, o runner pode derivar `papel=indefinido` em vez de `transportador`.

**Impacto esperado no teste:** o status pode ser `inconsistente` por `missing_required_fields` em vez de `confirmado`. Isso é um **gap de formulário**, não um bug do runner.

> Esta é uma informação técnica para o P.O. avaliar se o teste deve prosseguir assim mesmo (para documentar o comportamento atual) ou aguardar o fix do formulário.

---

## Passo a Passo

### Passo 1 — Acessar a tela

1. Acesse [iasolaris.manus.space](https://iasolaris.manus.space)
2. Faça login com sua conta `equipe_solaris`
3. No sidebar esquerdo, clique em **"M1 Perfil Entidade"** (ícone de atividade)
4. Você verá a tela dividida em: Formulário de Seed (esquerda) e Painel de Confiança (direita)

---

### Passo 2 — Preencher o formulário

Preencha os campos exatamente como indicado abaixo:

| Campo | Valor a preencher | Observação |
|---|---|---|
| **Nome da Empresa** | `Transportadora de Combustíveis Perigosos Ltda` | Livre |
| **CNPJ** | `12.345.678/0001-90` | CNPJ de teste válido (formato) |
| **CNAE** | `4930-2/03` | Transporte rodoviário de produtos perigosos |
| **NCMs Principais** | *(deixar em branco)* | Combustíveis (2710, 2711) **não estão no dataset** — fallback esperado |
| **NBSs Principais** | *(deixar em branco)* | Transporte **não está no dataset NBS** — sem NBS aplicável |
| **Papel na Cadeia** | `Prestador de Serviço` | Mais próximo disponível no select |
| **Tipo de Relação** | `B2B` | Transportadora opera B2B |
| **Território** | `Nacional` | Mais próximo de "interestadual" disponível |
| **Regime Tributário** | `Lucro Real` | Regime típico de transportadoras de grande porte |

> **Por que NCM em branco?** O dataset atual tem apenas 19 NCMs mapeados (alimentos básicos, higiene, agro). Nenhum NCM de combustível (capítulo 27 da TEC) está presente. Deixar em branco é o comportamento correto para este teste — o runner deve operar sem NCM e sem NBS.

---

### Passo 3 — Executar o Runner v3

Clique no botão **"Executar Runner v3"** (azul, no final do formulário).

Aguarde a resposta — normalmente menos de 2 segundos.

---

### Passo 4 — Ler o resultado

Após a execução, o Painel de Confiança exibirá os gauges e o resultado bruto. Copie ou tire print dos seguintes campos:

#### 4.1 — Campos obrigatórios para o parecer

```
status_arquetipo: [valor]
test_status: [PASS / FAIL / BLOCKED]
fallback_count: [número]
hard_block_count: [número]
lc_conflict_count: [número]
score_confianca: [0–100]
blockers_triggered: [lista]
missing_required_fields: [lista]
```

#### 4.2 — Gauges do Painel de Confiança

| Gauge | Valor esperado | O que significa |
|---|---|---|
| **Score** | 40–70% | Composição: completude×0.4 + inferência×0.3 + coerência×0.3 |
| **Completude** | 33–67% | Depende de quantos campos obrigatórios estão preenchidos |
| **Inferência Validada** | 100% (se sem NCM/NBS) ou 0% (se NCM não mapeado) | Ausência de V-10-FALLBACK |
| **Coerência** | 100% | Ausência de conflitos lógicos V-LC-NNN |

---

### Passo 5 — Verificar os blockers

Expanda a seção **"Blockers Disparados"** no resultado e verifique:

| Blocker | Severidade | Esperado? | O que significa |
|---|---|---|---|
| `V-10-FALLBACK` | INFO | **Sim** (se NCM/NBS preenchidos) | NCM/NBS não mapeado — objeto genérico aplicado |
| `V-LC-201` a `V-LC-NNN` | HARD_BLOCK | **Não** | Conflito lógico — indica problema na seed |
| `BLOCK_FLOW` | HARD_BLOCK | **Não** | Bloqueio de fluxo — impede derivação |
| Qualquer IS indevido | — | **Não** | Imposto Seletivo aplicado como fabricante/refinaria |

---

## Resultado Esperado com o Formulário Atual

Dado o gap técnico identificado (campos `natureza_operacao_principal` e `posicao_na_cadeia_economica` ausentes no formulário), o comportamento esperado é:

| Campo | Valor esperado |
|---|---|
| `status_arquetipo` | `inconsistente` (por `missing_required_fields`) |
| `test_status` | `FAIL` |
| `fallback_count` | `0` (sem NCM/NBS preenchidos) |
| `hard_block_count` | `0` |
| `lc_conflict_count` | `0` |
| `missing_required_fields` | `["papel_na_cadeia (indefinido — ...)"]` |
| `score_confianca` | ~40–47% |

> **Interpretação correta:** O runner está funcionando corretamente. O problema é que o formulário não expõe os campos necessários para o runner derivar `papel=transportador`. Isso é um **gap de UX/formulário**, não um bug do runner.

---

## Resultado Ideal (após fix do formulário)

Se os campos `natureza_operacao_principal=["Transporte"]` fossem enviados corretamente:

| Campo | Valor esperado |
|---|---|
| `status_arquetipo` | `confirmado` |
| `test_status` | `PASS` |
| `fallback_count` | `0` (sem NCM/NBS) |
| `hard_block_count` | `0` |
| `lc_conflict_count` | `0` |
| `missing_required_fields` | `[]` |
| `score_confianca` | 70–100% |
| `papel_na_cadeia` | `transportador` |
| `tipo_de_relacao` | `["transporte"]` |
| `territorio` | `["interestadual"]` |

---

## Checklist de Verificação

Após executar o teste, marque cada item:

- [ ] Tela `/admin/m1-perfil` acessível sem erro
- [ ] Formulário renderizou todos os 9 campos
- [ ] Botão "Executar Runner v3" funcionou (sem erro 500)
- [ ] Resultado exibido no Painel de Confiança
- [ ] Gauges SVG visíveis (score, completude, inferência, coerência)
- [ ] Seção "Blockers Disparados" expandível
- [ ] Nenhum `HARD_BLOCK` disparado
- [ ] Nenhum conflito lógico `V-LC-NNN` disparado
- [ ] Nenhum IS indevido (Imposto Seletivo como fabricante/refinaria)
- [ ] Log apareceu na tabela "Logs Recentes"
- [ ] KPIs atualizaram (Total Runs incrementou)

---

## Critério de Parecer

### PASS
- `status_arquetipo = confirmado` **E** sem `HARD_BLOCK` **E** sem IS indevido para transportador **E** fallback apenas como INFO (se existir)
- Requer fix do formulário para expor `natureza_operacao_principal`

### PARTIAL
- Runner executou sem erro **E** sem `HARD_BLOCK` **E** sem IS indevido **E** `status_arquetipo = inconsistente` por gap de formulário (não por bug do runner)
- **Este é o resultado esperado com o formulário atual**

### FAIL
- Qualquer `HARD_BLOCK` disparado **OU** IS indevido aplicado ao transportador **OU** erro 500 na execução **OU** conflito lógico `V-LC-NNN`

---

## Parecer Preliminar (baseado na análise estática do código)

**PARTIAL** — com ressalva técnica de P1.

O runner v3 está correto: a regra `C2-05` protege explicitamente o transportador de receber `servico_digital` ou `servico_financeiro` como objeto; a regra `C3-04` protege de IS indevido em território municipal; e o fallback `V-10-FALLBACK` (INFO) não altera o gate. O problema é que o **formulário M1 não expõe os campos `natureza_operacao_principal` e `posicao_na_cadeia_economica`**, que são os campos que o runner usa para derivar `papel=transportador`. Isso impede que o caso de teste alcance `confirmado` com o formulário atual.

**Ação recomendada (P1):** adicionar os campos `natureza_operacao_principal` (multi-select) e `posicao_na_cadeia_economica` (select) ao formulário M1, mapeando-os corretamente para a Seed antes de reexecutar este caso de teste.

---

## O que Registrar (para o P.O.)

Após o teste, envie ao time técnico:

1. Print da tela com o resultado completo
2. O JSON bruto do campo `blockers_triggered` (copiar do resultado)
3. O valor de `status_arquetipo` e `missing_required_fields`
4. Confirmação: "IS indevido apareceu?" (SIM/NÃO)
5. Confirmação: "Erro 500 ou tela em branco?" (SIM/NÃO)

---

*Documento gerado automaticamente pelo Manus — não commitar sem aprovação P.O.*
