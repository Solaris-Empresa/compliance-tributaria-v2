# Regras de Negócio — ConsolidacaoV4
## IA SOLARIS · Diagnóstico de Adequação LC 214/2025
## Step 7 do Fluxo E2E · Sprint Z-16

---

## 1. Objetivo e posição no fluxo

```
ConsolidacaoV4 é o Step 7 — o entregável final da plataforma.
É a tela que o advogado apresenta ao cliente.
É o documento que fundamenta as decisões tributárias.

Posição no fluxo:
  Step 5: RiskDashboardV4 → advogado aprova riscos
  Step 6: ActionPlanPage  → advogado aprova planos
  Step 7: ConsolidacaoV4  ← ESTA TELA (novo)

Rota: /projetos/:id/consolidacao-v4
Componente: client/src/pages/ConsolidacaoV4.tsx
```

### Princípio fundamental

```
Meta do produto: 98% de confiabilidade jurídica.

Isso significa que TUDO exibido na ConsolidacaoV4
deve ser determinístico e rastreável à fonte.

  ✅ Permitido: dados calculados do banco
  ✅ Permitido: templates de texto com variáveis
  ✅ Permitido: RAG como sinalização de qualidade
  ❌ Proibido: qualquer campo gerado por LLM
  ❌ Proibido: inferências sem base em dados
  ❌ Proibido: score calculado com dados da v3
```

---

## 2. Gatilho e navegação

### Quando a tela é exibida

```
GATILHO A — Aprovação de plano individual:
  Usuário clica "Aprovar plano" na ActionPlanPage
  → approveActionPlan({ planId }) executado
  → redirect automático para /projetos/:id/consolidacao-v4

GATILHO B — Bulk approve de planos (se implementado):
  Usuário aprova múltiplos planos de uma vez
  → redirect automático para /projetos/:id/consolidacao-v4

GATILHO C — Navegação direta:
  Menu lateral ou breadcrumb
  → usuário acessa diretamente a qualquer momento

IMPORTANTE: o redirect acontece na APROVAÇÃO DO PLANO,
não na aprovação do risco (Step 5).
```

### Navegação de saída

```
Botão 1: "Baixar diagnóstico (PDF)"
  → gera PDF no browser via jsPDF
  → nome do arquivo: diagnostico-[CNPJ]-[YYYY-MM-DD].pdf

Botão 2: "Ver projetos"
  → navigate("/projetos")

Botão 3: "Voltar para planos"
  → navigate("/projetos/:id/planos-v4")
  → sempre visível — advogado pode voltar e criar mais planos

Botão 4: "Ver projeto"
  → navigate("/projetos/:id")
```

### Edição posterior

```
O advogado pode voltar ao projeto a qualquer momento via:
  1. Lista de projetos → buscar projeto → editar
  2. Botão "Voltar para planos" na ConsolidacaoV4
  3. Menu lateral do DiagnosticoStepper

Não há bloqueio de edição após a ConsolidacaoV4 ser visitada.
```

---

## 3. Score de compliance

### Fórmula oficial (v4)

```typescript
// Definições
const SEVERIDADE_SCORE_MAP = {
  alta:        7,
  media:       5,
  oportunidade: 1,  // NÃO entra no denominador do score principal
};

const MAX_PESO       = 9;
const CONFIDENCE_FLOOR = 0.5;  // nunca zera risco incerto

// Cálculo por risco (apenas type='risk', excluir type='opportunity')
fator_confianca = max(risk.confidence, CONFIDENCE_FLOOR)
pontos_risco    = SEVERIDADE_SCORE_MAP[risk.severidade] × fator_confianca

// Score total (apenas riscos aprovados — approved_at IS NOT NULL)
n_riscos_aprovados = COUNT(risks WHERE type='risk' AND approved_at IS NOT NULL)
soma_pontos        = SUM(pontos_risco) para todos os riscos aprovados
score              = ROUND(soma_pontos / (n_riscos_aprovados × MAX_PESO) × 100)
```

### Por que oportunidades ficam fora

```
Incluir oportunidades no denominador criaria um paradoxo:
  5 riscos alta (sem opor.) → score = 39
  5 riscos alta + 5 oportunidades → score = 25

O advogado questionaria: "encontraram mais oportunidades
e meu score piorou?" — matematicamente verdadeiro mas
intuitivamente errado para o cliente.

Oportunidades são exibidas em seção separada com seu
próprio indicador (não um score, mas uma contagem).
```

### Resolução do nível

```typescript
function resolveNivel(score: number, totalAlta: number): RiskLevel {
  if (score >= 70 || totalAlta >= 2) return 'critico';
  if (score >= 50 || totalAlta >= 1) return 'alto';
  if (score >= 30)                   return 'medio';
  return 'baixo';
}
```

### Confidence floor — por que 0.5

```
Um risco com confidence=0.1 (evidência muito fraca)
não deve simplesmente desaparecer do score.
O sistema encontrou indícios, mesmo que fracos.

O floor de 0.5 garante que todo risco detectado
contribui com pelo menos metade do seu peso.

Isso preserva o princípio de precaução:
"melhor alertar com excesso que omitir um risco real."
```

### rag_confidence e rag_validated

```
rag_confidence NÃO entra na fórmula do score.
Motivo: corpus pode estar incompleto.
Um risco real não deve ser penalizado por limitação do RAG.

rag_validated=0:
  → Exibe alerta visual na tabela auditável
  → Texto: "Base normativa sem validação RAG confirmada.
            Revisão jurídica recomendada."
  → NÃO reduz o score

rag_validated=1:
  → Badge verde: "Validado (score X.XX)"
  → Indica que o artigo foi encontrado no corpus
```

### Snapshot histórico

```
A cada visita à ConsolidacaoV4, o sistema:
  1. Recalcula o score com os dados atuais
  2. Salva um snapshot em projects.scoringData:

  {
    "snapshots": [
      {
        "timestamp": "2026-04-15T14:30:00Z",
        "score": 65,
        "nivel": "alto",
        "total_riscos_aprovados": 7,
        "total_alta": 4,
        "total_media": 3,
        "formula_version": "v4.0"
      },
      {
        "timestamp": "2028-01-10T09:15:00Z",
        "score": 58,
        "nivel": "alto",
        "total_riscos_aprovados": 7,
        "total_alta": 3,
        "total_media": 4,
        "formula_version": "v4.0"
      }
    ],
    "score_atual": 58,
    "nivel_atual": "alto",
    "ultima_atualizacao": "2028-01-10T09:15:00Z"
  }

Exibição na UI:
  Score atual: 58 — Alto
  Histórico: [15/04/2026: 65 · Alto] [10/01/2028: 58 · Alto]

REGRA: snapshots nunca são deletados.
       Cada visita ACRESCENTA um snapshot ao histórico.
       O score_atual é sempre o mais recente.
```

---

## 4. Seções da ConsolidacaoV4

### 4.1 — Header do diagnóstico

```
Exibe:
  Título: "Diagnóstico de Adequação LC 214/2025"
  Empresa: project.companyProfile.razaoSocial
  CNPJ: project.companyProfile.cnpj (formatado: XX.XXX.XXX/XXXX-XX)
  CNAEs analisados: project.confirmedCnaes (code + description)
  Data do diagnóstico: data da visita atual (snapshot)
  Legislação base: LC 214/2025 (+ outras quando adicionadas)

Layout deve suportar crescimento de leis:
  LC 214/2025 → LC 224/2026 → LC 227/2026 → ...
  Cada lei em um badge expansível com artigos aplicáveis.
```

### 4.2 — Score de compliance

