# AS-IS Pipeline — IA SOLARIS

**Data:** 2026-04-06 | **HEAD:** 27ed524 | **Versão:** v1.0
**Autor:** Manus AI | **Autoridade:** P.O. Uires Tapajós
**Propósito:** Levantamento factual pré-refatoração M2 — base para Impact Analysis, Risk Map e TO-BE.

> **Regra:** apenas evidência real — código, outputs, banco de dados. Descrição conceitual não é válida.

---

## 1. Fluxo Real do Pipeline (funções + arquivos)

O pipeline de diagnóstico tributário é acionado em duas etapas sequenciais, ambas definidas em `server/routers-fluxo-v3.ts`.

```
[Frontend] → completeOnda1 (routers-fluxo-v3.ts:2215)
      │
      ├─ db.saveOnda1Answers(projectId, answers)
      ├─ db.updateProject(projectId, { status: 'onda1_solaris' })
      ├─ [fire-and-forget] analyzeSolarisAnswers(projectId)   → source='solaris'
      └─ [fire-and-forget] riskEngine (G17-B, derivado dos gaps solaris)

[Frontend] → completeOnda2 (routers-fluxo-v3.ts:2426)
      │
      ├─ db.saveOnda2Answers(projectId, answers)
      ├─ db.updateProject(projectId, { status: 'diagnostico_corporativo' })
      ├─ [fire-and-forget] analyzeIagenAnswers(projectId)     → source='iagen'
      └─ [fire-and-forget] analyzeEngineGaps(projectId, ncmCodes, nbsCodes) → source='engine'
            │
            └─ NCM/NBS lidos de operationProfile.principaisProdutos/principaisServicos
               Fallback: parâmetros ncmCodes/nbsCodes (clientes legados)
               Condição: só executa se finalNcmCodes.length > 0 || finalNbsCodes.length > 0

[Downstream — não acionado automaticamente pelo pipeline]
      ├─ briefingEngine.ts  → lê project_gaps_v3 (TODOS os sources, sem filtro)
      ├─ riskEngine.ts      → lê project_gaps_v3 (filtra source='solaris' + 'cnae' + 'iagen')
      └─ scoringEngine.ts   → lê project_gaps_v3 (criticality + score, sem filtro de source)
```

### Observação crítica — engine nunca exercitado em produção

