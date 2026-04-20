# Fluxo E2E — Questionário SOLARIS (Onda 1)

> Documento de contexto para consultor externo.
> Última atualização: 2026-04-20 · Baseline: v7.19 (produção `iasolaris.manus.space`)
> Fonte da verdade: código em `server/routers/solarisAdmin.ts` + `server/lib/solaris-query.ts` + `drizzle/schema.ts`

---

## 1. Contexto de negócio

A plataforma **IA SOLARIS** é uma ferramenta de apoio à decisão para compliance tributário sob a **Reforma Tributária brasileira** (LC 214/2025, EC 132/2023, CGIBS). Advogados e equipes fiscais usam a plataforma para:

1. Criar projetos associados a uma ou mais empresas (CNPJ + CNAEs)
2. Responder um diagnóstico estruturado em **3 ondas de perguntas** (ver §2)
3. Gerar um briefing, matriz de risco e plano de ação

## 2. Arquitetura de 3 ondas de perguntas

Cada projeto passa por 3 ondas sequenciais de perguntas. Cada onda tem uma **fonte diferente** e uma **regra de prioridade diferente** no diagnóstico.

| Onda | Fonte | Característica | Quem cria |
|---|---|---|---|
| **1ª — SOLARIS** | Curadoria jurídica | Perguntas escritas e revisadas por advogados SOLARIS. Zero IA. | **Equipe jurídica via CSV upload** (este documento) |
| **2ª — IA Generativa** | IA Generativa | Perguntas dinâmicas geradas por LLM com base no perfil da empresa + RAG validado | Sistema (LLM + RAG) |
| **3ª — CNAE / Regulatório** | RAG (corpus de leis) | Perguntas pré-curadas por categoria CNAE (QCNAE-01 a QCNAE-05) | Corpus regulatório ingerido |

A **Onda 1 (SOLARIS)** é a mais crítica: captura conhecimento tácito dos advogados que o LLM e o RAG não conseguem reproduzir.

## 3. Fluxo E2E do questionário SOLARIS

```
┌──────────────────────────────┐
│  ETAPA 1 — CURADORIA         │
│  Advogados SOLARIS           │
│  escrevem perguntas em CSV   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  ETAPA 2 — UPLOAD            │
│  /admin/solaris-questions    │
│  role: equipe_solaris        │
│  • Dry-run (preview)         │
│  • Validação por linha       │
│  • Confirmação → INSERT      │
│  • Lote rastreável           │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  ETAPA 3 — ARMAZENAMENTO     │
│  Tabela: solaris_questions   │
│  Identificação: código       │
│  SOL-XXX + upload_batch_id   │
│  Estado: ativo=1 / 0 (soft)  │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  ETAPA 4 — MATCHING          │
│  Usuário cria projeto        │
│  com CNAEs confirmados       │
│  Sistema chama:              │
│  querySolarisByCnaes(cnaes)  │
│  Filtra por cnaeGroups       │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  ETAPA 5 — EXIBIÇÃO          │
│  Questionário SOLARIS        │
│  (badge azul "Equipe         │
│   Jurídica SOLARIS")         │
│  Usuário responde S/N/N/A    │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  ETAPA 6 — RESPOSTAS         │
│  Tabela: solaris_answers     │
│  (projectId, questionId,     │
│   codigo, resposta)          │
│  Idempotente (UPSERT)        │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  ETAPA 7 — PIPELINE          │
│  Respostas alimentam:        │
│  • Geração de Briefing (IA)  │
│  • Matriz de Riscos v4       │
│  • Plano de Ação             │
└──────────────────────────────┘
```

## 4. Contratos de dados

### 4.1 Tabela `solaris_questions` (origem das perguntas)

```sql
CREATE TABLE solaris_questions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(20)  NOT NULL UNIQUE,    -- ex: SOL-001
  titulo        VARCHAR(500) NOT NULL,
  texto         TEXT         NOT NULL,            -- corpo da pergunta
  topicos       TEXT         NOT NULL,            -- "kw1;kw2;kw3"
  cnae_groups   JSON         NULL,                -- null = universal
  categoria     VARCHAR(100) NOT NULL,            -- área temática
  severidade_base ENUM('baixa','media','alta','critica') NOT NULL,
  vigencia_inicio DATE       NULL,
  risk_category_code VARCHAR(100) NULL,           -- FK risk_categories.codigo
  classification_scope ENUM('risk_engine','diagnostic_only') DEFAULT 'risk_engine',
  upload_batch_id VARCHAR(36) NOT NULL,           -- rastreabilidade
  ativo         TINYINT      NOT NULL DEFAULT 1,  -- soft delete
  obrigatorio   TINYINT      NOT NULL DEFAULT 1,
  criado_em     BIGINT       NOT NULL,
  atualizado_em BIGINT       NOT NULL
);
```

### 4.2 Tabela `solaris_answers` (respostas do usuário)

