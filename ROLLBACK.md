# Procedimentos de Rollback - Sistema de Compliance Tributária

Este documento descreve os procedimentos completos para realizar rollback do sistema para a versão **v1.0.0 Baseline**, garantindo 100% de funcionalidade e integridade dos dados.

---

## 📋 Informações da Versão v1.0.0

| Propriedade | Valor |
|-------------|-------|
| **Versão** | 1.0.0 |
| **Data de Release** | 01 de Fevereiro de 2026 |
| **Checkpoint Manus** | `93e36265` |
| **Commit GitHub** | `36334848` |
| **Tag Git** | `v1.0.0` |
| **Backup Completo** | `compliance-tributaria-v2-v1.0.0-backup-20260201.tar.gz` |
| **Repositório** | https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance |

---

## 🎯 Quando Realizar Rollback

Considere rollback para v1.0.0 nas seguintes situações:

1. **Bugs Críticos em Produção**: Erros que impedem funcionalidade essencial (criação de projetos, salvamento de assessments, geração de planos)
2. **Perda de Dados**: Corrupção ou perda de dados após atualização
3. **Incompatibilidade de Versão**: Mudanças de schema do banco incompatíveis
4. **Performance Degradada**: Lentidão extrema ou timeouts após atualização
5. **Falha de Deploy**: Deploy de nova versão falhou parcialmente

---

## ⚠️ Pré-Requisitos e Avisos

### Avisos Importantes

- ⚠️ **BACKUP OBRIGATÓRIO**: SEMPRE faça backup completo do estado atual ANTES de iniciar rollback
- ⚠️ **DOWNTIME**: O rollback causará downtime de ~5-15 minutos
- ⚠️ **PERDA DE DADOS**: Dados criados APÓS v1.0.0 serão PERDIDOS (a menos que você faça merge manual)
- ⚠️ **TESTE EM STAGING**: Se possível, teste o rollback em ambiente de staging primeiro

### Pré-Requisitos

- Acesso ao Management UI do Manus (iasolaris.manus.space)
- Acesso ao repositório GitHub (permissões de push)
- GitHub CLI (`gh`) configurado e autenticado
- Backup completo da versão atual (antes do rollback)

---

## 🔄 Método 1: Rollback via Manus Platform (RECOMENDADO)

Este é o método mais seguro e rápido para rollback em produção.

### Passo 1: Acessar Management UI

1. Acesse https://iasolaris.manus.space
2. Clique no ícone de **Management UI** (painel direito)
3. Navegue até a seção **Checkpoints**

### Passo 2: Identificar Checkpoint v1.0.0

1. Localize o checkpoint com ID `93e36265`
2. Verifique a descrição: "Sprint V31 Concluído - Bug 404 após geração de planos resolvido + 5 testes unitários (100%)"
3. Verifique a data: 01/02/2026

### Passo 3: Executar Rollback

1. Clique no botão **"Rollback"** ao lado do checkpoint `93e36265`
2. Confirme a operação no modal de confirmação
3. Aguarde ~30-60 segundos para o rollback completar

### Passo 4: Validar Rollback

1. Acesse https://iasolaris.manus.space
2. Crie novo projeto de teste
3. Preencha Assessment Fase 1 completo
4. Clique em "Finalizar Fase 1 e Continuar"
5. Valide que salvamento foi bem-sucedido (sem erros SQL)
6. Teste geração de planos por ramo
7. Valide que redirecionamento funciona (não mostra 404)

### Passo 5: Monitorar Logs

```bash
# Acessar logs do servidor em produção
tail -f .manus-logs/devserver.log
tail -f .manus-logs/browserConsole.log
```

Verifique se não há erros críticos nos logs após o rollback.

---

## 🔄 Método 2: Rollback via GitHub + Deploy Manual

Use este método se o Método 1 falhar ou se você precisar de controle total sobre o processo.

### Passo 1: Backup do Estado Atual

