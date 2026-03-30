# SPEC — SEÇÃO 6: COCKPIT 3 ONDAS
## Especificação Técnica para o Cockpit P.O.

**Versão:** 1.0 — Draft para revisão pelo Consultor (ChatGPT)
**Data:** 2026-03-30
**Autores:** Manus (implementador técnico) + Orquestrador (Claude)
**P.O.:** Uires Tapajós
**Status:** 🟡 AGUARDA REVISÃO DO CONSULTOR — não enviar ao Orquestrador antes da crítica
**Destino:** `docs/painel-po/index.html` — nova Seção 6 após Seção 5 (Log de Decisões)
**GitHub Page:** https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/

---

## 1. CONTEXTO E MOTIVAÇÃO

### 1.1 O que existe hoje no cockpit

O Cockpit P.O. atual (`docs/painel-po/index.html`) possui 5 seções operacionais:

| Seção | Conteúdo | Tipo |
|---|---|---|
| Seção 0 | Entrada para agentes de IA (Manus / Claude / ChatGPT) | Estático |
| Seção 0B | Checklist de execução por modo (UAT / DEV / HOTFIX) | Estático + localStorage |
| Seção 1 | Status do projeto (fase, estado, bloqueios, próxima ação) | Vivo (fetch API GitHub) |
| Seção 2 | Radar de governança (CI/CD, issues, PRs, testes) | Vivo (fetch API GitHub) |
| Seção 3 | Painel de sprint (kanban drag-and-drop) | Estático + localStorage |
| Seção 4 | Relatório de documentação (6 abas, datas de commit) | Vivo (fetch API GitHub) |
| Seção 5 | Log de decisões (tabela editável) | Estático + localStorage |

### 1.2 O que está faltando

A Sprint K implementou o sistema de 3 Ondas de questionários — o diferencial competitivo central da plataforma. Existem dois documentos de arquitetura completos no repositório:

- `docs/arquitetura/TABELA-3-ONDAS-QUESTIONARIO-v1.md` — 535 linhas, referência canônica de produto
- `docs/arquitetura/E2E-3-ONDAS-QUESTIONARIOS-v1.md` — 758 linhas, fluxo técnico E2E completo

Esses documentos **não estão acessíveis no cockpit**. O P.O. precisa navegar até o GitHub para lê-los. Além disso, não existe nenhum painel de rastreabilidade vivo que mostre o estado atual das 3 Ondas: quais sprints foram concluídas, quais PRs foram mergeados, quais issues estão abertas, qual é o status de cada onda no produto.

### 1.3 O que esta spec propõe

Criar a **Seção 6 — Cockpit 3 Ondas** no cockpit P.O., com três sub-painéis:

| Sub-painel | Conteúdo | Tipo |
|---|---|---|
| **6A — Documentos** | Dois documentos de arquitetura em frame com abas | Estático (links) |
| **6B — Rastreabilidade Viva** | PRs, issues, milestones por sprint via fetch API GitHub | Vivo |
| **6C — Estado das Ondas** | Status atual de cada onda no produto (estático + vivo) | Misto |

---

## 2. WIREFRAME ASCII DA SEÇÃO 6

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SEÇÃO 6 — COCKPIT 3 ONDAS                                  [atualizado: ⟳] ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  6A — DOCUMENTOS DE ARQUITETURA                                      │   ║
║  │  [📄 TABELA-3-ONDAS]  [📋 E2E-3-ONDAS]  [🔗 Abrir no GitHub]       │   ║
║  │  ┌────────────────────────────────────────────────────────────────┐  │   ║
║  │  │                                                                │  │   ║
║  │  │   <iframe src="...TABELA-3-ONDAS-QUESTIONARIO-v1.md"          │  │   ║
║  │  │           renderizado via GitHub raw + marked.js>             │  │   ║
║  │  │                                                                │  │   ║
║  │  │   Altura: 500px | Overflow: scroll | Fundo: --bg2             │  │   ║
║  │  └────────────────────────────────────────────────────────────────┘  │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  6B — RASTREABILIDADE VIVA (fetch API GitHub)                        │   ║
║  │                                                                      │   ║
║  │  [Sprint K — M2]  [Sprint L — M3]  [Todos os PRs]  [Issues abertas] │   ║
║  │                                                                      │   ║
║  │  ┌──────────────────────────────────────────────────────────────┐   │   ║
║  │  │  SPRINT K — M2: Questionário 3 Ondas        8 fechadas/12   │   │   ║
║  │  │  ─────────────────────────────────────────────────────────── │   │   ║
║  │  │  ✅ #159 feat(k1): tabela solaris_questions    2026-03-27   │   │   ║
║  │  │  ✅ #162 feat(k2): Pipeline Onda 1             2026-03-27   │   │   ║
║  │  │  ✅ #171 feat(k3): badge visual + seed         2026-03-27   │   │   ║
║  │  │  ✅ #179 feat(k4-b): QuestionarioSolaris       2026-03-28   │   │   ║
║  │  │  ✅ #182 feat(k4-c): QuestionarioIaGen         2026-03-28   │   │   ║
║  │  │  ✅ #184 feat(k4-d): wiring etapas 7-8         2026-03-28   │   │   ║
║  │  │  ✅ #213 feat(k4-e): project_status_log        2026-03-29   │   │   ║
║  │  │  ⏳ #169 K-4 VALIDAÇÃO P.O. — Onda 2          aberta       │   │   ║
║  │  └──────────────────────────────────────────────────────────────┘   │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  6C — ESTADO ATUAL DAS 3 ONDAS                                       │   ║
║  │                                                                      │   ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   ║
║  │  │  🔵 ONDA 1   │  │  🟠 ONDA 2   │  │  🟢 ONDA 3   │              │   ║
║  │  │  SOLARIS     │  │  IA GEN      │  │  REGULATÓRIO │              │   ║
║  │  │              │  │              │  │              │              │   ║
║  │  │  ✅ Produção │  │  ✅ Produção │  │  ✅ Produção │              │   ║
║  │  │  12 perguntas│  │  5-10 geradas│  │  2.078 chunks│              │   ║
║  │  │  SOL-001..012│  │  por perfil  │  │  6 leis      │              │   ║
║  │  │              │  │              │  │              │              │   ║
║  │  │  Sprint K ✅ │  │  Sprint K ✅ │  │  Sprint H ✅ │              │   ║
║  │  │  Sprint L ⏳ │  │  — —         │  │  — —         │              │   ║
║  │  └──────────────┘  └──────────────┘  └──────────────┘              │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 3. ESPECIFICAÇÃO DETALHADA — SUB-PAINEL 6A (DOCUMENTOS)

