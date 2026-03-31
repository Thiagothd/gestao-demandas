-- 1. Create custom types
CREATE TYPE user_role AS ENUM ('manager', 'employee');
CREATE TYPE demand_status AS ENUM ('A Fazer', 'Em Andamento', 'Concluído');
CREATE TYPE demand_priority AS ENUM ('Baixa', 'Média', 'Alta', 'Urgente');

-- 2. Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create demands table
CREATE TABLE demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status demand_status NOT NULL DEFAULT 'A Fazer',
  priority demand_priority NOT NULL DEFAULT 'Média',
  sla DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create daily_alignments table
CREATE TABLE daily_alignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  done_yesterday TEXT NOT NULL,
  doing_today TEXT NOT NULL,
  blockers TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date) -- Ensures one alignment per user per day
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_alignments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Profiles: Everyone can read profiles (needed for dropdowns and display)
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Demands: Managers can do everything. Employees can only view and update demands assigned to them.
CREATE POLICY "Managers can do everything on demands" ON demands FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Employees can view assigned demands" ON demands FOR SELECT USING (
  assigned_to = auth.uid()
);
CREATE POLICY "Employees can update assigned demands" ON demands FOR UPDATE USING (
  assigned_to = auth.uid()
);

-- Daily Alignments: Managers can view all. Employees can view, insert, and update their own.
CREATE POLICY "Managers can view all daily alignments" ON daily_alignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
);
CREATE POLICY "Employees can view own daily alignments" ON daily_alignments FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Employees can insert own daily alignments" ON daily_alignments FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Employees can update own daily alignments" ON daily_alignments FOR UPDATE USING (
  user_id = auth.uid()
);

-- 7. Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (new.id, new.raw_user_meta_data->>'name', COALESCE((new.raw_user_meta_data->>'role')::user_role, 'employee'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
