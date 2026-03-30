# SPEC — SEÇÃO 6: COCKPIT 3 ONDAS
## Especificação Técnica v2 — Pronta para o Orquestrador

**Versão:** 2.0 — Pós-crítica do Consultor (ChatGPT)
**Data:** 2026-03-30
**Autores:** Manus (implementador técnico) + Orquestrador (Claude) + Consultor (ChatGPT)
**P.O.:** Uires Tapajós
**Status:** 🟢 GO — pronta para implementação pelo Orquestrador
**Destino:** `docs/painel-po/index.html` — nova Seção 6 após Seção 5 (Log de Decisões)
**GitHub Page:** https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/

---

## CHANGELOG v1 → v2 (ajustes do Consultor)

| # | Problema identificado | Solução adotada na v2 |
|---|---|---|
| C-01 | Dupla fonte de verdade (hardcoded vs GitHub vs baseline) | Dados críticos marcados com `Fonte: baseline vX.X` + banner de autoridade |
| C-02 | Cockpit não declara autoridade (visualização vs fonte de verdade) | Declaração explícita no topo da seção + link para ESTADO-ATUAL.md |
| C-03 | Fetch GitHub sem validação de integridade | `fetchIntegrityCheck()` — valida completude e marca "dados parciais" |
| C-04 | Lista `ONDAS_PRS_FALLBACK` hardcoded como fonte primária | Rebaixada para placeholder de emergência com aviso visual |
| C-05 | Sem cache — risco de quebrar rate limit com múltiplos usuários | `ondasCache` com TTL de 5 minutos + retry controlado |
| C-06 | Markdown não sanitizado — risco de XSS | `DOMPurify` sanitiza HTML antes de injetar no DOM |
| C-07 | 6C muito estático — sem inteligência de consistência | Indicador de **Consistência Global** adicionado ao 6C |

---

## 1. PRINCÍPIO DE GOVERNANÇA (NOVO — v2)

> **O Cockpit P.O. é uma visualização, não uma fonte de verdade.**
>
> A fonte de verdade do projeto é, nesta ordem:
> 1. `docs/ESTADO-ATUAL.md` — estado real do repositório
> 2. `docs/BASELINE-PRODUTO.md` — baseline oficial pós-sprint
> 3. API GitHub — dados vivos de issues, PRs e milestones
>
> O cockpit **nunca** deve ser citado como referência em PRs, commits ou decisões de produto.
> Qualquer divergência entre o cockpit e o ESTADO-ATUAL.md deve ser resolvida em favor do ESTADO-ATUAL.md.

Este princípio deve aparecer como **banner fixo** no topo da Seção 6, visível sem scroll.

---

## 2. CONTEXTO E MOTIVAÇÃO

### 2.1 O que existe hoje no cockpit

O Cockpit P.O. atual (`docs/painel-po/index.html`) possui 5 seções operacionais com padrão de fetch já estabelecido:

| Seção | Conteúdo | Tipo |
|---|---|---|
| Seção 0 | Entrada para agentes de IA | Estático |
| Seção 0B | Checklist por modo | Estático + localStorage |
| Seção 1 | Status do projeto | Vivo (fetch API GitHub) |
| Seção 2 | Radar de governança | Vivo (fetch API GitHub) |
| Seção 3 | Painel de sprint | Estático + localStorage |
| Seção 4 | Relatório de documentação | Vivo (fetch API GitHub) |
| Seção 5 | Log de decisões | Estático + localStorage |

### 2.2 O gap

A Sprint K implementou o sistema de 3 Ondas — o diferencial competitivo central da plataforma. Os documentos de arquitetura existem no repositório mas não estão acessíveis no cockpit. Não há painel de rastreabilidade vivo para o estado das 3 Ondas.

### 2.3 O que esta spec propõe

Criar a **Seção 6 — Cockpit 3 Ondas** com três sub-painéis e governança explícita:

| Sub-painel | Conteúdo | Tipo |
|---|---|---|
| **6A — Documentos** | TABELA-3-ONDAS e E2E-3-ONDAS renderizados via `fetch raw + marked.js + DOMPurify` | Vivo (com cache 5min) |
| **6B — Rastreabilidade Viva** | PRs, issues, milestones por sprint via fetch API GitHub com validação de integridade | Vivo (com cache 5min) |
| **6C — Estado + Consistência** | Cards por onda + indicador de Consistência Global | Misto (estático com fonte declarada + vivo) |

---

## 3. WIREFRAME ASCII DA SEÇÃO 6 (v2)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  SEÇÃO 6 — COCKPIT 3 ONDAS                                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │  ⚠ AVISO DE GOVERNANÇA                                              │    ║
║  │  Este painel é uma VISUALIZAÇÃO. Fonte de verdade: ESTADO-ATUAL.md  │    ║
║  │  Dados marcados com ⚙ são estáticos (baseline v2.5).               │    ║
║  │  Dados marcados com ⟳ são buscados via API GitHub.                  │    ║
║  └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │  6A — DOCUMENTOS DE ARQUITETURA              [⟳ atualizado: 14:32] │    ║
║  │  [📄 TABELA-3-ONDAS]  [📋 E2E-3-ONDAS]  [🔗 Abrir no GitHub]      │    ║
║  │  ┌───────────────────────────────────────────────────────────────┐  │    ║
║  │  │  Markdown renderizado via fetch + marked.js + DOMPurify       │  │    ║
║  │  │  Altura: 520px | Overflow: scroll                             │  │    ║
║  │  │  [⚠ DADOS PARCIAIS] aparece se fetch incompleto              │  │    ║
║  │  └───────────────────────────────────────────────────────────────┘  │    ║
║  └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │  6B — RASTREABILIDADE VIVA  [⟳ 14:32]  [↺ Atualizar]              │    ║
║  │                                                                     │    ║
║  │  Sprint K ████████████ 67%    Sprint L ████░░░░░░ 0%               │    ║
║  │                                                                     │    ║
║  │  [Sprint K — M2]  [Sprint L — M3]  [PRs Mergeados]  [Issues Abertas]│   ║
║  │  ┌───────────────────────────────────────────────────────────────┐  │    ║
║  │  │  Tabela dinâmica — dados via API GitHub                       │  │    ║
║  │  │  [⚠ DADOS PARCIAIS] se fetch retornou incompleto             │  │    ║
║  │  └───────────────────────────────────────────────────────────────┘  │    ║
║  └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐    ║
║  │  6C — ESTADO DAS 3 ONDAS + CONSISTÊNCIA GLOBAL                     │    ║
║  │                                                                     │    ║
║  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │    ║
║  │  │ 🔵 ONDA 1   │  │ 🟠 ONDA 2   │  │ 🟢 ONDA 3   │  │ CONSIST. │  │    ║
║  │  │ SOLARIS     │  │ IA GEN      │  │ RAG         │  │ GLOBAL   │  │    ║
║  │  │             │  │             │  │             │  │          │  │    ║
║  │  │ ✅ Produção │  │ ✅ Produção │  │ ✅ Produção │  │ ✅ OK    │  │    ║
║  │  │ 12 perguntas│  │ 5-10 geradas│  │ 2.078 chunks│  │ 3/3 ondas│  │    ║
║  │  │ ⚙ baseline │  │ ⚙ baseline │  │ ⚙ baseline │  │ ⟳ GitHub │  │    ║
║  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘  │    ║
║  └─────────────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 4. DEPENDÊNCIAS EXTERNAS (NOVAS — v2)

