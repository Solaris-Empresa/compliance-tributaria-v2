# Sistema de Engenharia de Qualidade — IA SOLARIS
**Versão:** 5.0 | **Data:** 2026-03-31 | **Status:** Produção
**HEAD:** `43ac0252+` | **PRs:** 262+ | **Skills:** v3.4
**Paradigma:** Shift-left · DORA Metrics · Observabilidade · Blameless Culture · ADR

---

## Changelog

| Versão | Data | O que mudou |
|---|---|---|
| 1.0–3.0 | 2026-03-31 | Gates 1–3 estabelecidos |
| 4.0 | 2026-03-31 | Gate 1.5 + template blindado + GitHub Actions R2/R3 |
| **5.0** | **2026-03-31** | **Gate 0 Discovery · Gate 2.5 Risk Score · Gate 4 Post-mortem · DORA · Observabilidade · Feature Flags · ADR · S6 Rollback** |

---

## 1. Filosofia v5.0 — da reatividade à antecipação

### 1.1 O salto conceitual

As versões 1–4 focaram em **prevenir bugs conhecidos**.
A versão 5.0 adiciona uma camada superior: **prevenir a feature errada**.

```
v1–v3  →  Gates eliminam bugs após a decisão de construir
v4.0   →  Template blindado elimina bugs de execução
v5.0   →  Gate 0 questiona se a feature deve ser construída
           Observabilidade detecta anomalias antes do usuário
           Post-mortem garante que o sistema aprende, não apenas reage
```

### 1.2 Os 3 princípios adicionados

**Shift-left:** cada verificação é puxada para o momento mais cedo possível no ciclo. O custo de uma correção cresce exponencialmente com o tempo — prevenir no Gate 0 custa 1x, corrigir em produção custa 100x.

**DORA Metrics:** o sistema mede sua própria saúde em 4 dimensões: frequência de deploy, lead time, MTTR e change failure rate. Gates sem métrica são intenções; gates com métrica são contratos.

**Blameless Culture:** post-mortem obrigatório após qualquer bug em produção, focado em sistemas, não em pessoas. O objetivo é tornar o Gate 0 ou o Passo 0 mais robusto — nunca punir.

### 1.3 Mapa completo dos 6 gates

| Gate | Momento | Elimina | Novo em v5 |
|---|---|---|---|
| Gate 0 — Discovery | Antes da spec | Feature errada, ADR faltante | ✅ |
| Gate 1 — Spec | Antes do código | Bugs de design, contrato de dados | +S6 rollback |
| Gate 1.5 — Implementação | Durante o código | Bugs de execução (R1–R8) | — |
| Gate 2 — Q1–Q7 | Antes do commit | Bugs de implementação | +Q6/Q7 CI |
| Gate 2.5 — Review + Risk Score | Antes do merge | Risco não dimensionado | ✅ |
| Gate 3 — Debug v2 | Pós-anomalia | Ciclos longos de investigação | +MTTR |
| Gate 4 — Post-mortem | Pós-fix | Regressão do mesmo bug | ✅ |

---

## 2. Gate 0 — Discovery (pré-spec)

> **Novo em v5.0 — evita especificar a feature errada**

### 2.1 Regra

> Nenhuma SPEC é iniciada sem que as 4 perguntas do Gate 0 estejam respondidas.

Custo de um Gate 0 negligenciado: specs de features que violam bloqueios permanentes, duplicam funcionalidade existente ou requerem decisão arquitetural não documentada.

### 2.2 As 4 perguntas

```
D1 — Colide com algum bloqueio permanente?
     Verificar: ESTADO-ATUAL.md → seção BLOQUEIOS
     Se sim: Gate 0 = NO-GO até o bloqueio ser resolvido

D2 — Requer decisão arquitetural nova?
     Critério: muda schema, adiciona dependência, altera pipeline de dados
     Se sim: criar ADR antes da SPEC

D3 — Qual o risk score desta feature?
     [ ] low  — hotfix, chore, docs: Gate 0 dispensado
     [ ] medium — nova procedure, componente, migration
     [ ] high  — novo pipeline, integração externa, mudança de enum global

D4 — O critério de aceite do P.O. é objetivamente testável?
     Formato: "Funcionou quando: [ação] → [resultado específico e mensurável]"
     Se vago: Gate 0 = NO-GO até refinar
```

