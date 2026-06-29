# Pacote de Curadoria — Dr. José
## Categorias de Risco Pendentes de Gate Jurídico

**De:** CC (Orquestrador)  
**Para:** Dr. José (Curador Jurídico)  
**Data:** 2026-06-29  
**Contexto:** Despacho 29/06/2026 · Fase 1 bloqueada até gate jurídico  
**Objetivo:** Aprovação de severidade + artigo-fonte por categoria → desbloqueia Fase 1 (taxonomia) e Fase 3a (8 regras Path B)

---

## Instruções para o Dr. José

Para cada categoria abaixo, confirme ou corrija:
1. **Severidade proposta** — `alta` / `media` / `oportunidade`
2. **Artigo-fonte principal** — artigo da LC 214/2025 ou Decreto 12.955/2026 que fundamenta a categoria
3. **CNAEs elegíveis** — se a categoria é setorial, quais CNAEs se qualificam

Responda com: `[CÓDIGO] OK` ou `[CÓDIGO] CORRIGIR: severidade=X, artigo=Y, cnae=Z`

---

## Grupo A — Categorias de Risco Existentes com Lacuna de Curadoria

As categorias abaixo já existem no banco (`normative_status = 'confirmed'`) mas têm lacunas identificadas pelo CC que precisam de validação jurídica antes da Fase 1.

### A1 — `risco_art_269_270` (Cadastro de Obra / CIB)

| Campo | Valor atual | Pergunta ao Dr. José |
|-------|-------------|----------------------|
| Severidade | `media` | Correto? O não-cadastro no CIB pode gerar glosa de crédito — seria `alta`? |
| Artigo-fonte | `Art. 269 e 270` | Correto? O Decreto 12.955 Arts. 388–390 complementam — devem ser incluídos? |
| CNAEs elegíveis | `4120-4, 4110-7, 4211-1, 4213-8` | Correto? CNAE 4213-8 (obras de arte especiais) deve ser incluído? |
| Urgência | `curto_prazo` | Correto? CIB entra em vigor em 2027 — seria `imediata` para preparação? |

**Base legal:** LC 214/2025 Arts. 269–270 + Decreto 12.955/2026 Arts. 388–390 (obrigação de cadastro de obra no CIB e apuração por empreendimento de construção civil).

---

### A2 — `regime_especifico_imoveis` (Redução 50% — Oportunidade)

| Campo | Valor atual | Pergunta ao Dr. José |
|-------|-------------|----------------------|
| Severidade | `oportunidade` | Correto? |
| Artigo-fonte | `Art. 251` | Correto? Arts. 252–270 são o regime completo — o artigo-fonte deve ser `Art. 251 a 270`? |
| CNAEs elegíveis | `4120-4, 4110-7, 6810-2, 6822-6` | Correto? CNAE 4211-1 (construção de rodovias) deve ser incluído? |

**Base legal:** LC 214/2025 Art. 261 caput — redução de 50% na base de cálculo do IBS/CBS nas operações com bens imóveis (construção, incorporação, alienação, intermediação).

---

### A3 — `regime_diferenciado_reabilitacao_urbana` (Alíquota Reduzida — Reabilitação)

| Campo | Valor atual | Pergunta ao Dr. José |
|-------|-------------|----------------------|
| Severidade | `oportunidade` | Correto? |
| Artigo-fonte | `Art. 234` | Correto? |
| CNAEs elegíveis | `4120-4, 4110-7, 4211-1, 4213-8` | Correto? O Art. 234 restringe a "reabilitação de edificações" — todos esses CNAEs se qualificam? |

**Base legal:** LC 214/2025 Art. 234 — regime diferenciado para reabilitação urbana de edificações com destinação habitacional.

---

## Grupo B — Novas Categorias Propostas (Path B — 8 regras)

As categorias abaixo **não existem no banco** e precisam de aprovação jurídica para serem criadas na Fase 1.

