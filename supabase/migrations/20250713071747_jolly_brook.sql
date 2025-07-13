/*
  # Add Missing Columns to Exercises and Templates

  1. New Columns
    - Add `video_url` and `image_url` to exercises table
    - Add `difficulty_level` to exercises table  
    - Add `thumbnail_url` to workout_templates table

  2. Security
    - No changes to RLS policies needed
*/

-- Add missing columns to exercises table
DO $$
BEGIN
  -- Add video_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE exercises ADD COLUMN video_url text;
  END IF;

  -- Add image_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE exercises ADD COLUMN image_url text;
  END IF;

  -- Add difficulty_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'difficulty_level'
  ) THEN
    ALTER TABLE exercises ADD COLUMN difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner';
  END IF;
END $$;

-- Add missing columns to workout_templates table
DO $$
BEGIN
  -- Add thumbnail_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_templates' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE workout_templates ADD COLUMN thumbnail_url text;
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_workout_templates_thumbnail ON workout_templates(thumbnail_url) WHERE thumbnail_url IS NOT NULL;