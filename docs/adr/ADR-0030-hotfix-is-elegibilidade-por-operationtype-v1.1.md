# ADR-0030 AMENDMENT — Hotfix IS: ajustes pós-crítica do implementador (v1.1)

## Status: Proposto · 2026-04-21 · Aprovação P.O. pendente
## Supersede (parcial): ADR-0030 v1.0 (mesma data)
## Referência: SPEC-HOTFIX-IS-v1.1 (amendment paralelo)

---

## Natureza deste amendment

**Delta sobre ADR-0030 v1.0.** Blocos preservados:
- Contexto completo
- D-1 (autorização do hotfix como exceção à REGRA MESTRA)
- D-2 (gate baseado em `operationType`) — **exceto** coluna "Elegibilidade IS"
  que muda para `agronegocio`
- D-3 (desenho H-C2)
- D-4 (infraestrutura para 10 categorias)
- G-1, G-2, G-3, G-4, G-5 (todos os guardrails)

Blocos substituídos:
- **D-5** (fail-safe permissivo) — reforço de trigger de reavaliação (OBS-4)
- **D-6** (agronegocio) — muda de ELEGÍVEL condicional para **NÃO-ELEGÍVEL**
- **D-7** (fora de escopo) — ganha itens novos (backfill, refactor M2)

Bloco novo:
- **D-8 — Limitações declaradas e dívida técnica** (E1, E2, E3, D5, P5 do
  Claude Code)

---

## D-5 (SUBSTITUÍDO) — Fail-safe permissivo com trigger de reavaliação

Mantido todo o conteúdo da v1.0. **Adição:**

> Se queries de baseline (Q-BASE-04 da SPEC v1.1) revelarem que **> 30% dos
> projetos em produção não têm `operationType` preenchido**, o P.O. deve
> reabrir esta decisão. Taxa alta de `reason=operation_type_ausente` indica
> que a premissa "fallback permissivo" está mascarando muitos casos que
> deveriam ser revisados. Nesse cenário, alternativas a considerar:
>
> - (a) Script de backfill de `operationType` baseado em CNAE principal
> - (b) Bloqueio de criação de projeto sem `operationType` preenchido
> - (c) Mudança para fail-safe restritivo (inverte a decisão atual)
>
> Reavaliação programada: 30 dias após deploy (ver SPEC Bloco OBS).

## D-6 (SUBSTITUÍDO) — Agronegócio passa a NÃO-ELEGÍVEL

**v1.0 decidiu:** agronegocio ELEGÍVEL condicional com reason
`agro_requer_revisao`.

**v1.1 decide:** agronegocio **NÃO-ELEGÍVEL** (tratamento idêntico a
`servicos` e `financeiro`).

**Justificativa da mudança** (resposta à crítica D1 do Claude Code):

1. **Semântica jurídica:** produtor rural genérico não é sujeito passivo de
   IS na LC 214. Sujeito passivo é a indústria (usina de álcool
   combustível, fabricante de cigarros, destilaria). Quem deveria receber IS
   nesse caso tem `operationType='industria'`, não `agronegocio`.

2. **Middle-ground prejudicial:** deixar agronegocio como conditional gerava
   warning permanente em audit_log para 100% dos casos agro, sem ação real
   tomada sobre cada warning. Transformaria audit em ruído.

3. **Reversibilidade:** se a equipe jurídica ou o P.O. identificar caso
   concreto onde agro deveria receber IS (ex: cooperativa agro que também é
   produtora de bem sujeito), abrir issue específica → reclassificar aquele
   cenário individual → eventualmente o arquetipo M1 discrimina por
   `objetos[]`.

4. **Consistência com o ADR:** G-1 ("zero campo novo") + D-2 (single-dimension
   por `operationType`) já implicam que casos de fronteira ficam para o
   arquetipo. Agro é caso de fronteira.

**Atualização da tabela do D-2:**

| `operationType` | Elegibilidade IS (v1.0) | Elegibilidade IS (v1.1) |
|---|---|---|
| `industria` | ELEGÍVEL | ELEGÍVEL |
| `comercio` | ELEGÍVEL | ELEGÍVEL |
| `misto` | ELEGÍVEL | ELEGÍVEL |
| **`agronegocio`** | **ELEGÍVEL condicional** | **NÃO ELEGÍVEL** (mudança) |
| `servicos` | NÃO ELEGÍVEL | NÃO ELEGÍVEL |
| `financeiro` | NÃO ELEGÍVEL | NÃO ELEGÍVEL |