```bash
# Fazer backup completo do código atual
cd /home/ubuntu/compliance-tributaria-v2
tar -czf ../compliance-backup-pre-rollback-$(date +%Y%m%d-%H%M%S).tar.gz .

# Fazer backup do banco de dados (opcional, se tiver acesso)
# mysqldump -u user -p database_name > backup-db-$(date +%Y%m%d).sql
```

### Passo 2: Checkout da Tag v1.0.0

```bash
cd /home/ubuntu/compliance-tributaria-v2

# Verificar tags disponíveis
git fetch --tags
git tag -l

# Fazer checkout da tag v1.0.0
git checkout tags/v1.0.0 -b rollback-v1.0.0

# Verificar que está na versão correta
git log -1
# Deve mostrar commit 36334848
```

### Passo 3: Restaurar Dependências

```bash
# Reinstalar dependências (garantir versões corretas)
pnpm install

# Verificar que node_modules está correto
pnpm list --depth=0
```

### Passo 4: Verificar Schema do Banco

```bash
# Aplicar migrações do banco (se necessário)
pnpm db:push

# ATENÇÃO: Este comando pode falhar se o schema atual for incompatível
# Neste caso, você precisará fazer rollback manual do banco de dados
```

### Passo 5: Executar Testes

```bash
# Executar testes unitários para validar funcionalidade
pnpm test

# Verificar que 18/18 testes passam (100%)
```

### Passo 6: Restart do Servidor

```bash
# Via Management UI: clicar em "Restart Server"
# OU via comando (se tiver acesso):
# pm2 restart compliance-tributaria-v2
```

### Passo 7: Validar em Produção

Siga os mesmos passos de validação do Método 1 (Passo 4).

---

## 🔄 Método 3: Rollback via Backup Completo (ÚLTIMO RECURSO)

Use este método apenas se os Métodos 1 e 2 falharem completamente.

### Passo 1: Download do Backup v1.0.0

```bash
# Fazer download do backup completo do GitHub
cd /home/ubuntu
wget https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance/releases/download/v1.0.0/compliance-tributaria-v2-v1.0.0-backup-20260201.tar.gz

# Verificar integridade do arquivo
ls -lh compliance-tributaria-v2-v1.0.0-backup-20260201.tar.gz
```

### Passo 2: Remover Versão Atual

```bash
# ATENÇÃO: Este comando remove TUDO da versão atual
cd /home/ubuntu
mv compliance-tributaria-v2 compliance-tributaria-v2-OLD-$(date +%Y%m%d)
```

### Passo 3: Extrair Backup

```bash
# Extrair backup completo
cd /home/ubuntu
tar -xzf compliance-tributaria-v2-v1.0.0-backup-20260201.tar.gz

# Verificar que extração foi bem-sucedida
cd compliance-tributaria-v2
ls -la
```

### Passo 4: Restaurar Dependências

```bash
cd /home/ubuntu/compliance-tributaria-v2

# Reinstalar dependências
pnpm install
```

### Passo 5: Restart e Validação

Siga os Passos 6 e 7 do Método 2.

---

## 🗄️ Rollback do Banco de Dados

Se o rollback do código não for suficiente e você precisar reverter o schema do banco de dados:

### Opção A: Via Manus Platform (Automático)

O rollback via checkpoint do Manus (Método 1) **NÃO** reverte o banco de dados automaticamente. Você precisará fazer rollback manual do schema.

### Opção B: Rollback Manual do Schema

```bash
# Conectar ao banco de dados
# (Use credenciais do Management UI → Database → Connection Info)

# Executar migrações reversas (se disponíveis)
# OU restaurar backup do banco de dados

# ATENÇÃO: Rollback de banco de dados é DESTRUTIVO
# Consulte DBA ou equipe de infraestrutura antes de prosseguir
```

### Schema v1.0.0 - Tabelas Principais