### B1 — `risco_redutor_ajuste` (Redutor de Ajuste — Risco)

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_redutor_ajuste` | |
| Nome | "Risco de perda do Redutor de Ajuste" | |
| Severidade proposta | `alta` | |
| Artigo-fonte | `Art. 257 LC 214/2025 + Arts. 360–362 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `imediata` | |
| Justificativa | O Redutor de Ajuste (Art. 257) compensa a tributação na transição 2026–2032. Perda por não-habilitação ou cálculo incorreto é irreversível. | |

**Base legal:** LC 214/2025 Art. 257 + Decreto 12.955/2026 Arts. 360–362. O Redutor de Ajuste é calculado sobre o custo histórico dos imóveis em estoque em 31/12/2026.

---

### B2 — `risco_sinter_avaliacao` (SINTER — Avaliação dos Imóveis)

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_sinter_avaliacao` | |
| Nome | "Risco de divergência na avaliação SINTER" | |
| Severidade proposta | `alta` | |
| Artigo-fonte | `Art. 256 LC 214/2025 + Arts. 363–364 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `imediata` | |
| Justificativa | O SINTER (Sistema Nacional de Gestão de Informações Territoriais) será a base de avaliação dos imóveis para fins do IBS/CBS. Divergência entre valor SINTER e valor contábil pode gerar autuação. | |

---

### B3 — `risco_permuta_imoveis` (Permuta — Risco)

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_permuta_imoveis` | |
| Nome | "Risco tributário na permuta de imóveis" | |
| Severidade proposta | `alta` | |
| Artigo-fonte | `Art. 259 LC 214/2025 + Arts. 365–366 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `curto_prazo` | |
| Justificativa | A permuta de imóveis tem tratamento específico no regime LC 214 (Art. 259). O não-reconhecimento da torna e do valor de mercado pode gerar base de cálculo incorreta. | |

---

### B4 — `risco_controle_empreendimento` (Controle por Empreendimento)

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_controle_empreendimento` | |
| Nome | "Risco de apuração incorreta por empreendimento" | |
| Severidade proposta | `alta` | |
| Artigo-fonte | `Art. 270 LC 214/2025 + Arts. 370–371 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `imediata` | |
| Justificativa | A LC 214 exige apuração segregada por empreendimento (Art. 270). Empresas com múltiplos empreendimentos simultâneos precisam de sistema de controle específico. | |

---

### B5 — `risco_cib_cadastro` (CIB — Cadastro de Obra)

> **Nota:** Esta categoria pode ser consolidada com `risco_art_269_270` (A1) ou mantida separada se o Dr. José entender que o risco de não-cadastro no CIB é distinto do risco de apuração por empreendimento.

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_cib_cadastro` | |
| Nome | "Risco de não-cadastro no CIB (Cadastro de Imóveis e Benfeitorias)" | |
| Severidade proposta | `alta` | |
| Artigo-fonte | `Arts. 265–266 LC 214/2025 + Arts. 367–368 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `imediata` | |
| Consolidar com A1? | Sim / Não | |

---

### B6 — `risco_custos_historicos` (Custos Históricos 2027)

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_custos_historicos` | |
| Nome | "Risco de não-levantamento dos custos históricos até 31/12/2026" | |
| Severidade proposta | `alta` | |
| Artigo-fonte | `Art. 258 LC 214/2025 + Arts. 361–362 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `imediata` | |
| Justificativa | O Redutor de Ajuste (B1) é calculado sobre o custo histórico dos imóveis em estoque em 31/12/2026. Empresas que não levantarem esses custos até essa data perdem o direito ao redutor. | |

---

### B7 — `risco_tributacao_parcelas` (Tributação por Parcelas)

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_tributacao_parcelas` | |
| Nome | "Risco de tributação incorreta em vendas parceladas" | |
| Severidade proposta | `media` | |
| Artigo-fonte | `Art. 262 LC 214/2025 + Art. 372 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `curto_prazo` | |
| Justificativa | A LC 214 tem regras específicas para o momento de incidência do IBS/CBS em vendas parceladas de imóveis (Art. 262). Aplicação incorreta gera tributação antecipada ou postergada. | |

