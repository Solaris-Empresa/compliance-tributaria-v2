# Post-Mortem — Mono-Fonte na Matriz de Riscos (#3570002)

**Data:** 2026-05-05
**Severidade:** P0 produto (UI exibe informação incorreta há ≥3 sprints)
**Sprints relacionadas:** M3.7 · M3.8 (PRs #967, #968, #969, #970, #971) · M3.8.1 (PRs #973, #974)
**Atores diagnóstico:** Manus + Claude Code (convergência cruzada independente)
**Projeto canônico:** #3570002 — empresa transportadora de combustíveis (criado pós-deploy M3.8.1)
**Status:** ⏸ aguardando direção do P.O. — fix NÃO implementado

---

## 1. Sumário executivo

A matriz de riscos da UI exibe **uma única fonte** (`source_priority`) para 100% dos riscos em todos os projetos testados, apesar do usuário responder negativamente a perguntas de 3 fontes distintas (Q.SOLARIS, Q.IA Gen, Q.NBS). O bug persistiu por **3 sprints consecutivos** porque os fixes propostos atacaram sintomas downstream em vez da causa raiz upstream.

**Causa raiz dupla** (validada por Manus + Claude Code independentemente):

1. **Bug arquitetural (upstream):** os 28 gaps `solaris` + 8 gaps `iagen` inseridos por `solaris-gap-analyzer.ts` e `iagen-gap-analyzer.ts` são **escritas órfãs** — nenhum código os lê para alimentar o pipeline de risco. O frontend só envia ao engine os 138 gaps `v1` retornados por `gapEngine.analyzeGaps`.

2. **Bug de metadado (latente):** mesmo se incluídos no pipeline, gaps `solaris`/`iagen` têm `risk_category_code = NULL` e `source_reference` contém código de tópico (não artigo legal). `GapToRuleMapper` cairia em "unmapped" e descartaria.

**Convergência diagnóstica:** ambos os agentes (Manus + Claude Code) chegaram à mesma conclusão sem se consultar, com evidência de banco e trace de código.

---

## 2. Sintoma observado (#3570002)

P.O. respondeu "Não" para:
- 12 perguntas Q.SOLARIS
- 3 perguntas Q.IA Gen
- 15 perguntas Q.NBS

Esperava ver riscos derivados de 3 fontes distintas na matriz. Observou:

| Categoria | Severidade | source exibida |
|---|---|---|
| Inscrição Cadastral | Alta | `regulatorio` |
| Split Payment | Alta | `regulatorio` |
| Confissão Automática | Alta | `regulatorio` |
| Obrigação Acessória | Média | `regulatorio` |
| Transição ISS/IBS | Média | `regulatorio` |
| Regime Diferenciado | Média | `regulatorio` |

**6/6 riscos com fonte única.** Mesmo padrão antes da Sprint M3.8.1 (que era 6/6 `iagen`). M3.8.1 só trocou qual fonte vence — não tocou na causa raiz.

---

## 3. Causa raiz detalhada

### 3.1 Problema 1 — Gaps SOLARIS/IAGEN órfãos (arquitetural)

Há **2 caminhos paralelos** que gravam em `project_gaps_v3` que **nunca se conectam**:

**Caminho A — ativo (gera riscos):**
```
respostas Q.CNAE/Q.NBS idN
  → questionnaireAnswersV3 / service_answers
  → gapEngine.analyzeGaps (server/routers/gapEngine.ts:254-453)
  → project_gaps_v3 (source='v1')
  → result.gaps retornado ao frontend
  → frontend envia para risksV4.mapGapsToRules + generateRisksFromGaps
  → consolidateRisks → riscos persistidos
```

**Caminho B — órfão (NÃO gera riscos):**
```
respostas Q.SOLARIS / Q.IA Gen
  → solaris_answers / iagen_answers
  → analyzeSolarisAnswers (fire-and-forget) / analyzeIagenAnswers (fire-and-forget)
  → project_gaps_v3 (source='solaris' / 'iagen')
  → ❌ nenhum consumidor downstream
```

Evidência empírica (#3570002 banco):
- 138 gaps `source='v1'` ✅ entram no pipeline
- 28 gaps `source='solaris'` ❌ órfãos
- 8 gaps `source='iagen'` ❌ órfãos

`RiskDashboardV4.tsx:736` confirma o caminho A:
```typescript
const gapInputs = (result.gaps ?? []).map(...) // só os 138 v1
```

### 3.2 Problema 2 — Metadados insuficientes nos órfãos (latente)

Mesmo se os 36 gaps órfãos entrassem no pipeline, falhariam na categorização. Comparação no banco:

| Campo | Gaps `v1` (138) | Gaps `solaris` (28) | Gaps `iagen` (8) |
|---|---|---|---|
| `risk_category_code` | ✅ preenchido (`'confissao_automatica'`, etc) | ❌ `NULL` em todos | ❌ `NULL` em todos |
| `source_reference` | Artigo legal (`'LC 214 Art. 9'`) | Tópico (`'confissao_automatica'`) | Tópico (`'nfe'`, `'cgibs'`) |
| `requirement_id` | `'REQ-XXX-NNN'` | `'0'` | `'0'` |

`GapToRuleMapper.mapOne()` decide pela ordem:
- **Caso A:** `gap.categoria` (= risk_category_code) existe → mapeado ✅
- **Caso B:** `gap.sourceReference` é artigo legal → resolve via lookup
- **Caso C:** sem categoria + sem artigo válido → `unmapped` ❌

Para gaps `solaris`/`iagen`: cairiam em Caso C (silenciados via `reviewQueue`).

### 3.3 Por que `inferFonte` retornar `"regulatorio"` é consequência, não causa

`gap-to-rule-mapper.ts:258` retorna `"regulatorio"` quando `allowLayerInference=false` (DEC-Z10-05). Como **todos** os 138 gaps no pipeline são `v1` com fonte derivada via `inferFonte`, todos viram `"regulatorio"`.

Se Caminho A consumisse multi-fonte, esta linha continuaria correta para os gaps regulatórios — o problema é a **entrada mono-fonte**, não a função.

### 3.4 Diagrama de fluxo de dados (writers vs readers em `project_gaps_v3`)

```
                     ┌─────────────────────────────────────────────┐
                     │           project_gaps_v3                    │
                     └─────────────────────────────────────────────┘
                              ▲                       │
                              │ WRITES                │ READS
                              │                       │
              ┌───────────────┼───────────────┐       │
              │               │               │       │
   ┌──────────┴────────┐ ┌────┴──────────┐ ┌─┴────────┴──┐    ┌──────────────────┐
   │ gapEngine.        │ │ solaris-gap-  │ │ iagen-gap-  │    │ getGaps          │
   │ analyzeGaps       │ │ analyzer      │ │ analyzer    │    │ (UI listagem)    │
   │ (138 v1)          │ │ (28 solaris)  │ │ (8 iagen)   │    │                  │
   │                   │ │ FIRE-AND-     │ │ FIRE-AND-   │    │ ← lê TODOS       │
   │ → result.gaps     │ │ FORGET        │ │ FORGET      │    │   sources        │
   │   retornado UI    │ │               │ │             │    │                  │
   └─────────┬─────────┘ └───────────────┘ └─────────────┘    └──────────────────┘
             │
             │ result.gaps  (somente os 138 v1 — solaris/iagen NÃO incluídos)
             ▼
   ┌────────────────────┐
   │ RiskDashboardV4    │
   │ frontend           │
   └─────────┬──────────┘
             │ gapInputs (138)
             ▼
   ┌────────────────────┐     ┌──────────────────┐
   │ risksV4.           │ →   │ consolidateRisks │ → risks_v4 (todos `regulatorio`)
   │ generateRisksFrom  │     │                  │
   │ Gaps               │     │                  │
   └────────────────────┘     └──────────────────┘

   ❌ BURACO ARQUITETURAL: 28+8=36 gaps órfãos escritos em project_gaps_v3
                          NÃO TÊM CONSUMIDOR para o caminho de risco.
                          Apenas getGaps (UI de listagem) os lê — não o risk-engine.
```

**Writers em `project_gaps_v3`:** 3 (gapEngine v1, solaris-analyzer, iagen-analyzer)
**Readers para risco:** 0 (frontend só usa `result.gaps` do gapEngine)
**Readers para listagem UI:** 1 (`getGaps` — lê todos sources, mas não alimenta risk-engine)

O buraco é visualmente óbvio: **3 escritores, 0 leitores no caminho de risco.**

---

## 4. Evidência empírica de banco (Manus, 2026-05-05)

```sql
-- Gaps por source no projeto #3570002
SELECT source, COUNT(*), 
       SUM(risk_category_code IS NOT NULL) AS com_categoria
FROM project_gaps_v3 
WHERE project_id = 3570002 
GROUP BY source;

source   | count | com_categoria
---------|-------|---------------
v1       | 138   | 138    -- todos com risk_category_code
solaris  | 28    | 0      -- 100% NULL
iagen    | 8     | 0      -- 100% NULL

-- Riscos persistidos
SELECT categoria, source_priority, severidade
FROM risks_v4 
WHERE project_id = 3570002 AND status='active';

8 rows · TODAS source_priority='regulatorio'
```

Total no banco: **174 gaps** (138 + 28 + 8). Riscos derivados: **8** — todos da partição de 138 v1.

---

## 5. Histórico de tentativas falhadas

| Sprint | PR | Hipótese aplicada | Por que errou |
|---|---|---|---|
| M3.8-1B | #968 | "Hardcode `'solaris'` no client mascara fonte real" | Trocou string fixa por outra string fixa. Sintoma jamais foi hardcode — frontend SEMPRE recebeu mono-fonte da entrada |
| M3.8-2 | #969 | "Q.NBS idN ativa multi-fonte via service_answers" | Ativou mas não conectou Q.SOLARIS/Q.IA Gen. Aumentou metadata em 3/138 gaps mas não tocou nos 36 órfãos |
| M3.8.1 Bug A | #973 | "Wipe destrutivo apaga gaps multi-fonte" | Verdade: scoped DELETE preservou gaps órfãos no banco. Mas preservar escritas que ninguém lê não muda matriz |
| M3.8.1 Bug B | #973 | "Default `'iagen'` mascara fontes" | Trocou `'iagen'` por `'regulatorio'`. Trocou nome do mascarador. Entrada mono-fonte permaneceu |
| M3.8.1 Bug C | #973 | "`Fonte` type sem `'regulatorio'`" | Verdade técnica isolada. Bug independente, não cura sintoma |
| M3.8.1 followup | #974 | "ENUM banco sem `'regulatorio'`" | Verdade técnica. Aplicada por Manus em prod via ALTER TABLE manual (smoke desbloqueou). Mas não toca causa raiz |

**Padrão:** todos os 6 fixes mexeram em código DOWNSTREAM (consumidores de gaps). O bug está UPSTREAM (gaps das 2 outras fontes nunca chegam ao consumidor).

---

## 6. Por que tests passaram apesar do bug

`server/lib/m3.8.1-hotfix.test.ts` (16 tests PASS) cobriu `getBestSourcePriority` chamada com gaps multi-fonte simulados — cenário que o sistema real **nunca produz** porque o frontend só envia mono-fonte. Os tests testaram a função isolada, não o caminho real do pipeline.

**Lição #59 (REGRA-ORQ-27 — assemble ≠ consumption) reincidiu pela 2ª vez consecutiva:**
- Lição #59 original (Sprint M3): 3 engines passaram tests + CI + APPROVE em dead code
- Reincidência v7.62 (M3.8): audit-greps passaram apesar dos bugs B/C latentes (capturada como Lição #64)
- Reincidência v7.63 (este post-mortem): tests unitários + smoke E2E de banco passaram apesar do bug arquitetural

**Padrão recorrente:** validação de função isolada ≠ validação de fluxo end-to-end. Smoke E2E baseado em **count de banco** mascara o bug porque os gaps órfãos existem (banco mostra multi-source), mas nunca alimentam o consumidor (UI mostra mono-source).

---

## 7. Por que o diagnóstico atual é diferente — UPSTREAM vs DOWNSTREAM

**O ponto crítico que diferencia este diagnóstico dos 3 anteriores:**

Nas 6 tentativas anteriores, **todos os fixes mexeram em código DOWNSTREAM** — funções que processam gaps depois que eles entram no pipeline:

| Sprint | Onde mexeu (DOWNSTREAM) | Função alterada |
|---|---|---|
| M3.8-1B | Frontend mascarando | `deriveSourceOrigin` no client |
| M3.8.1 Bug B | Ranking de prioridade | `getBestSourcePriority` |
| M3.8.1 Bug C | Tipo + ENUM | `Fonte` + `SOURCE_RANK` + DB ENUM |
| M3.8.1 Bug A | Persistência | `DELETE` em `gapEngine.analyzeGaps` |

**Diagnóstico atual aponta UPSTREAM** — gaps `solaris`/`iagen` nunca chegam ao pipeline porque ninguém os lê. O bug está antes do processamento, na **entrada** do pipeline:

```
[Resposta usuário]
  ↓
[3 writers paralelos em project_gaps_v3] ← onde os 36 gaps órfãos vivem
  ↓
[❌ falta consumidor que leia TODOS] ← BUG UPSTREAM aqui
  ↓
[Pipeline de risco recebe só gaps v1] ← downstream OK mas mono-fonte
  ↓
[Riscos com fonte única]
```

### Critérios objetivos de diferença

| Critério | Sprints anteriores (6 fixes) | Diagnóstico atual |
|---|---|---|
| **Local do bug** | DOWNSTREAM (processamento) | **UPSTREAM (entrada)** |
| **Evidência usada** | Inferência por leitura de código + tests unitários | **Queries reais ao banco** (138 v1 + 28 solaris + 8 iagen com `risk_category_code = NULL`) |
| **Convergência** | Apenas Claude Code | **Manus + Claude Code independentemente** |
| **Verificabilidade pré-implementação** | Hipótese sem teste empírico | **Dry-run sem alteração de código pode provar ou refutar** |
| **Tipo de fix proposto** | Trocar string/default/tipo (cirúrgico) | **Mudança arquitetural (conectar caminhos paralelos)** |

### Garantia que pode ser oferecida

Manus executa dry-run em memória (zero alteração de banco/código):
1. Carrega os 36 gaps órfãos do banco
2. Preenche `risk_category_code` derivando de `source_reference`
3. Passa pelo `GapToRuleMapper` + `consolidateRisks`
4. Inspeciona output: `source_priority` distintos?

**Se output multi-fonte** → diagnóstico empiricamente provado → autorizar implementação
**Se output ainda mono-fonte** → existe outro bug não detectado → parar e investigar

**Garantia honesta:** nada garante 100% antes de implementar. Mas dry-run move o risco de "implementar fix com hipótese" para "implementar fix com prova" — algo que não foi feito nas 3 sprints anteriores e é o motivo pelo qual erramos 6 vezes.

---

## 8. Fix técnico — passos sequenciais (B é PRÉ-REQUISITO de A)

**IMPORTANTE:** o que parecia "opções A/B/C independentes" na análise inicial são na verdade **dependências sequenciais**. Sem Fix B, nenhuma estratégia de pipeline (A/B/C) funciona — porque os gaps órfãos cairiam em "unmapped" no `GapToRuleMapper`.

### Passo 1 — Fix B (PRÉ-REQUISITO obrigatório)

**Preencher `risk_category_code` nos INSERTs dos 2 analyzers órfãos:**

#### `solaris-gap-analyzer.ts` — exemplo concreto antes/depois

```typescript
// ANTES (server/lib/solaris-gap-analyzer.ts):
await conn.execute(
  `INSERT INTO project_gaps_v3 (project_id, source, source_reference, ...)
   VALUES (?, 'solaris', ?, ...)`,
  [projectId, gap.topico, ...]
  // ❌ risk_category_code NÃO é incluído → fica NULL
);

// DEPOIS:
await conn.execute(
  `INSERT INTO project_gaps_v3 (project_id, source, source_reference, risk_category_code, ...)
   VALUES (?, 'solaris', ?, ?, ...)`,
  [projectId, gap.topico, gap.topico, ...]
  // ✅ risk_category_code = source_reference (gap.topico já é código de categoria, ex: 'confissao_automatica')
);
```

#### `iagen-gap-analyzer.ts` — exemplo concreto antes/depois

```typescript
// ANTES (server/lib/iagen-gap-analyzer.ts):
const riskCategoryCode = row.risk_category_code; // já vem de iagen_answers
await conn.execute(
  `INSERT INTO project_gaps_v3 (project_id, source, source_reference, ...)
   VALUES (?, 'iagen', ?, ...)`,
  [projectId, riskCategoryCode, ...]
  // ❌ risk_category_code da resposta NÃO é persistido na coluna correspondente
);

// DEPOIS:
await conn.execute(
  `INSERT INTO project_gaps_v3 (project_id, source, source_reference, risk_category_code, ...)
   VALUES (?, 'iagen', ?, ?, ...)`,
  [projectId, riskCategoryCode, riskCategoryCode, ...]
  // ✅ risk_category_code persistido na coluna dedicada
);
```

**Sem Fix B, qualquer estratégia downstream falha:** `GapToRuleMapper.mapOne()` cairia no Caso C (sem categoria + sem artigo legal válido) → gaps órfãos virariam `unmapped` e seriam descartados via `reviewQueue`. Resultado: matriz continuaria mono-fonte.

**Validação Fix B isolado (antes de Fix A):**
```sql
SELECT source, COUNT(*), SUM(risk_category_code IS NOT NULL) AS com_categoria
FROM project_gaps_v3
WHERE project_id = <projeto-teste>
GROUP BY source;

-- Esperado pós-Fix B: solaris e iagen têm com_categoria = COUNT(*)
-- Reprovado se com_categoria < COUNT(*) em qualquer source
```

### Passo 2 — Fix A (estratégia de consumo escolhida)

**Após Fix B aplicado**, escolher 1 de 3 estratégias de pipeline:

| # | Estratégia | Complexidade | Risco | Recomendação |
|---|---|---|---|---|
| **A1** | Backend `risksV4.generateRisksFromGaps` lê `project_gaps_v3` direto (todos sources) | Moderada | Baixo (backward-compat se input.gaps continua opcional) | ✅ **Preferida** (Manus + Claude Code) |
| **A2** | Frontend chama analyzers antes do `analyzeGaps` e junta no client | Alta | Alto (race conditions, timing fire-and-forget) | ❌ Não recomendada |
| **A3** | `gapEngine.analyzeGaps` consome `solaris_answers` + `iagen_answers` (1 caminho único) | Alta | Alto (viola separação de responsabilidades atuais) | ❌ Não recomendada |

### Risco de regressão — DELETE de riscos aprovados

⚠️ **CRÍTICO para produção:**

`generateRisksFromGaps` chama `deleteRisksByProject(projectId)` antes de inserir os novos riscos. Isso significa que **riscos já aprovados pelo advogado serão DELETADOS e regenerados**. Implicações:

- Aprovações manuais (status `aprovado`) serão perdidas
- Comentários do advogado (se houver) podem ser perdidos
- Action plans vinculados a riscos aprovados precisam ser revalidados
- Historico de auditoria de aprovação fica órfão

### Estratégia de mitigação obrigatória (snapshot + rollback)

**1. Snapshot pré-execução (obrigatório por projectId)**

Antes de qualquer chamada a `generateRisksFromGaps`, o script de fix DEVE executar:

```sql
-- Cria tabela snapshot timestampada
CREATE TABLE risks_v4_snapshot_<projectId>_<timestamp> AS
SELECT * FROM risks_v4 WHERE project_id = <projectId>;

-- Cria índice para lookup rápido durante restore
CREATE INDEX idx_snap_<projectId>_<timestamp>_key ON risks_v4_snapshot_<projectId>_<timestamp>(risk_key);

-- Verificação: snapshot tem mesma contagem que origem
SELECT 'origem' AS fonte, COUNT(*) FROM risks_v4 WHERE project_id = <projectId>
UNION ALL
SELECT 'snapshot' AS fonte, COUNT(*) FROM risks_v4_snapshot_<projectId>_<timestamp>;
-- Esperado: contagens IGUAIS antes de prosseguir
```

**2. Restore de aprovações pós-regeneração**

Após `generateRisksFromGaps` regenerar riscos, restaurar metadados de aprovação:

```sql
-- Lookup por risk_key (categoria + contexto operacional + geo)
UPDATE risks_v4 r
JOIN risks_v4_snapshot_<projectId>_<timestamp> s ON s.risk_key = r.risk_key
SET r.aprovado_em = s.aprovado_em,
    r.aprovado_por = s.aprovado_por,
    r.observacoes_advogado = s.observacoes_advogado
WHERE r.project_id = <projectId>
  AND s.aprovado_em IS NOT NULL;

-- Verificação: contar aprovações restauradas
SELECT COUNT(*) FROM risks_v4
WHERE project_id = <projectId> AND aprovado_em IS NOT NULL;
-- Comparar com snapshot.aprovados (não pode ser menor)
```

**3. Rollback strategy (se Definition of Done falhar)**

Se pós-execução os critérios de DoD (Seção 9) falharem, executar rollback:

```sql
-- 3.1 Deletar riscos regenerados (estado atual quebrado)
DELETE FROM risks_v4 WHERE project_id = <projectId>;

-- 3.2 Restaurar do snapshot (estado pré-fix)
INSERT INTO risks_v4 SELECT * FROM risks_v4_snapshot_<projectId>_<timestamp>;

-- 3.3 Verificação final
SELECT COUNT(*), SUM(CASE WHEN aprovado_em IS NOT NULL THEN 1 ELSE 0 END) AS aprovados
FROM risks_v4 WHERE project_id = <projectId>;
-- Esperado: igual ao snapshot original
```

**4. Comunicação pré-execução**

Para projetos com `aprovado_em IS NOT NULL`:
- Identificar advogados responsáveis: `SELECT DISTINCT aprovado_por FROM risks_v4 WHERE project_id = <projectId> AND aprovado_em IS NOT NULL`
- Notificar antes da execução
- Janela de execução fora de horário comercial

**Alternativa de menor risco (mudança adicional de escopo):**

Alterar `generateRisksFromGaps` para fazer **UPSERT** preservando metadados de aprovação em vez de DELETE+INSERT. Vantagens: zero perda de aprovações, sem necessidade de snapshot. Desvantagens: mudança de escopo do fix arquitetural, requer test contracts adicionais para garantir idempotência.

**Decisão snapshot vs UPSERT é do P.O.**, não do implementador.

---

## 9. Definition of Done (critério de validação do fix)

**Como saber que o fix funcionou em produção. Critérios POSITIVOS + NEGATIVOS:**

### Critério POSITIVO 1 — Matriz exibe múltiplas fontes (assertivo)

```sql
SELECT COUNT(DISTINCT source_priority) AS num_fontes_distintas
FROM risks_v4
WHERE project_id = <ID>
  AND status = 'active';
```

**Aprovação:** `num_fontes_distintas >= 2` (mínimo 2 fontes obrigatórias)
**Reprovação:** `num_fontes_distintas = 1` → fix INCOMPLETO

### Critério NEGATIVO 1 — Mono-fonte é PROIBIDO

```sql
-- MUST FAIL (retornar 0 linhas)
SELECT 'BUG REINCIDIU: mono-fonte detectado' AS alerta
FROM risks_v4
WHERE project_id = <ID>
  AND status = 'active'
GROUP BY project_id
HAVING COUNT(DISTINCT source_priority) = 1;
```

**Aprovação:** query retorna 0 linhas
**Reprovação:** query retorna 1+ linhas → bug REINCIDIU, fix REJEITADO

### Critério POSITIVO 2 — Gaps órfãos viram riscos

```sql
SELECT g.source, COUNT(DISTINCT r.id) AS riscos_derivados
FROM project_gaps_v3 g
LEFT JOIN risks_v4 r ON r.project_id = g.project_id
  AND r.evidence::text LIKE CONCAT('%', g.id, '%')
WHERE g.project_id = <ID>
GROUP BY g.source;
```

**Aprovação:** `solaris` e `iagen` têm `riscos_derivados > 0` (cada)
**Reprovação:** `solaris` ou `iagen` tem `riscos_derivados = 0` → gaps continuam órfãos

### Critério POSITIVO 3 — Nenhum risco com source_priority inválido

```sql
SELECT source_priority, COUNT(*)
FROM risks_v4
WHERE project_id = <ID> AND status = 'active'
GROUP BY source_priority;
```

**Aprovação:** todos `source_priority` em `('cnae','ncm','nbs','solaris','iagen','regulatorio')`
**Reprovação:** valor NULL ou fora do enum

### Critério POSITIVO 4 — UI exibe múltiplas fontes (visual)

Screenshot de `/risk-dashboard-v4/<ID>` mostra **≥ 2** valores distintos de `source_priority` no breadcrumb dos riscos exibidos.

### Regra inviolável

**Sem evidência dos 4 critérios POSITIVOS + 1 critério NEGATIVO em projeto pós-fix, o fix NÃO está completo e o PR NÃO pode ser mergeado.** Mono-fonte (`COUNT(DISTINCT) = 1`) é falha automática — independente de tests unitários, lint, ou outros gates passarem.

---

## 10. Mitigações processuais (não-técnicas)

Para reduzir risco de mais incompetência iterativa minha:

1. **Restringir escopo de implementação:** Claude Code não implementa nada até diagnóstico ser validado por Manus + Consultor com evidência empírica (não só unit tests).

2. **Smoke E2E que valida UI, não banco:** Manus tira screenshot da matriz e conta `source_priority` distintos exibidos na UI. Banco não basta.

3. **Test contracts E2E obrigatórios** (Playwright) para PRs que tocam pipeline gap→risco. Tests unitários comprovadamente não pegam essa classe de bug.

4. **Architecture review formal antes de fix:** mapear quem grava e quem lê em `project_gaps_v3` por source antes de qualquer mudança em código de pipeline.

5. **Rotação obrigatória de revisor:** Manus ou Consultor revê diagnóstico antes do PR. Convergência cruzada Manus + Claude Code (como neste post-mortem) deve virar requisito para PRs em pipeline crítico.

6. **Dry-run como requisito antes de implementar fix arquitetural:** quando Manus propôs dry-run dos 36 gaps órfãos, é exatamente a forma de mover hipótese para evidência. Considerar como gate para qualquer Sprint M3.10+.

7. **Gate técnico executável de evidência multi-fonte real (NOVA — bloqueia merge):** nenhum PR que toque pipeline gap→risco pode ser mergeado sem ambas as evidências:

   **Gate SQL obrigatório (bloqueia merge automaticamente):**
   ```sql
   -- Executar em projeto-teste pós-fix em staging/dry-run.
   -- PR é BLOQUEADO se esta query retornar < 2.
   SELECT COUNT(DISTINCT source_priority) AS num_fontes
   FROM risks_v4
   WHERE project_id = <projeto-teste>
     AND status = 'active';
   -- PASS: num_fontes >= 2
   -- FAIL: num_fontes < 2 → merge bloqueado
   ```

   **Gate UI complementar (não substitui SQL):**
   - Screenshot da UI `/risk-dashboard-v4/<projeto-teste>` mostrando ≥ 2 valores distintos no breadcrumb dos riscos.

   **Por que ambos:** SQL prova o estado de banco (autoritativo). UI prova que o estado de banco chega ao usuário sem ofuscação no client. Um sem o outro deixa lacunas.

   **Por que "Smoke E2E que valida banco de gaps" (item 2) NÃO basta isoladamente:** count de gaps por source em `project_gaps_v3` mostra escritas órfãs como "multi-fonte" (porque escritas existem), mas riscos persistidos em `risks_v4` continuam mono-fonte (porque ninguém lê os órfãos). Tem que validar o output FINAL (`risks_v4`), não estados intermediários (`project_gaps_v3`). Foi exatamente esse engano que fez o smoke v7.63 passar 🟢 com bug latente.

8. **Separação obrigatória Implementador ≠ Validador (NOVA — Manus 2026-05-05):**

   Quem implementa o fix **NÃO pode** ser quem valida o fix. Risco de viés de confirmação: implementador inconscientemente "prova" que funcionou sem testar caminho real.

   **Aplicação para Sprint M3.10 (fix do bug deste post-mortem):**
   - Se Claude Code implementa → Manus executa dry-run validador + queries DoD
   - Se Manus implementa → Claude Code executa queries DoD + screenshot UI
   - P.O. é validador final em qualquer caminho (assina aprovação após DoD verde)

   **Justificativa:** Claude Code admitiu falha 3x consecutivas no diagnóstico desse bug. Implementador com histórico de erro repetido não deve ser validador do mesmo escopo. Manus já executou as queries que diagnosticaram a causa raiz — tem advantagem epistemológica para validação. Inverso aplicável quando Claude Code tem advantage no codebase.

   **Generalização para futuras Sprints:** PRs de fix em pipeline crítico (gap→risco, risco→plano, briefing→risco) devem documentar quem implementou e quem validou no body do PR. Se forem o mesmo, gate falha automaticamente.

---

## 11. Lições adicionais a capturar (governance.md)

**Lição #65 (proposta) — Sempre rastrear o fluxo de DADOS end-to-end antes de diagnosticar:**

Antes de propor qualquer fix em pipeline de dados, o diagnóstico DEVE rastrear o caminho completo do dado: **de onde vem o input** (não apenas o que a função faz com ele) → quem o transforma → onde é persistido → quem o consome → como aparece no output final ao usuário. Função pura testada isoladamente com input simulado pode passar em 100% dos cenários sintéticos enquanto o sistema real nunca produz aquele input.

Para pipelines de dados (caminhos `input → transformação → output`), test contracts unitários cobrem **transformação** mas não **caminho real do input**. PRs que tocam pipelines de dados DEVEM incluir teste E2E que dispare o caminho real (UI → banco → UI) com evidência observável (screenshot, count exibido na UI, query SQL pós-execução).

Caso canônico: M3.8.1 Bug B teve 7 tests unitários PASS cobrindo `getBestSourcePriority` com gaps multi-fonte simulados — mas o sistema real nunca chama com multi-fonte (entrada é sempre mono-fonte do `result.gaps` do frontend). Tests passaram em prova de função isolada, não de comportamento real do sistema.

**Aplicação prospectiva:** antes de qualquer PR de pipeline de dados, o diagnóstico DEVE produzir um mapa "writers vs readers" da tabela crítica (como o diagrama da Seção 3.4 deste post-mortem). Sem esse mapa, falta evidência de que a entrada do pipeline é o que se assume.

**Exemplo concreto de falha que esta lição evitaria (M3.8.1 Bug B):**

```
Hipótese errada (Sprint M3.8.1):
  "getBestSourcePriority retorna 'iagen' como default → fix: trocar para 'regulatorio'"

Tests escritos para validar a hipótese:
  buildGap("regulatorio") × 10  →  espera retornar "regulatorio"  ✅ PASS
  buildGap("solaris") + buildGap("iagen")  →  espera retornar "solaris" (rank menor)  ✅ PASS
  16/16 tests PASS, sprint encerrada 🟢

Realidade do sistema:
  getBestSourcePriority sempre recebe 138 gaps mono-fonte ('regulatorio') do
  result.gaps do gapEngine. Os cenários multi-fonte testados nunca acontecem
  no caminho real porque a entrada é mono-fonte upstream.

O que Lição #65 teria forçado:
  Antes de propor fix, mapear:
    INPUT real para getBestSourcePriority?
      → vem de risk-engine-v4.consolidateRisks
      → recebe gaps consolidados via groupBy(categoria) em InsertRiskV4[]
      → vem de generateRisksV4Pipeline(gaps)
      → input.gaps recebido via tRPC do frontend
      → frontend passa result.gaps de gapEngine.analyzeGaps
      → gapEngine.analyzeGaps retorna apenas gaps v1 ❌ MONO-FONTE NA ORIGEM

  Conclusão da lição: o fix NÃO está em getBestSourcePriority. Está em quem
  alimenta o pipeline upstream. Esta cadeia de 6 saltos toma 5 minutos para
  rastrear e teria evitado 3 sprints de fixes errados.
```

**Lição #66 (proposta) — 2 caminhos paralelos sem consumidor compartilhado = pipeline órfão:**

Quando arquitetura tem 2 ou mais caminhos paralelos gravando na mesma tabela (ex: `gapEngine.analyzeGaps` + `analyzeSolarisAnswers` + `analyzeIagenAnswers` → `project_gaps_v3`), a integridade só existe se houver UM consumidor compartilhado downstream que lê todas as escritas. Sem isso, escritas viram dead writes e o produto exibe estado parcial silenciosamente. Auditoria arquitetural DEVE mapear "quem grava" vs "quem lê" por tabela crítica antes de aprovar mudanças.

---

## 12. Próximos passos sugeridos (decisão do P.O.)

### Ordem obrigatória (não pular passos)

| # | Ação | Quem | Reversível? | Bloqueia próximo? |
|---|---|---|---|---|
| 1 | **GATE: Dry-run** do Manus (carregar 36 gaps órfãos em memória + Fix B simulado + GapToRuleMapper + consolidateRisks). Output multi-fonte? | Manus | ✅ Sim (zero alteração) | **SIM — sem dry-run verde, ZERO implementação** |
| 2 | Se dry-run = multi-fonte ✅ → autorizar implementação. Se = mono-fonte ❌ → STOP, reabrir investigação | P.O. (decisão) | N/A | SIM |
| 3 | Implementar Fix B (preencher `risk_category_code`) → PR isolado + tests | Implementador (Claude Code OU Manus, NÃO ambos) | Reversível por revert | SIM |
| 4 | Validar Fix B isolado: query "todos solaris/iagen têm `risk_category_code IS NOT NULL`" | Validador (o que NÃO implementou) | N/A | SIM |
| 5 | Implementar Fix A1 (backend lê `project_gaps_v3` direto) → PR isolado + tests E2E | Implementador (mesmo do Fix B) | Reversível por revert | SIM |
| 6 | Validar Fix A1 + Definition of Done completo (4 critérios SQL + screenshot UI) | Validador | N/A | SIM |
| 7 | Snapshot pré-execução de projetos com aprovações | Manus (operador DB) | Snapshot é o backup | SIM |
| 8 | Re-trigger pipeline em projetos canônicos #3270001 + #3480001 + #3570002 | Manus | Reversível via rollback do snapshot | SIM |
| 9 | Smoke E2E final com Definition of Done verde em 3 projetos | Manus | N/A | SIM |
| 10 | Capturar Lições #65 + #66 em `.claude/rules/governance.md` | Claude Code | ✅ docs-only | NÃO (paralelo a 3-9) |
| 11 | **Auditoria retroativa M3.8 + M3.8.1** — revisar audits v7.62 e v7.63 registrando bug latente | Claude Code | docs-only | NÃO (paralelo) |

### Regra inviolável de execução

**Dry-run (passo 1) é GATE OBRIGATÓRIO.** Implementação só inicia após dry-run com output multi-fonte. Se algum implementador (Claude Code ou Manus) tentar pular o dry-run, o P.O. deve recusar o PR independente de outros gates passarem.

**Implementador ≠ Validador (mitigação 8).** Para passos 3, 5: quem implementa não executa o passo de validação correspondente (4, 6). Aplicação obrigatória, sem exceção.

### Especificação detalhada do Passo 1 — Dry-run

**Executor:** Manus (operador de banco com queries empíricas validadas)
**Pré-requisito:** acesso read-only ao banco de produção ou snapshot em staging
**Duração estimada:** 30-60 minutos

**O que faz (4 etapas em memória, sem persistência):**

1. **Carregar gaps órfãos do banco:**
   ```sql
   SELECT id, project_id, source, source_reference, requirement_id,
          risk_category_code, gap_classification, evidence_status, criticality
   FROM project_gaps_v3
   WHERE source IN ('solaris', 'iagen')
     AND project_id IN (3270001, 3480001, 3570002);
   ```
   Esperado: ≈ 36 gaps (28 solaris + 8 iagen no #3570002, similar em outros).

2. **Preencher `risk_category_code` em memória (Fix B simulado):**
   - Para gaps `source='solaris'`: `risk_category_code = source_reference` (já é código de categoria, ex: `'confissao_automatica'`)
   - Para gaps `source='iagen'`: `risk_category_code = source_reference` (vem de `iagen_answers.risk_category_code`)
   - Filtrar gaps que continuam com categoria não-canônica (devem cair em `unmapped` validamente)

3. **Passar pelo `GapToRuleMapper.mapMany()` + `consolidateRisks()` em memória:**
   - Construir `GapInput[]` com `sourceOrigin = "solaris"` ou `"iagen"` (derivado do source)
   - Chamar `mapMany(gapInputs)` → `MappedRule[]`
   - Chamar `consolidateRisks(projectId, mappedRules.map(toGapRule), context, actorId)` → `InsertRiskV4[]`
   - **NÃO chamar** `persistRisks` nem `deleteRisksByProject` — pure in-memory.

4. **Inspecionar output e imprimir:**
   ```
   Total riscos consolidados: X
   source_priority distintos: [list]
   Distribuição: { regulatorio: N1, solaris: N2, iagen: N3, ... }
   Gaps que viraram unmapped: M (com motivos)
   ```

**Critério de SUCESSO (autoriza implementação):**
- Output contém `source_priority` com **≥ 2 valores distintos**
- Pelo menos 1 risco com `source_priority = 'solaris'` OU `source_priority = 'iagen'`
- Diagnóstico empiricamente PROVADO → P.O. autoriza Sprint M3.10 com Fix B + Fix A1

**Critério de FALHA (bloqueia implementação):**
- Output continua mono-fonte (apenas `'regulatorio'`)
- OU todos os gaps órfãos viram `unmapped`
- OU consolidateRisks retorna `[]` para gaps órfãos
- Diagnóstico INCOMPLETO → STOP, reabrir investigação com Consultor (ChatGPT) antes de qualquer implementação

**Zero alteração garantida:**
- ❌ Nenhum INSERT em qualquer tabela
- ❌ Nenhum UPDATE em qualquer tabela
- ❌ Nenhum DELETE em qualquer tabela
- ❌ Nenhum ALTER schema
- ✅ Apenas SELECT read-only para carregar dados
- ✅ Toda transformação em memória (variáveis JS/TS)
- ✅ Output via `console.log` ou retorno de função de teste

**Reportagem ao P.O. pós-dry-run:**
- Se SUCESSO → relatório com queries usadas + counts + autorização para próxima sprint
- Se FALHA → relatório com queries usadas + output observado + hipótese sobre o que falta + recomendação ao Consultor

---

## 13. Vinculadas

- **PR #968** (M3.8-1B) — origem do mascaramento iagen
- **PR #969** (M3.8-2) — UnifiedAnswer + service_answers idN
- **PR #973** (M3.8.1) — fix consolidado A+B+C (atacou sintomas downstream)
- **PR #974** (M3.8.1 followup) — migration ENUM + audit v7.63
- **Audit v7.63** — `docs/governance/audits/v7.63-2026-05-05-sprint-m3.8.1-hotfix-encerrada.md` — passou apesar do bug
- **Lição #59** (REGRA-ORQ-27) — assemble ≠ consumption (origem)
- **Lição #64** — audit-greps insuficientes vs runtime tests (M3.8.1)
- **Lições #65 + #66** (propostas neste documento)
- **Diagnóstico Manus** — `2o. bug---SAIDA/2/Diagnóstico_ Riscos Mostram Apenas _Regulatório_ como Fonte.md`

---

## 14. Reconhecimento de falha

Este post-mortem reconhece que a abordagem de Claude Code nas 3 últimas sprints foi inadequada:

**Falha central:** Claude Code nunca executou queries reais ao banco para verificar quais gaps existiam por source e se tinham `risk_category_code` preenchido. Diagnóstico foi baseado **apenas em leitura de código**. Se a query simples `SELECT source, COUNT(*), SUM(risk_category_code IS NOT NULL) FROM project_gaps_v3 GROUP BY source` tivesse sido executada na Sprint M3.8-1B, o NULL nos órfãos e o problema de upstream teriam sido vistos imediatamente — antes de 3 sprints e 6 fixes errados.

**Falhas correlatas:**
- Hipóteses formuladas sem trace empírico do fluxo de dados real
- Tests escritos para validar a hipótese em vez de validar o comportamento real do sistema
- Audits passaram porque o gate era estático (grep/tsc/unit) em vez de dinâmico (E2E com evidência observável no output final)
- Sprints declaradas "encerradas" com 🟢 final, capturadas em ESTADO-ATUAL, sem que o produto entregasse o que o usuário percebia como correto
- Diagnóstico em código DOWNSTREAM repetido 6 vezes sem que ninguém perguntasse "de onde vem a entrada deste pipeline?"

**Mitigação central proposta (Seção 10 item 7):** gate obrigatório de evidência multi-fonte real **no output final** (riscos persistidos), não em estados intermediários (gaps no banco). Combinar com mapa "writers vs readers" de Lição #65 para evitar reincidência.

Implementação de fix técnico aguarda direção explícita do P.O. + dry-run validador do Manus (Seção 12).