### 2.3 ADR — Architecture Decision Record

Quando D2 = sim, criar `docs/adr/NNNN-nome.md` antes da SPEC:

```markdown
# ADR-NNNN — [título da decisão]
**Data:** YYYY-MM-DD | **Status:** proposto | **Autores:** P.O., Claude

## Contexto
[Por que esta decisão precisa ser tomada agora]

## Opções consideradas
| Opção | Prós | Contras |
|---|---|---|
| A | ... | ... |
| B | ... | ... |

## Decisão
[Opção escolhida e justificativa]

## Consequências
- Positivas: [...]
- Negativas / trade-offs: [...]
- Bloqueios gerados: [...]

## Revisão obrigatória se
[Condição que tornaria esta decisão obsoleta]
```

### 2.4 Formato de aprovação

```
Gate 0 — [feature]
D1 bloqueios: [OK / BLOQUEADO — qual]
D2 ADR:       [N/A / ADR-NNNN criado]
D3 risco:     [low / medium / high]
D4 critério:  [texto testável]

[ ] GO — iniciar SPEC
[ ] NO-GO — [o que precisa ser resolvido antes]
```

---

## 3. Gate 1 — Spec (pré-código)

### 3.1 As 6 seções (S6 novo em v5.0)

#### S1 — Definição funcional

```
FUNCIONALIDADE: [nome canônico]
ISSUE:          [#N]
RISK SCORE:     [low | medium | high] — herdado do Gate 0
QUEM USA:       [advogado | P.O. | sistema]
O QUE FAZ:      [1 frase — verbo + objeto + resultado mensurável]
O QUE NÃO FAZ:  [limites explícitos]
CRITÉRIO P.O.:  "Funcionou quando: [ação] → [resultado]"
ADR:            [N/A | ADR-NNNN]
```

#### S2 — Contrato de dados (não apenas "fluxo")

Em v5.0, S2 é um **contrato**, não um diagrama. Cada campo é declarado com tipo de entrada, transformação, tipo no banco, tipo de saída e valor de exemplo:

```
campo         | tipo_input    | transform              | tipo_banco | tipo_output   | exemplo
--------------|---------------|------------------------|------------|---------------|--------
vigencia_inicio | string?     | trim() || null         | VARCHAR?   | string | null  | "2026-01-01"
severidade    | enum          | nenhuma                | ENUM       | enum          | "critica"
resposta      | string        | trim().toLowerCase()   | TEXT       | string        | "não"
```

**Regra:** campo não declarado = bug não identificado. Se houver dúvida sobre o tipo, declarar como "A DEFINIR" — nunca omitir.

#### S3 — Checklist TiDB + driver declarado

```
□ LIMIT/OFFSET via conn.execute()?
  → Interpolar: LIMIT ${parseInt(String(n), 10)}

□ SELECT DISTINCT + ORDER BY?
  → ORDER BY só colunas no SELECT | ou GROUP BY + MAX()

□ Campo opcional pode chegar como '' do frontend?
  → .transform(v => v?.trim() || null) obrigatório

□ JOIN pode duplicar linhas?
  → GROUP BY ou subquery

□ Driver de banco desta feature:
  [ ] Opção A — raw MySQL (conn.execute / pool.execute)
  [ ] Opção B — Drizzle ORM (tx.insert / tx.delete)
  [ ] Opção C — Drizzle raw (db.execute(sql`...`))
  → Declarar aqui. Não mudar durante a implementação sem novo Gate 0.
```

#### S4 — Skeleton de erro + observabilidade

