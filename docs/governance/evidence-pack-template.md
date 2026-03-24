# Evidence Pack — Template Padrão

> **Uso:** Copie este arquivo para `docs/evidence-packs/YYYY-MM-DD-<slug>.md` e preencha todos os campos.
> O Evidence Pack é obrigatório para qualquer issue com label `structural-fix`.

---

## Metadados

| Campo | Valor |
|---|---|
| **Data** | YYYY-MM-DD |
| **Issue** | #[número] |
| **PR** | #[número] |
| **Checkpoint** | `manus-webdev://[version_id]` |
| **Autor** | [nome] |
| **Severidade** | 🔴 CRÍTICO / 🟠 ALTO / 🟡 MÉDIO / 🟢 BAIXO |
| **Invariant afetado** | `[invariant]` |

---

## 1. Relatório de Diagnóstico

### Problema Identificado

_[Descreva o problema do ponto de vista do produto. O que estava quebrando para o usuário?]_

### Causa Raiz Técnica

```
Arquivo:   [caminho/arquivo.ts]
Função:    [nome da função]
Linha(s):  [número(s)]
Causa:     [descrição técnica precisa]
```

### Como Foi Identificada

_[diagnóstico manual / teste / log / report do usuário / análise estática]_

---

## 2. Payload Antes / Depois

### Estado Antes da Correção

```json
{
  "campo_afetado": null,
  "comentario": "campo chegava como null/string ao invés de objeto parseado"
}
```

### Estado Depois da Correção

```json
{
  "campo_afetado": {
    "taxRegime": "lucro_real",
    "companySize": "grande"
  },
  "comentario": "campo chega como objeto corretamente parseado"
}
```

### Diff Conceitual

```diff
- return result[0];                                    // retornava string JSON
+ return result[0] ? normalizeProject(result[0]) : undefined;  // retorna objeto
```

---

## 3. Evidência Visual (se houver UI afetada)

<!-- Inclua prints, GIFs ou links de vídeo mostrando o comportamento antes e depois -->

**Antes:**
> _[print ou descrição do comportamento incorreto na UI]_

**Depois:**
> _[print ou descrição do comportamento correto na UI]_

---

## 4. Lista de Testes Adicionados

| Arquivo | Teste | Invariant coberto |
|---|---|---|
| `server/[nome].test.ts` | `[nome do teste]` | `[invariant]` |

**Total de testes novos:** [número]

---

## 5. Resultado dos Testes

### Suíte PCT (Prefill Contract Tests)

```
pnpm vitest run server/prefill-contract.test.ts

Test Files  1 passed (1)
      Tests  [X] passed ([X])
   Duration  [X]ms
```

### Suite Completa

```
pnpm test

Test Files  [X] passed ([X])
      Tests  [X] passed ([X])
   Duration  [X]ms
```

---

## 6. Links de Commit / PR / Checkpoint

| Artefato | Link |
|---|---|
| Commit de docs/contrato | `[hash]` |
| Commit de implementação | `[hash]` |
| Commit de testes | `[hash]` |
| Commit de evidências | `[hash]` |
| PR | #[número] |
| Checkpoint | `manus-webdev://[version_id]` |

---

## 7. Risco Residual

**Risco identificado:** _[descreva]_

**Por que é aceitável:** _[justifique]_

**Mitigação:** _[o que foi feito]_

---

## Aprovação do Orquestrador

- [ ] **Gate obtido em:** [data/hora]
- [ ] **Aprovado por:** [nome/role]
- [ ] **Observações:** _[se houver]_
