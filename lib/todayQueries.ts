import { supabase } from './supabase';

export interface TodayClientData {
  profile: any;
  todayStats: any;
  workoutSessions: any[];
  activeGoals: any[];
  pinnedGoals: any[];
  clientAssignment: any;
  todayPlan: {
    template?: any;
    exercises?: any[];
    scheduledTime?: string;
    plan?: {
      client_id: string;
      name: string;
      schedule_data: any;
    };
  };
  todaySession?: {
    id?: string;
    template_id?: string;
    template?: any;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    exercises?: any[];
    notes?: string;
    completed?: boolean;
  };
  todaysWorkoutTemplate?: any;
}

export interface TodayTrainerData {
  profile: any;
  trainingSessions: any[];
  clients: any[];
}

export interface TodayNutritionistData {
  profile: any;
  consultations: any[];
  clients: any[];
}

export interface TodayAdminData {
  profile: any;
  systemStats: any;
}

// Get current user profile
export const getCurrentUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
};

// Client-specific queries
export const getClientTodayData = async (): Promise<TodayClientData | null> => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'client') return null;

    const today = new Date().toISOString().split('T')[0];

    // Get today's stats
    const { data: todayStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .single();

    // Get today's workout sessions
    const { data: workoutSessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('client_id', profile.id)
      .eq('date', today)
      .order('start_time', { ascending: true });

    // Get active goals
    const { data: activeGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Get pinned goals for today screen
    const { data: pinnedGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', profile.id)
      .eq('pin_to_today', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Get client assignment (trainer/nutritionist)
    const { data: clientAssignment } = await supabase
      .from('client_assignments')
      .select(`
        *,
        trainer:profiles!client_assignments_trainer_id_fkey(id, full_name, email),
        nutritionist:profiles!client_assignments_nutritionist_id_fkey(id, full_name, email)
      `)
      .eq('client_id', profile.id)
      .eq('status', 'active')
      .single();

    // Get today's plan (from plan_sessions)
    const { data: todayPlan } = await supabase
      .from('plan_sessions')
      .select(`
        *,
        plan:workout_plans!inner(
          client_id,
          name,
          schedule_data
        ),
        template:workout_templates(
          *,
          exercises:template_exercises(
            *,
            exercise:exercise_id(*)
          )
        )
      `)
      .eq('plan.client_id', profile.id)
      .eq('scheduled_date', today)
      .single();

    console.log('Today plan found:', todayPlan);

    // Get today's session (from training_sessions)
    const { data: todaySession } = await supabase
      .from('training_sessions')
      .select(`
        *,
        template:workout_templates(
          *,
          exercises:template_exercises(
            *,
            exercise:exercise_id(*)
          )
        )
      `)
      .eq('client_id', profile.id)
      .eq('scheduled_date', today)
      .single();

    console.log('Today session found:', todaySession);

    // Get today's workout from active plans
    console.log('Fetching active plans for client:', profile.id);
    console.log('Today\'s date:', today);
    
    // First, let's clean up any invalid template IDs
    console.log('🧹 Running cleanup before fetching plans...');
    try {
      const { cleanupInvalidTemplateIds } = await import('./planDatabase');
      await cleanupInvalidTemplateIds(profile.id);
      console.log('✅ Cleanup completed');
    } catch (cleanupError: any) {
      console.error('❌ Error during cleanup:', cleanupError);
    }
    
    // Direct fix for the specific invalid template ID
    console.log('🔧 Direct fix for invalid template ID...');
    try {
      const { data: plansToFix, error: fixError } = await supabase
        .from('workout_plans')
        .select('id, name, schedule_data')
        .eq('client_id', profile.id)
        .eq('status', 'active');
      
      if (!fixError && plansToFix) {
        for (const plan of plansToFix) {
          if (plan.schedule_data && plan.schedule_data['Sunday'] === '94ed3c31-7acd-401d-8935-711974d83806') {
            console.log('🔧 Found plan with invalid Sunday template, fixing...');
            const updatedSchedule = { ...plan.schedule_data };
            updatedSchedule['Sunday'] = null;
            
            const { error: updateError } = await supabase
              .from('workout_plans')
              .update({ schedule_data: updatedSchedule })
              .eq('id', plan.id);
            
            if (updateError) {
              console.error('❌ Error fixing plan:', updateError);
            } else {
              console.log('✅ Successfully fixed plan schedule');
            }
          }
        }
      }
    } catch (directFixError) {
      console.error('❌ Error in direct fix:', directFixError);
    }
    
    const { data: activePlans, error: plansError } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('client_id', profile.id)
      .eq('status', 'active');

    console.log('Active plans found:', activePlans?.length || 0);
    if (plansError) {
      console.error('Error fetching plans:', plansError);
    }

    let todaysWorkoutTemplate = null;
    if (activePlans && activePlans.length > 0) {
      // Find plans that are active today
      const todayDate = new Date(today);
      const activePlansToday = activePlans.filter(plan => {
        const startDate = new Date(plan.start_date);
        const endDate = new Date(plan.end_date);
        return todayDate >= startDate && todayDate <= endDate;
      });

      console.log('Plans active today:', activePlansToday.length);
      
      if (activePlansToday.length > 0) {
        const activePlan = activePlansToday[0];
        console.log('Active plan:', activePlan.name, 'Schedule:', activePlan.schedule_data);
        
        // Get day of week (Monday, Tuesday, etc.)
        const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        console.log('Today is:', dayOfWeek);
        // Robust lookup: try both capitalized and lowercase keys
        let templateId = activePlan.schedule_data?.[dayOfWeek] || activePlan.schedule_data?.[dayOfWeek.toLowerCase()];
        if (typeof templateId === 'string') {
          templateId = templateId.trim().toLowerCase();
        }
        console.log('Looking up templateId:', `"${templateId}"`);
        // Robust lookup: try both capitalized and lowercase keys
        if (!templateId) {
          templateId = activePlan.schedule_data?.[dayOfWeek.toLowerCase()];
        }
        console.log('🎯 Template ID for today:', templateId);
        
        if (templateId) {
          // Validate template ID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(templateId)) {
            console.error('❌ Invalid template ID format:', templateId);
          } else {
            console.log('🔍 Fetching template from plan with ID:', templateId);
            
            // First check if template exists with more detailed logging
            console.log('🔍 Checking template existence for ID:', templateId);
            const { data: templateExists, error: existsError } = await supabase
              .from('workout_templates')
              .select('id, name, created_by')
              .eq('id', templateId)
              .maybeSingle();
            
            console.log('🔍 Template existence check result:', { templateExists, existsError });
            
            if (existsError) {
              console.error('❌ Error checking template existence:', existsError);
            } else if (!templateExists) {
              console.error('❌ Template does not exist in database:', templateId);
              // Let's check what templates are actually available
              const { data: allTemplates } = await supabase
                .from('workout_templates')
                .select('id, name')
                .limit(10);
              console.log('📋 Available templates:', allTemplates);
              
              // Clean up invalid template ID from the plan
              console.log('🧹 Cleaning up invalid template ID from plan...');
              console.log('🧹 Client ID for cleanup:', profile.id);
              try {
                const { cleanupInvalidTemplateIds } = await import('./planDatabase');
                console.log('🧹 Cleanup function imported successfully');
                await cleanupInvalidTemplateIds(profile.id);
                console.log('✅ Cleaned up invalid template IDs');
              } catch (cleanupError: any) {
                console.error('❌ Error cleaning up invalid template IDs:', cleanupError);
                console.error('❌ Cleanup error details:', cleanupError.message);
              }
            } else {
              console.log('✅ Template exists:', templateExists.name);
              
              // Now fetch the full template with exercises
              console.log('🔍 Fetching full template details...');
              const { data: template, error: templateError } = await supabase
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
              
              console.log('🔍 Full template fetch result:', { template: template?.name, templateError });
              
              if (templateError) {
                console.error('❌ Error fetching template details:', templateError);
              } else if (template) {
                todaysWorkoutTemplate = template;
                console.log('✅ Found today\'s workout from plan:', template.name);
                console.log('📊 Template exercises:', template.exercises?.length || 0);
              } else {
                console.log('❌ Template details not found for ID:', templateId);
              }
            }
          }
        } else {
          console.log('📝 No template scheduled for today (rest day)');
        }
        
        // If no valid template found, create a rest day template
        if (!todaysWorkoutTemplate) {
          console.log('📝 Creating rest day template for today');
          todaysWorkoutTemplate = {
            id: 'rest-day',
            name: 'Rest Day',
            description: 'Take a break and recover today',
            category: 'Rest',
            estimated_duration_minutes: 0,
            exercises: [],
            is_rest_day: true
          };
        }
      } else {
        console.log('No active plans for today');
      }
    } else {
      console.log('No active plans found for client');
    }

    return {
      profile,
      todayStats: todayStats || null,
      workoutSessions: workoutSessions || [],
      activeGoals: activeGoals || [],
      pinnedGoals: pinnedGoals || [],
      clientAssignment: clientAssignment || null,
      todayPlan: todayPlan || {
        template: null,
        exercises: [],
        scheduledTime: null
      },
      todaySession: todaySession || {
        id: null,
        template_id: null,
        template: null,
        start_time: null,
        end_time: null,
        duration_minutes: 0,
        exercises: [],
        notes: null,
        completed: false
      },
      todaysWorkoutTemplate
    };
  } catch (error) {
    console.error('Error fetching client today data:', error);
    return null;
  }
};

// Trainer-specific queries
export const getTrainerTodayData = async (): Promise<TodayTrainerData | null> => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'trainer') return null;

    const today = new Date().toISOString().split('T')[0];

    // Get today's training sessions
    const { data: trainingSessions } = await supabase
      .from('training_sessions')
      .select(`
        *,
        client:profiles!training_sessions_client_id_fkey(id, full_name, email)
      `)
      .eq('trainer_id', profile.id)
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true });

    // Get trainer's clients
    const { data: clientAssignments } = await supabase
      .from('client_assignments')
      .select(`
        client:profiles!client_assignments_client_id_fkey(*)
      `)
      .eq('trainer_id', profile.id)
      .eq('status', 'active');

    const clients = clientAssignments?.map(assignment => assignment.client).filter(Boolean) || [];

    return {
      profile,
      trainingSessions: trainingSessions || [],
      clients,
    };
  } catch (error) {
    console.error('Error fetching trainer today data:', error);
    return null;
  }
};

