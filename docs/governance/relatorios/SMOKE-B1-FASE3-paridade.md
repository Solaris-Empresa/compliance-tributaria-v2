# Smoke B1 Fase 3 — Paridade runtime (flag ON == OFF)

**Executor:** Manus (runtime/DB — "sem empirismo pelo CC") · **Issue:** #B1-F3 · **Gate antes do flip (Fase 4).**

O nível unitário (`server/lib/b1-fase3-paridade.test.ts`) prova a lógica de match. Este smoke prova a **paridade em runtime** — que o engine data-driven (flag ON) gera o **mesmo output** que o hardcoded (flag OFF).

## Como flipar a flag em staging

`server/config/feature-flags.ts` → `'enable-datadriven-inference': true` (só em staging, temporário).

## T1 — Positivo (paridade construção)

Projeto **CNAE 4120** (construção), regime ≠ Simples Nacional.

```sql
-- flag OFF: gerar riscos, capturar
SELECT categoria FROM risks_v4 WHERE project_id = <P_4120> ORDER BY categoria;
-- flag ON: regenerar, capturar
SELECT categoria FROM risks_v4 WHERE project_id = <P_4120> ORDER BY categoria;
```
**Critério:** as duas listas **idênticas** (mesmas categorias, mesma contagem). Esperado: 11 categorias (9 construção + `regime_especifico_imoveis` + `risco_art_269_270`).

Verificação estendida (severidade/artigo/titulo — não só categoria):
```sql
SELECT categoria, severidade, urgencia, artigo, titulo FROM risks_v4 WHERE project_id=<P_4120> ORDER BY categoria;
```
Comparar ON vs OFF linha a linha.

## T2 — Negativo discriminante

Projeto **CNAE 4711** (comércio, não-construção).
```sql
SELECT categoria FROM risks_v4 WHERE project_id=<P_4711> AND categoria LIKE 'risco_%obra%' OR categoria LIKE 'risco_redutor%';
```
**Critério:** flag ON → **zero** `risco_*` de construção injetado indevidamente.

## T3 — Data-driven puro

```sql
-- INSERT de um setor de teste (sem PR de código):
INSERT INTO cnae_categoria_map (cnae_prefix, match_mode, categoria_codigo, tipo, condicional, confidence, titulo_template, regime_scope, ativo)
VALUES ('55','prefix','regime_diferenciado','risk',0,0.85,'Teste data-driven ({op})','exceto_simples_nacional',1);
-- projeto CNAE 55 (hotelaria), flag ON, regenerar:
SELECT categoria FROM risks_v4 WHERE project_id=<P_5510> AND categoria='regime_diferenciado';
-- limpar:
DELETE FROM cnae_categoria_map WHERE cnae_prefix='55' AND categoria_codigo='regime_diferenciado';
```
**Critério:** o setor 55 gera `regime_diferenciado` **sem nenhuma alteração de código**.

## ⚠️ Caveat de paridade (Gate 0 do CC) — testar explicitamente

As funções de elegibilidade usam **`c.includes(subclasse)`** para as subclasses de imóveis (`regime-imoveis-eligibility.ts:42,51`), mas o seed marcou `match_mode='exact'`. Para o formato-padrão `XXXX-X/YY` são **equivalentes**, mas para confirmar:

**Testar um projeto de LOCAÇÃO (CNAE `6810-2/02`), flag ON == OFF** → deve gerar `regime_especifico_imoveis_locacao` nas duas. Se ON ≠ OFF aqui, é o exact-vs-includes → follow-up: trocar as 3 subclasses para um `match_mode` de substring.

## DoD Fase 3

- T1 ON==OFF (categoria + severidade + artigo + titulo) · T2 zero indevido · T3 data-driven · locação ON==OFF.
- **P.O. confirma paridade → GO Fase 4** (flip + limpeza do hardcoded).
