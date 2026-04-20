# Spec Técnica — CSV de Upload SOLARIS (Onda 1)

> Especificação completa do formato CSV aceito pela procedure `solarisAdmin.uploadCsv`.
> Use este documento para **validar** e **normalizar** listas de perguntas enviadas por advogados.
> Fonte da verdade: `server/routers/solarisAdmin.ts` — schema `CsvRowSchema` (linhas 41-60).
> Última atualização: 2026-04-20 · v7.19

---

## 1. Formato geral

- **Encoding:** UTF-8
- **Separador:** vírgula (`,`)
- **Delimitador de campo:** aspas duplas (`"`) — obrigatório quando o valor contém vírgula, quebra de linha ou aspas
- **Quebra de linha:** LF ou CRLF (ambos aceitos; `trim()` remove whitespace)
- **Comentários:** linhas iniciadas com `#` são ignoradas
- **Header:** obrigatório na linha 1, com todas as colunas obrigatórias
- **Ordem das colunas:** flexível (mapeamento é por nome do header)

## 2. Colunas — spec detalhada

| # | Coluna | Tipo | Obrigatório | Validação |
|---|---|---|---|---|
| 1 | `titulo` | string | **SIM** | `min(1)` — não pode ser vazio |
| 2 | `conteudo` | string | **SIM** | `min(1)` — texto completo da pergunta |
| 3 | `topicos` | string | **SIM** | `min(1)` — palavras-chave separadas por `;` |
| 4 | `cnaeGroups` | string | sim (pode vazio) | JSON array ou vazio (`[]`) |
| 5 | `lei` | literal | **SIM** | Deve ser exatamente `solaris` (literal fixo) |
| 6 | `artigo` | string | **SIM** | Padrão `SOL-NNN` (ex: `SOL-026`) |
| 7 | `categoria` | enum | **SIM** | `contabilidade_fiscal` · `negocio` · `ti` · `juridico` |
| 8 | `severidade_base` | enum | **SIM** | `baixa` · `media` · `alta` · `critica` |
| 9 | `vigencia_inicio` | string | opcional | ISO date `YYYY-MM-DD` ou vazio |
| 10 | `risk_category_code` | string | opcional | FK para `risk_categories.codigo` (ex: `inscricao_cadastral`) |
| 11 | `classification_scope` | enum | opcional | `risk_engine` (default) · `diagnostic_only` |

## 3. Regra de cada campo

### 3.1 `titulo`
- **O que é:** título curto da pergunta, usado em listagens e relatórios.
- **Tamanho prático:** até ~100 caracteres (armazenado em varchar(500), não há truncamento).
- **Exemplo:** `"Apuração do IBS por regime de competência"`

### 3.2 `conteudo`
- **O que é:** texto completo da pergunta exibido ao usuário no questionário.
- **Pode conter aspas** (escapar dobrando: `""`) e vírgulas (colocando todo o valor entre aspas).
- **Idioma:** português. Estilo: afirmativa clara + interrogação no final.
- **Exemplo:** `"A empresa apura o IBS pelo regime de competência conforme exigido pelo art. 9º da LC 214/2025?"`

### 3.3 `topicos`
- **O que é:** palavras-chave para busca e classificação interna, separadas por `;`.
- **Formato:** `snake_case` (palavras separadas por `_`) ou palavras simples.
- **Mínimo:** 1 tópico. Recomendado: 3-5.
- **Exemplo:** `"ibs;competencia;apuracao"`

### 3.4 `cnaeGroups`  ← atenção especial
- **O que é:** lista de prefixos CNAE em que a pergunta se aplica.
- **Formato:** JSON array ou vazio.
- **Regra de matching** (CRÍTICA):
  - `[]` ou campo vazio → pergunta **universal** (aparece para todos os CNAEs)
  - `["46"]` → aparece em CNAEs iniciados por `46` (ex: `46.39-7/01`)
  - `["46.39-7/01"]` → aparece só nesse CNAE exato
  - `["46", "47"]` → aparece em CNAEs iniciados por `46` **ou** `47`
- **Matching é prefix bidirecional** (`startsWith` nos dois sentidos)
- **Padrão** de curadoria: se a pergunta é **genérica** (aplica-se a qualquer empresa), use `[]`. Se é **específica** de um setor, liste os prefixos.

### 3.5 `lei`
- **O que é:** identificador da fonte da pergunta.
- **Valor fixo:** sempre `solaris` (literal).
- **Não aceita outros valores.** Qualquer outro texto resulta em erro.
- **Por quê:** distingue perguntas de Onda 1 (SOLARIS) de Onda 2 (IA Gen) e Onda 3 (RAG).

