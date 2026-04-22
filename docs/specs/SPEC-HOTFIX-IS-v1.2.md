# SPEC AMENDMENT — Hotfix IS: correção de 2 bloqueantes técnicos (v1.2)

## IA SOLARIS · Compliance Tributário v2
## Versão 1.2 · 2026-04-21 · Audiência: P.O. · Orquestrador · Claude Code · Manus
## Supersede (parcial): SPEC-HOTFIX-IS-v1.1 (mesma data)
## ADR fundamentador: [ADR-0030](../adr/ADR-0030-hotfix-is-elegibilidade-por-operationtype.md) (v1.1 permanece em vigor; sem amendment do ADR neste ciclo)

---

## Natureza deste documento

**Delta cirúrgico sobre v1.1.** Exclusivamente 2 correções técnicas — nada mais.
Amendments cosméticos, operacionais e de nomenclatura foram endereçados fora
da trilha formal (via prompt F3 ao Claude Code), por decisão do P.O.
2026-04-21 (Caminho C).

### Motivo do amendment

Revisão do Claude Code sobre v1.1 identificou 10 pontos (1 residual da v1.0 +
9 novos). Após triagem do Orquestrador + decisão do P.O., apenas **2 pontos
afetam a correção técnica da spec** e justificam amendment formal:

- **P2 residual** — contradição interna: T4 proíbe cast `as readonly string[]`
  mas o contrato técnico mantém o cast. Sem correção, implementador fica com
  regra contraditória.
- **Q2** — `user_id = 0` sintético vs padrão estabelecido no sistema. Sem
  correção, log de elegibilidade gera registros órfãos em relação à tabela
  `users`.

Os demais 8 pontos foram triados para o prompt F3 (Q1, Q4, Q5, Q8) ou
rejeitados/remetidos (Q3, Q6, Q7, Q9).

### Blocos preservados de v1.1 (integralmente)

- Bloco 1 — Fluxo declarado + escopo reduzido
- Bloco LIM — todas as 5 limitações
- Bloco OBS — plano de observabilidade
- Blocos 2, 3, 4, 6, 6', 7 (exceto T4 refinado em v1.2), 8 (exceto 8.1
  atualização cirúrgica), 9

### Blocos substituídos por v1.2

- **Bloco 5.5 (pseudo-código do caller)** — recebe `ctx.user.id` em vez de
  `0`/sintético (Q2)
- **Bloco 7.2 critério T4** — preserva restrição, esclarece justificação
  aceitável inline (P2)

### Bloco ajustado em v1.2

- **Bloco 5.4** — assinatura de `insertEligibilityAuditLog` muda:
  `userId` e `userName` deixam de ter valor default (passam a ser obrigatórios
  do caller — alinha com padrão `ctx.user.id` do sistema)

---

## Bloco 5.4 (AJUSTADO) — `insertEligibilityAuditLog` sem defaults sintéticos

### v1.1 (anterior):

```typescript
export async function insertEligibilityAuditLog(
  projectId: number,
  result: EligibilityResult,
  operationType: string | null | undefined,
  userId: number = 0,                              // <- default sintético
  userName: string = "system:eligibility-gate"     // <- default sintético
): Promise<void>
```

### v1.2 (substituído):

```typescript
export async function insertEligibilityAuditLog(
  projectId: number,
  result: EligibilityResult,
  operationType: string | null | undefined,
  userId: number,                                  // obrigatório — caller passa ctx.user.id
  userName: string,                                // obrigatório — caller passa ctx.user.name
  userRole: string = "user"                        // default 'user' OK (valor textual não-referencial)
): Promise<void>
```

**Justificativa:** fonte primária — `server/lib/db-queries-risks-v4.ts:565`
confirma que `user_id INT NOT NULL` no schema de `audit_log`
(`drizzle/0064_risks_v4.sql`). Todos os 13+ callers existentes em
`server/routers/risks-v4.ts` passam `ctx.user.id`, sem exceções. O default `0`
violaria esse padrão e geraria registros órfãos em JOINs futuros com `users`.

**Impacto no caller** (Bloco 5.5 atualizado): obrigatório passar usuário real
do contexto tRPC. `ctx.user.id` já está acessível no procedure que contém
`riskEngine.ts:416`.

---

## Bloco 5.5 (SUBSTITUÍDO) — Pseudo-código do caller

### v1.2 — caller passa `ctx.user.id` (Q2)

```typescript
import { isCategoryAllowed, insertEligibilityAuditLog } from "../lib/risk-eligibility";

// operationType extraído do projectProfile já carregado no topo do fluxo
const operationType = extractedProfile?.tipoOperacao ?? null;

// --- dentro do loop de gaps ---

const categoriaSugerida = categorizeRisk({
  description: effectiveDescription,
  lei_ref: gap.req_source_reference || gap.gap_source_reference || null,
  topicos: gap.topicos || null,
  domain: effectiveDomain,
  category: mapDomainToTaxonomy(...).category,
  type: mapDomainToTaxonomy(...).type,
});

const eligibility = isCategoryAllowed(categoriaSugerida, operationType);

// Janela inicial de observação (30 dias pós-deploy — ver Bloco OBS)
const fullAuditMode = process.env.ELIGIBILITY_AUDIT_MODE === "full";
if (fullAuditMode || eligibility.reason !== null) {
  void insertEligibilityAuditLog(
    projectId,
    eligibility,
    operationType,
    ctx.user.id,                                        // <- v1.2: real, não 0
    ctx.user.name ?? ctx.user.email ?? "unknown",       // <- v1.2: real, não sintético
    ctx.user.role ?? "user"                             // <- padrão consistente com risks-v4.ts:455
  );
}

risks.push({
  ...
  categoria: eligibility.final,
  risk_category_code: gap.risk_category_code || null,
});
```

