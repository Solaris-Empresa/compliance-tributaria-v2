# Cockpit P.O. — Compliance Tributária

Painel de gestão e governança do P.O. (Uires Tapajós). Arquivo HTML único autocontido — sem servidor, sem dependências.

## Como abrir

**Opção 1 — Localmente (mais rápido):**
1. Baixe o arquivo `index.html`
2. Abra no Chrome: `Ctrl + O` → selecione o arquivo

**Opção 2 — Via GitHub Pages:**
URL: `https://solaris-empresa.github.io/compliance-tributaria-v2/docs/painel-po/`
*(requer GitHub Pages ativado no repositório)*

**Opção 3 — Via GitHub (visualização raw):**
Não funciona para HTML interativo — use as opções 1 ou 2.

## Funcionalidades

| Seção | O que faz |
|---|---|
| **1 — Status** | Cards com fase atual, estado do produto, bloqueios (expansível) e próxima ação |
| **2 — Radar** | 6 semáforos de governança — clique para ciclar verde→âmbar→vermelho→verde |
| **3 — Kanban** | 4 colunas (Backlog P0, Em andamento, Aguardando gate, Bloqueado) com drag and drop |
| **4 — Biblioteca** | Links diretos para os 12 documentos essenciais com datas editáveis |
| **5 — Log de Decisões** | Tabela editável inline com toggle de status e botão para adicionar linhas |

## Persistência de estado

O painel salva automaticamente no `localStorage` do seu navegador:
- Estado dos semáforos (verde/âmbar/vermelho)
- Posição dos cards no kanban
- Datas editadas na biblioteca de documentos
- Log de decisões (edições e novas linhas)

**Importante:** o estado é salvo **por navegador e por URL**. Se você abrir o painel em outro computador ou outro navegador, o estado inicial será exibido. Isso é comportamento esperado — não é um bug.

## Atualizar o estado inicial

Para atualizar o estado inicial (que aparece na primeira abertura ou após limpar o cache), edite o arquivo `index.html` e modifique os objetos `INITIAL_KANBAN`, `INITIAL_DECISIONS` e `INITIAL_SEMAFOROS` no bloco `<script>`.

## Resetar para o estado inicial

Para voltar ao estado inicial (apagar todas as edições salvas no navegador):
1. Abra o DevTools do Chrome: `F12`
2. Vá em **Application → Local Storage → (URL do arquivo)**
3. Selecione todas as chaves que começam com `po-cockpit-` e delete

## Atualizar após cada sprint

1. Edite `index.html`
2. Atualize os valores em `INITIAL_KANBAN` e `INITIAL_DECISIONS`
3. Atualize a data no `<header>` (linha `Última atualização:`)
4. Commit com mensagem: `docs: painel-po atualizado pós-sprint X`

## Arquivo fora do escopo de CI/CD

Este arquivo é HTML estático em `docs/painel-po/` — não aciona nenhum workflow de CI/CD e não tem impacto em produto ou banco de dados.
