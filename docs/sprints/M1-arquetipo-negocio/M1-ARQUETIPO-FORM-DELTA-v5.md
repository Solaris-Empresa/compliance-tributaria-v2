# M1 — ARQUÉTIPO FORM DELTA v5

> **Status:** `ARTEFATO_PRE_M1` · 2026-04-24  
> **Baseline anterior:** v4.1-rev1 (commit `05e3c7b`)  
> **Fontes:** SPEC-v3.1-rev1-M1-PERFIL-ENTIDADE.md · SPEC-v3.1-M1-PERFIL-ENTIDADE.md · DATA_DICTIONARY.md · UX_DICTIONARY.md · FLOW_DICTIONARY.md · CODIGO-ATUAL-VERDADE.md  
> **Mockup:** `MOCKUP_perfil_entidade_v5.html`  
> **Regra:** Artefato pré-M1. Não implementar sem prompt do Orquestrador e aprovação do P.O.

---

## 1. O que mudou de v4.1-rev1 → v5

| ID | Mudança | Tipo |
|----|---------|------|
| **V5-01** | 5 dimensões do Perfil da Entidade introduzidas (objeto, papel_na_cadeia, tipo_de_relacao, territorio, regime) | NOVO |
| **V5-02** | 4 estados da tela de Confirmação: `pendente`, `inconsistente`, `bloqueado`, `confirmado` | NOVO |
| **V5-03** | Rastreabilidade por dimensão: origem de cada campo (CNAE, usuário, inferência) | NOVO |
| **V5-04** | Painel de Confiança expandido com PC-01 a PC-06 (herdado v4.1-rev1 + dimensões) | ATUALIZADO |
| **V5-05** | Tela de Confirmação com snapshot imutável (C4) e nota ADR-0032 | NOVO |
| **V5-06** | acknowledgeInconsistency explícito em C2: ciência ≠ confirmação | NOVO |
| **V5-07** | Enum canônico `status_arquetipo` aplicado: `pendente / inconsistente / bloqueado / confirmado` | ATUALIZADO |
| **V5-08** | Eligibility contrato: `allowed / denied / pending` com condições explícitas | NOVO |
| **V5-09** | Fallback de dimensão com baixa confiança: campo `dim-fallback` visual | NOVO |
| **V5-10** | Botão "Iniciar Nova Versão do Perfil" em C4 (imutabilidade pós-confirmação) | NOVO |

---

## 2. Estrutura do mockup v5

### 2.1 Estados navegáveis

| Estado | Cenário | status_arquetipo | eligibility |
|--------|---------|-----------------|-------------|
| **S1** | Início — sem CNAEs, campos vazios | `pendente` | `pending` |
| **S2** | Modal de identificação de CNAEs aberto | `pendente` | `pending` |
| **S3** | CNAEs confirmados + 5 dimensões preenchidas (com conflito DET-002) | `inconsistente` | `pending` |
| **S4** | Painel de Confiança completo (PC-01 a PC-06) | `inconsistente` | `pending` |
| **C1** | Tela de Confirmação — campos faltantes | `pendente` | `pending` |
| **C2** | Tela de Confirmação — conflito corrigível + acknowledgeInconsistency | `inconsistente` | `pending` |
| **C3** | Tela de Confirmação — HARD_BLOCK ativo (DET-001 + V-LC) | `bloqueado` | `denied` |
| **C4** | Tela de Confirmação — perfil confirmado, gate liberado | `confirmado` | `allowed` |

### 2.2 Seções do formulário (BLOCO 0 + 5 Dimensões)

| Seção | Campos | Obrigatório |
|-------|--------|-------------|
| **BLOCO 0** | project_name, cnpj, companyType, companySize, annualRevenueRange, taxRegime, descricao_negocio, cnaes[], isEconomicGroup | Todos exceto isEconomicGroup |
| **DIM 1 — objeto** | tipo_objeto_economico[], possui_bens, possui_servicos | Sim |
| **DIM 2 — papel_na_cadeia** | papel_na_cadeia[] | Sim |
| **DIM 3 — tipo_de_relacao** | clientType[], hasIntermediaries | Sim |
| **DIM 4 — territorio** | multiState, hasInternationalOps, opera_territorio_incentivado, tipo_territorio_incentivado | multiState obrigatório |
| **DIM 5 — regime** | taxRegime (já no B0), regime_especifico[], subnatureza_setorial[] | taxRegime obrigatório |

---

## 3. Regras invariantes (não regredir)

1. **Score alto NÃO libera o fluxo** — gate depende exclusivamente de `status_arquetipo = confirmado` AND `HARD_BLOCKs.length === 0`
2. **acknowledgeInconsistency NÃO eleva para `confirmado`** — ciência registrada mantém status `inconsistente`
3. **DET-001 CRITICAL → `denied` sem override no E2E** (mudança intencional v3.1 vs AS-IS)
4. **PC-05 é prévia exploratória** — não representa motor de riscos real; não bloqueia nem libera gate
5. **Fórmula do score é exploratória** — pesos e cálculo dependem de SPEC aprovada
6. **Snapshot imutável após confirmação** (ADR-0032 — a confirmar)
7. **cnae_principal_input removido** — substituído por modal `open_cnae_modal` (herdado v4)
8. **"Perfil da Entidade" na UI** — "arquétipo" é termo técnico interno

---

## 4. Painel de Confiança v5 (PC-01 a PC-06)

