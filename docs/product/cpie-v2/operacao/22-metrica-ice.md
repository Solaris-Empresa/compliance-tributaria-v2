# CPIE v2 — Métrica ICE (Gate de Release)

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Autoridade:** P.O.

---

## 1. Definição Oficial

O **ICE** (Índice de Confiabilidade de Execução) é a métrica de qualidade que determina se uma versão do motor CPIE v2 está apta para produção. É calculado por regra e deve atingir o threshold mínimo em todas as regras para que o release seja aprovado.

---

## 2. Fórmula Oficial

```
ICE = (Funcional × 0.40) + (UX × 0.30) + (Fricção × 0.20) + (Clareza × 0.10)
```

### 2.1 Componentes

| Componente | Peso | Descrição | Como medir |
|---|---|---|---|
| **Funcional** | 40% | Precisão da regra: % de cenários da Matriz que produzem o output esperado | Testes Vitest: cenários aprovados / total de cenários da regra × 100 |
| **UX** | 30% | Qualidade da experiência: clareza do feedback ao usuário, ausência de estados confusos | Avaliação manual por sessão de teste com usuário real (escala 0–100) |
| **Fricção** | 20% | Ausência de falsos positivos: % de perfis válidos que NÃO são bloqueados indevidamente | (1 - taxa_falsos_positivos) × 100 |
| **Clareza** | 10% | Inteligibilidade da mensagem de conflito: o usuário entende o que fazer | Avaliação manual: % de usuários que entendem a mensagem sem ajuda |

### 2.2 Exemplo de cálculo

Para a regra A1 (MEI com faturamento acima do limite):

| Componente | Valor | Cálculo |
|---|---|---|
| Funcional | 100 | 4/4 cenários passando (C-001, C-002, C-032, C-033) |
| UX | 95 | Avaliação manual: mensagem clara, CTA óbvio |
| Fricção | 100 | Nenhum falso positivo detectado |
| Clareza | 90 | 9/10 usuários entendem sem ajuda |
| **ICE** | **97.5** | (100×0.40) + (95×0.30) + (100×0.20) + (90×0.10) |

---

## 3. Thresholds

| Threshold | Valor | Efeito |
|---|---|---|
| **Produção** | ICE ≥ 98 | Release aprovado para produção |
| **Alerta** | 95 ≤ ICE < 98 | Release aprovado com plano de melhoria em 30 dias |
| **Bloqueio** | ICE < 95 | Release bloqueado — correção obrigatória antes do deploy |
| **Reprovação automática** | Qualquer violação crítica | ICE = 0 para a regra afetada, independente dos outros componentes |

---

## 4. Condição de Reprovação Automática

Uma regra recebe **ICE = 0** automaticamente quando qualquer uma das seguintes condições for verdadeira:

1. **Falso negativo crítico:** a regra deveria bloquear (`hard_block`) mas retornou `canProceed=true`
2. **Falso negativo alto:** a regra deveria bloquear (`soft_block`) mas retornou `canProceed=true`
3. **Crash do motor:** a regra causa exceção não tratada
4. **Regressão de cenário crítico:** qualquer cenário do Grupo 1 (Hard Block) da Matriz falha

A reprovação automática de qualquer regra bloqueia o release completo, independentemente do ICE das outras regras.

---

## 5. ICE como Gate de Release

O ICE é o critério formal de aprovação para qualquer release do motor CPIE v2:

```
RELEASE APROVADO se:
  ∀ regra ∈ {A1, A2, A3, A4, B1, B1b, B2, B3, B4, C1, C2, C3}:
    ICE(regra) ≥ 98
  AND
    nenhuma reprovação automática ativa
  AND
    cobertura_de_testes ≥ 85%
  AND
    aprovação do P.O.
```

---

## 6. ICE Atual por Regra

Atualizado em: 2026-03-22

| Regra | Funcional | UX | Fricção | Clareza | **ICE** | Status |
|---|---|---|---|---|---|---|
| A1 | 100 | 95 | 100 | 90 | **97.5** | ⚠️ Alerta |
| A2 | 100 | 90 | 100 | 85 | **95.5** | ⚠️ Alerta |
| A3 | 100 | 90 | 100 | 85 | **95.5** | ⚠️ Alerta |
| A4 | 100 | 95 | 100 | 90 | **97.5** | ⚠️ Alerta |
| B1 | 100 | 85 | 100 | 80 | **93.5** | ❌ Bloqueio |
| B1b | 100 | 85 | 100 | 80 | **93.5** | ❌ Bloqueio |
| B2 | 100 | 80 | 95 | 75 | **90.5** | ❌ Bloqueio |
| B3 | 100 | 80 | 90 | 75 | **89.5** | ❌ Bloqueio |
| B4 | 100 | 80 | 95 | 75 | **90.5** | ❌ Bloqueio |
| C1 | 100 | 90 | 100 | 85 | **95.5** | ⚠️ Alerta |
| C2 | 100 | 85 | 100 | 80 | **93.5** | ❌ Bloqueio |
| C3 | 100 | 85 | 100 | 80 | **93.5** | ❌ Bloqueio |

**Nota:** Os valores de UX e Clareza são estimativas baseadas na análise do código atual. Para valores definitivos, é necessária uma sessão de teste com usuários reais. Os valores de Funcional e Fricção são baseados nos testes automatizados.

**Plano de melhoria:** As regras com ICE < 98 precisam de melhoria nas mensagens de conflito (Clareza) e na experiência do usuário ao encontrar o conflito (UX). Isso será endereçado na próxima sprint de UX.

---

## 7. Vínculo com Critério de Release

O ICE é verificado automaticamente pelo script de regressão (ver doc 23). O pipeline de CI deve incluir a verificação do ICE Funcional (componente automatizável) como gate obrigatório. Os componentes UX, Fricção e Clareza requerem avaliação manual periódica (a cada sprint ou a cada mudança de regra).
