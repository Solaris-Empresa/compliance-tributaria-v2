# ADR-0025 — Categorias de Risco Configuráveis via Banco + RAG Sensor
## Status: Aceito · Data: 2026-04-09
## `docs/adr/ADR-0025-risk-categories-configurable-rag-sensor.md`

---

## Contexto

O engine de riscos v4 tem 10 categorias da LC 214/2025 hardcoded
no `SEVERITY_TABLE` e como ENUM no schema `risks_v4.categoria`.

A LC 214/2025 tem vigência até 2032 com 4 fases legislativas.
Cada fase pode gerar novas categorias ou alterar severidade das existentes.
Com ENUM hardcoded, cada mudança requer deploy de código —
inaceitável para produto jurídico com meta de 98% de confiabilidade.

---

## Gaps resolvidos

| Gap | Problema | Solução |
|---|---|---|
| GAP-ARCH-06 | Categorias sem validade temporal | `vigencia_inicio` + `vigencia_fim` (NULL = indeterminada) |
| GAP-ARCH-07 | Projetos antigos ficam desatualizados | Badge "Análise desatualizada" — re-diagnóstico manual |
| GAP-ARCH-08 | Ponto único de falha (Dr. Rodrigues) | SLA 15 dias → P.O. designa substituto da equipe |
| GAP-ARCH-09 | Sensor RAG aprova sem contexto | Painel admin exibe o chunk que gerou a sugestão |

---

## Schema aprovado

```sql
CREATE TABLE risk_categories (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  codigo           VARCHAR(64)   NOT NULL UNIQUE,
  nome             VARCHAR(255)  NOT NULL,
  severidade       ENUM('alta','media','oportunidade') NOT NULL,
  urgencia         ENUM('imediata','curto_prazo','medio_prazo') NOT NULL,
  tipo             ENUM('risk','opportunity') NOT NULL,
  artigo_base      VARCHAR(255)  NOT NULL,
  lei_codigo       VARCHAR(64)   NOT NULL,

  -- Validade temporal
  vigencia_inicio  DATE          NOT NULL,
  vigencia_fim     DATE          NULL,
  -- NULL = vigência indeterminada (não será revogada)
  -- DATE = revogação em data específica

  -- Labels em português (público brasileiro)
  status   ENUM('ativo','sugerido','pendente_revisao','inativo','legado') NOT NULL DEFAULT 'ativo',
  origem   ENUM('lei_federal','regulamentacao','rag_sensor','manual')     NOT NULL,
  escopo   ENUM('nacional','estadual','setorial')                         NOT NULL DEFAULT 'nacional',

  -- Rastreabilidade de aprovação
  sugerido_por     VARCHAR(100)  NULL,
  aprovado_por     VARCHAR(100)  NULL,
  aprovado_at      TIMESTAMP     NULL,
  chunk_origem_id  INT           NULL, -- FK rag_chunks (para GAP-ARCH-09)

  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Labels em português — vocabulário oficial

### status
| Valor | Significado |
|---|---|
| `ativo` | Em uso no engine — gera riscos para clientes |
| `sugerido` | Aguardando aprovação do Dr. Rodrigues ou substituto |
| `pendente_revisao` | Aprovado mas com ajuste solicitado |
| `inativo` | Revogado / fora de vigência — não gera mais riscos |
| `legado` | Categoria das 4 áreas antigas (pré-LC 214) — apenas histórico |

### origem
| Valor | Significado |
|---|---|
| `lei_federal` | LC 214/2025 e leis federais complementares |
| `regulamentacao` | CGIBS, Receita Federal, regulamentação infralegal |
| `rag_sensor` | Sugerido automaticamente pelo sensor RAG |
| `manual` | Inserido manualmente pela equipe SOLARIS |

### escopo
| Valor | Significado |
|---|---|
| `nacional` | Válido para todo o Brasil |
| `estadual` | Específico de estado(s) — ex: ICMS residual |
| `setorial` | Específico de setor/CNAE — ex: agronegócio |

---

## Engine lê do banco — não do código

```typescript
// ANTES (hardcode — problema):
const SEVERITY_TABLE = { imposto_seletivo: 'alta', ... }

// DEPOIS (banco — correto):
export async function loadRiskCategories(): Promise<RiskCategoryMap> {
  return db.query(`
    SELECT codigo, severidade, urgencia, tipo, artigo_base
    FROM risk_categories
    WHERE status = 'ativo'
    AND vigencia_inicio <= CURDATE()
    AND (vigencia_fim IS NULL OR vigencia_fim >= CURDATE())
  `)
  // Cache em memória: TTL 1 hora
}
```

---

## Pipeline RAG Sensor

```
Gatilho: pnpm rag:ingest (novo documento no corpus)
       ↓