| ID | Seção | Tipo | Gating |
|----|-------|------|--------|
| PC-01 | Resumo Executivo: score, status, gate, eligibility | informativo | não |
| PC-02 | Composição da Confiança: breakdown 3 pilares | informativo | não |
| PC-03 | Pendências e Bloqueios: HARD_BLOCK / PENDENTE_CRITICO / PENDENTE / INFO | gating | sim |
| PC-04 | Snapshot do Perfil: campos-chave + CTA Confirmar | gating via CTA | sim |
| PC-05 | Prévia de Riscos | exploratório | não |
| PC-06 | Liberação do Próximo Passo: CTA "Continuar para o Briefing" | gate final | sim |

---

## 5. Enum canônico `status_arquetipo` (SPEC v3.1-rev1 §4)

```typescript
type StatusArquetipo = 'pendente' | 'inconsistente' | 'bloqueado' | 'confirmado';
```

| Valor | Condição de disparo |
|-------|---------------------|
| `pendente` | `missingRequired.length > 0` OR `completeness < 100` |
| `inconsistente` | DET warnings (HIGH/MEDIUM) OR divergência `possui_bens` × derivado |
| `bloqueado` | DET CRITICAL OR multi-CNPJ (V-05) |
| `confirmado` | Completude 100% + zero blockers + zero inconsistências não-justificadas + CTA acionado |

---

## 6. Contrato de Eligibilidade (SPEC v3.1-rev1 §5)

```typescript
type EligibilityOverall = 'allowed' | 'denied' | 'pending';
```

| Valor | Condições |
|-------|-----------|
| `allowed` | `status_arquetipo === 'confirmado'` AND zero hard blocks AND zero multi-CNPJ |
| `denied` | DET CRITICAL OR multi-CNPJ OR conflito lógico crítico |
| `pending` | completude < 100% OR inconsistência não-justificada OR dados insuficientes |

---

## 7. Mapeamento DET → Eligibility (mudanças intencionais v3.1)

| Regra | AS-IS | Target v3.1 |
|-------|-------|-------------|
| DET-001 CRITICAL | Hard block, override com justificativa | Hard block, **sem override no E2E** |
| DET-002 HIGH warning | Permite proceed | **Bloqueia E2E** até corrigir |
| DET-003 HIGH warning | Permite proceed | **Bloqueia E2E** até corrigir |
| DET-004 CRITICAL | Hard block | Hard block |
| DET-005 MEDIUM warning | Permite proceed | **Bloqueia E2E** até corrigir |
| V-05 multi-CNPJ | N/A | Hard block novo |
| completeness < 100 | Informativo | **Bloqueia E2E** |

---

## 8. Rastreabilidade por dimensão

Cada dimensão exibe a origem do dado:

| Origem | Label | Cor |
|--------|-------|-----|
| CNAE (inferido) | `src-cnae` | Índigo |
| Usuário (preenchido) | `src-user` | Verde |
| Inferência LLM+RAG | `src-infer` | Laranja |
| Fallback (baixa confiança) | `dim-fallback` | Cinza |

---

## 9. GAPs identificados (dependem de spec + aprovação P.O.)

| ID | GAP | Impacto | Fonte |
|----|-----|---------|-------|
| **GAP-01** | ADR-0031 não encontrado no branch `docs/m1-arquetipo-exploracao` | Regras de imutabilidade/versionamento do perfil não confirmadas | Branch desatualizado ou ADR não criado |
| **GAP-02** | ADR-0032 não encontrado no branch | Snapshot imutável pós-confirmação: comportamento assumido no mockup C4, não confirmado por ADR | Idem |
| **GAP-03** | Algoritmo de cálculo do score (fórmula exata, pesos por pilar) | Fórmula marcada como EXPLORATÓRIA no mockup | Depende de SPEC aprovada |
| **GAP-04** | Inferência de CNAEs por `descricao_negocio`: lookup estático vs. LLM vs. RAG | Modal usa "LLM+RAG" como placeholder | Depende de spec de integração |
| **GAP-05** | Comportamento mobile do painel colapsável | Não especificado | Depende de spec UX mobile |
| **GAP-06** | Integração PC-05 com motor de riscos real | PC-05 marcado como exploratório | Depende de integração com risk-engine-v4 |
| **GAP-07** | `acknowledgeInconsistency` vs. `acceptRisk()` existente: são a mesma procedure ou nova? | Mockup usa nome novo; código atual tem `acceptRisk()` em `consistencyRouter.ts:208-238` | Depende de decisão de implementação |
| **GAP-08** | `buildPerfilEntidade(project)` — função adapter Transitional: não existe no código atual | Mockup assume existência; SPEC v3.1 define como view TypeScript pura em `@shared/` | A criar |
| **GAP-09** | Tabela `eligibility_audit_log` — não existe no schema atual | SPEC v3.1 menciona entidades `archetype_gate`, `eligibility_change` no audit_log | Migration pendente |
| **GAP-10** | Enum `status_arquetipo` no banco — campo não existe em `drizzle/schema.ts` | Mockup assume campo; implementação exige migration | A criar |

---

## 10. Itens exploratórios (não implementar sem aprovação P.O.)

- Algoritmo de score (GAP-03)
- Inferência de CNAEs (GAP-04)
- PC-05 integrado ao motor de riscos real (GAP-06)
- Snapshot imutável via ADR-0032 (GAP-02)
- Comportamento mobile (GAP-05)

---

## 11. Backlog pendente (herdado — não agir sem autorização P.O.)

- Criar migration para `eligibility_audit_log` (GAP-09)
- Criar `drizzle/downs/0089_down.sql`
- Resolver divergência sandbox main (tag `backup/main-pre-sync-20260421-230108`)
- Corrigir trigger `smoke-post-deploy.yml`
- Retomar Sprint Z-22 — Issue #725 (Dashboard Compliance v3)
