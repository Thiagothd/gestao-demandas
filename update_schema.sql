-- Add checklist column to demands table if it doesn't exist
ALTER TABLE demands ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

-- Add other missing columns from types.ts if they don't exist
ALTER TABLE demands ADD COLUMN IF NOT EXISTS ticket_id SERIAL;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS client TEXT;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS requester TEXT;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE demands ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
ALTER TABLE demands ADD COLUMN IF NOT EXISTS logged_hours NUMERIC;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS final_observations TEXT;
ALTER TABLE demands ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Drop tasks table if it exists as we migrated to checklist JSONB
DROP TABLE IF EXISTS tasks;
