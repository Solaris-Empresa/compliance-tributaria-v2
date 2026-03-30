## Objetivo

Sprint L — 3 fases em 1 PR:
1. **Upload CSV RAG** (Issue #191 / G16): skeleton funcional com validação e dry-run
2. **Cockpit RAG evoluído**: 3 novas abas ao vivo (Health Score, Autores/Origem, Upload CSV)
3. **Governança de contexto definitiva**: PROTOCOLO-CONTEXTO.md + 3 skills atualizados

## Escopo da alteração

**Tipo:**
- [x] Feature
- [ ] Bugfix
- [ ] Refactor
- [ ] Migration (DB)
- [ ] Observabilidade
- [x] Governança / Docs
- [ ] Infra / CI

**Componentes afetados:**
- [x] Backend (Node / tRPC)
- [x] Frontend (React)
- [ ] Banco de dados / Schema
- [x] RAG (CNAE / requisitos) ❗
- [ ] Infraestrutura / CI
- [x] Apenas documentação

## Classificação de risco

- [x] Baixo — sem impacto em dados ou fluxo principal

**Justificativa do risco:** Nenhuma migration. Nenhuma alteração em schema. Apenas adição de novos endpoints (queries read-only) e nova página UI. Rollback trivial: reverter os 9 arquivos do commit.

## Declaração de escopo (obrigatório)

Esta PR:
- [x] NÃO altera comportamento visível ao usuário final (apenas adiciona)
- [x] NÃO toca no adaptador `getDiagnosticSource()`
- [x] NÃO impacta o domínio RAG (apenas leitura + nova UI de upload)
- [x] NÃO ativa `DIAGNOSTIC_READ_MODE=new`
- [x] NÃO executa DROP COLUMN em colunas legadas

## Arquivos alterados (escopo declarado)

| Arquivo | Tipo | Descrição |
|---|---|---|
| `client/src/pages/AdminRagUpload.tsx` | NOVO | UI de upload CSV com validação e dry-run |
| `client/public/template-rag-upload.csv` | NOVO | Template CSV oficial (7 colunas) |
| `client/src/App.tsx` | MODIFICADO | Rota `/admin/rag-upload` adicionada |
| `client/src/components/ComplianceLayout.tsx` | MODIFICADO | Link Upload CSV no menu admin |
| `client/src/pages/RagCockpit.tsx` | MODIFICADO | 3 novas abas + Sprint L no timeline |
| `server/routers/ragAdmin.ts` | MODIFICADO | getCorpusDistribution + getAuthorDistribution + getHealthScore |
| `server/ragAdmin.upload.test.ts` | NOVO | 3 testes Vitest |
| `docs/governance/PROTOCOLO-CONTEXTO.md` | NOVO | Protocolo oficial dos 3 agentes |
| `docs/BASELINE-PRODUTO.md` | MODIFICADO | v2.6 Sprint L |

## Validação executada

**Testes:**
- [x] `npx tsc --noEmit` — 0 erros
- [x] `npx vitest run server/ragAdmin.upload.test.ts` — 3/3 passando
- [x] Invariants verificados (INV-001..INV-008) — sem alteração em arquivos críticos

**Evidência estruturada (obrigatório):**
```json
{
  "sprint": "L",
  "data": "2026-03-30",
  "head_base": "b9a5502",
  "branch": "feat/sprint-l",
  "typescript_errors": 0,
  "testes_sprint_l": {
    "total": 3,
    "passando": 3,
    "arquivo": "server/ragAdmin.upload.test.ts"
  },
  "testes_baseline": 2655,
  "testes_total_estimado": 2658,
  "migrations_novas": 0,
  "schema_alterado": false,
  "diagnostic_read_mode": "shadow (inalterado)",
  "bloqueios_ativados": [],
  "arquivos_criticos_alterados": [],
  "risk_level": "low",
  "fases": {
    "fase1_upload_csv": {
      "status": "implementado",
      "arquivos": ["AdminRagUpload.tsx", "template-rag-upload.csv", "ragAdmin.upload.test.ts"],
      "issue": "#191",
      "nota": "skeleton funcional — integração backend uploadCsv existente"
    },
    "fase2_cockpit_rag": {
      "status": "implementado",
      "novas_abas": ["Health Score", "Autores/Origem", "Upload CSV"],
      "novos_endpoints": ["getCorpusDistribution", "getAuthorDistribution", "getHealthScore"],
      "refetch_interval_segundos": 60
    },
    "fase3_governanca": {
      "status": "implementado",
      "documentos": ["PROTOCOLO-CONTEXTO.md"],
      "skills_atualizados": ["solaris-contexto", "solaris-orquestracao"],
      "skills_criados": ["solaris-chatgpt"]
    }
  }
}
```

## Classificação da task

- [x] G16 — Upload CSV RAG (Issue #191) — parcial (skeleton + UI + testes)
- [x] Cockpit RAG — evolução (3 novas abas ao vivo)
- [x] Governança — PROTOCOLO-CONTEXTO.md + skills

## Próximos passos (Sprint M)

- Integração completa do upload CSV com feedback em tempo real (WebSocket)
- G11 — campo `fonte_risco` no RiskItemSchema (Issue #187)
- G15 — Arquitetura 3 ondas de perguntas (Issue #192)
- RFC-003 — Reclassificação chunks leis avulsas (Issue #189)
