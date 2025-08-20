import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Plus, 
  Footprints, 
  Target, 
  ChefHat,
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
import HealthDataWidget from '../HealthDataWidget';

import { getValidImageUrl, getExerciseImage, getWorkoutImageByCategory } from '../../utils/imageUtils';
import { supabase } from '../../lib/supabase';
import { getSessionNotifications } from '../../lib/trainerQueries';
import StepCard from '@/components/StepCard';
import SleepCard from '@/components/SleepCard';
import WaterCard from '@/components/WaterCard';
import HeartRateCard from '@/components/HeartRateCard';
import WeightMetricsCard from '@/components/WeightMetricsCard';
import WalkMap from '@/components/WalkMap';
import { getWorkoutTemplate } from '../../lib/workoutTemplates';


// Sample data - in a real app, this would come from Supabase and/or Google Fit API
const SAMPLE_DATA = {
  steps: {
    data: [2341, 6423, 5243, 8675, 7654, 9876, 8543],
    dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    goal: 10000,
    today: 8543,
  },
  sleep: {
    data: [6.7, 7.2, 5.8, 8.1, 7.5, 6.9, 7.8],
    dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    goal: 8,
    today: 7.8,
  },
  heartRate: {
    data: [68, 72, 75, 82, 79, 76, 71, 73],
    times: ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm'],
    current: 73,
    resting: 65,
  },
  water: {
    goal: 8,
    current: 5,
  },
  weight: {
    data: [60, 59.5, 58.7, 57.2, 56.5, 52.5, 58.5],
    dates: ['4/5', '4/17', '4/29', '5/11', '5/23', '6/3', '6/3'],
  },
  recentWalk: {
    route: [
      { latitude: 37.78825, longitude: -122.4324 },
      { latitude: 37.78843, longitude: -122.4325 },
      { latitude: 37.78856, longitude: -122.4332 },
      { latitude: 37.78865, longitude: -122.4341 },
      { latitude: 37.78875, longitude: -122.4350 },
      { latitude: 37.78895, longitude: -122.4365 },
      { latitude: 37.78915, longitude: -122.4380 },
      { latitude: 37.78925, longitude: -122.4390 },
      { latitude: 37.78935, longitude: -122.4395 },
    ],
    distance: 1240, // meters
    duration: 15, // minutes
    date: 'Today, 8:30 AM',
  },
};

// Add normalization function above the component
const normalizeSession = (session: any) => ({
  ...session,
  scheduled_date: session.scheduled_date || session.session_date || session.date,
  scheduled_time: session.scheduled_time || session.time || session.start_time,
});

// Helper to get templateId for a day, case-insensitive
const getTemplateIdForDay = (scheduleData: any, day: string) => {
  if (!scheduleData) return null;
  // Try direct match
  if (scheduleData[day]) return scheduleData[day];
  // Try case-insensitive match
  const foundKey = Object.keys(scheduleData).find(k => k.trim().toLowerCase() === day.trim().toLowerCase());
  return foundKey ? scheduleData[foundKey] : null;
};

// Assume templates is an array of template objects with an 'id' property
type Template = { id: string };
const getValidTemplateIds = (
  scheduleData: Record<string, string>,
  templates: Template[]
): string[] => {
  // Normalize all template IDs for comparison
  const templateIdSet = new Set(templates.map((t) => t.id.trim().toLowerCase()));

  // Go through each schedule entry and check if it exists in templates
  return Object.entries(scheduleData)
    .map(([day, id]) => {
      const normalizedId = typeof id === 'string' ? id.trim().toLowerCase() : '';
      const isValid = templateIdSet.has(normalizedId);
      console.log(`Day: ${day}, Raw ID: "${id}", Normalized: "${normalizedId}", Valid: ${isValid}`);
      return isValid ? id : null;
    })
    .filter((id): id is string => Boolean(id)); // Remove nulls and ensure type
};

