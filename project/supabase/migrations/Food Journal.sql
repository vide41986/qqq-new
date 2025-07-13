/*
  # Food Journal Schema

  1. New Tables
    - `food_entries` - Individual food/meal entries
    - `food_photos` - Photos associated with food entries
    - `nutrition_goals` - User's daily nutrition goals
    - `meal_types` - Predefined meal types (breakfast, lunch, etc.)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create meal_types table for predefined meal categories
CREATE TABLE IF NOT EXISTS meal_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  emoji text NOT NULL,
  color text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create food_entries table
CREATE TABLE IF NOT EXISTS food_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  meal_type_id uuid REFERENCES meal_types(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  date date DEFAULT CURRENT_DATE,
  time time DEFAULT CURRENT_TIME,
  calories integer DEFAULT 0,
  protein_g decimal(5,2) DEFAULT 0,
  carbs_g decimal(5,2) DEFAULT 0,
  fat_g decimal(5,2) DEFAULT 0,
  fiber_g decimal(5,2) DEFAULT 0,
  sugar_g decimal(5,2) DEFAULT 0,
  sodium_mg decimal(7,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create food_photos table
CREATE TABLE IF NOT EXISTS food_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_entry_id uuid REFERENCES food_entries(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_path text,
  caption text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create nutrition_goals table
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  daily_calories integer DEFAULT 2000,
  daily_protein_g decimal(6,2) DEFAULT 150,
  daily_carbs_g decimal(6,2) DEFAULT 250,
  daily_fat_g decimal(6,2) DEFAULT 65,
  daily_fiber_g decimal(6,2) DEFAULT 25,
  daily_sugar_g decimal(6,2) DEFAULT 50,
  daily_sodium_mg decimal(8,2) DEFAULT 2300,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Insert default meal types
INSERT INTO meal_types (name, emoji, color, sort_order) VALUES
  ('Breakfast', '🌅', '#FF6B6B', 1),
  ('Lunch', '☀️', '#4ECDC4', 2),
  ('Dinner', '🌙', '#45B7D1', 3),
  ('Snack', '🍎', '#96CEB4', 4),
  ('Drink', '🥤', '#FFEAA7', 5),
  ('Dessert', '🍰', '#DDA0DD', 6)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE meal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Meal types policies (public read)
CREATE POLICY "Anyone can read meal types"
  ON meal_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Food entries policies
CREATE POLICY "Users can manage own food entries"
  ON food_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_id AND p.user_id = auth.uid()
    )
  );

-- Food photos policies
CREATE POLICY "Users can manage own food photos"
  ON food_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM food_entries fe
      JOIN profiles p ON p.id = fe.user_id
      WHERE fe.id = food_entry_id AND p.user_id = auth.uid()
    )
  );

-- Nutrition goals policies
CREATE POLICY "Users can manage own nutrition goals"
  ON nutrition_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_id AND p.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_entries_meal_type ON food_entries(meal_type_id);
CREATE INDEX IF NOT EXISTS idx_food_photos_entry ON food_photos(food_entry_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user ON nutrition_goals(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_food_entries_updated_at
    BEFORE UPDATE ON food_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_goals_updated_at
    BEFORE UPDATE ON nutrition_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();