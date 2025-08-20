import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { healthManager, HealthDataPoint, HealthSyncSettings } from '@/lib/healthIntegration';

export interface UseHealthDataReturn {
  healthData: HealthDataPoint[];
  todaysData: {
    steps: number;
    heartRate: number;
    sleepHours: number;
    caloriesBurned: number;
  };
  syncSettings: HealthSyncSettings | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  error: string | null;
  initializeHealth: () => Promise<void>;
  syncHealthData: () => Promise<void>;
  updateSyncSettings: (settings: Partial<HealthSyncSettings>) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useHealthData(): UseHealthDataReturn {
  const [healthData, setHealthData] = useState<HealthDataPoint[]>([]);
  const [todaysData, setTodaysData] = useState({
    steps: 0,
    heartRate: 0,
    sleepHours: 0,
    caloriesBurned: 0
  });
  const [syncSettings, setSyncSettings] = useState<HealthSyncSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initializeHealth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Initializing health services...');
      const initResults = await healthManager.initializeHealthServices();
      
      if (!initResults.apple && !initResults.google) {
        throw new Error('No health services available on this device');
      }

      console.log('Health services initialized:', initResults);

      // Request permissions
      const permissionResults = await healthManager.requestAllPermissions();
      console.log('Permission results:', permissionResults);

      if (!permissionResults.apple && !permissionResults.google) {
        Alert.alert(
          'Permissions Required',
          'Health data permissions are required to sync your fitness data. Please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // In a real app, you'd open device settings
              console.log('Opening device settings...');
            }}
          ]
        );
      }

      // Load existing settings
      const settings = await healthManager.getHealthSyncSettings();
      setSyncSettings(settings);

      // Load existing health data
      await refreshData();

    } catch (error) {
      console.error('Error initializing health services:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize health services');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncHealthData = useCallback(async () => {
    try {
      setIsSyncing(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      console.log('Syncing health data for date range:', startDate, 'to', endDate);
      
      await healthManager.syncHealthData(startDate, endDate);
      
      // Refresh data after sync
      await refreshData();
      
      setLastSyncTime(new Date());
      
      Alert.alert(
        'Sync Complete',
        'Your health data has been successfully synced!',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error syncing health data:', error);
      setError(error instanceof Error ? error.message : 'Failed to sync health data');
      
      Alert.alert(
        'Sync Failed',
        'There was an error syncing your health data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateSyncSettings = useCallback(async (newSettings: Partial<HealthSyncSettings>) => {
    try {
      setError(null);
      
      const success = await healthManager.updateHealthSyncSettings(newSettings);
      
      if (success) {
        setSyncSettings(prev => prev ? { ...prev, ...newSettings } : null);
        
        // If auto-sync was enabled, trigger a sync
        if (newSettings.autoSyncEnabled) {
          await healthManager.enableAutoSync();
        } else if (newSettings.autoSyncEnabled === false) {
          await healthManager.disableAutoSync();
        }
      } else {
        throw new Error('Failed to update sync settings');
      }
    } catch (error) {
      console.error('Error updating sync settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to update settings');
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setError(null);

      // Get today's aggregated data
      const todaysHealthData = await healthManager.getTodaysHealthData();
      setTodaysData(todaysHealthData);

      // Get recent health data for charts/history
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const recentData = await healthManager.getHealthDataForDateRange(startDate, endDate);
      setHealthData(recentData);

    } catch (error) {
      console.error('Error refreshing health data:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh data');
    }
  }, []);

  useEffect(() => {
    initializeHealth();
  }, [initializeHealth]);

  return {
    healthData,
    todaysData,
    syncSettings,
    isLoading,
    isSyncing,
    lastSyncTime,
    error,
    initializeHealth,
    syncHealthData,
    updateSyncSettings,
    refreshData
  };
}