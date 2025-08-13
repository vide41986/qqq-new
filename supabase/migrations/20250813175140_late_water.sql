/*
  # Create Meal Items Library

  1. New Tables
    - `meal_items` - Reusable meal items that nutritionists can select from

  2. Security
    - Enable RLS on meal_items table
    - Add policies for nutritionists to manage meal items
*/

-- Create meal_items table
CREATE TABLE IF NOT EXISTS meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'General',
  calories integer DEFAULT 0,
  protein_g decimal(5,2) DEFAULT 0,
  carbs_g decimal(5,2) DEFAULT 0,
  fat_g decimal(5,2) DEFAULT 0,
  fiber_g decimal(5,2) DEFAULT 0,
  image_url text,
  is_ai_generated boolean DEFAULT false,
  serving_size text DEFAULT '1 serving',
  preparation_time_minutes integer DEFAULT 0,
  cooking_instructions text,
  ingredients text[],
  allergens text[],
  dietary_tags text[], -- e.g., ['vegan', 'gluten-free', 'keto']
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

-- Meal items policies
CREATE POLICY "Users can read public meal items"
  ON meal_items
  FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can read own meal items"
  ON meal_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = created_by AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Nutritionists can create meal items"
  ON meal_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = created_by AND p.user_id = auth.uid() AND p.role = 'nutritionist'
    )
  );

CREATE POLICY "Users can update own meal items"
  ON meal_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = created_by AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own meal items"
  ON meal_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = created_by AND p.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_items_created_by ON meal_items(created_by);
CREATE INDEX IF NOT EXISTS idx_meal_items_public ON meal_items(is_public);
CREATE INDEX IF NOT EXISTS idx_meal_items_category ON meal_items(category);
CREATE INDEX IF NOT EXISTS idx_meal_items_dietary_tags ON meal_items USING GIN(dietary_tags);

-- Create trigger for updated_at
CREATE TRIGGER update_meal_items_updated_at
    BEFORE UPDATE ON meal_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample meal items
INSERT INTO meal_items (name, description, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, preparation_time_minutes, ingredients, dietary_tags, is_public) VALUES
  ('Grilled Chicken Breast', 'Lean protein source, perfectly seasoned and grilled', 'Protein', 165, 31.0, 0.0, 3.6, 0.0, '100g', 15, ARRAY['Chicken breast', 'Olive oil', 'Salt', 'Pepper', 'Herbs'], ARRAY['high-protein', 'low-carb'], true),
  ('Quinoa Bowl', 'Nutritious quinoa with mixed vegetables', 'Grains', 222, 8.1, 39.4, 3.6, 5.2, '1 cup cooked', 20, ARRAY['Quinoa', 'Mixed vegetables', 'Olive oil', 'Lemon'], ARRAY['vegan', 'gluten-free', 'high-fiber'], true),
  ('Greek Yogurt Parfait', 'Protein-rich yogurt with berries and granola', 'Breakfast', 150, 15.0, 20.0, 2.0, 3.0, '1 cup', 5, ARRAY['Greek yogurt', 'Mixed berries', 'Granola', 'Honey'], ARRAY['vegetarian', 'high-protein'], true),
  ('Avocado Toast', 'Whole grain toast topped with fresh avocado', 'Breakfast', 234, 6.0, 24.0, 15.0, 10.0, '1 slice', 5, ARRAY['Whole grain bread', 'Avocado', 'Salt', 'Pepper', 'Lemon'], ARRAY['vegetarian', 'high-fiber'], true),
  ('Salmon Fillet', 'Omega-3 rich salmon, baked to perfection', 'Protein', 206, 22.0, 0.0, 12.0, 0.0, '100g', 20, ARRAY['Salmon fillet', 'Olive oil', 'Lemon', 'Herbs'], ARRAY['high-protein', 'omega-3'], true),
  ('Sweet Potato', 'Roasted sweet potato with natural sweetness', 'Vegetables', 112, 2.0, 26.0, 0.1, 3.9, '1 medium', 45, ARRAY['Sweet potato', 'Olive oil', 'Salt'], ARRAY['vegan', 'gluten-free', 'high-fiber'], true),
  ('Mixed Green Salad', 'Fresh mixed greens with light vinaigrette', 'Vegetables', 65, 3.0, 8.0, 3.0, 4.0, '1 cup', 10, ARRAY['Mixed greens', 'Cucumber', 'Tomato', 'Olive oil', 'Vinegar'], ARRAY['vegan', 'low-calorie'], true),
  ('Protein Smoothie', 'Post-workout protein smoothie with fruits', 'Beverages', 180, 25.0, 15.0, 2.0, 3.0, '1 cup', 5, ARRAY['Protein powder', 'Banana', 'Berries', 'Almond milk'], ARRAY['high-protein', 'post-workout'], true)
ON CONFLICT (name) DO NOTHING;