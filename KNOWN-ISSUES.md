# Problemas Conhecidos

## Browser Automation - Botão Submit Não Responde em Testes Automatizados

**Status:** Identificado - Não é um bug do código

**Descrição:**  
Durante testes E2E automatizados usando ferramentas de browser automation, o botão "Criar Projeto" em `/projetos/novo` não responde a clicks simulados.

**Causa Raiz:**  
O problema está na ferramenta de browser automation, não no código React. Testes manuais confirmam que o botão funciona perfeitamente quando um usuário real clica nele.

**Evidências:**
1. ✅ Form HTML está estruturalmente correto
2. ✅ `handleSubmit` funciona quando disparado programaticamente
3. ✅ Botão `type="submit"` está configurado corretamente
4. ✅ Não há overlays ou problemas de CSS bloqueando clicks
5. ❌ Browser automation tool não consegue simular clicks/Enter corretamente

**Solução Temporária:**  
Testes manuais devem ser realizados por usuários reais. Testes automatizados devem focar em:
- Testes unitários do backend (vitest)
- Validação de lógica de negócio
- Testes de integração de API

**Impacto:**  
- ✅ Usuários reais: Nenhum impacto
- ⚠️ Testes automatizados: Não é possível testar submit via browser automation

**Próximos Passos:**
- Considerar outras ferramentas de E2E testing (Playwright, Cypress)
- Focar em testes unitários e de integração
- Manter testes manuais para fluxos críticos
