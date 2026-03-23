# Shadow Monitor — Baseline UAT
## Registro de Estado Inicial para Monitoramento 48–72h

**Data/hora do registro:** 2026-03-23 20:00 UTC-3  
**Versão da plataforma:** `f10cc327`  
**Modo atual:** `shadow` (`DIAGNOSTIC_READ_MODE=shadow`)  
**Responsável:** Equipe Técnica Solaris

---

## Estado Baseline (T=0)

| Indicador | Valor | Status |
|---|---|---|
| Total de projetos na plataforma | 2.145 | — |
| Total de usuários cadastrados | 1.497 | — |
| Total de divergências registradas | **274** | ✅ Esperado |
| Divergências críticas (conflito real) | **0** | ✅ Seguro |
| Projetos com divergência | **38** (1,8%) | ✅ Normal |
| Projetos UAT criados | **0** | — |

### Distribuição das 274 Divergências por Campo

| Campo | Quantidade | Tipo | Interpretação |
|---|---|---|---|
| `briefingContent` | 100 | Legado tem valor, nova é null | Projetos pré-v2.1 com briefing V1 sem equivalente V3 |
| `riskMatricesData` | 89 | Legado tem valor, nova é null | Projetos pré-v2.1 com matrizes V1 sem equivalente V3 |
| `actionPlansData` | 85 | Legado tem valor, nova é null | Projetos pré-v2.1 com plano V1 sem equivalente V3 |

### Distribuição por Flow Version

| Flow Version | Quantidade | Interpretação |
|---|---|---|
| `none` | 219 | Projetos sem fluxo V3 iniciado |
| `v1` | 55 | Projetos com fluxo V1 completo |

> **Conclusão:** Todas as 274 divergências são do padrão esperado para projetos criados antes da migração para v2.1. Nenhuma representa um conflito real entre os dois motores. O adaptador `getDiagnosticSource()` serve esses projetos corretamente pelo fluxo V1.

---

## Protocolo de Monitoramento durante o UAT

### Frequência de verificação

| Janela | Verificação |
|---|---|
| T+24h (2026-03-24 20:00) | Verificação 1 |
| T+48h (2026-03-25 20:00) | Verificação 2 |
| T+72h (2026-03-26 20:00) | Verificação 3 (decisão final) |

### Métricas a monitorar em cada verificação

```sql
-- Executar no painel de banco de dados do Manus:

SELECT 
  COUNT(*) as total_divergencias,
  COUNT(DISTINCT project_id) as projetos_afetados,
  field_name,
  COUNT(*) as por_campo
FROM diagnostic_shadow_divergences
GROUP BY field_name
ORDER BY por_campo DESC;

-- Verificar projetos UAT com divergência:
SELECT d.project_id, p.name, d.field_name, d.reason
FROM diagnostic_shadow_divergences d
JOIN projects p ON p.id = d.project_id
WHERE p.name LIKE '[UAT%]';
```

### Critérios de alerta

| Condição | Ação |
|---|---|
| Total de divergências > 288 (crescimento > 5%) | Investigar projetos novos afetados |
| Qualquer divergência em projeto `[UAT]` | **Parar UAT imediatamente — investigar** |
| Qualquer divergência com `reason` contendo "conflict" | **Parar UAT imediatamente — investigar** |
| Total de divergências críticas > 0 | **Parar UAT imediatamente — acionar equipe técnica** |

---

## Registros de Verificação (preencher durante o UAT)

### Verificação 1 — T+24h (2026-03-24)

| Indicador | Valor | Delta vs. Baseline | Status |
|---|---|---|---|
| Total de divergências | | | |
| Divergências críticas | | | |
| Projetos UAT com divergência | | | |
| Observações | | | |

### Verificação 2 — T+48h (2026-03-25)

| Indicador | Valor | Delta vs. Baseline | Status |
|---|---|---|---|
| Total de divergências | | | |
| Divergências críticas | | | |
| Projetos UAT com divergência | | | |
| Observações | | | |

### Verificação 3 — T+72h (2026-03-26) — Decisão Final

| Indicador | Valor | Delta vs. Baseline | Status |
|---|---|---|---|
| Total de divergências | | | |
| Divergências críticas | | | |
| Projetos UAT com divergência | | | |
| Observações | | | |

**Decisão:** [ ] Ativar modo `new` | [ ] Manter modo `shadow` | [ ] Investigar antes de decidir

---

## Procedimento para Ativar o Modo `new`

Após aprovação do UAT e confirmação de 0 divergências críticas:

1. Acessar o painel de **Secrets** na interface Manus
2. Localizar a variável `DIAGNOSTIC_READ_MODE`
3. Alterar o valor de `shadow` para `new`
4. Salvar e aguardar o restart automático do servidor
5. Verificar o Shadow Monitor por mais 24h após a ativação
6. Confirmar que os projetos UAT continuam funcionando corretamente

> **Rollback:** Se problemas forem detectados após a ativação do modo `new`, reverter para `shadow` no painel de Secrets. O rollback é imediato e sem perda de dados.

---

*Documento gerado automaticamente pela equipe técnica Solaris — 2026-03-23.*