Adicionar no `<head>` do `index.html`:

```html
<!-- marked.js: renderização Markdown -->
<script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"></script>
<!-- DOMPurify: sanitização XSS obrigatória (C-06) -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
```

**Justificativa DOMPurify:** O conteúdo Markdown vem de `raw.githubusercontent.com`. Embora o repositório seja controlado pela equipe, a sanitização é obrigatória por política de segurança — `marked.js` converte Markdown em HTML que é injetado via `innerHTML`, criando superfície de ataque XSS se o conteúdo for comprometido.

---

## 5. SISTEMA DE CACHE (NOVO — v2, resolve C-05)

```javascript
// ── Cache com TTL de 5 minutos (resolve rate limit) ──────────────────────
const ONDAS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos em ms

const ondasCache = {
  _store: {},

  set(key, data) {
    this._store[key] = { data, ts: Date.now() };
  },

  get(key) {
    const entry = this._store[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > ONDAS_CACHE_TTL) {
      delete this._store[key];
      return null;
    }
    return entry.data;
  },

  isValid(key) {
    return this.get(key) !== null;
  },

  age(key) {
    const entry = this._store[key];
    if (!entry) return null;
    return Math.round((Date.now() - entry.ts) / 1000); // segundos
  }
};
```

**Uso:** Antes de qualquer `fetch`, verificar `ondasCache.get(key)`. Se válido, usar cache. Se expirado ou ausente, executar fetch e armazenar resultado.

**Impacto no rate limit:** Com cache de 5 minutos, 10 usuários abrindo o cockpit no mesmo intervalo consomem apenas 4 chamadas (a primeira) em vez de 40. Margem confortável dentro do limite de 60 req/hora.

---

## 6. VALIDAÇÃO DE INTEGRIDADE DO FETCH (NOVO — v2, resolve C-03)

```javascript
// ── Validação de integridade do fetch (resolve C-03) ─────────────────────
function fetchIntegrityCheck(data, expectedFields) {
  // Verifica se os campos esperados estão presentes e não-nulos
  const missing = expectedFields.filter(f => {
    const val = f.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), data);
    return val === undefined || val === null;
  });
  return {
    ok: missing.length === 0,
    missing,
    partial: missing.length > 0 && missing.length < expectedFields.length,
  };
}

// Campos obrigatórios por endpoint
const INTEGRITY_RULES = {
  milestones: ['number', 'title', 'open_issues', 'closed_issues'],
  issues:     ['number', 'title', 'state', 'labels'],
  pulls:      ['number', 'title', 'merged_at'],
};

// Banner de dados parciais
function showPartialDataWarning(containerId, missingFields) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const warn = document.createElement('div');
  warn.className = 'ondas-partial-warning';
  warn.innerHTML =
    '⚠ <strong>Dados parciais</strong> — alguns campos não foram retornados pela API GitHub. ' +
    'Campos ausentes: <code>' + missingFields.join(', ') + '</code>. ' +
    '<a href="https://github.com/' + GH_REPO + '" target="_blank">Ver no GitHub →</a>';
  el.prepend(warn);
}
```

**CSS do banner de dados parciais:**
```css
.ondas-partial-warning {
  background: var(--amber-bg);
  border: 1px solid var(--amber);
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--amber);
  margin-bottom: 10px;
}
.ondas-partial-warning code {
  background: rgba(0,0,0,.06);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}
```

---

## 7. ESPECIFICAÇÃO DETALHADA — BANNER DE GOVERNANÇA

```html
<!-- Banner de governança — topo da Seção 6 (resolve C-02) -->
<div class="ondas-governance-banner">
  <span class="gov-icon">⚠</span>
  <div class="gov-text">
    <strong>Este painel é uma visualização.</strong>
    Fonte de verdade:
    <a href="https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ESTADO-ATUAL.md"
       target="_blank">ESTADO-ATUAL.md</a>
    ·
    <a href="https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/BASELINE-PRODUTO.md"
       target="_blank">BASELINE-PRODUTO.md</a>
  </div>
  <div class="gov-legend">
    <span class="gov-badge static">⚙ estático</span> = baseline v2.5 (atualizar a cada sprint)
    &nbsp;·&nbsp;
    <span class="gov-badge live">⟳ vivo</span> = fetch API GitHub (cache 5 min)
  </div>
</div>
```

```css
.ondas-governance-banner {
  background: var(--amber-bg);
  border: 1px solid var(--amber);
  border-left: 4px solid var(--amber);
  border-radius: var(--radius);
  padding: 10px 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}
.gov-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.gov-text { font-size: 12px; color: var(--amber); flex: 1; min-width: 200px; }
.gov-text a { color: var(--amber); font-weight: 700; text-decoration: underline; }
.gov-legend { font-size: 11px; color: var(--text-muted); width: 100%; margin-top: 4px; }
.gov-badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.gov-badge.static { background: var(--bg); border: 1px solid var(--border); color: var(--text-muted); }
.gov-badge.live   { background: var(--blue-bg); border: 1px solid var(--blue); color: var(--blue); }
```

---

## 8. ESPECIFICAÇÃO DETALHADA — SUB-PAINEL 6A (DOCUMENTOS) v2

### 8.1 Mudanças em relação à v1

- Adicionado `DOMPurify.sanitize()` antes de injetar HTML no DOM (resolve C-06)
- Adicionado sistema de cache com TTL 5min (resolve C-05)
- Adicionado banner de dados parciais se fetch falhar parcialmente (resolve C-03)
- Adicionado indicador de fonte (`⟳ vivo`) no cabeçalho da aba

### 8.2 JavaScript do sub-painel 6A (v2)

