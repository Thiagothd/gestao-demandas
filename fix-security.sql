-- =============================================================
-- SCRIPT DE CORREÇÃO DE SEGURANÇA E PERFORMANCE
-- Execute este script no SQL Editor do Supabase
-- =============================================================

-- -------------------------------------------------------------
-- 1. REABILITAR RLS EM TODAS AS TABELAS
-- -------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_entries ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 2. POLÍTICAS RLS PARA time_entries
-- -------------------------------------------------------------
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can do everything on time_entries" ON time_entries;
DROP POLICY IF EXISTS "Employees can view own time_entries" ON time_entries;
DROP POLICY IF EXISTS "Employees can insert own time_entries" ON time_entries;
DROP POLICY IF EXISTS "Employees can update own time_entries" ON time_entries;
DROP POLICY IF EXISTS "Employees can delete own time_entries" ON time_entries;

CREATE POLICY "Managers can do everything on time_entries"
  ON time_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

CREATE POLICY "Employees can view own time_entries"
  ON time_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Employees can insert own time_entries"
  ON time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Employees can update own time_entries"
  ON time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Employees can delete own time_entries"
  ON time_entries FOR DELETE
  USING (user_id = auth.uid());

-- -------------------------------------------------------------
-- 3. POLÍTICAS RLS PARA overtime_entries (recriar para garantir)
-- -------------------------------------------------------------
ALTER TABLE overtime_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can do everything on overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can view own overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can insert own overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can update own overtime_entries" ON overtime_entries;
DROP POLICY IF EXISTS "Employees can delete own overtime_entries" ON overtime_entries;

CREATE POLICY "Managers can do everything on overtime_entries"
  ON overtime_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

CREATE POLICY "Employees can view own overtime_entries"
  ON overtime_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Employees can insert own overtime_entries"
  ON overtime_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Employees can update own overtime_entries"
  ON overtime_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Employees can delete own overtime_entries"
  ON overtime_entries FOR DELETE
  USING (user_id = auth.uid());

-- -------------------------------------------------------------
-- 4. POLÍTICA RLS PARA demands — garantir que employees
--    só veem demandas atribuídas a eles
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Managers can do everything on demands" ON demands;
DROP POLICY IF EXISTS "Employees can view assigned demands" ON demands;
DROP POLICY IF EXISTS "Employees can update assigned demands" ON demands;

CREATE POLICY "Managers can do everything on demands"
  ON demands FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

CREATE POLICY "Employees can view assigned demands"
  ON demands FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "Employees can update assigned demands"
  ON demands FOR UPDATE
  USING (assigned_to = auth.uid());

-- -------------------------------------------------------------
-- 5. TABELA demand_comments (se não existir)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demand_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demand_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view comments" ON demand_comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON demand_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON demand_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON demand_comments;

CREATE POLICY "Anyone authenticated can view comments"
  ON demand_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own comments"
  ON demand_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON demand_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON demand_comments FOR DELETE
  USING (auth.uid() = user_id);

-- -------------------------------------------------------------
-- 6. ÍNDICES PARA PERFORMANCE
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_demands_status_assigned ON demands(status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_demands_sla ON demands(sla);
CREATE INDEX IF NOT EXISTS idx_demands_created_at ON demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demands_checklist ON demands USING GIN (checklist);
CREATE INDEX IF NOT EXISTS idx_demands_assigned_to ON demands(assigned_to);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON time_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_overtime_user_date ON overtime_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_overtime_created_at ON overtime_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_demand_comments_demand_id ON demand_comments(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_comments_created_at ON demand_comments(created_at DESC);

-- -------------------------------------------------------------
-- 7. COLUNA updated_at NAS TABELAS PRINCIPAIS
-- -------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE demands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE overtime_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_demands_updated_at ON demands;
CREATE TRIGGER trg_demands_updated_at
  BEFORE UPDATE ON demands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_time_entries_updated_at ON time_entries;
CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_overtime_updated_at ON overtime_entries;
CREATE TRIGGER trg_overtime_updated_at
  BEFORE UPDATE ON overtime_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
