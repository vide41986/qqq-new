/*
  # Health Data Integration Schema

  1. New Tables
    - `health_data` - Store health metrics from various sources
    - `health_sync_settings` - User preferences for health data syncing
    - `health_devices` - Track connected devices and their sync status

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own health data
*/

-- Create health_data table for storing various health metrics
CREATE TABLE IF NOT EXISTS health_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('steps', 'heart_rate', 'sleep', 'calories_burned', 'distance', 'active_minutes', 'resting_heart_rate', 'weight', 'body_fat')),
  value decimal(10,2) NOT NULL,
  unit text NOT NULL, -- 'steps', 'bpm', 'hours', 'calories', 'km', 'minutes', 'kg', '%'
  source text NOT NULL CHECK (source IN ('apple_health', 'google_fit', 'manual', 'fitbit', 'garmin', 'samsung_health')),
  device_info jsonb DEFAULT '{}', -- Store device-specific information
  recorded_at timestamptz NOT NULL,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create health_sync_settings table for user preferences
CREATE TABLE IF NOT EXISTS health_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  apple_health_enabled boolean DEFAULT false,
  google_fit_enabled boolean DEFAULT false,
  sync_steps boolean DEFAULT true,
  sync_heart_rate boolean DEFAULT true,
  sync_sleep boolean DEFAULT true,
  sync_calories boolean DEFAULT true,
  sync_distance boolean DEFAULT true,
  sync_weight boolean DEFAULT false,
  auto_sync_enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create health_devices table for tracking connected devices
CREATE TABLE IF NOT EXISTS health_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  device_type text NOT NULL CHECK (device_type IN ('apple_watch', 'iphone', 'android_phone', 'fitbit', 'garmin', 'samsung_watch')),
  device_name text NOT NULL,
  device_id text, -- Unique identifier from the device
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  sync_status text CHECK (sync_status IN ('connected', 'disconnected', 'error', 'syncing')) DEFAULT 'connected',
  permissions jsonb DEFAULT '{}', -- Store granted permissions
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_devices ENABLE ROW LEVEL SECURITY;

-- Health data policies
CREATE POLICY "Users can manage own health data"
  ON health_data
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_id AND p.user_id = auth.uid()
    )
  );

-- Trainers can read client health data
CREATE POLICY "Trainers can read client health data"
  ON health_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments ca
      JOIN profiles trainer ON trainer.id = ca.trainer_id
      JOIN profiles client ON client.id = ca.client_id
      WHERE client.id = user_id 
      AND trainer.user_id = auth.uid()
      AND ca.status = 'active'
    )
  );

-- Health sync settings policies
CREATE POLICY "Users can manage own sync settings"
  ON health_sync_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_id AND p.user_id = auth.uid()
    )
  );

-- Health devices policies
CREATE POLICY "Users can manage own devices"
  ON health_devices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_id AND p.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON health_data(user_id, date);
CREATE INDEX IF NOT EXISTS idx_health_data_type_date ON health_data(data_type, date);
CREATE INDEX IF NOT EXISTS idx_health_data_source ON health_data(source);
CREATE INDEX IF NOT EXISTS idx_health_sync_settings_user ON health_sync_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_health_devices_user ON health_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_health_devices_active ON health_devices(user_id, is_active);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_health_data_updated_at
    BEFORE UPDATE ON health_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_sync_settings_updated_at
    BEFORE UPDATE ON health_sync_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_devices_updated_at
    BEFORE UPDATE ON health_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();