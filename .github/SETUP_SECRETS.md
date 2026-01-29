# Configuração de Secrets no GitHub

Para que o pipeline CI/CD funcione corretamente, você precisa configurar os seguintes secrets no repositório GitHub:

## Como Configurar Secrets

1. Acesse o repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Adicione cada secret listado abaixo

## Secrets Necessários

### Database
- **DATABASE_URL**: String de conexão do banco de dados MySQL/TiDB
  - Formato: `mysql://user:password@host:port/database`
  - Exemplo: `mysql://root:password@localhost:3306/compliance_db`

### Authentication & OAuth
- **JWT_SECRET**: Chave secreta para assinatura de tokens JWT
  - Gere com: `openssl rand -base64 32`
  
- **VITE_APP_ID**: ID da aplicação OAuth do Manus
  - Obtido no painel de configuração do Manus

- **OAUTH_SERVER_URL**: URL do servidor OAuth backend
  - Exemplo: `https://api.manus.im`

- **VITE_OAUTH_PORTAL_URL**: URL do portal de login OAuth (frontend)
  - Exemplo: `https://login.manus.im`

### Owner Information
- **OWNER_OPEN_ID**: Open ID do proprietário da aplicação
- **OWNER_NAME**: Nome do proprietário

### Manus Forge API
- **BUILT_IN_FORGE_API_URL**: URL da API Forge do Manus (server-side)
  - Exemplo: `https://forge-api.manus.im`

- **BUILT_IN_FORGE_API_KEY**: Token de autenticação para API Forge (server-side)
  - Obtido no painel de configuração do Manus

- **VITE_FRONTEND_FORGE_API_KEY**: Token para acesso frontend à API Forge
  - Obtido no painel de configuração do Manus

- **VITE_FRONTEND_FORGE_API_URL**: URL da API Forge para frontend
  - Exemplo: `https://forge-api.manus.im`

## Verificação

Após configurar todos os secrets:

1. Faça um commit e push para o repositório
2. Acesse a aba **Actions** no GitHub
3. Verifique se o workflow está executando sem erros
4. Confira os logs de cada job (test, lint, build)

## Troubleshooting

### Erro: "Secret not found"
- Verifique se o nome do secret está exatamente igual ao esperado (case-sensitive)
- Confirme que o secret foi salvo corretamente

### Erro de conexão com banco de dados
- Verifique se o `DATABASE_URL` está correto
- Confirme que o banco de dados está acessível pela rede do GitHub Actions
- Considere usar um banco de dados de teste específico para CI/CD

### Testes falhando
- Execute `pnpm test` localmente para reproduzir o erro
- Verifique os logs detalhados na aba Actions
- Confirme que todas as variáveis de ambiente estão configuradas

## Segurança

⚠️ **IMPORTANTE:**
- Nunca commite secrets diretamente no código
- Use secrets do GitHub para todas as credenciais sensíveis
- Rotacione secrets periodicamente
- Limite o acesso ao repositório apenas para membros autorizados
