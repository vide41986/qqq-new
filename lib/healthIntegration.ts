import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Health data types
export interface HealthDataPoint {
  type: 'steps' | 'heart_rate' | 'sleep' | 'calories_burned' | 'distance' | 'active_minutes' | 'resting_heart_rate' | 'weight';
  value: number;
  unit: string;
  date: string;
  recordedAt: Date;
  source: 'apple_health' | 'google_fit' | 'manual';
  deviceInfo?: any;
}

export interface HealthSyncSettings {
  appleHealthEnabled: boolean;
  googleFitEnabled: boolean;
  syncSteps: boolean;
  syncHeartRate: boolean;
  syncSleep: boolean;
  syncCalories: boolean;
  syncDistance: boolean;
  syncWeight: boolean;
  autoSyncEnabled: boolean;
}

// Apple HealthKit integration (iOS only)
class AppleHealthIntegration {
  private static instance: AppleHealthIntegration;
  private isInitialized = false;

  static getInstance(): AppleHealthIntegration {
    if (!AppleHealthIntegration.instance) {
      AppleHealthIntegration.instance = new AppleHealthIntegration();
    }
    return AppleHealthIntegration.instance;
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('Apple Health not available on this platform');
      return false;
    }

    try {
      // In a real implementation, you would use react-native-health or expo-health
      // For now, we'll simulate the initialization
      console.log('Initializing Apple Health integration...');
      
      // Request permissions for health data
      const permissions = {
        read: [
          'Steps',
          'HeartRate',
          'SleepAnalysis',
          'ActiveEnergyBurned',
          'DistanceWalkingRunning',
          'RestingHeartRate',
          'BodyMass'
        ],
        write: []
      };

      // Simulate permission request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isInitialized = true;
      console.log('Apple Health initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Apple Health:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // In a real implementation, this would request actual HealthKit permissions
      console.log('Requesting Apple Health permissions...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    } catch (error) {
      console.error('Failed to request Apple Health permissions:', error);
      return false;
    }
  }

  async getStepsData(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
    if (!this.isInitialized) {
      throw new Error('Apple Health not initialized');
    }

    try {
      // Simulate fetching steps data from HealthKit
      const mockData: HealthDataPoint[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        mockData.push({
          type: 'steps',
          value: Math.floor(Math.random() * 5000) + 5000, // 5000-10000 steps
          unit: 'steps',
          date: currentDate.toISOString().split('T')[0],
          recordedAt: new Date(currentDate),
          source: 'apple_health',
          deviceInfo: { device: 'iPhone', version: '17.0' }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mockData;
    } catch (error) {
      console.error('Failed to fetch steps data from Apple Health:', error);
      return [];
    }
  }

  async getHeartRateData(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
    if (!this.isInitialized) {
      throw new Error('Apple Health not initialized');
    }

    try {
      // Simulate fetching heart rate data
      const mockData: HealthDataPoint[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // Add multiple heart rate readings per day
        for (let i = 0; i < 24; i += 4) { // Every 4 hours
          const readingTime = new Date(currentDate);
          readingTime.setHours(i);
          
          mockData.push({
            type: 'heart_rate',
            value: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
            unit: 'bpm',
            date: currentDate.toISOString().split('T')[0],
            recordedAt: readingTime,
            source: 'apple_health',
            deviceInfo: { device: 'Apple Watch', series: '9' }
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mockData;
    } catch (error) {
      console.error('Failed to fetch heart rate data from Apple Health:', error);
      return [];
    }
  }

  async getSleepData(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
    if (!this.isInitialized) {
      throw new Error('Apple Health not initialized');
    }

    try {
      // Simulate fetching sleep data
      const mockData: HealthDataPoint[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        mockData.push({
          type: 'sleep',
          value: Math.random() * 2 + 6.5, // 6.5-8.5 hours
          unit: 'hours',
          date: currentDate.toISOString().split('T')[0],
          recordedAt: new Date(currentDate),
          source: 'apple_health',
          deviceInfo: { device: 'Apple Watch', series: '9' }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mockData;
    } catch (error) {
      console.error('Failed to fetch sleep data from Apple Health:', error);
      return [];
    }
  }
}

// Google Fit integration (Android only)
class GoogleFitIntegration {
  private static instance: GoogleFitIntegration;
  private isInitialized = false;

  static getInstance(): GoogleFitIntegration {
    if (!GoogleFitIntegration.instance) {
      GoogleFitIntegration.instance = new GoogleFitIntegration();
    }
    return GoogleFitIntegration.instance;
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('Google Fit not available on this platform');
      return false;
    }

    try {
      console.log('Initializing Google Fit integration...');
      
      // In a real implementation, you would use @react-native-google-fit/google-fit
      // Simulate initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.isInitialized = true;
      console.log('Google Fit initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Fit:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      console.log('Requesting Google Fit permissions...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    } catch (error) {
      console.error('Failed to request Google Fit permissions:', error);
      return false;
    }
  }

  async getStepsData(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
    if (!this.isInitialized) {
      throw new Error('Google Fit not initialized');
    }

    try {
      // Simulate fetching steps data from Google Fit
      const mockData: HealthDataPoint[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        mockData.push({
          type: 'steps',
          value: Math.floor(Math.random() * 6000) + 4000, // 4000-10000 steps
          unit: 'steps',
          date: currentDate.toISOString().split('T')[0],
          recordedAt: new Date(currentDate),
          source: 'google_fit',
          deviceInfo: { device: 'Android Phone', manufacturer: 'Google' }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mockData;
    } catch (error) {
      console.error('Failed to fetch steps data from Google Fit:', error);
      return [];
    }
  }

  async getHeartRateData(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
    if (!this.isInitialized) {
      throw new Error('Google Fit not initialized');
    }

    try {
      // Simulate fetching heart rate data
      const mockData: HealthDataPoint[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        // Add multiple heart rate readings per day
        for (let i = 0; i < 24; i += 6) { // Every 6 hours
          const readingTime = new Date(currentDate);
          readingTime.setHours(i);
          
          mockData.push({
            type: 'heart_rate',
            value: Math.floor(Math.random() * 35) + 65, // 65-100 bpm
            unit: 'bpm',
            date: currentDate.toISOString().split('T')[0],
            recordedAt: readingTime,
            source: 'google_fit',
            deviceInfo: { device: 'Wear OS Watch', manufacturer: 'Samsung' }
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mockData;
    } catch (error) {
      console.error('Failed to fetch heart rate data from Google Fit:', error);
      return [];
    }
  }

  async getSleepData(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
    if (!this.isInitialized) {
      throw new Error('Google Fit not initialized');
    }

    try {
      // Simulate fetching sleep data
      const mockData: HealthDataPoint[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        mockData.push({
          type: 'sleep',
          value: Math.random() * 2.5 + 6, // 6-8.5 hours
          unit: 'hours',
          date: currentDate.toISOString().split('T')[0],
          recordedAt: new Date(currentDate),
          source: 'google_fit',
          deviceInfo: { device: 'Android Phone', manufacturer: 'Google' }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mockData;
    } catch (error) {
      console.error('Failed to fetch sleep data from Google Fit:', error);
      return [];
    }
  }
}

// Main Health Integration Manager
export class HealthIntegrationManager {
  private static instance: HealthIntegrationManager;
  private appleHealth: AppleHealthIntegration;
  private googleFit: GoogleFitIntegration;

  constructor() {
    this.appleHealth = AppleHealthIntegration.getInstance();
    this.googleFit = GoogleFitIntegration.getInstance();
  }

  static getInstance(): HealthIntegrationManager {
    if (!HealthIntegrationManager.instance) {
      HealthIntegrationManager.instance = new HealthIntegrationManager();
    }
    return HealthIntegrationManager.instance;
  }

  async initializeHealthServices(): Promise<{ apple: boolean; google: boolean }> {
    const results = await Promise.allSettled([
      this.appleHealth.initialize(),
      this.googleFit.initialize()
    ]);

    return {
      apple: results[0].status === 'fulfilled' ? results[0].value : false,
      google: results[1].status === 'fulfilled' ? results[1].value : false
    };
  }

  async requestAllPermissions(): Promise<{ apple: boolean; google: boolean }> {
    const results = await Promise.allSettled([
      Platform.OS === 'ios' ? this.appleHealth.requestPermissions() : Promise.resolve(false),
      Platform.OS === 'android' ? this.googleFit.requestPermissions() : Promise.resolve(false)
    ]);

    return {
      apple: results[0].status === 'fulfilled' ? results[0].value : false,
      google: results[1].status === 'fulfilled' ? results[1].value : false
    };
  }

  async syncHealthData(startDate: Date, endDate: Date): Promise<void> {
    try {
      console.log('Starting health data sync...');
      
      const healthData: HealthDataPoint[] = [];

      // Fetch data from available platforms
      if (Platform.OS === 'ios') {
        try {
          const [steps, heartRate, sleep] = await Promise.all([
            this.appleHealth.getStepsData(startDate, endDate),
            this.appleHealth.getHeartRateData(startDate, endDate),
            this.appleHealth.getSleepData(startDate, endDate)
          ]);
          healthData.push(...steps, ...heartRate, ...sleep);
        } catch (error) {
          console.error('Error fetching Apple Health data:', error);
        }
      }

      if (Platform.OS === 'android') {
        try {
          const [steps, heartRate, sleep] = await Promise.all([
            this.googleFit.getStepsData(startDate, endDate),
            this.googleFit.getHeartRateData(startDate, endDate),
            this.googleFit.getSleepData(startDate, endDate)
          ]);
          healthData.push(...steps, ...heartRate, ...sleep);
        } catch (error) {
          console.error('Error fetching Google Fit data:', error);
        }
      }

      // Save to database
      if (healthData.length > 0) {
        await this.saveHealthDataToDatabase(healthData);
        console.log(`Synced ${healthData.length} health data points`);
      }

      // Update last sync time
      await this.updateLastSyncTime();
    } catch (error) {
      console.error('Error during health data sync:', error);
      throw error;
    }
  }

  private async saveHealthDataToDatabase(healthData: HealthDataPoint[]): Promise<void> {
    try {
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Prepare data for insertion
      const dbRecords = healthData.map(dataPoint => ({
        user_id: profile.id,
        date: dataPoint.date,
        data_type: dataPoint.type,
        value: dataPoint.value,
        unit: dataPoint.unit,
        source: dataPoint.source,
        device_info: dataPoint.deviceInfo || {},
        recorded_at: dataPoint.recordedAt.toISOString(),
      }));

      // Insert health data (upsert to handle duplicates)
      const { error } = await supabase
        .from('health_data')
        .upsert(dbRecords, {
          onConflict: 'user_id,date,data_type,source',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error saving health data to database:', error);
        throw error;
      }

      // Update daily_stats table with aggregated data
      await this.updateDailyStats(healthData, profile.id);
    } catch (error) {
      console.error('Error in saveHealthDataToDatabase:', error);
      throw error;
    }
  }

  private async updateDailyStats(healthData: HealthDataPoint[], userId: string): Promise<void> {
    try {
      // Group data by date and type
      const dailyAggregates: { [date: string]: { [type: string]: number } } = {};

      healthData.forEach(dataPoint => {
        if (!dailyAggregates[dataPoint.date]) {
          dailyAggregates[dataPoint.date] = {};
        }

        // For steps, sum all values for the day
        if (dataPoint.type === 'steps') {
          dailyAggregates[dataPoint.date].steps = (dailyAggregates[dataPoint.date].steps || 0) + dataPoint.value;
        }
        
        // For sleep, take the total hours
        if (dataPoint.type === 'sleep') {
          dailyAggregates[dataPoint.date].sleep_hours = dataPoint.value;
        }

        // For calories burned, sum all values
        if (dataPoint.type === 'calories_burned') {
          dailyAggregates[dataPoint.date].calories_burned = (dailyAggregates[dataPoint.date].calories_burned || 0) + dataPoint.value;
        }
      });

      // Update daily_stats for each date
      for (const [date, stats] of Object.entries(dailyAggregates)) {
        const updateData: any = {};
        
        if (stats.steps) updateData.steps = Math.round(stats.steps);
        if (stats.sleep_hours) updateData.sleep_hours = Number(stats.sleep_hours.toFixed(1));
        if (stats.calories_burned) updateData.calories_burned = Math.round(stats.calories_burned);

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('daily_stats')
            .upsert({
              user_id: userId,
              date,
              ...updateData,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,date'
            });

          if (error) {
            console.error(`Error updating daily stats for ${date}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error updating daily stats:', error);
    }
  }

  private async updateLastSyncTime(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      await supabase
        .from('health_sync_settings')
        .upsert({
          user_id: profile.id,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  async getHealthSyncSettings(): Promise<HealthSyncSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return null;

      const { data: settings } = await supabase
        .from('health_sync_settings')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (!settings) {
        // Return default settings
        return {
          appleHealthEnabled: false,
          googleFitEnabled: false,
          syncSteps: true,
          syncHeartRate: true,
          syncSleep: true,
          syncCalories: true,
          syncDistance: true,
          syncWeight: false,
          autoSyncEnabled: true
        };
      }

      return {
        appleHealthEnabled: settings.apple_health_enabled,
        googleFitEnabled: settings.google_fit_enabled,
        syncSteps: settings.sync_steps,
        syncHeartRate: settings.sync_heart_rate,
        syncSleep: settings.sync_sleep,
        syncCalories: settings.sync_calories,
        syncDistance: settings.sync_distance,
        syncWeight: settings.sync_weight,
        autoSyncEnabled: settings.auto_sync_enabled
      };
    } catch (error) {
      console.error('Error fetching health sync settings:', error);
      return null;
    }
  }

  async updateHealthSyncSettings(settings: Partial<HealthSyncSettings>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return false;

      const dbSettings = {
        user_id: profile.id,
        apple_health_enabled: settings.appleHealthEnabled,
        google_fit_enabled: settings.googleFitEnabled,
        sync_steps: settings.syncSteps,
        sync_heart_rate: settings.syncHeartRate,
        sync_sleep: settings.syncSleep,
        sync_calories: settings.syncCalories,
        sync_distance: settings.syncDistance,
        sync_weight: settings.syncWeight,
        auto_sync_enabled: settings.autoSyncEnabled,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('health_sync_settings')
        .upsert(dbSettings, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating health sync settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateHealthSyncSettings:', error);
      return false;
    }
  }

  async getHealthDataForDateRange(
    startDate: Date, 
    endDate: Date, 
    dataTypes?: string[]
  ): Promise<HealthDataPoint[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      let query = supabase
        .from('health_data')
        .select('*')
        .eq('user_id', profile.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('recorded_at', { ascending: false });

      if (dataTypes && dataTypes.length > 0) {
        query = query.in('data_type', dataTypes);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching health data:', error);
        return [];
      }

      return (data || []).map(record => ({
        type: record.data_type as any,
        value: record.value,
        unit: record.unit,
        date: record.date,
        recordedAt: new Date(record.recorded_at),
        source: record.source as any,
        deviceInfo: record.device_info
      }));
    } catch (error) {
      console.error('Error in getHealthDataForDateRange:', error);
      return [];
    }
  }

  async getTodaysHealthData(): Promise<{
    steps: number;
    heartRate: number;
    sleepHours: number;
    caloriesBurned: number;
  }> {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const healthData = await this.getHealthDataForDateRange(today, today);
      
      const todaysData = {
        steps: 0,
        heartRate: 0,
        sleepHours: 0,
        caloriesBurned: 0
      };

      healthData.forEach(dataPoint => {
        switch (dataPoint.type) {
          case 'steps':
            todaysData.steps += dataPoint.value;
            break;
          case 'heart_rate':
            // Take the latest heart rate reading
            if (dataPoint.value > todaysData.heartRate) {
              todaysData.heartRate = dataPoint.value;
            }
            break;
          case 'sleep':
            todaysData.sleepHours = dataPoint.value;
            break;
          case 'calories_burned':
            todaysData.caloriesBurned += dataPoint.value;
            break;
        }
      });

      return todaysData;
    } catch (error) {
      console.error('Error getting today\'s health data:', error);
      return {
        steps: 0,
        heartRate: 0,
        sleepHours: 0,
        caloriesBurned: 0
      };
    }
  }

  async enableAutoSync(): Promise<boolean> {
    try {
      // Store auto-sync preference
      await AsyncStorage.setItem('health_auto_sync_enabled', 'true');
      
      // Set up background sync (in a real app, you'd use background tasks)
      console.log('Auto-sync enabled for health data');
      
      return true;
    } catch (error) {
      console.error('Error enabling auto-sync:', error);
      return false;
    }
  }

  async disableAutoSync(): Promise<boolean> {
    try {
      await AsyncStorage.setItem('health_auto_sync_enabled', 'false');
      console.log('Auto-sync disabled for health data');
      return true;
    } catch (error) {
      console.error('Error disabling auto-sync:', error);
      return false;
    }
  }
}

// Export singleton instance
export const healthManager = HealthIntegrationManager.getInstance();

// Utility functions
export const formatHealthValue = (value: number, unit: string): string => {
  switch (unit) {
    case 'steps':
      return `${Math.round(value).toLocaleString()} steps`;
    case 'bpm':
      return `${Math.round(value)} bpm`;
    case 'hours':
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      return `${hours}h ${minutes}m`;
    case 'calories':
      return `${Math.round(value)} cal`;
    case 'km':
      return `${value.toFixed(1)} km`;
    case 'minutes':
      return `${Math.round(value)} min`;
    case 'kg':
      return `${value.toFixed(1)} kg`;
    case '%':
      return `${value.toFixed(1)}%`;
    default:
      return `${value} ${unit}`;
  }
};

export const getHealthDataIcon = (type: string): string => {
  switch (type) {
    case 'steps':
      return '👣';
    case 'heart_rate':
    case 'resting_heart_rate':
      return '❤️';
    case 'sleep':
      return '😴';
    case 'calories_burned':
      return '🔥';
    case 'distance':
      return '📏';
    case 'active_minutes':
      return '⏱️';
    case 'weight':
      return '⚖️';
    case 'body_fat':
      return '📊';
    default:
      return '📱';
  }
};