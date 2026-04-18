# Roteiro de Teste UAT — Corpus SOLARIS Onda 1

**Sprint L · DEC-002 · Data:** 2026-03-30  
**Responsável:** Equipe Jurídica SOLARIS  
**Ambiente:** https://iasolaris.manus.space/admin/solaris-questions  
**Pré-requisito:** Usuário com role `equipe_solaris`

---

## Objetivo

Validar que o fluxo completo de gerenciamento de perguntas SOLARIS funciona corretamente antes do lançamento da Onda 1 para advogados externos.

---

## Cenários de Teste

### CT-01 — Upload do CSV UAT (Dry Run)

**Arquivo:** `docs/uat/solaris-questions-uat-v1.csv`  
**Aba:** Upload CSV

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Acessar `/admin/solaris-questions` → aba "Upload CSV" | Página carrega com área de drag-and-drop |
| 2 | Clicar "Download Template CSV" | Download de `template-solaris-questions.csv` |
| 3 | Arrastar `solaris-questions-uat-v1.csv` para a área | Arquivo exibido com nome e tamanho |
| 4 | Clicar "Validar CSV" | Alert verde: "13 linhas válidas — pronto para importar" |
| 5 | **Não clicar em Importar** — verificar apenas a validação | Nenhuma linha inserida no banco |

**Critério de aceite:** 13 linhas válidas, 0 erros.

---

### CT-02 — Upload do CSV UAT (Importação Real)

**Arquivo:** `docs/uat/solaris-questions-uat-v1.csv`  
**Aba:** Upload CSV

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Após CT-01, clicar "Importar 13 perguntas" | Modal de confirmação exibido |
| 2 | Ler o modal e clicar "Confirmar importação" | Spinner de loading |
| 3 | Aguardar resposta | Alert verde: "✓ 13 perguntas publicadas no corpus SOLARIS" |
| 4 | Ir para aba "Lista" | SOL-013..025 aparecem na tabela |

**Critério de aceite:** 13 novas perguntas visíveis na aba Lista com código SOL-013 a SOL-025.

---

### CT-03 — Filtros na Lista

**Aba:** Lista

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Buscar "IBS" no campo de pesquisa | Apenas perguntas com "IBS" no título ou texto |
| 2 | Filtrar por Área = "Jurídico" | Apenas SOL-015, SOL-021, SOL-022, SOL-024 |
| 3 | Filtrar por Severidade = "Crítica" | Apenas SOL-015, SOL-018, SOL-024 |
| 4 | Filtrar por Vigência = "Com vigência" | Apenas perguntas com data preenchida |
| 5 | Clicar "Limpar filtros" | Todos os filtros resetados, lista completa |

**Critério de aceite:** Cada filtro reduz corretamente a lista. Limpar filtros restaura o estado padrão.

---

### CT-04 — Exclusão com Undo

**Aba:** Lista

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Clicar no ícone de lixeira da linha SOL-025 | Modal de confirmação com detalhes da pergunta |
| 2 | Ler o aviso "pode ser desfeita em até 8 segundos" | Modal exibe alerta vermelho com informação |
| 3 | Clicar "Excluir mesmo assim" | Toast de undo aparece no rodapé com contador regressivo |
| 4 | Clicar "Desfazer" antes dos 8 segundos | SOL-025 volta para a lista |
| 5 | Repetir CT-04 passos 1-3 e aguardar 8 segundos | SOL-025 desaparece permanentemente da lista ativa |

**Critério de aceite:** Undo funciona dentro de 8s. Após timeout, pergunta permanece inativa.

---

### CT-05 — Seleção Múltipla e Exclusão em Lote

**Aba:** Lista

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Marcar checkboxes de SOL-023 e SOL-024 | Contador "2 selecionadas" aparece no topo |
| 2 | Clicar "Excluir 2" | Modal lista as 2 perguntas selecionadas |
| 3 | Confirmar exclusão | Toast de undo para 2 perguntas |
| 4 | Clicar "Desfazer" | Ambas as perguntas restauradas |

**Critério de aceite:** Seleção múltipla funciona. Modal exibe todas as perguntas afetadas.

---

### CT-06 — Histórico de Lotes

**Aba:** Histórico de Lotes

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Acessar aba "Histórico de Lotes" | Lote do CT-02 aparece com data, ID e contagem |
| 2 | Clicar "Ver perguntas" no lote | Redireciona para aba Lista filtrada pelo lote |
| 3 | Voltar para Histórico de Lotes | Botão "Excluir lote" visível |
| 4 | Clicar "Excluir lote" | Modal de confirmação com contagem de perguntas |
| 5 | Cancelar | Lote permanece intacto |

**Critério de aceite:** Histórico exibe lotes corretamente. Exclusão de lote requer confirmação.

---

### CT-07 — CSV com Erros (Validação de Rejeição)

**Aba:** Upload CSV

| Passo | Ação | Resultado Esperado |
|---|---|---|
| 1 | Criar CSV com linha inválida: `area` = `"invalido"` | — |
| 2 | Fazer upload e clicar "Validar CSV" | Alert amarelo com contagem de erros |
| 3 | Verificar tabela de erros | Linha, campo e mensagem exibidos |
| 4 | Botão "Importar" não deve aparecer | Importação bloqueada quando há erros |

**Critério de aceite:** CSV com erros não pode ser importado. Tabela de erros identifica linha e campo.

---

## Critérios de Aceite Globais

| Critério | Verificado por |
|---|---|
| 13 perguntas SOL-013..025 importadas corretamente | CT-02 |
| Filtros combinados funcionam sem erros | CT-03 |
| Undo de exclusão funciona em 8 segundos | CT-04 |
| Seleção múltipla e exclusão em lote funcionam | CT-05 |
| Histórico de lotes exibe dados corretos | CT-06 |
| CSV inválido é rejeitado com mensagem clara | CT-07 |

---

## Bugs Conhecidos / Limitações

- O campo `vigencia_inicio` aceita apenas timestamps Unix (ms) — o template CSV usa formato `YYYY-MM-DD` que é convertido automaticamente pelo backend
- Perguntas excluídas (ativo=0) continuam visíveis ao filtrar por "Status = Inativas"
- O campo "Importado por" no histórico de lotes exibe "sistema" até a integração com o perfil do usuário logado (Issue #192)

---

## Assinatura do Responsável UAT

| Campo | Valor |
|---|---|
| Testador | __________________ |
| Data | __________________ |
| Resultado | ☐ Aprovado ☐ Reprovado |
| Observações | __________________ |