**Backend — structured logging obrigatório:**
```typescript
// Início da operação — contexto estruturado
console.log(JSON.stringify({ event: 'operacao.iniciada', projectId, funcao: 'nomeFn', ts: Date.now() }));

try {
  // implementação
  console.log(JSON.stringify({ event: 'operacao.concluida', projectId, inserted: result.inserted }));
} catch (error) {
  // Erro estruturado — nunca mensagem livre
  console.error(JSON.stringify({ event: 'operacao.falhou', projectId, error: String(error), stack: (error as Error)?.stack }));
  throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '[desc para o usuário]' });
}
```

**Frontend — 3 estados distintos + acessibilidade:**
```typescript
if (isLoading) return <Skeleton aria-label="Carregando..." />
if (isError)   return (
  <Alert variant="destructive" role="alert" aria-live="assertive">
    <AlertDescription>{error.message || 'Erro ao carregar dados'}</AlertDescription>
  </Alert>
)
if (!data?.length) return <Empty role="status">Nenhum item encontrado</Empty>
return <Lista data={data} />
// isError NUNCA tratado como lista vazia
```

#### S5 — Plano de testes (5 casos mínimos)

```
Caso 1 — Caminho feliz:     [input → resultado → SELECT de validação]
Caso 2 — Campo vazio:       ['' → NULL → WHERE campo='' retorna 0]
Caso 3 — Lista vazia:       [filtro sem resultado → [] + isError=false]
Caso 4 — Erro de banco:     [falha → mensagem visível + evento de log]
Caso 5 — Idempotência:      [2ª execução → mesmo resultado, sem duplicação]
```

#### S6 — Estratégia de rollback (novo em v5.0)

```
DEPLOY STRATEGY:
  [ ] direto — feature sem risco de regressão
  [ ] feature flag — habilitar por usuário/ambiente
  [ ] migration reversível — DOWN migration declarada

ROLLBACK PROCEDURE (se algo der errado):
  1. [ação imediata — ex: desabilitar feature flag]
  2. [ação de dados — ex: executar DOWN migration]
  3. [verificação — SELECT que confirma rollback]

DOWN MIGRATION (se aplicável):
  ALTER TABLE ... DROP COLUMN ...;

CRITÉRIO DE ROLLBACK:
  "Fazer rollback se: [condição mensurável — ex: error rate > 1%]"
```

---

## 4. Gate 1.5 — Implementação (durante o código)

As 8 regras R1–R8 permanecem inalteradas da v4.0. Adições v5.0:

### 4.1 R9 — Observabilidade como requisito (novo)

```typescript
// Toda função que persiste dados deve emitir evento estruturado
// no início, no sucesso e na falha — não apenas no catch

// Estrutura mínima do evento:
{
  event: '[módulo].[operação].[status]', // ex: 'g17.analyzeSolaris.falhou'
  projectId: number,
  funcao: string,
  durationMs?: number,   // medir tempo de execução
  inserted?: number,     // para operações de escrita
  error?: string         // apenas no status falhou
}
```

### 4.2 R10 — Feature flag para risco medium/high (novo)

```typescript
// Se o Gate 0 classificou a feature como medium ou high:
// Envolver a lógica em feature flag antes de habilitar em produção

import { isFeatureEnabled } from '../config/feature-flags';

if (!isFeatureEnabled('g17-solaris-gap-engine', projectId)) {
  return { inserted: 0, skipped: true };
}
// lógica principal aqui
```

---

## 5. Gate 2 — Q1–Q7 (pré-commit)

### 5.1 Os 7 checks + automação

