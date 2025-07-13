/*
  # Seed Sample Data

  1. Sample Data
    - Create sample profiles for different roles
    - Add sample workout sessions
    - Add sample daily stats
    - Add sample goals
    - Add sample client assignments
    - Add sample consultations and training sessions

  2. Notes
    - This is for development/demo purposes
    - Uses realistic but fake data
*/

-- Insert sample profiles
INSERT INTO profiles (id, user_id, email, full_name, role, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin@vinayfit.com', 'Admin User', 'admin', now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'trainer@vinayfit.com', 'Mike Chen', 'trainer', now()),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'nutritionist@vinayfit.com', 'Emma Davis', 'nutritionist', now()),
  ('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'client1@vinayfit.com', 'Sarah Johnson', 'client', now()),
  ('55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'client2@vinayfit.com', 'David Wilson', 'client', now()),
  ('66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'hr@vinayfit.com', 'Lisa Park', 'hr', now())
ON CONFLICT (email) DO NOTHING;

-- Insert sample daily stats for today
INSERT INTO daily_stats (user_id, date, steps, water_intake_ml, calories_consumed, calories_burned, weight_kg) VALUES
  ('44444444-4444-4444-4444-444444444444', CURRENT_DATE, 7500, 1800, 1650, 450, 68.5),
  ('55555555-5555-5555-5555-555555555555', CURRENT_DATE, 9200, 2100, 1850, 380, 75.2),
  ('22222222-2222-2222-2222-222222222222', CURRENT_DATE, 12000, 2500, 2200, 600, 82.1),
  ('33333333-3333-3333-3333-333333333333', CURRENT_DATE, 8800, 2000, 1900, 320, 62.8)
ON CONFLICT (user_id, date) DO UPDATE SET
  steps = EXCLUDED.steps,
  water_intake_ml = EXCLUDED.water_intake_ml,
  calories_consumed = EXCLUDED.calories_consumed,
  calories_burned = EXCLUDED.calories_burned,
  weight_kg = EXCLUDED.weight_kg;

-- Insert sample goals
INSERT INTO goals (user_id, title, description, emoji, target_date, progress_percentage, status, category) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Lose 10kg for Summer', 'Get beach ready by losing 10kg through consistent training and nutrition', '🏖️', CURRENT_DATE + INTERVAL '60 days', 65, 'active', 'weight_loss'),
  ('55555555-5555-5555-5555-555555555555', 'Build Muscle Mass', 'Gain 5kg of lean muscle mass through strength training', '💪', CURRENT_DATE + INTERVAL '90 days', 40, 'active', 'muscle_gain'),
  ('22222222-2222-2222-2222-222222222222', 'Train 50 Clients', 'Successfully train 50 different clients this quarter', '🎯', CURRENT_DATE + INTERVAL '45 days', 78, 'active', 'professional'),
  ('33333333-3333-3333-3333-333333333333', 'Nutrition Certification', 'Complete advanced sports nutrition certification', '📚', CURRENT_DATE + INTERVAL '120 days', 25, 'active', 'education')
ON CONFLICT DO NOTHING;

-- Insert sample client assignments
INSERT INTO client_assignments (client_id, trainer_id, nutritionist_id, assigned_date, status) VALUES
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '30 days', 'active'),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', NULL, CURRENT_DATE - INTERVAL '15 days', 'active')
ON CONFLICT DO NOTHING;

-- Insert sample workout sessions for today
INSERT INTO workout_sessions (client_id, trainer_id, date, start_time, duration_minutes, exercises, completed) VALUES
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', CURRENT_DATE, '09:00:00', 60, '[{"name": "Push-ups", "sets": 3, "reps": 15}, {"name": "Squats", "sets": 3, "reps": 20}]', false),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', CURRENT_DATE, '14:00:00', 45, '[{"name": "Deadlifts", "sets": 4, "reps": 8}, {"name": "Pull-ups", "sets": 3, "reps": 10}]', true)
ON CONFLICT DO NOTHING;

-- Insert sample training sessions for today
INSERT INTO training_sessions (client_id, trainer_id, scheduled_date, scheduled_time, duration_minutes, type, status, location) VALUES
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', CURRENT_DATE, '10:00:00', 60, 'Strength Training', 'scheduled', 'Gym A'),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', CURRENT_DATE, '15:30:00', 45, 'HIIT Session', 'scheduled', 'Studio B')
ON CONFLICT DO NOTHING;

-- Insert sample consultations for today
INSERT INTO consultations (client_id, nutritionist_id, scheduled_date, scheduled_time, duration_minutes, type, status) VALUES
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', CURRENT_DATE, '11:00:00', 60, 'Meal Plan Review', 'scheduled'),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', CURRENT_DATE, '16:00:00', 45, 'Initial Consultation', 'scheduled')
ON CONFLICT DO NOTHING;

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type, read) VALUES
  ('44444444-4444-4444-4444-444444444444', 'Workout Reminder', 'Your training session with Mike starts in 30 minutes', 'workout', false),
  ('22222222-2222-2222-2222-222222222222', 'New Client Assigned', 'Sarah Johnson has been assigned to you as a client', 'assignment', false),
  ('33333333-3333-3333-3333-333333333333', 'Consultation Today', 'You have 2 consultations scheduled for today', 'reminder', false),
  ('11111111-1111-1111-1111-111111111111', 'System Update', 'System maintenance completed successfully', 'system', true)
ON CONFLICT DO NOTHING;