O `analyzeEngineGaps` está integrado no código desde o Bloco E (PR #325), mas **nenhum projeto de produção possui `operationProfile.principaisProdutos` preenchido** com NCM/NBS. Evidência banco (ver Seção 4): `source='engine'` → 0 registros.

---

## 2. Componentes (arquivo · função · input · output)

### 2.1 routers-fluxo-v3.ts — Orquestrador do pipeline

| Campo | Valor |
|---|---|
| Arquivo | `server/routers-fluxo-v3.ts` |
| Função principal | `completeOnda1` (linha 2215) · `completeOnda2` (linha 2426) |
| Input Onda 1 | `{ projectId: number, answers: Answer[] }` |
| Input Onda 2 | `{ projectId: number, answers: Answer[], ncmCodes?: string[], nbsCodes?: string[] }` |
| Output Onda 1 | `{ success: true, projectId, newStatus: 'onda1_solaris' }` |
| Output Onda 2 | `{ success: true, projectId, newStatus: 'diagnostico_corporativo', answersCount }` |
| Proteção | `protectedProcedure` · `assertValidTransition` (flowStateMachine) |

### 2.2 engine-gap-analyzer.ts — Decision Kernel (source='engine')

| Campo | Valor |
|---|---|
| Arquivo | `server/lib/engine-gap-analyzer.ts` |
| Função exportada | `analyzeEngineGaps(projectId, ncmCodes, nbsCodes)` (linha 67) |
| Input | `projectId: number, ncmCodes: string[], nbsCodes: string[]` |
| Output | Insere em `project_gaps_v3` com `source='engine'` |
| Idempotência | `DELETE source='engine'` antes de `INSERT` |
| Confiança | `evaluation_confidence = confianca.valor / 100` · `evaluation_confidence_reason = confianca.tipo` |
| Casos pending | Não inseridos (tipo `fallback` com nota `pendente de validação`) |
| Casos fallback | Inseridos com `evaluation_confidence` reduzida |

### 2.3 iagen-gap-analyzer.ts — Análise IAGEN (source='iagen')

| Campo | Valor |
|---|---|
| Arquivo | `server/lib/iagen-gap-analyzer.ts` |
| Função exportada | `analyzeIagenAnswers(projectId)` (linha 98) |
| Input | `projectId: number` (lê respostas do banco) |
| Output | Insere em `project_gaps_v3` com `source='iagen'` |
| Idempotência | `DELETE source='iagen'` antes de `INSERT` |

### 2.4 solaris-gap-analyzer.ts — Análise SOLARIS (source='solaris')

| Campo | Valor |
|---|---|
| Arquivo | `server/lib/solaris-gap-analyzer.ts` |
| Função exportada | `analyzeSolarisAnswers(projectId)` |
| Input | `projectId: number` |
| Output | Insere em `project_gaps_v3` com `source='solaris'` |

### 2.5 briefingEngine.ts — Gerador de Briefing

| Campo | Valor |
|---|---|
| Arquivo | `server/routers/briefingEngine.ts` |
| Leitura de gaps | `SELECT * FROM project_gaps_v3 WHERE project_id = ? ORDER BY score DESC` (linha 460) |
| Filtro de source | **Nenhum** — lê todos os sources indiscriminadamente |
| Usa `evaluation_confidence` do engine? | **NÃO** — não diferencia source='engine' |
| Output | Estrutura `BriefingStructured` com seções: gaps, riscos, ações, resumo executivo |

### 2.6 riskEngine.ts — Gerador de Matriz de Riscos

| Campo | Valor |
|---|---|
| Arquivo | `server/routers/riskEngine.ts` |
| Leitura de gaps | `FROM project_gaps_v3 g WHERE (g.source = 'solaris' AND g.criticality IS NOT NULL)` (linha 352) |
| Filtro de source | Filtra `source='solaris'` · `source='cnae'` · `source='iagen'` — **exclui `source='engine'`** |
| Usa `evaluation_confidence` do engine? | **NÃO** — `evaluation_confidence` é lido do banco mas não diferenciado por source |
| Output | Insere em `project_risks_v3` com `fonte_risco` derivado do `gap_source` |

### 2.7 scoringEngine.ts — Cálculo CPIE

| Campo | Valor |
|---|---|
| Arquivo | `server/routers/scoringEngine.ts` |
| Leitura de gaps | `SELECT criticality, score FROM project_gaps_v3 WHERE project_id = ? AND client_id = ?` |
| Filtro de source | **Nenhum** — usa criticality + score de todos os sources |
| Usa `evaluation_confidence` do engine? | **NÃO** — não pondera por confiança do engine |

---

## 3. Contratos em Vigor

### CNT-01a — operationProfile obrigatório no createProject

O input de `createProject` (linha 81) exige `operationProfile.principaisProdutos` e `principaisServicos` como arrays. Contrato implementado e validado pelo schema Zod.

### CNT-01b — cap de confiança NBS (98%)

O `nbs-engine.ts` aplica cap de 98% para todos os casos NBS via regra CNT-01b. Corrigido no PR #328 (fix `extractFonte` para campo `artigo` string direta).

### CNT-01c — NCM/NBS lidos do operationProfile (Bloco E)

`extractNcmNbsFromProfile` (linha 2498) extrai NCM/NBS do `operationProfile` persistido. Fallback para `ncmCodes`/`nbsCodes` como parâmetro (compatibilidade legada). **Status: implementado, nunca exercitado em produção** (ver Seção 4).

### CNT-02 — campo `confianca` obrigatório no output do engine

`engine-gap-analyzer.ts` linhas 100-101: `confianca_valor` e `confianca_tipo` são obrigatórios no output do Decision Kernel. Mapeados para `evaluation_confidence` e `evaluation_confidence_reason` no INSERT. **Status: implementado e testado (48 testes Q5).**

### CNT-03 — source='engine' vs source='rag'

`engine-gap-analyzer.ts` linha 8: `source = 'engine'` (nunca 'rag'). `iagen-gap-analyzer.ts` linha 15: `source = 'iagen'`. **Status: implementado, nunca exercitado em produção.**

---

## 4. Evidência Real do Banco (produção — 2026-04-06)

```sql
SELECT source, COUNT(*) as total, ROUND(AVG(evaluation_confidence)*100,1) as avg_conf_pct
FROM project_gaps_v3
GROUP BY source
ORDER BY total DESC;
```

| source | total | avg_conf_pct |
|---|---|---|
| solaris | 38 | 90.0% |
| v1 | 13 | 92.0% |
| iagen | 3 | 70.0% |
| **engine** | **0** | **—** |
| **rag** | **0** | **—** |

**Interpretação:** O `source='engine'` nunca foi exercitado em produção. Os 5 projetos com gaps no banco foram criados antes do Bloco E (NCM/NBS no `operationProfile`) estar disponível para os usuários finais. O `source='rag'` também é zero — o pipeline atual usa `source='solaris'` (via `analyzeSolarisAnswers`) como gerador primário de gaps.

---

## 5. Gaps Conhecidos (o que ainda não está conectado)

### GAP-AS-IS-01 — briefingEngine não lê source='engine'

**Arquivo:** `server/routers/briefingEngine.ts` linha 460
**Evidência:** `SELECT * FROM project_gaps_v3 WHERE project_id = ?` — sem filtro de source.
**Impacto:** Quando o engine gerar gaps (`source='engine'`), o briefing os incluirá automaticamente na lista geral, mas **sem distinguir a origem nem usar a confiança tipada do Decision Kernel**. O briefing não saberá que aquele gap vem de uma análise determinística com rastreabilidade atômica (artigo + anexo + NCM/NBS).

### GAP-AS-IS-02 — riskEngine exclui source='engine' do filtro

**Arquivo:** `server/routers/riskEngine.ts` linha 352
**Evidência:** `WHERE (g.source = 'solaris' AND g.criticality IS NOT NULL)` — engine não está no filtro.
**Impacto:** Gaps gerados pelo Decision Kernel (`source='engine'`) **não alimentam a matriz de riscos**. Riscos tributários identificados com base em NCM/NBS e LC 214/2025 são ignorados pelo riskEngine.

### GAP-AS-IS-03 — scoringEngine não pondera evaluation_confidence do engine

**Arquivo:** `server/routers/scoringEngine.ts` linhas 291, 358, 400, 461, 567, 646
**Evidência:** `SELECT criticality, score FROM project_gaps_v3` — sem `evaluation_confidence`.
**Impacto:** O CPIE não diferencia gaps com alta confiança determinística (engine, 100%) de gaps com confiança inferida (iagen, 70%). A pontuação trata todos os gaps como equivalentes.

### GAP-AS-IS-04 — engine nunca exercitado em produção

**Evidência banco:** `source='engine'` → 0 registros (ver Seção 4).
**Causa:** Projetos existentes foram criados antes do Bloco E. Novos projetos criados com o frontend atualizado (PR #325) deverão popular `operationProfile.principaisProdutos/principaisServicos` e acionar o engine automaticamente.
**Impacto para M2:** A integração engine → briefing → riscos não pode ser validada end-to-end em produção até que pelo menos um projeto real complete a Onda 2 com NCM/NBS preenchidos.

### GAP-AS-IS-05 — 1 caso pending_validation no Decision Kernel

**Dataset:** NBS 1.0906.11.00 (corretagem de seguros) — `status='pending_validation'`.
**Causa:** Ausência de base legal explícita na LC 214/2025 (Art. 182 não menciona corretagem explicitamente).
**Impacto:** O engine não gera gap para este NBS até resolução pelo Dr. Rodrigues.

---

## 6. Resumo Executivo

O pipeline de diagnóstico tributário da IA SOLARIS está funcional e testado para os fluxos `source='solaris'` e `source='iagen'`. O Decision Kernel (`source='engine'`) está **integrado no código mas nunca exercitado em produção** — é a lacuna central que o M2 deve endereçar.

Os três gaps de integração (GAP-AS-IS-01, 02, 03) são conhecidos e documentados: o briefingEngine lê todos os gaps mas sem distinguir a origem do engine; o riskEngine exclui explicitamente o source='engine' do seu filtro; o scoringEngine não pondera a confiança do engine. Estes três gaps são exatamente o escopo do M2.

A ausência de dados `source='engine'` no banco (GAP-AS-IS-04) implica que o M2 precisará de um projeto de teste com NCM/NBS preenchidos para validação end-to-end antes de ir para produção.

---

*Gerado por Manus AI — 2026-04-06 | HEAD: 27ed524*
*Evidência: código-fonte + banco de dados de produção*
*Próxima etapa: Impact Analysis (Orquestrador + Consultor)*