```
Componente: ComplianceScoreCard (entregue pelo consultor)

Exibe:
  Número do score (0-100)
  Nível (Baixo / Médio / Alto / Crítico)
  KPI cards: Riscos aprovados · Alta · Média · Planos · Tarefas
  Legenda da ponderação (sempre visível, sem clique extra)
  Texto de transparência (determinístico, não LLM)
  Botão "Ver detalhamento auditável" → expande tabela
  Histórico de snapshots com timestamps

Texto de transparência obrigatório (PT-BR):
  "Este score não é estimado por IA generativa.
   Ele é calculado de forma determinística a partir
   da severidade dos riscos identificados e da evidência
   operacional disponível para cada risco. A validação
   normativa via RAG é exibida separadamente para reforçar
   a rastreabilidade jurídica, sem reduzir automaticamente
   a exposição principal."
```

### 4.3 — Aviso de planos sem tarefas

```
CONDIÇÃO: COUNT(action_plans WHERE status='aprovado' AND tasks_count=0) > 0

Exibe badge âmbar:
  "X plano(s) aprovado(s) sem tarefas definidas.
   Considere adicionar tarefas antes de apresentar
   ao cliente."

NÃO bloqueia a tela — apenas chama atenção.
```

### 4.4 — Riscos aprovados (tabela auditável)

```
Dados: risks_v4 WHERE approved_at IS NOT NULL
       AND status = 'active'
       AND type = 'risk'

Colunas da tabela:
  Risco (título)
  Categoria
  Severidade (badge colorido)
  Urgência
  Origem (BADGE DE ONDA — ver seção 4.4.1)
  Breadcrumb (4 nós)
  Base legal (artigo ou "Sem base legal — ver origem")
  RAG (validado/alerta)
  Planos vinculados (count)

Ordenação:
  1º: Alta/imediata
  2º: Alta/outro
  3º: Média/imediata
  4º: Média/outro
```

#### 4.4.1 — Badges de origem (rastreabilidade das ondas)

```
Cada risco exibe de qual onda e fonte veio:

SOURCE_RANK 1 — QCNAE / CNAE:
  Badge: [ATIVIDADE ECONÔMICA]
  Cor: azul escuro
  Detalhe: CNAE code + description
  Base legal: SIM — artigo do corpus

SOURCE_RANK 2 — NCM (Produto):
  Badge: [PRODUTO]
  Cor: azul médio
  Detalhe: NCM code + description do produto
  Base legal: SIM — artigo do corpus

SOURCE_RANK 3 — NBS (Serviço):
  Badge: [SERVIÇO]
  Cor: azul claro
  Detalhe: NBS code + description do serviço
  Base legal: SIM — artigo do corpus

SOURCE_RANK 4 — SOLARIS (Onda 1):
  Badge: [SOLARIS — Equipe Jurídica]
  Cor: verde
  Detalhe: código da pergunta SOL-XXX
  Base legal: NÃO — sem artigo direto
  Texto obrigatório: "Risco identificado pelo questionário
  curado pela equipe jurídica SOLARIS.
  Base legal a ser confirmada pelo advogado responsável."

SOURCE_RANK 5 — IA GEN (Onda 2):
  Badge: [IA GEN — Perfil da empresa]
  Cor: âmbar
  Detalhe: categorias usadas no perfil
  Base legal: NÃO — sem artigo direto
  Texto obrigatório: "Risco identificado com base no
  perfil operacional da empresa via IA generativa
  (temperature=0.1). Base legal a ser confirmada
  pelo advogado responsável."
```

#### 4.4.2 — Detalhe da base legal (Onda 3)

```
Para riscos de SOURCE_RANK 1, 2 ou 3, exibir:

  Lei: LC 214/2025 (ou LC 224/2026, LC 227/2026...)
  Artigo: Art. X
  Inciso: Inciso X (se disponível)
  Parágrafo: § X (se disponível)
  Alínea: alínea X (se disponível)
  Trecho RAG: primeiros 120 chars do rag_artigo_exato
  Confiança RAG: rag_confidence (%)

  Status RAG:
    rag_validated=1 → "✓ Artigo confirmado no corpus"
    rag_validated=0 → "⚠ Artigo tentativo — revisão recomendada"

REGRA: o sistema NÃO tenta adivinhar o artigo
para riscos da Onda 1 e Onda 2.
Esses riscos ficam marcados como
"Sem base legal direta — origem: [SOLARIS/IA GEN]".
```

### 4.5 — Oportunidades identificadas

```
Seção SEPARADA do score de riscos.
Dados: risks_v4 WHERE type='opportunity'
       (approved_at pode ser NULL — oportunidades
       não precisam de aprovação formal)

Exibe:
  Contador: "X oportunidades identificadas"
  Tabela com: título · categoria · artigo · origem · RAG
  Texto: "Oportunidades tributárias identificadas
          com base no perfil da empresa.
          Avalie com seu contador/advogado."

Categorias possíveis:
  aliquota_zero     → benefício de alíquota zero
  aliquota_reduzida → benefício de alíquota reduzida
  credito_presumido → crédito presumido de IBS/CBS
```

### 4.6 — Riscos desconsiderados

```
Dados: risks_v4 WHERE status='deleted'
       AND project_id = :id

CONDIÇÃO: só exibe a seção se houver riscos excluídos.

Exibe por risco excluído:
  Título do risco
  Categoria + severidade original
  Data da exclusão + usuário
  Motivo da exclusão (deleted_reason)
  Badge: "Desconsiderado"

Texto da seção:
  "Riscos exconsiderados durante a análise.
   O motivo da exclusão está registrado para fins
   de auditoria e rastreabilidade."

PROPÓSITO: permite ao cliente questionar
uma exclusão e o advogado ter a resposta documentada.
```

### 4.7 — Planos de ação aprovados

```
Dados: action_plans WHERE status='aprovado'
       JOIN risks_v4 ON action_plans.risk_id = risks_v4.id
       JOIN tasks ON tasks.action_plan_id = action_plans.id

Agrupado por risco de origem.

Para cada risco:
  Breadcrumb do risco (4 nós)
  Para cada plano do risco:
    Título do plano
    Responsável · Prazo
    Progresso: X/N tarefas concluídas
    Barra de progresso
    Lista de tarefas (expandível):
      Título · Responsável · Data início → Data fim · Status

AVISO por plano sem tarefas:
  Badge âmbar: "Sem tarefas definidas"
```

### 4.8 — Base legal aplicável

```
Seção escalável por lei.
Agrupa os artigos citados nos riscos aprovados.

Estrutura:
  [LC 214/2025 — IBS, CBS, Imposto Seletivo]
    Art. 2  → Imposto Seletivo (N riscos)
    Art. 9  → Split Payment (N riscos)
    Art. 14 → Alíquota Zero (N oportunidades)
    Art. 45 → Confissão Automática (N riscos)
    ...

  [LC 224/2026 — quando disponível]
    Art. X → categoria (N riscos)

  [LC 227/2026 — quando disponível]
    Art. X → categoria (N riscos)

Cada lei em card expansível (accordion).
O layout foi projetado para N leis — sem limite.

REGRA: só aparecem leis que têm ao menos
1 risco ou oportunidade aprovado no projeto.
```

### 4.9 — Linha do tempo da reforma

```
Baseada no campo urgencia dos riscos aprovados.

Mapeamento urgência → horizonte temporal:
  imediata    → 2026 (vigência IBS/CBS começa)
  curto_prazo → 2026–2027
  medio_prazo → 2027–2029 (transição gradual ISS→IBS)
  longo_prazo → 2029–2032 (IS pleno + fim transição)

Exibição:
  Timeline horizontal com 4 marcos:
    [2026] [2027-2028] [2029] [2032]

  Para cada marco: lista de categorias de risco
  com urgência correspondente.

  Fonte: campo urgencia de URGENCIA[] do engine
  (determinístico — nunca do LLM)
```

