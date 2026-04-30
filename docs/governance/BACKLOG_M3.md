# Backlog M3 — Sprint Dedicada Futura

Backlog estruturado de itens identificados em sessões anteriores que requerem sprint dedicada por classe de impacto, dependências, ou escopo Classe C.

## PR-G — Fix UX bug PC-04 tela branca pós-erro NCM/NBS

**Severidade:** UX cosmético (não-funcional)
**Detectado:** Smoke R3-A 2026-04-30 Cenários 3+4
**Análise técnica:** Manus 2026-04-30 (Opção B2 — backend + frontend)
**Classificação:** Classe C (>500 LOC, 9 arquivos, ~13h estimado)
**Decisão P.O. 2026-04-30:** adiar para sprint M3 dedicada (Opção B aprovada)

### Justificativa do adiamento

- Smoke R3-A 5/5 PASS validou bloqueio funcional correto
- CTA permanece bloqueado quando NCM/NBS inválido
- archetype permanece NULL nos negativos (persistência limpa)
- Status DB não transita para `perfil_entidade_confirmado`
- Step 4 efetivo (rollout flag global) não depende deste fix
- Implementar agora violaria REGRA-ORQ-24 (Classe C exige ADR + SPEC formal)

### Pré-requisitos para implementação

1. **SPEC formal source-controlled:** `docs/governance/SPEC_PR_G_PC04_FIX_OPCAO_B.md`
   - Validar empiricamente engine `buildSnapshot` aceita seed com NCM inválido
   - Definir semântica blocker `HARD_BLOCK` vs `BAD_REQUEST` vs V-LC-*
   - CNAE_INVALID UX path (campo não existe em /perfil-entidade — qual fluxo?)
   - Cache tRPC invalidation strategy após user fixar NCM
2. Crítica SPEC em 3 níveis (REGRA-ORQ-22)
3. ADR registrado (REGRA-ORQ-24 Classe C)

### Escopo técnico (preliminar — Manus 2026-04-30)

| Arquivo | Mudança | LOC estimado |
|---|---|---|
| `server/lib/archetype/validateM1Input.ts` | Refactor 5 throws → blockers | ~80 |
| `server/routers/perfil.ts` (build + confirm) | 2 callsites | ~30 |
| **`server/routers-m1-monitor.ts:143`** | **Caller adicional** (esquecido em diagnóstico inicial) | ~20 |
| `server/hotfix-p0-input-gate-2026-04-28.test.ts` | 28 testes refactor | ~150 |
| `server/hotfix-suite-ncm-truncado-2026-04-28.test.ts` | 9 testes refactor | ~80 |
| `server/m2-integration.test.ts` | 2 testes | ~30 |
| `server/perfil-router.test.ts` | 3 testes refactor + T58-T61 novos | ~80 |
| `client/src/pages/ConfirmacaoPerfil.tsx` | UX dual (perfil parcial + erro inline) | ~80 |
| `client/src/pages/ConfirmacaoPerfil.test.ts` | +3 cases | ~50 |
| **Total** | **9 arquivos** | **~600 LOC** |

### Sprint dedicada estruturada

1. Sessão Manus: produzir SPEC formal + PR docs-only (Classe A) → merge
2. Sessão Orquestrador + Claude Code: crítica ORQ-22 em 3 níveis sobre SPEC
3. Sessão Claude Code: implementar PR-G após SPEC aprovada
4. Sessão Manus: smoke negativo final (NCM truncado / NBS no NCM) com perfil parcial visível
5. Verificação cross-browser (Chrome / Firefox / Safari)

### Não bloqueia

- Step 4 efetivo (rollout flag global M2)
- PR-F (BUG-4 financeiro V-LC-607)
- Cleanup retroativo Issue #875
- Issue #873 isolamento CI

### Pontos técnicos críticos a resolver na SPEC

1. **Engine compatibility:** `buildSnapshot` aceita seed com NCM inválido sem lançar?
   - Verificar: `derivePapel`, `deriveRegime`, `deriveTipoDeRelacao`, `deriveTerritorio`
   - Verificar: `deriveTipoObjetoEconomico` consulta NCM dataset?

2. **Semântica blocker `NCM_INVALID_FORMAT`:**
   - Adicionar à lista canônica de blockers do engine
   - Diferenciar de V-LC-* (regras de coerência) e V-10-* (informativos)

3. **Caller `routers-m1-monitor.ts:143` (M1 admin):**
   - Atualmente espera `validateM1Seed` lançar
   - Mudar para inspecionar `result.valid`/`result.blockers`
   - Sem regressão em fluxo /admin/m1-perfil

4. **CNAE_INVALID UX:**
   - /perfil-entidade não tem campo CNAE
   - Caminho proposto: redirect para /projetos/<id>/cnaes-confirmados com banner
   - OU: bloquear /perfil-entidade upstream quando CNAE inválido detectado

5. **Cache tRPC invalidation:**
   - Após user corrigir NCM em outra tela (ex: editar projeto)
   - `perfilBuild` deve invalidar e re-fetch
   - `useQuery` retry strategy

### Vinculadas

- Análise Manus 2026-04-30 (`docs/governance/SPEC_PR_G_PC04_FIX_OPCAO_B_2026-04-30.md` untracked)
- REGRA-ORQ-22 (crítica em 3 níveis)
- REGRA-ORQ-24 (Classe C governance)
- REGRA-ORQ-26 (branch obrigatória)
- Smoke R3-A Cenários 3+4 (evidência empírica do bug)

---

## PR-H — Fix 3 bugs latentes ALTOS adapter buildSeedFromProject

