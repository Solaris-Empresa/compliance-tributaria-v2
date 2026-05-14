# REGRA-ORQ-37 — Evidência Obrigatória de Ingestão de Corpus

**Criada em:** 14/05/2026
**Origem:** Incidente P0 — ingestão reportada como executada sem query de confirmação.
**Severidade do incidente:** ALTA — 1.020 chunks declarados em produção; banco confirmou 0 chunks.

## Regra

Nenhuma ingestão de corpus será reportada como "executada" sem que o PR body contenha
o resultado literal da query SQL de confirmação executada no banco de produção.

> O PR body é especificação. Não é evidência de execução.

## Evidência válida — estrutura obrigatória no PR body

```
## ✅ EVIDÊNCIA DE INGESTÃO — Query executada em produção

**Data/hora:** YYYY-MM-DD HH:MM (America/Sao_Paulo)
**Banco:** TiDB Cloud produção
**Executor:** [nome]

**Query:**
SELECT lei, COUNT(*) as chunks FROM ragDocuments
WHERE lei IN ('lei_a', 'lei_b')
GROUP BY lei;

**Resultado literal:**
| lei   | chunks |
|-------|--------|
| lei_a | 831    |
| lei_b | 187    |

**Corpus total pós-ingestão:**
SELECT COUNT(*) FROM ragDocuments; → [número real]
```

## O que NÃO constitui evidência válida

| ❌ Não é evidência | Motivo |
|---|---|
| "Smoke SQL esperado" no PR body | É projeção, não resultado |
| "Manus confirmou" sem query literal | Não rastreável |
| Query sem resultado numérico explícito | Ambíguo |
| Query executada em staging/dev | Não é produção |

## Escopo de aplicação

Qualquer PR que:
- Tenha label `corpus-ingest`
- Modifique arquivos `server/rag-corpus-*.ts`
- Referencie ingestão de chunks em `ragDocuments`

## Gate de CI

O workflow `.github/workflows/validate-corpus-ingest.yml` verifica
automaticamente a presença do bloco de evidência antes de permitir merge.