### 3.1 Objetivo

Exibir os dois documentos de arquitetura das 3 Ondas **dentro do cockpit**, sem redirecionar o P.O. para o GitHub. O conteúdo Markdown é renderizado via `marked.js` (já disponível no ecossistema) carregado a partir do raw do GitHub.

### 3.2 Técnica de renderização

O cockpit **não pode usar `<iframe>` com conteúdo de outro domínio** sem CORS. A solução correta — já usada no cockpit atual para o fetch de dados — é:

```
1. fetch(rawGitHubUrl)          → texto Markdown bruto
2. marked.parse(markdownText)   → HTML renderizado
3. div.innerHTML = html          → injetado no container
```

**URLs dos documentos (raw GitHub):**

```
TABELA-3-ONDAS:
https://raw.githubusercontent.com/Solaris-Empresa/compliance-tributaria-v2/main/docs/arquitetura/TABELA-3-ONDAS-QUESTIONARIO-v1.md

E2E-3-ONDAS:
https://raw.githubusercontent.com/Solaris-Empresa/compliance-tributaria-v2/main/docs/arquitetura/E2E-3-ONDAS-QUESTIONARIOS-v1.md
```

### 3.3 Estrutura HTML do sub-painel 6A

```html
<!-- SUB-PAINEL 6A: Documentos de Arquitetura -->
<div class="ondas-doc-tabs">
  <button class="ondas-doc-tab active" onclick="setOndasDocTab('tabela', this)">
    📄 TABELA-3-ONDAS
  </button>
  <button class="ondas-doc-tab" onclick="setOndasDocTab('e2e', this)">
    📋 E2E-3-ONDAS
  </button>
  <a class="ondas-doc-tab-link" href="[URL_GITHUB_TABELA]" target="_blank">
    🔗 Abrir no GitHub
  </a>
</div>

<div id="ondasDocContainer" class="ondas-doc-container">
  <!-- Conteúdo Markdown renderizado via fetch + marked.js -->
  <div id="ondasDocLoading" class="ondas-doc-loading">
    ⟳ Carregando documento...
  </div>
  <div id="ondasDocContent" class="ondas-doc-content markdown-body">
    <!-- marked.parse(markdown) injetado aqui -->
  </div>
</div>
```

### 3.4 CSS do sub-painel 6A

```css
/* Abas de documento */
.ondas-doc-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  align-items: center;
}
.ondas-doc-tab {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  transition: all .15s;
}
.ondas-doc-tab.active {
  background: var(--blue);
  color: #fff;
  border-color: var(--blue);
}
.ondas-doc-tab-link {
  margin-left: auto;
  font-size: 11px;
  color: var(--blue);
  text-decoration: none;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 20px;
}
/* Container do documento */
.ondas-doc-container {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  height: 520px;
  overflow-y: auto;
  box-shadow: var(--shadow);
}
.ondas-doc-loading {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 40px 0;
}
/* Estilos Markdown dentro do container */
.ondas-doc-content h1 { font-size: 18px; font-weight: 800; margin-bottom: 12px; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 8px; }
.ondas-doc-content h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px; color: var(--text); text-transform: uppercase; letter-spacing: .06em; }
.ondas-doc-content h3 { font-size: 13px; font-weight: 700; margin: 14px 0 6px; color: var(--blue); }
.ondas-doc-content p  { font-size: 13px; line-height: 1.6; color: var(--text); margin-bottom: 10px; }
.ondas-doc-content table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px; }
.ondas-doc-content th { background: var(--bg); font-weight: 700; text-align: left; padding: 7px 10px; border: 1px solid var(--border); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-muted); }
.ondas-doc-content td { padding: 7px 10px; border: 1px solid var(--border); vertical-align: top; }
.ondas-doc-content code { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; font-size: 11px; font-family: monospace; }
.ondas-doc-content pre { background: #0F172A; color: #E2E8F0; border-radius: 6px; padding: 14px 16px; overflow-x: auto; font-size: 11px; margin-bottom: 14px; }
.ondas-doc-content pre code { background: none; border: none; padding: 0; color: inherit; }
.ondas-doc-content blockquote { border-left: 3px solid var(--blue); padding: 8px 14px; background: var(--blue-bg); margin: 10px 0; border-radius: 0 4px 4px 0; font-size: 12px; }
```

### 3.5 JavaScript do sub-painel 6A