rag-category-sensor.ts analisa chunks novos por embeddings
       ↓
Detecta artigos sem categoria ativa mapeada
       ↓
INSERT risk_categories (status='sugerido', origem='rag_sensor',
                        chunk_origem_id = chunk que gerou)
       ↓
Painel admin: Dr. Rodrigues vê sugestão + lê o chunk de origem
              → aprova (preenche severidade, urgência, vigência)
              → ou rejeita com motivo
       ↓
Se aprovado: status='ativo' → engine usa na próxima geração (TTL 1h)
```

---

## Política de validade (GAP-ARCH-06)

```
vigencia_fim = NULL → categoria permanente (vigência indeterminada)
vigencia_fim = DATE → engine ignora após esta data automaticamente

Exemplos:
  transicao_iss_ibs: vigencia_fim = '2032-12-31' (encerra com a reforma)
  imposto_seletivo:  vigencia_fim = NULL (permanente na LC 214)
```

---

## Política de aprovação (GAP-ARCH-08)

```
SLA: 15 dias corridos para aprovação após sugestão criada
Após 15 dias: alerta automático para P.O. (Uires Tapajós)
P.O. designa substituto da equipe disponível — não fixo
Sugestão com confiança < 70%: arquivada sem alerta
```

---

## Política de retroatividade (GAP-ARCH-07)

```
Projetos existentes NÃO são re-analisados automaticamente.
Campo projects.ultima_analise_at registra data do diagnóstico.
Badge exibido: "Análise desatualizada — nova categoria disponível"
Advogado decide se re-executa o diagnóstico.
```

---

## Seed inicial — 10 categorias atuais

```sql
INSERT INTO risk_categories
  (codigo, nome, severidade, urgencia, tipo, artigo_base, lei_codigo,
   vigencia_inicio, vigencia_fim, status, origem, escopo) VALUES
('imposto_seletivo',    'Imposto Seletivo',              'alta','imediata',    'risk',        'Art. 2 LC 214/2025',    'LC-214-2025','2026-01-01',NULL,         'ativo','lei_federal','nacional'),
('confissao_automatica','Confissão Automática',           'alta','imediata',    'risk',        'Art. 45 LC 214/2025',   'LC-214-2025','2026-01-01',NULL,         'ativo','lei_federal','nacional'),
('split_payment',       'Split Payment',                  'alta','imediata',    'risk',        'Art. 9 LC 214/2025',    'LC-214-2025','2026-01-01',NULL,         'ativo','lei_federal','nacional'),
('inscricao_cadastral', 'Inscrição Cadastral IBS/CBS',    'alta','imediata',    'risk',        'Art. 213 LC 214/2025',  'LC-214-2025','2026-01-01',NULL,         'ativo','lei_federal','nacional'),
('regime_diferenciado', 'Regime Diferenciado',            'media','curto_prazo','risk',        'Art. 29 LC 214/2025',   'LC-214-2025','2026-01-01',NULL,         'ativo','lei_federal','nacional'),
('transicao_iss_ibs',   'Transição ISS para IBS',         'media','medio_prazo','risk',        'Arts. 6-12 LC 214/2025','LC-214-2025','2026-01-01','2032-12-31','ativo','lei_federal','nacional'),
('obrigacao_acessoria', 'Obrigação Acessória',            'media','curto_prazo','risk',        'Art. 102 LC 214/2025',  'LC-214-2025','2026-01-01',NULL,         'ativo','lei_federal','nacional'),
('aliquota_zero',       'Alíquota Zero',                  'oportunidade','curto_prazo','opportunity','Art. 14 LC 214/2025','LC-214-2025','2026-01-01',NULL,    'ativo','lei_federal','nacional'),
('aliquota_reduzida',   'Alíquota Reduzida',              'oportunidade','curto_prazo','opportunity','Art. 24 LC 214/2025','LC-214-2025','2026-01-01',NULL,    'ativo','lei_federal','nacional'),
('credito_presumido',   'Crédito Presumido',              'oportunidade','curto_prazo','opportunity','Art. 58 LC 214/2025','LC-214-2025','2026-01-01',NULL,    'ativo','lei_federal','nacional');
```

Nota: `transicao_iss_ibs` tem `vigencia_fim = '2032-12-31'` —
encerra quando a transição ISS→IBS estiver completa.

---

## Rastreabilidade

- Resolve: GAP-ARCH-06 · GAP-ARCH-07 · GAP-ARCH-08 · GAP-ARCH-09
- Relacionado: ADR-0022 · ADR-0023 · ADR-0024
- Sprint: Z-09
- P.O.: Uires Tapajós · 2026-04-09

---

*IA SOLARIS · ADR-0025 · 2026-04-09*