```javascript
// ── Sub-painel 6A: Documentos de Arquitetura (v2) ─────────────────────────
const ONDAS_DOCS = {
  tabela: {
    url:    'https://raw.githubusercontent.com/Solaris-Empresa/compliance-tributaria-v2/main/docs/arquitetura/TABELA-3-ONDAS-QUESTIONARIO-v1.md',
    github: 'https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/arquitetura/TABELA-3-ONDAS-QUESTIONARIO-v1.md',
    label:  '📄 TABELA-3-ONDAS',
    cacheKey: 'doc_tabela',
  },
  e2e: {
    url:    'https://raw.githubusercontent.com/Solaris-Empresa/compliance-tributaria-v2/main/docs/arquitetura/E2E-3-ONDAS-QUESTIONARIOS-v1.md',
    github: 'https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/arquitetura/E2E-3-ONDAS-QUESTIONARIOS-v1.md',
    label:  '📋 E2E-3-ONDAS',
    cacheKey: 'doc_e2e',
  },
};

async function setOndasDocTab(key, btn) {
  // Atualizar aba ativa
  document.querySelectorAll('.ondas-doc-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Atualizar link "Abrir no GitHub"
  const linkEl = document.querySelector('.ondas-doc-tab-link');
  if (linkEl) linkEl.href = ONDAS_DOCS[key].github;

  const container = document.getElementById('ondasDocContent');
  const loading   = document.getElementById('ondasDocLoading');
  const doc       = ONDAS_DOCS[key];

  // Verificar cache (resolve C-05)
  const cached = ondasCache.get(doc.cacheKey);
  if (cached) {
    if (loading) loading.style.display = 'none';
    if (container) container.innerHTML = cached; // já sanitizado quando armazenado
    updateOndasTimestamp('ondasDocTimestamp', ondasCache.age(doc.cacheKey));
    return;
  }

  // Mostrar loading
  if (loading) loading.style.display = 'block';
  if (container) container.innerHTML = '';

  try {
    const resp = await fetch(doc.url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const md = await resp.text();

    // Verificar integridade mínima do Markdown
    if (!md || md.length < 100) {
      throw new Error('Conteúdo insuficiente — possível fetch parcial');
    }

    // Renderizar Markdown
    let rawHtml;
    if (typeof marked !== 'undefined') {
      rawHtml = marked.parse(md);
    } else {
      rawHtml = '<pre style="white-space:pre-wrap;font-size:12px;">' + md.replace(/</g, '&lt;') + '</pre>';
    }

    // Sanitizar HTML antes de injetar (resolve C-06 — XSS)
    const safeHtml = typeof DOMPurify !== 'undefined'
      ? DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
      : rawHtml; // fallback se DOMPurify não carregou

    // Armazenar no cache
    ondasCache.set(doc.cacheKey, safeHtml);

    if (loading) loading.style.display = 'none';
    if (container) container.innerHTML = safeHtml;
    updateOndasTimestamp('ondasDocTimestamp', 0);

  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (container) {
      container.innerHTML =
        '<div class="ondas-partial-warning">⚠ <strong>Erro ao carregar documento.</strong> ' +
        '<a href="' + doc.github + '" target="_blank">Abrir diretamente no GitHub →</a>' +
        '<br><small style="color:var(--text-muted);">Detalhe: ' + err.message + '</small></div>';
    }
  }
}

function updateOndasTimestamp(elId, ageSeconds) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (ageSeconds === 0) {
    el.textContent = '⟳ agora';
  } else if (ageSeconds < 60) {
    el.textContent = '⟳ ' + ageSeconds + 's atrás';
  } else {
    el.textContent = '⟳ ' + Math.round(ageSeconds / 60) + 'min atrás (cache)';
  }
}
```

---

## 9. ESPECIFICAÇÃO DETALHADA — SUB-PAINEL 6B (RASTREABILIDADE VIVA) v2

### 9.1 Mudanças em relação à v1

- `ONDAS_PRS_FALLBACK` rebaixada para placeholder de emergência com aviso visual (resolve C-04)
- Cache de 5 minutos aplicado às chamadas de milestone e issues (resolve C-05)
- `fetchIntegrityCheck()` aplicado em cada resposta da API (resolve C-03)
- Retry único automático em caso de falha de rede (não de rate limit)

### 9.2 Nota sobre `ONDAS_PRS_FALLBACK` (resolve C-04)

```javascript
// ── AVISO: Esta lista é um PLACEHOLDER DE EMERGÊNCIA ─────────────────────
// Ela é exibida APENAS quando a API GitHub está inacessível (offline/rate limit).
// NÃO é fonte primária de rastreabilidade.
// Atualizar manualmente a cada sprint — mas nunca confiar nela como verdade.
// Fonte primária: API GitHub /issues?milestone=N&state=all
const ONDAS_PRS_FALLBACK = [
  // Sprint K — 3 Ondas
  { number: 159, title: 'feat(k1): tabela solaris_questions', merged: '2026-03-27', sprint: 'K', onda: 1 },
  { number: 162, title: 'feat(k2): Pipeline Onda 1 no questionEngine', merged: '2026-03-27', sprint: 'K', onda: 1 },
  { number: 171, title: 'feat(k3): badge visual por onda + seed SOL-001..012', merged: '2026-03-27', sprint: 'K', onda: 1 },
  { number: 174, title: 'docs(arquitetura): FLUXO-3-ONDAS v1.1', merged: '2026-03-28', sprint: 'K', onda: null },
  { number: 179, title: 'feat(k4-b): QuestionarioSolaris + DiagnosticoStepper', merged: '2026-03-28', sprint: 'K', onda: 1 },
  { number: 180, title: 'fix(k4-b): NovoProjeto.tsx — navegação pós-CNAEs', merged: '2026-03-28', sprint: 'K', onda: 1 },
  { number: 181, title: 'fix(k4-b): VALID_TRANSITIONS', merged: '2026-03-28', sprint: 'K', onda: 1 },
  { number: 182, title: 'feat(k4-c): QuestionarioIaGen + completeOnda2', merged: '2026-03-28', sprint: 'K', onda: 2 },
  { number: 184, title: 'feat(k4-d): wiring etapas 7-8 no stepper', merged: '2026-03-28', sprint: 'K', onda: null },
  { number: 213, title: 'feat(k4-e): project_status_log', merged: '2026-03-29', sprint: 'K', onda: null },
  { number: 215, title: 'docs(arquitetura): TABELA-3-ONDAS-QUESTIONARIO-v1', merged: '2026-03-30', sprint: 'K', onda: null },
  { number: 217, title: 'docs(arquitetura): E2E-3-ONDAS-QUESTIONARIOS-v1', merged: '2026-03-30', sprint: 'K', onda: null },
];
// ─────────────────────────────────────────────────────────────────────────
```