```javascript
// ── Sub-painel 6A: Documentos de Arquitetura ──────────────────────────────
const ONDAS_DOCS = {
  tabela: {
    url: 'https://raw.githubusercontent.com/Solaris-Empresa/compliance-tributaria-v2/main/docs/arquitetura/TABELA-3-ONDAS-QUESTIONARIO-v1.md',
    github: 'https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/arquitetura/TABELA-3-ONDAS-QUESTIONARIO-v1.md',
    label: '📄 TABELA-3-ONDAS',
  },
  e2e: {
    url: 'https://raw.githubusercontent.com/Solaris-Empresa/compliance-tributaria-v2/main/docs/arquitetura/E2E-3-ONDAS-QUESTIONARIOS-v1.md',
    github: 'https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/arquitetura/E2E-3-ONDAS-QUESTIONARIOS-v1.md',
    label: '📋 E2E-3-ONDAS',
  },
};

let ondasDocCache = {};  // cache em memória para evitar re-fetch

async function setOndasDocTab(key, btn) {
  // Atualizar aba ativa
  document.querySelectorAll('.ondas-doc-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Atualizar link "Abrir no GitHub"
  const linkEl = document.querySelector('.ondas-doc-tab-link');
  if (linkEl) linkEl.href = ONDAS_DOCS[key].github;

  const container = document.getElementById('ondasDocContent');
  const loading   = document.getElementById('ondasDocLoading');

  // Usar cache se disponível
  if (ondasDocCache[key]) {
    if (loading) loading.style.display = 'none';
    if (container) container.innerHTML = ondasDocCache[key];
    return;
  }

  // Mostrar loading
  if (loading) loading.style.display = 'block';
  if (container) container.innerHTML = '';

  try {
    const resp = await fetch(ONDAS_DOCS[key].url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const md = await resp.text();

    // Renderizar Markdown — usar marked.js se disponível, fallback para <pre>
    let html;
    if (typeof marked !== 'undefined') {
      html = marked.parse(md);
    } else {
      // Fallback: exibir como texto pré-formatado
      html = '<pre style="white-space:pre-wrap;font-size:12px;">' + md.replace(/</g,'&lt;') + '</pre>';
    }

    ondasDocCache[key] = html;
    if (loading) loading.style.display = 'none';
    if (container) container.innerHTML = html;

  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (container) container.innerHTML =
      '<p style="color:var(--red);font-size:13px;">⚠ Erro ao carregar documento. ' +
      '<a href="' + ONDAS_DOCS[key].github + '" target="_blank">Abrir no GitHub →</a></p>';
  }
}

// Carregar aba padrão ao inicializar
// Chamado em: window.addEventListener('load', ...) junto com fetchGitHubData()
```

> **Dependência:** `marked.js` (biblioteca de renderização Markdown). Adicionar no `<head>`:
> ```html
> <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
> ```

---

## 4. ESPECIFICAÇÃO DETALHADA — SUB-PAINEL 6B (RASTREABILIDADE VIVA)

### 4.1 Objetivo

Exibir o estado atual das sprints K e L, com PRs, issues e milestones buscados em tempo real via API GitHub. O padrão de fetch é idêntico ao já usado no cockpit (função `ghFetch`).

### 4.2 Dados buscados via API GitHub

| Endpoint | Dados | Frequência |
|---|---|---|
| `GET /repos/{repo}/issues?milestone=9&state=all&per_page=50` | Issues + PRs do milestone M2 (Sprint K) | Na abertura da página |
| `GET /repos/{repo}/issues?milestone=10&state=all&per_page=50` | Issues + PRs do milestone M3 (Sprint L) | Na abertura da página |
| `GET /repos/{repo}/pulls?state=closed&per_page=50` | PRs mergeados (para filtrar por título) | Na abertura da página |
| `GET /repos/{repo}/milestones` | Progresso dos milestones (open/closed) | Na abertura da página |

**Rate limit:** 60 req/hora por IP (sem token). As 4 chamadas acima são executadas em `Promise.all`, consumindo 4 das 60 requisições disponíveis. O cockpit já consome ~3-4 chamadas para o Score de Saúde — total: ~8 chamadas por abertura de página. Margem confortável.

### 4.3 Estratégia de labels para rastreabilidade

O repositório já possui labels estruturadas que permitem filtrar por sprint e por onda:

| Label | Uso |
|---|---|
| `sprint:K` | Issues/PRs da Sprint K |
| `sprint:L` | Issues/PRs da Sprint L |
| `area:backend` | Backend (schema, routers) |
| `area:database` | Migrations |
| `area:frontend` | Componentes React |
| `p.o.-valida` | Requer validação do P.O. |
| `validation` | Issue de validação P.O. |
| `status:done` | Concluído |
| `status:in_progress` | Em andamento |
| `status:blocked` | Bloqueado |

**Proposta de novas labels** (a criar via PR de governança):

| Label nova | Cor | Descrição |
|---|---|---|
| `onda:1-solaris` | `#185FA5` (azul) | Issue/PR relacionado à Onda 1 |
| `onda:2-iagen` | `#D97706` (laranja) | Issue/PR relacionado à Onda 2 |
| `onda:3-regulatorio` | `#3B6D11` (verde) | Issue/PR relacionado à Onda 3 |

Essas labels permitem filtrar por onda na API: `GET /issues?labels=onda:1-solaris`.

### 4.4 Estrutura HTML do sub-painel 6B

