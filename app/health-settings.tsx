import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Smartphone,
  Watch,
  Heart,
  Footprints,
  Moon,
  Zap,
  RefreshCw,
  Settings,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Sync,
} from 'lucide-react-native';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useHealthData } from '@/hooks/useHealthData';
import { formatHealthValue, getHealthDataIcon } from '@/lib/healthIntegration';

export default function HealthSettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);

  const {
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
  } = useHealthData();

  const [localSettings, setLocalSettings] = useState(syncSettings);

  React.useEffect(() => {
    setLocalSettings(syncSettings);
  }, [syncSettings]);

  const handleToggleSetting = async (key: keyof typeof localSettings, value: boolean) => {
    if (!localSettings) return;

    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);

    try {
      await updateSyncSettings({ [key]: value });
      
      if (key === 'appleHealthEnabled' || key === 'googleFitEnabled') {
        if (value) {
          Alert.alert(
            'Health Integration Enabled',
            `${key === 'appleHealthEnabled' ? 'Apple Health' : 'Google Fit'} integration has been enabled. Your health data will now sync automatically.`,
            [
              { text: 'Sync Now', onPress: syncHealthData },
              { text: 'OK' }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert local state on error
      setLocalSettings(syncSettings);
    }
  };

  const handleManualSync = async () => {
    try {
      await syncHealthData();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleResetIntegration = async () => {
    Alert.alert(
      'Reset Health Integration',
      'This will disconnect all health services and clear sync settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateSyncSettings({
                appleHealthEnabled: false,
                googleFitEnabled: false,
                autoSyncEnabled: false
              });
              Alert.alert('Success', 'Health integration has been reset');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset health integration');
            }
          }
        }
      ]
    );
  };

  const renderHealthDataCard = () => (
    <View style={styles.healthDataCard}>
      <Text style={styles.cardTitle}>Today's Health Data</Text>
      
      <View style={styles.healthDataGrid}>
        <View style={styles.healthDataItem}>
          <View style={styles.healthDataIcon}>
            <Footprints size={20} color={colors.primary} />
          </View>
          <Text style={styles.healthDataValue}>
            {todaysData.steps.toLocaleString()}
          </Text>
          <Text style={styles.healthDataLabel}>Steps</Text>
        </View>

        <View style={styles.healthDataItem}>
          <View style={styles.healthDataIcon}>
            <Heart size={20} color={colors.error} />
          </View>
          <Text style={styles.healthDataValue}>
            {Math.round(todaysData.heartRate)}
          </Text>
          <Text style={styles.healthDataLabel}>BPM</Text>
        </View>

        <View style={styles.healthDataItem}>
          <View style={styles.healthDataIcon}>
            <Moon size={20} color={colors.info} />
          </View>
          <Text style={styles.healthDataValue}>
            {todaysData.sleepHours.toFixed(1)}h
          </Text>
          <Text style={styles.healthDataLabel}>Sleep</Text>
        </View>

        <View style={styles.healthDataItem}>
          <View style={styles.healthDataIcon}>
            <Zap size={20} color={colors.warning} />
          </View>
          <Text style={styles.healthDataValue}>
            {Math.round(todaysData.caloriesBurned)}
          </Text>
          <Text style={styles.healthDataLabel}>Calories</Text>
        </View>
      </View>

      <View style={styles.syncInfo}>
        <View style={styles.syncStatus}>
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.syncStatusText}>Syncing...</Text>
            </>
          ) : lastSyncTime ? (
            <>
              <CheckCircle size={16} color={colors.success} />
              <Text style={styles.syncStatusText}>
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </Text>
            </>
          ) : (
            <>
              <AlertCircle size={16} color={colors.warning} />
              <Text style={styles.syncStatusText}>Not synced yet</Text>
            </>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          <RefreshCw size={16} color={colors.primary} />
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlatformIntegration = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Health Platform Integration</Text>
      
      {Platform.OS === 'ios' && (
        <View style={styles.integrationCard}>
          <View style={styles.integrationHeader}>
            <View style={styles.integrationInfo}>
              <View style={styles.integrationIcon}>
                <Watch size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.integrationName}>Apple Health</Text>
                <Text style={styles.integrationDescription}>
                  Sync data from Apple Watch and iPhone Health app
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings?.appleHealthEnabled || false}
              onValueChange={(value) => handleToggleSetting('appleHealthEnabled', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          
          {localSettings?.appleHealthEnabled && (
            <View style={styles.integrationDetails}>
              <Text style={styles.integrationDetailText}>
                ✓ Connected to Apple Health
              </Text>
              <Text style={styles.integrationDetailText}>
                ✓ Automatic background sync enabled
              </Text>
            </View>
          )}
        </View>
      )}

      {Platform.OS === 'android' && (
        <View style={styles.integrationCard}>
          <View style={styles.integrationHeader}>
            <View style={styles.integrationInfo}>
              <View style={styles.integrationIcon}>
                <Smartphone size={24} color={colors.success} />
              </View>
              <View>
                <Text style={styles.integrationName}>Google Fit</Text>
                <Text style={styles.integrationDescription}>
                  Sync data from Google Fit and Wear OS devices
                </Text>
              </View>
            </View>
            <Switch
              value={localSettings?.googleFitEnabled || false}
              onValueChange={(value) => handleToggleSetting('googleFitEnabled', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          
          {localSettings?.googleFitEnabled && (
            <View style={styles.integrationDetails}>
              <Text style={styles.integrationDetailText}>
                ✓ Connected to Google Fit
              </Text>
              <Text style={styles.integrationDetailText}>
                ✓ Automatic background sync enabled
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderDataTypeSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Data Types to Sync</Text>
      
      {[
        { key: 'syncSteps', label: 'Steps', icon: Footprints, description: 'Daily step count and walking distance' },
        { key: 'syncHeartRate', label: 'Heart Rate', icon: Heart, description: 'Heart rate during workouts and rest' },
        { key: 'syncSleep', label: 'Sleep', icon: Moon, description: 'Sleep duration and quality metrics' },
        { key: 'syncCalories', label: 'Calories', icon: Zap, description: 'Calories burned during activities' },
        { key: 'syncDistance', label: 'Distance', icon: Settings, description: 'Walking and running distance' },
        { key: 'syncWeight', label: 'Weight', icon: Settings, description: 'Body weight measurements' },
      ].map((item) => (
        <View key={item.key} style={styles.dataTypeCard}>
          <View style={styles.dataTypeInfo}>
            <View style={styles.dataTypeIcon}>
              <item.icon size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.dataTypeDetails}>
              <Text style={styles.dataTypeName}>{item.label}</Text>
              <Text style={styles.dataTypeDescription}>{item.description}</Text>
            </View>
          </View>
          <Switch
            value={localSettings?.[item.key as keyof HealthSyncSettings] as boolean || false}
            onValueChange={(value) => handleToggleSetting(item.key as keyof HealthSyncSettings, value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      ))}
    </View>
  );

  const renderSyncSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sync Settings</Text>
      
      <View style={styles.settingCard}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingName}>Automatic Sync</Text>
          <Text style={styles.settingDescription}>
            Automatically sync health data in the background
          </Text>
        </View>
        <Switch
          value={localSettings?.autoSyncEnabled || false}
          onValueChange={(value) => handleToggleSetting('autoSyncEnabled', value)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
        />
      </View>

      <TouchableOpacity style={styles.dangerButton} onPress={handleResetIntegration}>
        <AlertCircle size={20} color={colors.error} />
        <Text style={styles.dangerButtonText}>Reset Health Integration</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Initializing health services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Health Integration</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorCard}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={initializeHealth}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Health Data */}
        {renderHealthDataCard()}

        {/* Platform Integration */}
        {renderPlatformIntegration()}

        {/* Data Type Settings */}
        {renderDataTypeSettings()}

        {/* Sync Settings */}
        {renderSyncSettings()}

        {/* Privacy Notice */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyHeader}>
            <Shield size={20} color={colors.info} />
            <Text style={styles.privacyTitle}>Privacy & Security</Text>
          </View>
          <Text style={styles.privacyText}>
            Your health data is encrypted and stored securely. We only access the data types you've explicitly permitted. 
            You can disable sync or delete your data at any time.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  errorCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.error,
    marginLeft: 12,
  },
  retryButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 12,
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  healthDataCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
  },
  healthDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  healthDataItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
  },
  healthDataIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthDataValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  healthDataLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
  },
  integrationCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  integrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  integrationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  integrationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  integrationName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  integrationDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  integrationDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  integrationDetailText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.success,
    marginBottom: 4,
  },
  dataTypeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  dataTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dataTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dataTypeDetails: {
    flex: 1,
  },
  dataTypeName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  dataTypeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 8,
  },
  dangerButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.error,
  },
  privacyCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  privacyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  privacyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});