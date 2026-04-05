# CNT-02 — Engine de Decisão Tributária

## Autoridade
Contrato oficial do Milestone 1 — Decision Kernel.
Toda implementação do engine deve seguir este contrato.

## Objetivo
Determinar regime tributário com base no item econômico (NCM ou NBS).

## Input
```json
{
  "codigo": "string (NCM ou NBS)",
  "sistema": "NCM | NBS"
}
```

## Output OBRIGATÓRIO
```json
{
  "regime": "string",
  "anexo": "string | null",
  "aliquota": "number | null",
  "descricao": "string",
  "confianca": {
    "valor": "number (0–100)",
    "tipo": "deterministico | regra | fallback | condicional"
  },
  "fonte": {
    "lei": "string",
    "artigo": "string",
    "paragrafo": "string | null",
    "inciso": "string | null"
  }
}
```

## Regras do campo confiança
| Situação | valor | tipo |
|---|---|---|
| NCM encontrado nos Anexos | 100 | deterministico |
| NCM não encontrado → regime geral | < 95 | fallback |
| NBS encontrado | ≤ 98 | regra |
| NBS não encontrado | < 95 | fallback |
| Alíquota com condição especial | 100 | condicional |

## Regras gerais
- decisão DEVE ser determinística
- LLM PROIBIDO de decidir (pode apenas explicar/validar)
- deve usar lookup estruturado (ncm-dataset.json / nbs-dataset.json)
- fonte legal OBRIGATÓRIA em todo output
- aliquota = null para regime geral (alíquota padrão se aplica)
- condicional: retornar tipo="condicional" + descricao — NÃO resolver

## Critérios de aceite
- [ ] retorna regime correto para NCM conhecido
- [ ] retorna fonte legal válida sempre
- [ ] campo confiança presente e preenchido em todo output
- [ ] não inventa informação (zero alucinação)
- [ ] funciona para 3 NCM + 3 NBS (POC)

## Status
Versão: 1.1 | Aprovado: 2026-04-04
Mudança v1.1: campo confianca adicionado (obrigatório)
