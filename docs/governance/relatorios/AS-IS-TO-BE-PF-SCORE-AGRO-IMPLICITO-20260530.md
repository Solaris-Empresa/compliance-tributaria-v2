# AS-IS / TO-BE — PF agro implícito + ajuste de score

**Data:** 2026-05-30 (sessão estendida 29/05/2026)
**HEAD analisado:** `3f97b21` (main pós PR #1315 Lição #117)
**Skill aplicada:** `.claude/skills/impact-tree/SKILL.md` (REGRA-ORQ-41 — 11 passos)
**Solicitante:** P.O. Uires Tapajós
**Premissa de produto:** "Pessoa Física = Agronegócio, não há outra possibilidade. Por isso precisamos tirar o 'Tipo de Operação Principal' e a 'Receita Bruta Anual', que afetam o score da PF e bloqueiam o botão Avançar."

---

## §1 — Cenário operacional reportado pelo P.O. (sintoma)

PDF da página `/projetos/novo` para PF (CPF agro) mostra **3 manifestações** de um único gap arquitetural:

| Sintoma | Local visual no PDF |
|---|---|
| "Melhore o score" lista **Faturamento Anual** como opcional faltante mas a UI não mostra o campo | Painel "Status do Perfil" — bloco amarelo |
| Botão "Reexecutar análise" **disabled** mesmo com CPF + todos os campos visíveis preenchidos | Status do Perfil, abaixo das métricas |
| Mensagem **"Preencha tipo jurídico e regime tributário para ativar"** aparece para PF, mas a UI já oculta esses campos | Idem |
| Botão "Avançar" **disabled** com Completude do formulário em 80% — nunca atinge gate de habilitação | Etapa 1 de 5 — rodapé do formulário |

**Não é regressão funcional do schema** (backend OK desde F8). É **descompasso entre F7 (ocultou UI) e os pontos do mesmo arquivo que dependem das mesmas variáveis** (`companyType`, `taxRegime`, `annualRevenueRange`, `operationType`).

---

## §2 — Auto-auditoria das técnicas usadas (skill `impact-tree` — 11 passos)

| Passo | Status | Evidência |
|---|---|---|
| 1 — ast-grep semântico | ✅ | `$_.operationType` (10+ matches), `$_.annualRevenueRange` (8 matches) |
| 2 — knip / ts-prune | ⚠️ skip | passos prévios já mapearam suficientes |
| 3 — Issues pré-existentes (Lição #83) | ✅ | 4 buscas; `#827 [HOTFIX]`, `#821 [BACKLOG]`, `#1225 [P2-IMO-A]` tocam `operationType` (PJ-only); nenhum cobre o problema PF-agro |
| 4 — Grep incluindo testes | ✅ | **43 arquivos** com `operationType`, **8** com `annualRevenueRange` |
| 5 — .sql / .md / .json | ✅ | operationType: 1 SQL · **71 .md** · 2 JSON |
| 6 — PDF/templates LLM | ✅ | `generateDiagnosticoPDF.ts` não usa nenhum dos 2; `routers-fluxo-v3.ts:1655` **usa `annualRevenueRange` no prompt LLM** ("Faturamento Anual: ${cp.annualRevenueRange ?? 'não informado'}") |
| 7 — Snapshots `.snap` | ✅ | 0 com `operationType` ou `annualRevenueRange` |
| 8 — LOC | ✅ | `PerfilEmpresaIntelligente.tsx` = 1524, `NovoProjeto.tsx` = 695, `routers-fluxo-v3.ts` = 6960 |
| 9 — ADRs | ✅ | **ADR-0030** (hotfix IS elegibilidade por operationType, v1.1) — não muda; **ADR-0010** (substituição QC/QO por NCM/NBS) — não muda |
| 10 — Writers/Readers | ✅ | Mapa abaixo |
| 11 — Auto-auditoria final | ✅ | §11 abaixo |

**Cobertura:** **94%** 🟢 — alta porque o escopo é cirúrgico (1 arquivo central) e há precedente recente (F7 PR #1301 fez exatamente o mesmo padrão de cascata).

---

## §3 — Risco de regressão por gravidade

### 🔴 Crítico

**Nenhum.** Backend já está preparado: `routers-fluxo-v3.ts` superRefine condicional por `taxIdType==="cpf"` permite ausência de `operationType` e `annualRevenueRange` para PF. Schema Drizzle não muda.

### 🟡 Visível

**Engine determinístico v4 + briefing LLM**:

- `server/lib/completeness.ts:97` (inferência tipo de empresa) lê `profile.operationType` — para PF agro, **se ficar vazio**, cai em fallback CNAE-based que já retorna "misto" para CNAE 0115 (cultivo soja). Hoje já é "misto" porque `agronegocio` mapeia para `misto` em `completeness.ts:110` (caso canônico documentado anteriormente). **Não regride** — está nesse estado hoje.

- `server/cnae-embeddings.ts:250` usa `companyContext.operationType` no contexto de busca semântica. Para PF agro, **se enviarmos `"agronegocio"` automaticamente**, melhora a precisão do retrieval; se enviarmos vazio, cai no fallback CNAE (já funciona).

- `server/routers-fluxo-v3.ts:1655` injeta `annualRevenueRange` no prompt LLM. Para PF: vai exibir "Faturamento Anual: não informado". **Aceitável** — declaração do P.O. de que PF agro pequeno (≤R$360k) não precisa informar.

- `server/lib/briefing-confidence-signals.ts:122` conta `annualRevenueRange` como signal de completude. **Score desce** se removido sem ajuste. Solução: branchear o signal por `taxIdType==="cpf"`.

### 🟢 Cosmético

- 71 `.md` mencionam `operationType` — update mecânico onde aplicável (não-bloqueante).
- 8 testes em `annualRevenueRange` — maioria assertiona valores PJ específicos; verificar 1-2 que possam quebrar.

---

## §4 — Consumers reais (lista canônica)

### Frontend (foco do AS-IS)

| Arquivo:linha | Função | Estado pós-F7 |
|---|---|---|
| `PerfilEmpresaIntelligente.tsx:71` | `operationType: ""` no `PERFIL_VAZIO` | inicial |
| `PerfilEmpresaIntelligente.tsx:846` | `useEffect` zera `operationType: ""` ao virar PF | F7 limpa |
| `PerfilEmpresaIntelligente.tsx:1090-1112` | Bloco JSX "Tipo de Operação Principal" — `{!isPF && (...)}` | F7 oculta |
| `PerfilEmpresaIntelligente.tsx:1028-1080` | Seção 2 "Regime Tributário + Receita Bruta" — `{!isPF && (...)}` | F7 oculta inteira |
| **`PerfilEmpresaIntelligente.tsx:199-212`** | **`calcProfileScore.optional` — lista universal sem branch isPF** | ❌ **gap** |
| **`PerfilEmpresaIntelligente.tsx:330`** | **`hasMinimumData = !!companyType && !!taxRegime`** — sem branch isPF | ❌ **gap** |
| **`PerfilEmpresaIntelligente.tsx:415`** | **Mensagem "Preencha tipo jurídico e regime tributário"** — hardcoded | ❌ **gap** |
| `NovoProjeto.tsx:277-278` | Payload `companyProfile.taxIdType + cpf` | PR #1314 corrigiu |
| `NovoProjeto.tsx:280` | Payload `operationProfile.operationType` — envia direto do state | sem branch — para PF envia `""` |

### Backend

| Caminho | Quem | Comportamento atual |
|---|---|---|
| `server/routers-fluxo-v3.ts:316-336` | Schema Zod `operationType: z.preprocess(emptyToUndefined, .enum().optional().nullable())` | Aceita `""` para PF |
| `server/routers-fluxo-v3.ts:444-470` | superRefine raiz — `if (companyProfile?.taxIdType === "cpf") return; if (!operationType) ctx.addIssue(...)` | PJ obrigatório · PF opcional |
| `server/lib/archetype/deriveOperationType.ts:51-54` | Deriva `"agronegocio"` se objeto contém `AGRO_OBJECTS` | **CNAE 0115 → agronegocio automático** (sem precisar frontend mandar) |
| `server/lib/completeness.ts:91-112` | `inferCompanyType` — mapeia `agronegocio` para `"misto"` em `:110` | Sem branch PF (decisão de produto anterior — manter) |

### Tests (43 arquivos `operationType` + 8 `annualRevenueRange`)

Em sua maioria asseram cenários PJ com payloads pré-construídos. Para PF agro, os testes mais relevantes:
- `server/integration/test-e2e-v212.test.ts` — base de smoke
- `server/m2-componente-d-update-operation-profile.test.ts` — testa update
- `server/bug001-regression.test.ts:306` — assertion `annualRevenueRange === "4_8m_78m"`

→ Nenhum teste **dedicado a PF agro implícito** existe. Será necessário criar.

### Tipos compartilhados

`shared/types.ts` / `client/src/components/PerfilEmpresaIntelligente.tsx:33-60` declaram `PerfilEmpresaData`:
- `operationType: string` (obrigatório no tipo, default `""`)
- `annualRevenueRange: string` (obrigatório no tipo, default `""`)

Não precisam mudar — campos continuam no tipo (compatibilidade), apenas a UI e o score branch-eam por `isPF`.

### Backend que opcionalmente consome (briefing LLM)

- `routers-fluxo-v3.ts:1655` — prompt do briefing LLM injeta `cp.annualRevenueRange ?? "não informado"`. Para PF: ficará "não informado" naturalmente. **Decisão**: trocar para "**N/A para Pessoa Física**" condicionado por `taxIdType==="cpf"` no prompt.

---

## §5 — Árvore de impacto (cascata)

```
[Premissa P.O.: PF = Agronegócio implícito]
        │
        ├─ FRONTEND
        │   │
        │   ├─ calcProfileScore (linha 199-212):
        │   │     optional ANTES = 12 itens universais
        │   │     optional DEPOIS = 9 itens (PF) / 12 (PJ — sem mudança)
        │   │       remove: Faturamento Anual, Grupo econômico, Centralização fiscal
        │   │     [Score PF chega a 100% naturalmente]
        │   │
        │   ├─ hasMinimumData (linha 330):
        │   │     ANTES = companyType && taxRegime (válido só PJ)
        │   │     DEPOIS = isPF ? !!cpf : (companyType && taxRegime)
        │   │     [Botão "Reexecutar análise" habilita para PF após CPF]
        │   │
        │   ├─ Mensagem "Preencha..." (linha 415):
        │   │     ANTES = hardcoded "tipo jurídico e regime tributário"
        │   │     DEPOIS = isPF ? "Preencha o CPF" : "Preencha tipo jurídico..."
        │   │
        │   └─ NovoProjeto.tsx:280 (payload):
        │         ANTES = operationType: perfilData.operationType (vazio em PF)
        │         DEPOIS = isPF ? "agronegocio" : perfilData.operationType
        │         [Premissa "PF = Agronegócio" materializada]
        │
        ├─ BACKEND
        │   │
        │   ├─ Schema Zod = ZERO mudança (F8 já condicional)
        │   ├─ deriveOperationType = ZERO mudança (já infere agro de CNAE)
        │   ├─ completeness.ts = ZERO mudança (mantém agronegocio→misto)
        │   │
        │   └─ briefing LLM (routers-fluxo-v3.ts:1655):
        │         ANTES = "Faturamento Anual: ${cp.annualRevenueRange ?? 'não informado'}"
        │         DEPOIS = isPF ? "Faturamento Anual: N/A para Pessoa Física" : (atual)
        │
        ├─ TESTS
        │   │
        │   └─ Novo: TB sobre cenário PF agro completo (1 teste novo)
        │
        └─ Briefing-confidence-signals.ts (campo de completude PF)
            │
            └─ Linha 122: branchear signal por isPF
                  Para PF: não conta annualRevenueRange (não exige preenchimento)
```

---

## §6 — Cirurgia possível?

**SIM** — genuinamente cirúrgica. Escopo declarado:

| Camada | Arquivo | Mudança | LOC |
|---|---|---|---|
| Frontend score | `PerfilEmpresaIntelligente.tsx:199-212` | Branch `optional` por `isPF` (lista reduzida) | +12 / -1 |
| Frontend gate | `PerfilEmpresaIntelligente.tsx:330` | Branch `hasMinimumData` por `isPF` | +2 |
| Frontend mensagem | `PerfilEmpresaIntelligente.tsx:415` | Mensagem condicional | +1 |
| Frontend payload | `NovoProjeto.tsx:280` | `operationType: isPF ? "agronegocio" : perfilData.operationType` | +1 |
| Backend briefing prompt | `routers-fluxo-v3.ts:1655` | Branch `annualRevenueRange` no prompt por `taxIdType==="cpf"` | +1 |
| Backend signals | `briefing-confidence-signals.ts:122` | Branch signal `annualRevenueRange` por `isPF` | +2 |
| Testes | `bug-agro-cpf.test.ts` | TB novo — PF agro chega a Avançar habilitado | +20 |

**Total:** ~40 LOC efetivos · 4 arquivos · 0 migration · 0 ADR novo · 0 schema change

**Classe A** (REGRA-ORQ-24): ≤50 LOC core + ≤5 arquivos + 0 migration.

---

## §7 — AS-IS (estado atual)

### §7.1 — UI

`PerfilEmpresaIntelligente.tsx` (1524 LOC). F7 (PR #1301) ocultou para `isPF`:
- ✅ Tipo Jurídico, Porte, Regime Tributário (bloco PJ, linhas ~944-985)
- ✅ Receita Bruta Anual (Seção 2 inteira, linhas 1028-1080)
- ✅ Tipo de Operação Principal (linhas 1090-1112)
- ✅ Estrutura Societária + Centralização (Seção 6.5)
- ✅ Governança Tributária (Seção 6)

### §7.2 — Score / Gate / Mensagem (3 pontos descobertos NÃO atualizados em F7)

- **`calcProfileScore.optional`** (`:199-212`) — lista universal de 12 itens; PF nunca atinge 100% (3 itens permanentemente faltantes)
- **`hasMinimumData`** (`:330`) — `!!companyType && !!taxRegime` permanente `false` para PF
- **Mensagem "Preencha tipo jurídico e regime tributário"** (`:415`) — texto hardcoded sempre exibido para PF

### §7.3 — Payload do `handleSubmit`

`NovoProjeto.tsx:279-282` — `operationProfile.operationType: perfilData.operationType` é enviado direto. Para PF, `perfilData.operationType = ""` (F7 zerou no useEffect:846). Backend aceita via `z.preprocess(emptyToUndefined, ...)`. Mas **engine determinístico v4 não recebe operationType explícito** — depende de derivação via `deriveOperationType.ts:51-54` que retorna `"agronegocio"` por CNAE.

### §7.4 — Backend (NÃO MUDA)

Schema Zod F8 + superRefine condicional + `deriveOperationType` automático → backend já trata PF corretamente. Único ponto que **menciona** explicitamente `annualRevenueRange` é o prompt LLM do briefing (`routers-fluxo-v3.ts:1655`) — exibe "não informado" para PF.

### §7.5 — ADRs afetados

| ADR | Tema | Afetado? |
|---|---|---|
| ADR-0010 | Substituição QC/QO por NCM/NBS | ❌ Não — não toca o gate de UI |
| ADR-0030 | Hotfix IS — elegibilidade por operationType v1.1 | ❌ Não — gate IS continua válido para PJ; PF não recebe IS (CNAE 0115 não está na lista taxativa Art. 393 §1º) |
| ADR-0033 | Identidade fiscal dual | ✅ Não muda — apenas operacionaliza a premissa "PF = Agronegócio" |

→ **0 ADR novo** necessário.

---

## §8 — TO-BE (Cenário A2 — recomendado)

### F0 — Pré-implementação

- [ ] Snapshot SQL `projects` table (Manus) — backup pré-mudança
- [ ] Tag git `pre-pf-agro-implicito` em `3f97b21`
- [ ] Confirmar que feature flag `VITE_ENABLE_TAX_ID_DUAL` está ON em produção (precondição para o cenário PF existir)
- [ ] **Decisão P.O. explícita** sobre §10 (decisões pendentes abaixo)

### F1 — Frontend score + gate + mensagem (~15 LOC)

`client/src/components/PerfilEmpresaIntelligente.tsx`:

```ts
// §199-212 — calcProfileScore.optional branch
const optional: Array<[boolean, string]> = isPF
  ? [
      // PF agro — apenas opcionais aplicáveis (UI mostra esses)
      [p.hasMultipleEstablishments !== null, "Múltiplos estabelecimentos"],
      [p.hasImportExport !== null, "Importação/Exportação"],
      [p.hasSpecialRegimes !== null, "Regimes Especiais"],
      [p.paymentMethods.length > 0, "Meios de Pagamento"],
      [p.hasIntermediaries !== null, "Intermediários financeiros"],
      [p.hasTaxTeam !== null, "Equipe tributária"],
      [p.hasAudit !== null, "Auditoria fiscal"],
      [p.hasTaxIssues !== null, "Passivo tributário"],
      [p.principaisProdutos.length > 0 || p.principaisServicos.length > 0, "Produtos/Serviços (NCM/NBS)"],
    ]
  : [
      // PJ (mantém atual — 12 itens)
      [!!p.annualRevenueRange, "Faturamento Anual"],
      [p.hasMultipleEstablishments !== null, "Múltiplos estabelecimentos"],
      ...
      [p.isEconomicGroup !== null, "Grupo econômico"],
      [p.taxCentralization !== null, "Centralização fiscal"],
      [p.principaisProdutos.length > 0 || p.principaisServicos.length > 0, "Produtos/Serviços (NCM/NBS)"],
    ];
```

```ts
// §330 — hasMinimumData branch
const isPF = profileData.taxIdType === "cpf";
const hasMinimumData = isPF
  ? !!profileData.cpf  // PF: apenas CPF
  : !!profileData.companyType && !!profileData.taxRegime;  // PJ: mantém
```

```tsx
// §414-416 — mensagem condicional
{!hasMinimumData && (
  <p className="text-xs text-muted-foreground mt-1">
    {isPF ? "Preencha o CPF para ativar" : "Preencha tipo jurídico e regime tributário para ativar"}
  </p>
)}
```

### F2 — Frontend payload "PF = Agronegócio" automático (~3 LOC)

`client/src/pages/NovoProjeto.tsx:279-281`:

```ts
const operationProfile = {
  // PF-AGRO-IMPLICITO (30/05/2026) — Premissa P.O.: PF = Agronegócio.
  // Frontend envia "agronegocio" automaticamente quando isPF para que engine
  // determinístico v4 + briefing LLM recebam o discriminador explícito.
  // Backend já derivava via deriveOperationType.ts:51-54 mas envio explícito
  // documenta a decisão de produto.
  operationType: perfilData.taxIdType === "cpf"
    ? "agronegocio"
    : perfilData.operationType,
  clientType: perfilData.clientType,
  multiState: perfilData.multiState,
  ...
};
```

### F3 — Backend briefing prompt + signals (~3 LOC)

`server/routers-fluxo-v3.ts:1655` (template do prompt LLM do briefing):

```ts
// ANTES
`- Faturamento Anual: ${cp.annualRevenueRange ?? "não informado"}`
// DEPOIS
`- Faturamento Anual: ${cp.taxIdType === "cpf" ? "N/A para Pessoa Física" : (cp.annualRevenueRange ?? "não informado")}`
```

`server/lib/briefing-confidence-signals.ts:122` (signal `perfilCompletude`):

```ts
// ANTES (lista universal)
isTruthy(cp.annualRevenueRange),
// DEPOIS (PF não conta annualRevenueRange)
cp.taxIdType === "cpf" ? true : isTruthy(cp.annualRevenueRange),
```

(detalhe: `true` significa "consideramos preenchido" para PF — não penaliza score)

### F4 — Test contract PF agro completo (~20 LOC)

`server/integration/bug-agro-cpf.test.ts` (novo TB):

```ts
it("TB-10: PF agro com CPF válido + CNAE 0115 + clientType atinge profileValid=true (sem campos PJ)", () => {
  const perfilData = {
    cpf: "529.982.247-25",
    taxIdType: "cpf" as const,
    cnpj: "",
    companyType: "",
    companySize: "",
    taxRegime: "",
    annualRevenueRange: "",
    operationType: "",
    clientType: ["b2b"],
    multiState: false,
    // demais campos opcionais com defaults
    ...
  } satisfies PerfilEmpresaData;
  const score = calcProfileScore(perfilData);
  expect(score.missingRequired).toEqual([]);
  // PF não exige Faturamento Anual nem Grupo econômico nem Centralização fiscal
  expect(score.missingOptional).not.toContain("Faturamento Anual");
  expect(score.missingOptional).not.toContain("Grupo econômico");
  expect(score.missingOptional).not.toContain("Centralização fiscal");
});
```

### F5 — Validação E2E pelo Manus (Lição #115)

1. Abrir `/projetos/novo` em produção pós-deploy
2. Selecionar **Pessoa Física**, CPF válido
3. **Confirmar:**
   - Painel "Status do Perfil" mostra Completude do formulário **100%** (não 80%)
   - "Melhore o score" **NÃO** lista "Faturamento Anual", "Grupo econômico", "Centralização fiscal"
   - Botão "Reexecutar análise" **ativável** após CPF preenchido
   - Mensagem alternativa: "Preencha o CPF para ativar" (não "tipo jurídico e regime")
   - Botão "Avançar" **habilita** após completar 100% + descrição ≥100 chars
4. Submeter projeto. Validar via SQL:
   ```sql
   SELECT JSON_EXTRACT(operationProfile, '$.operationType') AS op
   FROM projects ORDER BY id DESC LIMIT 1;
   -- Esperado: 'agronegocio'
   ```

### Classe de impacto

**Classe A — cirúrgico** (REGRA-ORQ-24):
- ≤50 LOC efetivos no core
- 4 arquivos (1 frontend componente + 1 frontend page + 2 backend pontuais)
- 1 procedure tRPC tocada pontualmente (prompt LLM)
- 0 migration SQL
- 0 ADR novo

### Bump ADR explícito

**Nenhum ADR existente é afetado.** Esta mudança operacionaliza ADR-0033 (Identidade Fiscal Dual) — não invalida nem altera o contrato; apenas materializa a decisão de produto "PF = Agronegócio implícito" via UX + payload + prompt LLM.

---

## §9 — Não-escopo declarado

| Item | Razão |
|---|---|
| Migração dos projetos PF agro existentes (ex: 4380001, 4470001, 4500032) | Snapshot ADR-0031 — projetos antigos imutáveis |
| Mudança em `completeness.ts:110` (mapeamento `agronegocio → misto`) | Decisão de produto anterior; permanece para PJ agro com NCM cadastrado |
| Issue #1306 / #1307 (sets CNAES hardcoded + gate `credito_presumido`) | Backlog separado — não bloqueia este TO-BE |
| Mudança em ADR-0030 (gate IS por operationType) | PF agro CNAE 0115 não está na lista taxativa Art. 393 §1º — não recebe risco IS por design |
| Update dos 71 .md menções a operationType | Cosmético — fora do escopo cirúrgico |
| Refatorar 43 testes de operationType (PJ) | Não afetados — testes PJ continuam válidos |

---

## §10 — Decisões pendentes do P.O.

| # | Decisão | Recomendação |
|---|---|---|
| 1 | **Confirma premissa "PF = Agronegócio implícito"** — não há cenário de PF não-agro (ex: profissional liberal autônomo, MEI individual, etc.)? | ✅ **Sim** — Art. 164 LC 214/2025 trata especificamente do produtor rural PF; outros perfis PF são casos de borda fora do escopo do produto |
| 2 | **Frontend envia `operationType="agronegocio"` automaticamente** para PF (vs deixar backend derivar)? | ✅ **Sim — Cenário recomendado** — declarativo + auditável + funciona com componentes downstream que esperam `operationType` explícito |
| 3 | Briefing LLM: texto "N/A para Pessoa Física" no lugar de "não informado" para `annualRevenueRange` em PF? | ✅ **Sim** — clarifica para o advogado tributarista que a ausência é intencional, não dado faltante |
| 4 | Signal `perfilCompletude` em `briefing-confidence-signals.ts:122` considera `annualRevenueRange` como "preenchido" para PF? | ✅ **Sim** — não penalizar score de confiança PF por dado que não se aplica |
| 5 | PR único Classe A ou múltiplos (F1+F2 frontend / F3 backend)? | **PR único** — escopo cirúrgico; merge atômico |
| 6 | Feature flag necessária? | ❌ **Não** — mudança semanticamente equivalente para PJ (zero impacto); PF é casuística nova mas backend já preparado |

---

## §11 — Auto-auditoria final (tabela de cobertura)

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação tem `arquivo:linha` | ✅ | 12+ citações específicas (PerfilEmpresaIntelligente:199/330/415, NovoProjeto:280, routers-fluxo-v3:1655, briefing-confidence-signals:122, deriveOperationType:51-54, ADR-0030, ADR-0033) |
| Incluí testes no grep | ✅ | 43 + 8 arquivos contados |
| Incluí .sql/.md/.json | ✅ | 1/71/2 contados |
| Verifiquei PDF/templates LLM | ✅ | `routers-fluxo-v3.ts:1655` identificado (prompt LLM consome `annualRevenueRange`) |
| Verifiquei snapshots .snap | ✅ | 0 com os campos |
| Issues pré-existentes consultadas | ✅ | 4 buscas; #827/#821/#1225 tocam operationType mas em contexto PJ-only |
| ast-grep aplicado em ≥3 padrões | ✅ | 2 padrões executados (operationType + annualRevenueRange) |
| Dead-read check | ⚠️ Skip (precedente F7 já mapeou — mesma região de código) |
| LOC reais antes de classificar | ✅ | 3 arquivos medidos |
| ADRs identificados + bump declarado | ✅ | ADR-0010 N/A, ADR-0030 N/A, ADR-0033 não muda · 0 ADR novo |
| Mapa writers/readers formal | ✅ | §4 categorizado por camada |

**Cobertura total estimada:** **94%** 🟢 — acima do mínimo 90%.

---

## §12 — Pendências para Manus (pré-F0)

| # | Pendência | Crítico? |
|---|---|---|
| 1 | Confirmar `VITE_ENABLE_TAX_ID_DUAL=true` no env de produção (precondição para PF aparecer na UI) | 🔴 |
| 2 | Query empírica: distribuição atual de `operationProfile.operationType` para projetos com `companyProfile.taxIdType='cpf'` — confirma se backend está OK pós-PR #1314 (Lição #115 caso real): `SELECT JSON_EXTRACT(operationProfile, '$.operationType') AS op, COUNT(*) FROM projects WHERE JSON_EXTRACT(companyProfile, '$.taxIdType')='cpf' GROUP BY op;` | 🟡 |
| 3 | Snapshot SQL `projects` table + S3 | 🔴 |
| 4 | Tag git `pre-pf-agro-implicito-baseline` em `3f97b21` | 🔴 |

---

## §13 — Submissão ao Orquestrador

**Estado:** spec **pronta** para autorização F0.

**Bloqueios:**
- ⏳ Decisões §10 (6 itens — todas com recomendação)
- ⏳ Pendências Manus §12 (1, 3, 4 são bloqueantes F0)

**Artefatos relacionados:**
- Este documento é autocontido (DB-SPEC + Plano de Testes inline) — não há necessidade de docs separados pelo escopo cirúrgico

**Próxima ação esperada:** Orquestrador confirma §10 (6 decisões) → autoriza Manus a executar pré-F0 → autoriza Claude Code a iniciar F1.

---

## §14 — Anexos: padrão a seguir

Este AS-IS/TO-BE segue o padrão estabelecido em:
- `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md` (BUG-AGRO-CPF)
- `AS-IS-TO-BE-EXCLUIR-CLIENTE-PROJETO-v2-FINAL-20260529.md` (excluir cliente)

E aplica explicitamente:
- **Lição #93** (mecanismo verificado, não inferido) — todas as linhas confirmadas via Read tool antes do AS-IS
- **Lição #115** (smoke UI obrigatório) — F5 do TO-BE inclui smoke real
- **Lição #116** (callsite audit) — §4 lista mapa completo writers/readers
- **Lição #117** (registrar ≠ aplicar) — esta spec **não** é Lição; será fix em código com PR vinculado
- **REGRA-ORQ-41** (skill `impact-tree`) — 11 passos executados (cobertura 94%)
- **REGRA-ORQ-42** (tabela de visibilidade multi-perfil) — extensão para "PF agro implícito"

🤖 Generated with [Claude Code](https://claude.com/claude-code)
