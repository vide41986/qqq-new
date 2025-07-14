import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Share,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Play, Clock, Dumbbell, Target, Settings, RotateCcw, Heart, Share2, Download, Zap, TrendingUp, RefreshCw, Star, MoveVertical as MoreVertical, Volume2, VolumeX, Pause } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router, useLocalSearchParams } from 'expo-router';
import { WorkoutTemplate, Exercise, WorkoutSet, TemplateExercise } from '@/types/workout';
import { getWorkoutTemplateById } from '@/lib/planDatabase';
import { formatDuration } from '@/utils/workoutUtils';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { getValidImageUrl, getExerciseImage as getExerciseImageUtil, getWorkoutImageByCategory } from '@/utils/imageUtils';

const { width, height } = Dimensions.get('window');

// Enhanced scroll animation constants
const HERO_HEIGHT = height * 0.40; // Changed from 0.45 to 0.35 for smaller height
const HERO_MIN_HEIGHT = height * 0.3;
const SCROLL_THRESHOLD = 200;
const PARALLAX_RATIO = 0.5;

interface ExerciseWithDetails extends Exercise {
  sets: number;
  reps: string;
  image: string;
  video_url?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  alternatives?: Exercise[];
  muscleGroups: string[];
  equipmentList: string[];
  section_title?: string;
}

interface WorkoutProgress {
  completedExercises: string[];
  currentExercise: number;
  totalTime: number;
  startTime?: Date;
}