### 4.10 — Próximos passos

```
Texto determinístico por nível do score.
Template com variáveis — nunca gerado por LLM.

Nível CRÍTICO (score >= 70 ou totalAlta >= 2):
  "Ação imediata necessária. Foram identificados
  {totalAlta} risco(s) de alta severidade, incluindo
  exposições nas categorias {listaCategoriasAlta}.
  Recomenda-se iniciar imediatamente os planos
  vinculados a {planoPrioridadeAlta}."

Nível ALTO (score >= 50 ou totalAlta >= 1):
  "Atenção necessária nos próximos 30 a 90 dias.
  Inicie os planos de ação aprovados, priorizando
  {listaCategoriasAlta}. Acompanhe os prazos definidos."

Nível MÉDIO (score >= 30):
  "Monitoramento recomendado. Acompanhe o andamento
  das {totalPlanos} tarefas definidas e mantenha
  o calendário de compliance atualizado."

Nível BAIXO (score < 30):
  "Exposição tributária controlada com base nas
  informações disponíveis. Mantenha o acompanhamento
  periódico e revise o diagnóstico ao longo de
  cada fase da reforma tributária."

Variáveis usadas:
  totalAlta               → COUNT(alta)
  listaCategoriasAlta     → JOIN(categorias WHERE alta)
  planoPrioridadeAlta     → titulo do plano mais urgente
  totalPlanos             → COUNT(action_plans aprovados)
```

### 4.11 — Disclaimer jurídico obrigatório (PT-BR)

```
Exibido em destaque no topo E no rodapé do PDF.
Texto fixo — não editável.

"AVISO LEGAL: Este diagnóstico é uma ferramenta de
apoio à decisão tributária elaborada com base nas
informações fornecidas pela empresa. Os resultados
apresentados — incluindo a identificação de riscos,
oportunidades e planos de ação — NÃO constituem
parecer jurídico. Toda classificação e recomendação
deve ser validada por advogado tributarista ou
contador habilitado antes de qualquer ação fiscal,
contábil ou de compliance. A severidade dos riscos
é determinística (baseada em tabelas normativas),
mas a aplicabilidade ao caso concreto depende de
análise humana qualificada. IA SOLARIS não se
responsabiliza por decisões tomadas sem a devida
validação profissional."
```

---

## 5. Regras de negócio

```
RN-CV4-01: Score calculado apenas com riscos aprovados
           (approved_at IS NOT NULL AND status='active')

RN-CV4-02: Oportunidades NÃO entram no denominador do score.
           Exibidas em seção separada.

RN-CV4-03: Snapshot salvo em projects.scoringData a cada visita.
           Snapshots nunca são deletados.
           formula_version registrada para auditoria futura.

RN-CV4-04: Confidence mínima aplicada = 0.5
           (risco com confidence=0 contribui com 50% do peso)

RN-CV4-05: rag_confidence NÃO entra na fórmula.
           rag_validated=0 → alerta visual apenas.

RN-CV4-06: Riscos da Onda 1 (SOLARIS) e Onda 2 (IA GEN)
           exibidos sem artigo de base legal.
           Texto obrigatório informando a origem.

RN-CV4-07: Riscos da Onda 3 (NCM/NBS/CNAE) exibem
           artigo + inciso + parágrafo quando disponíveis.

RN-CV4-08: Riscos excluídos (soft deleted) aparecem
           na seção "Riscos desconsiderados" com motivo.

RN-CV4-09: Plano aprovado sem tarefas → badge âmbar de aviso.
           Não bloqueia a exibição.

RN-CV4-10: Score histórico preservado — cada visita acumula.
           Exibição: timestamps em ordem cronológica crescente.

RN-CV4-11: Disclaimer jurídico obrigatório em PT-BR.
           Aparece no topo da tela E no PDF.

RN-CV4-12: PDF gerado no browser via jsPDF + autoTable.
           Nome: diagnostico-[CNPJ]-[YYYY-MM-DD].pdf
           Contém: CNPJ + CNAEs + data + disclaimer.

RN-CV4-13: Base legal escalável — layout suporta N leis.
           Cada lei em card/accordion separado.

RN-CV4-14: Veredito por nível é determinístico (template).
           Nunca gerado por LLM.

RN-CV4-15: Linha do tempo baseada em urgencia do engine.
           Nunca calculada por LLM.

RN-CV4-16: Todo campo exibido tem origem rastreável:
           banco de dados, engine ou template PT-BR.
           NENHUM campo vem de LLM diretamente.
```

---

## 6. Invariantes

```
INV-CV4-01: Score = 0 se não há riscos aprovados.
            Nível = 'baixo' se score = 0.

INV-CV4-02: Oportunidades nunca entram no score de risco.

INV-CV4-03: Snapshot sempre gerado na visita, mesmo que
            score não mude em relação ao anterior.

INV-CV4-04: Disclaimer nunca omitido — nem na tela nem no PDF.

INV-CV4-05: Riscos com fonte SOLARIS/IA GEN nunca exibem
            artigo de base legal como confirmado.

INV-CV4-06: Soft delete preservado — riscos excluídos
            aparecem em seção própria, nunca somem.

INV-CV4-07: Botão "Voltar para planos" sempre visível.
            O advogado nunca fica preso na tela.
```

---

## 7. Contratos de interface (TypeScript)

```typescript
// Input para calculateComplianceScore
interface ComplianceRiskScoreInput {
  id:            string;
  titulo:        string;
  categoria:     string;
  artigo:        string | null;
  severidade:    'alta' | 'media' | 'oportunidade';
  confidence:    number;      // 0..1
  ragValidated:  boolean;
  ragConfidence: number;      // 0..1
}

// Resultado do cálculo
interface ComplianceScoreResult {
  score:             number;       // 0..100
  nivel:             RiskLevel;    // 'baixo'|'medio'|'alto'|'critico'
  totalRiscos:       number;       // apenas type='risk' aprovados
  totalAlta:         number;
  totalMedia:        number;
  totalOportunidade: number;       // separado — não entra no score
  explicacaoCurta:   string;       // template PT-BR
  legenda: {
    severidade:           Record<RiskSeverity, number>;
    confidenceFloor:      number;
    observacaoNormativa:  string;
  };
  contributions: ComplianceRiskContribution[];
}

// Snapshot histórico
interface ScoreSnapshot {
  timestamp:              string;   // ISO 8601
  score:                  number;
  nivel:                  RiskLevel;
  total_riscos_aprovados: number;
  total_alta:             number;
  total_media:            number;
  formula_version:        string;   // ex: 'v4.0'
}

// projects.scoringData
interface ProjectScoringData {
  snapshots:         ScoreSnapshot[];
  score_atual:       number;
  nivel_atual:       RiskLevel;
  ultima_atualizacao: string;       // ISO 8601
}

// PDF metadata
interface DiagnosticoPDFMeta {
  razaoSocial:    string;
  cnpj:           string;           // formatado
  cnaes:          { code: string; description: string }[];
  datadiagnostico: string;          // DD/MM/YYYY
  versaoLegislacao: string[];       // ['LC 214/2025', ...]
}

// Procedure backend
interface ConsolidacaoV4Input {
  projectId: number;
}

interface ConsolidacaoV4Output {
  meta:            DiagnosticoPDFMeta;
  scoreResult:     ComplianceScoreResult;
  scoreHistory:    ScoreSnapshot[];
  riscosAprovados: RiskV4Row[];
  oportunidades:   RiskV4Row[];
  riscosExcluidos: RiskV4Row[];
  planosAprovados: ActionPlanWithTasks[];
  baseLegal:       LeiAplicada[];
}
```

