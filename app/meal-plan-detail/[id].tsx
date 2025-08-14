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
  Utensils,
  Sparkles,
  Share2,
  Download,
  MessageSquare,
} from 'lucide-react-native';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getDetailedMealPlan } from '@/lib/mealPlanQueries';

export default function MealPlanDetailScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams();

  const [mealPlan, setMealPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadMealPlan();
    }
  }, [id]);

  const loadMealPlan = async () => {
    try {
      setLoading(true);
      const plan = await getDetailedMealPlan(id as string);
      setMealPlan(plan);
      
      // Auto-select today's date if it's within the plan range
      const today = new Date().toISOString().split('T')[0];
      const startDate = new Date(plan?.start_date);
      const endDate = new Date(plan?.end_date);
      const todayDate = new Date(today);
      
      if (todayDate >= startDate && todayDate <= endDate) {
        setSelectedDay(today);
      } else if (plan?.meal_plan_days?.length > 0) {
        setSelectedDay(plan.meal_plan_days[0].date);
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
      Alert.alert('Error', 'Failed to load meal plan details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMealPlan();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMealTypeIcon = (mealTypeName: string) => {
    const icons: { [key: string]: string } = {
      'Breakfast': '🌅',
      'Lunch': '☀️',
      'Dinner': '🌙',
      'Snack': '🍎',
      'Drink': '🥤',
      'Dessert': '🍰',
    };
    return icons[mealTypeName] || '🍽️';
  };

  const getTotalNutrition = (entries: any[]) => {
    return entries.reduce(
      (total, entry) => ({
        calories: total.calories + (entry.calories || 0),
        protein: total.protein + (entry.protein_g || 0),
        carbs: total.carbs + (entry.carbs_g || 0),
        fat: total.fat + (entry.fat_g || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const renderDaySelector = () => {
    if (!mealPlan?.meal_plan_days) return null;

    return (
      <View style={styles.daySelector}>
        <Text style={styles.daySelectorTitle}>Select Day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScrollView}>
          {mealPlan.meal_plan_days.map((day: any) => {
            const isSelected = selectedDay === day.date;
            const isToday = day.date === new Date().toISOString().split('T')[0];
            
            return (
              <TouchableOpacity
                key={day.date}
                style={[
                  styles.dayButton,
                  isSelected && styles.selectedDayButton,
                  isToday && styles.todayDayButton,
                ]}
                onPress={() => setSelectedDay(day.date)}
              >
                <Text style={[
                  styles.dayButtonText,
                  isSelected && styles.selectedDayButtonText,
                  isToday && styles.todayDayButtonText,
                ]}>
                  {new Date(day.date).getDate()}
                </Text>
                <Text style={[
                  styles.dayButtonLabel,
                  isSelected && styles.selectedDayButtonLabel,
                  isToday && styles.todayDayButtonLabel,
                ]}>
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                {isToday && <View style={styles.todayIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderMealEntry = (entry: any) => (
    <View key={entry.id} style={styles.mealEntry}>
      <View style={styles.mealEntryHeader}>
        <View style={styles.mealTypeContainer}>
          <Text style={styles.mealTypeEmoji}>
            {getMealTypeIcon(entry.meal_type?.name)}
          </Text>
          <View>
            <Text style={styles.mealTypeName}>{entry.meal_type?.name}</Text>
            {entry.time && (
              <Text style={styles.mealTime}>{entry.time}</Text>
            )}
          </View>
        </View>
        {entry.is_ai_generated && (
          <View style={styles.aiGeneratedBadge}>
            <Sparkles size={12} color="#FFFFFF" />
            <Text style={styles.aiGeneratedText}>AI</Text>
          </View>
        )}
      </View>

      {entry.image_url && (
        <Image source={{ uri: entry.image_url }} style={styles.mealImage} />
      )}

      <View style={styles.mealContent}>
        <Text style={styles.mealTitle}>{entry.title}</Text>
        {entry.description && (
          <Text style={styles.mealDescription}>{entry.description}</Text>
        )}
        
        {entry.quantity && (
          <Text style={styles.mealQuantity}>Serving: {entry.quantity}</Text>
        )}

        <View style={styles.nutritionInfo}>
          <View style={styles.nutritionItem}>
            <Zap size={14} color={colors.warning} />
            <Text style={styles.nutritionValue}>{entry.calories || 0}</Text>
            <Text style={styles.nutritionLabel}>cal</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Target size={14} color={colors.error} />
            <Text style={styles.nutritionValue}>{entry.protein_g || 0}g</Text>
            <Text style={styles.nutritionLabel}>protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Target size={14} color={colors.primary} />
            <Text style={styles.nutritionValue}>{entry.carbs_g || 0}g</Text>
            <Text style={styles.nutritionLabel}>carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Target size={14} color={colors.success} />
            <Text style={styles.nutritionValue}>{entry.fat_g || 0}g</Text>
            <Text style={styles.nutritionLabel}>fat</Text>
          </View>
        </View>

        {entry.notes && (
          <Text style={styles.mealNotes}>{entry.notes}</Text>
        )}
      </View>
    </View>
  );

  const renderSelectedDay = () => {
    if (!selectedDay || !mealPlan?.meal_plan_days) return null;

    const dayData = mealPlan.meal_plan_days.find((day: any) => day.date === selectedDay);
    if (!dayData) return null;

    const entries = dayData.meal_plan_entries || [];
    const totalNutrition = getTotalNutrition(entries);

    return (
      <View style={styles.dayContent}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDate(selectedDay)}</Text>
          <Text style={styles.daySubtitle}>{entries.length} meals planned</Text>
        </View>

        {/* Daily Nutrition Summary */}
        <View style={styles.nutritionSummary}>
          <Text style={styles.nutritionSummaryTitle}>Daily Nutrition</Text>
          <View style={styles.nutritionSummaryGrid}>
            <View style={styles.nutritionSummaryItem}>
              <Text style={styles.nutritionSummaryValue}>{Math.round(totalNutrition.calories)}</Text>
              <Text style={styles.nutritionSummaryLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionSummaryItem}>
              <Text style={styles.nutritionSummaryValue}>{Math.round(totalNutrition.protein)}g</Text>
              <Text style={styles.nutritionSummaryLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionSummaryItem}>
              <Text style={styles.nutritionSummaryValue}>{Math.round(totalNutrition.carbs)}g</Text>
              <Text style={styles.nutritionSummaryLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionSummaryItem}>
              <Text style={styles.nutritionSummaryValue}>{Math.round(totalNutrition.fat)}g</Text>
              <Text style={styles.nutritionSummaryLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Meals List */}
        {entries.length === 0 ? (
          <View style={styles.noMealsContainer}>
            <ChefHat size={48} color={colors.textTertiary} />
            <Text style={styles.noMealsText}>No meals planned for this day</Text>
          </View>
        ) : (
          <View style={styles.mealsContainer}>
            {entries.map(renderMealEntry)}
          </View>
        )}

        {dayData.notes && (
          <View style={styles.dayNotes}>
            <Text style={styles.dayNotesTitle}>Day Notes</Text>
            <Text style={styles.dayNotesText}>{dayData.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading meal plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mealPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Meal Plan Not Found</Text>
          <Text style={styles.errorText}>The requested meal plan could not be found.</Text>
          <TouchableOpacity style={styles.backToListButton} onPress={() => router.back()}>
            <Text style={styles.backToListText}>Back to Meal Plans</Text>
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
        <Text style={styles.title} numberOfLines={1}>
          {mealPlan.name}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Share2 size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <MessageSquare size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Plan Overview */}
        <View style={styles.planOverview}>
          {mealPlan.title_image_url && (
            <Image source={{ uri: mealPlan.title_image_url }} style={styles.planImage} />
          )}
          
          <View style={styles.planInfo}>
            <Text style={styles.planName}>{mealPlan.name}</Text>
            {mealPlan.description && (
              <Text style={styles.planDescription}>{mealPlan.description}</Text>
            )}
            
            <View style={styles.planMeta}>
              <View style={styles.metaItem}>
                <User size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>By {mealPlan.nutritionist_name}</Text>
              </View>
              <View style={styles.metaItem}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {new Date(mealPlan.start_date).toLocaleDateString()} - {new Date(mealPlan.end_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Day Selector */}
        {renderDaySelector()}

        {/* Selected Day Content */}
        {renderSelectedDay()}

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
  backToListButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backToListText: {
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
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  planOverview: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  planImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
  },
  planInfo: {
    gap: 8,
  },
  planName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.text,
  },
  planDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  planMeta: {
    gap: 8,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  daySelector: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  daySelectorTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  dayScrollView: {
    paddingHorizontal: 20,
  },
  dayButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    minWidth: 60,
    position: 'relative',
  },
  selectedDayButton: {
    backgroundColor: colors.primary,
  },
  todayDayButton: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  dayButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 2,
  },
  selectedDayButtonText: {
    color: '#FFFFFF',
  },
  todayDayButtonText: {
    color: colors.warning,
  },
  dayButtonLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedDayButtonLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  todayDayButtonLabel: {
    color: colors.warning,
  },
  todayIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  dayContent: {
    padding: 20,
  },
  dayHeader: {
    marginBottom: 20,
  },
  dayTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 4,
  },
  daySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  nutritionSummary: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nutritionSummaryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  nutritionSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionSummaryValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  nutritionSummaryLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  mealsContainer: {
    gap: 16,
  },
  mealEntry: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealTypeEmoji: {
    fontSize: 24,
  },
  mealTypeName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  mealTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  aiGeneratedText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  mealImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  mealContent: {
    gap: 8,
  },
  mealTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  mealDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  mealQuantity: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textTertiary,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
  },
  nutritionItem: {
    alignItems: 'center',
    gap: 4,
  },
  nutritionValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.text,
  },
  nutritionLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: colors.textTertiary,
  },
  mealNotes: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    backgroundColor: colors.borderLight,
    padding: 8,
    borderRadius: 6,
  },
  noMealsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noMealsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  dayNotes: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  dayNotesTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  dayNotesText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});