```html
<!-- SUB-PAINEL 6B: Rastreabilidade Viva -->
<div class="rastreabilidade-header">
  <span id="rastreabilidadeStatus" class="rastreabilidade-status">⟳ Carregando...</span>
  <button onclick="fetchOndasRastreabilidade()" class="rastreabilidade-refresh">↺ Atualizar</button>
</div>

<div class="rastreabilidade-tabs">
  <button class="rastreabilidade-tab active" onclick="setRastrTab('sprint-k', this)">
    Sprint K — M2
  </button>
  <button class="rastreabilidade-tab" onclick="setRastrTab('sprint-l', this)">
    Sprint L — M3
  </button>
  <button class="rastreabilidade-tab" onclick="setRastrTab('prs', this)">
    PRs Mergeados
  </button>
  <button class="rastreabilidade-tab" onclick="setRastrTab('issues', this)">
    Issues Abertas
  </button>
</div>

<div id="rastreabilidadeContent" class="rastreabilidade-content">
  <!-- Tabela dinâmica injetada via JS -->
</div>

<!-- Barra de progresso dos milestones -->
<div class="milestone-progress-wrap">
  <div class="milestone-bar" id="milestoneK">
    <span class="milestone-label">Sprint K (M2)</span>
    <div class="milestone-track">
      <div class="milestone-fill" id="milestoneFillK" style="width:0%"></div>
    </div>
    <span class="milestone-pct" id="milestonePctK">—</span>
  </div>
  <div class="milestone-bar" id="milestoneL">
    <span class="milestone-label">Sprint L (M3)</span>
    <div class="milestone-track">
      <div class="milestone-fill amber" id="milestoneFillL" style="width:0%"></div>
    </div>
    <span class="milestone-pct" id="milestonePctL">—</span>
  </div>
</div>
```

### 4.5 JavaScript do sub-painel 6B