`EligibilityReason="agro_requer_revisao"` permanece definido no enum, mas
**não é exercitado em v1.1** (reservado para futuro uso em outras categorias
com outras conditional_reasons — garantia de extensibilidade via campo
`conditional_reason` na `EligibilityRule`).

## D-7 (SUBSTITUÍDO) — Fora de escopo (ampliado)

Mantidos todos os itens da v1.0. **Adicionados:**

- **Correção retroativa de riscos já gravados em `project_risks_v3`** — não
  há backfill no escopo deste hotfix (ver D-8 LIM-4). Usuário precisa
  regenerar briefing para obter categoria atualizada.

- **Resolução da incongruência RAG/LLM no texto dos briefings** — chunks RAG
  sobre IS continuam sendo recuperados e o LLM pode incorporar no texto
  mesmo quando a categoria é bloqueada pelo gate. Correção fica para M2
  (filtragem pré-RAG por arquetipo).

- **Correção das outras 3 categorias Padrão A** (`regime_diferenciado`,
  `aliquota_zero`, `aliquota_reduzida`) — ficam ativas em produção como bug
  conhecido documentado (ver D-8 LIM-3). Correção via preenchimento futuro
  de `ELIGIBILITY_TABLE` (padrão D-4).

- **Refator estrutural de `ELIGIBILITY_TABLE` para aceitar arquetipo** — em
  M2 a tabela terá que evoluir de `Record<Categoria, Rule>` para
  `Record<Categoria, Rule<Arquetipo>>` com múltiplas dimensões (ver D-8
  LIM-5).

## D-8 (NOVO) — Limitações declaradas e dívida técnica

Em resposta às críticas E1, E2, E3, D5, P5 do Claude Code, este ADR declara
explicitamente as limitações aceitas como dívida técnica controlada:

| ID | Limitação | Impacto aceito | Correção prevista |
|---|---|---|---|
| LIM-1 | Gate single-dimension (só `operationType`) não resolve distribuidora/varejista de bem IS | Padrão A de bug persiste para comércio que revende bem IS sem ser produtor | M1 Arquetipo — campo `papel_na_cadeia` + `objetos[]` (NCM) |
| LIM-2 | Incongruência RAG/LLM: texto do briefing pode mencionar IS enquanto categoria é `enquadramento_geral` | Possível confusão visual do usuário final ao ler briefing de empresa bloqueada | M2 RAG com Arquetipo — filtro pré-RAG elimina chunks IS de arquetipos não-elegíveis |
| LIM-3 | 3 categorias análogas (`regime_diferenciado`, `aliquota_zero`, `aliquota_reduzida`) permanecem bugadas em produção | Falso positivo recorrente nos relatórios de risco dessas categorias | M6/M7 — preenchimento da `ELIGIBILITY_TABLE` por categoria via ADRs derivados |
| LIM-4 | Riscos já gravados indevidamente em `project_risks_v3` não são corrigidos retroativamente | Base histórica carrega erro até regeneração manual dos briefings | Backfill OPCIONAL a decidir após janela OBS de 30 dias |
| LIM-5 | `ELIGIBILITY_TABLE` tem estrutura single-dimension; arquetipo M1 é multi-dimension — **refator estrutural no M2** | Custo de integração M2 é maior que "ampliação de assinatura" | Planejado na spec M2 (a escrever) |

**Princípio operacional desta declaração:** limitações aceitas são
**explícitas**, não "zero regressão disfarçando zero correção". UAT deve
verificar que os bugs declarados em LIM-1 a LIM-5 **continuam ocorrendo**
conforme documentado — não é falha, é escopo.

---

## Atualização de contrato de papéis

(sem mudança vs v1.0)

---

## Rastreabilidade