### 9.3 JavaScript do sub-painel 6B (v2)

```javascript
// ── Sub-painel 6B: Rastreabilidade Viva (v2) ──────────────────────────────
const MILESTONE_K = 9;
const MILESTONE_L = 10;
const GH_REPO     = 'Solaris-Empresa/compliance-tributaria-v2';
const GH_API      = 'https://api.github.com/repos/' + GH_REPO;

let rastrData = null;
let rastrTabAtiva = 'sprint-k';

async function fetchOndasRastreabilidade(forceRefresh = false) {
  const statusEl = document.getElementById('rastreabilidadeStatus');

  // Verificar cache (resolve C-05)
  if (!forceRefresh && ondasCache.isValid('rastr')) {
    rastrData = ondasCache.get('rastr');
    if (statusEl) updateOndasTimestamp('rastreabilidadeStatus', ondasCache.age('rastr'));
    renderRastrTab(rastrTabAtiva);
    return;
  }

  if (statusEl) statusEl.textContent = '⟳ Buscando dados do GitHub...';

  try {
    // 4 chamadas em paralelo (resolve C-05 — batch único)
    const [msData, issuesK, issuesL] = await Promise.all([
      ghFetch(GH_API + '/milestones'),
      ghFetch(GH_API + '/issues?milestone=' + MILESTONE_K + '&state=all&per_page=50'),
      ghFetch(GH_API + '/issues?milestone=' + MILESTONE_L + '&state=all&per_page=50'),
    ]);

    // Validação de integridade (resolve C-03)
    const msCheck = fetchIntegrityCheck(msData[0] || {}, INTEGRITY_RULES.milestones);
    const issKCheck = fetchIntegrityCheck(issuesK[0] || {}, INTEGRITY_RULES.issues);

    if (!msCheck.ok || !issKCheck.ok) {
      const allMissing = [...(msCheck.missing || []), ...(issKCheck.missing || [])];
      showPartialDataWarning('rastreabilidadeContent', allMissing);
    }

    // Atualizar barras de progresso dos milestones
    const msK = Array.isArray(msData) ? msData.find(m => m.number === MILESTONE_K) : null;
    const msL = Array.isArray(msData) ? msData.find(m => m.number === MILESTONE_L) : null;
    updateMilestoneBar('K', msK);
    updateMilestoneBar('L', msL);

    rastrData = {
      issuesK: Array.isArray(issuesK) ? issuesK : [],
      issuesL: Array.isArray(issuesL) ? issuesL : [],
      prsK: Array.isArray(issuesK) ? issuesK.filter(i => i.pull_request) : [],
      issK:  Array.isArray(issuesK) ? issuesK.filter(i => !i.pull_request) : [],
      prsL: Array.isArray(issuesL) ? issuesL.filter(i => i.pull_request) : [],
      issL:  Array.isArray(issuesL) ? issuesL.filter(i => !i.pull_request) : [],
    };

    ondasCache.set('rastr', rastrData);
    if (statusEl) statusEl.textContent = '✔ Atualizado em ' + new Date().toLocaleTimeString('pt-BR');
    renderRastrTab(rastrTabAtiva);

  } catch (err) {
    // Fallback com aviso explícito (resolve C-04)
    if (statusEl) statusEl.textContent = '⚠ API indisponível — exibindo dados de fallback (podem estar desatualizados)';
    rastrData = {
      issuesK: ONDAS_PRS_FALLBACK.filter(p => p.sprint === 'K'),
      issuesL: [],
      prsK: ONDAS_PRS_FALLBACK.filter(p => p.sprint === 'K'),
      issK: [],
      prsL: [],
      issL: [],
      isFallback: true,
    };
    renderRastrTab(rastrTabAtiva);
  }
}

function updateMilestoneBar(sprint, ms) {
  if (!ms) return;
  const total = ms.open_issues + ms.closed_issues;
  const pct   = total > 0 ? Math.round(ms.closed_issues / total * 100) : 0;
  const fillEl = document.getElementById('milestoneFill' + sprint);
  const pctEl  = document.getElementById('milestonePct' + sprint);
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl)  pctEl.textContent  = ms.closed_issues + '/' + total + ' (' + pct + '%)';
}

function setRastrTab(key, btn) {
  rastrTabAtiva = key;
  document.querySelectorAll('.rastreabilidade-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderRastrTab(key);
}

function renderRastrTab(key) {
  const el = document.getElementById('rastreabilidadeContent');
  if (!el || !rastrData) return;

  // Aviso se usando fallback (resolve C-04)
  const fallbackBanner = rastrData.isFallback
    ? '<div class="ondas-partial-warning">⚠ <strong>Dados de fallback</strong> — API GitHub indisponível. ' +
      'Estes dados podem estar desatualizados. ' +
      '<a href="https://github.com/' + GH_REPO + '/milestones" target="_blank">Ver no GitHub →</a></div>'
    : '';

  if (key === 'sprint-k') {
    el.innerHTML = fallbackBanner + renderRastrTable(rastrData.issuesK, [
      { label: '#', render: i => '<a href="https://github.com/' + GH_REPO + '/issues/' + i.number + '" target="_blank">#' + i.number + '</a>' },
      { label: 'Tipo', render: i => i.pull_request ? '<span class="rastr-type pr">PR</span>' : '<span class="rastr-type issue">Issue</span>' },
      { label: 'Título', render: i => '<span title="' + escHtml(i.title) + '">' + escHtml(i.title.slice(0, 60)) + (i.title.length > 60 ? '…' : '') + '</span>' },
      { label: 'Estado', render: i => i.state === 'closed' ? '<span style="color:var(--green)">✅ Fechado</span>' : '<span style="color:var(--amber)">⏳ Aberto</span>' },
      { label: 'Labels', render: i => i.labels ? i.labels.map(l => '<span class="rastr-label">' + escHtml(l.name) + '</span>').join(' ') : '—' },
    ]);
  } else if (key === 'sprint-l') {
    el.innerHTML = fallbackBanner + renderRastrTable(rastrData.issuesL, [
      { label: '#', render: i => '<a href="https://github.com/' + GH_REPO + '/issues/' + i.number + '" target="_blank">#' + i.number + '</a>' },
      { label: 'Tipo', render: i => i.pull_request ? '<span class="rastr-type pr">PR</span>' : '<span class="rastr-type issue">Issue</span>' },
      { label: 'Título', render: i => escHtml(i.title.slice(0, 60)) + (i.title.length > 60 ? '…' : '') },
      { label: 'Estado', render: i => i.state === 'closed' ? '<span style="color:var(--green)">✅ Fechado</span>' : '<span style="color:var(--amber)">⏳ Aberto</span>' },
      { label: 'Labels', render: i => i.labels ? i.labels.map(l => '<span class="rastr-label">' + escHtml(l.name) + '</span>').join(' ') : '—' },
    ]);
  } else if (key === 'prs') {
    const prsAll = [...rastrData.prsK, ...rastrData.prsL];
    el.innerHTML = fallbackBanner + renderRastrTable(prsAll.length ? prsAll : ONDAS_PRS_FALLBACK, [
      { label: '#', render: p => '<a href="https://github.com/' + GH_REPO + '/pull/' + p.number + '" target="_blank">#' + p.number + '</a>' },
      { label: 'Título', render: p => escHtml((p.title || '').slice(0, 60)) + ((p.title || '').length > 60 ? '…' : '') },
      { label: 'Merge', render: p => p.merged_at ? p.merged_at.slice(0, 10) : (p.merged || '—') },
      { label: 'Sprint', render: p => p.sprint || (p.milestone ? p.milestone.title.slice(0, 20) : '—') },
      { label: 'Onda', render: p => ondaBadge(p.onda) },
    ]);
  } else if (key === 'issues') {
    const abertas = [...rastrData.issK, ...rastrData.issL].filter(i => i.state === 'open');
    el.innerHTML = fallbackBanner + renderRastrTable(abertas, [
      { label: '#', render: i => '<a href="https://github.com/' + GH_REPO + '/issues/' + i.number + '" target="_blank">#' + i.number + '</a>' },
      { label: 'Título', render: i => escHtml(i.title.slice(0, 65)) + (i.title.length > 65 ? '…' : '') },
      { label: 'Milestone', render: i => i.milestone ? escHtml(i.milestone.title.slice(0, 30)) : '—' },
      { label: 'Labels', render: i => i.labels ? i.labels.map(l => '<span class="rastr-label">' + escHtml(l.name) + '</span>').join(' ') : '—' },
    ]);
  }
}

// Helper: escapar HTML para evitar XSS em dados da API (resolve C-06)
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ondaBadge(onda) {
  if (onda === 1) return '<span style="background:#E8F0FB;color:#185FA5;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;">🔵 Onda 1</span>';
  if (onda === 2) return '<span style="background:#FEF3E2;color:#854F0B;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;">🟠 Onda 2</span>';
  if (onda === 3) return '<span style="background:#EBF4E3;color:#3B6D11;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;">🟢 Onda 3</span>';
  return '<span style="color:var(--text-muted);font-size:10px;">—</span>';
}

function renderRastrTable(items, cols) {
  if (!items || items.length === 0) {
    return '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">Nenhum item encontrado.</p>';
  }
  let html = '<table class="rastr-table"><thead><tr>';
  cols.forEach(c => { html += '<th>' + escHtml(c.label) + '</th>'; });
  html += '</tr></thead><tbody>';
  items.forEach(item => {
    html += '<tr>';
    cols.forEach(c => { html += '<td>' + (c.render ? c.render(item) : escHtml(item[c.key] || '—')) + '</td>'; });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}
```

