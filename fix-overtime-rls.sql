-- Habilita RLS na tabela overtime_entries (caso não esteja habilitado)
ALTER TABLE overtime_entries ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas caso existam
DROP POLICY IF EXISTS "Managers can do everything on overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can view own overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can insert own overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can update own overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can delete own overtime_entries" ON overtime_entries;

-- Cria política para gerentes (podem ver, inserir, atualizar e deletar todas as horas extras)
CREATE POLICY "Managers can do everything on overtime_entries" 
ON overtime_entries FOR ALL 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
);

-- Cria política para funcionários (podem ver apenas as próprias horas extras)
CREATE POLICY "Employees can view own overtime_entries" 
ON overtime_entries FOR SELECT 
USING (user_id = auth.uid());

-- Cria política para funcionários (podem inserir as próprias horas extras)
CREATE POLICY "Employees can insert own overtime_entries" 
ON overtime_entries FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Cria política para funcionários (podem atualizar as próprias horas extras)
CREATE POLICY "Employees can update own overtime_entries" 
ON overtime_entries FOR UPDATE 
USING (user_id = auth.uid());

-- Cria política para funcionários (podem deletar as próprias horas extras)
CREATE POLICY "Employees can delete own overtime_entries" 
ON overtime_entries FOR DELETE 
USING (user_id = auth.uid());
