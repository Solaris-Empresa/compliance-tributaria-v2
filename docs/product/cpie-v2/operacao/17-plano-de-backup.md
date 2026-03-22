# CPIE v2 — Plano de Backup

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado

---

## 1. Escopo

Este documento cobre o plano de backup dos dados produzidos pelo CPIE v2, especificamente:

- Tabela `consistency_checks` (análises, overrides, aceites MEDIUM)
- Configurações do motor (thresholds, versão do motor)
- Logs de auditoria

---

## 2. Estratégia de Backup

### 2.1 Banco de dados (MySQL/TiDB)

| Tipo | Frequência | Retenção | Responsável |
|---|---|---|---|
| Backup completo | Diário (02:00 UTC) | 30 dias | Plataforma Manus |
| Backup incremental | A cada 6 horas | 7 dias | Plataforma Manus |
| Snapshot point-in-time | Contínuo | 72 horas | Plataforma Manus |

**Nota:** O banco de dados é gerenciado pela plataforma Manus (TiDB Cloud). Os backups automáticos são responsabilidade da plataforma. O time de desenvolvimento deve verificar mensalmente se os backups estão sendo realizados.

### 2.2 Código-fonte

O código-fonte é versionado no repositório Git gerenciado pela plataforma Manus. Cada checkpoint salvo representa um estado recuperável do projeto.

| Tipo | Frequência | Retenção |
|---|---|---|
| Checkpoint manual | A cada feature/fix | Indefinida |
| Checkpoint automático | Não aplicável | — |

### 2.3 Configurações do motor

As constantes do motor (`SEVERITY_PENALTIES`, `REVENUE_LIMITS`, `SIZE_MAX_REVENUE`) estão embutidas no código-fonte e são versionadas junto com o repositório. Não há configuração externa que precise de backup separado.

---

## 3. Dados Críticos

Os dados mais críticos do CPIE v2, em ordem de prioridade:

| Prioridade | Dado | Tabela/Arquivo | Impacto da perda |
|---|---|---|---|
| 1 | Overrides de soft_block | `consistency_checks.accepted_risk_reason` | Perda de trilha de auditoria |
| 2 | Aceites MEDIUM | `consistency_checks.medium_acknowledged` | Perda de rastreabilidade de decisões |
| 3 | Histórico de análises | `consistency_checks` (todos os campos) | Perda de histórico diagnóstico |
| 4 | Código do motor | `server/cpie-v2.ts` | Perda da lógica de análise |

---

## 4. Procedimento de Verificação

Mensalmente, o responsável técnico deve verificar:

1. Que o banco de dados TiDB está com backups automáticos ativos (verificar no painel da plataforma)
2. Que o último backup foi realizado com sucesso
3. Que o repositório Git tem pelo menos um checkpoint nos últimos 7 dias
4. Executar o procedimento de restore em ambiente de staging (ver doc 18)

---

## 5. Contato em Caso de Incidente

Em caso de perda de dados, acionar imediatamente o suporte da plataforma Manus via https://help.manus.im com as informações:

- Data e hora estimada do incidente
- Tabelas afetadas
- Último backup conhecido como íntegro
