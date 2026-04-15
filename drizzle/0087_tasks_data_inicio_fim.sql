-- Sprint Z-16 · Issue #614
-- Adiciona data_inicio e data_fim na tabela tasks
-- tasks.prazo (legado) permanece para compatibilidade

ALTER TABLE tasks
  ADD COLUMN data_inicio date NOT NULL
    DEFAULT (CURDATE())
    COMMENT 'Data de início da tarefa (Z-16)',
  ADD COLUMN data_fim date NOT NULL
    DEFAULT (DATE_ADD(CURDATE(), INTERVAL 30 DAY))
    COMMENT 'Data de término previsto (Z-16)';
