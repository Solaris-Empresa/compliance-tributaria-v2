# ADR-0034 — Remoção do dashboard compliance-v3 legado (Fase 1: frontend órfão + router)

## Status: Fase 1 implementada · 2026-06-03 · Aprovação P.O. (Opção 1)
## Supersedes: ADR-0029 Decision D-5 (parcial nesta fase; total na Fase 2)

---

## Supersession statement (obrigatório)

> This ADR supersedes ADR-0029 Decision D-5. The preservation of the
> `compliance-v3/` subtree was a temporary measure during the V3→V4 transition
> (ADR-0022 hot swap). The transition is complete. Dead code removal is now
> authorized.

A supersession é **parcial** na Fase 1 (remove apenas o frontend órfão + o router
`complianceV3`) e será **total** na Fase 2 (aposenta os engines V3 e dropa as
tabelas).

## Contexto

A rota `/compliance-v3/*` foi retirada no z22 UAT B-02b (`App.tsx` — imports e
`<Route>` removidos), pois o dashboard V3 lia agregados zerados após o hot swap
ADR-0022 (`project_risks_v3` vazia). O subtree `client/src/**/compliance-v3/`
permaneceu por decisão de preservação temporária (ADR-0029 D-5).

Investigação de orfandade (read-before-write) revelou duas correções à premissa
inicial "23 arquivos = dead code":

1. **Componentes de visualização são lib viva.** 5 dos 23 arquivos
   (`RiskMatrix4x4`, `ComplianceKPICards`, `ComplianceRadarChart`, `Badges`,
   `types/compliance-v3/index.ts`) são consumidos por **3 rotas ativas**:
   `/demo/riscos`, `/demo/dashboard`, `/matriz-riscos-session`. NÃO são órfãos.
2. **Tabelas e engines V3 têm acoplamento ativo.** `project_risks_v3` /
   `project_briefings_v3` são escritos por funções (`persistRisks`,
   `persistBriefing`) alcançáveis via procedures tRPC ainda registradas
   (`riskEngine.deriveAndPersist`, `briefingEngine.generate`) — dead-in-practice
   mas exigem aposentadoria explícita antes de qualquer `DROP TABLE`.

## Decisão

### Fase 1 (este ADR / PR `chore/adr-0034-pr1-fe-cleanup`) — implementada

Remover **apenas o que é comprovadamente órfão**, sem migration nem toque em engines:

**Removido (18 arquivos + router):**
- `client/src/pages/compliance-v3/*` — 8 páginas (sem rota)
- `client/src/hooks/compliance-v3/*` — 8 hooks (consumidos só pelas páginas órfãs)
- `client/src/components/compliance-v3/dashboard/ExecutiveNarrative.tsx`
- `client/src/components/compliance-v3/shared/DomainScoreBar.tsx`
- `server/routers-compliance-v3.ts` + registro em `server/routers.ts`

**Mantido (5 arquivos vivos — lib de visualização):**
- `components/compliance-v3/dashboard/{RiskMatrix4x4,ComplianceKPICards,ComplianceRadarChart}.tsx`
- `components/compliance-v3/shared/Badges.tsx`
- `types/compliance-v3/index.ts`

### Fase 2 (PR-2 `chore/adr-0034-pr2-engines-drop` — BLOQUEADO) — pendente

Pré-requisito: AS-IS/TO-BE com impact-tree (REGRA-ORQ-41), Classe B estrutural
(REGRA-ORQ-20). Escopo: aposentar `persistBriefing`/`generate` (briefingEngine) +
`persistRisks`/`deriveAndPersist` (riskEngine), remover import morto em
`routers-fluxo-v3.ts:75`, atualizar testes, `DROP TABLE project_briefings_v3` +
`project_risks_v3`, limpar def Drizzle órfã `projectRisksV3`. Supersession total
do ADR-0029 D-5.

## Consequências

- O diretório `compliance-v3/` **sobrevive legitimamente** como lib de visualização
  (4 componentes + tipos). A DoD original `grep "compliance-v3" client/src = 0` foi
  **descartada** por ser incompatível com a realidade; substituída por
  `grep "pages/compliance-v3|hooks/compliance-v3|ExecutiveNarrative|DomainScoreBar" = 0`.
- Tabelas `project_risks_v3` (0 rows) e `project_briefings_v3` (3 rows, resíduo
  pré-migração de 20/05) permanecem inertes até a Fase 2.

## Lição — sweep de orfandade por caminho, não por linha

O método `grep -v "/compliance-v3/"` é **falso negativo estrutural**: filtra pela
linha casada, escondendo imports de componentes (`@/components/compliance-v3/...`)
feitos por arquivos **de fora** do subtree (o path importado contém a string
filtrada). Foi exatamente o que escondeu `DemoRiscos:3` e `DemoDashboard:5-7` no
primeiro sweep.

**Método correto:** excluir por **caminho de arquivo**, não por conteúdo de linha:
```
rg -n "from ['\"]@/.../compliance-v3" client/src -g '!**/compliance-v3/**'
```
Registrar para todo sweep de remoção de dead code.

## Vinculadas

- ADR-0029 D-5 (preservação temporária — superseded aqui)
- ADR-0022 (hot swap risk engine v4 — origem da obsolescência do V3)
- REGRA-ORQ-20 · REGRA-ORQ-35 · REGRA-ORQ-41 (Fase 2)
- z22 UAT B-02b (remoção da rota — `App.tsx`)