- ADR v1.0: hash `710a1551050aee83f4c82b294b320092ab16d1bdcc30460a0313af746ca2bda5`
- ADR v1.1 (este amendment): hash a calcular
- SPEC v1.1: amendment paralelo
- Crítica origem: Claude Code, 2026-04-21 (13 pontos estruturais/design/polimento)
- Validação da crítica: Orquestrador, 2026-04-21 (100% procedente)
- Decisão do P.O.: 2026-04-21 (10 ajustes + 3 dívidas técnicas aceitas)
- Fonte primária `operationType`: inalterada vs v1.0
- Descoberta primária adicional: schema `audit_log` resolve P6 sem migration
  (Orquestrador, 2026-04-21)

---

## AMENDMENT 2026-04-22 — Correção de caller (política fechada: inline, não v1.2)

### Motivação

UAT P.O. em produção (2026-04-22) após merge do PR #826 (commit `871cbe8`)
reproduziu o bug original: transportadora `operationType='servico'` continuou
recebendo categoria `imposto_seletivo`.

### Causa raiz identificada

**Investigação D (2026-04-22):** gate `isCategoryAllowed` foi aplicado em
`server/routers/riskEngine.ts` (engine v3 legado), mas o frontend usa
`useNewRiskEngine=true` → `trpc.risksV4.generateRisks` →
`server/lib/risk-engine-v4.ts` (engine v4). v3 **é caller inativo no runtime**.

Adicionalmente: projeto de teste tinha `operationType='servico'` (singular),
valor não-canônico em `OperationType`. Gate caía no caso (6)
`operation_type_desconhecido` com `allowed: true` — warning registrado mas
sem downgrade.

### Decisão da política de amendment

**Política fechada em 2026-04-22:** correções pós-aprovação de ADR entram
como **amendment inline** em `v1.1`, **sem** criar `v1.2` separado. Hash
do arquivo muda, mas o identificador `ADR-0030 v1.1` permanece e é tratado
como "v1.1 amended".

Motivos:
- Evitar proliferação de versões para ADRs ainda vivos (este é o 2º amendment)
- Simplificar rastreabilidade (um único ADR-0030 v1.1, progressivo)
- Hash registrado em `APPROVED_SPEC-HOTFIX-IS.json` permite verificação

### Ajustes aplicados (Hotfix IS v1.2.1)

- **Contrato:** `docs/specs/CONTRATO-TECNICO-isCategoryAllowed-v1.2.1.ts` (NOVO)
- **Código:**
  - `server/lib/risk-eligibility.ts`: adicionado privado `OPERATION_TYPE_ALIASES` (1 entrada: `servico → servicos`) + `normalizeOperationType` privada, aplicada inline em `isCategoryAllowed`
  - `server/lib/risk-engine-v4.ts`: gate aplicado em `consolidateRisks` (caller efetivo) com `.catch(() => {})` explícito no audit log (não `void`)
- **Testes:** 4 unit (`risk-eligibility.test.ts`) + 4 integration (`risk-engine-v4.test.ts` Bloco G) obrigatórios
- **Preservados (invariantes do amendment):**
  - SPEC-HOTFIX-IS-v1.2.md **intocada** (hash `80176084...`)
  - `server/routers/riskEngine.ts` **intocado** (v3 como fallback/protegido)
  - `ELIGIBILITY_TABLE` e assinatura pública de `isCategoryAllowed` **intocadas**
  - `OPERATION_TYPE_ALIASES` e `normalizeOperationType` **NÃO exportadas**

### Lição de processo registrada

Gate 0 de hotfix passa a incluir **"verificar caller efetivo em runtime, não
apenas caller existente no código"**. F3 original rodou
`grep -rn "categorizeRisk" server/` mas não verificou se o módulo era
consumido pelo frontend em produção (v3 vs v4). Essa verificação agora é
obrigatória em todo F3 de hotfix envolvendo engine com múltiplas versões.

### Rastreabilidade adicional

- PR anterior do hotfix: #826 (merge 2026-04-22T14:21:40Z, commit `871cbe8`)
- Investigação D: realizada pelo Claude Code em 2026-04-22
- F3 pré-v2: vocabulário divergente `servico` vs `servicos` confirmado
- Contrato v1.2.1: criado em 2026-04-22 (hash a calcular)
- Amendment hash (este arquivo após edição): a calcular

---

## AMENDMENT 2 · 2026-04-22 — Correção de regressão FK (v2.1 · Opção A)

### Motivação

