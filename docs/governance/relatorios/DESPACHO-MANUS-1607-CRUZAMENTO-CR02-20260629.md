# Despacho Manus — #1607 — Verificação do CR-02 (cnaeGroups) + correções do DOC1

> **Para:** Manus (Validador/empirismo DB — REGRA-ORQ-33) · **De:** Claude Code (Orquestrador)
> **Data:** 2026-06-29 · **Ref.:** Issue #1607 · DOC1/DOC3 (PR #1617) · `CRUZAMENTO-CONSTRUCAO-CIVIL-RISCOS-LEI-EVIDENCIA-20260629.md`
> **Natureza:** read-only (DM-1 a DM-3) + proposta de curadoria (DM-4). **Nenhum UPDATE sem aprovação P.O.**

**Pré-requisito (R-SYNC-01):** `git fetch origin && git reset --hard origin/main` antes de começar.

## Contexto (autocontido)

Verificação de código (Claude, `arquivo:linha`) encontrou que o **motor de geração de risco NÃO lê
`ragDocuments.cnaeGroups`**:
- `rag-retriever.ts:134` lê `cnaeGroups` → **retrieval/grounding** (qual artigo fundamenta o briefing).
- `normative-inference.ts` / `risk-engine-v4.ts` → **grep vazio** para `cnaeGroups` → não consomem.
- Riscos de imóveis geram via `isRegimeImoveisRisco(profile.cnaes)` (`normative-inference.ts:250`, CNAE do projeto).

Hipótese do DOC3 a **refutar ou confirmar empiricamente**: *"popular cnaeGroups nos artigos → motor roteia os 13 riscos"*.
Hipótese do Claude (a testar): cnaeGroups muda **grounding**, não o **count de riscos gerados**.

---

## DM-1 — Prova before/after (a tarefa principal, read-only + 1 UPDATE controlado em staging)

**Objetivo:** decidir deterministicamente se `ragDocuments.cnaeGroups` afeta **geração** de risco ou só **grounding**.

1. **Greenfield:** criar projeto novo CONSTRUTORA (CNAE 4120-4/00, lucro_real) — registrar `id`.
2. **ANTES** (cnaeGroups=''): rodar o pipeline de riscos e capturar:
   ```sql
   SELECT COUNT(*) AS n, COUNT(DISTINCT categoria) AS cats
     FROM risks_v4 WHERE project_id = <ID>;
   SELECT DISTINCT categoria FROM risks_v4 WHERE project_id = <ID> ORDER BY 1;
   ```
3. **UPDATE só em staging** (não produção): `UPDATE ragDocuments SET cnaeGroups='41,42,43,68'
   WHERE lei IN ('lc214','decreto12955') AND artigo IN ('Art. 252',...,'Art. 270','Art. 360',...,'Art. 372');`
4. **DEPOIS:** re-rodar o pipeline no mesmo projeto greenfield e repetir as queries do passo 2.
5. **Reportar:** o `COUNT(*)`/`DISTINCT categoria` **mudou** entre ANTES e DEPOIS?
   - Se **NÃO mudou** → confirma: cnaeGroups é grounding, não geração → DOC3 "13/13" superestimado.
   - Se **mudou** → me dê o `arquivo:linha` do consumer de geração que lê `ragDocuments.cnaeGroups` (refuta minha análise).
   - Em ambos os casos, capturar também se o **briefing** passou a **citar** os artigos novos (efeito de grounding esperado).

## DM-2 — Corrigir o #4 (permuta) do DOC1

O DOC1 Risco 4 cita **LC Art. 259**, cujo texto literal impresso no próprio DOC1 é *"redutor social no valor de
R$ 100.000"* — **não é permuta**. Re-extrair do banco e substituir por **LC Art. 252 §2º** (permuta):

```sql
SELECT lei, artigo, LEFT(conteudo, 400) FROM ragDocuments
 WHERE lei='lc214' AND artigo='Art. 252' ORDER BY id LIMIT 3;
```
Confirmar o trecho *"não incidem... nas operações de permuta de bens imóveis, exceto sobre a torna..."* e corrigir o DOC1.

## DM-3 — Metadado de geração do DOC1

O DOC1 declara "apenas citações literais, nenhuma inferência". Porém as citações de **Decreto 12.955** e **CGIBS 6**
são sistematicamente off-topic (#2 cita Dec. 360–362 para redutor, sendo o redutor 369–375; CGIBS cita imunidades/energia).
**Pergunta:** o DOC1 foi gerado por **recuperação semântica (RAG top-k)** ou por **curadoria por tópico**? Se retrieval,
a coluna "artigo por risco" do Decreto/CGIBS **não é determinística** e precisa de curadoria jurídica antes de uso ([[Lição #133]]/[[Lição #134]]).

## DM-4 — Escopo do UPDATE cnaeGroups (gate jurídico, NÃO mecânico)

O DOC3 propõe `UPDATE` em **Arts. 252–270 (LC) + 360–372 (Decreto)** em bloco. Risco: vários desses artigos são
**imóveis-geral** (locação residencial, base de cálculo, permuta PF), não construção-civil-específico — tag '41,42,43,68'
em bloco gera **falso-positivo** ([[Lição #133]] — cnaeGroups é camada interpretativa, exige **gate jurídico por artigo**).
**Pedido:** propor a **lista curada** (artigo a artigo) que é de fato construção civil (CNAE 41/42/43) vs. imóveis em geral
(inclui 68xx) — submeter ao Dr. José (`blocked-legal-gate`) **antes** de qualquer UPDATE. Nenhum UPDATE em produção sem aprovação P.O.

---

**Não fazer:** UPDATE em produção · fechar #1607 · alterar o motor sem aprovação. Tudo read-only exceto o UPDATE de **staging** do DM-1.

FIM.
