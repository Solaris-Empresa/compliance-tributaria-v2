# AS-IS / TO-BE — Geração de Riscos: Questionário (Path A) vs Inferência (Path B)

**Projeto:** IA SOLARIS — Compliance Tributária · **Data:** 30/06/2026 · **HEAD:** 6bdf57a3
**Autor:** Claude Code (Orquestrador) · **Método:** REGRA-ORQ-41 (AS-IS/TO-BE) · investigação determinística com evidência `arquivo:linha`
**Destinatário:** P.O. (Uires Tapajós) + Dr. José (curadoria jurídica)

---

## Veredito direto

**Há solução definitiva para o MECANISMO (engenharia) — sim. Não há solução que elimine a CURADORIA jurídica por setor.**

São duas camadas distintas; misturá-las gera a confusão:

- **Mecanismo** (gerar riscos de forma data-driven, sem PR por setor) → **definitivamente solucionável**.
- **Curadoria** (quais são os requisitos/riscos de cada setor) → **irredutivelmente humana** (Dr. José). Nenhuma engenharia elimina isso — a própria LC 214 cita CNAE em **1 só artigo** (Lição #133); a lei não se mapeia sozinha a setor.

---

## AS-IS — a arquitetura tem DOIS caminhos (coexistem)

Fonte: `server/lib/generate-risks-pipeline.ts:96-117` combina Path A + Path B via `mergeByRiskKey`.

### Path A — questionário → requisito → gap → risco (o caminho escalável, mas QUEBRADO)

| Etapa | Estado | Evidência |
|---|---|---|
| Catálogo de 138 requisitos | OK — existe, com `riskCategoryCode` | `schema-compliance-engine-v3.ts:63-95` · seed `0072` |
| Requisito → gap → risco | OK — ATIVO | `gapEngine.analyzeGaps` itera requisitos · `risks-v4.ts:133` |
| Lacuna 1 — resposta sem vínculo | FALHA — `questionnaireAnswersV3` não tem `requirement_id` | `schema.ts:1215-1228` (12 colunas, nenhuma de vínculo) |
| Lacuna 2 — conversor desligado | FALHA — `normalizeQcnaeOnda3Answers` é STUB que retorna `[]` | `unified-answer.ts:198-200` (#963/#966) + fallback artificial `Q{index}` em `gapEngine.ts:335` |
| Lacuna 3 — mapa vazio | FALHA — `requirement_question_mapping` existe e é lida, mas 0 registros | `gapRouter.ts:67-72` (lê `WHERE status='approved'`) · vazia (query Manus 28/06) |

**Consequência:** Q.CNAE gera **0 riscos** (prova negativa, auditoria 28/06). O catálogo funciona, mas as respostas do questionário não chegam a ele.

### Path B — perfil/CNAE → inferência → risco (funciona, mas NÃO escala)

| Componente | Estado | Evidência |
|---|---|---|
| `inferNormativeRisks` | regras hardcoded em TypeScript | `normative-inference.ts:181-346` |
| CNAE → setor | Sets hardcoded (`["41","42","43","68"]`) | `regime-imoveis-eligibility.ts:62-63` |
| `risk_categories` (tabela) | data-driven só nos metadados (nome/artigo/severidade) | migration `0128` |
| Regra de disparo (qual CNAE → qual categoria) | FALHA p/ escala — código, não dados | `normative-inference.ts:269` (`if isConstrucaoCivilImoveis`) |

**Construção civil está coberta por aqui.** Mas adicionar um setor novo = **PR em 5 arquivos + 1 migration** (Categoria type, eligibility, normative-inference, categoria-labels, PLANS). Saúde/transporte/agro = mesmo trabalho de código, um por um.

---

## A causa da "ilusão de cobertura"

A construção civil parece resolvida (e está, no resultado), mas pelo caminho errado para escala: foi **codificada** (Path B), não **curada como dado** (Path A). As 3 lacunas do Path A continuam abertas para **todos** os setores — inclusive construção civil, que só não sofre porque foi contornada no código.

---

## TO-BE — duas frentes, com naturezas diferentes

### Eixo 1 — Mecanismo (ENGENHARIA — tem fim, é definitivo)

| Frente | Ação | Issue |
|---|---|---|
| A1 — vínculo resposta↔requisito | adicionar `requirement_id` em `questionnaireAnswersV3` + popular no submit | #963 |
| A2 — ativar o conversor | implementar `normalizeQcnaeOnda3Answers` (sair do stub `[]`) | #966 |
| A3 — semear o mapa | seed de `requirement_question_mapping` (pergunta↔requisito) | curadoria (Eixo 2) |
| B1 — Path B data-driven | migrar os Sets hardcoded → tabela `cnae_categoria_map` + engine genérico que lê dela | novo |

Com A1+A2+B1 prontos: **um setor novo passa a precisar só de DADOS** (linhas em tabelas), **zero PR de código**. Isso é o "definitivo" — e é alcançável.

### Eixo 2 — Curadoria (JURÍDICO — não tem fim automatizável)

- Para cada setor: requisitos normativos + mapeamento pergunta↔requisito + classificação de categoria → curados pelo Dr. José.
- Não há engenharia que substitua isto (Lição #133: o mapeamento artigo→CNAE é camada interpretativa humana, não derivável do texto legal).
- O que a engenharia faz: transformar a curadoria de "trabalho de programador por setor" em "trabalho de jurista preenchendo tabela".

---

## Resposta final

| Pergunta | Resposta |
|---|---|
| "Resolver definitivamente?" | Sim — o MECANISMO (Eixos A1/A2/B1). Vira data-driven; setor novo = dado, não código. |
| "...ou não há solução definitiva?" | Correto para a CURADORIA — ela é permanente, por setor, humana. Não há "fim". |
| Construção civil hoje | Coberta (Path B, código). Migrável para Path A (dado) quando A1/A2/B1 existirem. |
| Outros setores | Seguem descobertos até (a) o mecanismo virar data-driven e (b) a curadoria daquele setor ser feita. |
| O indicador de 98% | Continua exigindo ressalva por setor não-curado — isto é estrutural, não some com código. A honestidade é parte da solução. |

**Em uma frase:** a plataforma tem solução de engenharia definitiva para parar de precisar de código por setor — mas nunca deixará de precisar de curadoria jurídica por setor; a meta realista é tornar a curadoria a única dependência, e ser transparente sobre cobertura enquanto ela não é feita.

---

## Referências de código (determinístico, `arquivo:linha`)

- `server/lib/generate-risks-pipeline.ts:96-117` — merge Path A + Path B
- `server/lib/normative-inference.ts:181-346` — inferência hardcoded (Path B)
- `server/lib/regime-imoveis-eligibility.ts:62-63` — Sets de CNAE hardcoded
- `drizzle/schema.ts:1215-1228` — `questionnaireAnswersV3` (sem `requirement_id`)
- `server/lib/unified-answer.ts:198-200` — STUB `normalizeQcnaeOnda3Answers` (#963/#966)
- `server/routers/gapEngine.ts:335` — fallback `Q{index}`
- `server/routers/gapRouter.ts:67-72` — leitura de `requirement_question_mapping` (vazia)
- `drizzle/schema-compliance-engine-v3.ts:63-95` — catálogo `regulatory_requirements_v3` (138, seed `0072`)
- Lição #133 — `cnaeGroups`/mapeamento é camada interpretativa (curadoria jurídica)

*Investigação determinística por 2 agentes de exploração read-only · 30/06/2026.*
