# CNT-01c — Perfil Econômico da Empresa (NCM/NBS no operationProfile)

## Autoridade

Contrato oficial do Sprint U — Bloco E.
Aprovado por: P.O. (Uires Tapajós) + Consultor + Orquestrador Claude.
Data: 2026-04-05.

## Decisão arquitetural

NCM e NBS persistidos dentro de `operationProfile` como campos JSON.
**NÃO adicionar colunas soltas à tabela `projects`.**

`operationProfile` já existe como `json` nullable no banco — sem migration de schema.
Requer apenas atualização do tipo TypeScript/Zod para validar os novos campos.

## Estrutura do operationProfile (extensão)

```typescript
{
  operationType: string,           // existente
  clientType: string[],            // existente
  multiState: boolean,             // existente
  principaisProdutos?: Array<{
    ncm_code: string,              // ex: "9619.00.00"
    descricao: string,             // ex: "Absorventes higiênicos"
    percentualFaturamento?: number
  }>,
  principaisServicos?: Array<{
    nbs_code: string,              // ex: "1.1506.21.00"
    descricao: string,             // ex: "SaaS"
    percentualFaturamento?: number
  }>
}
```

## Migration

**NÃO requer migration de schema** — `operationProfile` já é `json` nullable.
Requer apenas atualização do Zod schema para validar os novos campos opcionais.

## Mudança de comportamento (Opção A → Bloco E)

| Antes (Opção A — PR #312) | Depois (Bloco E — Sprint U) |
|---|---|
| NCM/NBS recebidos como parâmetro de `completeOnda2` | NCM/NBS lidos de `operationProfile` do projeto |
| Dados não persistidos por empresa | Dados persistidos no JSON do projeto |
| Engine ativado apenas se parâmetros enviados | Engine ativado se `principaisProdutos` ou `principaisServicos` existirem |

## Critérios de aceite

- [x] `operationProfile` aceita `principaisProdutos` e `principaisServicos`
- [x] Campos são opcionais (compatibilidade com projetos existentes)
- [x] `engine-gap-analyzer.ts` recebe NCMs/NBSs vindos do `operationProfile`
- [x] Onda 3 não quebra para projetos sem NCM/NBS
- [x] Parâmetros `ncmCodes`/`nbsCodes` removidos de `completeOnda2`
- [x] 4 testes obrigatórios passando (Q5)

## Rollback

Se necessário reverter: os parâmetros `ncmCodes`/`nbsCodes` podem ser
reintroduzidos em `completeOnda2` sem migration. O campo `operationProfile`
permanece no banco independentemente.
