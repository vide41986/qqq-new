import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Plus, 
  Footprints, 
  Target, 
  UtensilsCrossed,
  TrendingUp,
  Calendar,
  X,
  Play,
  Dumbbell,
  Clock,
  ChevronRight,
  Flame,
  Users
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme, getColors } from '../../hooks/useColorScheme';
import { useTodayDataNew } from '../../hooks/useTodayDataNew';
import { TodayClientData } from '../../lib/todayQueries';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getClientTrainingSessions } from '../../lib/trainingSessionQueries';
import { TrainingSession } from '../../types/workout';
export default function TodayClientViewNew() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);
  const { data, loading, error, refreshData } = useTodayDataNew();
  const { user } = useAuth();
  const [showMissedWorkout, setShowMissedWorkout] = useState(true);
  const [todaysTrainingSessions, setTodaysTrainingSessions] = useState<TrainingSession[]>([]);
  
  const clientData = data as TodayClientData;
  
  useEffect(() => {
    const loadTodaysTrainingSessions = async () => {
      if (!clientData?.profile?.id) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        const sessions = await getClientTrainingSessions(clientData.profile.id, today, today);
        setTodaysTrainingSessions(sessions);
      } catch (error) {
        console.error('Error loading today\'s training sessions:', error);
      }
    };

    if (clientData?.profile?.id) {
      loadTodaysTrainingSessions();
    }
  }, [clientData?.profile?.id]);
  console.log('clientData:', clientData);
  console.log('clientData.profile:', clientData?.profile);
  console.log('clientData.workoutSessions:', clientData?.workoutSessions);
  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderExercise = (exercise: any, index: number) => {
    return (
      <View key={index} style={styles.exerciseItem}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
          <Text style={styles.exerciseDetails}>
            Sets: {exercise.sets_config?.length || 0}{'  '}
            Reps: {exercise.sets_config?.[0]?.reps || 'N/A'}{'  '}
            Weight: {exercise.sets_config?.[0]?.weight || 'N/A'}
          </Text>
        </View>
        <View style={styles.exerciseProgress}>
          <Text style={styles.exerciseStatus}>Not Started</Text>
        </View>
      </View>
    );
  };

  const renderWeeklyWorkouts = () => {
    if (!clientData?.workoutSessions?.length) {
      return null;
    }

    const getDayName = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
    };

    const groupByDay = (sessions: any[]) => {
      return sessions.reduce((acc: Record<string, any[]>, session: any) => {
        const day = getDayName(session.date);
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(session);
        return acc;
      }, {} as Record<string, any[]>);
    };

    const weeklySessions = groupByDay(clientData.workoutSessions);

    return (
      <View style={styles.weeklyWorkoutsContainer}>
        <Text style={styles.sectionTitle}>Training This Week</Text>
        {Object.entries(weeklySessions).map(([day, sessions]) => (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayTitle}>{day}</Text>
            {(sessions as any[]).map((session: any, index: number) => (
              <View key={index} style={styles.sessionItem}>
                <Text style={styles.sessionTime}>
                  {new Date(session.start_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <Text style={styles.sessionStatus}>
                  {session.completed ? 'Completed' : 'Not Started'}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderTodayPlan = () => {
    if (!clientData.todayPlan?.template) {
      return (
        <View style={styles.noPlanContainer}>
          <Text style={styles.noPlanText}>No workout plan scheduled for today</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.planContainer}>
        <Text style={styles.planTitle}>Today's Workout Plan</Text>
        <View style={styles.exercisesContainer}>
          {clientData.todayPlan.template.exercises.map(renderExercise)}
        </View>
      </View>
    );
  };

  const userName = clientData?.profile?.full_name?.split(' ')[0] || 'User';
  const steps = clientData?.todayStats?.steps || 0;
  const stepGoal = 10000;
  const stepProgress = (steps / stepGoal) * 100;

  // Get today's workout
  // Find the first scheduled workout session for today that has a template
  const todaysWorkoutSession = todaysTrainingSessions.find(session => {
    return session.status === 'scheduled' || session.status === 'completed';
  }) || clientData?.workoutSessions?.find(session => {
    const sessionDate = new Date(session.scheduled_date).toDateString();
    const today = new Date().toDateString();
    return sessionDate === today && session.template_id && session.template && !session.completed;
  });

  const completedWorkouts = clientData?.workoutSessions?.filter(session => session.completed) || [];
  console.log('Today\'s workout sessions:', {
    allSessions: clientData?.workoutSessions,
    todaySession: todaysWorkoutSession,
    today: new Date().toDateString()
  });
  
  // Get active goal
  const activeGoal = clientData?.activeGoals?.[0] || {
    title: 'Set your first goal',
    emoji: '🎯',
    progress_percentage: 0,
    target_date: null,
  };

  const calculateDaysLeft = (targetDate: string | null) => {
    if (!targetDate) return 0;
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysLeft = calculateDaysLeft(activeGoal.target_date);

  const handleFabPress = () => {
    router.push('/activities');
  };

  const handleStartWorkout = () => {
    if (todaysWorkoutSession) {
      // Handle both training sessions and workout sessions
      if ('template_id' in todaysWorkoutSession && todaysWorkoutSession.template_id) {
        router.push(`/start-workout/${todaysWorkoutSession.id}`);
      } else {
        // For training sessions without templates, navigate to session detail
        router.push(`/start-workout/session/${todaysWorkoutSession.id}`);
      }
    }
  };

  const handleWorkoutCardPress = () => {
    if (todaysWorkoutSession) {
      // Handle both training sessions and workout sessions
      if ('template_id' in todaysWorkoutSession && todaysWorkoutSession.template_id) {
        router.push(`/todays-workout/${todaysWorkoutSession.template_id}` as any);
      } else {
        // For training sessions without templates, navigate to session detail
        router.push(`/workout-detail/${todaysWorkoutSession.id}`);
      }
    }
  };

  const handleGoalPress = () => {
    router.push('/fitness-goals');
  };

  const handleSetMacrosGoal = () => {
    router.push('/set-macros-goal');
  };

  const handleAddMeal = () => {
    router.push('/food-journal');
  };

  const getExerciseImage = (exerciseName: string, index: number): string => {
    const images = [
      'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400', // Weightlifting
      'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=400', // Dumbbells
      'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=400', // Running
      'https://images.pexels.com/photos/3822356/pexels-photo-3822356.jpeg?auto=compress&cs=tinysrgb&w=400', // Yoga/Stretching
      'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg?auto=compress&cs=tinysrgb&w=400', // Gym equipment
      'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=400', // Boxing
      'https://images.pexels.com/photos/3289711/pexels-photo-3289711.jpeg?auto=compress&cs=tinysrgb&w=400', // Kettlebell
      'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&cs=tinysrgb&w=400', // Stretching
    ];
    return images[index % images.length];
  };

  const renderTodaysWorkout = () => {
    if (!todaysWorkoutSession) {
      return (
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#1E40AF', '#3730A3'] : ['#667EEA', '#764BA2']}
          style={styles.restDayCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.restDayContent}>
            <Text style={styles.restDayLabel}>REST DAY</Text>
            <Text style={styles.restDayMessage}>
              Hoo-ray it's your rest-day 🌴
            </Text>
          </View>
        </LinearGradient>
      );
    }

    // Handle both training sessions and workout sessions
    const template = todaysWorkoutSession.template;
    const sessionName = template?.name || todaysWorkoutSession.type || todaysWorkoutSession.session_type || 'Training Session';
    const sessionDuration = template?.estimated_duration_minutes || todaysWorkoutSession.duration_minutes || todaysWorkoutSession.duration || 60;
    const sessionExercises = template?.exercises || [];

    return (
      <TouchableOpacity 
        style={styles.workoutCardContainer}
        onPress={handleWorkoutCardPress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#BE185D', '#BE123C'] : ['#F093FB', '#F5576C']}
          style={styles.workoutCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Hero Image */}
          <View style={styles.workoutHeroContainer}>
            <Image 
              source={{ uri: template?.image_url || template?.thumbnail_url || 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800' }}
              style={styles.workoutHeroImage}
            />
            <View style={styles.workoutOverlay}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutLabel}>TODAY'S WORKOUT</Text>
                <Text style={styles.workoutName}>{sessionName}</Text>
                <View style={styles.workoutMeta}>
                  <View style={styles.metaItem}>
                    <Dumbbell size={16} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.metaText}>{sessionExercises.length} exercises</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={16} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.metaText}>{sessionDuration} min</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.playButton} onPress={handleStartWorkout}>
                <Play size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Exercise Preview */}
          <View style={styles.exercisePreview}>
            <Text style={styles.exercisePreviewTitle}>Exercises Preview</Text>
            {sessionExercises.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.exerciseScrollView}
                contentContainerStyle={styles.exerciseScrollContent}
              >
                {sessionExercises.slice(0, 5).map((exercise: any, index: number) => (
                  <View key={exercise.id} style={styles.exercisePreviewItem}>
                    <Image 
                      source={{ uri: exercise.exercise.image_url || getExerciseImage(exercise.exercise.name, index) }}
                      style={styles.exercisePreviewImage}
                    />
                    <Text style={styles.exercisePreviewName} numberOfLines={2}>
                      {exercise.exercise.name}
                    </Text>
                    <Text style={styles.exercisePreviewSets}>
                      {exercise.sets_config.length} sets
                    </Text>
                  </View>
                ))}
                {sessionExercises.length > 5 && (
                  <View style={styles.moreExercisesItem}>
                    <View style={styles.moreExercisesCircle}>
                      <Text style={styles.moreExercisesText}>
                        +{sessionExercises.length - 5}
                      </Text>
                    </View>
                    <Text style={styles.moreExercisesLabel}>More</Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.noExercisesContainer}>
                <Text style={styles.noExercisesText}>Custom training session</Text>
                <Text style={styles.noExercisesSubtext}>Details will be provided by your trainer</Text>
              </View>
            )}
            
            <View style={styles.workoutActions}>
              <TouchableOpacity style={styles.viewDetailsButton} onPress={handleWorkoutCardPress}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.8)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.startWorkoutButton} onPress={handleStartWorkout}>
                <Play size={16} color="#FFFFFF" />
                <Text style={styles.startWorkoutText}>Start Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load data</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: colors.background }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshData} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{getCurrentDate()}</Text>
          <Text style={styles.greetingText}>
            {getGreeting()},{userName}! 👋
          </Text>
        </View>

        {/* Today's Workout */}
        {renderTodaysWorkout()}
        {renderWeeklyWorkouts}
        {renderTodayPlan}

        {/* Fitness Goal Card */}
        <TouchableOpacity style={styles.goalCard} onPress={handleGoalPress}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleContainer}>
              <Text style={styles.goalEmoji}>{activeGoal.emoji}</Text>
              <View>
                <Text style={styles.goalTitle}>{activeGoal.title}</Text>
                <Text style={styles.goalSubtitle}>
                  {daysLeft > 0 ? `${daysLeft} days left` : 'No target date'} • {activeGoal.progress_percentage}% complete
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.addGoalButton}
              onPress={() => router.push('/set-fitness-goal')}
            >
              <Plus size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.goalProgressContainer}>
            <View style={styles.goalProgressBar}>
              <View 
                style={[
                  styles.goalProgressFill, 
                  { width: `${activeGoal.progress_percentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.goalProgressText}>{activeGoal.progress_percentage}%</Text>
          </View>

          {daysLeft > 0 && (
            <View style={styles.goalCountdown}>
              <Clock size={16} color={colors.textSecondary} />
              <Text style={styles.goalCountdownText}>
                {daysLeft} days remaining
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Missed Workout Alert */}
        {showMissedWorkout && completedWorkouts.length === 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertContent}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertText}>
                You haven't completed any workouts today
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowMissedWorkout(false)}
              style={styles.alertClose}
            >
              <X size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Steps Tracker */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Steps tracker</Text>
            <Footprints size={24} color={colors.primary} />
          </View>
          
          <View style={styles.stepsContent}>
            <View style={styles.stepsInfo}>
              <Text style={styles.stepsNumber}>
                {steps.toLocaleString()}
              </Text>
              <Text style={styles.stepsGoal}>/ {stepGoal.toLocaleString()} steps</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min(stepProgress, 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{Math.round(stepProgress)}%</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <Dumbbell size={24} color={colors.success} />
          </View>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/templates')}
            >
              <Text style={styles.actionButtonText}>View Templates</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/workout-history')}
            >
              <Text style={styles.actionButtonText}>Workout History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Macros</Text>
            <Target size={24} color={colors.success} />
          </View>
          
          <Text style={styles.cardSubtitle}>
            Start by setting your daily goal
          </Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSetMacrosGoal}>
            <Text style={styles.actionButtonText}>Set daily goal</Text>
          </TouchableOpacity>
        </View>

        {/* Food Journal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Food Journal</Text>
            <UtensilsCrossed size={24} color={colors.warning} />
          </View>
          
          <Text style={styles.cardSubtitle}>
            What did you eat today?
          </Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleAddMeal}>
            <Text style={styles.actionButtonText}>Add meal</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Progress */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Progress</Text>
            <TrendingUp size={24} color={colors.error} />
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedWorkouts.length}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{clientData?.todayStats?.calories_consumed || 0}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{((clientData?.todayStats?.water_intake_ml || 0) / 1000).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Water (L)</Text>
            </View>
          </View>
        </View>

        {/* Trainer/Nutritionist Info */}
        {clientData?.clientAssignment && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Team</Text>
              <Users size={24} color={colors.info} />
            </View>
            
            {clientData.clientAssignment.trainer && (
              <View style={styles.teamMember}>
                <Text style={styles.teamMemberRole}>Trainer</Text>
                <Text style={styles.teamMemberName}>{clientData.clientAssignment.trainer.full_name}</Text>
              </View>
            )}
            
            {clientData.clientAssignment.nutritionist && (
              <View style={styles.teamMember}>
                <Text style={styles.teamMemberRole}>Nutritionist</Text>
                <Text style={styles.teamMemberName}>{clientData.clientAssignment.nutritionist.full_name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Spacing for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
        <Plus size={28} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  weeklyWorkoutsContainer: {
    padding: 16,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionTime: {
    fontSize: 16,
    color: colors.text,
  },
  sessionStatus: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  planContainer: {
    padding: 16,
    backgroundColor: colors.background,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  exercisesContainer: {
    flex: 1,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  exerciseProgress: {
    alignItems: 'flex-end',
  },
  exerciseStatus: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noPlanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noPlanText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  dateText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  greetingText: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.text,
    marginTop: 4,
  },
  restDayCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
  },
  restDayContent: {
    alignItems: 'flex-start',
  },
  restDayLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  restDayMessage: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  workoutCardContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  workoutCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  workoutHeroContainer: {
    height: 200,
    position: 'relative',
  },
  workoutHeroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  workoutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 20,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  workoutName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playButton: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercisePreview: {
    padding: 20,
  },
  exercisePreviewTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  exerciseScrollView: {
    marginBottom: 20,
  },
  exerciseScrollContent: {
    paddingRight: 20,
  },
  exercisePreviewItem: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
  },
  exercisePreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  exercisePreviewName: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 12,
  },
  exercisePreviewSets: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  moreExercisesItem: {
    width: 80,
    alignItems: 'center',
  },
  moreExercisesCircle: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moreExercisesText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  moreExercisesLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  noExercisesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noExercisesText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  noExercisesSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  viewDetailsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  startWorkoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  startWorkoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginLeft: 6,
  },
  alertCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  alertContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  alertText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  goalCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  goalEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  goalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  goalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  addGoalButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    marginRight: 12,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  goalProgressText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.success,
    minWidth: 40,
  },
  goalCountdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalCountdownText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  alertClose: {
    padding: 4,
  },
  stepsContent: {
    alignItems: 'flex-start',
  },
  stepsInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  stepsNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: colors.text,
  },
  stepsGoal: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.primary,
    minWidth: 35,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.text,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  teamMember: {
    marginBottom: 12,
  },
  teamMemberRole: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  teamMemberName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
});