```javascript
// ── Sub-painel 6B: Rastreabilidade Viva ──────────────────────────────────
const MILESTONE_K = 9;   // M2 — Sprint K: Questionário 3 Ondas
const MILESTONE_L = 10;  // M3 — Sprint L: Upload CSV SOLARIS

// PRs das 3 Ondas (lista estática de fallback — atualizar a cada sprint)
const ONDAS_PRS_FALLBACK = [
  { number: 159, title: 'feat(k1): tabela solaris_questions', merged: '2026-03-27', sprint: 'K', onda: 1 },
  { number: 162, title: 'feat(k2): Pipeline Onda 1 no questionEngine', merged: '2026-03-27', sprint: 'K', onda: 1 },
  { number: 171, title: 'feat(k3): badge visual por onda + seed SOL-001..012', merged: '2026-03-27', sprint: 'K', onda: 1 },
  { number: 174, title: 'docs(arquitetura): FLUXO-3-ONDAS v1.1', merged: '2026-03-28', sprint: 'K', onda: null },
  { number: 179, title: 'feat(k4-b): QuestionarioSolaris + DiagnosticoStepper', merged: '2026-03-28', sprint: 'K', onda: 1 },
  { number: 180, title: 'fix(k4-b): NovoProjeto.tsx — navegação pós-CNAEs', merged: '2026-03-28', sprint: 'K', onda: 1 },
  { number: 181, title: 'fix(k4-b): VALID_TRANSITIONS — cnaes_confirmados → onda1_solaris', merged: '2026-03-28', sprint: 'K', onda: 1 },
  { number: 182, title: 'feat(k4-c): QuestionarioIaGen + completeOnda2', merged: '2026-03-28', sprint: 'K', onda: 2 },
  { number: 184, title: 'feat(k4-d): wiring etapas 7-8 no stepper + fix T06.1', merged: '2026-03-28', sprint: 'K', onda: null },
  { number: 213, title: 'feat(k4-e): project_status_log — auditoria jurídica', merged: '2026-03-29', sprint: 'K', onda: null },
  { number: 215, title: 'docs(arquitetura): TABELA-3-ONDAS-QUESTIONARIO-v1', merged: '2026-03-30', sprint: 'K', onda: null },
  { number: 216, title: 'docs(cockpit): atualizar MODO_CONFIG + FALLBACK', merged: '2026-03-30', sprint: 'K', onda: null },
  { number: 217, title: 'docs(arquitetura): E2E-3-ONDAS-QUESTIONARIOS-v1', merged: '2026-03-30', sprint: 'K', onda: null },
];

const GH_REPO = 'Solaris-Empresa/compliance-tributaria-v2';
const GH_API  = 'https://api.github.com/repos/' + GH_REPO;

let rastrCache = null;
let rastrTabAtiva = 'sprint-k';

function ondaBadge(onda) {
  if (onda === 1) return '<span style="background:#E8F0FB;color:#185FA5;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;">🔵 Onda 1</span>';
  if (onda === 2) return '<span style="background:#FEF3E2;color:#854F0B;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;">🟠 Onda 2</span>';
  if (onda === 3) return '<span style="background:#EBF4E3;color:#3B6D11;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;">🟢 Onda 3</span>';
  return '';
}

function stateIcon(state, merged) {
  if (merged) return '<span style="color:#3B6D11;font-weight:700;">✅</span>';
  if (state === 'open') return '<span style="color:#854F0B;font-weight:700;">⏳</span>';
  return '<span style="color:#6B6B6B;">—</span>';
}

function renderRastrTable(items, cols) {
  if (!items || items.length === 0) {
    return '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">Nenhum item encontrado.</p>';
  }
  let html = '<table class="rastr-table"><thead><tr>';
  cols.forEach(c => { html += '<th>' + c.label + '</th>'; });
  html += '</tr></thead><tbody>';
  items.forEach(item => {
    html += '<tr>';
    cols.forEach(c => { html += '<td>' + (c.render ? c.render(item) : (item[c.key] || '—')) + '</td>'; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

async function fetchOndasRastreabilidade() {
  const statusEl = document.getElementById('rastreabilidadeStatus');
  if (statusEl) statusEl.textContent = '⟳ Buscando dados do GitHub...';

  try {
    const [msData, issuesK, issuesL] = await Promise.all([
      ghFetch(GH_API + '/milestones'),
      ghFetch(GH_API + '/issues?milestone=' + MILESTONE_K + '&state=all&per_page=50'),
      ghFetch(GH_API + '/issues?milestone=' + MILESTONE_L + '&state=all&per_page=50'),
    ]);

    // Milestones
    const msK = msData.find(m => m.number === MILESTONE_K);
    const msL = msData.find(m => m.number === MILESTONE_L);
    if (msK) {
      const total = msK.open_issues + msK.closed_issues;
      const pct = total > 0 ? Math.round(msK.closed_issues / total * 100) : 0;
      const fillEl = document.getElementById('milestoneFillK');
      const pctEl  = document.getElementById('milestonePctK');
      if (fillEl) fillEl.style.width = pct + '%';
      if (pctEl)  pctEl.textContent = msK.closed_issues + '/' + total + ' (' + pct + '%)';
    }
    if (msL) {
      const total = msL.open_issues + msL.closed_issues;
      const pct = total > 0 ? Math.round(msL.closed_issues / total * 100) : 0;
      const fillEl = document.getElementById('milestoneFillL');
      const pctEl  = document.getElementById('milestonePctL');
      if (fillEl) fillEl.style.width = pct + '%';
      if (pctEl)  pctEl.textContent = msL.closed_issues + '/' + total + ' (' + pct + '%)';
    }

    // Separar issues de PRs
    const prsK = issuesK.filter(i => i.pull_request);
    const issK  = issuesK.filter(i => !i.pull_request);
    const prsL = issuesL.filter(i => i.pull_request);
    const issL  = issuesL.filter(i => !i.pull_request);

    rastrCache = { prsK, issK, prsL, issL, issuesK, issuesL };
    if (statusEl) statusEl.textContent = '✔ Atualizado em ' + new Date().toLocaleTimeString('pt-BR');

    renderRastrTab(rastrTabAtiva);

  } catch (err) {
    if (statusEl) statusEl.textContent = '⚠ Erro ao buscar dados — usando fallback';
    rastrCache = { prsK: ONDAS_PRS_FALLBACK.filter(p => p.sprint === 'K'), issK: [], prsL: [], issL: [], issuesK: [], issuesL: [] };
    renderRastrTab(rastrTabAtiva);
  }
}

function setRastrTab(key, btn) {
  rastrTabAtiva = key;
  document.querySelectorAll('.rastreabilidade-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderRastrTab(key);
}

function renderRastrTab(key) {
  const el = document.getElementById('rastreabilidadeContent');
  if (!el || !rastrCache) return;

  if (key === 'sprint-k') {
    const items = rastrCache.issuesK || [];
    el.innerHTML = renderRastrTable(items, [
      { label: '#', render: i => '<a href="https://github.com/' + GH_REPO + '/issues/' + i.number + '" target="_blank">#' + i.number + '</a>' },
      { label: 'Tipo', render: i => i.pull_request ? 'PR' : 'Issue' },
      { label: 'Título', render: i => '<span title="' + i.title + '">' + i.title.slice(0, 65) + (i.title.length > 65 ? '…' : '') + '</span>' },
      { label: 'Estado', render: i => stateIcon(i.state, i.pull_request?.merged_at) + ' ' + (i.state === 'closed' ? 'Fechado' : 'Aberto') },
      { label: 'Labels', render: i => i.labels.map(l => '<span class="rastr-label">' + l.name + '</span>').join(' ') },
    ]);
  } else if (key === 'sprint-l') {
    const items = rastrCache.issuesL || [];
    el.innerHTML = renderRastrTable(items, [
      { label: '#', render: i => '<a href="https://github.com/' + GH_REPO + '/issues/' + i.number + '" target="_blank">#' + i.number + '</a>' },
      { label: 'Tipo', render: i => i.pull_request ? 'PR' : 'Issue' },
      { label: 'Título', render: i => i.title.slice(0, 65) + (i.title.length > 65 ? '…' : '') },
      { label: 'Estado', render: i => stateIcon(i.state, null) + ' ' + (i.state === 'closed' ? 'Fechado' : 'Aberto') },
      { label: 'Labels', render: i => i.labels.map(l => '<span class="rastr-label">' + l.name + '</span>').join(' ') },
    ]);
  } else if (key === 'prs') {
    el.innerHTML = renderRastrTable(ONDAS_PRS_FALLBACK, [
      { label: '#', render: p => '<a href="https://github.com/' + GH_REPO + '/pull/' + p.number + '" target="_blank">#' + p.number + '</a>' },
      { label: 'Título', render: p => p.title.slice(0, 60) + (p.title.length > 60 ? '…' : '') },
      { label: 'Merge', key: 'merged' },
      { label: 'Sprint', key: 'sprint' },
      { label: 'Onda', render: p => ondaBadge(p.onda) },
    ]);
  } else if (key === 'issues') {
    const abertas = [...(rastrCache.issK || []), ...(rastrCache.issL || [])].filter(i => i.state === 'open');
    el.innerHTML = renderRastrTable(abertas, [
      { label: '#', render: i => '<a href="https://github.com/' + GH_REPO + '/issues/' + i.number + '" target="_blank">#' + i.number + '</a>' },
      { label: 'Título', render: i => i.title.slice(0, 65) + (i.title.length > 65 ? '…' : '') },
      { label: 'Milestone', render: i => i.milestone ? i.milestone.title.slice(0, 30) : '—' },
      { label: 'Labels', render: i => i.labels.map(l => '<span class="rastr-label">' + l.name + '</span>').join(' ') },
    ]);
  }
}
```

