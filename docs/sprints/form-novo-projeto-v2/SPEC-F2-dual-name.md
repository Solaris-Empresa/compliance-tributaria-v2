# SPEC F2 — Encanamento dual-name `hasInternationalOps` (FORM-NOVO-PROJETO-V2)

**Classe:** B · **Data:** 25/06/2026 · **HEAD base:** `825cd3f8` · **Flag:** `ENABLE_INTL_OPS_ALIGN` (server, default **OFF**)
**Independente do F3** (wizard). Gate 0 do cluster: `DESPACHO-CONSULTOR`/sessão 24-25/06.

## Decisões P.O. (fechadas) que delimitam o escopo
| ID | Decisão | Efeito na spec |
|---|---|---|
| P1 | Regulação Comitê Gestor **não publicada** | Conserta só o **encanamento**; a regra específica pluga quando a norma sair (NÃO especular o conteúdo) |
| P2 | **Só projetos novos** + base limpa | **SEM impact-tree de projetos antigos · SEM migration · SEM reprocessamento** |
| P3 | Escopo = **só `hasInternationalOps`** | `usesTaxIncentives` + `usesMarketplace` → **backlog separado** |

## 1. AS-IS — o bug dual-name (verificado)
O formulário **escreve** `taxComplexity.hasImportExport`; os engines **leem** `taxComplexity.hasInternationalOps` — **nome diferente, nunca escrito** → sempre `undefined` → regras mortas:

| Reader (engine) | Linha | Estado hoje |
|---|---|---|
| `consistencyEngine` **DET-004** (MEI × intl) | `:172` (`if (input.taxComplexity?.hasInternationalOps)`) | 🔴 nunca dispara |
| `consistencyEngine` **DET-005** (Simples × intl) | `:189` (`taxRegime==='simples_nacional' && ...hasInternationalOps`) | 🔴 nunca dispara |
| `db-requirements` tag "internacional" | `:99` (`hasInternational = taxComp.hasInternationalOps === true`) | 🔴 nunca aplica |
| limite de perguntas (+2) | `routers-fluxo-v3.ts:157` | 🔴 nunca soma |

Escritor: `NovoProjeto.tsx` → `taxComplexity = { ..., hasImportExport }`. Persistido as-is em `createProject` (`routers-fluxo-v3.ts:496` `taxComplexity: input.taxComplexity ?? null`).

## 2. TO-BE — alinhar no ESCRITOR (menor superfície), atrás de flag

**Ponto único de fix:** `createProject` em `server/routers-fluxo-v3.ts` (~`:496`, persist do `taxComplexity`). Quando `process.env.ENABLE_INTL_OPS_ALIGN === "true"`, **derivar** o nome canônico antes de persistir:

```ts
// F2 dual-name align (ENABLE_INTL_OPS_ALIGN) — deriva o nome que os engines leem
// a partir do que o form escreve. Não toca os leitores (despacho: alinhar o escritor).
function alignIntlOps(tc: any | null): any | null {
  if (!tc || process.env.ENABLE_INTL_OPS_ALIGN !== "true") return tc;
  if (tc.hasInternationalOps === undefined && tc.hasImportExport !== undefined) {
    return { ...tc, hasInternationalOps: tc.hasImportExport };
  }
  return tc;
}
// ...
taxComplexity: alignIntlOps(input.taxComplexity) ?? null,
```

**Por que aqui:**
- **Menor superfície:** 1 helper + 1 linha no único ponto de escrita. **Não espalha pelos leitores** (despacho).
- **Sem schema/migration:** o Zod do `createProject` **já aceita** `hasInternationalOps` (`routers-fluxo-v3.ts:434 z.boolean().optional()`).
- **Só projetos novos (P2):** a derivação ocorre no `createProject` → projetos antigos (base limpa) não são tocados; sem reprocessamento.
- **Flag server (rollback sem rebuild):** `ENABLE_INTL_OPS_ALIGN=false` → comportamento atual idêntico.
- **NÃO renomeia** `hasImportExport` (leitores legados — `diagnostic-consolidator:201` linha descritiva + confidence — seguem intactos; o helper **adiciona** o nome canônico, não remove o antigo).

## 3. Reativação esperada (com flag ON)
`hasImportExport=true` no form → persistido também como `hasInternationalOps=true` → **DET-004** (se `companySize==='mei'`) e **DET-005** (se `taxRegime==='simples_nacional'`) passam a disparar + tag "internacional" + (+2) perguntas.

## 4. DoD discriminante (REGRA-ORQ-44/47) — 3 casos em dado real
| Caso | Setup (flag ON) | Esperado |
|---|---|---|
| **Positivo DET-004** | MEI + `hasImportExport=true` | DET-004 presente no resultado de consistência |
| **Positivo DET-005** | Simples Nacional + `hasImportExport=true` | DET-005 presente |
| **Negativo discriminante** | `hasImportExport=false` (ou ausente) | DET-004 **e** DET-005 **ausentes** |
| **Neutro/flag OFF** | flag OFF, qualquer perfil | `hasInternationalOps` não derivado → DET-004/005 **não disparam** (= comportamento atual) |

## 5. Plano de testes (obrigatório)
- **Unit `alignIntlOps`:** flag ON + `hasImportExport=true` → retorna `hasInternationalOps=true`; flag OFF → inalterado; `hasInternationalOps` já presente → não sobrescreve.
- **Unit `consistencyEngine`:** `{hasInternationalOps:true, companySize:'mei'}` → DET-004; `{...,taxRegime:'simples_nacional'}` → DET-005; `hasInternationalOps:false` → nenhum (negativo discriminante).
- **Integração (opcional, Manus):** `createProject` (flag ON) → consistência → DET-004/005 conforme perfil.

## 6. Rollback
`ENABLE_INTL_OPS_ALIGN=false` → `alignIntlOps` retorna o input as-is → comportamento atual. Sem migration → nada a reverter no banco. Projetos criados com flag ON mantêm `hasInternationalOps` (inerte se a flag voltar OFF — só os engines deixam de receber em novos).

## 7. Fora de escopo (P3 + P1)
- ❌ `usesTaxIncentives` e `usesMarketplace` (demais campos do cluster) → **backlog separado**.
- ❌ A **regra específica** da norma do Comitê Gestor (ainda não publicada — P1). DET-004/005 são alertas genéricos de "operações internacionais"; a regra norma-específica é plugada quando a norma sair.
- ❌ Reprocessar diagnósticos antigos (P2 — só novos).
- ❌ Renomear `hasImportExport` no form/tipo (mantém leitores legados; o fix é aditivo).

## 8. Arquivos (implementação)
- `server/routers-fluxo-v3.ts` — helper `alignIntlOps` + uso no persist do `createProject` (~`:496`).
- `server/*.test.ts` — unit `alignIntlOps` + unit `consistencyEngine` (DET-004/005 discriminante).
- Flag `ENABLE_INTL_OPS_ALIGN` (env, default OFF).

## 9. Pendência
- Aprovação P.O. desta spec → PR F2 (encanamento, flag OFF).
- Quando a norma do Comitê Gestor sair: spec incremental plugando a regra específica (Consultor extrai o dispositivo literal).