| Check | Valida | Automação v5 |
|---|---|---|
| Q1 — Tipos nulos | Campos opcionais gravam NULL | Grep + revisão |
| Q2 — SQL TiDB | LIMIT ?, DISTINCT+ORDER BY | GitHub Action |
| Q3 — Filtros NULL/'' | Ambos cobertos | Revisão |
| Q4 — Endpoint registrado | Router importado | Grep |
| Q5 — isError ≠ vazio | Frontend diferencia | 13 testes auto |
| Q6 — Retorno explícito | `{ inserted: N }` confirmado via SELECT | GitHub Action |
| Q7 — Driver único | Sem mistura no mesmo arquivo | GitHub Action |

### 5.2 Automações GitHub Actions (v5.0)

```yaml
# validate-implementation.yml — 4 jobs

validate-r2-driver:
  # R2: detecta mistura de Drizzle ORM + raw SQL no mesmo arquivo
  # BLOQUEIA PR se violação detectada

validate-r3-atomicity:
  # R3: detecta DELETE + INSERT sem transação
  # BLOQUEIA PR se violação detectada

validate-q6-return:
  # Q6: funções async em server/lib/ não podem retornar void
  # AVISA (não bloqueia) — P.O. confirma manualmente

validate-observability:
  # R9: funções de persistência em server/lib/ têm evento estruturado?
  # AVISA se ausente
```

### 5.3 Declaração no PR body (atualizada v5.0)

```
## Auto-auditoria Q1–Q7 + observabilidade

Q1 — Tipos nulos:         [ OK | N/A ] — [evidência]
Q2 — SQL TiDB:            [ OK | N/A ] — [evidência]
Q3 — Filtros NULL/'':     [ OK | N/A ] — [evidência]
Q4 — Endpoint registrado: [ OK | N/A ] — [evidência]
Q5 — isError ≠ vazio:     [ OK | N/A ] — [evidência]
Q6 — Retorno explícito:   [ OK | N/A ] — [inserted confirmado via SELECT]
Q7 — Driver único:        [ OK | N/A ] — [Opção A/B/C]
R9 — Evento estruturado:  [ OK | N/A ] — [evento emitido]
S6 — Rollback declarado:  [ OK | N/A ] — [estratégia]

Risk score (herdado Gate 0): [ low | medium | high ]
Resultado: [ APTO | BLOQUEADO — motivo ]
```

---

## 6. Gate 2.5 — Review + Risk Score (pré-merge)

> **Novo em v5.0 — dimensiona o risco antes de mergear**

### 6.1 Regra

> PRs de risco low podem ser mergeados pelo P.O. diretamente após CI verde.
> PRs de risco medium requerem revisão do Claude antes do merge.
> PRs de risco high requerem revisão do Claude + parecer do ChatGPT.

### 6.2 Risk score matrix

| Critério | +1 ponto |
|---|---|
| Novo arquivo em `server/lib/` | +1 |
| Nova migration | +2 |
| Alteração em pipeline de dados existente | +2 |
| Integração com sistema externo | +2 |
| Mudança em enum global | +2 |
| Fire-and-forget sem teste de integração | +1 |
| Feature flag ausente (risco medium/high da Gate 0) | +1 |

**Score 0–2:** low → CI verde + merge P.O.
**Score 3–4:** medium → revisão Claude + merge P.O.
**Score 5+:** high → revisão Claude + parecer ChatGPT + merge P.O.

---

## 7. Gate 3 — Protocolo de Debug v2 (pós-anomalia)

### 7.1 Novidade v5.0: anomalia vs. bug

Em v5.0, o Gate 3 é acionado por **anomalia detectada por observabilidade**, não apenas por bug reportado pelo usuário. O Passo 0 expande de 7 para 10 padrões:

### 7.2 Passo 0 — Fast path (10 padrões)