### 4.6 CSS do sub-painel 6B

```css
/* Rastreabilidade */
.rastreabilidade-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rastreabilidade-status { font-size: 11px; color: var(--text-muted); flex: 1; }
.rastreabilidade-refresh { font-size: 11px; padding: 3px 10px; border-radius: 4px; border: 1px solid var(--border); background: none; cursor: pointer; color: var(--blue); }
.rastreabilidade-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.rastreabilidade-tab { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-muted); transition: all .15s; }
.rastreabilidade-tab.active { background: var(--purple); color: #fff; border-color: var(--purple); }
.rastreabilidade-content { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; min-height: 200px; max-height: 360px; overflow-y: auto; box-shadow: var(--shadow); }
/* Tabela de rastreabilidade */
.rastr-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.rastr-table th { text-align: left; padding: 6px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); border-bottom: 1px solid var(--border); background: rgba(0,0,0,.02); }
.rastr-table td { padding: 7px 10px; border-bottom: 1px solid rgba(0,0,0,.04); vertical-align: top; }
.rastr-table tr:hover td { background: rgba(0,0,0,.02); }
.rastr-table a { color: var(--blue); font-weight: 600; }
.rastr-label { display: inline-block; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); margin-right: 3px; margin-bottom: 2px; color: var(--text-muted); }
/* Barras de progresso dos milestones */
.milestone-progress-wrap { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
.milestone-bar { display: flex; align-items: center; gap: 10px; }
.milestone-label { font-size: 11px; font-weight: 700; color: var(--text-muted); white-space: nowrap; min-width: 110px; }
.milestone-track { flex: 1; height: 8px; background: #E2E2DE; border-radius: 4px; overflow: hidden; }
.milestone-fill { height: 100%; background: var(--green); border-radius: 4px; transition: width .5s ease; }
.milestone-fill.amber { background: var(--amber); }
.milestone-pct { font-size: 11px; font-weight: 700; color: var(--text); white-space: nowrap; min-width: 80px; text-align: right; }
```

---

## 5. ESPECIFICAÇÃO DETALHADA — SUB-PAINEL 6C (ESTADO DAS ONDAS)

### 5.1 Objetivo

Exibir o estado atual de cada onda no produto — o que está em produção, o que está pendente, quantas perguntas/chunks existem — em cards visuais. Parte dos dados é estática (12 perguntas, 2.078 chunks), parte é dinâmica (status de CI, PRs abertos).

### 5.2 Estrutura HTML do sub-painel 6C

```html
<!-- SUB-PAINEL 6C: Estado das 3 Ondas -->
<div class="ondas-estado-grid">

  <!-- ONDA 1 -->
  <div class="onda-card onda1">
    <div class="onda-header">
      <span class="onda-badge onda1-badge">🔵 ONDA 1</span>
      <span class="onda-status-badge" id="onda1StatusBadge">✅ Produção</span>
    </div>
    <div class="onda-title">Questionário SOLARIS</div>
    <div class="onda-subtitle">Equipe Jurídica — conhecimento implícito</div>
    <div class="onda-metrics">
      <div class="onda-metric"><span class="metric-val">12</span><span class="metric-lbl">perguntas</span></div>
      <div class="onda-metric"><span class="metric-val">SOL-001..012</span><span class="metric-lbl">códigos</span></div>
      <div class="onda-metric"><span class="metric-val">4</span><span class="metric-lbl">áreas</span></div>
    </div>
    <div class="onda-sprints">
      <span class="onda-sprint done">Sprint K ✅</span>
      <span class="onda-sprint pending">Sprint L ⏳</span>
    </div>
    <div class="onda-prs">
      <a href="https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/159" target="_blank">#159</a>
      <a href="https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/162" target="_blank">#162</a>
      <a href="https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/171" target="_blank">#171</a>
      <a href="https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/179" target="_blank">#179</a>
    </div>
    <div class="onda-table-info">Tabelas: <code>solaris_questions</code> · <code>solaris_answers</code></div>
  </div>

  <!-- ONDA 2 -->
  <div class="onda-card onda2">
    <div class="onda-header">
      <span class="onda-badge onda2-badge">🟠 ONDA 2</span>
      <span class="onda-status-badge" id="onda2StatusBadge">✅ Produção</span>
    </div>
    <div class="onda-title">Questionário IA Generativa</div>
    <div class="onda-subtitle">Geração combinatória por perfil da empresa</div>
    <div class="onda-metrics">
      <div class="onda-metric"><span class="metric-val">5–10</span><span class="metric-lbl">perguntas geradas</span></div>
      <div class="onda-metric"><span class="metric-val">7</span><span class="metric-lbl">parâmetros</span></div>
      <div class="onda-metric"><span class="metric-val">GPT-4.1</span><span class="metric-lbl">modelo</span></div>
    </div>
    <div class="onda-sprints">
      <span class="onda-sprint done">Sprint K ✅</span>
    </div>
    <div class="onda-prs">
      <a href="https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/182" target="_blank">#182</a>
    </div>
    <div class="onda-table-info">Tabela: <code>iagen_answers</code></div>
  </div>

  <!-- ONDA 3 -->
  <div class="onda-card onda3">
    <div class="onda-header">
      <span class="onda-badge onda3-badge">🟢 ONDA 3</span>
      <span class="onda-status-badge" id="onda3StatusBadge">✅ Produção</span>
    </div>
    <div class="onda-title">Questionário Regulatório (RAG)</div>
    <div class="onda-subtitle">Corpus legislativo — LC 214, LC 224, LC 227...</div>
    <div class="onda-metrics">
      <div class="onda-metric"><span class="metric-val">2.078</span><span class="metric-lbl">chunks</span></div>
      <div class="onda-metric"><span class="metric-val">6</span><span class="metric-lbl">leis</span></div>
      <div class="onda-metric"><span class="metric-val">100%</span><span class="metric-lbl">anchor_id</span></div>
    </div>
    <div class="onda-sprints">
      <span class="onda-sprint done">Sprint H ✅</span>
      <span class="onda-sprint done">Sprint K ✅</span>
    </div>
    <div class="onda-table-info">Tabelas: <code>rag_documents</code> · <code>answers</code></div>
  </div>

</div>
```