---

## 8. Procedure backend

```typescript
// server/routers/risks-v4.ts

getConsolidacaoV4: protectedProcedure
  .input(z.object({ projectId: z.number() }))
  .query(async ({ input, ctx }) => {

    // 1. Buscar projeto e metadata
    const project = await db.select()
      .from(projects)
      .where(eq(projects.id, input.projectId))
      .limit(1);

    // 2. Buscar riscos aprovados (apenas type='risk')
    const riscosAprovados = await db.select()
      .from(risksV4)
      .where(
        and(
          eq(risksV4.projectId, input.projectId),
          eq(risksV4.type, 'risk'),
          eq(risksV4.status, 'active'),
          isNotNull(risksV4.approvedAt)
        )
      );

    // 3. Buscar oportunidades
    const oportunidades = await db.select()
      .from(risksV4)
      .where(
        and(
          eq(risksV4.projectId, input.projectId),
          eq(risksV4.type, 'opportunity'),
          eq(risksV4.status, 'active')
        )
      );

    // 4. Buscar riscos excluídos
    const riscosExcluidos = await db.select()
      .from(risksV4)
      .where(
        and(
          eq(risksV4.projectId, input.projectId),
          eq(risksV4.status, 'deleted')
        )
      );

    // 5. Buscar planos aprovados + tarefas
    const planosAprovados = await db.select()
      .from(actionPlans)
      .where(
        and(
          eq(actionPlans.projectId, input.projectId),
          eq(actionPlans.status, 'aprovado')
        )
      );

    // 6. Calcular score
    const scoreInput = riscosAprovados.map(r => ({
      id:           r.id,
      titulo:       r.titulo,
      categoria:    r.categoria,
      artigo:       r.artigo,
      severidade:   r.severidade as RiskSeverity,
      confidence:   r.confidence,
      ragValidated: r.ragValidated === 1,
      ragConfidence: r.ragConfidence ?? 0,
    }));

    const scoreResult = calculateComplianceScore(scoreInput);

    // 7. Salvar snapshot
    const snapshot: ScoreSnapshot = {
      timestamp:              new Date().toISOString(),
      score:                  scoreResult.score,
      nivel:                  scoreResult.nivel,
      total_riscos_aprovados: scoreResult.totalRiscos,
      total_alta:             scoreResult.totalAlta,
      total_media:            scoreResult.totalMedia,
      formula_version:        'v4.0',
    };

    const scoringDataAtual = project[0].scoringData as ProjectScoringData | null;
    const novaScoringData: ProjectScoringData = {
      snapshots: [...(scoringDataAtual?.snapshots ?? []), snapshot],
      score_atual: scoreResult.score,
      nivel_atual: scoreResult.nivel,
      ultima_atualizacao: snapshot.timestamp,
    };

    await db.update(projects)
      .set({ scoringData: novaScoringData })
      .where(eq(projects.id, input.projectId));

    // 8. Retornar consolidação completa
    return {
      meta: buildDiagnosticoPDFMeta(project[0]),
      scoreResult,
      scoreHistory: novaScoringData.snapshots,
      riscosAprovados,
      oportunidades,
      riscosExcluidos,
      planosAprovados: await enrichWithTasks(planosAprovados),
      baseLegal: buildBaseLegal(riscosAprovados, oportunidades),
    };
  }),
```

---

## 9. ADR — Decisões arquiteturais

### ADR-CV4-001: Score usa apenas riscos aprovados

```
Contexto:
  O score deve refletir a exposição REAL da empresa
  conforme avaliação do advogado.

Decisão:
  Apenas riscos com approved_at IS NOT NULL
  entram no cálculo do score.

Alternativas rejeitadas:
  A) Todos os riscos gerados (incluindo não aprovados)
     → exagiria a exposição com riscos ainda não validados
  B) Apenas riscos com plano aprovado
     → muito restritivo; nem todo risco precisa de plano

Consequências:
  Se o advogado não aprovou nenhum risco,
  score = 0 e uma mensagem explica a situação.
```

### ADR-CV4-002: Oportunidades fora do denominador

```
Contexto:
  Incluir oportunidades no denominador criaria paradoxo:
  mais oportunidades → score menor (matematicamente).

Decisão:
  Oportunidades em seção separada.
  Score calculado apenas sobre type='risk'.

Alternativas rejeitadas:
  Score separado para oportunidades
  → aumenta complexidade sem benefício claro

Consequências:
  Seção de oportunidades tem indicador próprio (contagem).
  Não há "score de oportunidades" — apenas contagem.
```

### ADR-CV4-003: Snapshot a cada visita

```
Contexto:
  A jornada de compliance vai até 2031.
  O advogado precisa comparar o score ao longo do tempo.

Decisão:
  Cada visita à ConsolidacaoV4 gera um snapshot.
  Snapshots nunca são deletados.
  Exibição: histórico completo com timestamps.

Alternativas rejeitadas:
  A) Score sempre recalculado sem histórico
     → impossibilita comparação temporal
  B) Snapshot apenas ao gerar PDF
     → perde visitas sem PDF

Consequências:
  projects.scoringData pode crescer com muitos snapshots.
  Mitigação: JSON compacto por snapshot (~200 bytes).
  Para 100 visitas em 6 anos: ~20KB por projeto.
```

### ADR-CV4-004: Veredito determinístico (sem LLM)

```
Contexto:
  A v3 usava generateDecision (LLM) para o veredito.
  A meta é 98% de confiabilidade.

Decisão:
  Veredito gerado por template PT-BR com variáveis.
  Sem chamada de LLM.

Alternativas rejeitadas:
  A) LLM com temperatura baixa (0.1)
     → ainda gera variação; não é determinístico
  B) Veredito da v3 reutilizado
     → usa dados da v3, incompatível com risks_v4

Consequências:
  Texto mais previsível e auditável.
  Expansão para Z-17+ com LLM opcional sob demanda.
```

### ADR-CV4-005: Base legal escalável por lei

```
Contexto:
  LC 214/2025 é a primeira lei da reforma.
  LC 224/2026 e LC 227/2026 virão em seguida.
  O layout não pode ser fixo para uma lei.

Decisão:
  Base legal exibida em cards/accordion por lei.
  Cada lei é uma entrada em um array de leis aplicáveis.
  Novas leis adicionadas ao corpus RAG aparecem
  automaticamente na ConsolidacaoV4.

Consequências:
  A seção crescerá com o corpus.
  UI deve renderizar N leis sem ajuste de código.
```

### ADR-CV4-006: PDF gerado no browser (Z-16)

```
Contexto:
  jsPDF 4.2.0 + autoTable 5.0.7 já instalados.
  A v3 já faz download no browser com sucesso.

Decisão:
  PDF gerado no browser para Z-16.

Alternativas rejeitadas:
  PDF gerado no servidor
  → requer endpoint novo, maior complexidade
  → benefício de formatação não justifica para Z-16

Consequências:
  PDF limitado em fontes e formatação complexa.
  Z-17+: PDF no servidor com template profissional,
  possibilidade de incluir logo do escritório.
```

---

## 10. Integrações e dependências

