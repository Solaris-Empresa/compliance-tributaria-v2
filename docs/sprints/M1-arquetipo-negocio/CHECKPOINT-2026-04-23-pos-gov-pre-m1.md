# Checkpoint pré-M1 · 2026-04-23 · pós-formalização GOV-PRE-M1

> Snapshot consolidado do estado da exploração pré-M1 (Epic #830) em
> 2026-04-23, incluindo a formalização do padrão GOV-PRE-M1 como regra
> de governança reutilizável.

---

## Estado sincronizado (R-SYNC-01)

- **`origin/main` HEAD:** `9f05cd1` — sem mudança desde o último checkpoint v7.58 do Hotfix IS
- **3 branches ativas na família Epic #830 / pré-M1:**

| Branch | HEAD | Propósito |
|---|---|---|
| `docs/m1-arquetipo-exploracao` | `03ca41e` | Trabalho exploratório SPEC v3.1 + bateria 50 cenários + mockups v4.1 |
| `docs/pre-m1-exploracao` | `1b245d0` (tag `pre-m1-estrutura-inicial`) | Estrutura formal Epic #830 — `docs/epic-830-rag-arquetipo/` com 8 BLOCKERS populados |
| `docs/gov-pre-m1-exploracao-governada` | `6d9b7f5` (PR #844 aberto) | Formalização GOV-PRE-M1 como regra de governança reutilizável |

- **Issue #843:** `[Docs] Pré-M1 Exploração — Epic #830` — tracking aberto
- **PR #844:** `docs(governance): formalizar GOV-PRE-M1 exploração governada` — aberto, `MERGEABLE`, aguardando P.O.

---

## Conquistas desta fase

### 1. Modelo dimensional consolidado como paradigma

**Insight-chave do consultor:**
> Sistema de **decisão**, não de **classificação**.

Modelo com 5 eixos independentes: `objeto`, `papel_na_cadeia`, `tipo_de_relacao`, `territorio`, `regime`. Regras agem por dimensão, não por combinação. Elimina explosão combinatória do tipo `13 naturezas × 12 papéis × N subsetores`.

### 2. Bateria de 50 cenários validada (v2 enriquecida)

- **49 PASS + 1 BLOCKED (S27 controle negativo multi-CNPJ)** · 0 FAIL
- PASS rate 98% · confidence média 0.619 · max 82%
- Todas as 8 `must_cover_rules` acionadas
- 30 serviços + 13 indústria + 7 agro (distribuição ponderada PIB BR 2024)

### 3. SPEC v3.1-rev1 pronta para rodada D

- 7 ajustes P.O. incorporados (score≠gate, justificativa não eleva, rename acceptRisk, injection E restrito, multi-CNPJ 2 níveis, marketplace backlog, alinhamento mockup v4.1-rev1)
- Enum canônico decidido: `pendente/inconsistente/bloqueado/confirmado`
- 6 injection points do `STOP_IF_NOT_ELIGIBLE` declarados
- 3 camadas explícitas (AS-IS / Transitional / Target)

### 4. 8 BLOCKERS identificados e documentados

Todos abertos no `BLOCKERS-pre-m1.md`:
1. Sobreposição natureza × posição na cadeia
2. "CNAE principal confirmado" — quem confirma?
3. **Operador `CONTAINS` em categoria semântica (CRÍTICO)**
4. Regra usa `natureza = "misto"` (valor inexistente)
5. Redundância `possui_bens` × `tipo_objeto_economico`
6. "Setores complexos" indefinido
7. "Regime específico" sem efeito
17. `tipo_objeto_economico` colapsa "operar" vs "comercializar"

Núcleo #1+#5+#17 deve ser resolvido junto (modelo dimensional).

### 5. Contrato M1→M2 esqueleto documentado

`CONTRATOS-ENTRE-MILESTONES.md` com schema proposto para `Arquetipo` incluindo:
- 5 eixos dimensionais
- Metadados obrigatórios: `versao_modelo` + `calculado_em` + `imutavel: true`
- Política de imutabilidade CONSOLIDADA

### 6. Governança formalizada — GOV-PRE-M1 v1.0

Nova regra `docs/governance/GOV-PRE-M1-EXPLORACAO-GOVERNADA.md` reutilizável para futuros Epics críticos. 14 seções com:
- Quando aplicar / dispensar (critérios objetivos)
- 8 regras obrigatórias
- 5 tags de checkpoint canônicas
- 8 antipadrões explícitos
- Exemplo real: Epic #830

---

## Decisões consolidadas (viraram ou virarão ADR)

| # | Decisão | Status | Próximo passo |
|---|---|---|---|
| 1 | Modelo dimensional (5 eixos independentes) | Design consolidado | ADR-0031 |
| 2 | Arquétipo é imutável após cálculo (snapshot) | Consolidada | ADR-0032 |
| 3 | Não há migração automática quando modelo evolui | Consolidada | ADR-0032 (junto com imutabilidade) |
| 4 | Score é explicabilidade, não gate | Consolidada (rev1) | parte de SPEC final |
| 5 | Ciência de inconsistência não eleva status | Consolidada (rev1) | parte de SPEC final |
| 6 | Multi-CNPJ: informativo OU denied (2 níveis) | Consolidada (rev1) | parte de SPEC final |
| 7 | `invokeLLM` com opt-in `archetype_required` | Consolidada (rev1) | parte de SPEC final |

---

## Bloqueadores para GO (REGRA-M1-GO-NO-GO)

**Status:** 🔴 **NO-GO** — implementação M1 segue suspensa.

Condições obrigatórias pendentes:

- **C1 Modelo determinístico** · pendente ADR-0031 (modelo dimensional formalizado)
- **C2 Bateria 15/15** · **substituída** por bateria 50 cenários com 49 PASS + 1 BLOCKED (98%) · rodada D com vocabulário rev1 pendente consultor entregar `APPROVED_SPEC` hash-locked
- **C3 Amarração form↔testes** · pendente 8 BLOCKERS serem resolvidos

**Adicionais pós-rev1:**
- `isEligible()` com 100% cobertura de branches (testes unitários)
- 6 injection points do `STOP_IF_NOT_ELIGIBLE` cobertos
- `acknowledgeInconsistency` com teste dedicado (não elevando para allowed)

---

## Próximos passos sugeridos

1. **P.O. aprova PR #844** (GOV-PRE-M1 v1.0) — não bloqueia nada mas fecha formalização
2. **Consultor entrega SPEC v3.1-rev1 como `APPROVED_SPEC` hash-locked**
3. **Claude Code executa Rodada D:**
   - Adapta `run-50-v2.mjs` → `run-50-v3.mjs` com vocabulário rev1
   - Re-roda 50 cenários + testes específicos (score≠gate, acknowledge não eleva, multi-CNPJ 2 níveis)
   - Espera **49 PASS + 1 BLOCKED + 0 FAIL**
4. **P.O. decide ADR-0031 + ADR-0032** (modelo dimensional + imutabilidade)
5. **Resolver 8 BLOCKERS** (núcleo #1+#5+#17 junto; #3 prioritário)
6. **Cenários 1 e 13 prontos** (transportadora canônica + multi-CNPJ bloqueio)
7. **Se tudo PASS** → F1 (SPEC formal com Bloco 9) → implementação autorizada

---

## Proibições ativas

REGRA-M1-GO-NO-GO continua em vigor:

- ❌ Implementação M1
- ❌ Alterar backend
- ❌ Alterar RAG
- ❌ Migrations
- ❌ Mergear PR #844 sem aprovação P.O.

Permitido:
- ✅ Documentação adicional em branches `docs/*`
- ✅ ADRs
- ✅ Mockups
- ✅ Simulação / validação

---

## Artefatos desta fase (links)

**Documentação M1 exploração (branch `docs/m1-arquetipo-exploracao`):**
- `EXPLORACAO.md` — histórico vivo
- `SPEC-v3.1-rev1-M1-PERFIL-ENTIDADE.md` + `.json`
- `MOCKUP_perfil_entidade_deterministico_v4_1.html`
- `ADR-M1-PAINEL-CONFIANCA-E-CNAES-v1.md`
- `RESULT-50-casos-brasil-v2.json` (49 PASS)
- `CODIGO-ATUAL-VERDADE.md`
- `PESQUISA-MERCADO.md`

**Estrutura pré-M1 Epic #830 (branch `docs/pre-m1-exploracao`):**
- `docs/epic-830-rag-arquetipo/README.md`
- `docs/epic-830-rag-arquetipo/specs/BLOCKERS-pre-m1.md` (8 BLOCKERS)
- `docs/epic-830-rag-arquetipo/specs/CONTRATOS-ENTRE-MILESTONES.md`
- `docs/epic-830-rag-arquetipo/specs/PENDING-DECISIONS.md`
- Tag `pre-m1-estrutura-inicial`
- Issue #843

**Governança (PR #844 aberto):**
- `docs/governance/GOV-PRE-M1-EXPLORACAO-GOVERNADA.md`

---

## Nota de método

Este checkpoint não substitui um ciclo completo de audit v7.XX (que exigiria auditoria Manus + HEADs alinhados em 4 remotes + deploy prod). É snapshot **parcial pós-GOV-PRE-M1** focado no Epic #830.

Próximo checkpoint full-audit virá após: (a) rodada D aprovada, (b) PR #844 mergeado, (c) ADR-0031+0032 publicados. Esse seria o candidato natural a v7.59 `docs(checkpoint):`.
