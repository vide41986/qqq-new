/*
  # Create Meal Plans System

  1. New Tables
    - `meal_plans` - Main meal plan information
    - `meal_plan_days` - Individual days within a meal plan
    - `meal_plan_entries` - Specific meals/food items for each day

  2. Security
    - Enable RLS on all tables
    - Add policies for nutritionists and clients
*/

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  nutritionist_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text CHECK (status IN ('draft', 'active', 'completed', 'cancelled')) DEFAULT 'draft',
  title_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create meal_plan_days table
CREATE TABLE IF NOT EXISTS meal_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid REFERENCES meal_plans(id) ON DELETE CASCADE,
  date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meal_plan_id, date)
);

-- Create meal_plan_entries table
CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_day_id uuid REFERENCES meal_plan_days(id) ON DELETE CASCADE,
  meal_type_id uuid REFERENCES meal_types(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  time time,
  calories integer DEFAULT 0,
  protein_g decimal(5,2) DEFAULT 0,
  carbs_g decimal(5,2) DEFAULT 0,
  fat_g decimal(5,2) DEFAULT 0,
  fiber_g decimal(5,2) DEFAULT 0,
  image_url text,
  is_ai_generated boolean DEFAULT false,
  quantity text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_entries ENABLE ROW LEVEL SECURITY;

-- Meal plans policies
CREATE POLICY "Nutritionists can manage their meal plans"
  ON meal_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = nutritionist_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can read their meal plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = client_id AND p.user_id = auth.uid()
    )
  );

-- Meal plan days policies
CREATE POLICY "Users can manage meal plan days"
  ON meal_plan_days
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN profiles p ON (p.id = mp.nutritionist_id OR p.id = mp.client_id)
      WHERE mp.id = meal_plan_id AND p.user_id = auth.uid()
    )
  );

-- Meal plan entries policies
CREATE POLICY "Users can manage meal plan entries"
  ON meal_plan_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plan_days mpd
      JOIN meal_plans mp ON mp.id = mpd.meal_plan_id
      JOIN profiles p ON (p.id = mp.nutritionist_id OR p.id = mp.client_id)
      WHERE mpd.id = meal_plan_day_id AND p.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutritionist ON meal_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client ON meal_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_dates ON meal_plans(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_meal_plan_days_plan ON meal_plan_days(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_days_date ON meal_plan_days(date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_day ON meal_plan_entries(meal_plan_day_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_meal_type ON meal_plan_entries(meal_type_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_ai ON meal_plan_entries(is_ai_generated);

-- Create triggers for updated_at
CREATE TRIGGER update_meal_plans_updated_at
    BEFORE UPDATE ON meal_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plan_days_updated_at
    BEFORE UPDATE ON meal_plan_days
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plan_entries_updated_at
    BEFORE UPDATE ON meal_plan_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();