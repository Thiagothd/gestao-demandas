-- Este script desabilita temporariamente a Segurança em Nível de Linha (RLS)
-- de todas as tabelas do sistema.
-- Isso permite que qualquer usuário (funcionário ou gerente) possa ver, criar,
-- editar e excluir qualquer registro no sistema.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE demands DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_alignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_entries DISABLE ROW LEVEL SECURITY;

-- Quando quiser bloquear novamente no futuro, basta rodar:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_alignments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE overtime_entries ENABLE ROW LEVEL SECURITY;