| Sintoma | Padrão | Comando direto |
|---|---|---|
| Lista retorna 0 após insert OK | `''` em vez de NULL | `SELECT campo FROM t WHERE campo = ''` |
| TiDB: "Incorrect arguments to LIMIT" | `LIMIT ?` via conn.execute() | `grep -n "LIMIT ?" server/` |
| TiDB: ORDER BY inválido | DISTINCT + ORDER BY fora do SELECT | `grep -n "DISTINCT" server/` |
| Endpoint 404 | Router não registrado | `grep -n "NOME" server/routers.ts` |
| UI vazia sem mensagem | `isError` = lista vazia | `grep -n "isError" client/` |
| Deploy não reflete | Branch não mergeada | `git log main --oneline -3` |
| Query múltiplas vezes | `queryInput` sem `useMemo` | `grep -n "useMemo" client/` |
| INSERT silencioso falha | Enums inválidos + catch engolindo | `grep -n "ausencia\|nao_compliant" server/lib/` |
| Script backfill falha | Import de router (side effects) | `grep -n "from.*routers" scripts/` |
| Mistura de drivers | Drizzle ORM + raw SQL | `grep -n "conn.execute\|\.insert(" FILE.ts` |

**Meta v5.0:** 85%+ dos bugs resolvidos no Passo 0.

### 7.3 MTTR como métrica do Gate 3

Registrar no post-mortem:
- `t0` — anomalia detectada (observabilidade ou usuário)
- `t1` — causa raiz identificada (LOCAL + CONDIÇÃO + EVIDÊNCIA)
- `t2` — fix mergeado em produção
- `MTTR = t2 - t0`

**Meta:** MTTR < 1h para bugs P0, < 4h para P1.

---

## 8. Gate 4 — Post-mortem (pós-fix)

> **Novo em v5.0 — o sistema aprende, não apenas reage**

### 8.1 Regra

> Todo bug em produção que passou pelos Gates 1–3 requer um post-mortem.
> Post-mortem foca em sistemas e processos — nunca em pessoas (blameless).
> Output obrigatório: pelo menos 1 item de melhoria em um gate existente.

### 8.2 Template de post-mortem

```markdown
# Post-mortem — [título do bug]
**Data:** YYYY-MM-DD | **Severidade:** P0/P1/P2 | **MTTR:** Xh Ymin
**Autores:** [Claude, P.O.]

## 1. Sumário executivo (3 linhas máximo)
[O que aconteceu, por quanto tempo, qual o impacto]

## 2. Timeline
| Horário | Evento |
|---|---|
| HH:MM | Anomalia detectada por [observabilidade / usuário] |
| HH:MM | Causa raiz identificada |
| HH:MM | Fix aplicado em produção |

## 3. Causa raiz — 5 Whys
Por que o bug ocorreu?          → [resposta]
Por que [resposta] aconteceu?   → [resposta 2]
Por que [resposta 2] aconteceu? → [resposta 3]
Por que [resposta 3] aconteceu? → [resposta 4]
Por que [resposta 4] aconteceu? → [causa raiz sistêmica]

## 4. O que funcionou bem
[Gates, processos ou ferramentas que ajudaram]

## 5. O que pode melhorar
[Oportunidades de melhoria — nunca culpar pessoas]

## 6. Ações corretivas (obrigatórias)

| Ação | Gate afetado | Responsável | Prazo |
|---|---|---|---|
| Adicionar padrão ao Passo 0 | Gate 3 | Claude | Imediato |
| Atualizar tabela de erros | Skill | Manus | PR desta sprint |
| Criar teste de regressão | Gate 2 Q5 | Manus | PR desta sprint |
| [Outra ação] | [Gate N] | [Agente] | [Prazo] |

## 7. Métricas DORA impactadas
- MTTR: [valor real] vs. meta (<1h)
- Change failure rate: [+1 ocorrência esta sprint]
```

### 8.3 O loop de aprendizado obrigatório

Toda ação do post-mortem que melhora um gate deve ser implementada **antes do início da próxima sprint**:

```
Bug em produção
    ↓
Post-mortem → ação de melhoria identificada
    ↓
PR de chore: tabela de erros + Passo 0 + skill atualizado
    ↓
Na próxima sprint: Passo 0 resolve esse padrão em 1 mensagem
```

---

## 9. Observabilidade — padrões do projeto

