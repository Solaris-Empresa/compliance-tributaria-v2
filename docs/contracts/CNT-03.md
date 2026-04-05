# CNT-03 — Gaps e Rastreabilidade

## Autoridade
Contrato oficial do Milestone 1 — Decision Kernel.
Define o contrato de geração e rastreabilidade de gaps tributários.

## Objetivo
Registrar gaps tributários identificados pelo Decision Kernel com rastreabilidade
completa de fonte, severidade e origem do diagnóstico.

## Enum source (project_gaps_v3)
| Valor | Origem | Descrição |
|---|---|---|
| `solaris` | Onda 1 | Perguntas SOLARIS respondidas com "não" |
| `iagen` | Onda 2 | Respostas IAgen analisadas por `isNonCompliantAnswer` |
| `engine` | Onda 3 | Decision Kernel — lookup NCM/NBS determinístico |

> **Nota:** `source='rag'` foi **removido** (MIG-001, 2026-04-04).
> A Onda 3 usa `source='engine'` — não `source='rag'`.

## Output obrigatório por gap
```json
{
  "source": "engine",
  "gap_descricao": "string",
  "area": "string",
  "severidade": "critica | alta | media | baixa",
  "topico_trigger": "string",
  "question_text": "string",
  "confianca_engine": {
    "valor": "number (0–100)",
    "tipo": "deterministico | regra | fallback | condicional"
  },
  "fonte_legal": {
    "lei": "string",
    "artigo": "string"
  }
}
```

## Regras
- `source='engine'` obrigatório para gaps gerados pelo Decision Kernel
- `confianca_engine` obrigatório — herdado do CNT-02
- `fonte_legal` obrigatório — rastreabilidade legal completa
- LLM PROIBIDO de gerar gaps sem base determinística

## Critérios de aceite
- [ ] gap com source='engine' persistido em project_gaps_v3
- [ ] campo confianca_engine presente
- [ ] campo fonte_legal presente
- [ ] source='rag' não existe mais no enum

## Status
Versão: 1.0 | Aprovado: 2026-04-04
Criado: Milestone 1 (source='engine' substitui source='rag')