```
COMPONENTES NOVOS:
  client/src/pages/ConsolidacaoV4.tsx
  client/src/components/ComplianceScoreCard.tsx (já entregue)
  client/src/lib/calculateComplianceScore.ts (já entregue)
  client/src/lib/generateDiagnosticoPDF.ts (a criar)

PROCEDURES NOVAS:
  trpc.risksV4.getConsolidacaoV4
  trpc.risksV4.calculateAndSaveScore

ROTAS NOVAS:
  /projetos/:id/consolidacao-v4

REDIRECT NOVO:
  ActionPlanPage.tsx:
    após approveActionPlan() → navigate('/projetos/:id/consolidacao-v4')

CAMPO BANCO EXISTENTE (atualizar):
  projects.scoringData: json
  → migrar estrutura para ProjectScoringData com snapshots[]

DEPENDÊNCIAS:
  jsPDF: ^4.2.0 (já instalado)
  jspdf-autotable: ^5.0.7 (já instalado)
```

---

## 11. Testes obrigatórios

```
TESTES UNITÁRIOS — calculateComplianceScore():
  T01: score=0 para array vazio
  T02: confidence < 0.5 → floor aplicado (0.5)
  T03: oportunidade não entra no denominador
  T04: nivel='critico' quando totalAlta >= 2
  T05: nivel='critico' quando score >= 70
  T06: nivel='alto' quando totalAlta = 1
  T07: mesmo input → mesmo output (determinismo)
  T08: risco confidence=0 → contribui com peso×0.5

TESTES DE SNAPSHOT:
  T09: visita salva snapshot em projects.scoringData
  T10: segunda visita ACRESCENTA ao histórico
  T11: snapshots nunca deletados após exclusão de risco

TESTES E2E:
  CT-10: aprovar plano → redirect para consolidacao-v4
  CT-11: score exibido corretamente com dados reais
  CT-12: histórico de snapshots visível
  CT-13: PDF gerado com CNPJ + CNAEs + disclaimer
  CT-14: riscos excluídos aparecem em seção própria
  CT-15: plano sem tarefas → badge âmbar visível
```

---

## 12. data-testid obrigatórios

```
consolidacao-page
consolidacao-header
kpi-riscos-aprovados
kpi-alta
kpi-media
kpi-oportunidades
kpi-planos
kpi-tarefas
compliance-score-card (componente reutilizável)
score-historico
score-historico-item
aviso-planos-sem-tarefas
tabela-riscos-aprovados
risk-row
risk-origem-badge
risk-base-legal
risk-rag-status
secao-oportunidades
oportunidade-row
secao-riscos-desconsiderados
risco-desconsiderado-row
secao-planos
plano-row
plano-tarefas-lista
secao-base-legal
lei-card
timeline-reforma
proximo-passo-box
disclaimer-box
btn-download-pdf
btn-ver-projetos
btn-voltar-planos
btn-ver-projeto
```

---

## 13. Glossário

```
Score de compliance:
  Número de 0 a 100 que representa a exposição tributária
  da empresa com base nos riscos aprovados pelo advogado.
  Calculado de forma determinística. Não é gerado por LLM.

Snapshot:
  Registro imutável do score em um momento no tempo.
  Gerado a cada visita à ConsolidacaoV4.

Risco aprovado:
  Risco em risks_v4 com approved_at IS NOT NULL
  e status = 'active'. Aprovado pelo advogado no Step 5.

Plano aprovado:
  Plano em action_plans com status = 'aprovado'.
  Aprovado pelo advogado no Step 6. Libera as tarefas.

Oportunidade:
  Risco do tipo 'opportunity' — benefício tributário
  identificado. Nunca gera plano automaticamente.
  Exibida em seção separada na ConsolidacaoV4.

Rastreabilidade:
  Capacidade de identificar a origem exata de cada
  informação exibida — da onda que gerou o gap
  até o artigo da lei que fundamenta o risco.

Breadcrumb 4 nós:
  [fonte] › [categoria] › [artigo] › [gap ID]
  Presente em todo risco. Nunca NULL.

Disclaimer jurídico:
  Aviso legal obrigatório em PT-BR que esclarece
  que o diagnóstico é ferramenta de apoio e não
  substitui parecer jurídico profissional.
```

---

---

## 14. Cinco fluxos da ConsolidacaoV4

---

### 14.1 — Visão do P.O. (valor entregue)

```
OBJETIVO DO P.O.: garantir que o produto entrega
98% de confiabilidade jurídica ao cliente final.

╔══════════════════════════════════════════════════════════════╗
║  JORNADA DE VALOR — P.O. UIRES TAPAJÓS                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ENTRADA (empresa contrata advogado):                        ║
║    Empresa com obrigação de adequação à LC 214/2025          ║
║    Advogado precisa diagnosticar e planejar                  ║
║                                                              ║
║  PASSO 1 — Coleta de dados (Steps 1–3):                      ║
║    ✓ 5 JSONs de perfil da empresa                           ║
║    ✓ Onda 1: questionário jurídico curado (SOLARIS)          ║
║    ✓ Onda 2: questionário personalizado (IA GEN)             ║
║    ✓ Onda 3: compliance normativo (NCM/NBS/CNAE)             ║
║    Gate P.O.: qualidade das perguntas e respostas            ║
║                                                              ║
║  PASSO 2 — Diagnóstico (Step 4):                             ║
║    ✓ Briefing gerado (LLM com RAG)                           ║
║    ✓ Advogado aprova o diagnóstico                           ║
║    Gate P.O.: briefing coerente com o perfil                 ║
║                                                              ║
║  PASSO 3 — Matriz de Riscos (Step 5):                        ║
║    ✓ Riscos gerados (100% determinístico)                    ║
║    ✓ Advogado aprova/rejeita cada risco                      ║
║    ✓ Bulk approve disponível                                 ║
║    Gate P.O.: Gate E (4 provas mensuráveis)                  ║
║                                                              ║
║  PASSO 4 — Planos de Ação (Step 6):                          ║
║    ✓ Planos gerados automaticamente (catálogo PLANS)         ║
║    ✓ Advogado aprova cada plano                              ║
║    ✓ Tarefas criadas manualmente                             ║
║    Gate P.O.: planos com responsável e prazo                 ║
║                                                              ║
║  PASSO 5 — Consolidação (Step 7) ← ENTREGÁVEL FINAL:        ║
║    ✓ Score de compliance (determinístico)                    ║
║    ✓ Diagnóstico completo com rastreabilidade                ║
║    ✓ PDF para o cliente (CNPJ + CNAEs + disclaimer)          ║
║    ✓ Histórico de snapshots (jornada até 2031)               ║
║    Gate P.O.: disclaimer presente, score auditável           ║
║                                                              ║
║  SAÍDA (cliente recebe):                                     ║
║    "Diagnóstico de Adequação LC 214/2025"                    ║
║    Documento auditável com rastreabilidade completa          ║
║    Base legal identificada por fonte e artigo                ║
║    Planos de ação com responsáveis e prazos                  ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  MÉTRICAS DE SUCESSO (P.O.):                                 ║
║    Score exibido com histórico de snapshots                  ║
║    100% dos riscos com origem rastreável                     ║
║    Disclaimer presente em tela e PDF                         ║
║    0 campos gerados por LLM no Step 7                        ║
║    PDF com CNPJ + CNAEs + data do diagnóstico                ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 14.2 — Visão técnica (implementação)

```
FLUXO DE IMPLEMENTAÇÃO — COMPONENTES E CHAMADAS

