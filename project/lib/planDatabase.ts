
import { supabase } from './supabase';
import { WorkoutPlan, PlanSession, WorkoutTemplate } from '@/types/workout';
import { Alert } from 'react-native';

export interface WorkoutTemplateForPlan {
  id: string;
  name: string;
  category: string;
  estimated_duration_minutes: number;
}

export interface ClientProfile {
  id: string;
  full_name: string;
  email: string;
  avatar?: string;
  created_at?: string;
}

async function getCurrentUserProfileId(): Promise<string> {
  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (error || !profile) {
    throw new Error('User profile not found');
  }
  return profile.id;
}

export async function getTrainerClients(): Promise<ClientProfile[]> {
  try {
    const trainerProfileId = await getCurrentUserProfileId();

    const { data, error } = await supabase
      .from('client_assignments')
      .select('client_id, profiles!client_assignments_client_id_fkey(id, full_name, email)')
      .eq('trainer_id', trainerProfileId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching trainer clients:', error);
      throw error;
    }

    return data.map(assignment => (assignment.profiles as unknown) as ClientProfile);
  } catch (error) {
    console.error('Error in getTrainerClients:', error);
    throw error;
  }
}

export async function getWorkoutTemplatesForPlans(): Promise<WorkoutTemplateForPlan[]> {
  try {
    const userProfileId = await getCurrentUserProfileId();
    const { data, error } = await supabase
      .from('workout_templates')
      .select('id, name, category, estimated_duration_minutes')
      .or(`is_public.eq.true,created_by.eq.${userProfileId}`);

    if (error) {
      console.error('Error fetching workout templates:', error);
      throw error;
    }

    return data as WorkoutTemplateForPlan[];
  } catch (error) {
    console.error('Error in getWorkoutTemplatesForPlans:', error);
    throw error;
  }
}

export async function createWorkoutPlan(planData: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<WorkoutPlan | null> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .insert(planData)
      .select()
      .single();

    if (error) {
      console.error('Error creating workout plan:', error);
      throw error;
    }

    return data as WorkoutPlan;
  } catch (error) {
    console.error('Error in createWorkoutPlan:', error);
    throw error;
  }
}

export async function updateWorkoutPlan(planId: string, planData: Partial<Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>>): Promise<WorkoutPlan | null> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .update(planData)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workout plan:', error);
      throw error;
    }

    return data as WorkoutPlan;
  } catch (error) {
    console.error('Error in updateWorkoutPlan:', error);
    throw error;
  }
}

export async function getWorkoutPlan(planId: string): Promise<WorkoutPlan | null> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching workout plan:', error);
      throw error;
    }

    return data as WorkoutPlan;
  } catch (error) {
    console.error('Error in getWorkoutPlan:', error);
    throw error;
  }
}

export async function getClientPlans(clientId: string): Promise<WorkoutPlan[]> {
  try {
    console.log('🔍 Fetching plans for client:', clientId);
    
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching client plans:', error);
      throw error;
    }

    console.log('✅ Found plans for client:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('📋 Plans:', data.map(plan => ({
        id: plan.id,
        name: plan.name,
        status: plan.status,
        start_date: plan.start_date,
        end_date: plan.end_date,
        schedule_data: plan.schedule_data
      })));
    }

    return data as WorkoutPlan[] || [];
  } catch (error) {
    console.error('❌ Exception in getClientPlans:', error);
    throw error;
  }
}

export async function createPlanSessions(sessions: Omit<PlanSession, 'id' | 'created_at' | 'updated_at'>[]): Promise<PlanSession[] | null> {
  try {
    const { data, error } = await supabase
      .from('plan_sessions')
      .insert(sessions)
      .select();

    if (error) {
      console.error('Error creating plan sessions:', error);
      throw error;
    }

    return data as PlanSession[];
  } catch (error) {
    console.error('Error in createPlanSessions:', error);
    throw error;
  }
}

export async function deletePlanSessions(planId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('plan_sessions')
      .delete()
      .eq('plan_id', planId);

    if (error) {
      console.error('Error deleting plan sessions:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deletePlanSessions:', error);
    throw error;
  }
}


export async function createSampleClientAssignment(): Promise<boolean> {
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return false;
    }

    const { data: trainerProfile, error: trainerProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'trainer')
      .single();

    if (trainerProfileError || !trainerProfile) {
      Alert.alert('Error', 'Trainer profile not found. Please ensure you are logged in as a trainer.');
      return false;
    }

    const { data: existingClient, error: existingClientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'sampleclient@vinayfit.com')
      .single();

    let sampleClientId;
    if (existingClient) {
      sampleClientId = existingClient.id;
    } else {
      const { data: newClient, error: newClientError } = await supabase
        .from('profiles')
        .insert({
          email: 'sampleclient@vinayfit.com',
          full_name: 'Sample Client',
          role: 'client',
        })
        .select('id')
        .single();

      if (newClientError || !newClient) {
        console.error('Error creating sample client:', newClientError);
        Alert.alert('Error', 'Failed to create sample client.');
        return false;
      }
      sampleClientId = newClient.id;
    }

    const { data: existingAssignment, error: assignmentCheckError } = await supabase
      .from('client_assignments')
      .select('id')
      .eq('client_id', sampleClientId)
      .eq('trainer_id', trainerProfile.id)
      .single();

    if (existingAssignment) {
      Alert.alert('Info', 'Sample client already assigned to you.');
      return true;
    }

    const { error: assignmentError } = await supabase
      .from('client_assignments')
      .insert({
        client_id: sampleClientId,
        trainer_id: trainerProfile.id,
        assigned_by: trainerProfile.id,
        status: 'active',
      });

    if (assignmentError) {
      console.error('Error creating sample client assignment:', assignmentError);
      Alert.alert('Error', 'Failed to create sample client assignment.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in createSampleClientAssignment:', error);
    Alert.alert('Error', 'An unexpected error occurred while creating sample client assignment.');
    return false;
  }
}