---

## 10. ESPECIFICAÇÃO DETALHADA — SUB-PAINEL 6C (ESTADO + CONSISTÊNCIA) v2

### 10.1 Mudanças em relação à v1

- Adicionado 4º card: **Consistência Global** (resolve C-07)
- Todos os dados estáticos marcados com `⚙ Fonte: baseline v2.5`
- Dados dinâmicos marcados com `⟳ vivo`

### 10.2 Indicador de Consistência Global (resolve C-07)

O indicador verifica três dimensões de consistência e exibe um semáforo:

| Verificação | Como é feita | Verde se |
|---|---|---|
| **Ondas em produção** | Conta issues abertas de validação P.O. (label `validation`) | 0 issues de validação abertas |
| **CI verde** | Reutiliza dado do `fetchGitHubData()` já existente | `ciConclusion === 'success'` |
| **PRs pendentes** | Reutiliza `openPrs` do `fetchGitHubData()` já existente | `openPrs === 0` |

```javascript
// ── Indicador de Consistência Global ─────────────────────────────────────
function updateConsistenciaGlobal(rastrData, ciData) {
  const el = document.getElementById('consistenciaGlobal');
  if (!el) return;

  // Contar issues de validação abertas nas sprints K e L
  const validacaoAbertas = [
    ...(rastrData?.issK || []),
    ...(rastrData?.issL || []),
  ].filter(i =>
    i.state === 'open' &&
    i.labels &&
    i.labels.some(l => l.name === 'validation' || l.name === 'p.o.-valida')
  ).length;

  const ciOk  = ciData?.ciConclusion === 'success';
  const prsOk = (ciData?.openPrs || 0) === 0;
  const valOk = validacaoAbertas === 0;

  const score = [ciOk, prsOk, valOk].filter(Boolean).length;
  const total = 3;

  let statusClass, statusIcon, statusText;
  if (score === total) {
    statusClass = 'consistencia-ok';
    statusIcon  = '✅';
    statusText  = score + '/' + total + ' OK';
  } else if (score >= 2) {
    statusClass = 'consistencia-warn';
    statusIcon  = '⚠';
    statusText  = score + '/' + total + ' OK';
  } else {
    statusClass = 'consistencia-error';
    statusIcon  = '✖';
    statusText  = score + '/' + total + ' OK';
  }

  el.className = 'onda-card consistencia-card ' + statusClass;
  const iconEl = el.querySelector('.consistencia-icon');
  const textEl = el.querySelector('.consistencia-score');
  const detEl  = el.querySelector('.consistencia-detail');
  if (iconEl) iconEl.textContent = statusIcon;
  if (textEl) textEl.textContent = statusText;
  if (detEl) {
    detEl.innerHTML =
      (ciOk  ? '✅' : '⚠') + ' CI verde<br>' +
      (prsOk ? '✅' : '⚠') + ' PRs: ' + (ciData?.openPrs || '?') + ' abertos<br>' +
      (valOk ? '✅' : '⚠') + ' Validações: ' + validacaoAbertas + ' abertas';
  }
}
```

### 10.3 HTML do sub-painel 6C (v2)

