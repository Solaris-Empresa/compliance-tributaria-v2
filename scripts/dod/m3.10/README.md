# scripts/dod/m3.10/ — DoD Multi-Fonte (Sprint M3.10)

Scripts de validação DoD (Definition of Done) para o pipeline multi-fonte da Sprint M3.10. Estabelecem o pattern canônico da **Lição #71** (autor valida o parser) e da **Lição #72** (mysql2 auto-parseia JSON — não usar `JSON.parse`).

## Conteúdo

| Arquivo | Função |
|---|---|
| `safe-parse-json-column.ts` | Helper canônico — parse defensivo de coluna JSON do TiDB/MySQL |
| `safe-parse-json-column.test.ts` | Test unit do helper (9 cenários cobrindo o caso canônico do bug) |
| `dod-multi-fonte-template.ts` | Template de DoD reproduzindo Q1 (agregado) + Q2 (por risco) do audit v7.64 |
| `dod-multi-fonte-template.test.ts` | Test unit de `formatReport` (3 cenários: vazio, mono, multi) |
| `README.md` | Este arquivo |

## Status (issue #987)

- [x] Helper `safeParseJsonColumn` commitado e testado (9/9 unit tests PASS)
- [x] Template DoD multi-fonte criado e validado em runtime (CLI args + formatReport unit-tested; **integração com TiDB ainda não exercitada end-to-end** — depende de DATABASE_URL real)
- [ ] Scripts originais Manus exportados (`dod-3780001.ts`, `dod-queries-3750060.ts`, `inspect-all-risks-3780001.ts`, `evidence-format-proof.ts`) — **bloqueado: dependem de Manus exportar da sandbox**
- [ ] Audit v7.64 atualizado substituindo "não commitado" por path real — **bloqueado: depende do anterior**

## Como reproduzir Q1 e Q2 (audit v7.64)

```bash
# Exportar DATABASE_URL do TiDB (produção ou staging)
export DATABASE_URL="mysql://user:pass@host:port/db"

# Rodar DoD em projeto específico
npx tsx scripts/dod/m3.10/dod-multi-fonte-template.ts 3780001

# Exit codes:
#   0 — DoD PASS (agregado >=2 fontes E pelo menos 1 risco multi-fonte)
#   1 — DoD FAIL (algum critério não atendido)
#   2 — Erro de execução (DB unreachable, projectId inválido, etc.)
```

## Pattern canônico (Lição #72)

Coluna JSON do TiDB lida via `mysql2` retorna **objeto JS já parseado** (não string). Aplicar `JSON.parse()` sobre o objeto invoca `Object.prototype.toString()` → `"[object Object]"` → `JSON.parse("[object Object]")` lança `SyntaxError`. Em try/catch silencioso, o erro é absorvido e o valor cai em fallback (`[]`/`{}`) — falso negativo.

### ❌ Antipattern (causa raiz do bug Sprint M3.10)

```typescript
const ev = JSON.parse(row.evidence || '{}');  // throws em objeto, catch silencia, fontes=[]
```

### ✅ Pattern correto (este helper)

```typescript
import { safeParseJsonColumn } from "./safe-parse-json-column";

const ev = safeParseJsonColumn<{ gaps: Gap[] }>(row.evidence, { gaps: [] });
```

## Pattern de validação do parser (Lição #71)

Todo script DoD que consome dados estruturados (JSON, CSV, output de query) DEVE:

1. **Ser commitado** ao repositório (não ficar em sandbox)
2. **Ter teste unitário do parser** (caso canônico: `safe-parse-json-column.test.ts`)
3. **Ser executado pelo autor com validação cruzada** antes de reportar PASS/FAIL

Quando o autor do script é também o validador da implementação (RACI overlap), commitar + testar parser é a **salvaguarda residual**.

## Vinculadas

- Audit `docs/governance/audits/v7.64-2026-05-05-audit-m3.10-multi-fonte.md`
- Lição #71 (`.claude/rules/governance.md`) — scripts DoD commitados + autor valida parser
- Lição #72 (`.claude/rules/governance.md`) — mysql2 auto-parse JSON antipattern
- PR #983 (M3.10 governance closure)
- Issue #987 (recuperação dos scripts DoD)
- PR #979 (Fix C-bis — multi-fonte UI)

## CI gate sugerido (futuro — INV-08)

Lição #72 propõe gate em `.github/workflows/invariant-check.yml`:

```bash
grep -rnE "JSON\.parse\(\s*row\.(evidence|gaps|metadata|profile|payload)" \
  scripts/ server/ --include="*.ts" --include="*.tsx" \
  | grep -v "test\|\.d\.ts"
# match > 0 → FAIL
```

Não implementado neste PR — backlog para sprint M3.11+ (issue separada se priorizado).