// Nutritionist-specific queries
export const getNutritionistTodayData = async (): Promise<TodayNutritionistData | null> => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'nutritionist') return null;

    const today = new Date().toISOString().split('T')[0];

    // Get today's consultations
    const { data: consultations } = await supabase
      .from('consultations')
      .select(`
        *,
        client:profiles!consultations_client_id_fkey(id, full_name, email)
      `)
      .eq('nutritionist_id', profile.id)
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true });

    // Get nutritionist's clients
    const { data: clientAssignments } = await supabase
      .from('client_assignments')
      .select(`
        client:profiles!client_assignments_client_id_fkey(*)
      `)
      .eq('nutritionist_id', profile.id)
      .eq('status', 'active');

    const clients = clientAssignments?.map(assignment => assignment.client).filter(Boolean) || [];

    return {
      profile,
      consultations: consultations || [],
      clients,
    };
  } catch (error) {
    console.error('Error fetching nutritionist today data:', error);
    return null;
  }
};

// Admin-specific queries
export const getAdminTodayData = async (): Promise<TodayAdminData | null> => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'hr')) return null;

    // Get system statistics
    const [usersResult, sessionsResult, assignmentsResult] = await Promise.all([
      supabase.from('profiles').select('role', { count: 'exact' }),
      supabase.from('workout_sessions').select('completed', { count: 'exact' }).eq('date', new Date().toISOString().split('T')[0]),
      supabase.from('client_assignments').select('status', { count: 'exact' }).eq('status', 'active')
    ]);

    const systemStats = {
      totalUsers: usersResult.count || 0,
      todaySessions: sessionsResult.count || 0,
      activeAssignments: assignmentsResult.count || 0,
      systemHealth: 98.5, // Mock data
    };

    return {
      profile,
      systemStats,
    };
  } catch (error) {
    console.error('Error fetching admin today data:', error);
    return null;
  }
};

