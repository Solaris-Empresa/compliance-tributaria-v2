# Auditoria — os 13 riscos do Dr. José na plataforma (projeto-teste 10860001)

> **Objeto:** projeto `10860001` (teste — construção edifícios, CNAE 4120-4/00, lucro_real, greenfield wizard).
> **Fonte primária:** `riscos-nao-identificados.pdf` (Dr. José — "Principais riscos para uma construtora", 13 riscos).
> **Evidência de banco:** DESPACHO-AUDIT-10860001 (Manus, 7 queries read-only, 30/06). **De:** Claude Code · Issue #1607.
> **Pergunta:** temos os 13 riscos do Dr. José aparecendo (briefing + matriz + plano) ou não?

## Resposta

**SIM — os 13 riscos agora têm correspondência na matriz v4 em produção** (vs. ZERO no teste original do Dr. José). A *qualidade* da correspondência varia: 8 com categoria própria dedicada, 5 por mapeamento/absorção.

## Tabela de cobertura (13 Dr. José × matriz 10860001)

| # | Risco (Dr. José) | Categoria na matriz | Conf | Cobertura |
|---|---|---|---|---|
| 1 | **Créditos/gestão obra** (*o "maior risco"*) | risco_cib_cadastro + risco_controle_empreendimento + risco_art_269_270 | 0.64 | ⚠️ **por componentes** — obrigações (CIB + apuração) sim; **estorno de crédito** (Art. 255§5 / Decreto 365) não é risco nomeado |
| 2 | Redutor de Ajuste | risco_redutor_ajuste | 0.64 | ✅ dedicada |
| 3 | SINTER | risco_sinter_avaliacao | 0.64 | ✅ |
| 4 | Permuta | risco_permuta_imoveis | 0.41 | ✅ |
| 5 | Empreendimento | risco_controle_empreendimento | 0.64 | ✅ |
| 6 | Doc fiscal da obra | obrigacao_acessoria | 0.97 | ⚠️ transversal genérica |
| 7 | CIB | risco_cib_cadastro | 0.64 | ✅ |
| 8 | Custos < 2027 | risco_custos_historicos | 0.41 | ✅ |
| 9 | Contrapartidas urbanísticas | (dentro de redutor) | — | ⚠️ sem categoria própria |
| 10 | Recálculo posterior | (dentro de parcelas) | — | ⚠️ sem categoria própria |
| 11 | Parcelas | risco_tributacao_parcelas | 0.41 | ✅ |
| 12 | Contratos SPE/SCP | risco_sujeicao_passiva_scp | 0.41 | ✅ |
| 13 | ERP tecnológico | split_payment | 0.97 | ⚠️ transversal genérica |

**Placar:** 8 dedicadas · 1 por componentes (#1) · 2 genéricas (#6, #13) · 2 absorvidas (#9, #10).

## Reconciliação da fonte primária (Art. 365)

O Dr. José cita **um único artigo** em todo o PDF: **"art. 365"** no risco #1. Texto dele = crédito de construção civil a não-contribuinte + contabilidade por obra/CIB + estorno → é o **Art. 365 do Decreto 12.955** (= LC 214 **Art. 255 §5º**), **NÃO** o Art. 365 da LC 214 (alíquotas 2033). **Dr. José estava certo** (citava o Decreto). Os demais artigos (257, 256, 252§2º, 270...) são **curadoria da plataforma** (gate Dr. José, Lição #133), não citações dele. O erro "permuta = Art. 259" foi da transcrição secundária, **nunca do Dr. José** (a fonte dele não traz número).

## Resultados das 7 queries (auditados)

| Q | Resultado | Veredito |
|---|---|---|
| Q1 | 16 riscos (8 Fase 3a inferred 0.64/0.41 + 5 SOLARIS 0.97 + 1 regulatório + 1 oportunidade + risco_art_269_270) | ✅ Fase 3a viva |
| Q2 | 15 planos, todos `aprovado` | ✅ |
| Q3 | 4 condicionais (0.41) **têm 1 plano cada** | ⚠️ falso-aplicável vira plano c/ prazo (TB-1 #1640) |
| Q4 | oportunidade `regime_especifico_imoveis` = **0 planos** | ✅ RN-AP-09 (`action-plan-engine-v4.ts:106`) — a Obs #4 da tabela comparativa estava **errada** (criar plano violaria a regra) |
| Q5 | `taxRegime` raiz=`null` · `companyProfile.taxRegime`=`"lucro_real"` | ✅ CR-01 funciona (engine lê do JSON). Coluna raiz vazia = dual-storage (Lição #140) — backfill é hardening opcional, NÃO a issue de confidence |
| Q6 | 8 Fase 3a **sem gap** (Path B inferido do CNAE) · 3 gaps sem risco (aliquota_reduzida, credito_presumido, imposto_seletivo) | ✅ esperado · 3 gaps = candidatos Fase 3b |
| **Q7** | cnaeAnswers=null (Form Wizard) · **149 gaps reais** · criado 30/06 | ✅ **greenfield wizard PURO — fecha #1644** |

## Achado AUDIT-CC-1 — o #1 (maior risco) por componentes

`normative-inference.ts`: 0 ocorrências de `255`/`365`/`estorno`. `risco_art_269_270` = "Art. 269 e 270" (cadastro + apuração), não crédito/estorno. As **obrigações-causa** do #1 (CIB + apuração por obra) aparecem; o **mecanismo de perda/estorno de crédito** (Art. 255§5 / Decreto 365) não tem categoria própria. **Decisão jurídica (Dr. José):** se o estorno merece categoria própria → issue separada.

## Conclusões

- ✅ **Reversão da red flag:** do teste do Dr. José com **0/13** aos **13/13 com correspondência** na matriz em produção, com gate setorial e DoD discriminante.
- ⚠️ **Residuais rastreados:** confidence (CONF-1 #1642) · condicionais geram plano (TB-1 #1640) · #6/#13 genéricos · #1 por componentes (issue a abrir) · gate gaps (#1643) · calibração >0.90 (#1645).
- ✅ **#1644 fechável** — greenfield wizard puro provado por 10860001.

## Vinculadas

- #1607 · `riscos-nao-identificados.pdf` (Dr. José, fonte primária) · DESPACHO-AUDIT-10860001 (Manus)
- #1642 CONF-1 · #1640 TB-1 · #1643 gate-gaps · #1644 greenfield-puro (fechar) · #1645 conf>0.90
- `normative-inference.ts:251-258` · `action-plan-engine-v4.ts:106` · [[Lição #133]] · [[Lição #140]]
