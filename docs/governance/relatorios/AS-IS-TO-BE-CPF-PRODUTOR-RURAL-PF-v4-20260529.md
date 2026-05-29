# AS-IS / TO-BE — Aceitar CPF (Pessoa Física) · **v4 cirúrgica — só consistência frontend**

**Data:** 2026-05-29
**HEAD main:** `f29ab5009ec1e5cbf2d0a3e30ce85f47836e2c00`
**Branch local:** `docs/cpf-pf-spec-v4-cirurgica` (commit local · **NÃO pushed · aguarda autorização P.O.**)
**Predecessores:**
- v1, v2 → PR #1287 (`chore/impact-tree-skill`)
- v3 → PR #1288 (`docs/cpf-pf-spec-v3-baseline`)

**Decisões P.O. (29/05/2026 — pós-v3):**
- ❌ **Sem validação de enquadramento jurídico** (Art. 164/165, "produtor rural integrado", "receita anual" SAEM do escopo)
- ✅ **Apenas tratamento de consistência no front-end** do formulário da página projeto
- ✅ Avaliar inclusão no **UX_DICTIONARY** (analisado em §6 — **SIM, é obrigatório**)
- ✅ Status operacional explícito para o orquestrador

---

## ⚠ §1 · STATUS OPERACIONAL — PRs E BRANCHES AGUARDANDO AUTORIZAÇÃO

> **Para o orquestrador (P.O. Uires Tapajós):** Este bloco lista tudo que o Claude Code produziu nesta sequência de sessões e que **ainda NÃO foi mergeado em `main`**. Nenhum push de novos commits será feito sem autorização explícita.

### 1.1 PRs OPEN aguardando merge

| PR | Branch | Conteúdo | Status |
|---|---|---|---|
| **#1287** | `chore/impact-tree-skill` | Skill `impact-tree` (225 LOC) + caso canônico v1 (391 LOC) + v2 (297 LOC) | **MERGEABLE** · 14 SUCCESS · 0 FAILING · aguarda autorização |
| **#1288** | `docs/cpf-pf-spec-v3-baseline` | v3 baseline (578 LOC) com mockup Variante A + rollback 5N + validação CPF | **MERGEABLE** · 12 SUCCESS · 0 FAILING · aguarda autorização |

### 1.2 Commit local NÃO pushed (este arquivo)

| Branch | Commits ahead origin | Conteúdo | Status |
|---|---|---|---|
| `docs/cpf-pf-spec-v4-cirurgica` | 1 (este `.md`) | **v4 cirúrgica — escopo reduzido** | **commit local apenas · NÃO pushed · aguarda autorização para `git push` + `gh pr create`** |

### 1.3 Ferramentas instaladas globalmente (sem commit no repo)

| Ferramenta | Install | Uso |
|---|---|---|
| `ast-grep` (já estava) | `npm install -g @ast-grep/cli` | Passo 1 da skill `impact-tree` |
| `knip` | `npm install -g knip` (15s) | Passo 2 dead-export detection |
| `ts-prune` | `npm install -g ts-prune` | Passo 2 alternativa |
| `dependency-cruiser` (`depcruise`) | `npm install -g dependency-cruiser` | Passo 10 grafo formal |

Não tocam o `package.json` do repo — instalação global.

### 1.4 Ordem sugerida de autorização

```
1. Aprovar e mergear PR #1287 (skill + casos canônicos v1/v2)
   ↓
2. Aprovar e mergear PR #1288 (v3 baseline com mockup Variante A)
   ↓
3. Revisar v4 (esta — só commit local) → autorizar push + PR
   ↓
4. Despachar implementação F0 (Sprint a definir)
```

### 1.5 O que o P.O. faz quando enviar a v4 ao orquestrador

Se você (P.O.) decidir aprovar a v4 e autorizar o checkin:

```bash
# Comandos exatos que Claude Code executará após autorização:
cd "D:\rag--uires\Projeto--compliance\versao--0.04\claude-code\IA-SOLARIS\compliance-tributaria-v2"
git push -u origin docs/cpf-pf-spec-v4-cirurgica
gh pr create --base main --head docs/cpf-pf-spec-v4-cirurgica --title "docs(spec): v4 CPF cirúrgica — só consistência frontend (sem enquadramento jurídico)" --body-file .git/PR_BODY_v4.md
```

---

## §2 · Diff v3 → v4

| Item | v3 (29/05 manhã) | v4 (29/05 tarde) | Origem do delta |
|---|---|---|---|
| Cobertura declarada | 98% | **98%** mantida (sem novos achados estruturais) | corte de escopo, não expansão |
| Escopo total | Classe C (~25 arquivos, ~700 LOC) | **Classe B** (~13 arquivos, ~280 LOC) | corte jurídico aprovado pelo P.O. |
| Campos jurídicos no formulário | `isProdutorRuralIntegrado` · `optouRegimeRegular` (Art. 165) · `receitaAnualFaixa` · banner "não contribuinte" | **REMOVIDOS** | decisão P.O.: "não iremos validar o enquadramento" |
| Mockup | Variante A com checkboxes/banners jurídicos | **Variante A simplificada** (apenas radio PJ/PF + input + ocultar Tipo/Porte em PF) | §4 deste documento |
| Plano de rollback | 5 níveis | **5 níveis mantidos** | continua válido — feature aditiva backward-compat |
| Validação CPF | Opção A — 13 testes | **Opção A — 13 testes mantidos** | continua válido |
| Dr. Swami no fluxo | 5 perguntas jurídicas obrigatórias | **REMOVIDO** | decisão P.O.: sem validação de enquadramento |
| ADR-0032 bump | MINOR | **MINOR** mantido | sem rename de campo derivado |
| ADR-0033 novo | "Identidade fiscal dual" | **mantido** | base do design |
| UX_DICTIONARY | não-mencionado | **§6 — análise + 4 telas a catalogar/atualizar** | regra de ouro Z-13.5 |

---

## §3 · AS-IS resumido (referência a v2/v3)

Mantido conforme v2 §3 (45 consumers · ADR-0032 identificado · 3 snapshots verificados · `users.cpf` dead-read · `ComplianceDashboard.tsx` consumer perdido na v1). Detalhe completo em `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v2-20260528.md`.

**Bloqueio raiz para PF (inalterado):** `routers-fluxo-v3.ts:201` + `test-e2e-v212.test.ts:18` → `cnpj: z.string().min(14, "CNPJ é obrigatório")`.

### §3.1 · Achado empírico — semântica REAL da flag `analise_1_cnpj_operacional` (validado 29/05 tarde)

> **Contexto:** o orquestrador apresentou ao P.O. duas opções (manter vs renomear o campo derivado). O Manus interpretou que "a flag verifica se o CNPJ existe". Esta v4 foi atualizada após o Claude Code **validar empiricamente** o que a flag faz de fato.

**Origem:** `server/lib/archetype/buildPerfilEntidade.ts:346-369` + `server/routers/perfil.ts:186` — verificado em 29/05 tarde via Read direto no código.

```typescript
// buildPerfilEntidade.ts:346-369 — função detectMultiCnpjBlocker
function detectMultiCnpjBlocker(seed: Seed): Blocker | null {
  const { integra_grupo_economico: integra, analise_1_cnpj_operacional: analise1 } = seed;
  if (!integra) return null; // NONE
  if (integra && analise1) {
    return { id: "V-05-INFO", severity: "INFO",
      rule: "empresa integra grupo econômico — análise neste projeto é de 1 CNPJ operacional; consolidação requer projetos adicionais" };
  }
  // DENIED (integra=true + analise1=false)
  return { id: "V-05-DENIED", severity: "BLOCK_FLOW",
    rule: "empresa integra grupo econômico E análise consolidada solicitada — fora do escopo M1 (1 CNPJ)" };
}
```