### 9.1 Structured logging (obrigatório em v5.0)

```typescript
// Eventos padronizados — sempre JSON, nunca texto livre
const log = (event: string, data: Record<string, unknown>) =>
  console.log(JSON.stringify({ event, ts: Date.now(), ...data }));

// Uso:
log('g17.analyzeSolaris.iniciado', { projectId, answersCount: answers.length });
log('g17.analyzeSolaris.concluido', { projectId, inserted: result.inserted, durationMs });
log('g17.analyzeSolaris.falhou', { projectId, error: String(err) });
```

### 9.2 Eventos de negócio críticos a instrumentar

| Evento | Quando emitir |
|---|---|
| `onda1.concluida` | `completeOnda1` executado com sucesso |
| `g17.gaps.inseridos` | `analyzeSolarisAnswers` insere gaps |
| `briefing.gerado` | `briefingEngine` finaliza |
| `projeto.aprovado` | Status final do projeto |
| `*.falhou` | Qualquer operação crítica que lança erro |

---

## 10. Feature Flags — governança

### 10.1 Quando usar

Obrigatório para qualquer feature com risk score ≥ medium (Gate 0 D3).

### 10.2 Ciclo de vida

```
1. Feature implementada → flag desabilitada por padrão (false)
2. Habilitar para P.O. apenas → validar em produção
3. Habilitar para todos → se MTTR e CFR estáveis
4. Remover flag → PR de chore após 1 sprint estável
```

### 10.3 Registro no `server/config/feature-flags.ts`

```typescript
export const FEATURE_FLAGS: Record<string, boolean> = {
  'g17-solaris-gap-engine': true,     // habilitado — Sprint N validado
  'g18-fonte-risco':        false,    // aguarda implementação
  'diagnostic-read-mode-new': false,  // bloqueio permanente Issue #61
};
```

---

## 11. DORA Metrics — contrato de saúde

| Métrica | Definição | Meta | Como medir |
|---|---|---|---|
| **Deployment frequency** | Deploys por semana | Diária (Sprint pace) | PRs mergeados em main / semana |
| **Lead time for changes** | Issue criada → produção | < 1 dia (features simples) | `t_merge - t_issue_created` |
| **MTTR** | Anomalia detectada → fix em prod | P0: < 1h / P1: < 4h | Post-mortem timeline |
| **Change failure rate** | % de deploys que causam bug | < 5% | PRs com label `hotfix` / total PRs |

**Dashboard:** atualizar no `MODELO-OPERACIONAL.md` a cada sprint com os valores reais.

---

## 12. Tabela de erros recorrentes (v5.0)

| Data | Bug | Causa raiz (5 Whys resumido) | Gate preventivo | MTTR |
|---|---|---|---|---|
| 2026-03-30 | Lista retorna 0 após upsert | `vigencia_inicio = ''` → IS NULL não encontra | G0 D4 + G1 S3 + G2 Q1 | ~2h |
| 2026-03-30 | TiDB rejeita scoringEngine | DISTINCT + ORDER BY → incompatibilidade TiDB | G1 S3 + G2 Q2 | ~1h |
| 2026-03-31 | Lista retorna 0 silencioso | `LIMIT ?` → bind param TiDB rejeita | G1 S3 + G2 Q2 | ~3h |
| 2026-03-31 | Race condition tRPC | `queryInput` sem `useMemo` → re-renders | G1 S4 + G2 Q5 | ~1h |
| 2026-03-31 | isError silencioso | `isError` = lista vazia → 13 testes auto | G1 S4 + G2 Q5 | ~2h |
| 2026-03-31 | G17 INSERT silencioso | Enums inválidos + catch engolindo | G1.5 R5 + G2 Q6 | ~4h |
| 2026-03-31 | Script backfill side effects | Import de router em script | G1.5 R1 | ~2h |
| 2026-03-31 | Mistura de drivers | Drizzle ORM + raw SQL | G1.5 R2 + G2 Q7 | ~1h |
| 2026-03-31 | `void` impossível de validar | `Promise<void>` em função de persistência | G1.5 R4 + G2 Q6 | ~1h |