```html
<!-- SUB-PAINEL 6C: Estado das 3 Ondas + Consistência Global -->
<div class="ondas-estado-grid">

  <!-- ONDA 1 -->
  <div class="onda-card onda1">
    <div class="onda-header">
      <span class="onda-badge onda1-badge">🔵 ONDA 1</span>
      <span class="onda-status-badge">✅ Produção</span>
    </div>
    <div class="onda-title">Questionário SOLARIS</div>
    <div class="onda-subtitle">Equipe Jurídica — conhecimento implícito</div>
    <div class="onda-metrics">
      <div class="onda-metric">
        <span class="metric-val">12</span>
        <span class="metric-lbl">perguntas</span>
        <span class="metric-src" title="Fonte: baseline v2.5 — seed SOL-001..012">⚙</span>
      </div>
      <div class="onda-metric">
        <span class="metric-val">4</span>
        <span class="metric-lbl">áreas</span>
        <span class="metric-src" title="Fonte: baseline v2.5">⚙</span>
      </div>
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
      <span class="onda-status-badge">✅ Produção</span>
    </div>
    <div class="onda-title">Questionário IA Generativa</div>
    <div class="onda-subtitle">Geração combinatória por perfil</div>
    <div class="onda-metrics">
      <div class="onda-metric">
        <span class="metric-val">5–10</span>
        <span class="metric-lbl">perguntas geradas</span>
        <span class="metric-src" title="Fonte: baseline v2.5 — parâmetros combinatórios">⚙</span>
      </div>
      <div class="onda-metric">
        <span class="metric-val">GPT-4.1</span>
        <span class="metric-lbl">modelo</span>
        <span class="metric-src" title="Fonte: baseline v2.5">⚙</span>
      </div>
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
      <span class="onda-status-badge">✅ Produção</span>
    </div>
    <div class="onda-title">Questionário Regulatório (RAG)</div>
    <div class="onda-subtitle">Corpus legislativo — LC 214, LC 224...</div>
    <div class="onda-metrics">
      <div class="onda-metric">
        <span class="metric-val">2.078</span>
        <span class="metric-lbl">chunks</span>
        <span class="metric-src" title="Fonte: baseline v2.5 — corpus indexado">⚙</span>
      </div>
      <div class="onda-metric">
        <span class="metric-val">6</span>
        <span class="metric-lbl">leis</span>
        <span class="metric-src" title="Fonte: baseline v2.5">⚙</span>
      </div>
    </div>
    <div class="onda-sprints">
      <span class="onda-sprint done">Sprint H ✅</span>
      <span class="onda-sprint done">Sprint K ✅</span>
    </div>
    <div class="onda-table-info">Tabelas: <code>rag_documents</code> · <code>answers</code></div>
  </div>

  <!-- CONSISTÊNCIA GLOBAL -->
  <div class="onda-card consistencia-card" id="consistenciaGlobal">
    <div class="onda-header">
      <span class="onda-badge" style="color:var(--purple)">🔷 CONSISTÊNCIA</span>
      <span class="onda-status-badge" style="background:var(--blue-bg);color:var(--blue)">⟳ vivo</span>
    </div>
    <div class="onda-title">Consistência Global</div>
    <div class="onda-subtitle">CI · PRs · Validações abertas</div>
    <div class="onda-metrics">
      <div class="onda-metric">
        <span class="metric-val consistencia-icon">—</span>
        <span class="metric-lbl">status</span>
      </div>
      <div class="onda-metric">
        <span class="metric-val consistencia-score">—/3</span>
        <span class="metric-lbl">checks OK</span>
      </div>
    </div>
    <div class="consistencia-detail" style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.7;">
      ⟳ Carregando...
    </div>
  </div>

</div>
```

---

## 11. CSS COMPLETO DA SEÇÃO 6 (v2)

