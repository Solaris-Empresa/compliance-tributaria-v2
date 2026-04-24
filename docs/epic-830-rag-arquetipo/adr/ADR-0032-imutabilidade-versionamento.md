# ADR-0032 — Imutabilidade, Versionamento e Não-Migração do Perfil da Entidade

**Status:** PROPOSED  
**Data:** 2026-04-24  
**Contexto:** Epic #830 — RAG com Arquétipo (M1)

---

## Problema

Sem regras explícitas de imutabilidade e versionamento, o sistema pode:

- recalcular perfis antigos com regras novas (perda de rastreabilidade);
- alterar briefing já entregue ao usuário (quebra de confiança);
- gerar inconsistência entre M1 (Perfil) e M2 (RAG);
- impedir auditoria e reprodutibilidade.

Além disso, migração automática de dados pode:

- introduzir erros silenciosos;
- mascarar mudanças de regra;
- gerar divergência entre histórico e estado atual.

---

## Decisão

Adotar modelo baseado em:

1. Imutabilidade por snapshot  
2. Versionamento explícito  
3. Ausência de migração automática  

---

## 1. Imutabilidade

Regra:

Perfil da Entidade, uma vez confirmado, é imutável.

Consequências:

- não é permitido editar um perfil confirmado;
- qualquer alteração gera um novo snapshot;
- histórico permanece preservado;
- auditoria é sempre possível.

---

## 2. Versionamento explícito

Cada Perfil da Entidade deve conter:

- model_version → versão do modelo (ex: m1-v1.0.0)
- data_version → timestamp ISO da geração
- perfil_hash → hash do conteúdo do perfil
- rules_hash → hash das regras aplicadas

Regra:

Mudança de dados ou de regras gera nova versão, nunca sobrescrita.

---

## 3. Congelamento de briefing

Regra:

Briefing gerado é imutável.

Consequências:

- alterações no perfil não alteram briefing anterior;
- novo briefing só é gerado com nova versão;
- histórico de análises permanece íntegro.

---

## 4. Política de não-migração

Regra:

Não existe migração automática de perfis existentes.

Consequências:

- perfis antigos mantêm sua versão original;
- sistema não recalcula retroativamente;
- qualquer reprocessamento exige ação explícita.

---

## 5. Exceção — RAG

Regra:

Base RAG é imutável e não sofre limpeza retroativa.

Consequências:

- consistência jurídica preservada;
- evita drift silencioso;
- garante reprodutibilidade.

---

## 6. Integração com M2

Regra:

M2 consome snapshot versionado do Perfil da Entidade.

Consequências:

- RAG não recalcula perfil;
- sempre usa versão explícita;
- mantém determinismo do pipeline.

---

## 7. Fluxo

Dados → Perfil → Confirmação → Snapshot → Elegibilidade → Execução

Se dados mudam:

Novo dado → novo snapshot → novo ciclo

---

## 8. Proibições

- sobrescrever perfil
- recalcular histórico automaticamente
- alterar briefing existente
- migrar dados silenciosamente

---

## 9. Relação com ADR-0031

- ADR-0031 define o modelo (dimensional)
- ADR-0032 define o comportamento no tempo

---

## 10. Consequências

Positivas:
- auditoria completa
- reprodutibilidade
- confiança do usuário
- isolamento de mudanças

Negativas:
- aumento de volume de dados
- necessidade de gestão de versões
- maior complexidade de UX

---

## 11. Relação com milestones

- M1 → gera snapshot
- M2 → consome snapshot
- M3+ → mantém consistência temporal
- M4 → briefing depende de versão congelada

---

## 12. Não-escopo

- UI de versionamento
- retenção de dados
- arquivamento
- cálculo de confiança

---

## Decisão do P.O.

Aprovado:

- imutabilidade por snapshot
- versionamento explícito
- ausência de migração automática

---

## Status

Aprovado para documentação pré-M1.  
Implementação permanece bloqueada pela REGRA-M1-GO-NO-GO.
