import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Square,
  Clock,
  Check,
  X,
  Plus,
  Minus,
  Timer,
  RotateCcw
} from 'lucide-react-native';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router, useLocalSearchParams } from 'expo-router';
import { WorkoutTemplate, WorkoutSession, WorkoutSet, WorkoutPlan, TrainingSession, ActiveSet, ActiveExercise } from '@/types/workout';
import { generateId } from '@/utils/workoutUtils';
import { getWorkoutTemplatesForPlans, getWorkoutTemplateById, getTemplateExercisesByTemplateId } from '@/lib/planDatabase';
import { saveSession } from '@/utils/storage';
import { getWorkoutPlan } from '@/lib/planDatabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { createWorkoutSession } from '@/lib/workoutSessionQueries';
import YouTubePlayer from '@/components/ui/YouTubePlayer';

export default function StartWorkoutScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors((colorScheme as 'light' | 'dark' | null));
  const styles = createStyles(colors);
  const { templateId, planId } = useLocalSearchParams();
  const { user } = useAuth();

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');

  const workoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTemplate();
    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isWorkoutStarted && !isPaused) {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      workoutTimerRef.current = setInterval(() => {
        setWorkoutTime((prev: number) => prev + 1);
      }, 1000) as unknown as NodeJS.Timeout;
    } else {
      if (workoutTimerRef.current) {
        clearInterval(workoutTimerRef.current);
        workoutTimerRef.current = null;
      }
    }

    return () => {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    };
  }, [isWorkoutStarted, isPaused]);

  useEffect(() => {
    if (isResting && restTime > 0) {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      restTimerRef.current = setInterval(() => {
        setRestTime((prev: number) => {
          if (prev <= 1) {
            setIsResting(false);
            setShowRestTimer(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000) as unknown as NodeJS.Timeout;
    } else {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting, restTime]);

  const loadTemplate = async () => {
    try {
      console.log('Fetching template with id:', templateId);
     
      const templates = await getWorkoutTemplatesForPlans();
      const exists = templates.some(t => t.id === templateId);
      console.log('Template exists:', exists);
     
      if (!exists) {
        Alert.alert('Error', 'Workout template not found');
        router.back();
        return;
      }
     
      const loadedTemplate = await getWorkoutTemplateById(templateId as string);
      console.log('Loaded template:', loadedTemplate);
      console.log('Template exercises structure:', loadedTemplate?.exercises);
     
      let exercises = loadedTemplate?.exercises || [];
     
      if (!Array.isArray(exercises) || !exercises.length) {
        // Fallback: fetch exercises directly
        exercises = await getTemplateExercisesByTemplateId(templateId as string);
        console.log('Directly fetched exercises:', exercises);
      }
     
      if (loadedTemplate) {
        setTemplate({ ...loadedTemplate, exercises });
        initializeExercises({ ...loadedTemplate, exercises });
        initializeWorkoutSession(loadedTemplate);
       
        if (planId) {
          const loadedPlan = await getWorkoutPlan(planId as string);
          if (loadedPlan) {
            setPlan(loadedPlan);
          } else {
            console.warn('Could not load workout plan details for planId:', planId);
          }
        }
      } else {
        Alert.alert('Error', 'Could not load workout template.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading template:', error);
      Alert.alert('Error', 'Failed to load workout template.');
      router.back();
    }
  };

  const initializeExercises = (template: WorkoutTemplate) => {
    if (!Array.isArray(template.exercises) || !template.exercises.length) {
      console.warn('No exercises array or empty for template:', template);
      setExercises([]);
      return;
    }
    
    const activeExercises: ActiveExercise[] = template.exercises.map(templateExercise => {
      // Ensure we have exercise details
      if (!templateExercise.exercise) {
        console.warn('Template exercise missing exercise details:', templateExercise);
        return {
          exerciseId: templateExercise.exercise_id || '',
          exerciseName: 'Unknown Exercise',
          sets: [],
          currentSetIndex: 0,
          notes: templateExercise.notes || '',
        };
      }
      
      let setsConfig = templateExercise.sets_config;
      
      // Handle sets_config parsing robustly
      if (setsConfig === null || setsConfig === undefined) {
        console.warn('sets_config is null/undefined, using default sets:', templateExercise.exercise.name);
        setsConfig = [
          { reps: 10, weight: 0, rest_time: 60 },
          { reps: 10, weight: 0, rest_time: 60 },
          { reps: 10, weight: 0, rest_time: 60 }
        ];
      } else if (typeof setsConfig === 'string') {
        try {
          setsConfig = JSON.parse(setsConfig);
        } catch (parseError) {
          console.warn('Failed to parse sets_config as JSON:', setsConfig, parseError);
          setsConfig = [
            { reps: 10, weight: 0, rest_time: 60 },
            { reps: 10, weight: 0, rest_time: 60 },
            { reps: 10, weight: 0, rest_time: 60 }
          ];
        }
      }
      
      // Ensure setsConfig is an array
      if (!Array.isArray(setsConfig)) {
        console.warn('sets_config is not an array after parsing:', setsConfig);
        setsConfig = [
          { reps: 10, weight: 0, rest_time: 60 },
          { reps: 10, weight: 0, rest_time: 60 },
          { reps: 10, weight: 0, rest_time: 60 }
        ];
      }
      
      // Ensure each set has required properties
      const validatedSets = setsConfig.map((set: any) => ({
        reps: set?.reps || 10,
        weight: set?.weight || 0,
        duration: set?.duration || 0,
        rest_time: set?.rest_time || 60,
      }));
      
      return {
        exerciseId: templateExercise.exercise.id,
        exerciseName: templateExercise.exercise.name,
        sets: validatedSets.map((set: any) => ({
          id: generateId(),
          reps: set.reps,
          weight: set.weight,
          duration: set.duration,
          rest_time: set.rest_time,
          completed: false,
          notes: '',
        })),
        currentSetIndex: 0,
        notes: templateExercise.notes || '',
      };
    }).filter(exercise => exercise.exerciseId); // Filter out exercises without valid IDs
    
    console.log('Initialized active exercises:', activeExercises);
    setExercises(activeExercises);
  };

  const initializeWorkoutSession = (template: WorkoutTemplate) => {
    const session: WorkoutSession = {
      id: generateId(),
      client_id: user?.id || '',
      template_id: template.id,
      date: new Date().toISOString().split('T')[0],
      start_time: new Date().toISOString(),
      exercises: [],
      completed: false,
      synced: false,
    };
    setWorkoutSession(session);
  };

  const startWorkout = () => {
    setIsWorkoutStarted(true);
    setIsPaused(false);
  };

  const pauseWorkout = () => {
    setIsPaused(true);
  };

  const resumeWorkout = () => {
    setIsPaused(false);
  };

  const completeSet = (exerciseIndex: number, setIndex: number, updatedSet: Partial<ActiveSet>) => {
    setExercises(prev => {
      const updated = [...prev];
      updated[exerciseIndex].sets[setIndex] = {
        ...updated[exerciseIndex].sets[setIndex],
        ...updatedSet,
        completed: true,
      };
      return updated;
    });

    // Start rest timer if specified
    const restTimeSeconds = updatedSet.rest_time || exercises[exerciseIndex].sets[setIndex].rest_time;
    if (restTimeSeconds && restTimeSeconds > 0) {
      setRestTime(restTimeSeconds);
      setIsResting(true);
      setShowRestTimer(true);
    }

    // Move to next set or exercise
    const exercise = exercises[exerciseIndex];
    if (setIndex < exercise.sets.length - 1) {
      // Move to next set
      setExercises(prev => {
        const updated = [...prev];
        updated[exerciseIndex].currentSetIndex = setIndex + 1;
        return updated;
      });
    } else if (exerciseIndex < exercises.length - 1) {
      // Move to next exercise
      setCurrentExerciseIndex(exerciseIndex + 1);
    } else {
      // Workout complete
      setShowFinishModal(true);
    }
  };

  const skipRestTimer = () => {
    setIsResting(false);
    setShowRestTimer(false);
    setRestTime(0);
  };

  const finishWorkout = async () => {
    if (!workoutSession || !user) {
      Alert.alert('Error', 'Session or user data is missing.');
      return;
    }

    try {
      console.log('Creating workout session for client_id:', user.id);

      // Prepare the workout session data
      const completedWorkoutSession: Partial<WorkoutSession> = {
        client_id: user.id,
        template_id: template?.id,
        date: new Date().toISOString().split('T')[0],
        start_time: workoutSession.start_time,
        end_time: new Date().toISOString(),
        exercises: exercises.map(e => ({
          exercise_id: e.exerciseId,
          notes: e.notes,
          sets: e.sets,
        })),
        notes: workoutNotes,
        completed: true,
        synced: false,
      };

      // Conditionally add plan-related data if available
      if (plan) {
        completedWorkoutSession.plan_id = plan.id;
      }

      // Save to database
      const newDbSession = await createWorkoutSession(completedWorkoutSession);

      if (!newDbSession) {
        throw new Error('Failed to create workout session in the database.');
      }

      // Update the local session with the database ID
      const completedLocalSession: WorkoutSession = {
        ...completedWorkoutSession,
        id: newDbSession.id,
        synced: true,
      } as WorkoutSession;

      await saveSession(completedLocalSession);
      
      Alert.alert(
        'Workout Complete!',
        'Great job! Your workout has been saved.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      console.error('Error saving workout session:', error);
      
      // Extract detailed error information
      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for Supabase PostgreSQL error format
      const pgError = (error as any)?.error?.details?.message ||
                       (error as any)?.error?.message ||
                       (error as any)?.message;
                       
      if (pgError) {
        console.error('PostgreSQL error details:', pgError);
        
        // Check for RLS policy violation
        if (pgError.includes('row-level security') || errorMessage.includes('row-level security')) {
          errorMessage = 'Permission denied: You do not have access to create training sessions. This may be because you are not properly associated with this workout plan.';
        } else {
          errorMessage = `Database error: ${pgError}`;
        }
      }
      
      Alert.alert('Error', `Failed to save workout session: ${errorMessage}`);
      
      // Save locally if DB fails
      const completedLocalSession: WorkoutSession = {
        ...workoutSession,
        end_time: new Date().toISOString(),
        exercises: exercises.map(e => ({
          exercise_id: e.exerciseId,
          notes: e.notes,
          sets: e.sets,
        })),
        notes: workoutNotes,
        completed: true,
        synced: false,
      };
      await saveSession(completedLocalSession);
      
      // Log additional context for debugging
      console.log('Saved session locally. Context:', {
        userId: user.id,
        planId: plan?.id,
        trainerId: plan?.trainer_id || 'No plan associated',
        templateId: template?.id
      });
    }
  };

  const exitWorkout = () => {
    Alert.alert(
      'Exit Workout',
      'Are you sure you want to exit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => router.back() }
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSetInput = (exercise: ActiveExercise, setIndex: number) => {
    const set = exercise.sets[setIndex];
    const isCurrentSet = exercise.currentSetIndex === setIndex;
    const isCompleted = set.completed;

    return (
      <View key={set.id} style={[
        styles.setRow,
        isCurrentSet && styles.currentSetRow,
        isCompleted && styles.completedSetRow
      ]}>
        <Text style={styles.setNumber}>{setIndex + 1}</Text>
        
        <View style={styles.setInputs}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reps</Text>
            <TextInput
              style={[styles.setInput, isCompleted && styles.completedInput]}
              value={set.reps?.toString() || ''}
              onChangeText={(value) => {
                const updatedExercises = [...exercises];
                updatedExercises[currentExerciseIndex].sets[setIndex].reps = parseInt(value) || 0;
                setExercises(updatedExercises);
              }}
              keyboardType="numeric"
              editable={!isCompleted}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Weight</Text>
            <TextInput
              style={[styles.setInput, isCompleted && styles.completedInput]}
              value={set.weight?.toString() || ''}
              onChangeText={(value) => {
                const updatedExercises = [...exercises];
                updatedExercises[currentExerciseIndex].sets[setIndex].weight = parseFloat(value) || 0;
                setExercises(updatedExercises);
              }}
              keyboardType="numeric"
              editable={!isCompleted}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Rest</Text>
            <TextInput
              style={[styles.setInput, isCompleted && styles.completedInput]}
              value={set.rest_time?.toString() || ''}
              onChangeText={(value) => {
                const updatedExercises = [...exercises];
                updatedExercises[currentExerciseIndex].sets[setIndex].rest_time = parseInt(value) || 0;
                setExercises(updatedExercises);
              }}
              keyboardType="numeric"
              editable={!isCompleted}
              placeholder="60"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {isCompleted ? (
          <View style={styles.completedButton}>
            <Check size={20} color={colors.success} />
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.completeButton,
              !isCurrentSet && styles.disabledButton
            ]}
            onPress={() => completeSet(currentExerciseIndex, setIndex, set)}
            disabled={!isCurrentSet}
          >
            <Check size={20} color={isCurrentSet ? '#FFFFFF' : colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!template) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!exercises.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No exercises found for this workout template.</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={exitWorkout} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.workoutTitle}>{template.name}</Text>
          <Text style={styles.workoutTime}>{formatTime(workoutTime)}</Text>
        </View>

        <View style={styles.headerActions}>
          {!isWorkoutStarted ? (
            <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
              <Play size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.pauseButton} 
              onPress={isPaused ? resumeWorkout : pauseWorkout}
            >
              {isPaused ? (
                <Play size={20} color="#FFFFFF" />
              ) : (
                <Pause size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Exercise {currentExerciseIndex + 1} of {exercises.length}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Exercise */}
        <View style={styles.exerciseCard}>
          {/* Show YouTube video if available */}
          {currentExercise && template.exercises && template.exercises[currentExerciseIndex]?.exercise?.video_url ? (
            <YouTubePlayer video_url={template.exercises[currentExerciseIndex].exercise.video_url} />
          ) : null}
          <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>
          
          <View style={styles.setsContainer}>
            <View style={styles.setsHeader}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
              <Text style={styles.setHeaderText}>Weight</Text>
              <Text style={styles.setHeaderText}>Rest</Text>
              <Text style={styles.setHeaderText}>✓</Text>
            </View>
            
            {currentExercise.sets.map((_, setIndex) => 
              renderSetInput(currentExercise, setIndex)
            )}
          </View>

          {/* Exercise Notes */}
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Exercise Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={currentExercise.notes}
              onChangeText={(text) => {
                const updatedExercises = [...exercises];
                updatedExercises[currentExerciseIndex].notes = text;
                setExercises(updatedExercises);
              }}
              placeholder="Add notes about this exercise..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Exercise Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentExerciseIndex === 0 && styles.disabledNavButton
            ]}
            onPress={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
            disabled={currentExerciseIndex === 0}
          >
            <Text style={[
              styles.navButtonText,
              currentExerciseIndex === 0 && styles.disabledNavButtonText
            ]}>
              Previous Exercise
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentExerciseIndex === exercises.length - 1 && styles.disabledNavButton
            ]}
            onPress={() => setCurrentExerciseIndex(Math.min(exercises.length - 1, currentExerciseIndex + 1))}
            disabled={currentExerciseIndex === exercises.length - 1}
          >
            <Text style={[
              styles.navButtonText,
              currentExerciseIndex === exercises.length - 1 && styles.disabledNavButtonText
            ]}>
              Next Exercise
            </Text>
          </TouchableOpacity>
        </View>

        {/* Finish Workout Button */}
        <TouchableOpacity 
          style={styles.finishButton}
          onPress={() => setShowFinishModal(true)}
        >
          <Square size={20} color="#FFFFFF" />
          <Text style={styles.finishButtonText}>Finish Workout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Rest Timer Modal */}
      <Modal
        visible={showRestTimer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRestTimer(false)}
      >
        <View style={styles.restModalContainer}>
          <View style={styles.restModalContent}>
            <Text style={styles.restModalTitle}>Rest Time</Text>
            <Text style={styles.restTimer}>{formatTime(restTime)}</Text>
            
            <View style={styles.restActions}>
              <TouchableOpacity style={styles.skipRestButton} onPress={skipRestTimer}>
                <Text style={styles.skipRestText}>Skip Rest</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.addTimeButton}
                onPress={() => setRestTime(prev => prev + 30)}
              >
                <Plus size={20} color={colors.primary} />
                <Text style={styles.addTimeText}>+30s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finish Workout Modal */}
      <Modal
        visible={showFinishModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFinishModal(false)}
      >
        <SafeAreaView style={styles.finishModalContainer}>
          <View style={styles.finishModalHeader}>
            <TouchableOpacity onPress={() => setShowFinishModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.finishModalTitle}>Finish Workout</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.finishModalContent}>
            <Text style={styles.finishModalSubtitle}>
              Great job! Add any final notes about your workout.
            </Text>

            <View style={styles.workoutSummary}>
              <Text style={styles.summaryTitle}>Workout Summary</Text>
              <Text style={styles.summaryText}>Duration: {formatTime(workoutTime)}</Text>
              <Text style={styles.summaryText}>Exercises: {exercises.length}</Text>
              <Text style={styles.summaryText}>
                Sets Completed: {exercises.reduce((total, ex) => total + ex.sets.filter(s => s.completed).length, 0)}
              </Text>
            </View>

            <View style={styles.finalNotesContainer}>
              <Text style={styles.finalNotesLabel}>Workout Notes</Text>
              <TextInput
                style={styles.finalNotesInput}
                value={workoutNotes}
                onChangeText={setWorkoutNotes}
                placeholder="How did the workout feel? Any observations?"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          <View style={styles.finishModalActions}>
            <TouchableOpacity style={styles.saveWorkoutButton} onPress={finishWorkout}>
              <Text style={styles.saveWorkoutText}>Save Workout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 40,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  workoutTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
  },
  workoutTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    width: 40,
    alignItems: 'flex-end',
  },
  startButton: {
    backgroundColor: colors.success,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: colors.warning,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBackground: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseName: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  setsContainer: {
    marginBottom: 20,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  setHeaderText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  currentSetRow: {
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  completedSetRow: {
    backgroundColor: `${colors.success}10`,
  },
  setNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    width: 30,
    textAlign: 'center',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  setInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
    minWidth: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedInput: {
    backgroundColor: colors.borderLight,
    color: colors.textSecondary,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: colors.borderLight,
  },
  completedButton: {
    backgroundColor: colors.success,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notesContainer: {
    marginTop: 16,
  },
  notesLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  notesInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledNavButton: {
    backgroundColor: colors.borderLight,
  },
  navButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  disabledNavButtonText: {
    color: colors.textTertiary,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  finishButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  restModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  restModalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 20,
  },
  restTimer: {
    fontFamily: 'Inter-Bold',
    fontSize: 48,
    color: colors.primary,
    marginBottom: 30,
  },
  restActions: {
    flexDirection: 'row',
    gap: 16,
  },
  skipRestButton: {
    backgroundColor: colors.textSecondary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipRestText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addTimeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.primary,
    marginLeft: 4,
  },
  finishModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  finishModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  finishModalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
  },
  finishModalContent: {
    flex: 1,
    padding: 20,
  },
  finishModalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  workoutSummary: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  summaryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  finalNotesContainer: {
    marginBottom: 24,
  },
  finalNotesLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  finalNotesInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  finishModalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveWorkoutButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveWorkoutText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});