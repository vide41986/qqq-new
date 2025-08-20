import { supabase } from './supabase';
import { healthManager } from './healthIntegration';

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

    // Get today's health data from health integration
    let healthData = null;
    try {
      healthData = await healthManager.getTodaysHealthData();
    } catch (error) {
      console.warn('Could not fetch health data:', error);
    }

    // Merge health data with existing stats
    const mergedStats = {
      ...todayStats,
      steps: healthData?.steps || todayStats?.steps || 0,
      sleep_hours: healthData?.sleepHours || todayStats?.sleep_hours || 0,
      calories_burned: healthData?.caloriesBurned || todayStats?.calories_burned || 0,
    };

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
            exercise:exercise(*)
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
            exercise:exercise(*)
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

    console.log('DEBUG: Active plans for today:', activePlansToday);

 if (activePlansToday.length > 0) {
  const activePlan = activePlansToday[0];
  console.log('DEBUG: Selected active plan:', activePlan.name, 'Schedule data:', activePlan.schedule_data);

  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  let templateId = activePlan.schedule_data?.[dayOfWeek] || activePlan.schedule_data?.[dayOfWeek.toLowerCase()];
  if (typeof templateId === 'string') {
    templateId = templateId.trim();
  }
  console.log('DEBUG: Raw templateId from schedule_data for today:', templateId);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!templateId || !uuidRegex.test(templateId)) {
    console.error('DEBUG: Template ID is invalid or missing for today:', templateId);
    // ... (existing cleanup logic will follow here) ...
  } else {
    console.log('DEBUG: Template ID passed UUID validation:', templateId);

    // Locate the existing template existence check (around line 220)
    const { data: templateExists, error: existsError } = await supabase
      .from('workout_templates')
      .select('id, name, created_by')
      .eq('id', templateId)
      .maybeSingle();

    console.log('DEBUG: Template existence check result:', { templateExists, existsError });

    if (existsError) {
      console.error('DEBUG: Error checking template existence:', existsError);
    } else if (!templateExists) {
      console.error('DEBUG: Template with this ID does NOT exist in workout_templates:', templateId);
      // ... (existing cleanup logic will follow here) ...
    } else {
      console.log('DEBUG: Template exists in DB:', templateExists.name);

      // Locate the full template fetch (around line 240)
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .select(`
          *,
          exercises:template_exercises(
            order_index,
            sets_config,
            notes,
            exercise:exercises(*)
          )
        `)
        .eq('id', templateId)
        .maybeSingle();

      if (templateError) {
        console.error('DEBUG: Error fetching full template details:', templateError);
      } else if (template) {
        todaysWorkoutTemplate = template;
        console.log('DEBUG: Full template fetched successfully:', todaysWorkoutTemplate.name);
        console.log('DEBUG: Number of exercises in fetched template:', todaysWorkoutTemplate.exercises?.length);
      } else {
        console.log('DEBUG: Full template data was null for ID:', templateId);
      }
    }
  }
} else {
  console.log('DEBUG: No active plans found for today, defaulting to Rest Day.');
}

      // Locate the final return statement (around line 270)
console.log('DEBUG: Final todaysWorkoutTemplate object before return:', todaysWorkoutTemplate);


    return {
      profile,
      todayStats: mergedStats || null,
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