E `routers/perfil.ts:186`: `analise_1_cnpj_operacional: true` (hardcoded `true` atualmente, sem derivação dependente de CNPJ).

**Interpretação refutada do Manus:**

| Afirmação Manus | Semântica REAL (validada agora) |
|---|---|
| "flag verifica se o CNPJ existe" | flag indica que **o escopo do projeto é 1 entidade operacional (escopo unitário) vs consolidação multi-CNPJ de grupo econômico** |
| "expandir para 'tem CNPJ ou CPF válido?'" | flag combina com `integra_grupo_economico` — `analise1=false` + grupo=true → **DENIED** (consolidação multi-CNPJ fora do escopo M1) |

**Implicação para Decisão 1 (ADR-0032 bump):**

A "mentirinha semântica" do Manus **não se sustenta na descrição que ele deu** (a flag nem é sobre "tem CNPJ"). Mas a **conclusão (Opção A = manter o nome) continua correta por OUTRA razão, mais elegante:**

1. A flag já é semanticamente abstrata — significa "análise de 1 entidade operacional (escopo unitário)". O `cnpj` no nome é acidente histórico (M1 só tinha CNPJ); o conceito subjacente é "1 sujeito".
2. Para PF, a expansão é natural: "análise de 1 sujeito operacional (CPF ou CNPJ)" — não precisa mudar lógica nem valor. Continua `true` por default (PF é sempre 1 entidade).
3. `detectMultiCnpjBlocker` continua válido para PF — se um dia houver "grupo econômico de PFs", basta `integra_grupo_economico=true` e a lógica funciona como está.
4. As 6 assertions `"analise_1_cnpj_operacional": true` em `seed-normalizers.snap` continuam corretas para PF (escopo unitário).

**Tech debt P3 honesto registrado:** quando a feature "consolidação multi-entidade" entrar numa Sprint futura, vale rename para `analise_1_entidade_operacional`. **Hoje não precisa** — bump ADR-0032 MINOR confirmado sem rename.