UAT P.O. imediatamente pós-deploy do Hotfix v2 (PR #840, commit `8cf303d`)
reproduziu novo bug:

```
Erro ao analisar gaps
Cannot add or update a child row: a foreign key constraint fails
(risks_v4.categoria REFERENCES risk_categories.codigo)
```

Matriz de riscos fica vazia para empresas `operationType=servicos` com
gap de `imposto_seletivo` detectado.

### Causa raiz

Gate v2 aplica `downgrade_to='enquadramento_geral'` quando bloqueia IS. Mas
essa categoria **não estava registrada** em 4 locais:

1. Coluna `risks_v4.categoria` (ENUM com apenas 10 valores — migration 0064)
2. Tabela `risk_categories` (referenciada por FK `fk_risks_v4_categoria` —
   migration 0065 seed só carregou 10 rows)
3. Enum TS `Categoria` em `server/lib/risk-engine-v4.ts`
4. Enum TS `CategoriaV4` em `server/lib/db-queries-risks-v4.ts` +
   `CategoriaV4Schema` Zod em `server/routers/risks-v4.ts`

INSERT em `risks_v4` falhou com FK constraint → matriz vazia em produção.

### Decisão (Opção A · aprovada pelo P.O. 2026-04-22)

Tornar `enquadramento_geral` uma categoria canônica registrada. Fallback
natural — quando gate bloqueia e o sistema não tem categoria específica,
o risco é enquadrado como "geral" com severidade média / urgência curto_prazo.

### Ajustes aplicados (Hotfix IS v2.1)

- **Migration 0089** (NOVO, `drizzle/0089_enquadramento_geral_categoria.sql`):
  - `ALTER TABLE risks_v4 MODIFY COLUMN categoria ENUM(... 11 valores)`
  - `INSERT INTO risk_categories` — 1 row (`codigo='enquadramento_geral'`,
    `severidade='media'`, `urgencia='curto_prazo'`, `tipo='risk'`,
    `origem='manual'`, `escopo='nacional'`)
- **Código (3 arquivos):**
  - `server/lib/risk-engine-v4.ts`: `Categoria` + `SEVERITY_TABLE` +
    `TITULO_TEMPLATES` ganham entry `enquadramento_geral`
  - `server/lib/db-queries-risks-v4.ts`: `CategoriaV4` ganha entry
  - `server/routers/risks-v4.ts`: `CategoriaV4Schema` Zod ganha entry
- **Teste A7 atualizado** — cobertura `SEVERITY_TABLE` passa de 10 para
  11 categorias (10 canônicas + 1 fallback)

### Preservados (invariantes do amendment)

- SPEC-HOTFIX-IS-v1.2.md **intocada** (hash `80176084...`)
- CONTRATO v1.2.1 **intocado** (hash `887dfca7...`) — comportamento do gate
  não mudou, apenas infraestrutura DB+enum para aceitar o resultado do gate
- `server/routers/riskEngine.ts` (v3) **intocado**
- `server/lib/risk-eligibility.ts` **intocado** (`ELIGIBILITY_TABLE.downgrade_to='enquadramento_geral'` permanece)
- Comportamento das 10 categorias canônicas **inalterado**

### Lição de processo registrada

Gate 0 de hotfix v2 rodou testes unit mockando `getCategoryByCode`. Não
houve teste de **persist real** contra schema — bug de FK só apareceu em
produção após deploy. Gate 0 passa a incluir:

> "Quando o hotfix muda valores que vão para schema ENUM ou FK target, exigir
> teste integration que execute INSERT contra DB real (ou schema mock fiel)
> antes do merge."

Alternativa pragmática: adicionar CI job com TiDB dockerizado para testes de
persist — registrar como issue de tech-debt pós-hotfix.

### Rastreabilidade v2.1

- PR antecessor: #840 (merge 2026-04-22T18:45:10Z, commit `8cf303d`)
- Causa raiz reportada pelo P.O.: 2026-04-22 (toast FK constraint error)
- Diagnóstico Claude Code: 2026-04-22 (causa raiz em 4 locais)
- Opção A aprovada pelo P.O.: 2026-04-22
- Migration 0089: numbered após 0088 (drop CPIE legado)
- Amendment 2 hash: a calcular