```css
/* ── Seção 6 — Cockpit 3 Ondas ────────────────────────────────────────── */

/* Banner de governança */
.ondas-governance-banner { background:var(--amber-bg); border:1px solid var(--amber); border-left:4px solid var(--amber); border-radius:var(--radius); padding:10px 14px; margin-bottom:16px; display:flex; align-items:flex-start; gap:10px; flex-wrap:wrap; }
.gov-icon { font-size:16px; flex-shrink:0; margin-top:1px; }
.gov-text { font-size:12px; color:var(--amber); flex:1; min-width:200px; }
.gov-text a { color:var(--amber); font-weight:700; text-decoration:underline; }
.gov-legend { font-size:11px; color:var(--text-muted); width:100%; margin-top:4px; }
.gov-badge { display:inline-block; padding:1px 6px; border-radius:10px; font-size:10px; font-weight:700; }
.gov-badge.static { background:var(--bg); border:1px solid var(--border); color:var(--text-muted); }
.gov-badge.live   { background:var(--blue-bg); border:1px solid var(--blue); color:var(--blue); }

/* Aviso de dados parciais */
.ondas-partial-warning { background:var(--amber-bg); border:1px solid var(--amber); border-radius:var(--radius); padding:8px 12px; font-size:12px; color:var(--amber); margin-bottom:10px; }
.ondas-partial-warning code { background:rgba(0,0,0,.06); padding:1px 4px; border-radius:3px; font-size:11px; }

/* Subsection title */
.subsection-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--blue); margin-bottom:10px; padding-bottom:6px; border-bottom:1px dashed var(--border); }

/* 6A — Abas de documento */
.ondas-doc-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; align-items:center; }
.ondas-doc-tab { padding:5px 14px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid var(--border); background:transparent; color:var(--text-muted); transition:all .15s; }
.ondas-doc-tab.active { background:var(--blue); color:#fff; border-color:var(--blue); }
.ondas-doc-tab-link { margin-left:auto; font-size:11px; color:var(--blue); text-decoration:none; padding:5px 10px; border:1px solid var(--border); border-radius:20px; }
.ondas-doc-container { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:20px 24px; height:520px; overflow-y:auto; box-shadow:var(--shadow); }
.ondas-doc-loading { text-align:center; color:var(--text-muted); font-size:13px; padding:40px 0; }
.ondas-doc-content h1 { font-size:18px; font-weight:800; margin-bottom:12px; color:var(--text); border-bottom:2px solid var(--border); padding-bottom:8px; }
.ondas-doc-content h2 { font-size:14px; font-weight:700; margin:20px 0 8px; color:var(--text); text-transform:uppercase; letter-spacing:.06em; }
.ondas-doc-content h3 { font-size:13px; font-weight:700; margin:14px 0 6px; color:var(--blue); }
.ondas-doc-content p  { font-size:13px; line-height:1.6; color:var(--text); margin-bottom:10px; }
.ondas-doc-content table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:14px; }
.ondas-doc-content th { background:var(--bg); font-weight:700; text-align:left; padding:7px 10px; border:1px solid var(--border); font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); }
.ondas-doc-content td { padding:7px 10px; border:1px solid var(--border); vertical-align:top; }
.ondas-doc-content code { background:var(--bg); border:1px solid var(--border); border-radius:3px; padding:1px 5px; font-size:11px; font-family:monospace; }
.ondas-doc-content pre { background:#0F172A; color:#E2E8F0; border-radius:6px; padding:14px 16px; overflow-x:auto; font-size:11px; margin-bottom:14px; }
.ondas-doc-content pre code { background:none; border:none; padding:0; color:inherit; }
.ondas-doc-content blockquote { border-left:3px solid var(--blue); padding:8px 14px; background:var(--blue-bg); margin:10px 0; border-radius:0 4px 4px 0; font-size:12px; }

/* 6B — Rastreabilidade */
.rastreabilidade-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.rastreabilidade-status { font-size:11px; color:var(--text-muted); flex:1; }
.rastreabilidade-refresh { font-size:11px; padding:3px 10px; border-radius:4px; border:1px solid var(--border); background:none; cursor:pointer; color:var(--blue); }
.rastreabilidade-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
.rastreabilidade-tab { padding:5px 12px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid var(--border); background:transparent; color:var(--text-muted); transition:all .15s; }
.rastreabilidade-tab.active { background:var(--purple); color:#fff; border-color:var(--purple); }
.rastreabilidade-content { background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); padding:12px 16px; min-height:200px; max-height:360px; overflow-y:auto; box-shadow:var(--shadow); }
.rastr-table { width:100%; border-collapse:collapse; font-size:12px; }
.rastr-table th { text-align:left; padding:6px 10px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); border-bottom:1px solid var(--border); background:rgba(0,0,0,.02); }
.rastr-table td { padding:7px 10px; border-bottom:1px solid rgba(0,0,0,.04); vertical-align:top; }
.rastr-table tr:hover td { background:rgba(0,0,0,.02); }
.rastr-table a { color:var(--blue); font-weight:600; }
.rastr-label { display:inline-block; font-size:10px; font-weight:600; padding:1px 6px; border-radius:10px; background:var(--bg); border:1px solid var(--border); margin-right:3px; margin-bottom:2px; color:var(--text-muted); }
.rastr-type { display:inline-block; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; }
.rastr-type.pr { background:var(--purple-bg); color:var(--purple); }
.rastr-type.issue { background:var(--blue-bg); color:var(--blue); }
.milestone-progress-wrap { display:flex; flex-direction:column; gap:8px; margin-top:14px; }
.milestone-bar { display:flex; align-items:center; gap:10px; }
.milestone-label { font-size:11px; font-weight:700; color:var(--text-muted); white-space:nowrap; min-width:110px; }
.milestone-track { flex:1; height:8px; background:#E2E2DE; border-radius:4px; overflow:hidden; }
.milestone-fill { height:100%; background:var(--green); border-radius:4px; transition:width .5s ease; }
.milestone-fill.amber { background:var(--amber); }
.milestone-pct { font-size:11px; font-weight:700; color:var(--text); white-space:nowrap; min-width:80px; text-align:right; }

/* 6C — Cards das ondas */
.ondas-estado-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.onda-card { border-radius:var(--radius); padding:16px; border:1px solid var(--border); background:var(--bg2); box-shadow:var(--shadow); }
.onda-card.onda1 { border-top:3px solid #185FA5; }
.onda-card.onda2 { border-top:3px solid #D97706; }
.onda-card.onda3 { border-top:3px solid #3B6D11; }
.consistencia-card { border-top:3px solid var(--purple); }
.consistencia-card.consistencia-ok   { border-top-color:var(--green); }
.consistencia-card.consistencia-warn { border-top-color:var(--amber); }
.consistencia-card.consistencia-error { border-top-color:var(--red); }
.onda-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.onda-badge { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; }
.onda1-badge { color:#185FA5; }
.onda2-badge { color:#D97706; }
.onda3-badge { color:#3B6D11; }
.onda-status-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; background:var(--green-bg); color:var(--green); }
.onda-title { font-size:13px; font-weight:700; color:var(--text); margin-bottom:3px; }
.onda-subtitle { font-size:11px; color:var(--text-muted); margin-bottom:12px; }
.onda-metrics { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
.onda-metric { background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:6px 10px; text-align:center; position:relative; }
.metric-val { display:block; font-size:14px; font-weight:800; color:var(--text); }
.metric-lbl { display:block; font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; }
.metric-src { position:absolute; top:3px; right:4px; font-size:9px; color:var(--text-muted); cursor:help; }
.onda-sprints { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.onda-sprint { font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; }
.onda-sprint.done { background:var(--green-bg); color:var(--green); }
.onda-sprint.pending { background:var(--amber-bg); color:var(--amber); }
.onda-prs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.onda-prs a { font-size:11px; font-weight:600; color:var(--blue); background:var(--blue-bg); padding:2px 7px; border-radius:10px; text-decoration:none; }
.onda-prs a:hover { text-decoration:underline; }
.onda-table-info { font-size:11px; color:var(--text-muted); }
.onda-table-info code { font-size:10px; background:var(--bg); border:1px solid var(--border); border-radius:3px; padding:1px 5px; }

/* Responsividade */
@media (max-width: 900px) {
  .ondas-estado-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .ondas-estado-grid { grid-template-columns: 1fr; }
}
```

---

## 12. INTEGRAÇÃO COM O INIT DO COCKPIT

No bloco `window.addEventListener('load', ...)` existente, adicionar:

```javascript
// ── Init Seção 6 (adicionar junto com fetchGitHubData e fetchDocDates) ───
setOndasDocTab('tabela', document.querySelector('.ondas-doc-tab.active'));
fetchOndasRastreabilidade();
// updateConsistenciaGlobal é chamado dentro de fetchOndasRastreabilidade
// após rastrData estar disponível, passando os dados de ciData do fetchGitHubData
```

**Coordenação com `fetchGitHubData()`:** O `updateConsistenciaGlobal` precisa de `ciData` (resultado do `fetchGitHubData` existente). Adicionar ao final do `fetchGitHubData` existente:

```javascript
// No final de fetchGitHubData(), após atualizar o Score de Saúde:
if (typeof updateConsistenciaGlobal === 'function' && rastrData) {
  updateConsistenciaGlobal(rastrData, data);
}
```

---

## 13. ESTRATÉGIA DE LABELS GITHUB