As seguintes tabelas devem existir no banco de dados v1.0.0:

- `user`
- `projects`
- `assessmentPhase1`
- `assessmentPhase2`
- `corporateQuestionnaire`
- `activityBranches`
- `projectBranches`
- `branchAssessments`
- `actionPlans`
- `branchActionPlans`
- `riskMatrix`
- `briefingVersions`
- `actionPlanVersions`
- `riskMatrixVersions`

**Campos Críticos em assessmentPhase1:**
- `completedAt`, `completedBy`, `completedByRole` devem aceitar `NULL` (migração do Sprint V27)

---

## ✅ Checklist de Validação Pós-Rollback

Após completar o rollback, valide TODAS as funcionalidades críticas:

### Autenticação e Acesso
- [ ] Login via Manus OAuth funciona
- [ ] Usuário consegue acessar dashboard
- [ ] Controle de acesso por role funciona (admin/user)

### Gestão de Projetos
- [ ] Criar novo projeto funciona
- [ ] Listar projetos funciona
- [ ] Visualizar detalhes do projeto funciona

### Assessment
- [ ] Preencher Assessment Fase 1 funciona
- [ ] Salvar Assessment Fase 1 funciona (SEM erro SQL de campos completed*)
- [ ] Avançar para Fase 2 funciona
- [ ] Gerar questionário dinâmico (Fase 2) funciona

### Questionários
- [ ] Gerar questionário corporativo funciona
- [ ] Gerar questionários por ramo funciona
- [ ] Salvar respostas funciona

### Planos de Ação
- [ ] Gerar plano corporativo funciona (SEM erro de parsing JSON)
- [ ] Gerar planos por ramo funciona (SEM erro "Ramo não encontrado")
- [ ] Redirecionamento após geração funciona (SEM erro 404)
- [ ] Visualizar planos funciona

### Matriz de Riscos
- [ ] Gerar matriz de riscos funciona
- [ ] Visualizar matriz funciona
- [ ] Histórico de versões funciona

---

## 🆘 Troubleshooting

### Problema: Checkpoint v1.0.0 não aparece no Management UI

**Solução:**
1. Verifique se você está logado com a conta correta
2. Tente fazer refresh da página (Ctrl+F5)
3. Use Método 2 (GitHub) como alternativa

### Problema: Erro "No procedure found" após rollback

**Solução:**
1. Verifique que o servidor foi reiniciado corretamente
2. Limpe cache do browser (Ctrl+Shift+Delete)
3. Verifique logs do servidor para erros de inicialização

### Problema: Erro SQL após rollback

**Solução:**
1. Verifique que migração do banco foi aplicada corretamente
2. Campos `completedAt`, `completedBy`, `completedByRole` devem aceitar NULL
3. Execute manualmente:
```sql
ALTER TABLE assessmentPhase1 
MODIFY COLUMN completedAt timestamp NULL DEFAULT NULL,
MODIFY COLUMN completedBy int NULL DEFAULT NULL,
MODIFY COLUMN completedByRole varchar(50) NULL DEFAULT NULL;
```

### Problema: Dependências faltando após rollback

**Solução:**
```bash
cd /home/ubuntu/compliance-tributaria-v2
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📞 Suporte

Se você encontrar problemas durante o rollback:

1. **Documentação**: Consulte `baseline.md` e `erros-conhecidos.md`
2. **GitHub Issues**: https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance/issues
3. **Manus Support**: https://help.manus.im

---

## 📚 Referências

- [CHANGELOG.md](./CHANGELOG.md) - Histórico completo de mudanças
- [baseline.md](./baseline.md) - Documentação técnica completa
- [erros-conhecidos.md](./erros-conhecidos.md) - Bugs conhecidos e soluções
- [GitHub Repository](https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance)

---

**Autor**: Manus AI  
**Última Atualização**: 01 de Fevereiro de 2026  
**Versão do Documento**: 1.0
