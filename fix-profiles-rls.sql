-- 1. Garante que todos os usuários autenticados podem ler a tabela profiles
CREATE POLICY "Users can view profiles" 
  ON profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- 2. Garante que o próprio usuário pode atualizar seu perfil
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);
