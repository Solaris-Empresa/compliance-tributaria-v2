# CORPUS BASELINE — IA SOLARIS RAG

> **Versão:** v2.0
> **Data:** 2026-03-30
> **Commit HEAD no momento do inventário:** 465af7b3 (Sprint L — Entregáveis 1+2)
> **Sprint de referência:** Sprint L (pós-execução — DEC-002 + AdminSolarisQuestions)
> **Autor do inventário:** Manus AI
> **Aprovado por:** Uires Tapajós (P.O.)
>
> **Instrução de atualização:** a cada ingestão, correção ou RFC de corpus,
> incrementar a versão, registrar data/commit e atualizar as seções 1, 2 e 3.
> Nunca atualizar este arquivo sem um PR associado.

---

## Sumário

1. [Totais e Integridade](#1-totais-e-integridade)
2. [Distribuição por Lei](#2-distribuição-por-lei)
3. [Rastreabilidade de Origem (campo `autor`)](#3-rastreabilidade-de-origem-campo-autor)
4. [Schema da Tabela `ragDocuments`](#4-schema-da-tabela-ragdocuments)
5. [Histórico de Migrations da Tabela](#5-histórico-de-migrations-da-tabela)
6. [Arquitetura do Retriever](#6-arquitetura-do-retriever)
7. [Scripts de Ingestão](#7-scripts-de-ingestão)
8. [Padrão Canônico de `anchor_id`](#8-padrão-canônico-de-anchor_id)
9. [Procedures do Cockpit RAG (`ragAdmin`)](#9-procedures-do-cockpit-rag-ragadmin)
10. [Anomalias Documentadas e RFCs](#10-anomalias-documentadas-e-rfcs)
11. [Gold Set de Queries de Referência](#11-gold-set-de-queries-de-referência)
12. [Guia de Operações — Ingestão, RFC e Incidente](#12-guia-de-operações--ingestão-rfc-e-incidente)
13. [Classificação de Incidentes](#13-classificação-de-incidentes)
14. [Histórico de Versões deste Documento](#14-histórico-de-versões-deste-documento)

---

## 1. Totais e Integridade

| Indicador                   | Valor                                      |
|-----------------------------|--------------------------------------------|
| **Total de chunks**         | **2.078**                                  |
| Chunks com `anchor_id`      | 2.078 (100%)                               |
| Chunks sem `anchor_id`      | 0                                          |
| `anchor_id` duplicados      | 0                                          |
| Leis ativas no corpus       | 5 (`lc214`, `ec132`, `lc227`, `lc224`, `lc123`) |
| Autores rastreáveis         | 4 (100% dos chunks com autor identificado) |
| Anomalias abertas (P0/P1)   | 0 — Sprint G concluída                     |
| Primeiro chunk inserido     | 2026-03-18 12:08:08 UTC                    |
| Último chunk inserido       | 2026-03-26 14:13:29 UTC                    |
| Confiabilidade do corpus    | **100%** (pós-Sprint G)                    |

O corpus está íntegro e pronto para uso em produção. Todos os 2.078 chunks possuem `anchor_id` único e autor rastreável. Nenhuma anomalia crítica (P0) está aberta.

---

## 2. Distribuição por Lei

| lei     | total_chunks | %     | id_min | id_max | status                                          |
|---------|-------------|-------|--------|--------|-------------------------------------------------|
| `lc214` | 1.573        | 75,7% | 1      | 30.839 | ✅ Íntegro                                      |
| `lc227` | 434          | 20,9% | 808    | 1.241  | ✅ RFC-001 executada · id 810 fusionado          |
| `lc224` | 28           | 1,3%  | 780    | 807    | ✅ Íntegro                                      |
| `lc123` | 25           | 1,2%  | 664    | 722    | ✅ RFC-002 executada · migrado de `lc214`        |
| `ec132` | 18           | 0,9%  | 30.840 | 30.857 | ✅ Íntegro                                      |
| **Total** | **2.078**  | 100%  | —      | —      | —                                               |

> **NOTA:** ids 780–807 (28 chunks, `lei=lc224`) auditados e **CORRETOS** — não foram pendência.
> id 632 (Art. 35 / Lei 9.430/1996) preservado como `lc214` — reclassificação pendente em RFC-003 futura.

---

## 3. Rastreabilidade de Origem (campo `autor`)

O campo `autor` é a fonte de rastreabilidade de cada chunk. Todo chunk inserido a partir da Sprint D possui autor identificado.

| autor                              | total  | leis cobertas                | sprint   |
|------------------------------------|--------|------------------------------|----------|
| `migracao-sprint-d`                | 1.214  | `lc214`, `lc224`, `lc227`    | Sprint D |
| `ingestao-automatica-sprint-d`     | 837    | `ec132`, `lc214`             | Sprint D |
| `correcao-rfc-002-sprint-g-lc123`  | 25     | `lc123`                      | Sprint G |
| `correcao-rfc-001-sprint-g-fusao`  | 2      | `lc227`                      | Sprint G |

Chunks sem `autor` (NULL): **0**. O corpus é 100% rastreável por sprint de origem.

---

## 4. Schema da Tabela `ragDocuments`

A tabela é gerenciada pelo Drizzle ORM e definida em `drizzle/schema.ts`. Abaixo o schema completo com tipo, restrição e descrição de cada campo.

| Campo          | Tipo SQL                      | Restrição           | Descrição                                                                 |
|----------------|-------------------------------|---------------------|---------------------------------------------------------------------------|
| `id`           | `INT AUTO_INCREMENT`          | `PRIMARY KEY`       | Identificador numérico sequencial                                         |
| `lei`          | `ENUM`                        | `NOT NULL`          | Identificador da lei de origem (ver valores abaixo)                       |
| `artigo`       | `VARCHAR(300)`                | `NOT NULL`          | Artigo, parágrafo ou anexo de origem do chunk                             |
| `titulo`       | `VARCHAR(500)`                | `NOT NULL`          | Título descritivo do chunk                                                |
| `conteudo`     | `TEXT`                        | `NOT NULL`          | Texto completo do chunk (mínimo 50 bytes)                                 |
| `topicos`      | `TEXT`                        | `NOT NULL`          | Palavras-chave separadas por vírgula — usadas no LIKE search              |
| `cnaeGroups`   | `VARCHAR(500)`                | `NOT NULL DEFAULT ''` | Grupos CNAE cobertos (ex: `"01,02,46,47"`) — filtragem por setor        |
| `chunkIndex`   | `INT`                         | `NOT NULL DEFAULT 0` | Índice do chunk dentro do artigo (começa em 1 para novos; 0 para legados) |
| `anchor_id`    | `VARCHAR(255)`                | `UNIQUE`, nullable  | Identificador canônico imutável do chunk (ver Seção 8)                    |
| `autor`        | `TEXT`                        | nullable            | Rastreabilidade: sprint/script que inseriu o chunk                        |
| `revisado_por` | `TEXT`                        | nullable            | Quem revisou o chunk (nome ou identificador)                              |
| `data_revisao` | `VARCHAR(30)`                 | nullable            | Data da última revisão no formato `YYYY-MM-DD`                            |
| `createdAt`    | `TIMESTAMP`                   | `NOT NULL DEFAULT now()` | Timestamp de inserção (UTC)                                          |

**Valores do ENUM `lei`** (em ordem de adição ao schema):

```
'lc214', 'ec132', 'lc227', 'lc116', 'lc87',
'cg_ibs', 'rfb_cbs', 'conv_icms', 'lc224', 'lc123', 'solaris'
```

> **Regra de integridade:** `LENGTH(conteudo) >= 50` e `lei IN (valores acima)`. Chunks que violam estas regras são rejeitados pelo `uploadCsv` e reportados como erros de linha.

---

## 5. Histórico de Migrations da Tabela

| Migration                         | Sprint | Alteração principal                                                                 |
|-----------------------------------|--------|-------------------------------------------------------------------------------------|
| `0027_odd_sage.sql`               | C      | **Criação** da tabela `ragDocuments` com 9 campos base                              |
| `0028_gigantic_spitfire.sql`      | C/D    | Ampliar ENUM `lei` (+ `cg_ibs`, `rfb_cbs`, `conv_icms`) · `artigo` → `VARCHAR(100)` |
| `0032_powerful_lady_ursula.sql`   | D      | ENUM `lei` + `lc224` · `artigo` → `VARCHAR(300)` (suporte a títulos de Anexos)     |
| `0054_keen_maria_hill.sql`        | G      | `artigo` → `VARCHAR(300)` · ADD `anchor_id UNIQUE` · ADD `autor`, `revisado_por`, `data_revisao` |

> Não há migrations que adicionem `lc123` ao ENUM — o valor foi inserido diretamente via RFC-002 (o ENUM já continha `lc123` implicitamente como valor válido a partir da migration 0054).

---

## 6. Arquitetura do Retriever

O retriever é implementado em `server/rag-retriever.ts` e é chamado pelos routers de assessment (SOLARIS e iAgen) para buscar chunks relevantes ao contexto da pergunta.

### Estratégia de busca (TiDB não suporta FULLTEXT)

O TiDB Cloud (MySQL-compatible) não suporta `FULLTEXT INDEX`. A busca é realizada em duas etapas:

**Etapa 1 — Extração de keywords:** a pergunta do usuário é processada para extrair termos relevantes (stop-words removidas, termos normalizados).

**Etapa 2 — LIKE multi-termo:** para cada keyword, a query busca ocorrências em `titulo`, `topicos` e `conteudo` usando `LIKE '%keyword%'`. Os resultados são combinados com `OR` (qualquer match retorna o chunk).

**Etapa 3 — Filtro por CNAE (opcional):** se o projeto tiver grupos CNAE confirmados, aplica filtro adicional em `cnaeGroups LIKE '%grupo%'`.

```typescript
// Pseudocódigo do retriever (server/rag-retriever.ts)
for (const kw of keywords) {
  conditions.push(
    like(ragDocuments.titulo,   `%${kw}%`),
    like(ragDocuments.topicos,  `%${kw}%`),
    like(ragDocuments.conteudo, `%${kw}%`),
  );
}
if (cnaeGroups.length > 0) {
  for (const g of cnaeGroups) {
    cnaeConditions.push(like(ragDocuments.cnaeGroups, `%${g}%`));
  }
}
```

**Limite padrão:** 20 chunks por chamada. Em caso de falha de conexão, retorna array vazio (fallback gracioso — não quebra o assessment).

### Dependências do retriever

| Arquivo                    | Papel                                                        |
|----------------------------|--------------------------------------------------------------|
| `server/rag-retriever.ts`  | Lógica de busca — única fonte de verdade do retriever        |
| `server/rag-corpus.ts`     | Corpus estático de fallback (chunks EC132 hardcoded)         |
| `drizzle/schema.ts`        | Definição da tabela `ragDocuments` usada pelo Drizzle ORM    |
| `scripts/corpus-utils.mjs` | Funções `normalizeAnchorSegment` e `buildAnchorId` (shared)  |

---

## 7. Scripts de Ingestão

Todos os scripts de ingestão estão em `scripts/` e são **idempotentes** — usam `INSERT ... ON DUPLICATE KEY UPDATE` por `anchor_id UNIQUE`, sendo seguros para re-execução sem duplicatas.

| Script                              | Sprint | Leis cobertas          | Modo de execução                          |
|-------------------------------------|--------|------------------------|-------------------------------------------|
| `ingest-anexos-lc214-2025.mjs`      | D / G4 | `lc214` (Anexos I–XVII) | `--dry-run` / execução real              |
| `ingest-ec132-2023.mjs`             | D / G3 | `ec132`                | `--dry-run` / execução real              |
| `migrate-anchor-id-legado.mjs`      | D      | `lc214`, `lc227`, `lc224` | `--lei <lei> --dry-run` / `--all`     |
| `seed-regulatory-requirements-v3.mjs` | D   | Todos                  | Seed inicial completo                     |
| `corpus-utils.mjs`                  | D+     | —                      | Biblioteca compartilhada (não executar diretamente) |

### Flags comuns

```bash
# Dry-run (valida sem inserir)
node scripts/ingest-anexos-lc214-2025.mjs --dry-run

# Execução real (requer DATABASE_URL no .env)
node scripts/ingest-anexos-lc214-2025.mjs

# Migração de anchor_id para lei específica
node scripts/migrate-anchor-id-legado.mjs --lei lc227 --dry-run
node scripts/migrate-anchor-id-legado.mjs --lei lc227

# Migração de todas as leis
node scripts/migrate-anchor-id-legado.mjs --all --dry-run
node scripts/migrate-anchor-id-legado.mjs --all
```

> **Pré-requisito:** `DATABASE_URL` configurado no `.env` local. Em produção, usar `webdev_execute_sql` para operações pontuais.

---

## 8. Padrão Canônico de `anchor_id`

O `anchor_id` é o identificador imutável de cada chunk. Uma vez atribuído, **nunca deve ser alterado** — é a chave de idempotência do sistema de ingestão e a referência usada em RFCs, gold set e logs de auditoria.

### Formato para chunks novos (Sprint D+)

```
{lei}-{artigo_normalizado}-{chunkIndex}
```

**Exemplos:**
```
lc214-anexo-i-ncm-0101-21-00-animais-vivos-1
ec132-art-149a-par-1-1
lc214-art-45-apuracao-debitos-2
lc227-art-2-split-payment-1
```

### Formato para chunks legados (migrados via `migrate-anchor-id-legado.mjs`)

```
{lei}-art-{artigo_normalizado}-id{id}
```

O sufixo `-id{id}` garante unicidade absoluta para chunks legados sem risco de colisão.

**Exemplos:**
```
lc214-art-art-1-id1
lc227-art-art-2-id808
```

### Regras de normalização (`normalizeAnchorSegment`)

A função canônica está em `scripts/corpus-utils.mjs` e segue estas regras **imutáveis**:

| Passo | Transformação                                | Exemplo                          |
|-------|----------------------------------------------|----------------------------------|
| 1     | Trim de espaços                              | `" Art. 45 "` → `"Art. 45"`     |
| 2     | Lowercase                                    | `"Art. 45"` → `"art. 45"`       |
| 3     | Remover acentos (NFD)                        | `"§"` preservado para passo 4   |
| 4     | `§` → `par-`                                 | `§1º` → `par-1`                 |
| 5     | `º` e `ª` → `""`                            | `1º` → `1`                      |
| 6     | `.` → `-` (suporte a NCM)                   | `0101.21.00` → `0101-21-00`     |
| 7     | `-A` no final de número → concatenar        | `149-A` → `149a`                |
| 8     | Não alfanumérico (exceto `-`) → `-`         | `Art. 45` → `art--45`           |
| 9     | Colapsar múltiplos `-`                       | `art--45` → `art-45`            |
| 10    | Trim de `-` nas bordas                       | `-art-45-` → `art-45`           |

> **Governança crítica:** qualquer alteração nesta função exige (a) novo campo `anchor_id_v2`, (b) migração em lote com PR aprovado pelo P.O., (c) deprecação do campo antigo. Nunca alterar a função sem esse processo.

---

## 9. Procedures do Cockpit RAG (`ragAdmin`)

O router `server/routers/ragAdmin.ts` expõe as seguintes procedures tRPC, todas protegidas por `adminProcedure`:

| Procedure                  | Tipo     | Descrição                                                                 |
|----------------------------|----------|---------------------------------------------------------------------------|
| `ragAdmin.uploadCsv`       | mutation | Upload de CSV para `ragDocuments` — valida, insere e retorna erros por linha |
| `ragAdmin.getStats`        | query    | Contagem total, sem anchor_id e total de leis                             |
| `ragAdmin.getCorpusDistribution` | query | Distribuição por lei com id_min/id_max                              |
| `ragAdmin.getAuthorDistribution` | query | Distribuição por autor com leis cobertas                            |
| `ragAdmin.getHealthScore`  | query    | Score de saúde do corpus (0–100) baseado em integridade e cobertura       |

### Shape do retorno de `uploadCsv`

```typescript
{
  total: number;      // total de linhas no CSV (excluindo header)
  valid: number;      // linhas válidas e inseridas/atualizadas
  inserted: number;   // novas inserções (anchor_id não existia)
  errors: Array<{
    line: number;     // número da linha no CSV (1-based, excluindo header)
    message: string;  // descrição do erro de validação
  }>;
}
```

### Colunas aceitas pelo `uploadCsv` (tabela `ragDocuments`)

```
anchor_id, lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex
```

> O campo `autor` é preenchido automaticamente pelo servidor com o valor `upload-csv-admin-{timestamp}`. Nunca incluir `autor` no CSV de upload.

---

## 10. Anomalias Documentadas e RFCs

| ID   | ids afetados | lei     | problema                                      | severidade | status                              | RFC                |
|------|-------------|---------|-----------------------------------------------|------------|-------------------------------------|--------------------|
| G-01 | 810–811     | `lc227` | Chunk fragmentado — Art. 2 partes 2+3         | P2         | ✅ Corrigido Sprint G · 2026-03-26  | CORPUS-RFC-001.md  |
| G-02 | 617–779     | `lc123` | 25 chunks com `lei=lc214` incorreto           | P1         | ✅ Corrigido Sprint G · 2026-03-26  | CORPUS-RFC-002.md  |
| G-03 | 632         | `lc214` | Art. 35 / Lei 9.430/1996 — reclassificação pendente | P3    | 🔵 Aguarda RFC-003                  | RFC-003 (futura)   |

### Resumo das RFCs executadas

**RFC-001 (Sprint G):** fusão dos chunks 810 e 811 (`lc227`, Art. 2) que estavam fragmentados incorretamente. O chunk 810 foi atualizado com o conteúdo completo e o chunk 811 foi removido. `anchor_id` do chunk 810 preservado.

**RFC-002 (Sprint G):** 25 chunks (ids 617–779, exceto 632) tinham `lei=lc214` incorreto. Eram chunks do Simples Nacional / MEI (LC 123/2006) inseridos com lei errada. Corrigidos para `lei=lc123` com `autor=correcao-rfc-002-sprint-g-lc123`.

---

## 11. Gold Set de Queries de Referência

O gold set completo está em `docs/rag/gold-set-queries.sql`. Executar após qualquer ingestão ou correção para validar a integridade do corpus.

| Query | Descrição                                    | Resultado esperado                          |
|-------|----------------------------------------------|---------------------------------------------|
| GS-01 | Integridade total                            | 2.078 chunks · 0 sem `anchor_id`            |
| GS-02 | Distribuição por lei                         | Bater com Seção 2 deste documento           |
| GS-03 | Recuperabilidade `lc227` — split payment     | ≥ 5 chunks retornados                       |
| GS-04 | Recuperabilidade `lc214` Art. 45 — confissão | ≥ 1 chunk com tópico relevante              |
| GS-05 | Recuperabilidade `lc224` — CNAE universal    | Chunks com `cnaeGroups` cobrindo grupos 46 e 49 |
| GS-06 | Cobertura `ec132`                            | ≥ 18 chunks                                 |
| GS-07 | Ausência de anomalias                        | 0 linhas retornadas                         |
| GS-08 | Ingestão mais recente                        | `autor` e `data_revisao` do último lote     |

---

## 12. Guia de Operações — Ingestão, RFC e Incidente

### 12.1 Fluxo de nova ingestão (chunks novos)

1. Preparar o CSV com as colunas: `anchor_id, lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex`
2. Usar o template oficial: `/public/template-rag-upload.csv`
3. Fazer upload via `/admin/rag-cockpit` → aba "Upload CSV"
4. Verificar o retorno: `total`, `valid`, `inserted`, `errors`
5. Executar o gold set (GS-01 e GS-02) para confirmar integridade
6. Atualizar este documento (Seções 1, 2, 3) com os novos totais
7. Abrir PR com evidência JSON do retorno do `uploadCsv`

### 12.2 Fluxo de RFC (correção de corpus existente)

1. Criar RFC em `docs/rag/RFC/CORPUS-RFC-NNN.md` com: problema, ids afetados, dry-run SQL, rollback SQL
2. Executar dry-run e registrar snapshot pré-execução
3. Obter aprovação do P.O. (Uires Tapajós) **antes de qualquer escrita no banco**
4. Executar via `webdev_execute_sql` ou script dedicado
5. Executar gold set completo (GS-01..GS-08)
6. Registrar snapshot pós-execução na RFC
7. Atualizar Seções 1, 2, 3 e 10 deste documento
8. Abrir PR com evidência

### 12.3 Fluxo de incidente (anomalia detectada em produção)

1. Identificar o `anchor_id` ou range de `id` afetado
2. Classificar a severidade (ver Seção 13)
3. Para P0/P1: notificar o P.O. imediatamente e **não executar nenhuma correção sem aprovação**
4. Criar RFC com dry-run antes de qualquer escrita
5. Seguir o fluxo 12.2

---

## 13. Classificação de Incidentes

| Severidade | Critério                                                                 | SLA de resposta | Aprovação necessária |
|------------|--------------------------------------------------------------------------|-----------------|----------------------|
| **P0**     | Corpus inacessível · retriever retorna 0 chunks em produção              | Imediato        | P.O. + Orquestrador  |
| **P1**     | Campo `lei` incorreto em ≥ 10 chunks · `anchor_id` duplicado            | 4h              | P.O.                 |
| **P2**     | Chunk fragmentado · `conteudo` truncado · `topicos` ausente              | 24h             | Orquestrador         |
| **P3**     | Reclassificação de lei · melhoria de `topicos` · atualização de `titulo` | Próxima sprint  | Manus (PR)           |

---

## 14. Histórico de Versões deste Documento

| Versão | Data       | Commit    | Descrição                                                                                       |
|--------|------------|-----------|-------------------------------------------------------------------------------------------------|
| v1.0   | 2026-03-26 | 0ad209b   | Criação — primeiro inventário granular por lei                                                  |
| v1.1   | 2026-03-26 | 4591b0c   | RFC-001: fusão chunks 810+811 (lc227) · RFC-002: 25 chunks migrados para lc123 · gold set 8/8 verde · confiabilidade 100% |
| v2.0   | 2026-03-30 | 465af7b3  | Reescrita completa — schema, migrations, retriever, scripts, anchor_id, procedures, guias, incidentes · Sprint L DEC-002 |

---

*Documento vivo — fonte de verdade do estado do corpus RAG.*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
*Arquivos relacionados: `docs/rag/gold-set-queries.sql` · `docs/rag/RAG-PROCESSO.md` · `docs/rag/RAG-GOVERNANCE.md` · `docs/rag/RFC/`*