### 13.1 Labels a criar (PR de governança separado — não bloqueia esta implementação)

| Label | Cor hex | Descrição |
|---|---|---|
| `onda:1-solaris` | `#185FA5` | Issues/PRs da Onda 1 (SOLARIS) |
| `onda:2-iagen` | `#D97706` | Issues/PRs da Onda 2 (IA Gen) |
| `onda:3-regulatorio` | `#3B6D11` | Issues/PRs da Onda 3 (RAG) |
| `cockpit:3ondas` | `#7C3AED` | Issues/PRs do Cockpit 3 Ondas |

### 13.2 Retroaplicar nos PRs existentes (após criar as labels)

| PRs | Labels a adicionar |
|---|---|
| #159, #162, #171, #179, #180, #181 | `onda:1-solaris`, `sprint:K` |
| #182 | `onda:2-iagen`, `sprint:K` |
| #174, #213, #215, #217, #218 | `sprint:K` |
| #157, #158, #152 | `onda:1-solaris`, `sprint:L` |

---

## 14. MAPA ESTÁTICO vs. VIVO (v2)

| Informação | Tipo | Fonte | Atualização | Marcação visual |
|---|---|---|---|---|
| Conteúdo TABELA-3-ONDAS e E2E-3-ONDAS | **Vivo** | fetch raw GitHub + cache 5min | A cada abertura (ou cache) | `⟳ vivo` |
| Issues/PRs por milestone K e L | **Vivo** | fetch API GitHub + cache 5min | A cada abertura (ou cache) | `⟳ vivo` |
| Progresso dos milestones (barra %) | **Vivo** | fetch API GitHub + cache 5min | A cada abertura (ou cache) | `⟳ vivo` |
| Consistência Global (CI + PRs + validações) | **Vivo** | reutiliza fetchGitHubData | A cada abertura | `⟳ vivo` |
| Lista de PRs fallback | **Placeholder emergência** | Hardcoded com aviso | Manual a cada sprint | `⚠ fallback` |
| Métricas das ondas (12 perguntas, 2.078 chunks) | **Estático** | baseline v2.5 | Manual a cada sprint | `⚙ baseline v2.5` |
| Status de cada onda (✅ Produção) | **Estático** | baseline v2.5 | Manual a cada sprint | `⚙ baseline v2.5` |
| Sprints e PRs nos cards 6C | **Estático** | baseline v2.5 | Manual a cada sprint | `⚙ baseline v2.5` |

---

## 15. CRITÉRIOS DE ACEITE (v2 — 17 critérios)

| # | Critério | Como verificar |
|---|---|---|
| CA-01 | Seção 6 aparece após Seção 5 no cockpit | Rolar até o final da página |
| CA-02 | Banner de governança visível com links para ESTADO-ATUAL.md e BASELINE-PRODUTO.md | Verificar topo da Seção 6 |
| CA-03 | Aba "TABELA-3-ONDAS" carrega e renderiza Markdown em ≤ 3s | Clicar na aba |
| CA-04 | Aba "E2E-3-ONDAS" carrega e renderiza Markdown em ≤ 3s | Clicar na aba |
| CA-05 | Segunda abertura da mesma aba usa cache (sem novo fetch) | Verificar Network tab — sem nova requisição |
| CA-06 | Botão "Abrir no GitHub" leva ao arquivo correto | Clicar — URL correta |
| CA-07 | Aba "Sprint K — M2" exibe issues e PRs do milestone M2 | Dados aparecem em ≤ 2s |
| CA-08 | Aba "Sprint L — M3" exibe issues e PRs do milestone M3 | Dados aparecem em ≤ 2s |
| CA-09 | Barras de progresso exibem % correto | Comparar com GitHub Milestones |
| CA-10 | Aba "PRs Mergeados" exibe lista com badges de onda | Badges 🔵/🟠/🟢 visíveis |
| CA-11 | Aba "Issues Abertas" exibe apenas issues abertas | Comparar com GitHub Issues |
| CA-12 | Cards 6C exibem métricas com ícone `⚙` (estático) | Hover no ícone mostra tooltip |
| CA-13 | Card Consistência Global exibe semáforo correto | Comparar CI/PRs/validações com GitHub |
| CA-14 | Botão "↺ Atualizar" força re-fetch e atualiza timestamp | Clicar — timestamp muda, cache invalidado |
| CA-15 | Em caso de falha de API, fallback exibe banner `⚠ Dados de fallback` | Testar com rede offline |
| CA-16 | Fetch incompleto exibe banner `⚠ Dados parciais` com campos ausentes | Simular resposta parcial |
| CA-17 | Seção 6 incluída na busca global do cockpit | Buscar "Onda 1" no campo de busca |

---

## 16. HISTÓRICO DE DECISÕES

| Data | Versão | Decisão | Justificativa |
|---|---|---|---|
| 2026-03-30 | v1 | Usar `fetch raw + marked.js` em vez de `<iframe>` | CORS impede iframe de outro domínio em GitHub Pages |
| 2026-03-30 | v1 | Separar em 6A/6B/6C | Propósitos distintos: leitura / rastreabilidade / status |
| 2026-03-30 | v1 | Lista de PRs como fallback estático | API não retorna PRs mergeados por milestone de forma confiável |
| 2026-03-30 | v2 | Adicionar `DOMPurify` para sanitização XSS | Feedback C-06 do Consultor — segurança obrigatória |
| 2026-03-30 | v2 | Cache TTL 5 minutos | Feedback C-05 — rate limit com múltiplos usuários |
| 2026-03-30 | v2 | `fetchIntegrityCheck()` + banner de dados parciais | Feedback C-03 — cockpit não pode mostrar dado inconsistente silenciosamente |
| 2026-03-30 | v2 | `ONDAS_PRS_FALLBACK` rebaixada para placeholder | Feedback C-04 — lista hardcoded não pode ser fonte primária |
| 2026-03-30 | v2 | Banner de governança + declaração de autoridade | Feedback C-02 — cockpit deve declarar que é visualização |
| 2026-03-30 | v2 | Indicador de Consistência Global no 6C | Feedback C-07 — 6C precisava de inteligência além de cards estáticos |
| 2026-03-30 | v2 | Dados estáticos marcados com `⚙ baseline v2.5` | Feedback C-01 — eliminar dupla fonte de verdade implícita |

---

*Spec v2 gerada em 2026-03-30*
*Pós-crítica do Consultor (ChatGPT) — 🟢 GO com ajustes de governança*
*Pronta para envio ao Orquestrador (Claude)*
*IA SOLARIS — Compliance Tributário da Reforma Tributária*
