-- Macro Goals Table Migration
CREATE TABLE IF NOT EXISTS macro_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  protein decimal(6,2) NOT NULL,
  carbs decimal(6,2) NOT NULL,
  fat decimal(6,2) NOT NULL,
  calories decimal(6,2) NOT NULL,
  unit text CHECK (unit IN ('grams', 'percentage')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one active macro goal per user (latest by created_at)
CREATE INDEX IF NOT EXISTS idx_macro_goals_user_id_created_at ON macro_goals(user_id, created_at DESC);

-- RLS Policy: Only allow users to manage their own macro goals
ALTER TABLE macro_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own macro goals" ON macro_goals FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = user_id AND p.user_id = auth.uid()
  )
);
