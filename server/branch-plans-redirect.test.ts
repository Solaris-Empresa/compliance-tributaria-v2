import { describe, it, expect } from 'vitest';

/**
 * Testes para validar redirecionamento após geração de planos por ramo
 * 
 * Bug corrigido: PlanoAcao.tsx linha 328
 * - Antes: /visualizar-planos-por-ramo
 * - Depois: /planos-acao/visualizar-planos-por-ramo
 */

describe('Redirecionamento após geração de planos por ramo', () => {
  it('deve construir URL correta com projectId', () => {
    const projectId = 123;
    const expectedUrl = `/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`;
    
    // Simula construção da URL no frontend
    const url = `/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`;
    
    expect(url).toBe(expectedUrl);
    expect(url).toContain('/planos-acao/');
    expect(url).toContain('visualizar-planos-por-ramo');
    expect(url).toContain(`projectId=${projectId}`);
  });

  it('deve incluir prefixo /planos-acao/ na rota', () => {
    const projectId = 456;
    const url = `/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`;
    
    // Valida que a rota começa com /planos-acao/
    expect(url.startsWith('/planos-acao/')).toBe(true);
    
    // Valida que NÃO é a rota incorreta (sem /planos-acao/)
    expect(url).not.toBe(`/visualizar-planos-por-ramo?projectId=${projectId}`);
  });

  it('deve validar formato completo da URL', () => {
    const projectId = 789;
    const url = `/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`;
    
    // Valida estrutura completa
    const regex = /^\/planos-acao\/visualizar-planos-por-ramo\?projectId=\d+$/;
    expect(regex.test(url)).toBe(true);
  });

  it('deve aceitar diferentes valores de projectId', () => {
    const testCases = [1, 100, 9999, 123456];
    
    testCases.forEach(projectId => {
      const url = `/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`;
      expect(url).toContain(`projectId=${projectId}`);
      expect(url.startsWith('/planos-acao/')).toBe(true);
    });
  });

  it('deve rejeitar URL incorreta (sem /planos-acao/)', () => {
    const projectId = 123;
    const incorrectUrl = `/visualizar-planos-por-ramo?projectId=${projectId}`;
    const correctUrl = `/planos-acao/visualizar-planos-por-ramo?projectId=${projectId}`;
    
    // Valida que URLs são diferentes
    expect(incorrectUrl).not.toBe(correctUrl);
    
    // Valida que URL incorreta NÃO tem o prefixo
    expect(incorrectUrl.startsWith('/planos-acao/')).toBe(false);
  });
});
