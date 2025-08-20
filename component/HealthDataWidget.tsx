import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  Heart,
  Footprints,
  Moon,
  Zap,
  TrendingUp,
  Settings,
  RefreshCw,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { useHealthData } from '@/hooks/useHealthData';

const { width } = Dimensions.get('window');

interface HealthDataWidgetProps {
  compact?: boolean;
  showSettings?: boolean;
}

export default function HealthDataWidget({ 
  compact = false, 
  showSettings = true 
}: HealthDataWidgetProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);

  const {
    todaysData,
    syncSettings,
    isSyncing,
    lastSyncTime,
    error,
    syncHealthData,
    refreshData
  } = useHealthData();

  const [showAllMetrics, setShowAllMetrics] = useState(false);

  const healthMetrics = [
    {
      key: 'steps',
      label: 'Steps',
      value: todaysData.steps,
      unit: 'steps',
      icon: Footprints,
      color: colors.primary,
      goal: 10000,
      enabled: syncSettings?.syncSteps
    },
    {
      key: 'heartRate',
      label: 'Heart Rate',
      value: todaysData.heartRate,
      unit: 'bpm',
      icon: Heart,
      color: colors.error,
      goal: null,
      enabled: syncSettings?.syncHeartRate
    },
    {
      key: 'sleep',
      label: 'Sleep',
      value: todaysData.sleepHours,
      unit: 'hours',
      icon: Moon,
      color: colors.info,
      goal: 8,
      enabled: syncSettings?.syncSleep
    },
    {
      key: 'calories',
      label: 'Calories',
      value: todaysData.caloriesBurned,
      unit: 'cal',
      icon: Zap,
      color: colors.warning,
      goal: 500,
      enabled: syncSettings?.syncCalories
    }
  ];

  const enabledMetrics = healthMetrics.filter(metric => metric.enabled);
  const displayMetrics = compact ? enabledMetrics.slice(0, 2) : enabledMetrics;

  const formatValue = (value: number, unit: string): string => {
    switch (unit) {
      case 'steps':
        return value.toLocaleString();
      case 'bpm':
        return Math.round(value).toString();
      case 'hours':
        const hours = Math.floor(value);
        const minutes = Math.round((value - hours) * 60);
        return `${hours}h ${minutes}m`;
      case 'cal':
        return Math.round(value).toString();
      default:
        return value.toString();
    }
  };

  const getProgressPercentage = (value: number, goal: number | null): number => {
    if (!goal) return 0;
    return Math.min((value / goal) * 100, 100);
  };

  const renderMetricCard = (metric: any, index: number) => (
    <View key={metric.key} style={[
      styles.metricCard,
      compact && styles.compactMetricCard
    ]}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${metric.color}15` }]}>
          <metric.icon size={compact ? 16 : 20} color={metric.color} />
        </View>
        {!compact && (
          <Text style={styles.metricLabel}>{metric.label}</Text>
        )}
      </View>
      
      <View style={styles.metricContent}>
        <Text style={[styles.metricValue, compact && styles.compactMetricValue]}>
          {formatValue(metric.value, metric.unit)}
        </Text>
        {!compact && (
          <Text style={styles.metricUnit}>{metric.unit}</Text>
        )}
      </View>

      {metric.goal && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${getProgressPercentage(metric.value, metric.goal)}%`,
                  backgroundColor: metric.color
                }
              ]} 
            />
          </View>
          {!compact && (
            <Text style={styles.progressText}>
              {Math.round(getProgressPercentage(metric.value, metric.goal))}%
            </Text>
          )}
        </View>
      )}

      {compact && (
        <Text style={styles.compactMetricLabel}>{metric.label}</Text>
      )}
    </View>
  );

  const renderSyncStatus = () => (
    <View style={styles.syncStatusContainer}>
      <View style={styles.syncStatusInfo}>
        {isSyncing ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.syncStatusText}>Syncing...</Text>
          </>
        ) : lastSyncTime ? (
          <>
            <View style={[styles.syncStatusDot, { backgroundColor: colors.success }]} />
            <Text style={styles.syncStatusText}>
              Synced {lastSyncTime.toLocaleTimeString()}
            </Text>
          </>
        ) : (
          <>
            <View style={[styles.syncStatusDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.syncStatusText}>Not synced</Text>
          </>
        )}
      </View>
      
      <TouchableOpacity 
        style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
        onPress={syncHealthData}
        disabled={isSyncing}
      >
        <RefreshCw size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Health Data Unavailable</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/health-settings')}>
          <Settings size={16} color={colors.primary} />
          <Text style={styles.settingsButtonText}>Health Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {!compact && (
        <View style={styles.header}>
          <Text style={styles.title}>Health Data</Text>
          {showSettings && (
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push('/health-settings')}
            >
              <Settings size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[styles.metricsGrid, compact && styles.compactMetricsGrid]}>
        {displayMetrics.map(renderMetricCard)}
      </View>

      {!compact && enabledMetrics.length > 2 && !showAllMetrics && (
        <TouchableOpacity 
          style={styles.showMoreButton}
          onPress={() => setShowAllMetrics(true)}
        >
          <Text style={styles.showMoreText}>
            Show {enabledMetrics.length - 2} more metrics
          </Text>
          <TrendingUp size={16} color={colors.primary} />
        </TouchableOpacity>
      )}

      {!compact && renderSyncStatus()}

      {compact && showSettings && (
        <TouchableOpacity 
          style={styles.compactSettingsButton}
          onPress={() => router.push('/health-settings')}
        >
          <Text style={styles.compactSettingsText}>Health Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactContainer: {
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  settingsButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  compactMetricsGrid: {
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
  },
  compactMetricCard: {
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  metricLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  metricContent: {
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 2,
  },
  compactMetricValue: {
    fontSize: 16,
  },
  metricUnit: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: colors.textTertiary,
  },
  compactMetricLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBackground: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: colors.textSecondary,
    minWidth: 30,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 6,
  },
  showMoreText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.primary,
  },
  syncStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  syncStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncStatusText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  syncButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  compactSettingsButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  compactSettingsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.primary,
  },
  errorContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
});