┌─────────────────────────────────────────────────────────────┐
│  ActionPlanPage.tsx                                         │
│  client/src/pages/ActionPlanPage.tsx                        │
│                                                             │
│  Evento: usuário clica "Aprovar plano"                      │
│    → trpc.risksV4.approveActionPlan({ planId })             │
│          ↓ server/routers/risks-v4.ts L~400                 │
│          SET action_plans.status = 'aprovado'               │
│          SET action_plans.approved_at = NOW()               │
│          SET action_plans.approved_by = ctx.user.id         │
│          INSERT audit_log (action='approved')               │
│          ↓ retorna { success: true }                        │
│    → onSuccess: navigate('/projetos/:id/consolidacao-v4')   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  ConsolidacaoV4.tsx                                         │
│  client/src/pages/ConsolidacaoV4.tsx                        │
│                                                             │
│  useEffect → trpc.risksV4.getConsolidacaoV4({ projectId })  │
│    ↓ server/routers/risks-v4.ts                             │
│                                                             │
│    QUERY 1: SELECT * FROM projects WHERE id = :id           │
│    QUERY 2: SELECT * FROM risks_v4                          │
│             WHERE project_id = :id                          │
│             AND type = 'risk'                               │
│             AND status = 'active'                           │
│             AND approved_at IS NOT NULL                     │
│    QUERY 3: SELECT * FROM risks_v4                          │
│             WHERE type = 'opportunity'                      │
│    QUERY 4: SELECT * FROM risks_v4                          │
│             WHERE status = 'deleted'                        │
│    QUERY 5: SELECT ap.*, t.*                                │
│             FROM action_plans ap                            │
│             LEFT JOIN tasks t ON t.action_plan_id = ap.id   │
│             WHERE ap.status = 'aprovado'                    │
│                                                             │
│    CÁLCULO: calculateComplianceScore(riscos)                │
│      → client/src/lib/calculateComplianceScore.ts           │
│      → fórmula: sum(peso×max(conf,0.5))/(n×9)×100           │
│                                                             │
│    SNAPSHOT: UPDATE projects SET scoringData = {...}        │
│      → acrescenta ao array snapshots[]                      │
│      → preserva histórico completo                          │
│                                                             │
│    RETORNA: ConsolidacaoV4Output (ver seção 7)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  COMPONENTES RENDERIZADOS                                   │
│                                                             │
│  <ConsolidacaoHeader />                                     │
│    → razaoSocial, CNPJ, CNAEs, datadiagnostico              │
│                                                             │
│  <ComplianceScoreCard risks={riscosAprovados} />            │
│    → calculateComplianceScore() (já entregue pelo consultor)│
│    → data-testid="compliance-score-card"                    │
│                                                             │
│  <AvisoPlanosSemTarefas />                                  │
│    → condicional: planos aprovados sem tasks                │
│                                                             │
│  <TabelaRiscosAprovados />                                  │
│    → badge de onda + breadcrumb + RAG status                │
│                                                             │
│  <SecaoOportunidades />                                     │
│    → seção separada, fora do score                          │
│                                                             │
│  <RiscosDesconsiderados />                                  │
│    → riscos com status='deleted' + motivo                   │
│                                                             │
│  <PlanosAprovados />                                        │
│    → agrupado por risco + tarefas expandíveis               │
│                                                             │
│  <BaseLegalAplicavel />                                     │
│    → cards por lei (LC 214, LC 224, LC 227...)              │
│                                                             │
│  <TimelineReforma />                                        │
│    → urgência mapeada para horizonte temporal               │
│                                                             │
│  <ProximosPassos nivel={scoreResult.nivel} />               │
│    → template PT-BR determinístico                          │
│                                                             │
│  <DisclaimerJuridico />                                     │
│    → texto fixo obrigatório                                 │
│                                                             │
│  <BotoesNavegacao />                                        │
│    → PDF · Ver projetos · Voltar planos · Ver projeto       │
└─────────────────────────────────────────────────────────────┘
                              ↓ (clique PDF)
┌─────────────────────────────────────────────────────────────┐
│  generateDiagnosticoPDF()                                   │
│  client/src/lib/generateDiagnosticoPDF.ts                   │
│                                                             │
│  import jsPDF from 'jspdf'         (v4.2.0)                 │
│  import autoTable from 'jspdf-autotable' (v5.0.7)           │
│                                                             │
│  Estrutura do PDF:                                          │
│    Capa: título + CNPJ + CNAEs + data                       │
│    Disclaimer (topo)                                        │
│    Score + nível + legenda                                  │
│    Tabela de riscos aprovados                               │
│    Seção oportunidades                                      │
│    Planos de ação                                           │
│    Base legal                                               │
│    Próximos passos                                          │
│    Disclaimer (rodapé)                                      │
│                                                             │
│  Nome do arquivo:                                           │
│    diagnostico-[CNPJ]-[YYYY-MM-DD].pdf                      │
└─────────────────────────────────────────────────────────────┘
```

---

### 14.3 — Visão do advogado (jornada do usuário)

```
PERSONA: Dr. Rodrigues — advogado tributarista experiente
CONTEXTO: precisa entregar diagnóstico ao cliente empresa XYZ

──────────────────────────────────────────────────────────────
FASE 1 — SETUP DO PROJETO (Steps 1–3)
──────────────────────────────────────────────────────────────

Advogado acessa IA SOLARIS
  ↓
Cria projeto para empresa XYZ
  → informa: razão social, CNPJ, CNAEs, regime tributário
  → confirma CNAEs (são a base de tudo)
  ↓
Responde questionários:
  [SOLARIS] 22 perguntas de prontidão operacional
  [IA GEN]  perguntas personalizadas pelo perfil da empresa
  [QC]      governança tributária corporativa
  [QO]      operações e compliance operacional
  [QCNAE]   1 questionário por CNAE confirmado

Advogado vê: "questionários respondidos → gerar diagnóstico"

──────────────────────────────────────────────────────────────
FASE 2 — DIAGNÓSTICO (Step 4)
──────────────────────────────────────────────────────────────

Sistema gera Briefing (LLM + RAG)
Advogado lê o briefing
  ↓
Advogado aprova o briefing
  → sistema gera os riscos automaticamente
  ↓
Redirect para RiskDashboardV4 (Step 5)

──────────────────────────────────────────────────────────────
FASE 3 — ANÁLISE DE RISCOS (Step 5)
──────────────────────────────────────────────────────────────

Advogado vê a Matriz de Riscos:
  [4 riscos Alta] [3 riscos Média] [3 Oportunidades]

Para cada risco, advogado verifica:
  → breadcrumb: [NCM 2202.10.00] › [imposto_seletivo]
               › [Art. 2 LC 214/2025] › [GAP-IS-001]
  → badge RAG: "✓ Artigo confirmado" ou "⚠ Revisão recomendada"
  → evidências do gap (fonte, pergunta, resposta)

Advogado toma decisão:
  ✓ Aprovar risco → risco confirmado para o diagnóstico
  ✗ Excluir risco → motivo obrigatório (≥10 chars)
  Bulk: "Aprovar matriz de riscos" → todos de uma vez

Após aprovação: redirect para ActionPlanPage (Step 6)

──────────────────────────────────────────────────────────────
FASE 4 — PLANOS DE AÇÃO (Step 6)
──────────────────────────────────────────────────────────────

Advogado vê os planos gerados automaticamente:
  "Implantar controle de apuração do IS" — Gestor fiscal — 90d
  "Adequar sistema para split payment" — TI — 90d
  "Plano de transição ISS → IBS" — Jurídico — 180d

Banner de rastreabilidade (sticky):
  [NCM 1006.40.00] › [aliquota_zero] › [Art. 14] › [GAP-AZ-001]

Para cada plano:
  → verifica título, responsável, prazo
  → adiciona tarefas manualmente se necessário:
    "+ Adicionar tarefa" → título + responsável + datas
  → clica "Aprovar plano"
    ↓
    Sistema salva approved_at = NOW()
    ↓
    REDIRECT AUTOMÁTICO para ConsolidacaoV4 (Step 7) ←