### 5.3 CSS do sub-painel 6C

```css
/* Cards das ondas */
.ondas-estado-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.onda-card { border-radius: var(--radius); padding: 16px; border: 1px solid var(--border); background: var(--bg2); box-shadow: var(--shadow); }
.onda-card.onda1 { border-top: 3px solid #185FA5; }
.onda-card.onda2 { border-top: 3px solid #D97706; }
.onda-card.onda3 { border-top: 3px solid #3B6D11; }
.onda-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.onda-badge { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.onda1-badge { color: #185FA5; }
.onda2-badge { color: #D97706; }
.onda3-badge { color: #3B6D11; }
.onda-status-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--green-bg); color: var(--green); }
.onda-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.onda-subtitle { font-size: 11px; color: var(--text-muted); margin-bottom: 12px; }
.onda-metrics { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.onda-metric { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; text-align: center; }
.metric-val { display: block; font-size: 14px; font-weight: 800; color: var(--text); }
.metric-lbl { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.onda-sprints { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.onda-sprint { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
.onda-sprint.done { background: var(--green-bg); color: var(--green); }
.onda-sprint.pending { background: var(--amber-bg); color: var(--amber); }
.onda-prs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.onda-prs a { font-size: 11px; font-weight: 600; color: var(--blue); background: var(--blue-bg); padding: 2px 7px; border-radius: 10px; text-decoration: none; }
.onda-prs a:hover { text-decoration: underline; }
.onda-table-info { font-size: 11px; color: var(--text-muted); }
.onda-table-info code { font-size: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; }
```

---

## 6. ESTRUTURA COMPLETA DA SEÇÃO 6 NO HTML

```html
<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- SEÇÃO 6 — COCKPIT 3 ONDAS                                          -->
<!-- ═══════════════════════════════════════════════════════════════════ -->
<div class="section" id="section-3ondas">
  <div class="section-title">
    Seção 6 — Cockpit 3 Ondas
    <span style="font-weight:400;font-size:11px;text-transform:none;letter-spacing:0">
      (documentos, rastreabilidade viva e estado atual)
    </span>
    <span id="ondasLastUpdate" style="font-size:10px;color:var(--text-muted);margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;float:right;"></span>
  </div>

  <!-- 6A: Documentos de Arquitetura -->
  <div class="subsection-title">6A — Documentos de Arquitetura</div>
  <!-- [HTML do 6A conforme §3.3] -->

  <!-- 6B: Rastreabilidade Viva -->
  <div class="subsection-title" style="margin-top:20px;">6B — Rastreabilidade Viva <span style="font-size:10px;font-weight:400;">(fetch API GitHub)</span></div>
  <!-- [HTML do 6B conforme §4.4] -->

  <!-- 6C: Estado das 3 Ondas -->
  <div class="subsection-title" style="margin-top:20px;">6C — Estado Atual das 3 Ondas</div>
  <!-- [HTML do 6C conforme §5.2] -->

</div>
```

**CSS adicional para subsection-title:**
```css
.subsection-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--blue);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--border);
}
```

---

## 7. INTEGRAÇÃO COM O INIT DO COCKPIT

No bloco `window.addEventListener('load', ...)` existente, adicionar as chamadas:

```javascript
// Adicionar ao bloco de init existente (junto com fetchGitHubData e fetchDocDates):
setOndasDocTab('tabela', document.querySelector('.ondas-doc-tab.active'));
fetchOndasRastreabilidade();
```

---

## 8. ESTRATÉGIA DE LABELS GITHUB — RASTREABILIDADE POR ONDA

### 8.1 Labels a criar (PR de governança separado)

| Label | Cor hex | Descrição |
|---|---|---|
| `onda:1-solaris` | `#185FA5` | Issues/PRs da Onda 1 (SOLARIS) |
| `onda:2-iagen` | `#D97706` | Issues/PRs da Onda 2 (IA Gen) |
| `onda:3-regulatorio` | `#3B6D11` | Issues/PRs da Onda 3 (RAG) |
| `cockpit:3ondas` | `#7C3AED` | Issues/PRs relacionados ao Cockpit 3 Ondas |

### 8.2 Retroaplicar labels nos PRs existentes

| PR | Labels a adicionar |
|---|---|
| #159, #162, #171, #179, #180, #181 | `onda:1-solaris`, `sprint:K` |
| #182 | `onda:2-iagen`, `sprint:K` |
| #174, #213, #215, #217 | `sprint:K` |
| #157, #158, #152 | `onda:1-solaris`, `sprint:L` |

### 8.3 Endpoint de filtro por label (para uso futuro)

```
GET https://api.github.com/repos/Solaris-Empresa/compliance-tributaria-v2/issues
  ?labels=onda:1-solaris
  &state=all
  &per_page=50
```

---

## 9. INFORMAÇÕES ESTÁTICAS vs. VIVAS — MAPA COMPLETO

