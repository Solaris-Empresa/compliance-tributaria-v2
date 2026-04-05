# CNT-01b — Item Econômico (Serviço / NBS)

## Autoridade
Contrato oficial do Milestone 1 — Decision Kernel.
NBS ≠ NCM: lógica diferente, contrato separado.

## Objetivo
Representar o item econômico do tipo SERVIÇO da empresa para fins de
decisão tributária com regra interpretativa (não lookup direto).

## Tipo
- tipo: "servico"
- sistema: "NBS"

## Diferença crítica em relação ao CNT-01a
- NCM aparece nos Anexos I–XI da LC 214 → lookup direto → confiança 100%
- NBS NÃO aparece nos Anexos da LC 214 → lookup + regra interpretativa → confiança ≤ 98%
- Fonte: base MDIC/SECEX (não LC 214)

## Input
```json
{
  "tipo": "servico",
  "sistema": "NBS",
  "nbs_code": "N.NN.NN.NN",
  "descricao": "string",
  "percentualFaturamento": "number (opcional)"
}
```

## Regras
- código NBS obrigatório no formato NBS
- confiança máxima do engine NBS: 98% (nunca 100%)
- tipo deve ser explicitamente "servico"
- lógica do engine é interpretativa, não determinística pura

## Critérios de aceite
- [ ] aceita NBS válido
- [ ] rejeita NBS com formato inválido
- [ ] confiança máxima retornada ≤ 98%
- [ ] campo tipo="servico" presente

## Status
Versão: 1.0 | Aprovado: 2026-04-04
Criado: Milestone 1 (NBS não coberto pelo CNT-01a)
