# Regra MAP — Paralelismo em Subtarefas Manus

**Versão:** v1.0 · **Data:** 2026-04-07 · **Skill:** solaris-contexto v4.5

## O que é

A ferramenta `map` do Manus permite disparar subtarefas paralelas para operações **homogêneas e independentes** — como pesquisa em múltiplas fontes, análise de múltiplos arquivos, ou geração de múltiplos documentos similares.

## Limitação crítica (descoberta em Z-02)

**Subtarefas `map` NÃO conseguem escrever arquivos no sandbox principal.**

Sandboxes de subtarefas são isolados. Arquivos criados ou modificados dentro de uma subtarefa ficam no sandbox dela — não são propagados de volta ao sandbox principal.

## Quando usar `map` (casos válidos)

| Caso | Válido? | Motivo |
|---|---|---|
| Pesquisa em múltiplas URLs | ✅ | Retorna texto via `output_schema` |
| Análise de múltiplos arquivos existentes | ✅ | Lê arquivos via `<file>` tags, retorna análise |
| Diagnóstico paralelo de bugs (leitura) | ✅ | Retorna diagnóstico via `output_schema` |
| Geração de múltiplos documentos novos | ❌ | Arquivos ficam no sandbox isolado |
| Escrita de código em arquivos do repo | ❌ | Não propaga para o sandbox principal |
| Execução de comandos shell (`git`, `pnpm`, `tsc`) | ❌ | Sandbox isolado |

## Quando NÃO usar `map`

- Criar ou modificar arquivos no repositório
- Executar `git commit`, `pnpm`, `tsc` ou qualquer comando shell
- Qualquer operação que precise persistir no sandbox principal

## Alternativa para paralelismo real

Para tarefas que precisam escrever arquivos, executar em sequência rápida no sandbox principal é mais confiável do que tentar paralelizar via `map`.

O `map` é válido para a **fase de análise/diagnóstico** (leitura + output_schema), mas não para a **fase de implementação** (escrita de arquivos).

## Exemplo de uso correto

```
map(
  inputs: ["URL1", "URL2", "URL3"],
  prompt_template: "Analise o conteúdo de {{input}} e retorne...",
  output_schema: [{ name: "analise", type: "string" }]
)
```

## Referência

- Descoberto durante Z-02 Etapa 4 (frontend) — 5 subtarefas retornaram CRIADO mas arquivos ficaram vazios
- Confirmado: diagnóstico de bugs paralelo (PR #379) funcionou corretamente porque usou `output_schema` para retornar texto, não escrita de arquivos
- Documentado em skill `solaris-contexto` v4.5