| Informação | Tipo | Fonte | Atualização |
|---|---|---|---|
| Conteúdo dos documentos TABELA-3-ONDAS e E2E-3-ONDAS | **Vivo** | fetch raw GitHub | A cada abertura da aba |
| PRs mergeados (lista fallback) | **Estático** | Hardcoded no JS | A cada sprint (manual) |
| Issues/PRs por milestone (Sprint K / L) | **Vivo** | fetch API GitHub `/issues?milestone=N` | Na abertura da página |
| Progresso dos milestones (barra %) | **Vivo** | fetch API GitHub `/milestones` | Na abertura da página |
| Issues abertas das 3 Ondas | **Vivo** | fetch API GitHub `/issues?milestone=N&state=open` | Na abertura da página |
| Métricas das ondas (12 perguntas, 2.078 chunks) | **Estático** | Hardcoded no HTML | Atualizar manualmente a cada sprint |
| Status de cada onda (✅ Produção / ⏳ Pendente) | **Estático** | Hardcoded no HTML | Atualizar manualmente a cada sprint |
| Sprints e PRs por onda (cards 6C) | **Estático** | Hardcoded no HTML | Atualizar manualmente a cada sprint |
| Timestamp da última atualização | **Vivo** | `new Date().toLocaleTimeString()` | A cada fetch bem-sucedido |

---

## 10. CRITÉRIOS DE ACEITE (PARA O P.O.)

| # | Critério | Como verificar |
|---|---|---|
| CA-01 | Seção 6 aparece após Seção 5 no cockpit | Rolar até o final da página |
| CA-02 | Aba "TABELA-3-ONDAS" carrega e renderiza o Markdown do documento | Clicar na aba — conteúdo aparece em ≤ 3s |
| CA-03 | Aba "E2E-3-ONDAS" carrega e renderiza o Markdown do documento | Clicar na aba — conteúdo aparece em ≤ 3s |
| CA-04 | Botão "Abrir no GitHub" leva ao arquivo correto no repositório | Clicar — URL correta no GitHub |
| CA-05 | Aba "Sprint K — M2" exibe issues e PRs do milestone M2 | Dados aparecem em ≤ 2s |
| CA-06 | Aba "Sprint L — M3" exibe issues e PRs do milestone M3 | Dados aparecem em ≤ 2s |
| CA-07 | Barras de progresso dos milestones exibem % correto | Comparar com GitHub Milestones |
| CA-08 | Aba "PRs Mergeados" exibe a lista com badges de onda | Lista visível com badges 🔵/🟠/🟢 |
| CA-09 | Aba "Issues Abertas" exibe apenas issues abertas das 3 Ondas | Comparar com GitHub Issues |
| CA-10 | Cards 6C exibem métricas corretas por onda | 12 perguntas / 5-10 / 2.078 chunks |
| CA-11 | Botão "↺ Atualizar" re-executa o fetch e atualiza timestamp | Clicar — timestamp muda |
| CA-12 | Em caso de falha de API, fallback estático é exibido sem erro | Testar com rede offline |
| CA-13 | Seção 6 é incluída na busca global do cockpit (Ctrl+F interno) | Buscar "Onda 1" no campo de busca |
| CA-14 | Responsividade: seção funciona em tela de 1280px | Redimensionar janela |

---

## 11. PERGUNTAS PARA O CONSULTOR (ChatGPT)

Esta spec será enviada ao Consultor para crítica antes de ir ao Orquestrador. As perguntas específicas são:

1. **Sobre a renderização Markdown:** A abordagem `fetch raw + marked.js` é a mais adequada para uma GitHub Page estática? Existe risco de CORS com o raw.githubusercontent.com?

2. **Sobre o rate limit:** Com 4 chamadas adicionais de fetch (milestones + issues K + issues L + PRs), o total sobe para ~8 chamadas por abertura de página. Isso é seguro para o limite de 60 req/hora sem token?

3. **Sobre as labels:** A proposta de criar `onda:1-solaris`, `onda:2-iagen`, `onda:3-regulatorio` é a melhor estratégia de rastreabilidade no GitHub? Existe alternativa mais simples (ex: usar apenas milestones)?

4. **Sobre o sub-painel 6C:** Os dados estáticos (12 perguntas, 2.078 chunks) devem ser mantidos hardcoded ou buscados via API (ex: contar linhas da tabela via endpoint tRPC)?

5. **Sobre a estrutura geral:** A divisão em 6A/6B/6C é clara para o P.O.? Existe alguma informação crítica que está faltando na spec?

---

## 12. HISTÓRICO DE DECISÕES DESTA SPEC

| Data | Decisão | Justificativa |
|---|---|---|
| 2026-03-30 | Usar `fetch raw + marked.js` em vez de `<iframe>` | GitHub Pages não permite iframe de outro domínio sem CORS; marked.js já é padrão |
| 2026-03-30 | Separar em 6A/6B/6C em vez de uma seção única | Cada sub-painel tem propósito distinto: leitura (6A), rastreabilidade (6B), status (6C) |
| 2026-03-30 | Manter lista de PRs como fallback estático | API GitHub não retorna PRs mergeados por milestone de forma confiável sem paginação |
| 2026-03-30 | Propor labels `onda:N-xxx` como PR separado | Não bloquear a implementação do cockpit pela criação de labels |
| 2026-03-30 | Dados de métricas (12 perguntas, 2.078 chunks) como estático | Esses números mudam apenas a cada sprint — não justifica chamada de API |

---

*Spec gerada em 2026-03-30*
*Aguarda revisão do Consultor (ChatGPT) antes de envio ao Orquestrador (Claude)*
*IA SOLARIS — Compliance Tributário da Reforma Tributária*