// Add helper for plan duration
const getPlanDuration = (plan: { start_date: string; end_date: string } | undefined) => {
  if (!plan) return '';
  const start = new Date(plan.start_date);
  const end = new Date(plan.end_date);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return `${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
};

export default function TodayClientViewNew() {
  const colorScheme = useColorScheme() ?? 'light';

  const [waterCount, setWaterCount] = useState(SAMPLE_DATA.water.current);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [todaysPlanTemplate, setTodaysPlanTemplate] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);
  
  const incrementWater = async () => {
  };
  
  // Handle water decrement
  const decrementWater = async () => {
  };

  // Add more robust error handling for colors
  let colors;
  try {
    colors = getColors(colorScheme);
    console.log('🔍 Color scheme:', colorScheme);
    console.log('🔍 Colors object:', colors);
  } catch (error) {
    console.error('❌ Error getting colors:', error);
    colors = null;
  }
  
  // Ensure colors has fallback values with more robust checking
  const safeColors = colors || {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    border: '#E5E5E5',
    borderLight: '#F0F0F0',
    surfaceSecondary: '#F8F8F8',
    shadow: '#000000',
    card: '#FFFFFF'
  };
  
  console.log('🔍 Safe colors object:', safeColors);
  console.log('🔍 Safe colors background:', safeColors?.background);
  
  // Don't render until we have safe colors
  if (!safeColors || !safeColors.background) {
    console.error('❌ Safe colors not properly initialized');
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#000000' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Wrap createStyles in try-catch to identify the exact error
  let styles;
  try {
    console.log('🔍 Creating styles with safeColors:', safeColors);
    styles = createStyles(safeColors);
    console.log('🔍 Styles created successfully');
  } catch (error) {
    console.error('❌ Error creating styles:', error);
    // Return a simple loading screen if styles creation fails
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#000000' }}>Loading styles...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const { data, loading, error, refreshData } = useTodayDataNew();
  const { user } = useAuth();
  const [showMissedWorkout, setShowMissedWorkout] = useState(true);
  const [todaysTrainingSessions, setTodaysTrainingSessions] = useState<TrainingSession[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  
  const clientData = data as TodayClientData;
  
  // Fetch templates referenced in the plan schedule
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!clientData?.todayPlan?.plan?.schedule_data) return;
      const scheduleData = clientData.todayPlan.plan.schedule_data;
      const templateIds = Object.values(scheduleData).filter((id): id is string => typeof id === 'string' && !!id);
      if (templateIds.length === 0) {
        setTemplates([]);
        return;
      }
      setTemplatesLoading(true);
      try {
        const fetchedTemplates = await Promise.all(
          templateIds.map(async (id) => {
            const template = await getWorkoutTemplate(id);
            return template ? { id: template.id } : null;
          })
        );
        setTemplates(fetchedTemplates.filter(Boolean) as Template[]);
      } catch (e) {
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    };
    fetchTemplates();
  }, [clientData?.todayPlan?.plan?.schedule_data]);

  useEffect(() => {
    const loadTodaysTrainingSessions = async () => {
      if (!clientData?.profile?.id) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('🔍 Loading training sessions for date:', today);
        console.log('🔍 Client ID:', clientData.profile.id);
        
        const sessions = await getClientTrainingSessions(clientData.profile.id, today, today);
        console.log('🔍 Training sessions loaded:', sessions);
        setTodaysTrainingSessions(sessions);
      } catch (error) {
        console.error('Error loading today\'s training sessions:', error);
      }
    };

    if (clientData?.profile?.id) {
      loadTodaysTrainingSessions();
    }
  }, [clientData?.profile?.id]);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const data = await getSessionNotifications(20);
        setReminders(data.filter(n => n.notification_type === 'reminder'));
      } catch (e) {
        console.error('Error fetching reminders:', e);
      }
    };
    fetchReminders();
  }, []);



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

  // const renderWeeklyWorkouts = () => {
  //   if (!clientData?.workoutSessions?.length) {
  //     return null;
  //   }

  //   const getDayName = (dateStr: string) => {
  //     return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  //   };

  //   const groupByDay = (sessions: any[]) => {
  //     return sessions.reduce((acc: Record<string, any[]>, session: any) => {
  //       const day = getDayName(session.date);
  //       if (!acc[day]) {
  //         acc[day] = [];
  //       }
  //       acc[day].push(session);
  //       return acc;
  //     }, {} as Record<string, any[]>);
  //   };

  //   const weeklySessions = groupByDay(clientData.workoutSessions);

  //   return (
  //     <View style={styles.weeklyWorkoutsContainer}>
  //       <Text style={styles.sectionTitle}>Training This Week</Text>
  //       {Object.entries(weeklySessions).map(([day, sessions]) => (
  //         <View key={day} style={styles.dayContainer}>
  //           <Text style={styles.dayTitle}>{day}</Text>
  //           {(sessions as any[]).map((session: any, index: number) => (
  //             <View key={index} style={styles.sessionItem}>
  //               <Text style={styles.sessionTime}>
  //                 {new Date(session.start_time).toLocaleTimeString('en-US', {
  //                   hour: '2-digit',
  //                   minute: '2-digit'
  //                 })}
  //               </Text>
  //               <Text style={styles.sessionStatus}>
  //                 {session.completed ? 'Completed' : 'Not Started'}
  //               </Text>
  //             </View>
  //           ))}
  //         </View>
  //       ))}
  //     </View>
  //   );
  // };

  const renderTodaysWorkout = () => {
    const workoutToRender = clientData?.todaysWorkoutTemplate || todaysTrainingSession;
    console.log('workoutToRender:', workoutToRender);
    if (!workoutToRender) {
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
 
    const template = workoutToRender;
    const sessionName = template?.name || 'Training Session';
    const sessionDuration = template?.estimated_duration_minutes || 60;
    const sessionExercises = template?.exercises || [];

    return (
      <TouchableOpacity
        style={styles.workoutCardContainer}
        onPress={handleWorkoutCardPress} // This will be updated below
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
              source={{ uri: template?.thumbnail_url || template?.image_url || 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400' }}
              style={styles.workoutHeroImage}
            />
            <View style={styles.workoutOverlay}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutLabel}>TODAY'S WORKOUT</Text>
                <Text style={styles.workoutName}>{sessionName}</Text>
                <View style={styles.workoutMeta}>
                  <View style={styles.metaItem}>
                    <Dumbbell size={16} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.metaText}>
                      {sessionExercises.length} exercises
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={16} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.metaText}>{sessionDuration} min</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.playButton} onPress={handleStartWorkout}> {/* This will be updated below */}
                <Play size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Exercise Preview */}
          <View style={styles.exercisePreview}>
            {/* <Text style={styles.exercisePreviewTitle}>Exercises Preview</Text>
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
                      source={{ uri: exercise.exercise?.template_url  }}
                      style={styles.exercisePreviewImage}
                    />
                    <Text style={styles.exercisePreviewName} numberOfLines={2}>
                      {exercise.exercise?.name}
                    </Text>
                    <Text style={styles.exercisePreviewSets}>
                      {exercise.sets_config?.length} sets
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
            )} */}

            <View style={styles.workoutActions}>
              <TouchableOpacity style={styles.viewDetailsButton} onPress={handleWorkoutCardPress}> {/* This will be updated below */}
                <Text style={styles.viewDetailsText}>View Details</Text>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.8)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.startWorkoutButton} onPress={handleStartWorkout}> {/* This will be updated below */}
                <Play size={16} color="#FFFFFF" />
                <Text style={styles.startWorkoutText}>Start Workout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };


  // const renderTodayPlan = () => {
  //   if (!clientData.todayPlan?.template) {
  //     return (
  //       <View style={styles.noPlanContainer}>
  //         <Text style={styles.noPlanText}>No workout plan scheduled for today</Text>
  //         <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
  //           <Text style={styles.refreshButtonText}>Refresh</Text>
  //         </TouchableOpacity>
  //       </View>
  //     );
  //   }

  //   return (
  //     <View style={styles.planContainer}>
  //       <Text style={styles.planTitle}>Today's Workout Plan</Text>
  //       <View style={styles.exercisesContainer}>
  //         {clientData.todayPlan.template.exercises.map(renderExercise)}
  //       </View>
  //     </View>
  //   );
  // };

  const userName = clientData?.profile?.full_name?.split(' ')[0] || 'User';
  const steps = clientData?.todayStats?.steps || 0;
  const stepGoal = 10000;
  const stepProgress = (steps / stepGoal) * 100;

  // Separate logic for today's training session and plan workout
  const todaysTrainingSession = todaysTrainingSessions.find(session => session.status === 'scheduled' || session.status === 'completed');
  const todaysPlanWorkout = (() => {
    if (todaysPlanTemplate && clientData?.todayPlan?.plan && clientData.todayPlan.plan.schedule_data) {
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const templateId = getTemplateIdForDay(clientData.todayPlan.plan.schedule_data, dayOfWeek);
      if (templateId && todaysPlanTemplate.id === templateId) {
        return {
          id: `plan-${todaysPlanTemplate.id}`,
          template: todaysPlanTemplate,
          template_id: todaysPlanTemplate.id,
          status: 'scheduled',
          scheduled_date: new Date().toISOString().split('T')[0],
          type: 'personal_training' as const,
          client_id: '',
          trainer_id: '',
          scheduled_time: '',
          created_at: '',
          updated_at: '',
        } as TrainingSession;
      }
    }
    return null;
  })();

  const completedWorkouts = clientData?.workoutSessions?.filter(session => session.completed) || [];
  console.log('Today\'s workout sessions:', {
    allSessions: clientData?.workoutSessions,
    todaySession: todaysTrainingSession,
    todayPlan: clientData?.todayPlan,
    todaysWorkoutTemplate: clientData?.todaysWorkoutTemplate,
    todaysTrainingSessions: todaysTrainingSessions,
    today: new Date().toDateString()
  });
  
  // Debug: Check if we have any workout data
  console.log('🔍 Debug workout data:', {
    hasTodaysTrainingSession: !!todaysTrainingSession,
    todaysTrainingSessionType: todaysTrainingSession?.type,
    todaysTrainingSessionTemplate: todaysTrainingSession?.template?.name,
    hasTodayPlan: !!clientData?.todayPlan?.template,
    hasTodaysWorkoutTemplate: !!clientData?.todaysWorkoutTemplate,
    todaysWorkoutTemplateName: clientData?.todaysWorkoutTemplate?.name
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


  // const templateId = clientData?.todaysWorkoutTemplate?.id;
  // if (templateId) {
  //   router.push(`/todays-workout/${templateId}`);
  // } else {
  //   router.push('/activities');
  // }
   // Update handleStartWorkout
   const handleStartWorkout = () => {
    const workoutToStart = clientData?.todaysWorkoutTemplate || todaysTrainingSession;

    if (workoutToStart) {
      // If it's a WorkoutTemplate, navigate to start-workout with its ID
      if (workoutToStart.id) { // Assuming WorkoutTemplate has an 'id'
        router.push(`/start-workout/${workoutToStart.id}`);
      } else if (workoutToStart.template_id) { // If it's a TrainingSession with a template_id
        router.push(`/start-workout/${workoutToStart.template_id}`);
      } else {
        // Fallback for TrainingSession without a template_id, if applicable
        router.push(`/workout-detail/${workoutToStart.id}`);
      }
    }
  };

  // Update handleWorkoutCardPress
  const handleWorkoutCardPress = () => {
    const workoutToView = clientData?.todaysWorkoutTemplate || todaysTrainingSession;

    if (workoutToView) {
      // If it's a WorkoutTemplate, navigate to todays-workout with its ID
      if (workoutToView.id) { // Assuming WorkoutTemplate has an 'id'
        router.push(`/todays-workout/${workoutToView.id}` as any);
      } else if (workoutToView.template_id) { // If it's a TrainingSession with a template_id
        router.push(`/todays-workout/${workoutToView.template_id}` as any);
      } else {
        // Fallback for TrainingSession without a template_id, if applicable
        router.push(`/workout-detail/${workoutToView.id}`);
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
    return getExerciseImage(exerciseName, index);
  };

  // New: Render training session card (with confirm button if needed)
  const renderTrainingSessionCard = (session: TrainingSession) => {
    // Check if it's a rest day template
    if (session.template && 'is_rest_day' in session.template && session.template.is_rest_day) {
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
              {session.template?.description || 'Take a break and recover today 🌴'}
            </Text>
          </View>
        </LinearGradient>
      );
    }
    const template = session.template;
    const sessionName = template?.name || session.type || 'Training Session';
    const sessionDuration = template?.estimated_duration_minutes || session.duration_minutes || session.duration || 60;
    const sessionExercises = Array.isArray(template?.exercises) ? template.exercises.filter(Boolean) : [];
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
              source={{ uri: getValidImageUrl(template?.thumbnail_url || template?.image_url || getWorkoutImageByCategory(template?.category || 'Full Body')) }}
              // source={{ uri: 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400' }}
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
                      source={{ uri: getValidImageUrl(exercise.exercise?.image_url || getExerciseImage(exercise.exercise?.name, index)) }}
                      style={styles.exercisePreviewImage}
                    />
                    <Text style={styles.exercisePreviewName} numberOfLines={2}>
                      {exercise.exercise?.name}
                    </Text>
                    <Text style={styles.exercisePreviewSets}>
                      {exercise.sets_config?.length || 0} sets
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
            {/* Confirm Session Button (only for training sessions) */}
            {session && session.status === 'scheduled' && (
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmSession(normalizeSession(session))}
              >
                <Text style={styles.confirmButtonText}>Confirm Session</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // New: Render plan workout card (never show confirm button)
  const renderPlanWorkoutCard = (session: TrainingSession) => {
    // Check if it's a rest day template
    if (session.template && 'is_rest_day' in session.template && session.template.is_rest_day) {
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
              {session.template?.description || 'Take a break and recover today 🌴'}
            </Text>
          </View>
        </LinearGradient>
      );
    }
    const template = session.template;
    const sessionName = template?.name || session.type || 'Workout Plan';
    const sessionDuration = template?.estimated_duration_minutes || session.duration_minutes || session.duration || 60;
    const sessionExercises = Array.isArray(template?.exercises) ? template.exercises.filter(Boolean) : [];
    console.log('Plan workout exercises:', sessionExercises);
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
  source={{ uri: getValidImageUrl(template?.thumbnail_url ) }}
  style={styles.workoutHeroImage}
/>
            <View style={styles.workoutOverlay}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutLabel}>TODAY'S PLAN WORKOUT</Text>
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
                  <View key={exercise.id || index} style={styles.exercisePreviewItem}>
                    <Image 
                      source={{ uri: getValidImageUrl(exercise.exercise?.image_url || getExerciseImage(exercise.exercise?.name || '', index)) }}
                      style={styles.exercisePreviewImage}
                    />
                    <Text style={styles.exercisePreviewName} numberOfLines={2}>
                      {exercise.exercise?.name || 'Unnamed'}
                    </Text>
                    <Text style={styles.exercisePreviewSets}>
                      {exercise.sets_config?.length || 0} sets
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
                <Text style={styles.noExercisesText}>Custom plan workout</Text>
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

  const handleConfirmSession = async (session: TrainingSession) => {
    try {
      console.log('Confirming session:', session);
      // 1. Update session status to "confirmed"
      await supabase
        .from('training_sessions')
        .update({ status: 'confirmed' })
        .eq('id', session.id);

      // 2. Send confirmation notification
      await supabase.rpc('create_session_notification', {
        p_session_id: session.id,
        p_notification_type: 'confirmation',
        p_scheduled_for: new Date().toISOString()
      });

      // 3. Normalize session before scheduling reminder
      const normalizedSession = normalizeSession(session);
      Alert.alert('Debug', JSON.stringify(normalizedSession, null, 2));
      if (!normalizedSession.scheduled_date || !normalizedSession.scheduled_time) {
        Alert.alert('Error', 'Session date or time is missing. Cannot schedule reminder.');
        return;
      }
      const sessionDateTime = new Date(`${normalizedSession.scheduled_date}T${normalizedSession.scheduled_time}`);
      if (isNaN(sessionDateTime.getTime())) {
        Alert.alert('Error', 'Session date or time is invalid. Cannot schedule reminder.');
        return;
      }
      const reminderTime = new Date(sessionDateTime.getTime() - 15 * 60 * 1000);

      Alert.alert('Reminder will be scheduled for', reminderTime.toISOString());

      await supabase.rpc('create_session_notification', {
        p_session_id: session.id,
        p_notification_type: 'reminder',
        p_scheduled_for: reminderTime.toISOString()
      });

      Alert.alert('Session Confirmed', 'You will receive a reminder 15 minutes before your session.');
      refreshData && refreshData();
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm session. Please try again.');
      console.error(error);
    }
  };

  const renderDirectPlanWorkoutCard = () => {
    const template = todaysPlanTemplate;
    if (!template) return null;
    const sessionExercises = Array.isArray(template.exercises) ? template.exercises.filter(Boolean) : [];
    const sessionDuration = template.estimated_duration_minutes || 60;

    return (
      <TouchableOpacity style={styles.workoutCardContainer} activeOpacity={0.9} onPress={() => router.push(`/todays-workout/${template.id}`)}>
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#BE185D', '#BE123C'] : ['#F093FB', '#F5576C']}
          style={styles.workoutCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Hero Image */}
          <View style={styles.workoutHeroContainer}>
            <Image
              source={{ uri: getValidImageUrl(template.thumbnail_url || template.image_url || getWorkoutImageByCategory(template.category || 'Full Body')) }}
              style={styles.workoutHeroImage}
            />
            <View style={styles.workoutOverlay}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutLabel}>TODAY'S PLAN WORKOUT</Text>
                <Text style={styles.workoutName}>{template.name}</Text>
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
              <TouchableOpacity style={styles.playButton} onPress={() => router.push(`/start-workout/${template.id}`)}>
                <Play size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Exercise Preview */}
          <View style={styles.exercisePreview}>
            {/* <Text style={styles.exercisePreviewTitle}>Exercises Preview</Text>
            {sessionExercises.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.exerciseScrollView}
                contentContainerStyle={styles.exerciseScrollContent}
              >
                {sessionExercises.slice(0, 5).map((exercise: any, index: number) => (
                  <View key={exercise.id || index} style={styles.exercisePreviewItem}>
                    <Image
                      source={{ uri: getValidImageUrl(exercise.exercise?.image_url || getExerciseImage(exercise.exercise?.name || '', index)) }}
                      style={styles.exercisePreviewImage}
                    />
                    <Text style={styles.exercisePreviewName} numberOfLines={2}>
                      {exercise.exercise?.name || 'Unnamed'}
                    </Text>
                    <Text style={styles.exercisePreviewSets}>
                      {exercise.sets_config?.length || 0} sets • {exercise.sets_config?.[0]?.reps || 'N/A'} reps
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
                <Text style={styles.noExercisesText}>No exercises in this plan</Text>
              </View>
            )} */}
            <View style={styles.workoutActions}>
              <TouchableOpacity style={styles.viewDetailsButton} onPress={() => router.push(`/todays-workout/${template.id}`)}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.8)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.startWorkoutButton} onPress={() => router.push(`/start-workout/${template.id}`)}>
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

  if (templatesLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#000000' }}>Loading templates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scheduleData = clientData?.todayPlan?.plan?.schedule_data || {};
  const validTemplateIds = getValidTemplateIds(scheduleData, templates);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: safeColors.background }]} 
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

      

        {/* Today's Training Session Card */}
        {todaysTrainingSession && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginLeft: 20, marginBottom: 4 }}>Today's Training Session</Text>
            {renderTrainingSessionCard(todaysTrainingSession)}
          </View>
        )}

        {/* Today's Plan Workout Card */}
        {todaysPlanTemplate && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginLeft: 20, marginBottom: 4 }}>Today's Plan Workout</Text>
            {renderDirectPlanWorkoutCard()}
          </View>
        )}

        {/* Weekly Workouts, Plan, etc. */}
        {/* {renderWeeklyWorkouts()} */}

        {renderTodaysWorkout ()}



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
              <Plus size={16} color={safeColors.primary} />
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
              <Clock size={16} color={safeColors.textSecondary} />
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
              <X size={18} color={safeColors.error} />
            </TouchableOpacity>
          </View>
        )}

        <HealthDataWidget compact={true} showSettings={true} />

        {/* Steps Tracker */}

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <Dumbbell size={24} color={safeColors.success} />
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
            <Target size={24} color={safeColors.success} />
          </View>
          
          <Text style={styles.cardSubtitle}>
            Start by setting your daily goal
          </Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSetMacrosGoal}>
            <Text style={styles.actionButtonText}>Set daily goal</Text>
          </TouchableOpacity>
        </View>

        {/* Meal Plans */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>My Meal Plans</Text>
            <ChefHat size={24} color={colors.warning} />
          </View>
          
          <Text style={styles.cardSubtitle}>
            View your personalized meal plans
          </Text>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push('/client-meal-plans')}
          >
            <Text style={styles.actionButtonText}>View Meal Plans</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Progress */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Progress</Text>
            <TrendingUp size={24} color={safeColors.error} />
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
              <Users size={24} color={safeColors.info} />
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

<View style={styles.card}>

       <StepCard 
          steps={SAMPLE_DATA.steps.data}
          dates={SAMPLE_DATA.steps.dates}
          goal={SAMPLE_DATA.steps.goal}
          todaySteps={SAMPLE_DATA.steps.today}
          isLoading={isLoading}
        />
        </View>
<View style={styles.card}>
        
        <SleepCard 
          sleepData={SAMPLE_DATA.sleep.data}
          dates={SAMPLE_DATA.sleep.dates}
          todaySleep={SAMPLE_DATA.sleep.today}
          goal={SAMPLE_DATA.sleep.goal}
          isLoading={isLoading}
        />
        </View>
<View style={styles.card}>

        <WaterCard 
          current={waterCount}
          goal={SAMPLE_DATA.water.goal}
          onIncrement={incrementWater}
          onDecrement={decrementWater}
        />
        </View>
<View style={styles.card}>
        
        <HeartRateCard 
          heartRateData={SAMPLE_DATA.heartRate.data}
          times={SAMPLE_DATA.heartRate.times}
          currentRate={SAMPLE_DATA.heartRate.current}
          restingRate={SAMPLE_DATA.heartRate.resting}
          isLoading={isLoading}
        />
        </View>
<View style={styles.card}>
        
        <WeightMetricsCard
          weightData={SAMPLE_DATA.weight.data}
          dates={SAMPLE_DATA.weight.dates}
          unit="KG"
          isLoading={isLoading}
        />
        </View>
<View style={styles.card}>
        
        <WalkMap 
          route={SAMPLE_DATA.recentWalk.route}
          distance={SAMPLE_DATA.recentWalk.distance}
          duration={SAMPLE_DATA.recentWalk.duration}
          date={SAMPLE_DATA.recentWalk.date}
        />
</View>
        {/* Reminders List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reminders</Text>
          {reminders.length === 0 ? (
            <Text style={styles.cardSubtitle}>No reminders scheduled.</Text>
          ) : (
            reminders.map(reminder => (
              <View key={reminder.id} style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: 'bold' }}>{reminder.title}</Text>
                <Text>{reminder.message}</Text>
                <Text style={{ color: '#888' }}>
                  Scheduled for: {new Date(reminder.scheduled_for).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>

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

const createStyles = (safeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: safeColors.background,
  },
  weeklyWorkoutsContainer: {
    padding: 16,
    backgroundColor: safeColors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: safeColors.text,
    marginBottom: 16,
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: safeColors.text,
    marginBottom: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: safeColors.card,
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionTime: {
    fontSize: 16,
    color: safeColors.text,
  },
  sessionStatus: {
    fontSize: 16,
    color: safeColors.textSecondary,
  },
  planContainer: {
    padding: 16,
    backgroundColor: safeColors.background,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: safeColors.text,
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
    backgroundColor: safeColors.card,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: safeColors.text,
  },
  exerciseDetails: {
    fontSize: 14,
    color: safeColors.textSecondary,
  },
  exerciseProgress: {
    alignItems: 'flex-end',
  },
  exerciseStatus: {
    fontSize: 14,
    color: safeColors.textSecondary,
  },
  noPlanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noPlanText: {
    fontSize: 16,
    color: safeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 12,
    backgroundColor: safeColors.primary,
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
    color: safeColors.textSecondary,
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
    color: safeColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: safeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: safeColors.primary,
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
    color: safeColors.textTertiary,
    letterSpacing: 0.5,
  },
  greetingText: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: safeColors.text,
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
    color: safeColors.text,
    marginLeft: 6,
  },
  alertCard: {
    backgroundColor: safeColors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: safeColors.error,
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
    color: safeColors.text,
    flex: 1,
  },
  card: {
    // backgroundColor: safeColors.surface,
    // marginHorizontal: 20,
    // marginBottom: 16,
    // borderRadius: 12,
    padding: 20,
    // shadowColor: safeColors.shadow,
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 1,
    // shadowRadius: 8,
    // elevation: 2,
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
    color: safeColors.text,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: safeColors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  goalCard: {
    backgroundColor: safeColors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: safeColors.shadow,
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
    color: safeColors.text,
    marginBottom: 4,
  },
  goalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: safeColors.textSecondary,
  },
  addGoalButton: {
    width: 32,
    height: 32,
    backgroundColor: safeColors.surfaceSecondary,
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
    backgroundColor: safeColors.borderLight,
    borderRadius: 4,
    marginRight: 12,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: safeColors.success,
    borderRadius: 4,
  },
  goalProgressText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: safeColors.success,
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
    color: safeColors.textSecondary,
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
    color: safeColors.text,
  },
  stepsGoal: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: safeColors.textSecondary,
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
    backgroundColor: safeColors.borderLight,
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: safeColors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: safeColors.primary,
    minWidth: 35,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: safeColors.surfaceSecondary,
    borderWidth: 1,
    borderColor: safeColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: safeColors.text,
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
    color: safeColors.text,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: safeColors.textSecondary,
    marginTop: 4,
  },
  teamMember: {
    marginBottom: 12,
  },
  teamMemberRole: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: safeColors.textSecondary,
    marginBottom: 2,
  },
  teamMemberName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: safeColors.text,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: safeColors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: safeColors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButton: {
    backgroundColor: safeColors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});
