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

## (Outros itens backlog M3 a registrar em sessões futuras)

- Drift arquitetural Manus.space (cherry-pick → pull origin/main)
- Expansão NBS dataset (19 entradas → catálogo completo)
- WebSocket Cloud Run config (socket.io errors)
- 222 mocks quebrados (sprint manutenção)
