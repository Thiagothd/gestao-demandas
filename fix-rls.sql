-- 1. Garante que gerentes podem fazer tudo nas demandas
CREATE POLICY "Managers can do everything on demands" 
  ON demands FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- 2. Garante que funcionários podem ver as demandas atribuídas a eles
CREATE POLICY "Employees can view assigned demands" 
  ON demands FOR SELECT 
  USING (assigned_to = auth.uid());

-- 3. Garante que gerentes podem fazer tudo nas tarefas
CREATE POLICY "Managers can do everything on tasks" 
  ON tasks FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- 4. Garante que funcionários podem ver/atualizar tarefas de demandas atribuídas a eles
CREATE POLICY "Employees can view/update tasks of assigned demands" 
  ON tasks FOR ALL 
  USING (EXISTS (SELECT 1 FROM demands WHERE id = tasks.demand_id AND assigned_to = auth.uid()));
