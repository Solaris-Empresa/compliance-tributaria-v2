# Contratos entre milestones do Epic #830

> **Status:** draft — contrato M1→M2 sendo estruturado
> **Prioridade:** alta (consultor classificou como "o mais perigoso")

## Por que este documento

Cada milestone do Epic produz output consumido pelas seguintes. Sem
**contratos formais** entre milestones, mudanças em M1 podem quebrar
M2, M3... em cascata.

Este documento define **schema + semântica** das interfaces entre
milestones. Atualizar sempre que um contrato for decidido ou alterado.

## Contratos

### Contrato M1 → M2 (Arquetipo → RAG filtro)

**Produtor:** M1 (computação do arquétipo a partir do formulário)
**Consumidor:** M2 (filtro pré-RAG usa arquétipo para eliminar chunks inaplicáveis)

**Status:** DRAFT — aguardando consolidação do modelo dimensional

**Schema proposto (rascunho):**

```typescript
interface Arquetipo {
  // Identidade
  cnpj: string;
  cnae_informado: string;

  // Eixos dimensionais (do modelo canônico)
  objeto: string[];              // ["combustível"] ou ["alimento", "bebida"]
  papel_na_cadeia: string;       // "transportador" | "distribuidor" | ...
  tipo_de_relacao: string[];     // ["serviço"] ou ["venda", "serviço"]
  territorio: string[];          // ["interestadual", "nacional"]
  regime: string;                // "lucro_real" | "simples_nacional" | ...

  // Campos contextuais (não determinantes)
  subnatureza_setorial: string | null;
  orgao_regulador: string[];

  // Metadados de imutabilidade + versionamento (obrigatórios)
  status_arquetipo: "valido" | "invalido" | "bloqueado";
  motivo_bloqueio?: string;      // presente só se status = bloqueado
  versao_modelo: string;         // ex: "1.0" — imutável após cálculo
  calculado_em: string;          // ISO timestamp — imutável após cálculo
  imutavel: true;                // marker explícito — arquétipo NUNCA é recalculado automaticamente
}
```

**Política de imutabilidade (CONSOLIDADA — ver README):**
- Arquétipo é calculado **uma única vez** ao submeter form
- Persiste imutável com timestamp e versão do modelo
- Evolução do modelo v1.0 → v2.0 **não recalcula** arquétipos v1.0 antigos
- Sistema suporta múltiplas versões em paralelo
- Recálculo só via ação explícita futura (pós-M1, ver PENDING-DECISIONS)

**Pontos abertos:**

1. **Chunks eliminados:** M2 usa quais eixos do arquétipo para filtrar?
   Apenas `papel_na_cadeia`? Ou combinação de `papel + objeto`?

2. **Fallback:** se arquétipo = "invalido" ou "bloqueado", M2 aplica RAG sem
   filtro ou bloqueia geração?

3. **Auditabilidade:** M2 precisa registrar quais chunks foram filtrados pelo
   arquétipo? (para debug e transparência ao consultor tributário)

### Contrato M1 → M3 (Arquetipo → Questionários)

_Não iniciado. Documentar quando M3 for explorado._

### Contrato M1 → M5 (Arquetipo → Gaps)

_Não iniciado. Documentar quando M5 for explorado._

### Contrato M1 → M6 (Arquetipo → Riscos)

_Não iniciado. Documentar quando M6 for explorado. **Crítico:** este é
onde o bug original do Hotfix IS foi resolvido parcialmente. M6 precisa
consumir o arquétipo completo, não só `operationType`._

## Regras gerais de contrato

1. **Schema antes de código:** nenhum contrato pode ser implementado antes
   de estar especificado aqui
2. **Versionamento:** contratos têm versão (v1.0, v1.1, ...). Breaking
   changes exigem ADR
3. **Fallback:** todo contrato define comportamento quando input é inválido
4. **Auditabilidade:** todo contrato define o que é registrado para debug

## Status atual

| Contrato | Status | Prioridade |
|---|---|---|
| M1 → M2 | DRAFT | **alta** (mais perigoso) |
| M1 → M3 | não iniciado | média |
| M1 → M5 | não iniciado | alta |
| M1 → M6 | não iniciado | alta |
| M1 → M4 | não iniciado | baixa (consome todos) |
| M1 → M7 | não iniciado | baixa |
| M1 → M8 | não iniciado | baixa |