**Severidade:** Qualidade (não bloqueador funcional)
**Detectado:** Auditoria T4 paralela 2026-04-30 (Claude Code)
**Bugs cobertos:**
- BUG-5: `abrangencia_operacional` hardcoded `["Nacional"]` (afeta empresas regionais/UF única)
- BUG-6: `atua_importacao` hardcoded `false` (afeta importadores CNAE 4632/4623)
- BUG-7: `atua_exportacao` hardcoded `false` (afeta exportadores CNAE 4632/4623)

**Classificação:** Classe C (>500 LOC com decisão de produto, ~10-13h)
**Decisão P.O. 2026-04-30:** sprint M3 dedicada (não pré-step 4)

### Justificativa do adiamento

Engine produz fallback gracioso (não crash, não HARD_BLOCK). Smoke R3-A 5/5 PASS validou path principal. Fix completo requer decisão de produto (UX form vs whitelist CNAE), não fix puro adapter como BUG-1/2/3/4 anteriores. Step 4 não bloqueado.

### Decisão de produto necessária pré-implementação

| Opção | Trade-off |
|---|---|
| Adicionar perguntas no form M2 (UF atendimento + atua import/export) | UX change, mais preciso, ~13h |
| Whitelist CNAE para import/export (4632, 4623, etc.) | Fix puro adapter, ~6h, heurística pode errar |
| Híbrido: form + whitelist como fallback | ~10h, mais robusto |

P.O. decide pré-implementação.

### Pré-requisitos para implementação

1. **SPEC formal source-controlled:** `docs/governance/SPEC_PR_H_BUGS_LATENTES.md`
   - Decisão de produto formalizada
   - Engine compatibility com novos campos
   - Estratégia de migração de projetos existentes (com `abrangencia_operacional=["Nacional"]` legacy)
   - Form schema update (se Opção 1 ou 3)
2. Crítica SPEC em 3 níveis (REGRA-ORQ-22)
3. ADR registrado (REGRA-ORQ-24 Classe C)

### Escopo técnico (preliminar — sujeito a SPEC formal)

| Arquivo | Mudança | LOC estimado |
|---|---|---|
| `server/routers/perfil.ts` (`buildSeedFromProject`) | Mapeamento campos | ~30 |
| `server/routers-m1-monitor.ts` (caller) | Atualização | ~20 |
| `client/src/pages/PerfilEmpresaIntelligente.tsx` (form) | Novos campos UF + import/export (se Opção 1) | ~80 |
| `drizzle/schema.ts` | Novos campos `companyProfile.uf_atendimento`, `operationProfile.atua_importacao/exportacao` | ~15 |
| Migration | Schema update + backfill | ~30 |
| `server/perfil-router.test.ts` | T62-T70 (3 bugs × 3 cenários) | ~120 |
| Tests engine | Cobertura completa território + import/export | ~80 |
| **Total estimado** | **7 arquivos** | **~375 LOC + decisão produto** |

### Não bloqueia

- Step 4 efetivo (rollout flag global M2)
- PR-G PC-04 (já adiado para M3 também)

---

## PR-I — Fix campos médios (regime especial + ZFM)

**Severidade:** Qualidade (casos edge)
**Bugs cobertos:**
- `opera_territorio_incentivado` (ZFM, ZPE, áreas incentivadas)
- `tipo_territorio_incentivado` (dependente)
- `possui_regime_especial_negocio` (deriveRegime casos especiais)
- `tipo_regime_especial` (dependente)
- `papel_comercio_exterior` (dependente de PR-H)

**Classificação:** Classe B (~4h)
**Sprint:** M3 pós-PR-H

---

## PR-J — Refactor arquitetural seedNormalizers compartilhado

**Severidade:** Estrutural — endereça lição arquitetural #32
**Objetivo:** extrair `seedNormalizers.ts` compartilhado entre `routers/perfil.ts` e `routers-m1-monitor.ts`

Hoje os dois caminhos duplicam lógica de normalização (PR-D fixou m1-monitor, PR-A escreveu perfil-router separadamente, sequência de bugs em adapter resultou). Refactor estrutural elimina classe inteira de bugs futuros.

**Classificação:** Classe A-B (~3h)
**Sprint:** M3 pós-PR-H/PR-I

---

## Smoke regressivo M3 — Cenários 8-10

Após PR-H + PR-I + PR-J mergeados, adicionar ao smoke:

| # | Cenário | Setor/Caso | CNAE de referência |
|---|---|---|---|
| 8 | Importador | comércio importador | 4632-0/01 (atacado de gêneros alim. importados) |
| 9 | Exportador | comércio exportador | 4623-1/06 (atacado exportador agrícola) |
| 10 | Empresa estadual única | regional/UF única | qualquer + UF restrita |

**Sprint:** M3 pós-PR-H/PR-I/PR-J

### Vinculadas (PR-H/I/J + Smokes)

- Auditoria T4 paralela 2026-04-30 (Claude Code, documento `/tmp/T4_AUDITORIA_5O_BUG.md` untracked)
- Lição arquitetural #32 (adapter sem cobertura completa)
- Lição arquitetural #39 (spec sub-dimensionado leva a Classe C)
- REGRA-ORQ-22, REGRA-ORQ-24, REGRA-ORQ-26

---

## (Outros itens backlog M3 a registrar em sessões futuras)

- Drift arquitetural Manus.space (cherry-pick → pull origin/main)
- Expansão NBS dataset (19 entradas → catálogo completo)
- WebSocket Cloud Run config (socket.io errors)
- 222 mocks quebrados (sprint manutenção)
