-- DOWN migration for 0089_enquadramento_geral_categoria.sql
-- Reverte o INSERT da categoria enquadramento_geral em risk_categories.
--
-- NOTA: o UP statement ALTER TABLE ENUM é no-op no banco real
-- (risks_v4.categoria é varchar(100) + FK, não enum DB).
-- Portanto este DOWN não reverte ALTER — apenas o INSERT funcional.
--
-- Uso: executar apenas em caso de rollback completo do PR #841.
-- NÃO executar se existirem riscos em risks_v4 com categoria='enquadramento_geral'
-- (FK impediria a operação — precisaria deletar/recategorizar riscos primeiro).

DELETE FROM risk_categories
WHERE codigo = 'enquadramento_geral';
