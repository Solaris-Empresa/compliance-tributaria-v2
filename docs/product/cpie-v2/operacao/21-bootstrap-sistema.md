# CPIE v2 — Bootstrap do Sistema

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado

---

## 1. Pré-requisitos

| Requisito | Versão | Verificação |
|---|---|---|
| Node.js | ≥ 22.x | `node --version` |
| pnpm | ≥ 9.x | `pnpm --version` |
| Acesso ao banco MySQL/TiDB | — | `DATABASE_URL` configurado |
| Acesso à API Manus Built-in | — | `BUILT_IN_FORGE_API_KEY` configurado |

---

## 2. Configuração Inicial

### 2.1 Instalar dependências

```bash
cd /home/ubuntu/compliance-tributaria-v2
pnpm install
```

### 2.2 Configurar variáveis de ambiente

As variáveis de ambiente são injetadas automaticamente pela plataforma Manus. Para desenvolvimento local, criar um arquivo `.env` baseado no template:

```bash
# Variáveis obrigatórias para o CPIE v2
DATABASE_URL=mysql://...
BUILT_IN_FORGE_API_KEY=...
BUILT_IN_FORGE_API_URL=...
JWT_SECRET=...
```

### 2.3 Aplicar o schema do banco

```bash
pnpm db:push
```

Este comando aplica todas as migrações pendentes, incluindo o campo `mediumAcknowledged` adicionado em 2026-03-22.

### 2.4 Verificar o schema

```sql
-- Verificar que a tabela consistency_checks tem todos os campos esperados
DESCRIBE consistency_checks;
```

Campos obrigatórios: `id`, `project_id`, `user_id`, `completeness_score`, `consistency_score`, `diagnostic_confidence`, `overall_level`, `can_proceed`, `accepted_risk`, `medium_acknowledged`, `created_at`.

---

## 3. Iniciar o Servidor de Desenvolvimento

```bash
pnpm dev
```

O servidor estará disponível em `http://localhost:3000`.

---

## 4. Verificar que o CPIE v2 está Funcionando

### 4.1 Smoke test via curl

```bash
curl -s http://localhost:3000/api/trpc/cpieV2.analyzePreview \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "description": "Empresa de consultoria de TI prestando serviços para clientes corporativos, faturamento de R$ 500 mil por mês",
      "companySize": "pequena",
      "taxRegime": "simples_nacional",
      "annualRevenueRange": "360000-4800000",
      "operationType": "servicos",
      "clientType": ["b2b"],
      "hasImportExport": false,
      "multiState": false
    }
  }'
```

**Resposta esperada:**
```json
{
  "result": {
    "data": {
      "json": {
        "canProceed": true,
        "analysisVersion": "cpie-v2.0",
        "overallLevel": "none"
      }
    }
  }
}
```

### 4.2 Executar testes unitários

```bash
pnpm test server/cpie-v2.test.ts
```

Todos os testes devem passar (92+ testes).

---

## 5. Checklist de Bootstrap

- [ ] `pnpm install` executado sem erros
- [ ] `pnpm db:push` executado — schema aplicado
- [ ] `pnpm dev` iniciado — servidor na porta 3000
- [ ] Smoke test do `analyzePreview` retornando `canProceed: true`
- [ ] `pnpm test server/cpie-v2.test.ts` — todos os testes passando
- [ ] Acesso ao banco verificado (tabela `consistency_checks` existe)
- [ ] API Manus Built-in respondendo (IA funcionando)

---

## 6. Problemas Comuns no Bootstrap

### Erro: `DATABASE_URL not found`

**Causa:** Variável de ambiente não configurada.  
**Solução:** Verificar que o `.env` está configurado ou que as variáveis estão injetadas pela plataforma.

### Erro: `Table 'consistency_checks' doesn't exist`

**Causa:** `pnpm db:push` não foi executado.  
**Solução:** Executar `pnpm db:push`.

### Erro: `BUILT_IN_FORGE_API_KEY invalid`

**Causa:** Chave da API Manus inválida ou expirada.  
**Solução:** Verificar as credenciais no painel da plataforma Manus.

### Testes falhando com `AI-ERR`

**Causa:** API Manus Built-in indisponível no ambiente de teste.  
**Solução:** Os testes devem usar mocks da IA. Verificar que os mocks estão configurados em `server/cpie-v2.test.ts`.