export default function TodaysWorkoutScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);
  const { templateId } = useLocalSearchParams();

  // Core state
  const [workout, setWorkout] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<ExerciseWithDetails[]>([]);
  
  // Feature states
  const [isFavorite, setIsFavorite] = useState(false);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [progress, setProgress] = useState<WorkoutProgress>({
    completedExercises: [],
    currentExercise: 0,
    totalTime: 0,
  });
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);
  
  // Animation states
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(0));
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  
  // Enhanced scroll animation refs
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  
  // Animated values for enhanced scroll effects
  const heroHeightAnim = useRef(new Animated.Value(HERO_HEIGHT)).current;
  const heroOpacityAnim = useRef(new Animated.Value(1)).current;
  const headerOpacityAnim = useRef(new Animated.Value(0)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  // Performance optimization - memoized values
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => 
      difficulty === 'beginner' ? exercise.difficulty !== 'advanced' :
      difficulty === 'intermediate' ? true :
      exercise.difficulty === 'advanced'
    );
  }, [exercises, difficulty]);

  const equipment = useMemo(() => {
    return Array.from(new Set(filteredExercises.flatMap(ex => ex.equipmentList)));
  }, [filteredExercises]);

 
  const workoutStats = useMemo(() => {
    const totalSets = filteredExercises.reduce((sum, ex) => sum + ex.sets, 0);
    const estimatedCalories = Math.round(filteredExercises.length * 15 * (difficulty === 'advanced' ? 1.3 : difficulty === 'intermediate' ? 1.1 : 1));
    const progressPercentage = progress.completedExercises.length / filteredExercises.length * 100;
    
    return { totalSets, estimatedCalories, progressPercentage };
  }, [filteredExercises, difficulty, progress.completedExercises]);

  // Enhanced scroll animation setup
  const setupEnhancedScrollAnimation = useCallback(() => {
    const scrollListener = scrollY.addListener(({ value }) => {
      // Determine scroll direction
      const currentScrollY = value;
      const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
      scrollDirection.current = direction;
      lastScrollY.current = currentScrollY;

      // Calculate scroll progress (0 to 1)
      const scrollProgress = Math.min(Math.max(value / SCROLL_THRESHOLD, 0), 1);
      const inverseProgress = 1 - scrollProgress;

      // Enhanced hero height animation with easing
      const newHeroHeight = HERO_HEIGHT - (scrollProgress * (HERO_HEIGHT - HERO_MIN_HEIGHT));
      // console.log('heroHeightAnim:', newHeroHeight); // Debug log
      // Smooth parallax effect
      const parallaxOffset = value * PARALLAX_RATIO;
      // Dynamic opacity based on scroll progress
      const heroOpacity = Math.max(0.3, inverseProgress);
      const headerOpacity = scrollProgress > 0.5 ? (scrollProgress - 0.5) * 2 : 0;
      // Scale effect for image
      const imageScale = 1 + (scrollProgress * 0.1);
      // Blur effect intensity
      const blurIntensity = scrollProgress * 10;

      // Apply animations without blocking
      requestAnimationFrame(() => {
        heroHeightAnim.setValue(newHeroHeight);
        heroOpacityAnim.setValue(heroOpacity);
        headerOpacityAnim.setValue(headerOpacity);
        parallaxAnim.setValue(parallaxOffset);
        scaleAnim.setValue(imageScale);
        // blurAnim.setValue(blurIntensity);
      
      });
    });

    return () => {
      scrollY.removeListener(scrollListener);
    };
  }, [scrollY, heroHeightAnim, heroOpacityAnim, headerOpacityAnim, parallaxAnim, scaleAnim, blurAnim]);

  // Enhanced scroll to top functionality
  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    
    // Animate back to initial state
    Animated.parallel([
      Animated.spring(heroHeightAnim, {
        toValue: HERO_HEIGHT,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(heroOpacityAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(headerOpacityAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(parallaxAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, [heroHeightAnim, heroOpacityAnim, headerOpacityAnim, parallaxAnim, scaleAnim]);

  useEffect(() => {
    loadWorkout();
    startAnimations();
    
    // Setup enhanced scroll animation
    const cleanup = setupEnhancedScrollAnimation();
    
    return cleanup;
  }, [setupEnhancedScrollAnimation]);

  useEffect(() => {
    if (workout) {
      console.log('Saving progress:', progress);
    }
  }, [progress, workout]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const loadWorkout = async () => {
    try {
      setLoading(true);
      const template = await getWorkoutTemplateById(templateId as string);
      if (template) {
        setWorkout(template);
        
        // Debug: Log the template structure
        console.log('Template structure:', template);
        console.log('Template exercises:', template.exercises);
        
        const exercisesWithDetails: ExerciseWithDetails[] = template.exercises.map((templateExercise: TemplateExercise, index: number) => {
          // Debug: Log each template exercise to see its structure
          console.log('Template Exercise:', templateExercise);
          console.log('Template Exercise keys:', Object.keys(templateExercise));
          
          // Check all possible locations for section_title
          const possibleSectionTitle =
            templateExercise.section_title ||
            (templateExercise.exercise && templateExercise.exercise.section_title) ||
            'Main Workout';
          
          console.log('Found section title:', possibleSectionTitle);
          
          let setsConfig = templateExercise.sets_config;
          
          if (setsConfig === null || setsConfig === undefined) {
            setsConfig = [
              { reps: 10, weight: 0, rest_time: 60 },
              { reps: 10, weight: 0, rest_time: 60 },
              { reps: 10, weight: 0, rest_time: 60 }
            ];
          } else if (typeof setsConfig === 'string') {
            try {
              setsConfig = JSON.parse(setsConfig);
            } catch (parseError) {
              setsConfig = [
                { reps: 10, weight: 0, rest_time: 60 },
                { reps: 10, weight: 0, rest_time: 60 },
                { reps: 10, weight: 0, rest_time: 60 }
              ];
            }
          }
          
          if (!Array.isArray(setsConfig)) {
            setsConfig = [
              { reps: 10, weight: 0, rest_time: 60 },
              { reps: 10, weight: 0, rest_time: 60 },
              { reps: 10, weight: 0, rest_time: 60 }
            ];
          }
          
          const { section_title: _omit, ...exerciseRest } = templateExercise.exercise;
          
          const mappedExercise = {
            ...exerciseRest,
            id: `${templateExercise.id}-${templateExercise.exercise.id}`,
            sets: setsConfig.length,
            reps: setsConfig.map((set: WorkoutSet) => set.reps || 10).filter(Boolean).join(', ') || '10',
            image: getExerciseImageUtil(templateExercise.exercise.name, index),
            video_url: templateExercise.exercise.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4',
            difficulty: (templateExercise.exercise.difficulty_level || 'intermediate').toLowerCase(),
            alternatives: getExerciseAlternatives(templateExercise.exercise),
            muscleGroups: Array.isArray(templateExercise.exercise.muscle_groups) && templateExercise.exercise.muscle_groups.length > 0
              ? templateExercise.exercise.muscle_groups
              : getMuscleGroups(templateExercise.exercise.category),
            equipmentList: Array.isArray(templateExercise.exercise.equipment)
              ? templateExercise.exercise.equipment
              : (typeof templateExercise.exercise.equipment === 'string' && templateExercise.exercise.equipment)
                ? [templateExercise.exercise.equipment]
                : getRequiredEquipment(templateExercise.exercise.name),
            section_title: possibleSectionTitle, // Use our determined section title
          };
          
          console.log('Mapped exercise with section:', {
            name: mappedExercise.name,
            section_title: mappedExercise.section_title,
          });
          
          return mappedExercise;
        });
        
        console.log('All exercises with sections:', exercisesWithDetails.map(ex => ({
          name: ex.name,
          section_title: ex.section_title
        })));
        
        setExercises(exercisesWithDetails);
        await loadSavedData(template.id);
      }
    } catch (error) {
      console.error('Error loading workout:', error);
      Alert.alert('Error', 'Failed to load workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const loadSavedData = async (workoutId: string) => {
    try {
      setIsFavorite(Math.random() > 0.5);
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const getExerciseImage = (exerciseName: string, index: number): string => {
    const images = [
      'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1552106/pexels-photo-1552106.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/3822356/pexels-photo-3822356.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1431282/pexels-photo-1431282.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/3289711/pexels-photo-3289711.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&cs=tinysrgb&w=400',
    ];
    return images[index % images.length];
  };

  const getDifficultyLevel = (exerciseName: string): 'beginner' | 'intermediate' | 'advanced' => {
    const advanced = ['deadlift', 'squat', 'bench press', 'overhead press'];
    const beginner = ['pushup', 'plank', 'wall sit', 'bodyweight'];
    
    const name = exerciseName.toLowerCase();
    if (advanced.some(ex => name.includes(ex))) return 'advanced';
    if (beginner.some(ex => name.includes(ex))) return 'beginner';
    return 'intermediate';
  };

  const getExerciseAlternatives = (exercise: Exercise): Exercise[] => {
    return [
      { ...exercise, name: `${exercise.name} (Modified)`, id: `${exercise.id}-alt1` },
      { ...exercise, name: `${exercise.name} (Beginner)`, id: `${exercise.id}-alt2` },
    ];
  };

  const getMuscleGroups = (category: string): string[] => {
    const muscleMap: { [key: string]: string[] } = {
      'chest': ['Pectorals', 'Anterior Deltoids', 'Triceps'],
      'back': ['Latissimus Dorsi', 'Rhomboids', 'Biceps'],
      'legs': ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
      'shoulders': ['Deltoids', 'Trapezius', 'Rotator Cuff'],
      'arms': ['Biceps', 'Triceps', 'Forearms'],
      'core': ['Rectus Abdominis', 'Obliques', 'Transverse Abdominis'],
    };
    return muscleMap[category.toLowerCase()] || ['Full Body'];
  };

  const getRequiredEquipment = (exerciseName: string): string[] => {
    const name = exerciseName.toLowerCase();
    if (name.includes('barbell')) return ['Barbell', 'Weight Plates'];
    if (name.includes('dumbbell')) return ['Dumbbells'];
    if (name.includes('cable')) return ['Cable Machine'];
    if (name.includes('bodyweight') || name.includes('pushup') || name.includes('plank')) return ['None'];
    return ['Dumbbells'];
  };

  const handleStartWorkout = () => {
    triggerHaptic();
    if (workout) {
      setProgress(prev => ({
        ...prev,
        startTime: new Date(),
      }));
      router.push(`/start-workout/${workout.id}`);
    }
  };

  const handleFavoriteToggle = async () => {
    triggerHaptic();
    setIsFavorite(!isFavorite);
    
    try {
      Alert.alert(
        isFavorite ? 'Removed from Favorites' : 'Added to Favorites',
        isFavorite ? 'Workout removed from your favorites' : 'Workout added to your favorites'
      );
    } catch (error) {
      console.error('Error saving favorite:', error);
    }
  };

  const handleShare = async () => {
    triggerHaptic();
    try {
      const message = `Check out this workout: ${workout?.name}\n${filteredExercises.length} exercises • ${workout?.estimated_duration_minutes} minutes\n\nDownload the app to try it!`;
      
      await Share.share({
        message,
        title: workout?.name || 'Workout',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownloadOffline = async () => {
    triggerHaptic();
    setIsOfflineMode(true);
    
    Alert.alert(
      'Download Started',
      'Workout is being downloaded for offline use...',
      [
        {
          text: 'OK',
          onPress: () => {
            setTimeout(() => {
              Alert.alert('Download Complete', 'Workout is now available offline!');
            }, 2000);
          }
        }
      ]
    );
  };

  const handleExerciseComplete = (exerciseId: string) => {
    triggerHaptic();
    setProgress(prev => ({
      ...prev,
      completedExercises: [...prev.completedExercises, exerciseId],
      currentExercise: prev.currentExercise + 1,
    }));
  };

  const handleShowAlternatives = (exerciseId: string) => {
    triggerHaptic();
    setShowAlternatives(showAlternatives === exerciseId ? null : exerciseId);
  };

  const renderDifficultySelector = () => (
    <View style={styles.difficultySelector}>
      <View style={styles.difficultyButtons}>
        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.difficultyButton,
              difficulty === level && styles.difficultyButtonActive
            ]}
            onPress={() => {
              triggerHaptic();
              setDifficulty(level);
            }}
          >
            <Text style={[
              styles.difficultyButtonText,
              difficulty === level && styles.difficultyButtonTextActive
            ]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Workout Progress</Text>
        <Text style={styles.progressText}>
          {progress.completedExercises.length}/{filteredExercises.length} exercises
        </Text>
      </View>
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill,
            { 
              width: `${workoutStats.progressPercentage}%`,
              opacity: fadeAnim,
            }
          ]} 
        />
      </View>
    </View>
  );

  const renderWorkoutStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Dumbbell size={20} color={colors.primary} />
        <Text style={styles.statValue}>{workoutStats.totalSets}</Text>
        <Text style={styles.statLabel}>Total Sets</Text>
      </View>
      <View style={styles.statItem}>
        <Zap size={20} color={colors.warning} />
        <Text style={styles.statValue}>{workoutStats.estimatedCalories}</Text>
        <Text style={styles.statLabel}>Est. Calories</Text>
      </View>
      <View style={styles.statItem}>
        <TrendingUp size={20} color={colors.success} />
        <Text style={styles.statValue}>{Math.round(workoutStats.progressPercentage)}%</Text>
        <Text style={styles.statLabel}>Complete</Text>
      </View>
    </View>
  );

  const renderEquipmentItem = (equipment: string, index: number) => (
    <Animated.View 
      key={`equipment-${equipment}-${index}`} 
      style={[
        styles.equipmentItem,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })
          }]
        }
      ]}
    >
      <Text style={styles.equipmentIcon}>
        {equipment === 'Barbell' ? '🏋️' : 
         equipment === 'Dumbbells' ? '🏋️‍♀️' : 
         equipment === 'Cable Machine' ? '🔗' : 
         equipment === 'None' ? '💪' : '🏋️'}
      </Text>
      <Text style={styles.equipmentName}>{equipment}</Text>
    </Animated.View>
  );

  const renderExerciseItem = (exercise: ExerciseWithDetails, index: number) => {
    const isCompleted = progress.completedExercises.includes(exercise.id);
    const showingAlternatives = showAlternatives === exercise.id;

    return (
      <Animated.View
        key={exercise.id}
        style={[
          styles.exerciseItem,
          isCompleted && styles.exerciseItemCompleted,
          {
            opacity: fadeAnim,
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.exerciseContent}
          onPress={() => {
            Alert.alert('Exercise Video', `Would you like to watch the video for ${exercise.name}?`);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.exerciseImageContainer}>
            <Image 
              source={{ uri: exercise.image }} 
              style={styles.exerciseImage}
              onLoad={() => setHeroImageLoaded(true)}
            />
            <View style={styles.exercisePlayButton}>
              <Play size={16} color="#FFFFFF" />
            </View>
            {isCompleted && (
              <View style={styles.exerciseCompletedBadge}>
                <Text style={styles.exerciseCompletedText}>✓</Text>
              </View>
            )}
          </View>
          
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseDetails}>
              {exercise.reps} reps • {exercise.sets} sets
            </Text>
            <Text style={styles.exerciseEquipment}>
              Equipment: {exercise.equipmentList.join(', ')}
            </Text>
            <View style={styles.exerciseMeta}>
              <Text style={styles.exerciseCategory}>{exercise.category}</Text>
              <View style={styles.exerciseDifficulty}>
                <Text style={[
                  styles.exerciseDifficultyText,
                  { color: 
                    exercise.difficulty === 'beginner' ? colors.success :
                    exercise.difficulty === 'intermediate' ? colors.warning :
                    colors.error
                  }
                ]}>
                  {exercise.difficulty}
                </Text>
              </View>
            </View>
            <View style={styles.muscleGroups}>
              {exercise.muscleGroups.slice(0, 2).map((muscle, idx) => (
                <Text key={`${exercise.id}-muscle-${idx}`} style={styles.muscleGroupTag}>{muscle}</Text>
              ))}
            </View>
          </View>
          
          <View style={styles.exerciseActions}>
            <TouchableOpacity
              style={styles.exerciseActionButton}
              onPress={() => handleShowAlternatives(exercise.id)}
            >
              <RefreshCw size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exerciseActionButton}
              onPress={() => handleExerciseComplete(exercise.id)}
              disabled={isCompleted}
            >
              <Text style={[
                styles.exerciseSetCount,
                isCompleted && styles.exerciseSetCountCompleted
              ]}>
                {isCompleted ? '✓' : `x${exercise.sets}`}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {showingAlternatives && exercise.instructions && (
          <Animated.View style={styles.alternativesContainer}>
            <Text style={styles.alternativesTitle}>Instruction:</Text>
            <Text style={styles.alternativeInstructions}>{exercise.instructions}</Text>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const renderExerciseSection = (sectionTitle: string, exercises: ExerciseWithDetails[], sectionIndex: number) => {
    return (
      <View key={`${sectionTitle}-${sectionIndex}`} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <Text style={styles.sectionSubtitle}>
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} • {difficulty} level
          </Text>
        </View>
        {exercises.map(renderExerciseItem)}
      </View>
    );
  };

  // Enhanced floating header that appears on scroll
 

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Workout not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      
      {/* Enhanced Hero Section with Advanced Scroll Animation */}
      <Animated.View style={[styles.heroSection, { height: heroHeightAnim }]}> 
        
        <Image 
          source={{ uri: getValidImageUrl(workout.thumbnail_url || workout.image_url || 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800') }}
          style={styles.heroImage}
          onLoad={() => setHeroImageLoaded(true)}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.heroGradient}
        />
        <SafeAreaView style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity 
                onPress={() => setSoundEnabled(!soundEnabled)} 
                style={styles.heroActionButton}
              >
                {soundEnabled ? (
                  <Volume2 size={20} color="#FFFFFF" />
                ) : (
                  <VolumeX size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFavoriteToggle} style={styles.heroActionButton}>
                <Heart 
                  size={20} 
                  color={isFavorite ? colors.error : colors.textSecondary} 
                  fill={isFavorite ? colors.error : "none"}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.heroActionButton}>
                <Share2 size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDownloadOffline} style={styles.heroActionButton}>
                <Download size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={[
            styles.heroInfo,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                })
              }]
            }
          ]}>
            <Text style={styles.heroTitle}>{workout.name}</Text>
            <Text style={styles.heroCategory}>{workout.category || 'No category'}</Text>
            <Text style={styles.heroSubtitle}>{workout.description}</Text>
            
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Clock size={16} color="#FFFFFF" />
                <Text style={styles.heroStatText}>{workout.estimated_duration_minutes} min</Text>
              </View>
              <View style={styles.heroStat}>
                <Dumbbell size={16} color="#FFFFFF" />
                <Text style={styles.heroStatText}>{filteredExercises.length} exercises</Text>
              </View>
              <View style={styles.heroStat}>
                <Target size={16} color="#FFFFFF" />
                <Text style={styles.heroStatText}>{difficulty}</Text>
              </View>
            </View>

            {/* Start Workout button in hero section */}
            <Animated.View
              style={{
                opacity: headerOpacityAnim.interpolate({
                  inputRange: [0, 0.1],
                  outputRange: [1, 0],
                }),
              }}
            >
              <TouchableOpacity 
                style={styles.heroStartButton}
                onPress={handleStartWorkout}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.heroStartButtonGradient}
                >
                  <Play size={20} color="#FFFFFF" />
                  <Text style={styles.heroStartButtonText}>Start Workout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>

      {/* Floating Header */}
      {/* {renderFloatingHeader()} */}

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: false,
            listener: (event) => {
              // Additional scroll handling can be added here
            }
          }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          {/* Progress Section */}
          {progress.completedExercises.length > 0 && renderProgressBar()}

          {/* Workout Stats */}
          {renderWorkoutStats()}

          {/* Difficulty Selector */}
          {renderDifficultySelector()}

          {/* Equipment Required */}
          {equipment.length > 0 && (
            <View style={styles.equipmentSection}>
              <Text style={styles.sectionTitle}>Equipment Required</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.equipmentList}
              >
                {equipment.map(renderEquipmentItem)}
              </ScrollView>
            </View>
          )}

          {/* Exercise Sections */}
          {filteredExercises.map((exercise, index) => (
  <View key={exercise.id || index} style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {exercise.section_title || 'No Section Title'}
      </Text>
      <Text style={styles.sectionSubtitle}>
        Level: {exercise.difficulty}
      </Text>
    </View>
    {renderExerciseItem(exercise, index)}
  </View>
))}

          {/* Offline Mode Indicator */}
          {isOfflineMode && (
            <View style={styles.offlineIndicator}>
              <Text style={styles.offlineText}>
                📱 Available Offline
              </Text>
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      {/* Floating Action Button for Start Workout */}
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.fabContainer,
          {
            opacity: headerOpacityAnim,
            transform: [{
              scale: headerOpacityAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              })
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleStartWorkout}
          activeOpacity={0.85}
        >
          <Play size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

     
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroSection: {
    width: '100%',
    zIndex: 1,
    overflow: 'hidden',
    backgroundColor: colors.background,
    flexDirection: 'column',
    position: 'relative', // Add this
  },
  heroImageContainer: {
    width: '100%',
    height: '100%',
    flex: 1,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  heroContent: {
    position: 'absolute', // Add this
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8, // Reduced from 20
    paddingBottom: 12, // Reduced from 30
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroCategory: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  favoriteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  floatingHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  floatingHeaderBackButton: {
    marginRight: 16,
  },
  floatingHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  floatingHeaderFavoriteButton: {
    marginRight: 16,
  },
  floatingHeaderAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  floatingHeaderActionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background, // Ensure content covers hero image
  },
  content: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: colors.background, // Ensure content covers hero image
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12, // was 20
    marginBottom: 16, // was 24
  },
  statItem: {
    alignItems: 'center',
    gap: 4, // was 8
  },
  statValue: {
    fontSize: 16, // was 24
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10, // was 12
    color: colors.textSecondary,
  },
  difficultySelector: {
    marginBottom: 24,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: colors.primary,
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  difficultyButtonTextActive: {
    color: '#FFFFFF',
  },
  equipmentSection: {
    marginBottom: 24,
  },
  equipmentList: {
    marginTop: 12,
  },
  equipmentItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 80,
  },
  equipmentIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  equipmentName: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  exerciseItem: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  exerciseItemCompleted: {
    backgroundColor: colors.successLight,
    borderWidth: 2,
    borderColor: colors.success,
  },
  exerciseContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  exerciseImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  exercisePlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCompletedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseCompletedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  exerciseEquipment: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  exerciseCategory: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  exerciseDifficulty: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  exerciseDifficultyText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  muscleGroups: {
    flexDirection: 'row',
    gap: 6,
  },
  muscleGroupTag: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exerciseActions: {
    alignItems: 'center',
    gap: 8,
  },
  exerciseActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseSetCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseSetCountCompleted: {
    color: colors.success,
  },
  alternativesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  alternativeItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.border,
    borderRadius: 8,
    marginBottom: 8,
  },
  alternativeName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  alternativeInstructions: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  offlineIndicator: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: 20,
  },
  offlineText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  startButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  heroStartButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    width: 140,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  heroStartButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  heroStartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    zIndex: 20,
    elevation: 10,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});