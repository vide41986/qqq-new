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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  ChefHat,
  Target,
  Zap,
  Apple,
  ChevronRight,
  Star,
  BookOpen,
} from 'lucide-react-native';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getClientMealPlans } from '@/lib/mealPlanQueries';
import { MealPlan } from '@/types/workout';

export default function ClientMealPlansScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);

  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      setLoading(true);
      const plans = await getClientMealPlans();
      setMealPlans(plans);
    } catch (error) {
      console.error('Error loading meal plans:', error);
      Alert.alert('Error', 'Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMealPlans();
    setRefreshing(false);
  };

  const filteredPlans = mealPlans.filter(plan => {
    if (selectedFilter === 'all') return true;
    return plan.status === selectedFilter;
  });

  const activePlans = mealPlans.filter(plan => plan.status === 'active');
  const completedPlans = mealPlans.filter(plan => plan.status === 'completed');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'completed':
        return colors.primary;
      case 'draft':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderMealPlanCard = (plan: MealPlan) => {
    const daysRemaining = getDaysRemaining(plan.end_date);
    const isActive = plan.status === 'active';
    const isCompleted = plan.status === 'completed';

    return (
      <TouchableOpacity
        key={plan.id}
        style={styles.mealPlanCard}
        onPress={() => router.push(`/meal-plan-detail/${plan.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageContainer}>
          {plan.title_image_url ? (
            <Image source={{ uri: plan.title_image_url }} style={styles.cardImage} />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.cardImagePlaceholder}
            >
              <ChefHat size={32} color="#FFFFFF" />
            </LinearGradient>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plan.status) }]}>
            <Text style={styles.statusText}>{plan.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.planName} numberOfLines={2}>
              {plan.name}
            </Text>
            <View style={styles.nutritionistInfo}>
              <User size={12} color={colors.textSecondary} />
              <Text style={styles.nutritionistName} numberOfLines={1}>
                {plan.nutritionist_name}
              </Text>
            </View>
          </View>

          {plan.description && (
            <Text style={styles.planDescription} numberOfLines={2}>
              {plan.description}
            </Text>
          )}

          <View style={styles.cardMeta}>
            <View style={styles.dateRange}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.dateText}>
                {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
              </Text>
            </View>

            {isActive && daysRemaining > 0 && (
              <View style={styles.daysRemaining}>
                <Clock size={14} color={colors.warning} />
                <Text style={styles.daysRemainingText}>
                  {daysRemaining} days left
                </Text>
              </View>
            )}

            {isCompleted && (
              <View style={styles.completedBadge}>
                <Star size={14} color={colors.success} />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.viewDetailsButton}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: 'All Plans', count: mealPlans.length },
        { key: 'active', label: 'Active', count: activePlans.length },
        { key: 'completed', label: 'Completed', count: completedPlans.length },
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.filterTab,
            selectedFilter === filter.key && styles.activeFilterTab,
          ]}
          onPress={() => setSelectedFilter(filter.key as any)}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === filter.key && styles.activeFilterTabText,
            ]}
          >
            {filter.label}
          </Text>
          <View
            style={[
              styles.filterCount,
              selectedFilter === filter.key && styles.activeFilterCount,
            ]}
          >
            <Text
              style={[
                styles.filterCountText,
                selectedFilter === filter.key && styles.activeFilterCountText,
              ]}
            >
              {filter.count}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatsOverview = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <BookOpen size={20} color={colors.primary} />
        </View>
        <Text style={styles.statNumber}>{mealPlans.length}</Text>
        <Text style={styles.statLabel}>Total Plans</Text>
      </View>

      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Target size={20} color={colors.success} />
        </View>
        <Text style={styles.statNumber}>{activePlans.length}</Text>
        <Text style={styles.statLabel}>Active Plans</Text>
      </View>

      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Star size={20} color={colors.warning} />
        </View>
        <Text style={styles.statNumber}>{completedPlans.length}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your meal plans...</Text>
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
        <Text style={styles.title}>My Meal Plans</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Overview */}
        {mealPlans.length > 0 && renderStatsOverview()}

        {/* Filter Tabs */}
        {mealPlans.length > 0 && renderFilterTabs()}

        {/* Meal Plans List */}
        {filteredPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <ChefHat size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {mealPlans.length === 0 ? 'No Meal Plans Yet' : 'No Plans Found'}
            </Text>
            <Text style={styles.emptyText}>
              {mealPlans.length === 0
                ? 'Your nutritionist will create personalized meal plans for you. Check back soon!'
                : `No ${selectedFilter} meal plans found. Try a different filter.`}
            </Text>
            {mealPlans.length === 0 && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => Alert.alert('Contact', 'Feature coming soon!')}
              >
                <Text style={styles.contactButtonText}>Contact Nutritionist</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.plansList}>
            {filteredPlans.map(renderMealPlanCard)}
          </View>
        )}

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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
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
    backgroundColor: colors.surfaceSecondary,
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  filterCount: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeFilterCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterCountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: colors.textSecondary,
  },
  activeFilterCountText: {
    color: '#FFFFFF',
  },
  plansList: {
    paddingHorizontal: 20,
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
    elevation: 4,
  },
  cardImageContainer: {
    height: 120,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 8,
  },
  planName: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 6,
    lineHeight: 24,
  },
  nutritionistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nutritionistName: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  planDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardMeta: {
    gap: 8,
    marginBottom: 16,
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  daysRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysRemainingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.warning,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.success,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  viewDetailsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  contactButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  contactButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});