──────────────────────────────────────────────────────────────
FASE 5 — CONSOLIDAÇÃO (Step 7) — PONTO CHAVE
──────────────────────────────────────────────────────────────

Advogado chega na ConsolidacaoV4 e vê:

┌─────────────────────────────────────────────────────────┐
│ Diagnóstico de Adequação LC 214/2025                    │
│ Empresa XYZ Ltda · CNPJ XX.XXX.XXX/0001-XX             │
│ CNAEs: 4639-7/01 (Comércio atacadista)                  │
│ Data: 15/04/2026                                        │
├─────────────────────────────────────────────────────────┤
│ SCORE: 65 — Nível ALTO                                  │
│ [7 riscos] [4 alta] [3 média] [2 oportunidades]         │
│ [5 planos] [12 tarefas]                                 │
│                                                         │
│ Histórico: 15/04/2026: 65 · Alto                        │
├─────────────────────────────────────────────────────────┤
│ [tabela auditável de riscos — por origem e artigo]      │
├─────────────────────────────────────────────────────────┤
│ [oportunidades identificadas]                           │
├─────────────────────────────────────────────────────────┤
│ [planos aprovados com tarefas]                          │
├─────────────────────────────────────────────────────────┤
│ [base legal: LC 214/2025 — artigos aplicáveis]          │
├─────────────────────────────────────────────────────────┤
│ [linha do tempo 2026 → 2032]                            │
├─────────────────────────────────────────────────────────┤
│ PRÓXIMOS PASSOS: "Atenção necessária nos próximos       │
│ 30 a 90 dias. Inicie pelos planos de split_payment..."  │
├─────────────────────────────────────────────────────────┤
│ AVISO LEGAL: Este diagnóstico é uma ferramenta de       │
│ apoio à decisão tributária...                           │
├─────────────────────────────────────────────────────────┤
│ [Baixar PDF] [Ver projetos] [Voltar para planos]        │
└─────────────────────────────────────────────────────────┘

Advogado clica "Baixar PDF":
  → arquivo: diagnostico-XX.XXX.XXX-2026-04-15.pdf
  → entrega ao cliente em reunião

Advogado pode voltar depois:
  → busca projeto na lista
  → edita planos e tarefas
  → volta à ConsolidacaoV4 → novo snapshot gerado
  → histórico acumulado: [15/04/2026: 65] [10/01/2028: 58]
```

---

### 14.4 — Visão de arquitetura (troca de estados)

```
MÁQUINA DE ESTADOS — ENTIDADES ENVOLVIDAS NA CONSOLIDAÇÃO

══════════════════════════════════════════════════════════════
ENTIDADE: risks_v4
══════════════════════════════════════════════════════════════

  [gerado]
    status = 'active'
    approved_at = NULL
    approved_by = NULL
       │
       ├──── approveRisk() ────────────────────────────────→
       │       SET approved_at = NOW()                      │
       │       SET approved_by = user_id                    │
       │       INSERT audit_log (action='approved')         │
       │                                                    ↓
       │                                            [aprovado]
       │                                    status = 'active'
       │                               approved_at = NOT NULL
       │                                                    │
       │                                                    │──→ ENTRA no score
       │                                                    │──→ ENTRA na ConsolidacaoV4
       │
       ├──── deleteRisk(motivo) ───────────────────────────→
       │       SET status = 'deleted'                       │
       │       SET deleted_reason = motivo                  │
       │       INSERT audit_log (action='deleted')          │
       │       CASCADE: action_plans → status='deleted'     │
       │       CASCADE: tasks → status='deleted'            ↓
       │                                           [excluído]
       │                                    status = 'deleted'
       │                                                    │──→ APARECE em "Riscos desconsiderados"
       │                                                    │──→ NÃO entra no score
       │
       └──── restoreRisk() ────────────────────────────────→
               SET status = 'active'                        │
               approved_at = NULL (volta para pending)      │
               RESTORE: action_plans + tasks                ↓
                                                   [restaurado]
                                           precisa re-aprovar

══════════════════════════════════════════════════════════════
ENTIDADE: action_plans
══════════════════════════════════════════════════════════════

  [criado/gerado]
    status = 'rascunho'
    approved_at = NULL
    tasks: BLOQUEADAS (opacity 40%)
       │
       ├──── approveActionPlan() ──────────────────────────→
       │       SET status = 'aprovado'                      │
       │       SET approved_at = NOW()                      │
       │       SET approved_by = user_id                    │
       │       INSERT audit_log (action='approved')         │
       │       UNLOCK: tasks ficam interativas              │
       │       TRIGGER: navigate('/consolidacao-v4') ←──── GATILHO DO STEP 7
       │                                                    ↓
       │                                            [aprovado]
       │                                    tasks: LIBERADAS
       │                                                    │──→ ENTRA na ConsolidacaoV4
       │                                                    │──→ GATILHA snapshot do score
       │
       └──── deleteActionPlan(motivo) ─────────────────────→
               SET status = 'deleted'                       │
               CASCADE: tasks → status='deleted'            ↓
                                                   [excluído]
                                           restore disponível 90d

══════════════════════════════════════════════════════════════
ENTIDADE: tasks
══════════════════════════════════════════════════════════════

  [criada]
    status = 'todo'
    pointer-events: none (plano rascunho)
       │
       ├── plano aprovado → DESBLOQUEADA ──────────────────→
       │                                               [todo]
       │                                  interativa: sim
       │
       │──── upsertTask(status='doing') ───────────────────→
       │                                             [doing]
       │                                       Em andamento
       │
       │──── upsertTask(status='done') ────────────────────→
       │                                              [done]
       │                                           Concluída
       │                                    conta no progresso
       │
       │──── upsertTask(status='blocked') ─────────────────→
       │                                           [blocked]
       │                                           Bloqueada
       │
       └──── deleteTask(motivo) ────────────────────────────→
               SET status='deleted'                         │
               SET deleted_reason = motivo                  ↓
               INSERT audit_log                    [excluída]
                                           SEM opção de restore