### 3.6 `artigo`
- **O que é:** código identificador único da pergunta.
- **Padrão:** `SOL-NNN` (3 dígitos zero-padded).
- **Sequencial.** Antes de gerar novos, verificar qual é o último código em uso.
- **Exemplos publicados:** `SOL-001` a `SOL-025` (até v7.19). Novos começam em `SOL-026`.
- **Único:** não pode repetir código já existente (unique constraint).

### 3.7 `categoria`
- **O que é:** área temática da pergunta — determina quem é o responsável natural pela resposta.
- **Enum fechado:**
  | Valor | Significado |
  |---|---|
  | `contabilidade_fiscal` | Apuração, escrituração, tributação (contador) |
  | `negocio` | Operação, produto, cliente, mercado (área de negócio) |
  | `ti` | ERP, NF-e, Sped, integração de sistemas (TI) |
  | `juridico` | Contratos, benefícios fiscais, transição legal (jurídico) |

### 3.8 `severidade_base`
- **O que é:** nível de impacto/risco se a empresa responder "não" ou "não sei".
- **Enum fechado:**
  | Valor | Guideline |
  |---|---|
  | `baixa` | Melhoria incremental; sem risco de autuação |
  | `media` | Risco de glosa ou obrigação acessória |
  | `alta` | Risco de autuação ou perda de crédito relevante |
  | `critica` | Violação direta de norma com prazo fixado |

### 3.9 `vigencia_inicio` (opcional)
- **O que é:** data em que a pergunta passa a valer (útil para perguntas que só fazem sentido após certa data de transição).
- **Formato:** `YYYY-MM-DD` (ISO 8601) ou vazio.
- **Comportamento:** se vazio/null, pergunta vigente desde sempre.
- **Exemplo:** `2026-07-01` (para perguntas que só se aplicam após início da fase de testes IBS).

### 3.10 `risk_category_code` (opcional, Z-11 ENTREGA 2)
- **O que é:** FK para `risk_categories.codigo` — liga a pergunta a uma categoria de risco do engine v4.
- **Valores comuns:** `inscricao_cadastral`, `split_payment`, `transicao_iss_ibs`, `obrigacao_acessoria`, etc.
- **Use quando:** a pergunta é um gatilho direto para um tipo de risco específico.
- **Default se vazio:** pergunta é informativa (não gera risco direto).

### 3.11 `classification_scope` (opcional, Z-11 ENTREGA 2)
- **O que é:** define se a resposta alimenta o motor de riscos ou é apenas diagnóstica.
- **Enum:**
  - `risk_engine` (default) → resposta alimenta `risks_v4`
  - `diagnostic_only` → resposta fica registrada mas não gera risco

## 4. Template válido — minimal

```csv
titulo,conteudo,topicos,cnaeGroups,lei,artigo,categoria,severidade_base,vigencia_inicio
Apuração do IBS,"A empresa apura IBS por competência (art. 9º LC 214/2025)?",ibs;competencia,[],solaris,SOL-026,contabilidade_fiscal,alta,
```

## 5. Template válido — com todos os campos opcionais

```csv
titulo,conteudo,topicos,cnaeGroups,lei,artigo,categoria,severidade_base,vigencia_inicio,risk_category_code,classification_scope
Inscrição no CGIBS,"A empresa está cadastrada no Comitê Gestor do IBS?",ibs;cadastro;cgibs,[],solaris,SOL-027,juridico,critica,2026-01-01,inscricao_cadastral,risk_engine
```

## 6. Checklist de validação antes do upload

Para cada linha enviada pelos advogados, verificar:

- [ ] `titulo` preenchido
- [ ] `conteudo` preenchido e terminando com `?`
- [ ] `topicos` com pelo menos 1 palavra-chave
- [ ] `cnaeGroups` é `[]` (universal) ou JSON array válido
- [ ] `lei` é exatamente `solaris` (sem maiúsculas, sem espaços)
- [ ] `artigo` segue padrão `SOL-NNN` e é **sequencial não duplicado**
- [ ] `categoria` é um dos 4 valores do enum
- [ ] `severidade_base` é um dos 4 valores do enum
- [ ] `vigencia_inicio` vazio ou `YYYY-MM-DD`
- [ ] Se `risk_category_code` preenchido: consta em `risk_categories.codigo`
- [ ] Se `classification_scope` preenchido: `risk_engine` ou `diagnostic_only`
- [ ] Valores com vírgula estão entre aspas `"..."`
- [ ] Arquivo salvo em **UTF-8**, separador **vírgula**
- [ ] Header na primeira linha
- [ ] Linhas `#comentário` podem ser usadas livremente