export async function getWorkoutPlans(): Promise<WorkoutPlan[]> {
  try {
    const profile = await getCurrentUserProfileId();
    if (!profile) {
      console.log('❌ No profile found for plans');
      return [];
    }

    let query = supabase.from('workout_plans').select('*');

    // Assuming profile.id is the user's profile ID, not auth.uid()
    // You might need to adjust this based on how your profiles table is structured
    // and how user roles are managed.
    // For now, let's assume a user can only see plans where they are the client or the trainer.
    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', profile)
      .single();

    if (userProfileError || !userProfile) {
      console.error('Error fetching user profile for plan access:', userProfileError);
      return [];
    }

    if (userProfile.role === 'trainer') {
      query = query.eq('trainer_id', profile);
    } else if (userProfile.role === 'client') {
      query = query.eq('client_id', profile);
    } else {
      console.log('❌ Not a trainer or client, cannot fetch plans');
      return [];
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching workout plans:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('💥 Unexpected error in getWorkoutPlans:', error);
    return [];
  }
}

export async function deleteWorkoutPlan(planId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting workout plan:', planId);
    
    const profileId = await getCurrentUserProfileId();
    
    // Verify user is the trainer of this plan
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .select('trainer_id')
      .eq('id', planId)
      .single();

    if (planError || !plan || plan.trainer_id !== profileId) {
      console.log('❌ User is not authorized to delete this plan or plan not found');
      return false;
    }

    // First delete associated sessions
    await deletePlanSessions(planId);

    // Then delete the plan
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('Error deleting workout plan:', error);
      return false;
    }

    console.log('✅ Successfully deleted workout plan');
    return true;
  } catch (error) {
    console.error('💥 Unexpected error in deleteWorkoutPlan:', error);
    return false;
  }
}