**Verificação pré-implementação (Gate 0 do F3):** confirmar que `ctx.user.id`
está acessível no escopo do procedure tRPC que contém o caller. Minha leitura
do código (fonte: `server/routers/riskEngine.ts` — procedure tRPC com auth)
indica que sim, mas o Claude Code deve validar no F3. Se não estiver,
**PARAR e escalar ao P.O.** — indicaria necessidade de refactor maior que sai
do escopo do hotfix.

---

## Bloco 7.2 critério T4 (SUBSTITUÍDO) — P2 residual resolvido

### v1.1 (anterior):

> T4 (NOVO v1.1 — P2): Nenhum `as readonly string[]` ou cast não justificado
> no código. Usar `isOperationType()` type guard para conversões.

### v1.2 (substituído):

> **T4** (P2 resolvido — contradição eliminada):
>
> 1. **Após** narrow via `isOperationType(v)`, **nenhum cast adicional** é
>    necessário ou permitido. `rule.eligible.includes(normalized)` compila
>    sem cast quando `normalized: OperationType` e
>    `rule.eligible: readonly OperationType[]` (confirmado:
>    tsconfig `target: ES2017`, `strict: true` — `Array.prototype.includes`
>    tem signature compatível).
>
> 2. Se, por alguma razão de target/lib específica, compilação exigir cast,
>    o cast deve:
>    - Vir **acompanhado de comentário inline** justificando a necessidade
>    - Ser o **mais estreito possível** (ex: `as readonly OperationType[]`
>      em vez de `as readonly string[]`)
>
> **Contrato técnico v1.2 remove os casts das linhas 155 e 161 da versão
> v1.1.** Veja Bloco 5.3 abaixo (pseudo-código atualizado) e contrato
> técnico v1.2 (arquivo paralelo).

### Bloco 5.3 (ajustado consequentemente) — pseudo-código `isCategoryAllowed` sem cast

```typescript
// (3) Eligible canônico → permite sem reason (P2: sem cast após narrow)
if (isOperationType(normalized) && rule.eligible.includes(normalized)) {
  return { final: suggested, suggested, allowed: true, reason: null };
}

// (4) Conditional canônico → permite COM reason da regra (P2: sem cast)
if (isOperationType(normalized) && rule.conditional.includes(normalized)) {
  return {
    final: suggested,
    suggested,
    allowed: true,
    reason: rule.conditional_reason,
  };
}
```

Lógica permanece idêntica à v1.1. Apenas os casts inúteis são removidos —
alinha spec com T4.

---

## Aprovação

Esta SPEC v1.2 só entra em vigor com:

1. Comentário explícito do P.O. aprovando v1.2
2. Registro dos hashes SHA-256 em `governance/APPROVED_SPEC.json`:
   - `SPEC-HOTFIX-IS-v1.2.md` (este)
   - `CONTRATO-TECNICO-isCategoryAllowed-v1.2.ts` (atualizado em paralelo)
   - Hashes v1.0, v1.1 permanecem congelados para trilha
3. ADR-0030 v1.1 **permanece em vigor sem amendment** — correções técnicas
   não alteram decisões arquiteturais do ADR
4. Apenas **após** os itens acima, o despacho F3 ao Claude Code pode ser
   emitido

**Nota metodológica registrada no aprovação:** v1.2 é a última revisão formal
antes do F3. Ajustes subsequentes (operacionais, cosméticos, nomenclatura)
entram via prompt F3 ao Claude Code sem amendment adicional — política
"Caminho C" aprovada pelo P.O. em 2026-04-21.

---

## Rastreabilidade

- SPEC v1.0: hash `fe3d70b991eb67a705177f41e643dc9b97d0593d55770301fec405f08a6a9da3` (congelado)
- SPEC v1.1: hash `1c181ac0338d0604b71362ac41e5681b15c5378ab205d2d9c52d3d66b57ea13f` (congelado)
- SPEC v1.2 (este): hash a calcular
- ADR-0030 v1.1: em vigor sem mudança
- Pontos entrando via prompt F3 (não-formais): Q1 (entity_id = gap.gap_id),
  Q4 (draft PR até commit 2), Q5 (renomeação C6), Q8 (JSDoc fix)
- Pontos rejeitados: Q9 (workaround UX fora de escopo)
- Pontos em backlog separado: Q7 (retention audit_log — issue de governança)
- Pontos mantidos como estão: Q3 (enum reservado), Q6 (thresholds com nota)
- Fonte primária Q2: `drizzle/0064_risks_v4.sql` (user_id INT NOT NULL) +
  `server/routers/risks-v4.ts:238,455,502,...` (padrão ctx.user.id)
- Fonte primária P2: `tsconfig.json` (target: ES2017, strict: true)