---

### B8 — `risco_revisao_contratos` (Revisão de Contratos)

| Campo | Proposta CC | Decisão Dr. José |
|-------|-------------|-----------------|
| Código | `risco_revisao_contratos` | |
| Nome | "Risco de contratos sem cláusula de revisão tributária" | |
| Severidade proposta | `media` | |
| Artigo-fonte | `Arts. 263–264 LC 214/2025 + Arts. 365–366 Decreto 12.955/2026` | |
| CNAEs elegíveis | `41, 42, 43, 68` | |
| Urgência proposta | `curto_prazo` | |
| Justificativa | Contratos de compra e venda de imóveis firmados antes de 2026 podem não ter cláusula de revisão para a nova tributação. Risco de absorção do IBS/CBS pela construtora. | |

---

## Grupo C — Categorias com Pendência de Vigência

As categorias abaixo existem no banco com `normative_status = 'pending_vigency'`. O Dr. José deve confirmar se a vigência já está definida.

| Código | Artigo-fonte | Vigência prevista | Ação |
|--------|-------------|-------------------|------|
| `credito_presumido_bens_usados` | Art. 258 LC 214 | Não definida | Confirmar vigência ou manter bloqueada |
| `credito_presumido_reciclagem` | Art. 256 LC 214 | Não definida | Confirmar vigência ou manter bloqueada |
| `regime_diferenciado_produtor_rural_credito` | Art. 245 LC 214 | Não definida | Confirmar vigência ou manter bloqueada |

---

## Resumo das Decisões Solicitadas

| # | Categoria | Ação | Decisão Dr. José |
|---|-----------|------|-----------------|
| A1 | `risco_art_269_270` | Confirmar severidade (`media` → `alta`?) + urgência | |
| A2 | `regime_especifico_imoveis` | Confirmar artigo-fonte + CNAEs | |
| A3 | `regime_diferenciado_reabilitacao_urbana` | Confirmar CNAEs elegíveis | |
| B1 | `risco_redutor_ajuste` | Aprovar criação (severidade `alta`, Art. 257) | |
| B2 | `risco_sinter_avaliacao` | Aprovar criação (severidade `alta`, Art. 256) | |
| B3 | `risco_permuta_imoveis` | Aprovar criação (severidade `alta`, Art. 259) | |
| B4 | `risco_controle_empreendimento` | Aprovar criação (severidade `alta`, Art. 270) | |
| B5 | `risco_cib_cadastro` | Aprovar criação OU consolidar com A1 | |
| B6 | `risco_custos_historicos` | Aprovar criação (severidade `alta`, Art. 258) | |
| B7 | `risco_tributacao_parcelas` | Aprovar criação (severidade `media`, Art. 262) | |
| B8 | `risco_revisao_contratos` | Aprovar criação (severidade `media`, Arts. 263–264) | |
| C1 | `credito_presumido_bens_usados` | Confirmar vigência | |
| C2 | `credito_presumido_reciclagem` | Confirmar vigência | |
| C3 | `regime_diferenciado_produtor_rural_credito` | Confirmar vigência | |

---

## Impacto após gate jurídico

Com as 11 categorias aprovadas (B1–B8 + A1 revisada), a Fase 1 pode:
1. Criar as 8 novas entradas em `risk_categories` (B1–B8)
2. Atualizar `severidade` e `artigo_base` das 3 categorias existentes (A1–A3)
3. Desbloquear a Fase 3a (8 regras Path B em `normative-inference.ts`)
4. Desbloquear a Fase 3b (5 riscos Path A — perguntas SOLARIS para CNAE 41/42/43/68)

**Resultado esperado:** construtora com CNAE `4120-4/00` passará de **3 categorias** (atual) para **11 categorias** na matriz de riscos.

---

*Pacote gerado por CC (Orquestrador) em 2026-06-29. Base: banco de produção (READ-ONLY) + código-fonte `main` HEAD `8d717fcd1e5c`.*