```sql
CREATE TABLE solaris_answers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  projectId  INT NOT NULL,
  questionId INT NOT NULL,                        -- FK solaris_questions.id
  codigo     VARCHAR(20) NOT NULL,                -- denormalizado para rastreio histórico
  resposta   TEXT NOT NULL,                       -- S/N/N_A/livre
  respondido_em BIGINT NOT NULL,
  UNIQUE KEY (projectId, questionId)
);
```

## 5. Regra de matching CNAE

Implementada em `server/lib/solaris-query.ts`:

```typescript
export async function querySolarisByCnaes(cnaes: string[]): Promise<SolarisQuestion[]> {
  const all = await getOnda1Questions();  // filtra ativo=1
  if (cnaes.length === 0) return all;
  return all.filter(q => {
    if (!q.cnaeGroups) return true;            // null/vazio → universal
    const groups = parseJsonOrCsv(q.cnaeGroups);
    return cnaes.some(cnae =>
      groups.some(g => cnae.startsWith(g) || g.startsWith(cnae))
    );
  });
}
```

**Regras:**
- `cnaeGroups = null` ou `[]` → **universal** (aparece para todos)
- `cnaeGroups = ["46"]` → aparece em projetos com CNAE iniciado por `46` (comércio)
- `cnaeGroups = ["4639-7/01"]` → aparece em projetos com esse CNAE exato
- Matching é **prefix bidirecional**: `cnae.startsWith(group) || group.startsWith(cnae)`

## 6. Fluxo de validação no upload

Estágio | Responsável | Ação
---|---|---
**Upload** | UI `/admin/solaris-questions` | Usuário escolhe arquivo `.csv` (UTF-8, separador vírgula)
**Parse** | Backend `parseCsv()` | Detecta header, separa linhas, ignora comentários `#...`
**Validação Zod** | `CsvRowSchema.safeParse()` | Valida cada linha contra schema (ver §7)
**Dry-run** | Backend | Retorna `{valid: N, invalid: [{line, error}]}` sem persistir
**Confirmação** | UI | Usuário aprova → `uploadMutation.mutate({dryRun: false})`
**INSERT** | Backend | Transação com `upload_batch_id` UUID gerado por lote
**Rastreio** | Tabela `solaris_upload_batches` | Registra (id, uploaded_by, uploaded_at, total)

## 7. Tolerância e erros

**Critério conservador:** se qualquer linha falha no dry-run, a UI destaca mas **permite publicar as linhas válidas**. Usuário decide se quer parcial ou corrigir tudo antes.

**Erros comuns:**
- `Número de colunas inválido: esperado 9, encontrado 7` → CSV com colunas faltando
- `Campo 'titulo' é obrigatório` → célula vazia em coluna obrigatória
- `Invalid enum value. Expected 'baixa' | 'media' | 'alta' | 'critica'` → typo em severidade
- `Invalid literal value, expected "solaris"` → campo `lei` com outro valor
- `Expected string, received null` → ausência de aspas em valor com vírgula

## 8. Estado pós-upload

Após confirmar upload:
1. Questões vão para `solaris_questions` com `ativo=1`
2. Lote recebe `upload_batch_id` único
3. Histórico visível em `/admin/solaris-questions` aba **Histórico de Lotes**
4. Soft-delete disponível: `solarisAdmin.deleteBatch({upload_batch_id})` desativa todas as questões do lote
5. Rollback: `solarisAdmin.restoreQuestions({ids})` reativa individualmente

## 9. Referências de código (fonte da verdade)

| Arquivo | Responsabilidade |
|---|---|
| `server/routers/solarisAdmin.ts` | tRPC procedures (uploadCsv, listQuestions, deleteBatch, etc.) |
| `server/lib/solaris-query.ts` | Matching CNAE → perguntas aplicáveis |
| `server/db.ts` (L1262) | `getOnda1Questions()` — query com filtro `ativo=1` |
| `drizzle/schema.ts` (L1654) | Schema da tabela `solaris_questions` |
| `client/src/pages/AdminSolarisQuestions.tsx` | UI de upload/listagem/histórico (956 linhas) |
| `client/public/template-solaris-questions.csv` | Template CSV baixável |
| `docs/uat/solaris-questions-uat-v1.csv` | Exemplo de CSV válido com 12 perguntas (SOL-013..SOL-025) |

## 10. Próximos passos para o consultor

Para validar as 2 listas enviadas pelos advogados:

1. Ler a **spec técnica do CSV** em `ONDA-1-SOLARIS-CSV-SPEC.md` (arquivo irmão deste)
2. Normalizar os campos das listas para o schema
3. Gerar CSV final pronto para upload via `/admin/solaris-questions`
4. Sugerir códigos `SOL-XXX` sequenciais a partir do último já publicado (ex: se último é `SOL-025`, novas começam em `SOL-026`)

---

*Documento gerado a partir do código fonte em 2026-04-20. Se código mudar, este arquivo pode ficar desatualizado — verificar contra os arquivos de referência (§9).*
