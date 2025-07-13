import { supabase } from './supabase';
import { WorkoutTemplate, TemplateExercise, Exercise, WorkoutSet } from '@/types/workout';

export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('workout_templates')
      .select(`
        *,
        exercises:template_exercises(
          order_index,
          sets_config,
          notes,
          exercise:exercise_id(*)
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching workout templates:', error);
      return [];
    }

    // Map the data to the WorkoutTemplate interface, ensuring exercises are correctly structured
    const templates: WorkoutTemplate[] = data.map((template: any) => ({
      ...template,
      exercises: template.exercises.map((te: any) => ({
        id: te.exercise.id, // Use exercise ID as the template exercise ID for simplicity
        template_id: template.id,
        exercise_id: te.exercise.id,
        exercise: te.exercise,
        order_index: te.order_index,
        sets_config: te.sets_config,
        notes: te.notes,
        created_at: te.created_at, // Assuming created_at is part of template_exercises
      })).sort((a: TemplateExercise, b: TemplateExercise) => a.order_index - b.order_index),
    }));

    return templates;
  } catch (error) {
    console.error('Exception fetching workout templates:', error);
    return [];
  }
}

export async function getWorkoutTemplatesForClient(clientId: string): Promise<WorkoutTemplate[]> {
  try {
    // First check if client has any templates
    const { data: clientTemplates, error: templatesError } = await supabase
      .from('workout_templates')
      .select(`
        *,
        exercises:template_exercises(
          order_index,
          sets_config,
          notes,
          exercise:exercise_id(*)
        )
      `)
      .eq('client_id', clientId)
      .order('name', { ascending: true });

    if (templatesError) {
      console.error('Error fetching client templates:', templatesError);
      return [];
    }

    // If no templates exist, create default ones for this client
    if (!clientTemplates || clientTemplates.length === 0) {
      await initializeDefaultTemplates();
      
      // After initialization, fetch the templates again
      const { data: newTemplates, error: newError } = await supabase
        .from('workout_templates')
        .select(`
          *,
          exercises:template_exercises(
            order_index,
            sets_config,
            notes,
            exercise:exercise_id(*)
          )
        `)
        .eq('client_id', clientId);

      if (newError) {
        console.error('Error fetching newly created templates:', newError);
        return [];
      }

      return newTemplates || [];
    }

    // Map the data to the WorkoutTemplate interface
    return clientTemplates.map((template: any) => ({
      ...template,
      exercises: template.exercises.map((te: any) => ({
        id: te.exercise.id,
        template_id: template.id,
        exercise_id: te.exercise.id,
        exercise: te.exercise,
        order_index: te.order_index,
        sets_config: te.sets_config,
        notes: te.notes,
        created_at: te.created_at,
      })).sort((a: TemplateExercise, b: TemplateExercise) => a.order_index - b.order_index),
    }));
  } catch (error) {
    console.error('Exception fetching client templates:', error);
    return [];
  }
}

export async function getWorkoutTemplate(templateId: string): Promise<WorkoutTemplate | null> {
  try {
    console.log('🔍 Fetching template with ID:', templateId);
    
    const { data, error } = await supabase
      .from('workout_templates')
      .select(`
        *,
        exercises:template_exercises(
          order_index,
          sets_config,
          notes,
          exercise:exercise_id(*)
        )
      `)
      .eq('id', templateId)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase error fetching workout template:', error);
      if (error.code === 'PGRST116') {
        console.log('❌ Template not found in database - ID may be invalid or template was deleted');
        // Let's check what templates are available
        const { data: allTemplates } = await supabase
          .from('workout_templates')
          .select('id, name')
          .limit(5);
        console.log('📋 Available templates:', allTemplates);
        return null;
      }
      return null;
    }
    
    if (!data) {
      console.log('❌ No template data found for ID:', templateId);
      return null;
    }

    console.log('✅ Template data found:', data.name);
    console.log('📊 Template exercises count:', data.exercises?.length || 0);

    // Map the data to the WorkoutTemplate interface
    const template: WorkoutTemplate = {
      ...data,
      exercises: data.exercises.map((te: any) => ({
        id: te.exercise.id, // Use exercise ID as the template exercise ID for simplicity
        template_id: data.id,
        exercise_id: te.exercise.id,
        exercise: te.exercise,
        order_index: te.order_index,
        sets_config: te.sets_config,
        notes: te.notes,
        created_at: te.created_at,
      })).sort((a: TemplateExercise, b: TemplateExercise) => a.order_index - b.order_index),
    };

    console.log('✅ Template mapped successfully:', template.name);
    return template;
  } catch (error) {
    console.error('❌ Exception fetching workout template:', error);
    return null;
  }
}

export async function initializeDefaultTemplates(): Promise<void> {
  try {
    // Check if any templates exist
    const { count, error: countError } = await supabase
      .from('workout_templates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error checking for existing templates:', countError);
      return;
    }

    if (count && count > 0) {
      console.log('Default workout templates already exist. Skipping initialization.');
      return;
    }

    console.log('Initializing default workout templates...');

    // Try to get a trainer profile for creating templates
    const { data: trainerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'trainer')
      .limit(1)
      .single();

    let createdBy = null;
    if (!profileError && trainerProfile) {
      createdBy = trainerProfile.id;
      console.log('Using trainer profile for template creation:', createdBy);
    } else {
      console.log('No trainer profile found, templates will be created without created_by');
    }

    // Define default exercises first
    const defaultExercisesData = [
      { name: 'Push-ups', category: 'Bodyweight', muscle_groups: ['Chest', 'Shoulders', 'Triceps'], instructions: 'Start in plank position, lower body to ground, push back up', equipment: 'None', is_public: true },
      { name: 'Squats', category: 'Bodyweight', muscle_groups: ['Quadriceps', 'Glutes', 'Hamstrings'], instructions: 'Stand with feet shoulder-width apart, lower hips back and down', equipment: 'None', is_public: true },
      { name: 'Bench Press', category: 'Strength', muscle_groups: ['Chest', 'Shoulders', 'Triceps'], instructions: 'Lie on bench, lower bar to chest, press up', equipment: 'Barbell, Bench', is_public: true },
      { name: 'Deadlift', category: 'Strength', muscle_groups: ['Hamstrings', 'Glutes', 'Back'], instructions: 'Stand with feet hip-width apart, lift bar from ground', equipment: 'Barbell', is_public: true },
      { name: 'Pull-ups', category: 'Bodyweight', muscle_groups: ['Back', 'Biceps'], instructions: 'Hang from bar, pull body up until chin over bar', equipment: 'Pull-up bar', is_public: true },
      { name: 'Plank', category: 'Core', muscle_groups: ['Core', 'Shoulders'], instructions: 'Hold plank position with straight body line', equipment: 'None', is_public: true },
      { name: 'Lunges', category: 'Bodyweight', muscle_groups: ['Quadriceps', 'Glutes', 'Hamstrings'], instructions: 'Step forward into lunge position, alternate legs', equipment: 'None', is_public: true },
      { name: 'Burpees', category: 'HIIT', muscle_groups: ['Full Body'], instructions: 'Squat down, jump back to plank, jump forward, jump up', equipment: 'None', is_public: true }
    ];

    // Insert exercises with conflict handling
    const { data: insertedExercises, error: insertExerciseError } = await supabase
      .from('exercises')
      .upsert(defaultExercisesData, { onConflict: 'name' })
      .select();

    if (insertExerciseError) {
      console.error('Error inserting default exercises:', insertExerciseError);
      return;
    }

    const exercisesMap = new Map<string, string>();
    insertedExercises?.forEach((ex: Exercise) => exercisesMap.set(ex.name, ex.id));

    const defaultTemplates = [
      {
        name: 'Upper Body Strength',
        description: 'Focus on building upper body strength with compound movements',
        category: 'Strength',
        estimated_duration_minutes: 60,
        created_by: createdBy,
        is_public: true,
        exercises_config: [
          { name: 'Bench Press', sets: [{ reps: 8, weight: 135, rest_time: 120 }, { reps: 8, weight: 135, rest_time: 120 }, { reps: 8, weight: 135, rest_time: 120 }], notes: 'Focus on controlled movement' },
          { name: 'Pull-ups', sets: [{ reps: 8, rest_time: 90 }, { reps: 8, rest_time: 90 }, { reps: 8, rest_time: 90 }], notes: 'Use assistance if needed' }
        ]
      },
      {
        name: 'Lower Body Power',
        description: 'Build explosive lower body strength and power',
        category: 'Strength',
        estimated_duration_minutes: 45,
        created_by: createdBy,
        is_public: true,
        exercises_config: [
          { name: 'Squats', sets: [{ reps: 12, weight: 185, rest_time: 120 }, { reps: 10, weight: 205, rest_time: 120 }, { reps: 8, weight: 225, rest_time: 120 }], notes: 'Progressive overload' },
          { name: 'Deadlift', sets: [{ reps: 5, weight: 275, rest_time: 180 }, { reps: 5, weight: 275, rest_time: 180 }, { reps: 5, weight: 275, rest_time: 180 }], notes: 'Focus on form over weight' }
        ]
      },
      {
        name: 'HIIT Cardio Blast',
        description: 'High-intensity interval training for cardiovascular fitness',
        category: 'Cardio',
        estimated_duration_minutes: 30,
        created_by: createdBy,
        is_public: true,
        exercises_config: [
          { name: 'Burpees', sets: [{ reps: 10, rest_time: 30 }, { reps: 10, rest_time: 30 }, { reps: 10, rest_time: 30 }, { reps: 10, rest_time: 30 }], notes: 'High intensity, short rest' },
          { name: 'Plank', sets: [{ duration: 60, rest_time: 30 }, { duration: 60, rest_time: 30 }, { duration: 60, rest_time: 30 }], notes: 'Hold strong core' }
        ]
      },
      {
        name: 'Full Body Functional',
        description: 'Functional movements for everyday strength',
        category: 'Functional',
        estimated_duration_minutes: 50,
        created_by: createdBy,
        is_public: true,
        exercises_config: [
          { name: 'Push-ups', sets: [{ reps: 12, rest_time: 60 }, { reps: 12, rest_time: 60 }, { reps: 12, rest_time: 60 }], notes: 'Maintain proper form' },
          { name: 'Squats', sets: [{ reps: 15, rest_time: 60 }, { reps: 15, rest_time: 60 }, { reps: 15, rest_time: 60 }], notes: 'Full range of motion' },
          { name: 'Pull-ups', sets: [{ reps: 6, rest_time: 90 }, { reps: 6, rest_time: 90 }, { reps: 6, rest_time: 90 }], notes: 'Assisted if necessary' }
        ]
      }
    ];

    for (const templateConfig of defaultTemplates) {
      const { exercises_config, ...templateData } = templateConfig;
      
      // Remove created_by if it's null to avoid foreign key constraint issues
      if (!templateData.created_by) {
        delete templateData.created_by;
      }
      
      const { data: insertedTemplate, error: insertTemplateError } = await supabase
        .from('workout_templates')
        .insert(templateData)
        .select()
        .single();

      if (insertTemplateError) {
        console.error('Error inserting default template:', insertTemplateError);
        continue;
      }

      const templateExercisesToInsert = exercises_config.map((exConfig: any, index: number) => ({
        template_id: insertedTemplate.id,
        exercise_id: exercisesMap.get(exConfig.name),
        order_index: index,
        sets_config: exConfig.sets,
        notes: exConfig.notes,
      }));

      const { error: insertTemplateExercisesError } = await supabase
        .from('template_exercises')
        .insert(templateExercisesToInsert);

      if (insertTemplateExercisesError) {
        console.error('Error inserting default template exercises:', insertTemplateExercisesError);
      }
    }
    console.log('Default workout templates initialized successfully.');
  } catch (error) {
    console.error('Exception initializing default templates:', error);
  }
}