## 7. Erros comuns e correção

| Erro reportado pelo dry-run | Causa | Correção |
|---|---|---|
| `Número de colunas inválido` | Vírgula em valor sem aspas | Envolver valor em `"..."` |
| `Campo 'titulo' é obrigatório` | Célula vazia | Preencher |
| `Invalid enum value. Expected 'baixa' \| 'media'...` | Typo em severidade | Corrigir para enum exato |
| `Invalid literal value, expected "solaris"` | Lei errada (ex: `SOLARIS`) | Mudar para `solaris` (minúsculo) |
| `Duplicate entry 'SOL-015' for key 'codigo'` | Código duplicado | Trocar para próximo `SOL-NNN` não usado |
| `Invalid enum value for 'categoria'` | Categoria em português natural (ex: `Fiscal`) | Mapear para enum: `Fiscal` → `contabilidade_fiscal` |

## 8. Exemplo completo validado (trecho real do UAT v1)

Ver `docs/uat/solaris-questions-uat-v1.csv` no repositório — 12 perguntas (SOL-013..SOL-025) prontas para referência. Abaixo as 3 primeiras:

```csv
titulo,conteudo,topicos,cnaeGroups,lei,artigo,area,severidade_base,vigencia_inicio
Apuração do IBS por regime de competência,"A empresa apura o IBS pelo regime de competência conforme exigido pelo art. 9º da LC 214/2025?",ibs;competencia;apuracao,[],solaris,SOL-013,contabilidade_fiscal,alta,
Segregação contábil IBS x CBS,"Existe conta contábil segregada para IBS e CBS conforme orientação do CFC para a Reforma Tributária?",ibs;cbs;segregacao;contabilidade,[],solaris,SOL-014,contabilidade_fiscal,alta,
Cadastro no Comitê Gestor do IBS,"A empresa está cadastrada no Comitê Gestor do IBS conforme prazo definido na LC 214/2025?",ibs;cadastro;comite_gestor,[],solaris,SOL-015,juridico,critica,2026-01-01
```

> **NOTA:** Este exemplo usa o nome de coluna `area` em vez de `categoria` — isso é o nome **antigo**. O schema atual (v7.19) espera `categoria`. Se o CSV recebido dos advogados usar `area`, renomear para `categoria` antes do upload.

## 9. Fluxo sugerido para o consultor

Dado que os advogados enviaram **2 listas fora do padrão**, recomendo:

1. **Ler as 2 listas** — identificar campos que existem nas listas e mapeá-los para as 11 colunas acima.
2. **Diagnóstico de gaps:**
   - Quais campos obrigatórios estão faltando?
   - Quais valores precisam ser normalizados (ex: severidade "médio" → `media`)?
   - Há perguntas duplicadas entre as 2 listas?
3. **Gerar CSV único consolidado:**
   - Usar codigos `SOL-XXX` sequenciais a partir do último já publicado (ex: começar em `SOL-026`)
   - Usar `cnaeGroups=[]` como default (universal) salvo se advogado especificou setor
   - Mapear categorias para o enum de 4 valores
   - Definir `severidade_base` conservadora (quando em dúvida, usar `media`)
4. **Validar com dry-run** via `/admin/solaris-questions` antes de confirmar publicação.
5. **Publicar** em lote único (facilita rollback se necessário).

## 10. Perguntas ao consultor — template de retorno

Ao devolver o CSV validado, o consultor pode anexar um resumo:

```markdown
## Resumo da consolidação

- Total de perguntas das 2 listas originais: X
- Duplicatas identificadas: Y
- Perguntas consolidadas: Z
- Códigos atribuídos: SOL-026 a SOL-0__
- Categorias utilizadas: [listar as 4 que aparecem]
- Severidades distribuídas:
  - critica: A
  - alta: B
  - media: C
  - baixa: D
- Perguntas com `cnaeGroups` específico: E (detalhar quais e por quê)
- Perguntas universais (`cnaeGroups=[]`): F

## Observações

[Gaps encontrados, ambiguidades, sugestões de revisão jurídica]
```

---

*Spec gerada a partir do código fonte em 2026-04-20 (v7.19).
Arquivos de referência: `server/routers/solarisAdmin.ts` (linhas 41-60 — `CsvRowSchema`)
e `drizzle/schema.ts` (linhas 1654-1700 — tabela `solaris_questions`).*
