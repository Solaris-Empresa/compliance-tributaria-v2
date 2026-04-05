# CNT-01a — Item Econômico (Produto / NCM)

## Autoridade
Contrato oficial do Milestone 1 — Decision Kernel.
Nenhuma implementação de engine de produtos sem este contrato aprovado.

## Objetivo
Representar o item econômico do tipo PRODUTO da empresa para fins de
decisão tributária determinística.

## Tipo
- tipo: "produto"
- sistema: "NCM"

## Input
```json
{
  "tipo": "produto",
  "sistema": "NCM",
  "ncm_code": "NNNN.NN.NN",
  "descricao": "string",
  "percentualFaturamento": "number (opcional)"
}
```

## Regras
- código NCM obrigatório no formato NNNN.NN.NN
- múltiplos itens permitidos
- percentualFaturamento opcional mas recomendado
- tipo deve ser explicitamente "produto" (diferencia de CNT-01b)

## Critérios de aceite
- [ ] aceita NCM válido no formato correto
- [ ] rejeita NCM com formato inválido
- [ ] permite múltiplos itens
- [ ] campo tipo="produto" presente

## Status
Versão: 1.0 | Aprovado: 2026-04-04
Substitui: CNT-01 (renomeado para CNT-01a)