══════════════════════════════════════════════════════════════
ENTIDADE: projects.scoringData
══════════════════════════════════════════════════════════════

  [projeto criado]
    scoringData = NULL
       │
       └── primeira visita à ConsolidacaoV4 ──────────────→
               calculateComplianceScore(riscosAprovados)    │
               snapshot #1 criado                           │
               scoringData = {                              │
                 snapshots: [snapshot#1],                   │
                 score_atual: 65,                           │
                 nivel_atual: 'alto'                        │
               }                                            ↓
                                                   [score v1]
                                                      65 · Alto
                                                           │
                                                           │ (6 meses depois)
                                                           ↓
       └── segunda visita ──────────────────────────────→
               calculateComplianceScore() recalcula         │
               snapshot #2 acrescido ao array               │
               scoringData.snapshots = [#1, #2]             │
               score_atual atualizado                       ↓
                                                   [score v2]
                                                      58 · Alto
                                               histórico: [65, 58]

══════════════════════════════════════════════════════════════
FLUXO DE ESTADOS — VISÃO MACRO
══════════════════════════════════════════════════════════════

  risks_v4.approved_at IS NULL  →  riscos PENDENTES
                                   não entram no score
                                   não aparecem na ConsolidacaoV4

  risks_v4.approved_at NOT NULL →  riscos APROVADOS
                                   ENTRAM no score
                                   APARECEM na ConsolidacaoV4
                                   base para planos e tarefas

  action_plans.status='rascunho' → planos PENDENTES
                                   tarefas BLOQUEADAS
                                   NÃO dispara consolidação

  action_plans.status='aprovado' → planos APROVADOS ←── GATILHO
                                   tarefas LIBERADAS
                                   DISPARA navigate('/consolidacao-v4')
                                   DISPARA snapshot do score

  projects.scoringData.snapshots → histórico IMUTÁVEL
                                   acumulado a cada visita
                                   auditável por timestamp
```

---

### 14.5 — Artefatos entregues no fluxo

```
ARTEFATOS PRODUZIDOS PELA PLATAFORMA
Cada artefato é rastreável à sua origem.

══════════════════════════════════════════════════════════════
ARTEFATO 1 — Respostas dos questionários (banco)
══════════════════════════════════════════════════════════════

  Produzido em: Steps 1–3
  Tabelas: solaris_answers + iagen_answers + questionnaire_answers_v3

  Conteúdo:
    Onda 1: N respostas SOLARIS por empresa
    Onda 2: 3–12 respostas IA GEN por empresa
    Onda 3: respostas QC + QO + (N × QCNAE)

  Rastreabilidade:
    Cada resposta → pergunta de origem → categoria de risco
    Onda 1: source_type='solaris' · badge "Equipe Jurídica SOLARIS"
    Onda 2: source_type='iagen'   · badge "Perfil da empresa"
    Onda 3: source_type='ncm/nbs/cnae' · badge por tipo

  Formato: JSON no banco · não há download direto

══════════════════════════════════════════════════════════════
ARTEFATO 2 — Gaps de compliance (banco)
══════════════════════════════════════════════════════════════

  Produzido em: pipeline (gap engine)
  Tabela: project_gaps_v3

  Conteúdo:
    Cada gap: requirement_id + categoria + fonte + confiança
    Status: mapped | ambiguous | unmapped

  Rastreabilidade:
    Gap → requisito normativo (regulatory_requirements_v3)
    Gap → resposta do questionário (fonte)
    Gap → categoria de risco (risk_category_code)

  Visibilidade ao usuário: indireta (via riscos)

══════════════════════════════════════════════════════════════
ARTEFATO 3 — Briefing (diagnóstico textual)
══════════════════════════════════════════════════════════════

  Produzido em: Step 4
  Tabela: projects.briefingData (JSON)

  Conteúdo:
    Síntese textual do diagnóstico
    Perfil da empresa + gaps identificados + contexto

  Gerado por: LLM (temperatura controlada) com RAG
  Aprovado por: advogado (clique explícito)
  Imutável após aprovação: SIM

  Formato: texto estruturado · exibido na tela

══════════════════════════════════════════════════════════════
ARTEFATO 4 — Matriz de Riscos (banco + UI)
══════════════════════════════════════════════════════════════

  Produzido em: Step 5
  Tabela: risks_v4

  Conteúdo por risco:
    id · ruleId · tipo · categoria
    severidade · urgência (determinísticos)
    breadcrumb 4 nós (fonte › categoria › artigo › gap)
    confidence · rag_validated · rag_artigo_exato
    evidence[] ordenada por SOURCE_RANK

  Rastreabilidade:
    Risco → gap → questionário → resposta → empresa
    Risco → artigo legal → corpus RAG
    Risco → aprovação (approved_by + approved_at)

  Visibilidade: RiskDashboardV4 (Step 5) + ConsolidacaoV4

══════════════════════════════════════════════════════════════
ARTEFATO 5 — Planos de Ação (banco + UI)
══════════════════════════════════════════════════════════════

  Produzido em: Step 6
  Tabelas: action_plans + tasks

  Conteúdo por plano:
    titulo · responsavel · prazo · status
    riskId (FK rastreável ao risco de origem)
    approved_at · approved_by

  Conteúdo por tarefa:
    titulo · responsavel · status
    data_inicio · data_fim
    actionPlanId (FK)

  Rastreabilidade:
    Plano → risco → gap → artigo legal
    Tarefa → plano → risco → empresa

  Visibilidade: ActionPlanPage (Step 6) + ConsolidacaoV4

══════════════════════════════════════════════════════════════
ARTEFATO 6 — Exposição ao Risco de Compliance (banco)
══════════════════════════════════════════════════════════════

  Produzido em: Step 7 (a cada visita)
  Campo: projects.scoringData (JSON)

  Conteúdo:
    score_atual · nivel_atual
    snapshots[]: timestamp + score + nivel + formula_version
    total_riscos_aprovados · total_alta · total_media

  Fórmula: sum(peso×max(confidence,0.5))/(n×9)×100
  Determinístico: SIM · mesmo input → mesmo output

  Rastreabilidade:
    Score → riscos aprovados → cálculo auditável por risco
    Cada risco → pontos_brutos = peso × confidence_aplicada
    Tabela auditável expansível na UI

  Visibilidade: ConsolidacaoV4 (principal) + snapshot histórico

══════════════════════════════════════════════════════════════
ARTEFATO 7 — Diagnóstico PDF (arquivo local do advogado)
══════════════════════════════════════════════════════════════

  Produzido em: Step 7 (clique no botão)
  Gerado por: jsPDF 4.2.0 + autoTable 5.0.7 (browser)
  Nome: diagnostico-[CNPJ]-[YYYY-MM-DD].pdf

  Conteúdo:
    Capa: título + empresa + CNPJ + CNAEs + data
    Disclaimer (topo)
    Score de compliance + nível + legenda
    Tabela de riscos aprovados com origem e base legal
    Seção de oportunidades
    Planos de ação com tarefas
    Base legal aplicável (por lei)
    Próximos passos
    Disclaimer (rodapé)

  Rastreabilidade total:
    Cada linha da tabela → risco aprovado no banco
    Cada artigo → corpus RAG (LC 214/2025 etc.)
    Cada plano → risco de origem (breadcrumb)

  Este é o ENTREGÁVEL FINAL para o cliente.
  Arquivo gerado no browser — sem tráfego de servidor.

══════════════════════════════════════════════════════════════
ARTEFATO 8 — Audit Log (banco · permanente)
══════════════════════════════════════════════════════════════

  Produzido em: toda mutação do sistema
  Tabela: audit_log

  Registra:
    entity: 'risk' | 'action_plan' | 'task'
    action: 'created' | 'updated' | 'deleted' | 'restored' | 'approved'
    before_state: JSON (obrigatório no delete)
    after_state: JSON
    reason: texto (obrigatório no delete)
    user_id · user_name · user_role
    created_at: timestamp

  Visibilidade:
    Aba "Histórico" na ActionPlanPage
    Seção "Riscos desconsiderados" na ConsolidacaoV4

  PERMANENTE: nunca deletado · base para auditoria fiscal

══════════════════════════════════════════════════════════════
RESUMO — artefatos por destinatário
══════════════════════════════════════════════════════════════

  SISTEMA (banco — interno):
    Artefato 1: respostas dos questionários
    Artefato 2: gaps de compliance
    Artefato 6: score + snapshots históricos
    Artefato 8: audit log permanente

  ADVOGADO (tela — operacional):
    Artefato 3: briefing aprovado
    Artefato 4: matriz de riscos (aprovação + rastreabilidade)
    Artefato 5: planos de ação + tarefas

  CLIENTE DA EMPRESA (arquivo — entregável):
    Artefato 7: PDF "Diagnóstico de Adequação LC 214/2025"
                CNPJ + CNAEs + score + riscos + planos + disclaimer
```

---

*IA SOLARIS · RN_CONSOLIDACAO_V4.md*
*Step 7 do Fluxo E2E · Diagnóstico de Adequação LC 214/2025*
*P.O.: Uires Tapajós · Sprint Z-16 · 15/04/2026*
*Versão: 1.1 — adicionados 5 fluxos (seção 14)*
*Documento vivo — atualizar a cada sprint*