// Update daily stats
export const updateDailyStats = async (stats: {
  steps?: number;
  water_intake_ml?: number;
  calories_consumed?: number;
  calories_burned?: number;
  weight_kg?: number;
  sleep_hours?: number;
  mood_rating?: number;
}) => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return null;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_stats')
      .upsert({
        user_id: profile.id,
        date: today,
        ...stats,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating daily stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateDailyStats:', error);
    return null;
  }
};

// Create or update workout session
export const createWorkoutSession = async (sessionData: {
  template_id?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  exercises?: any[];
  notes?: string;
  completed?: boolean;
}) => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return null;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        client_id: profile.id,
        date: today,
        ...sessionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workout session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createWorkoutSession:', error);
    return null;
  }
};

// Create or update goal
export const createGoal = async (goalData: {
  title: string;
  description?: string;
  emoji?: string;
  target_date?: string;
  progress_percentage?: number;
  category?: string;
  pin_to_today?: boolean;
  target_value?: number;
  current_value?: number;
  unit?: string;
}) => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return null;

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: profile.id,
        ...goalData,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createGoal:', error);
    return null;
  }
};

// Update goal
export const updateGoal = async (goalId: string, updates: {
  title?: string;
  description?: string;
  emoji?: string;
  target_date?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  status?: string;
  progress_percentage?: number;
  category?: string;
  pin_to_today?: boolean;
}) => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return null;

    const { data, error } = await supabase
      .from('goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', profile.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating goal:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateGoal:', error);
    return null;
  }
};