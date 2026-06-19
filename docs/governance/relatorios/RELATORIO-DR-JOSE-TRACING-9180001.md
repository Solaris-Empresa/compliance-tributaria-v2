# Relatório de Rastreabilidade Determinística — Questionário SOLARIS (1ª Onda)

**Destinatário:** Dr. José Swami Rodrigues
**Projeto de teste:** 9180001 — Farmacêutica Teste (CNAE 2121-1/01 · Lucro Presumido)
**Tema das questões:** créditos de PIS/COFINS na transição para a CBS
**Data:** 19/06/2026 · **Método:** extração direta no banco (TiDB) — 100% determinístico, sem IA

---

## 1. Objeto do teste

Validar, de ponta a ponta, que uma questão curada pela equipe jurídica no CSV percorre a cadeia **Questão → Gap → Risco → Plano de Ação** de forma **determinística** — ou seja, o que o jurista define no CSV é exatamente o que o sistema produz, sem inferência de inteligência artificial (princípio anti-alucinação).

Foram importadas **4 questões** sobre **inventário, conciliação, lastro probatório e legitimidade de créditos** acumulados de PIS/COFINS a serem migrados para compensação na CBS (regime **Lucro Presumido**). No teste, **todas foram respondidas "Não"** — portanto, todas devem gerar gap, risco e plano.

---

## 2. Resultado — a cadeia funcionou ponta a ponta

| Questão | Resposta | Gap | Risco | Plano de Ação |
|---|---|---|---|---|
| SOL-301 — Inventário de créditos para migração à CBS | Não | ✅ gerado | ↓ | ↓ |
| SOL-302 — Conciliação com EFD-Contribuições e PER/DCOMP | Não | ✅ gerado | ↓ | ↓ |
| SOL-303 — Capacidade probatória e lastro documental | Não | ✅ gerado | ↓ | ↓ |
| SOL-304 — Créditos de maior risco de fiscalização | Não | ✅ gerado | ↓ | ↓ |
| **Consolidado** | — | **4 gaps** | **1 risco** (Obrigações Acessórias) | **1 plano** (Mapear/adequar obrigações acessórias IBS/CBS · 60 dias) |

**Confirmado:** as 4 respostas "Não" geraram **4 gaps**, cada um com a **redação jurídica exata** que o senhor curou no campo `gap_descricao` do CSV. A cadeia completa, até o plano de ação, está íntegra.

---

## 3. Detalhamento dos gaps gerados (texto curado preservado)

| Gap | Questão | Criticidade | Prioridade | Texto do gap (conforme curado no CSV) |
|---|---|---|---|---|
| 3090013 | SOL-301 | alta | imediata | Ausência de inventário formal e de cronograma de saneamento dos créditos a migrar para a CBS, com risco de perda do direito antes do marco (dez/2026). |
| 3090014 | SOL-302 | alta | imediata | Créditos não escriturados ou divergentes entre EFD-Contribuições, PER/DCOMP e documentação, com risco de perda de liquidez e não homologação após dez/2026. |
| 3090015 | SOL-303 | alta | imediata | Ausência de memória de cálculo individualizada e de lastro idôneo, com risco de indeferimento do PER/DCOMP, glosa e autuações. |
| 3090016 | SOL-304 | **crítica** | imediata | Créditos de origem extraordinária (teses, recuperação fiscal, sucessão) sem vínculo econômico, com risco de não homologação. |

> **Constatação relevante:** a severidade que o senhor atribuiu (alta/crítica) **É preservada no nível do GAP** (coluna Criticidade) e a prioridade é **imediata**. O que muda na matriz é a severidade do **risco consolidado** (item 4.2).

---

## 3-A. Tarefas geradas (execução do plano)

O plano consolidado (Obrigações Acessórias IBS/CBS · 60 dias · responsável *gestor fiscal* · status *aprovado*) desdobrou-se em **3 tarefas** (status *a fazer*):

| # | Tarefa |
|---|---|
| 1 | Revisar procedimentos internos de escrituração e envio de declarações |
| 2 | Atualizar sistemas de TI para atender às novas exigências de IBS/CBS |
| 3 | Levantar obrigações acessórias específicas para a indústria sob a LC 214/2025 |

---

## 4. Dois pontos que exigem decisão jurídica do senhor

> Importante: **não são falhas de execução** — o fluxo funcionou. São **decisões de classificação de risco**.

### 4.1 Consolidação: 4 questões → 1 risco e 1 plano
O motor agrupa os gaps **pela categoria de risco**. Como as 4 questões foram cadastradas na mesma categoria (`Obrigações Acessórias`), o sistema as **consolidou em um único risco e um único plano genérico**, sem distinguir inventário, conciliação, lastro e teses.
→ Para obter **um risco e um plano específicos por questão**, cada questão precisa de uma **categoria de risco própria**.

### 4.2 Severidade do risco saiu como "Média"
Embora as questões tenham sido classificadas como **Alta/Crítica** no CSV, o risco consolidado saiu como **Média**.
**Motivo determinístico (confirmado por consulta ao banco):** a severidade do risco é definida pela **categoria** ("Obrigações Acessórias" está fixada como *Média* no motor), e **não** pela severidade que o senhor atribuiu. A consulta comprovou: os **gaps mantêm criticidade Alta/Crítica** (vide item 3), mas o **risco consolidado saiu Média** — ou seja, a severidade jurídica existe no gap e **se perde na matriz**.
→ Para que a matriz reflita a **Alta/Crítica** que o tema de créditos exige, é necessária uma **categoria de risco dedicada**.

---

## 5. Recomendação

Criar — por decisão jurídica do senhor, com implementação técnica — uma **categoria de risco dedicada** para créditos de transição PIS/COFINS → CBS, com:
- **severidade Alta/Crítica** e urgência **Imediata**, refletindo o risco real de perda/glosa/autuação;
- **títulos de plano específicos** por tema (inventário, conciliação EFD/PER-DCOMP, lastro probatório, teses/sucessão), gerando **planos individualizados** em vez de um único plano genérico.

Trata-se de configuração **orientada por dados** (sem código rígido), sujeita à curadoria jurídica.

---

## 6. Conclusão

O **pipeline determinístico está validado**: `CSV → Questão → resposta "Não" → Gap → Risco → Plano de Ação`. A redação jurídica curada é preservada integralmente. Os dois ajustes apontados (categoria dedicada para elevar a severidade e individualizar os planos) são **decisões de classificação de risco** do senhor — não defeitos do fluxo.

---

*Documento técnico-jurídico de validação. Dados extraídos por consulta direta ao banco de produção (determinístico). Mecanismo de severidade verificado no motor de risco (categoria fixa, não derivada da severidade da pergunta).*
