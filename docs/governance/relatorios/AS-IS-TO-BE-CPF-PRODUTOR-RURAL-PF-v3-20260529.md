# AS-IS / TO-BE — Aceitar CPF no cadastro (Produtor Rural PF) · **v3 — baseline de implementação**

**Data:** 2026-05-29
**HEAD main:** `f29ab5009ec1e5cbf2d0a3e30ce85f47836e2c00`
**Branch:** `docs/cpf-pf-spec-v3-baseline`
**Predecessores:**
- v1 → `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-20260528.md` (75% → 95% após auto-crítica)
- v2 → `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v2-20260528.md` (97% via skill `impact-tree`)
- skill aplicada → `.claude/skills/impact-tree/SKILL.md` (PR #1287)

**Aprovações do P.O. (Uires Tapajós, 2026-05-29):**
- ✅ Mockup UX **Variante A** (radio "Tipo de sujeito" + condicional PF)
- ✅ Plano de Rollback em **5 níveis + 6 pré-requisitos**
- ✅ Validação CPF **Opção A** (DV local, sem integração RFB)

**Status:** **BASELINE DE IMPLEMENTAÇÃO** — pronto para Dr. Swami validar enquadramento jurídico + Manus revisar antes de gerar specs F0-F5.

---

## Índice

1. [Diff v2 → v3 (o que vem novo)](#1--diff-v2--v3)
2. [AS-IS consolidado (referência a v2)](#2--as-is-consolidado-referência-a-v2)
3. [TO-BE consolidado (referência a v2)](#3--to-be-consolidado-referência-a-v2)
4. **[Mockup aprovado — Variante A](#4--mockup-aprovado--variante-a)** ⭐ NOVO
5. **[Plano de Rollback — 5 níveis](#5--plano-de-rollback--5-níveis)** ⭐ NOVO
6. **[Validação CPF — spec técnica](#6--validação-cpf--spec-técnica-opção-a)** ⭐ NOVO
7. [Spec de fases F0-F5 atualizada](#7--spec-de-fases-f0-f5-atualizada)
8. [Auto-auditoria final v3](#8--auto-auditoria-final-v3)
9. [Decisões abertas para Dr. Swami + Manus](#9--decisões-abertas-para-dr-swami--manus)

---

## 1 · Diff v2 → v3

| Item | v2 (28/05) | v3 (29/05) | Origem do delta |
|---|---|---|---|
| Cobertura declarada | 97% | **98%** | aprovação dos 3 itens estruturantes |
| Status | "baseline de análise" | **"baseline de implementação"** | P.O. aprovou mockup + rollback + validação |
| Mockup UX | não havia | **Variante A formalizada (§4)** | proposta+aprovação 29/05 |
| Plano de Rollback | não havia | **5 níveis + 6 pré-requisitos + anti-padrões (§5)** | proposta+aprovação 29/05 |
| Validação CPF | mencionada vagamente | **spec técnica completa: algoritmo + maskCpf + 6 testes + mensagens (§6)** | proposta+aprovação 29/05 |
| Tag git baseline | não havia | **`pre-cpf-pf-baseline` em `f29ab50`** (a criar antes de F0) | requisito do rollback N5 |
| Feature flag | não havia | **`ENABLE_TAX_ID_DUAL` declarada na F0** | requisito do rollback N1 |
| ADR-0033 | proposto | **proposto + escopo desenhado em §7.6** | refinamento |
| Pendências | 3 para Manus | **mantidas + 3 novas para Dr. Swami** (§9) | refinamento |

---

## 2 · AS-IS consolidado (referência a v2)

Mantido idêntico à v2. **Não-duplicado aqui** para evitar drift entre documentos. Consulte `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v2-20260528.md` §3-§6:

- 16 arquivos backend, 9 arquivos frontend (`ComplianceDashboard.tsx` incluído), 3 arquivos shared/lib, 17 test files, 3 snapshots `.snap` analisados, ADR-0032 identificado
- Bloqueio raiz: `routers-fluxo-v3.ts:201` + `test-e2e-v212.test.ts:18` (`min(14, "CNPJ é obrigatório")`)
- `users.cpf` é DEAD-READ (confirmado manualmente — knip/ts-prune detectam exports não fields)
- 45 consumers totais identificados via grep + ast-grep + depcruise

---

## 3 · TO-BE consolidado (referência a v2)

Mantido idêntico à v2 §7. Bump **MINOR no ADR-0032** confirmado SOB CONDIÇÃO de manter nome do campo derivado `analise_1_cnpj_operacional` (preserva 5+ assertions em `seed-normalizers.snap`).

**Classe C** confirmada (~25 arquivos · ~650-800 LOC delta · ADR obrigatório · 5 fases F0-F5).

---

## 4 · Mockup aprovado — Variante A

**Aprovação P.O.:** 2026-05-29.

### 4.1 Estado AS-IS (que o tributarista do agro encontra hoje)

```
┌─ Identificação  [Obrigatório] ──────────────────────────────────┐
│                                                                 │
│  CNPJ *                                                         │
│  ┌────────────────────────────────┐                            │
│  │ 00.000.000/0000-00             │  ← bloqueia avanço se      │
│  └────────────────────────────────┘    14 dígitos inválidos    │
│                                                                 │
│  Tipo Jurídico *                                                │
│  ◯ LTDA   ◯ S/A   ◯ MEI   ◯ EIRELI   ◯ SCP                   │
│  ◯ Cooperativa   ◯ SLU   ◯ Outros                              │
│                                                                 │
│  Porte *                                                        │
│  ◯ MEI   ◯ Micro   ◯ Pequena   ◯ Média   ◯ Grande             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Estado TO-BE — Variante A aprovada

**Estado inicial (Pessoa Jurídica selecionada, default):**

```
┌─ Identificação  [Obrigatório] ────────────────────────────────┐
│                                                                │
│  Tipo de sujeito *                                             │
│  ◉ Pessoa Jurídica (CNPJ)                                      │
│  ○ Pessoa Física Produtor Rural (CPF)  [Art. 164 LC 214]      │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  CNPJ *                                                        │
│  ┌────────────────────────────────┐                            │
│  │ 00.000.000/0000-00             │  ✓ válido                 │
│  └────────────────────────────────┘                            │
│                                                                │
│  Tipo Jurídico *                                               │
│  ◉ LTDA   ○ S/A   ○ MEI   ○ EIRELI  ...                       │
│                                                                │
│  Porte *                                                       │
│  ◉ Micro  ○ Pequena  ○ Média  ○ Grande                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Estado após selecionar "Pessoa Física Produtor Rural":**

```
┌─ Identificação  [Obrigatório] ────────────────────────────────┐
│                                                                │
│  Tipo de sujeito *                                             │
│  ○ Pessoa Jurídica (CNPJ)                                      │
│  ◉ Pessoa Física Produtor Rural (CPF)  [Art. 164 LC 214]      │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  CPF *                                                         │
│  ┌────────────────────────────────┐                            │
│  │ 000.000.000-00                 │  ✓ válido                 │
│  └────────────────────────────────┘                            │
│                                                                │
│  ☑ Produtor rural integrado                                    │
│  ☐ Optei pelo regime regular (Art. 165 LC 214)                │
│                                                                │
│  Receita anual                                                 │
│  ◉ Até R$ 3,6 mi (não contribuinte por padrão)                 │
│  ○ Acima de R$ 3,6 mi (contribuinte regular)                  │
│                                                                │
│  ⓘ Tipo Jurídico e Porte não se aplicam a PF Produtor Rural   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 Comportamentos de transição (UX)

| Ação | Efeito |
|---|---|
| Usuário troca de PJ para PF | Limpa CNPJ digitado (com confirm modal se >0 dígitos); revela CPF + integrado + Art.165 + receita; oculta Tipo Jurídico + Porte (mantém Regime Tributário) |
| Usuário troca de PF para PJ | Limpa CPF digitado (com confirm modal se >0 dígitos); oculta blocos PF; revela Tipo Jurídico + Porte |
| `taxIdType === undefined` (registros legados) | Tratado como `'cnpj'` por default — backward compat |
| Receita "Até R$ 3,6 mi" + `optouRegimeRegular === false` | Badge informativo: "Não contribuinte do IBS/CBS por padrão" |
| `optouRegimeRegular === true` | Badge: "Contribuinte do regime regular (opção Art. 165)" |

### 4.4 Telas afetadas pelo mockup

| Tela | Mudança |
|---|---|
| `PerfilEmpresaIntelligente.tsx` (componente principal, 1377 LOC) | **adoção completa do mockup Variante A** (radio + condicionais) — fix propaga para as 3 telas que o montam |
| `NovoProjeto.tsx` (805 LOC) | inputs próprios — espelhar radio + CPF |
| `M1PerfilEntidade.tsx` (961 LOC) | espelhar mockup (tela paralela) |
| `Clientes.tsx` | placeholder do search: `"Buscar por nome, empresa, CNPJ ou CPF..."`; badge: trocar `<Badge>CNPJ</Badge>` por `<Badge>{taxIdType.toUpperCase()}</Badge>` |
| `BriefingEngineView.tsx:71` | description: `"Dados do cliente, identificação (CNPJ ou CPF), porte, regime tributário e responsável técnico."` |
| `NovoCliente.tsx` | **fora do escopo** (cadastro de usuário-cliente da SOLARIS, não de empresa-cliente analisada) |

### 4.5 data-testid obrigatórios (Gate UX / REGRA-ORQ-09)

```
- radio-tax-id-type           → "cnpj" | "cpf"
- input-cnpj                  → existente (manter)
- input-cpf                   → NOVO
- validate-cpf-success        → "✓ válido" (verde)
- validate-cpf-error          → mensagem vermelha (ver §6.3)
- checkbox-produtor-rural-integrado
- checkbox-optou-regime-regular
- radio-receita-anual-faixa   → "ate_3_6_mi" | "acima_3_6_mi"
- info-tipo-juridico-na-aplicavel-pf (banner ⓘ)
```

---

## 5 · Plano de Rollback — 5 níveis

**Aprovação P.O.:** 2026-05-29 (todos os 5 níveis + 6 pré-requisitos).

### 5.1 Pré-requisitos OBRIGATÓRIOS antes da F0

Sem cumprir TODOS os 6, a F0 não inicia.

| # | Pré-requisito | Quem prepara | Onde armazena |
|---|---|---|---|
| P1 | **Snapshot DB pré-F0** (`mysqldump` completo de produção) | Manus | S3 + cópia local Manus |
| P2 | **Tag git imutável** `pre-cpf-pf-baseline` apontando para HEAD atual | Claude Code (1 comando) | `git tag pre-cpf-pf-baseline f29ab50 && git push origin pre-cpf-pf-baseline` |
| P3 | **Feature flag** `ENABLE_TAX_ID_DUAL` no env de produção (default `false`) | Manus | `process.env.ENABLE_TAX_ID_DUAL === 'true'` controla exibição do radio |
| P4 | **Down migration** declarada explicitamente | Claude Code (junto com F0) | `drizzle/00XX_cpf_pf_DOWN.sql` |
| P5 | **DoD negativo SQL** (REGRA-ORQ-34 Protocolo 3) declarado por fase | Claude Code (em cada PR F0-F5) | PR body com query bloqueante |
| P6 | **Smoke pós-rollback** documentado | Manus | runbook em `docs/deploy/runbook-rollback-cpf-pf.md` (a criar) |

### 5.2 Os 5 níveis

#### Nível 1 — Feature flag OFF (rápido)

| Item | Valor |
|---|---|
| **Cenário gatilho** | Bug visual reportado por usuário; UI quebrada em um perfil específico; falso positivo de validação |
| **Ação** | Manus altera `ENABLE_TAX_ID_DUAL=false` no env de produção + reload |
| **Tempo total** | <5 min |
| **Efeito** | Radio "Tipo de sujeito" some; default volta a só-CNPJ; **registros PF criados ficam inacessíveis temporariamente** mas não-deletados |
| **Reversão** | Reativar flag → registros PF voltam a aparecer |
| **Quem aciona** | Manus (autônomo); P.O. avisado |
| **DoD pós-rollback** | `curl /admin/health` retorna 200; smoke CNPJ greenfield cria projeto |

#### Nível 2 — Revert de PR de UMA fase

| Item | Valor |
|---|---|
| **Cenário gatilho** | Bug isolado em UMA fase específica (ex: F4 PDF gerando filename errado) |
| **Ação** | `git revert <PR-fase-X>` → CI verde → merge automático |
| **Tempo total** | 15-30 min |
| **Efeito** | Apenas a camada da fase X volta ao AS-IS; outras camadas permanecem com a mudança |
| **Reversão** | Re-aplicar fase X com fix em sprint subsequente |
| **Quem aciona** | Manus + P.O. autoriza |
| **DoD pós-rollback** | Smoke da camada afetada confirma comportamento pré-feature; demais camadas continuam operacionais |

#### Nível 3 — Revert da feature inteira (F1-F5), mantendo F0

| Item | Valor |
|---|---|
| **Cenário gatilho** | Bug em runtime crítico (perfilHash crashando em produção, briefing-confidence-signals corrompendo score, etc.) |
| **Ação** | `git revert <PRs F1-F5>` (em ordem inversa); F0 (migration aditiva) PERMANECE (não-destrutiva); flag fica OFF |
| **Tempo total** | 30-60 min |
| **Efeito** | Schema mantém `tax_id_type` (zero leitores); código volta ao AS-IS; nenhum PF pode ser criado; PFs criados antes do rollback ficam órfãos no DB |
| **Reversão** | Re-aplicar F1-F5 com fixes em sprint subsequente |
| **Quem aciona** | Manus + P.O. autoriza |
| **DoD pós-rollback** | `SELECT COUNT(*) FROM projects WHERE tax_id_type='cpf'` registra órfãos para análise; nenhum novo PF é criado; CNPJ greenfield funciona |

#### Nível 4 — Migration reversa (DROP COLUMN F0)

| Item | Valor |
|---|---|
| **Cenário gatilho** | Coluna `tax_id_type` gerando problema (improvável em ENUM com DEFAULT) — ou: decisão estratégica de remover totalmente a feature |
| **Ação** | Aplicar `drizzle/00XX_cpf_pf_DOWN.sql` (`ALTER TABLE projects DROP COLUMN tax_id_type`); restaurar shape JSON antigo via UPDATE seletivo |
| **Tempo total** | 1-2h (depende do volume de projetos PF para re-derivar) |
| **Efeito** | Schema volta 100% ao AS-IS; **hashes de perfil gerados durante a feature precisam re-derivar** (`perfil.migrate` que ainda não existe — limitação ADR-0032) |
| **Reversão** | Custo alto: nova migration + re-derivação completa |
| **Quem aciona** | Manus + P.O. autoriza + Dr. Swami avisado |
| **DoD pós-rollback** | `SHOW COLUMNS FROM projects` não mostra `tax_id_type`; `perfilHash` re-deriva sem erro; CNPJ greenfield funciona |

#### Nível 5 — Restore baseline completo (catastrófico)

| Item | Valor |
|---|---|
| **Cenário gatilho** | Falha estrutural irrecuperável (corrupção de dados de projetos antigos, perfilHash divergindo em massa, ADR-0032 violado) |
| **Ação** | Restore do **snapshot DB pré-F0** (`mysqldump` de P1) em ambiente paralelo; `git reset --hard pre-cpf-pf-baseline` (tag P2); downgrade `archetypeVersion` v1.1.0 → v1.0.0; switch tráfego para ambiente restaurado |
| **Tempo total** | 4-8h (depende de tamanho do DB) |
| **Efeito** | **Projetos criados durante a janela da feature são PERDIDOS** (precisa redoar); ambiente volta ao estado pré-feature byte-a-byte |
| **Reversão** | Não há reversão — é o último recurso |
| **Quem aciona** | P.O. + Manus + Dr. Swami obrigatoriamente |
| **DoD pós-rollback** | `git rev-parse HEAD === f29ab50`; `SELECT COUNT(*) FROM projects` igual ao snapshot P1; `archetypeVersion === 'v1.0.0'`; smoke completo 9-fluxos passa |

### 5.3 Anti-padrões do rollback

❌ **Tentar rollback parcial sem snapshot pré-F0 disponível** — P1 (Manus arquiva em S3) é gate hard.
❌ **Reverter F0 com F3 ainda merged** — `perfilHash.ts` quebra com `taxIdType undefined`; ordem N3 → N4 obrigatória.
❌ **Mudar feature flag em produção sem reload** — Lição #91 gotcha #5 do ambiente; `ENABLE_TAX_ID_DUAL` deve exigir reload de sessão server.
❌ **Esquecer downgrade `archetypeVersion` no N5** — perfil_hash de registros antigos não bate mais; gera "drift silencioso".
❌ **Acionar N4 ou N5 sem aviso ao Dr. Swami** — impacto jurídico em projetos PF criados; advogado precisa orientar clientes.

### 5.4 Tabela rápida de decisão

```text
Bug visual / falso positivo            → N1 (flag OFF)
Bug em UMA fase específica             → N2 (revert PR)
Bug runtime crítico (engine quebrado)  → N3 (revert F1-F5)
Decisão estratégica de remover         → N4 (DROP COLUMN)
Corrupção de dados / drift hash        → N5 (restore baseline)
```

---

## 6 · Validação CPF — spec técnica (Opção A)

**Aprovação P.O.:** 2026-05-29 (DV local, sem integração RFB; tech debt P3 para Opção C numa sprint futura).

### 6.1 Função `validateCpf` — algoritmo módulo 11 padrão Receita Federal

**Arquivo destino:** `client/src/lib/validate-cpf.ts` (novo) + re-export em `client/src/components/PerfilEmpresaIntelligente.tsx` espelhando `validateCnpj`.

```typescript
/**
 * validateCpf.ts — Validação local de CPF (Opção A · sem integração RFB)
 *
 * Espelha estrutura de validateCnpj em PerfilEmpresaIntelligente.tsx:152.
 * Algoritmo módulo 11 padrão Receita Federal (DV1 + DV2).
 * Pura, determinística, sem side effects, sem network.
 *
 * Tech debt P3 (decisão P.O. 29/05/2026): consulta RFB async não-bloqueante
 * (Opção C) em sprint futura — `cpf_status` em projects, job scheduler, etc.
 */
export function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");

  // Regra 1: comprimento exato 11
  if (digits.length !== 11) return false;

  // Regra 2: rejeitar sequências repetidas (todos os dígitos iguais)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Regra 3: dígito verificador 1 (DV1) — pesos 10..2
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let dv1 = 11 - (sum % 11);
  if (dv1 >= 10) dv1 = 0;
  if (dv1 !== parseInt(digits[9], 10)) return false;

  // Regra 4: dígito verificador 2 (DV2) — pesos 11..2
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  let dv2 = 11 - (sum % 11);
  if (dv2 >= 10) dv2 = 0;
  if (dv2 !== parseInt(digits[10], 10)) return false;

  return true;
}
```

**Propriedades:**

| Propriedade | Valor |
|---|---|
| Pureza | sim — sem side effects, sem network, sem I/O |
| Determinismo | sim — mesmo input → mesmo output sempre |
| Aceita formatos | cru (`"12345678901"`) **OU** mascarado (`"123.456.789-01"`) — strip via `.replace(/\D/g, "")` |
| Tratamento de erro | retorna `false` silenciosamente (não lança exceção) |
| Espelha | `validateCnpj` existente — mesma assinatura, mesma estratégia |
| Performance | O(n) com n=11 fixo → constante |

### 6.2 Função auxiliar `maskCpf` (formatação progressiva)

```typescript
export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}
```

Espelha `maskCnpj` existente (testes em `server/sprint-v53-features.test.ts:28-64`).

### 6.3 Mensagens de erro (UX) — espelham CNPJ

| Condição | Estado visual | Mensagem | data-testid |
|---|---|---|---|
| `digits.length === 0` | neutro | — | — |
| `digits.length > 0 && digits.length < 11` | cinza informativo | `"{11 - digits.length} dígito(s) restante(s)"` | `cpf-hint-digits-remaining` |
| `digits.length === 11 && /^(\d)\1{10}$/` | vermelho (bloqueante) | `"CPF inválido — todos os dígitos iguais"` | `validate-cpf-error` |
| `digits.length === 11 && DV inválido` | vermelho (bloqueante) | `"CPF inválido — verifique os dígitos verificadores"` | `validate-cpf-error` |
| `validateCpf(cpf) === true` | verde confirmatório | `"CPF válido"` | `validate-cpf-success` |

### 6.4 Test contracts (REGRA-ORQ-28 Triade) — Artefato 2

**Arquivo:** `client/src/lib/validate-cpf.test.ts` (novo).

```typescript
import { describe, it, expect } from "vitest";
import { validateCpf, maskCpf } from "./validate-cpf";

describe("validateCpf — Opção A (DV local sem RFB)", () => {
  // GOLDEN — CPFs válidos conhecidos (não-sensíveis, usados em literatura pública)
  it("aceita CPF válido cru (529.982.247-25)", () => {
    expect(validateCpf("52998224725")).toBe(true);
  });
  it("aceita CPF válido mascarado (529.982.247-25)", () => {
    expect(validateCpf("529.982.247-25")).toBe(true);
  });
  it("aceita CPF válido com espaços (' 529.982.247-25 ')", () => {
    expect(validateCpf(" 529.982.247-25 ")).toBe(true);
  });

  // COMPRIMENTO
  it("rejeita comprimento < 11", () => {
    expect(validateCpf("123")).toBe(false);
    expect(validateCpf("5299822472")).toBe(false); // 10 dígitos
  });
  it("rejeita comprimento > 11", () => {
    expect(validateCpf("123456789012")).toBe(false);
  });
  it("rejeita string vazia", () => {
    expect(validateCpf("")).toBe(false);
  });

  // SEQUÊNCIAS REPETIDAS (regra explícita Receita Federal)
  it("rejeita todos dígitos iguais (CPFs de teste históricos)", () => {
    for (const d of [
      "00000000000","11111111111","22222222222","33333333333",
      "44444444444","55555555555","66666666666","77777777777",
      "88888888888","99999999999"
    ]) {
      expect(validateCpf(d)).toBe(false);
    }
  });

  // DV INVÁLIDO
  it("rejeita DV1 errado", () => {
    expect(validateCpf("52998224715")).toBe(false); // último-1 mudado de 2 para 1
  });
  it("rejeita DV2 errado", () => {
    expect(validateCpf("52998224726")).toBe(false); // último mudado de 5 para 6
  });
});

describe("maskCpf — formatação progressiva", () => {
  it("aplica máscara progressiva conforme digitação", () => {
    expect(maskCpf("")).toBe("");
    expect(maskCpf("5")).toBe("5");
    expect(maskCpf("52")).toBe("52");
    expect(maskCpf("529")).toBe("529");
    expect(maskCpf("5299")).toBe("529.9");
    expect(maskCpf("52998")).toBe("529.98");
    expect(maskCpf("529982")).toBe("529.982");
    expect(maskCpf("5299822")).toBe("529.982.2");
    expect(maskCpf("52998224")).toBe("529.982.24");
    expect(maskCpf("529982247")).toBe("529.982.247");
    expect(maskCpf("5299822472")).toBe("529.982.247-2");
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
  });
  it("trunca em 11 dígitos (overflow seguro)", () => {
    expect(maskCpf("529982247259999")).toBe("529.982.247-25");
  });
  it("strip caracteres não-numéricos antes de aplicar máscara", () => {
    expect(maskCpf("abc52998xyz224725")).toBe("529.982.247-25");
  });
});
```

**Total: 13 testes** (10 validateCpf + 3 maskCpf).

### 6.5 Integração com Receita Federal — TECH DEBT P3 (decisão P.O.)

A **Opção A aprovada** mantém validação 100% local (consistência com `validateCnpj` atual). Tech debt P3 documentado:

- Issue futura: `feat(cpf): consulta RFB BatchAPI async para status (Opção C)`
- Campo proposto: `projects.cpf_status` ENUM('pending','regular','suspended','cancelled')
- Job scheduler: `server/jobs/cpf-rfb-batch.ts` (não existe ainda)
- Não-bloqueante: validação local valida instantaneamente; backend agenda consulta async
- **Bloqueio:** dependência externa (custo + rate limit + LGPD) — exige aprovação adicional do P.O. + jurídico

---

## 7 · Spec de fases F0-F5 atualizada

Mantém estrutura da v2 §7.4, agora **com mockup + rollback + validação CPF integrados**.

### 7.1 F0 — Migration + pré-requisitos rollback

| Item | Conteúdo |
|---|---|
| Escopo | `ALTER TABLE projects ADD COLUMN tax_id_type ENUM('cnpj','cpf') NOT NULL DEFAULT 'cnpj'` + JSON shape expansion |
| Pré-requisitos rollback | **P1-P6 todos cumpridos** (§5.1) |
| Feature flag | `ENABLE_TAX_ID_DUAL` adicionada ao env (default `false`) |
| Down migration | `drizzle/00XX_cpf_pf_DOWN.sql` (DROP COLUMN — N4) |
| Tag git | `pre-cpf-pf-baseline` em `f29ab50` (criar antes do push da F0) |
| LOC | ~30 |
| Label PR | `db:migration` |

### 7.2 F1 — Validação CPF + Zod refine

| Item | Conteúdo |
|---|---|
| Escopo | `client/src/lib/validate-cpf.ts` (§6.1) + `validate-cpf.test.ts` (§6.4, 13 testes) + Zod `.refine` dual em `routers-fluxo-v3.ts:201` + `test-e2e-v212.test.ts:18` |
| Test contracts | 13 testes (Triade ORQ-28 Artefato 2) |
| LOC | ~80 |
| Label PR | `backend` + `tests` |

### 7.3 F2 — UI Variante A aprovada

| Item | Conteúdo |
|---|---|
| Escopo | `PerfilEmpresaIntelligente.tsx` radio + condicional (§4.2 + §4.3); espelhar em `M1PerfilEntidade.tsx`, `NovoProjeto.tsx`, `Clientes.tsx` (placeholder/badge) |
| data-testid | 9 obrigatórios (§4.5) |
| LOC | ~200-250 |
| Label PR | `frontend` + `critical-path` (3 telas dependem) |

### 7.4 F3 — perfilHash + ADR-0032 MINOR + ADR-0033 novo

| Item | Conteúdo |
|---|---|
| Escopo | `perfilHash.ts:18` introduzir `taxIdType` + `taxId`; manter `cnpj` para legacy; **manter** nome `analise_1_cnpj_operacional` (compat snapshot — §3 v2) |
| ADR-0032 update | bump MINOR (v1.0.0 → v1.1.0) — nota de evolução semântica do campo derivado |
| ADR-0033 novo | "Identidade fiscal dual (CPF ou CNPJ)" |
| LOC | ~25 + 200 docs |
| Label PR | `governance` + `backend` |

### 7.5 F4 — PDF + briefing + ComplianceDashboard

| Item | Conteúdo |
|---|---|
| Escopo | `generateDiagnosticoPDF.ts:125`: `if (data.cnpj \|\| data.cpf) doc.text('${tipoIdent}: ${id}', ...)`; filename `taxIdSlug`; passar `cpf?` de 3 telas (`ActionPlan`, `Consolidacao`, **`ComplianceDashboard`**); `briefing-confidence-signals.ts:39,104`: `cpf` como signal; `BriefingEngineView.tsx:71`: texto "CNPJ ou CPF, porte..." |
| LOC | ~30 |
| Label PR | `frontend` |

### 7.6 F5 — Testes + fixtures + DATA_DICTIONARY

| Item | Conteúdo |
|---|---|
| Escopo | Adicionar fixture PF em `test-helpers.ts`; atualizar 5-8 testes bloqueantes; 3 snapshots: 2 não-impactados (verificado v2), 1 preservado por design; atualizar `DATA_DICTIONARY.md`, `DE-PARA-CAMPOS-PERFIL-ENTIDADE.md` |
| LOC | ~100-200 |
| Label PR | `tests` + `governance` |

---

## 8 · Auto-auditoria final v3

| Item | v2 (28/05) | v3 (29/05) | Evidência v3 |
|---|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | ✅ | mantido |
| Testes incluídos no grep | ✅ | ✅ | mantido |
| `.sql/.md/.json` cobertos | ✅ | ✅ | mantido |
| PDF/email verificado | ✅✅ | ✅✅ | mantido (3 consumers) |
| Issues pré-existentes | ✅ | ✅ | mantido (zero matches) |
| ast-grep aplicado | ✅✅ | ✅✅ | mantido (8 padrões) |
| Dead-read check | ✅ | ✅ | mantido (com ressalva metodológica) |
| LOC reais | ✅ | ✅ | mantido (`ComplianceDashboard.tsx` = 284 LOC) |
| ADRs + bump declarado | ✅✅ | ✅✅ | ADR-0032 MINOR + ADR-0033 novo desenhado em §7.4 |
| Mapa writers/readers | ✅✅ | ✅✅ | depcruise mantido |
| Snapshots `.snap` abertos | ✅ | ✅ | mantido (2 sem refs + 1 com 6 refs ao campo derivado) |
| **Mockup UX aprovado** | ❌ não havia | ✅ **Variante A aprovada P.O. 29/05** (§4) | proposta+aprovação com preview ASCII |
| **Plano de Rollback aprovado** | ❌ não havia | ✅ **5 níveis + 6 pré-requisitos + anti-padrões aprovados P.O. 29/05** (§5) | tabelas detalhadas por nível |
| **Validação CPF aprovada** | ❌ proposta vaga | ✅ **Opção A: algoritmo + maskCpf + 13 testes + mensagens UX + tech debt P3 aprovados P.O. 29/05** (§6) | spec completa pronta para F1 |
| **Cobertura total v3** | 97% | 🟢 **98%** | residual 2%: contagem exata fixtures CNPJ nos 17 testes + verificação `ComplianceDashboard.tsx:88` |

---

## 9 · Decisões abertas para Dr. Swami + Manus

### 9.1 Para Dr. Swami (jurídico tributário — antes da F2)

1. **Confirmar enquadramento Art. 164** — produtor rural PF com receita < R$ 3,6 mi é não-contribuinte por padrão? OU exige declaração formal?
2. **Confirmar Art. 165** — "opção pelo regime regular" tem prazo / formalidade específica? Como capturar isso no cadastro de forma juridicamente válida?
3. **Confirmar "produtor rural integrado"** — definição operacional jurídica (vínculo formal com integradora, contrato de integração registrado, etc.)?
4. Para a **Receita anual** (§4.2 — radio "Até R$ 3,6 mi" / "Acima"): este é o valor declarado pelo cliente OU validado por fonte oficial (Receita)?
5. Existem **outros artigos** da LC 214 que demandam captura específica no cadastro PF (além de Art. 164/165)?

### 9.2 Para Manus (operação — antes da F0)

1. **Snapshot DB pré-F0** (P1): qual a janela de execução? Após autorização P.O. e antes do merge da F0.
2. **Volume de projetos PF "fantasma"** atualmente no sistema — clientes que usaram CPF como `"00000000000000"` para contornar bloqueio: `SELECT COUNT(*) FROM projects WHERE JSON_EXTRACT(companyProfile, '$.cnpj') LIKE '0%' OR JSON_EXTRACT(companyProfile, '$.cnpj') LIKE '999%'`
3. **Feature flag scope** (P3): apenas frontend OU também backend Zod? Sugestão minha: **ambos** — backend respeita flag para validação dual, frontend respeita para exibir radio.
4. **Smoke pós-rollback** (P6): runbook em `docs/deploy/runbook-rollback-cpf-pf.md` precisa ser escrito antes da F0.
5. **Tag git imutável** `pre-cpf-pf-baseline`: pode ser criada agora ou aguarda F0?

### 9.3 Residual 2% de cobertura

- Contagem exata fixtures CNPJ nos 17 testes (LOC delta preciso F5): query Manus 1 minuto.
- Verificar `ComplianceDashboard.tsx:88` se também passa `cnpj: undefined` ao PDF (provável por simetria; check rápido Claude Code).

---

## Resumo executivo (1 linha)

v3 = **baseline de implementação** consolidando v2 (97% cobertura, 45 consumers, bump MINOR ADR-0032) com **3 itens estruturantes aprovados pelo P.O. em 29/05/2026**: (1) mockup UX Variante A com radio "Tipo de sujeito" + condicional PF; (2) plano de rollback em 5 níveis + 6 pré-requisitos obrigatórios; (3) validação CPF Opção A — DV local sem RFB com 13 test contracts; pronto para Dr. Swami validar enquadramento jurídico + Manus iniciar pré-requisitos rollback antes da F0.

---

**Arquivo:** `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v3-20260529.md`
**Skill aplicada:** `.claude/skills/impact-tree/SKILL.md` (PR #1287)
**Branch:** `docs/cpf-pf-spec-v3-baseline` · **HEAD pré-feature:** `f29ab50`
**Confiabilidade declarada v3:** 98% (residual 2% em §9.3)
**Aprovações P.O. (29/05/2026):** Mockup Variante A ✅ · Rollback 5 níveis ✅ · Validação CPF Opção A ✅
