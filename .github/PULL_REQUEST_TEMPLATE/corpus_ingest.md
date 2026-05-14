## Descrição
<!-- Descrever o que está sendo ingerido -->

## Documentos ingeridos
| Documento | Lei | Chunks esperados |
|---|---|---|
| | | |

## Issue relacionada
Closes #

## Checklist — Claude Code (antes do PR)
- [ ] Scripts de chunking criados e validados
- [ ] Migration de enum executada localmente
- [ ] `npx tsc --noEmit` — 0 erros

## Checklist — Manus (após execução em produção)
- [ ] Pipeline de ingestão executado
- [ ] Query de verificação executada no banco de produção
- [ ] Bloco abaixo preenchido com resultado REAL (não projeção)

---

## ✅ EVIDÊNCIA DE INGESTÃO — Query executada em produção
<!-- OBRIGATÓRIO — CI gate (REGRA-ORQ-37) bloqueia merge sem este bloco preenchido -->
<!-- NÃO preencher com valores esperados/estimados — somente resultado real -->

**Data/hora:** <!-- YYYY-MM-DD HH:MM -->
**Banco:** TiDB Cloud produção
**Executor:** <!-- nome -->

**Query executada:**
```sql
SELECT lei, COUNT(*) as chunks FROM ragDocuments
WHERE lei IN (/* leis ingeridas */)
GROUP BY lei;
```

**Resultado literal:**
| lei | chunks |
|---|---|
| <!-- preencher após execução --> | <!-- número real --> |

**Corpus total pós-ingestão:**
```sql
SELECT COUNT(*) FROM ragDocuments;
-- Resultado: [número real]
```
