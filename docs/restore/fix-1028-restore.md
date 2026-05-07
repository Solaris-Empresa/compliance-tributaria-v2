# Restore Guide — Fix Issue #1028

## Contexto

**Issue:** [#1028 — Q.CNAE dinâmico nunca executa](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/1028)
**Causa raiz confirmada:** PR #1012 (mergeado 2026-05-07T15:12:33Z) substituiu `QuestionarioCNAE` (auto-render) por `QuestionarioV3` (clique manual) na rota `/projetos/:id/questionario-cnae` sem preservar auto-start.
**Decisão P.O. (2026-05-07 17:54 BRT):** Opção C — Auto-start frontend + Gate hard server-side.

## Branches e SHAs

| Item | Valor |
|---|---|
| Branch de backup (snapshot pristine) | `backup/pre-fix-1028-20260507-1758` |
| HEAD do backup | `2f122ce7303e6dfed4dca7b68a01b5ca85a523dd` |
| Branch de trabalho FASE 1 | `fix/1028-frontend-auto-start` |
| Origin/main no momento do backup | `2f122ce7303e6dfed4dca7b68a01b5ca85a523dd` |

## Arquivos modificados (esperados após Fases 1 + 2 + 4)

- `client/src/pages/QuestionarioV3.tsx` (linhas ~813 e ~555 — FASE 1)
- `client/src/App.tsx` (linhas 135 e 141 removidas — FASE 4)
- `server/routers-fluxo-v3.ts` (`generateBriefing` — FASE 2)
- `client/src/pages/QuestionarioCNAE.tsx` (deletado — FASE 4)
- `docs/restore/fix-1028-restore.md` (este arquivo — FASE 0)

## Procedimento de restore completo

```bash
# Restaura todos os arquivos modificados ao estado pré-fix
git checkout backup/pre-fix-1028-20260507-1758 -- \
  client/src/pages/QuestionarioV3.tsx \
  client/src/App.tsx \
  server/routers-fluxo-v3.ts

# Restaurar QuestionarioCNAE.tsx (caso já tenha sido deletado em FASE 4)
git checkout backup/pre-fix-1028-20260507-1758 -- \
  client/src/pages/QuestionarioCNAE.tsx

# Validar
pnpm tsc --noEmit
pnpm test:unit
```

## Restore parcial — só FASE 1 (frontend auto-start)

```bash
git checkout backup/pre-fix-1028-20260507-1758 -- \
  client/src/pages/QuestionarioV3.tsx
```

## Restore parcial — só FASE 2 (backend gate)

```bash
git checkout backup/pre-fix-1028-20260507-1758 -- \
  server/routers-fluxo-v3.ts
```

## Restore parcial — só FASE 4 (legacy)

```bash
git checkout backup/pre-fix-1028-20260507-1758 -- \
  client/src/App.tsx \
  client/src/pages/QuestionarioCNAE.tsx
```

## Critério para acionar restore

Acionar **imediatamente** se qualquer um:

- `questionnaireQuestionsCache` continua = 0 após 10 projetos novos pós-deploy
- `generateBriefing` retornando `PRECONDITION_FAILED` para projetos válidos com Q.CNAE completo (falso positivo do gate)
- Erro de compilação TypeScript após remoção do legacy (FASE 4)
- Crash em produção do componente `QuestionarioV3` por race condition do `setTimeout` escalonado
- Custo LLM disparou >10x o baseline pré-fix (auto-start cego)

## Cópias .bak locais (gitignored — não persistem em PR)

Tirar `.bak` antes de commit; existem apenas no working tree do dev:

- `client/src/pages/QuestionarioV3.tsx.bak`
- `client/src/App.tsx.bak`
- `server/routers-fluxo-v3.ts.bak`
- `client/src/pages/QuestionarioCNAE.tsx.bak`

## DELETE de 118 projetos (FASE 3)

**Autorizado pelo P.O. em 2026-05-07 17:54 BRT.** Manus executa SQL em sequência STEPs 1→2→3→4.

Restore do DELETE **não é possível via git** (operação em DB). Backup do DB é responsabilidade de infraestrutura — fora do escopo deste guia.

## Contato e referências

- Issue: [#1028](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/1028)
- PR de regressão: [#1012](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/1012)
- P.O. autorizou em: 2026-05-07 17:54 BRT
- Plano de execução: 4 fases sequenciais (0 → 1 → 2 → 3 → 4)
- REGRA-ORQ-28: Artefato 1 (issue spec) sim; Artefatos 2+3 backlog pós-fix
