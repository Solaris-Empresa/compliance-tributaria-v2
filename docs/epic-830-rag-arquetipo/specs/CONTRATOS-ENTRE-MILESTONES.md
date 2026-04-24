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

**Status:** CONSOLIDADO 2026-04-24 — decisões Q-2, Q-3, Q-4, Q-5, Q-6, Q-C1, Q-C2, Q-D1 (Opção B) resolvidas. 3 pontos abertos permanecem no final.

**Schema v1.0.0 (pós-decisões P.O. 2026-04-24):**

```typescript
interface Arquetipo {
  // Dimensões canônicas ADR-0031 (fonte de verdade)
  objeto: string[];              // enum 14 valores (combustivel, bebida, tabaco, alimento, ...)
  papel_na_cadeia: string;       // enum 12 valores (fabricante, distribuidor, varejista, ...)
  tipo_de_relacao: string[];     // enum 6 valores (venda, servico, producao, intermediacao, ...)
  territorio: string[];          // enum 8 valores (municipal, estadual, interestadual, ...)
  regime: string;                // enum 5 valores (simples_nacional, lucro_presumido, lucro_real, mei, indefinido) — Q-D3 RESOLVIDA

  // Contextuais (não dimensionais) — Q-D3 + Q-D4 RESOLVIDAS 2026-04-24
  subnatureza_setorial: string[];   // sempre array; `[]` = não-regulado; enum v1 de 7 valores
  orgao_regulador: string[];
  regime_especifico: string[];      // Q-D3: modificador ortogonal ao regime dimensional; `[]` = sem regime especial

  // Campo derivado legado (Q-2 Opção A — obrigatório, consumido por risk-eligibility.ts)
  derived_legacy_operation_type: "industria" | "comercio" | "servicos" | "misto" | "agronegocio" | "financeiro";

  // Metadata ADR-0032 (obrigatórios)
  status_arquetipo: "pendente" | "inconsistente" | "bloqueado" | "confirmado";
  motivo_bloqueio: string | null;  // não-null ⟺ status=bloqueado
  model_version: string;            // "m1-v1.0.0"
  data_version: string;             // ISO-8601 UTC (ex: "2026-04-24T12:00:00.000Z")
  perfil_hash: string;              // sha256:[64 hex] — via CANONICAL-JSON-SPEC
  rules_hash: string;               // sha256:[64 hex] — via CANONICAL-RULES-MANIFEST
  imutavel: true;                   // marker explícito
}
```

**Política de imutabilidade (Opção 1 aprovada Q-6):**
- Arquétipo confirmado é imutável (ADR-0032 §1)
- Edição após `confirmado` → **novo snapshot** em `pendente` (anterior preservado read-only)
- `confirmado` e `bloqueado` são terminais para o snapshot específico
- Projetos legados `profileVersion='1.0'` **não recalculam** (ADR-0032 §4)

### Pontos abertos — resolução 2026-04-24

**1. Chunks eliminados — quais eixos M2 usa para filtrar? — RESOLVIDO PARCIALMENTE**

Proposta consolidada: M2 usa `papel_na_cadeia` + `objeto` como eixos primários (combinação). `territorio` como secundário. `tipo_de_relacao` e `regime` como modificadores.

Ainda aberto: pesos específicos e precedência entre eixos quando múltiplos têm chunks distintos. Tratar em spec M2 (fora deste contrato).

**2. Fallback — arquétipo inválido/bloqueado, M2 bloqueia? — RESOLVIDO**

**Decisão:** M2 **não processa** projeto com `status_arquetipo != "confirmado"`. Gate E2E (SPEC-RUNNER-RODADA-D §4.6) já bloqueia avanço para Briefing/M2 a menos que seja `confirmado`. Portanto M2 sempre recebe arquétipo confirmado.

**3. Auditabilidade — M2 registra chunks filtrados? — RESOLVIDO**

**Decisão:** sim. Cada execução de M2 emite log com `{project_id, archetype_version, perfil_hash, chunks_antes, chunks_depois, eixos_aplicados}`. Permite reproduzir a filtragem dado um snapshot histórico (compatível com ADR-0032 §4 não-migração).

### Ponto aberto adicional (levantado nas Qs)

**4. D-N6/D-B6 — disambiguação de regimes 1-para-muitos**

Q-D1 Opção B aprovada, mas disambiguação quando `regime` retorna valor que cobre múltiplos `objeto` (ex.: `imposto_seletivo` = combustível|bebida|tabaco) é **bloqueador** do runner v3. Opções A/B/C propostas em NCM-OBJETO-LOOKUP §3.4. Pendente de decisão P.O.

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
