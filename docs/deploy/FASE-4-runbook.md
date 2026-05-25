# FASE 4 — Runbook de Deploy

> BUG-IBS / CGIBS 6 — categorias grounding-only + gate CNAE/vigência (25/05/2026).

## 1. Ordem de merge (obrigatória)

1. **PR #1210** — nota SN (BUG-IBS-02) ← **PRIMEIRO**
2. **PR #1214** — gate CNAE+vigência ← rebase trivial sobre #1210
3. **PR #1213** — locação subset (mig 0113) ← paralelo com #1214
4. **PR #1215** — 3 categorias (mig 0111) ← após #1214 em main
5. **PR #1216** — 6 categorias (mig 0112) ← após #1214 em main

> #1210 e #1214 tocam `deterministic-grounding.ts` (regiões diferentes — nota SN vs gate). O 2º a mergear faz rebase trivial (a nota SN passa a usar `context.regime`).

## 2. Migrations manuais pós-merge (Lição #93)

Executar no banco de produção (Manus — não há db:push automático em prod):

```
migrations: 0111 (3 cats), 0112 (6 cats), 0113 (locação)
```

Ordem por número (independentes entre si). Aplicar via SQL direto ou `drizzle-kit push` (guarded).

## 3. Queries de verificação pós-deploy

```sql
SELECT codigo, normative_status FROM risk_categories
  WHERE codigo IN (
    'regime_diferenciado_reabilitacao_urbana',
    'credito_presumido_reciclagem',
    'credito_presumido_bens_usados',
    'regime_diferenciado_aliquota_reduzida_30',
    'regime_diferenciado_aliquota_reduzida_60',
    'regime_diferenciado_aliquota_zero',
    'regime_diferenciado_transporte',
    'regime_diferenciado_produtor_rural',
    'regime_diferenciado_produtor_rural_credito'
  );
-- Esperado: 9 rows
-- confirmed (6): reabilitacao_urbana, reduzida_30, reduzida_60, zero, transporte, produtor_rural
-- pending_vigency (3): reciclagem, bens_usados, produtor_rural_credito
```

Verificação adicional (locação refinada):
```sql
SELECT JSON_EXTRACT(normative_bundle,'$.artigos_cgibs6') FROM risk_categories
  WHERE codigo = 'regime_especifico_imoveis_locacao';  -- esperado: 8 artigos [360,361,363,364,377,378,379,382]
```

## 4. Smoke D1–D9 (Manus executa — prova de consumo runtime, Lição #87)

| # | Cenário | Esperado |
|---|---|---|
| D1 | Briefing CNAE 4120-4 (construção) | grounding cita reabilitacao_urbana (Art. 234) |
| D2 | Briefing CNAE 3811-4 (resíduos) | NÃO cita reciclagem (pending_vigency 2027) |
| D3 | Briefing CNAE 4511-1 (veículos) | NÃO cita bens_usados (pending_vigency 2027) |
| D4 | Briefing CNAE 6911-7 (advocacia) | grounding cita reduzida_30 (Art. 202) |
| D5 | Briefing CNAE 4921-3 (transporte) | grounding cita transporte (Art. 233) |
| D6 | Briefing CNAE 0111-3 (agro) | grounding cita produtor_rural (238-244); NÃO _credito (2027) |
| D7 | Briefing CNAE 4711-3 (comércio, sem cat) | NÃO cita reabilitacao/transporte/produtor_rural (gate CNAE) |
| D8 | Briefing qualquer CNAE (não-SN) | cita reduzida_60 + aliquota_zero (transversais, sem cnae_codes) |
| D9 | Briefing Simples Nacional | 0 tags [FONTE: Resolução CGIBS 6] (SN guard) + nota SN presente |

## 5. Rollback

Cada migration tem DOWN documentado. Em caso de falha, executar DOWN na ordem inversa:
**0112 → 0111 → 0113** (DELETE das categorias / restore da locação).

## 6. Monitoramento

- Se `fetchDeterministicGrounding` retornar 0 categorias para CNAE conhecido → **alerta de degradação**.
- Verificar que `shouldInjectCategory()` recebe `context.cnae` e `context.today` corretamente (callers em `routers-fluxo-v3.ts:1446,4147`).

## 7. Calendário — 01/01/2027 (flip de vigência)

```sql
UPDATE risk_categories
SET normative_status = 'confirmed'
WHERE codigo IN (
  'credito_presumido_reciclagem',
  'credito_presumido_bens_usados',
  'regime_diferenciado_produtor_rural_credito'
);
```

- Arts. 245-250, 256-257, 258 entram em vigor em 01/01/2027.
- O gate `shouldInjectCategory()` já bloqueia em runtime via `vigencia_inicio > hoje` — porém estas usam `pending_vigency` (excluídas da query `WHERE normative_status='confirmed'`), então o flip **é necessário** (não só cosmético) para que entrem no grounding em 2027.

> **Nota:** diferente do gate de vigência (que afeta categorias `confirmed` com `vigencia_inicio` futura), as 3 acima são `pending_vigency` → a query nem as alcança até o flip. O flip de 2027 é o gatilho real para elas.