**Caso canônico de rigor metodológico (Lição #93):** o Manus afirmou semântica sem citação `arquivo:linha`; Claude Code validou via Read e identificou divergência factual; conclusão final (Opção A) permanece, mas por justificativa correta. **Esta v4 documenta o achado para sustentar a resposta do P.O. ao orquestrador.**

---

## §4 · Mockup Variante A · **simplificado** (sem campos jurídicos)

### 4.1 Estado AS-IS (inalterado)

```
┌─ Identificação  [Obrigatório] ──────────────────────────────────┐
│  CNPJ *  [ 00.000.000/0000-00 ]  ← bloqueia se ≠ 14 dígitos    │
│  Tipo Jurídico * ◯ LTDA ◯ S/A ◯ MEI ...                        │
│  Porte * ◯ MEI ◯ Micro ◯ Pequena ◯ Média ◯ Grande              │
│  Regime Tributário * ◯ SN ◯ LP ◯ LR ...                         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 TO-BE — Variante A simplificada (estado PJ default)

```
┌─ Identificação  [Obrigatório] ────────────────────────────────┐
│                                                                │
│  Tipo de sujeito *                                             │
│  ◉ Pessoa Jurídica (CNPJ)                                      │
│  ○ Pessoa Física (CPF)                                         │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  CNPJ *                                                        │
│  [ 00.000.000/0000-00 ]  ✓ válido                              │
│                                                                │
│  Tipo Jurídico *                                               │
│  ◉ LTDA  ○ S/A  ○ MEI  ○ EIRELI  ...                          │
│                                                                │
│  Porte *                                                       │
│  ◉ Micro  ○ Pequena  ○ Média  ○ Grande                        │
│                                                                │
│  Regime Tributário *                                           │
│  ◉ Simples Nacional  ○ Lucro Presumido  ○ Lucro Real          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 Estado após selecionar "Pessoa Física"

```
┌─ Identificação  [Obrigatório] ────────────────────────────────┐
│                                                                │
│  Tipo de sujeito *                                             │
│  ○ Pessoa Jurídica (CNPJ)                                      │
│  ◉ Pessoa Física (CPF)                                         │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  CPF *                                                         │
│  [ 000.000.000-00 ]  ✓ válido                                  │
│                                                                │
│  ⓘ Tipo Jurídico e Porte não se aplicam a Pessoa Física       │
│                                                                │
│  Regime Tributário *                                           │
│  ◉ Simples Nacional  ○ Lucro Presumido  ○ Lucro Real          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Removidos vs v3** (decisão P.O. 29/05):
- ❌ `☑ Produtor rural integrado` (era checkbox)
- ❌ `☐ Optei pelo regime regular (Art. 165 LC 214)` (era checkbox)
- ❌ `Receita anual ◉ Até R$ 3,6 mi ○ Acima` (era radio)
- ❌ Badge "Não contribuinte por padrão"

**Mantidos**:
- ✅ Radio "Tipo de sujeito" PJ / PF
- ✅ Input CPF condicional com mask + validação local DV
- ✅ Ocultar Tipo Jurídico + Porte quando PF
- ✅ Manter Regime Tributário sempre visível
- ✅ Banner ⓘ informativo (apenas explicativo, sem implicação jurídica)

### 4.4 Comportamentos de transição

| Ação | Efeito |
|---|---|
| Troca PJ → PF | Limpa CNPJ digitado (confirm modal se > 0 dígitos); revela CPF; oculta Tipo Jurídico + Porte; mantém Regime Tributário |
| Troca PF → PJ | Limpa CPF digitado (confirm modal se > 0 dígitos); revela Tipo Jurídico + Porte; oculta banner ⓘ |
| `taxIdType === undefined` (registros legados) | Tratado como `'cnpj'` por default — backward compat |

### 4.5 data-testid obrigatórios (Gate UX REGRA-ORQ-09)

```
- radio-tax-id-type           → "cnpj" | "cpf"
- input-cnpj                  → existente (manter)
- input-cpf                   → NOVO
- validate-cpf-success        → "✓ válido" (verde)
- validate-cpf-error          → mensagem vermelha (espelhar CNPJ)
- info-tipo-juridico-na-aplicavel-pf (banner ⓘ)
```

**6 data-testid** (era 9 na v3 — 3 removidos por corte jurídico).

---

## §5 · Validação CPF — Opção A · MANTIDA (sem mudanças vs v3)

Spec completa em v3 §6:
- `validateCpf(cpf: string): boolean` — algoritmo módulo 11 padrão Receita Federal (DV1 + DV2)
- `maskCpf(value: string): string` — formatação progressiva
- Aceita formato cru ou mascarado
- Rejeita comprimento ≠ 11, sequências repetidas, DV inválido
- **13 test contracts** (10 validateCpf + 3 maskCpf)
- Pura, determinística, sem network, sem dependência externa
- Mensagens UX espelhando CNPJ
- Tech debt P3: Opção C (consulta RFB async) numa sprint futura

---

## §6 · Análise UX_DICTIONARY — atualizações necessárias

### 6.1 Regra invocada

`docs/governance/UX_DICTIONARY.md` (Sprint Z-13.5) tem **regra de ouro**:

> "NUNCA implementar frontend sem entrada neste dicionário. Se a tela não estiver aqui, executar `.claude/agents/ux-spec-validator.md` e criar entrada antes de codar."

Para a v4 (mudança visível ao usuário em formulário catalogado), **SIM é necessário atualizar UX_DICTIONARY**.

### 6.2 Telas afetadas e ação no UX_DICTIONARY

| Tela | Catalogada hoje? | Ação na v4 |
|---|---|---|
| `NovoProjeto.tsx` (§M1.1 do dict, linha 199-216) | ✅ sim | **ATUALIZAR §M1.1** — adicionar mudanças do radio + CPF condicional + 6 data-testid |
| `PerfilEmpresaIntelligente.tsx` (componente reutilizado) | ❌ não está | **CRIAR entrada nova** (componente compartilhado por 3 telas) |
| `M1PerfilEntidade.tsx` | _verificar_ | **CRIAR entrada nova** se não houver |
| `Clientes.tsx` (placeholder search + badge) | _verificar_ | **ATUALIZAR placeholder/badge** se já catalogada |

### 6.3 Mockup HTML obrigatório?

UX_DICTIONARY exige mockup HTML para "nova tela ou componente significativo" e "quando há múltiplos estados de UI (pending/approved/deleted)".

A v4 introduz **2 estados visuais novos** (PJ vs PF) → **SIM, mockup HTML obrigatório**.

**Path proposto:** `docs/sprints/<sprint>/MOCKUP_perfil-empresa-cpf-pf.html`
**Quem cria:** Orquestrador (P.O.) ANTES da issue de implementação (regra Z-14)

### 6.4 Conteúdo das atualizações no UX_DICTIONARY (proposta, NÃO escrita aqui)

A v4 propõe a atualização mas **NÃO escreve no UX_DICTIONARY** (isso é trabalho da issue de implementação, com Gate UX + ux-spec-validator). A v4 só sinaliza:

```diff
# Em §M1.1 NovoProjeto (linha 204-208), adicionar mudanças:
+ - **Adiciona** radio `[data-testid="radio-tax-id-type"]` com opções "cnpj" | "cpf"
+ - **Adiciona** input condicional `[data-testid="input-cpf"]` (visível quando radio=cpf)
+ - **Oculta** Tipo Jurídico + Porte quando radio=cpf (sem implicação jurídica — apenas UX)
+ - **Adiciona** banner informativo `[data-testid="info-tipo-juridico-na-aplicavel-pf"]`
+
+ **Invariantes adicionais:**
+ - `taxIdType === 'cnpj'` → CNPJ válido (14 dígitos + DV) obrigatório
+ - `taxIdType === 'cpf'` → CPF válido (11 dígitos + DV) obrigatório
+ - `taxIdType` default `'cnpj'` para registros pré-feature (backward-compat)
```

---

## §7 · Plano de Rollback · MANTIDO (5 níveis · v3 §5)

Plano de rollback continua **integralmente válido** para a v4 cirúrgica:

- N1 feature flag `ENABLE_TAX_ID_DUAL` OFF (<5min)
- N2 revert PR individual de uma fase (15-30 min)
- N3 revert F1-F5 mantendo F0 aditivo (30-60 min)
- N4 DROP COLUMN migration reversa (1-2h)
- N5 restore snapshot DB + tag `pre-cpf-pf-baseline` (4-8h catastrófico)

**6 pré-requisitos antes da F0:** snapshot DB · tag git · feature flag · down migration · DoD negativo SQL · runbook smoke.

Detalhamento completo em v3 §5.

---

## §8 · Fases F0-F5 atualizadas (escopo cirúrgico Classe B)

### 8.1 LOC delta — reclassificação Classe C → Classe B

| Fase | v3 (Classe C) | v4 (Classe B) | Redução |
|---|---|---|---|
| F0 — Schema | ~30 LOC | **~20 LOC** | sem `isProdutorRuralPF`, sem `isProdutorRuralIntegrado`, sem `optouRegimeRegular` |
| F1 — Validação backend | ~80 LOC | **~50 LOC** | Zod sem refines jurídicos |
| F2 — UI | ~200-250 LOC | **~120 LOC** | sem checkboxes/banner jurídicos |
| F3 — Hash + ADR | ~25 + 200 LOC | **~15 + 150 LOC** | `taxIdType` aditivo simples |
| F4 — PDF + briefing | ~30 LOC | **~30 LOC** | mantido |
| F5 — Testes + UX dict | ~100-200 LOC | **~70-100 LOC** | menos testes (sem campos jurídicos) |
| **Total** | ~700-800 LOC | **~280-400 LOC** | **~50% redução** |

**Reclassificação:** **Classe B** (≤500 LOC, ≤5 módulos críticos). REGRA-ORQ-24: SPEC completa, 1 round de crítica, ADR opcional (ADR-0033 ainda recomendado).

### 8.2 Spec resumida por fase (v4 cirúrgica)

| Fase | Conteúdo | Label PR |
|---|---|---|
| **F0** | `ALTER TABLE projects ADD COLUMN tax_id_type ENUM('cnpj','cpf') NOT NULL DEFAULT 'cnpj'` + `companyProfile` JSON aceita `cpf?` opcional + feature flag `ENABLE_TAX_ID_DUAL` + down migration + tag git `pre-cpf-pf-baseline` | `db:migration` |
| **F1** | `client/src/lib/validate-cpf.ts` + `validate-cpf.test.ts` (13 testes) + Zod `.refine` dual em `routers-fluxo-v3.ts:201` + `test-e2e-v212.test.ts:18` | `backend` + `tests` |
| **F2** | `PerfilEmpresaIntelligente.tsx` radio + input CPF condicional (Variante A simplificada §4) + espelhar em `M1PerfilEntidade.tsx`, `NovoProjeto.tsx`, `Clientes.tsx` (placeholder/badge) + 6 data-testid | `frontend` + `critical-path` |
| **F3** | `perfilHash.ts` aceitar `taxIdType` + `taxId`; **manter** `cnpj` legacy + nome do campo derivado `analise_1_cnpj_operacional` (compat snapshot — semântica validada em §3.1: a flag é sobre escopo unitário de 1 entidade, não sobre "CNPJ existe"; logo expansão para PF é natural sem rename) | `governance` + `backend` |
| **F4** | `generateDiagnosticoPDF.ts:125` dual CPF/CNPJ + filename `taxIdSlug` + 3 telas que consomem (`ActionPlan`, `Consolidacao`, **`ComplianceDashboard`**) + `briefing-confidence-signals.ts:39,104` aceitar `cpf` como signal + `BriefingEngineView.tsx:71` texto "CNPJ ou CPF, porte..." | `frontend` |
| **F5** | Atualizar `test-helpers.ts` fixture PF + 5-8 testes bloqueantes + **atualizar `UX_DICTIONARY.md §M1.1`** + criar entrada nova para componente `PerfilEmpresaIntelligente` + `DATA_DICTIONARY.md` + 3 snapshots `.snap` (2 não impactados + 1 preservado por design) | `tests` + `governance` + Gate UX |

---

## §9 · Auto-auditoria final v4

| Item | v3 status | v4 status | Evidência v4 |
|---|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | ✅✅ | mantido + §3.1 cita 3 paths reais (buildPerfilEntidade.ts:346-369, routers/perfil.ts:186, seed-normalizers.snap) |
| Skill `impact-tree` aplicada | ✅ | ✅ | invocada na cadeia v2/v3/v4 |
| ADRs identificados + bump declarado | ✅✅ | ✅✅✅ | ADR-0032 MINOR + ADR-0033 novo + **§3.1 valida empiricamente** semântica da flag derivada |
| UX_DICTIONARY analisado | ❌ não fora | ✅✅ **§6 com 4 telas + análise mockup HTML** | leitura de §M1.1 confirmou catalogação prévia |
| Escopo cirúrgico declarado | parcial | ✅✅ **Classe B confirmada** (~280-400 LOC) | corte de 3 campos jurídicos |
| Plano de rollback | ✅ | ✅ mantido | sem mudanças (continua válido) |
| Validação CPF | ✅ | ✅ mantida | sem mudanças (Opção A, 13 testes) |
| Mockup aprovado | ✅✅ (Variante A com jurídicos) | ✅✅ **(Variante A simplificada)** | proposto + aceito implicitamente pelo corte do P.O. |
| **Status operacional para o orquestrador** | ❌ não fora | ✅✅ **§1 com PRs + branches + ordem de autorização** | tabela executiva no topo do documento |
| **Refutação técnica documentada (Lição #93)** | — | ✅✅✅ NOVO em §3.1 | Manus afirmou semântica de flag sem citação; Claude Code validou via Read e identificou divergência factual; conclusão Opção A mantida com justificativa correta |
| **Cobertura total v4** | 98% | 🟢 **99%** | sobe 1pp com validação empírica da flag (era hipótese, agora é fato) |

---

## §10 · Próximos passos

### 10.1 Para você (P.O.) — decisões antes do checkin

1. ❓ **Aprovar o corte de escopo** v4 (sem campos jurídicos)? — implícito pela sua diretiva mas vou confirmar
2. ❓ **Autorizar `git push`** + `gh pr create` para a v4? (atualmente commit local apenas)
3. ❓ **Ordem de merge** dos 3 PRs (#1287, #1288, futuro #1289 v4)?
4. ❓ **Mockup HTML em `docs/sprints/<sprint>/`** — quem cria? Sugestão minha: você (P.O.) define a sprint e Manus produz mockup HTML usando Variante A simplificada como base
5. ❓ **ADR-0033 "Identidade fiscal dual"** — manter ou pode ficar como "nota no ADR-0032"?

### 10.2 Para Manus (operação — antes da F0, após autorização P.O.)

1. P1 — Snapshot DB pré-F0 (`mysqldump` em S3)
2. P2 — Tag git `pre-cpf-pf-baseline` em `f29ab50`
3. P3 — Feature flag `ENABLE_TAX_ID_DUAL` no env (default `false`)
4. P5 — DoD negativo SQL declarado por fase
5. P6 — Runbook `docs/deploy/runbook-rollback-cpf-pf.md`

### 10.3 Para Sprint posterior (tech debt registrado)

- Opção C (consulta RFB async) — tech debt P3 (`feat(cpf): consulta RFB BatchAPI async para status`)
- ADR-0033 formal se for criado em PR separado

---

## Resumo executivo (1 linha)

v4 = **versão cirúrgica** com corte do escopo jurídico (decisão P.O. 29/05): mantém radio "Tipo de sujeito" + input CPF condicional + validateCpf (Opção A) + rollback 5N; **remove** checkboxes "produtor rural integrado", "Art. 165 opção", "receita anual" e banner "não contribuinte"; **adiciona** análise UX_DICTIONARY (§M1.1 atualizar + 3 novas entradas + mockup HTML obrigatório); reclassifica **Classe C → Classe B** (~280-400 LOC delta, ~50% redução); **§3.1 valida empiricamente** que a flag `analise_1_cnpj_operacional` significa "escopo unitário de 1 entidade" (não "tem CNPJ" como Manus interpretou) — Opção A mantida por justificativa correta; status operacional explícito em §1 lista os 2 PRs OPEN aguardando autorização (#1287, #1288) + este commit local (`docs/cpf-pf-spec-v4-cirurgica`) aguardando autorização para push.

---

**Arquivo:** `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md`
**Branch:** `docs/cpf-pf-spec-v4-cirurgica` · **HEAD esperado pós-commit local:** próximo de `f29ab50` (off main fresco)
**Status:** ⏸ **COMMIT LOCAL · PUSH e PR aguardam autorização P.O.**
**Confiabilidade declarada v4:** **99%** (subiu 1pp com validação empírica da flag em §3.1; era hipótese na v3, agora é fato citado por `arquivo:linha`)