---

## 13. Localização no repositório (v5.0)

| Item | Arquivo | Seção |
|---|---|---|
| Gate 0 — Discovery | `skills/solaris-contexto/SKILL.md` | `## GATE 0 — DISCOVERY` |
| ADRs | `docs/adr/NNNN-nome.md` | — |
| Gate 1 — Spec | `skills/solaris-contexto/SKILL.md` | `## GATE DE SPEC` |
| Gate 1.5 — Implementação | `skills/solaris-orquestracao/SKILL.md` | `## TEMPLATE DE IMPLEMENTAÇÃO BLINDADO` |
| Gate 2 — Q1–Q7 | `skills/solaris-orquestracao/SKILL.md` | `## GATE DE QUALIDADE` |
| Gate 2 — CI (Q1–Q5) | `.github/scripts/validate-pr-body.js` | `validateGateQ1Q5` |
| Gate 2 — CI (R2/R3/Q6/Q7) | `.github/workflows/validate-implementation.yml` | 4 jobs |
| Gate 2 — Testes Q5 | `server/gates/q5-iserror.test.ts` | 13 testes |
| Gate 2.5 — Risk Score | `skills/solaris-orquestracao/SKILL.md` | `## RISK SCORE` |
| Gate 3 — Debug | `skills/solaris-contexto/SKILL.md` | `## PROTOCOLO DE DEBUG v2` |
| Gate 4 — Post-mortem | `docs/governance/POST-MORTEM-TEMPLATE.md` | — |
| Feature Flags | `server/config/feature-flags.ts` | — |
| DORA Metrics | `docs/governance/MODELO-OPERACIONAL.md` | `## DORA METRICS` |
| PR template | `.github/pull_request_template.md` | `## Auto-auditoria Q1–Q7` |
| Tabela de erros | `skills/solaris-orquestracao/SKILL.md` | `## Erros recorrentes` |

---

## 14. Roadmap de maturidade

| Fase | Gates ativos | Paradigma | Sprint alvo |
|---|---|---|---|
| v1–v3 | 1–3 | Reativo — corrige bugs conhecidos | Sprint L–M |
| v4.0 | +1.5 | Preventivo — template blindado | Sprint N |
| **v5.0** | **+0, +2.5, +4** | **Antecipativo — observabilidade + post-mortem** | **Sprint N** |
| v6.0 | — | Preditivo — alertas automáticos via log events | Sprint O |
| v7.0 | — | Autônomo — Manus executa Gate 0 e abre issue | Sprint P+ |

---

## 15. Resumo executivo — antes × v5.0

| Dimensão | Sprint L | Sprint M | Sprint N (v4) | v5.0 |
|---|---|---|---|---|
| Gates | 0 | 3 | 4 | **6** |
| Feature errada previne? | ❌ | ❌ | ❌ | **✅ Gate 0** |
| Anomalia detectada antes do usuário? | ❌ | ❌ | ❌ | **✅ Observabilidade** |
| Bug aprendido sistematicamente? | ❌ | parcial | parcial | **✅ Post-mortem Gate 4** |
| Risco dimensionado antes do merge? | ❌ | ❌ | ❌ | **✅ Risk Score Gate 2.5** |
| Rollback planejado? | ❌ | ❌ | ❌ | **✅ S6 + Feature Flag** |
| MTTR medido? | ❌ | ❌ | ❌ | **✅ DORA** |
| Rodadas de crítica/prompt | ilimitado | 3–5 | 7 (G17) | **meta: ≤1** |
| CI checks automáticos | 0 | Q1–Q5 | +R2/R3 | **+Q6/Q7/R9** |
| Passo 0 padrões | 0 | 7 | 10 | **10 + auto-update pós post-mortem** |
