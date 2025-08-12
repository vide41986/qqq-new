import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  Users,
  ChefHat,
  Edit3,
  Trash2,
  Eye,
  Star,
  MoreVertical,
  Filter,
  Search,
} from 'lucide-react-native';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { MealPlan } from '@/types/workout';
import { getNutritionistMealPlans, deleteMealPlan } from '@/lib/mealPlanQueries';

const { width } = Dimensions.get('window');

export default function MealPlansScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'draft' | 'completed'>('all');

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const plans = await getNutritionistMealPlans();
      setMealPlans(plans);
    } catch (err) {
      console.error('Error loading meal plans:', err);
      setError('Failed to load meal plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMealPlans();
    setRefreshing(false);
  };

  const handleCreateNew = () => {
    router.push('/create-meal-plan');
  };

  const handleViewPlan = (planId: string) => {
    router.push(`/meal-plans/${planId}`);
  };

  const handleEditPlan = (planId: string) => {
    router.push(`/create-meal-plan?edit=${planId}`);
  };

  const handleDeletePlan = (plan: MealPlan) => {
    Alert.alert(
      'Delete Meal Plan',
      `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMealPlan(plan.id);
            if (success) {
              setMealPlans(prev => prev.filter(p => p.id !== plan.id));
              Alert.alert('Success', 'Meal plan deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete meal plan');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'draft':
        return colors.warning;
      case 'completed':
        return colors.primary;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'draft':
        return '📝';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '⚪';
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startFormatted = start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endFormatted = end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredMealPlans = mealPlans.filter(plan => {
    if (selectedFilter === 'all') return true;
    return plan.status === selectedFilter;
  });

  const renderMealPlanCard = (plan: MealPlan) => {
    const duration = calculateDuration(plan.start_date, plan.end_date);
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={styles.mealPlanCard}
        onPress={() => handleViewPlan(plan.id)}
        activeOpacity={0.7}
      >
        {/* Plan Image */}
        <View style={styles.planImageContainer}>
          {plan.title_image_url ? (
            <Image 
              source={{ uri: plan.title_image_url }} 
              style={styles.planImage}
              defaultSource={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400' }}
            />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.planImagePlaceholder}
            >
              <ChefHat size={32} color="#FFFFFF" />
            </LinearGradient>
          )}
          
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plan.status) }]}>
            <Text style={styles.statusText}>{getStatusIcon(plan.status)}</Text>
          </View>
        </View>

        {/* Plan Info */}
        <View style={styles.planInfo}>
          <View style={styles.planHeader}>
            <Text style={styles.planName} numberOfLines={2}>
              {plan.name}
            </Text>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={(e) => {
                e.stopPropagation();
                Alert.alert(
                  'Meal Plan Actions',
                  `What would you like to do with "${plan.name}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'View Details', onPress: () => handleViewPlan(plan.id) },
                    { text: 'Edit', onPress: () => handleEditPlan(plan.id) },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeletePlan(plan) }
                  ]
                );
              }}
            >
              <MoreVertical size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.clientInfo}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={styles.clientName}>{plan.client_name}</Text>
          </View>

          {plan.description && (
            <Text style={styles.planDescription} numberOfLines={2}>
              {plan.description}
            </Text>
          )}

          <View style={styles.planMeta}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatDateRange(plan.start_date, plan.end_date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{duration} days</Text>
            </View>
          </View>

          <View style={styles.planActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleViewPlan(plan.id);
              }}
            >
              <Eye size={16} color={colors.primary} />
              <Text style={styles.actionButtonText}>View</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditPlan(plan.id);
              }}
            >
              <Edit3 size={16} color={colors.success} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {[
          { key: 'all', label: 'All Plans', count: mealPlans.length },
          { key: 'active', label: 'Active', count: mealPlans.filter(p => p.status === 'active').length },
          { key: 'draft', label: 'Drafts', count: mealPlans.filter(p => p.status === 'draft').length },
          { key: 'completed', label: 'Completed', count: mealPlans.filter(p => p.status === 'completed').length },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              selectedFilter === filter.key && styles.activeFilterTab
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter.key && styles.activeFilterTabText
            ]}>
              {filter.label}
            </Text>
            {filter.count > 0 && (
              <View style={[
                styles.filterBadge,
                selectedFilter === filter.key && styles.activeFilterBadge
              ]}>
                <Text style={[
                  styles.filterBadgeText,
                  selectedFilter === filter.key && styles.activeFilterBadgeText
                ]}>
                  {filter.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[colors.primary + '20', colors.primary + '10']}
        style={styles.emptyIconContainer}
      >
        <ChefHat size={48} color={colors.primary} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Meal Plans Yet</Text>
      <Text style={styles.emptyText}>
        Create your first meal plan to help your clients achieve their nutrition goals
      </Text>
      <TouchableOpacity style={styles.createFirstButton} onPress={handleCreateNew}>
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.createFirstButtonText}>Create First Meal Plan</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsOverview = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: `${colors.primary}15` }]}>
          <ChefHat size={20} color={colors.primary} />
        </View>
        <Text style={styles.statNumber}>{mealPlans.length}</Text>
        <Text style={styles.statLabel}>Total Plans</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: `${colors.success}15` }]}>
          <Star size={20} color={colors.success} />
        </View>
        <Text style={styles.statNumber}>{mealPlans.filter(p => p.status === 'active').length}</Text>
        <Text style={styles.statLabel}>Active Plans</Text>
      </View>
      
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: `${colors.warning}15` }]}>
          <Users size={20} color={colors.warning} />
        </View>
        <Text style={styles.statNumber}>{new Set(mealPlans.map(p => p.client_id)).size}</Text>
        <Text style={styles.statLabel}>Clients</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading meal plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load meal plans</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMealPlans}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
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
        
        <Text style={styles.title}>Meal Plans</Text>
        
        <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      {mealPlans.length > 0 && renderStatsOverview()}

      {/* Filter Tabs */}
      {mealPlans.length > 0 && renderFilterTabs()}

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredMealPlans.length === 0 ? (
          mealPlans.length === 0 ? renderEmptyState() : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsTitle}>No {selectedFilter} meal plans</Text>
              <Text style={styles.noResultsText}>
                Try selecting a different filter or create a new meal plan
              </Text>
            </View>
          )
        ) : (
          <View style={styles.mealPlansList}>
            {filteredMealPlans.map(renderMealPlanCard)}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      {mealPlans.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateNew}>
          <Plus size={28} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  createButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    gap: 6,
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: colors.textSecondary,
  },
  activeFilterBadgeText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  mealPlansList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  mealPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  planImageContainer: {
    height: 120,
    position: 'relative',
  },
  planImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  planImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
  },
  planInfo: {
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planName: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  clientName: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  planDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  planMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  planActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  createFirstButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
});