export async function getWorkoutTemplateById(id: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('workout_templates')
      .select(`
        *,
        exercises:template_exercises (
          id,
          order_index,
          sets_config,
          notes,
          exercise:exercises (
            id,
            name,
            category,
            muscle_groups,
            instructions,
            equipment,
            image_url,
            video_url
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching workout template:', error);
    }
    if (!data) {
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error in getWorkoutTemplateById:', error);
    return null;
  }
}

export async function getTemplateExercisesByTemplateId(templateId: string) {
  const { data, error } = await supabase
    .from('template_exercises')
    .select(`
      id,
      order_index,
      sets_config,
      notes,
      exercise:exercises (
        id,
        name,
        category,
        muscle_groups,
        instructions,
        equipment,
        image_url,
        video_url
      )
    `)
    .eq('template_id', templateId)
    .order('order_index', { ascending: true });
  if (error) {
    console.error('Error fetching template exercises:', error);
    return [];
  }
  return data || [];
}

export async function cleanupInvalidTemplateIds(clientId: string): Promise<void> {
  try {
    console.log('🧹 Cleaning up invalid template IDs for client:', clientId);
    
    // Get all plans for the client
    const { data: plans, error: plansError } = await supabase
      .from('workout_plans')
      .select('id, name, schedule_data')
      .eq('client_id', clientId);

    if (plansError) {
      console.error('❌ Error fetching plans for cleanup:', plansError);
      return;
    }

    if (!plans || plans.length === 0) {
      console.log('📝 No plans found for cleanup');
      return;
    }

    // Get all valid template IDs
    const { data: validTemplates, error: templatesError } = await supabase
      .from('workout_templates')
      .select('id');

    if (templatesError) {
      console.error('❌ Error fetching valid templates:', templatesError);
      return;
    }

    const validTemplateIds = new Set(validTemplates?.map(t => t.id) || []);
    console.log('✅ Valid template IDs:', Array.from(validTemplateIds));

    // Clean up each plan's schedule
    for (const plan of plans) {
      if (!plan.schedule_data) continue;

      let hasChanges = false;
      const cleanedSchedule = { ...plan.schedule_data };

      // Check each day in the schedule
      Object.keys(cleanedSchedule).forEach(day => {
        const templateId = cleanedSchedule[day];
        if (templateId && !validTemplateIds.has(templateId)) {
          console.log(`❌ Invalid template ID found in plan ${plan.name}, day ${day}: ${templateId}`);
          cleanedSchedule[day] = null;
          hasChanges = true;
        }
      });

      // Update the plan if changes were made
      if (hasChanges) {
        console.log(`🔄 Updating plan ${plan.name} with cleaned schedule`);
        const { error: updateError } = await supabase
          .from('workout_plans')
          .update({ schedule_data: cleanedSchedule })
          .eq('id', plan.id);

        if (updateError) {
          console.error(`❌ Error updating plan ${plan.name}:`, updateError);
        } else {
          console.log(`✅ Successfully updated plan ${plan.name}`);
        }
      }
    }

    console.log('🏁 Finished cleaning up invalid template IDs');
  } catch (error) {
    console.error('❌ Error in cleanupInvalidTemplateIds:', error);
  }
}

export async function fixPlanTemplateId(planId: string, dayOfWeek: string): Promise<void> {
  try {
    console.log(`🔧 Fixing template ID for plan ${planId}, day ${dayOfWeek}`);
    
    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .select('schedule_data')
      .eq('id', planId)
      .single();

    if (planError) {
      console.error('❌ Error fetching plan:', planError);
      return;
    }

    if (!plan || !plan.schedule_data) {
      console.log('📝 No schedule data found for plan');
      return;
    }

    // Set the template ID to null for the specific day
    const updatedSchedule = { ...plan.schedule_data };
    updatedSchedule[dayOfWeek] = null;

    console.log(`🔄 Updating plan schedule for ${dayOfWeek}:`, updatedSchedule);

    const { error: updateError } = await supabase
      .from('workout_plans')
      .update({ schedule_data: updatedSchedule })
      .eq('id', planId);

    if (updateError) {
      console.error('❌ Error updating plan:', updateError);
    } else {
      console.log('✅ Successfully fixed plan template ID');
    }
  } catch (error) {
    console.error('❌ Error in fixPlanTemplateId:', error);
  }
}

export async function validateTemplateIds(templateIds: string[]): Promise<{ valid: string[], invalid: string[] }> {
  try {
    console.log('🔍 Validating template IDs:', templateIds);
    
    if (templateIds.length === 0) {
      return { valid: [], invalid: [] };
    }

    const { data: templates, error } = await supabase
      .from('workout_templates')
      .select('id')
      .in('id', templateIds);

    if (error) {
      console.error('❌ Error validating template IDs:', error);
      return { valid: [], invalid: templateIds };
    }

    const validIds = templates?.map(t => t.id) || [];
    const invalidIds = templateIds.filter(id => !validIds.includes(id));

    console.log('✅ Valid template IDs:', validIds);
    console.log('❌ Invalid template IDs:', invalidIds);

    return { valid: validIds, invalid: invalidIds };
  } catch (error) {
    console.error('❌ Error in validateTemplateIds:', error);
    return { valid: [], invalid: templateIds };
  }
}

export async function getAllTemplateIds(): Promise<string[]> {
  try {
    const { data: templates, error } = await supabase
      .from('workout_templates')
      .select('id, name, created_by');

    if (error) {
      console.error('❌ Error fetching all template IDs:', error);
      return [];
    }

    console.log('📋 All available templates:', templates?.map(t => ({ id: t.id, name: t.name, created_by: t.created_by })));
    return templates?.map(t => t.id) || [];
  } catch (error) {
    console.error('❌ Error in getAllTemplateIds:', error);
    return [];
  }
}

export async function createMissingTemplate(templateId: string): Promise<boolean> {
  try {
    console.log('🔧 Creating missing template with ID:', templateId);
    
    // Check if template already exists
    const { data: existingTemplate } = await supabase
      .from('workout_templates')
      .select('id')
      .eq('id', templateId)
      .maybeSingle();
    
    if (existingTemplate) {
      console.log('✅ Template already exists');
      return true;
    }
    
    // Get a trainer profile for creating the template
    const { data: trainerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'trainer')
      .limit(1)
      .single();
    
    // Create a basic template
    const templateData = {
      id: templateId,
      name: 'Recovery Workout',
      description: 'Light recovery workout for active rest days',
      category: 'Recovery',
      estimated_duration_minutes: 30,
      created_by: trainerProfile?.id || null,
      is_public: true,
    };
    
    const { data: template, error: templateError } = await supabase
      .from('workout_templates')
      .insert(templateData)
      .select()
      .single();
    
    if (templateError) {
      console.error('❌ Error creating template:', templateError);
      return false;
    }
    
    // Get some basic exercises to add to the template
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id')
      .limit(3);
    
    if (exercises && exercises.length > 0) {
      const templateExercises = exercises.map((exercise, index) => ({
        template_id: templateId,
        exercise_id: exercise.id,
        order_index: index,
        sets_config: [{ reps: 10, rest_time: 60 }],
        notes: 'Light recovery exercise',
      }));
      
      const { error: exercisesError } = await supabase
        .from('template_exercises')
        .insert(templateExercises);
      
      if (exercisesError) {
        console.error('❌ Error adding exercises to template:', exercisesError);
      } else {
        console.log('✅ Added exercises to template');
      }
    }
    
    console.log('✅ Successfully created missing template');
    return true;
  } catch (error) {
    console.error('❌ Error in createMissingTemplate:', error);
    return false;
  }
}