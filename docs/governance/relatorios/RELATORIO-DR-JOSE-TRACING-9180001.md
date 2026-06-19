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

| Gap | Questão | Texto do gap (conforme curado no CSV) |
|---|---|---|
| 3090013 | SOL-301 | Ausência de inventário formal e de cronograma de saneamento dos créditos a migrar para a CBS, com risco de perda prática do direito de utilização antes do marco temporal (dez/2026). |
| 3090014 | SOL-302 | Créditos não escriturados ou divergentes entre EFD-Contribuições, PER/DCOMP e documentação de suporte, com risco de perda de liquidez e de não homologação após dez/2026. |
| 3090015 | SOL-303 | Ausência de memória de cálculo individualizada e de lastro documental idôneo, com risco de indeferimento sumário do PER/DCOMP, glosa e autuações. |
| 3090016 | SOL-304 | Créditos de origem extraordinária (teses, recuperação fiscal, sucessão societária) sem vínculo econômico demonstrável, com risco de não homologação. |

---

## 4. Dois pontos que exigem decisão jurídica do senhor

> Importante: **não são falhas de execução** — o fluxo funcionou. São **decisões de classificação de risco**.

### 4.1 Consolidação: 4 questões → 1 risco e 1 plano
O motor agrupa os gaps **pela categoria de risco**. Como as 4 questões foram cadastradas na mesma categoria (`Obrigações Acessórias`), o sistema as **consolidou em um único risco e um único plano genérico**, sem distinguir inventário, conciliação, lastro e teses.
→ Para obter **um risco e um plano específicos por questão**, cada questão precisa de uma **categoria de risco própria**.

### 4.2 Severidade do risco saiu como "Média"
Embora as questões tenham sido classificadas como **Alta/Crítica** no CSV, o risco consolidado saiu como **Média**.
**Motivo determinístico:** a severidade do risco é definida pela **categoria** (a categoria "Obrigações Acessórias" está fixada como severidade *Média* no motor), e **não** pela severidade que o senhor atribuiu a cada pergunta. A severidade da pergunta influencia a criticidade do gap, mas não a da matriz de risco.
→ Para que a matriz reflita a **Alta/Crítica** que o tema de créditos exige, é necessária uma **categoria dedicada**.

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
