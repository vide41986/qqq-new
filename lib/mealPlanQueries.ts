import { supabase } from './supabase';

export interface MealPlan {
  id: string;
  client_id: string;
  nutritionist_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  title_image_url?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

export interface MealPlanDay {
  id: string;
  meal_plan_id: string;
  date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MealPlanEntry {
  id: string;
  meal_plan_day_id: string;
  meal_type_id: string;
  title: string;
  description?: string;
  time?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  image_url?: string;
  is_ai_generated?: boolean;
  quantity?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Get current user profile
const getCurrentUserProfile = async () => {
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

// Get all meal plans for a nutritionist
export const getNutritionistMealPlans = async (): Promise<MealPlan[]> => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'nutritionist') {
      console.error('User is not a nutritionist');
      return [];
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        client:profiles!meal_plans_client_id_fkey(id, full_name, email)
      `)
      .eq('nutritionist_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meal plans:', error);
      return [];
    }

    return (data || []).map(plan => ({
      ...plan,
      client_name: plan.client?.full_name || 'Unknown Client'
    }));
  } catch (error) {
    console.error('Error in getNutritionistMealPlans:', error);
    return [];
  }
};

// Get clients assigned to a nutritionist
export const getNutritionistClients = async () => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'nutritionist') {
      console.error('User is not a nutritionist');
      return [];
    }

    const { data, error } = await supabase
      .from('client_assignments')
      .select(`
        client_id,
        profiles!client_assignments_client_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('nutritionist_id', profile.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching nutritionist clients:', error);
      return [];
    }

    return (data || []).map(assignment => assignment.profiles).filter(Boolean);
  } catch (error) {
    console.error('Error in getNutritionistClients:', error);
    return [];
  }
};

// Create a new meal plan
export const createMealPlan = async (mealPlanData: Omit<MealPlan, 'id' | 'created_at' | 'updated_at' | 'client_name'>): Promise<MealPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert(mealPlanData)
      .select(`
        *,
        client:profiles!meal_plans_client_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error creating meal plan:', error);
      return null;
    }

    return {
      ...data,
      client_name: data.client?.full_name || 'Unknown Client'
    };
  } catch (error) {
    console.error('Error in createMealPlan:', error);
    return null;
  }
};

// Update an existing meal plan
export const updateMealPlan = async (
  planId: string, 
  updates: Partial<Omit<MealPlan, 'id' | 'created_at' | 'updated_at' | 'client_name'>>
): Promise<MealPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', planId)
      .select(`
        *,
        client:profiles!meal_plans_client_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error updating meal plan:', error);
      return null;
    }

    return {
      ...data,
      client_name: data.client?.full_name || 'Unknown Client'
    };
  } catch (error) {
    console.error('Error in updateMealPlan:', error);
    return null;
  }
};

// Delete a meal plan
export const deleteMealPlan = async (planId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('Error deleting meal plan:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteMealPlan:', error);
    return false;
  }
};

// Get meal plan by ID with full details
export const getMealPlanById = async (planId: string): Promise<MealPlan | null> => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        client:profiles!meal_plans_client_id_fkey(id, full_name, email),
        meal_plan_days(
          *,
          meal_plan_entries(
            *,
            meal_type:meal_types(name, emoji, color)
          )
        )
      `)
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching meal plan:', error);
      return null;
    }

    return {
      ...data,
      client_name: data.client?.full_name || 'Unknown Client'
    };
  } catch (error) {
    console.error('Error in getMealPlanById:', error);
    return null;
  }
};

// Get meal types for dropdowns
export const getMealTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('meal_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching meal types:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMealTypes:', error);
    return [];
  }
};

// Get meal items for selection
export const getMealItems = async () => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      console.error('User profile not found');
      return [];
    }

    const { data, error } = await supabase
      .from('meal_items')
      .select('*')
      .or(`created_by.eq.${profile.id},is_public.eq.true`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching meal items:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMealItems:', error);
    return [];
  }
};

// Get meal plans assigned to a client
export const getClientMealPlans = async (): Promise<MealPlan[]> => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'client') {
      console.error('User is not a client');
      return [];
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        nutritionist:profiles!meal_plans_nutritionist_id_fkey(id, full_name, email)
      `)
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching client meal plans:', error);
      return [];
    }

    return (data || []).map(plan => ({
      ...plan,
      nutritionist_name: plan.nutritionist?.full_name || 'Unknown Nutritionist'
    }));
  } catch (error) {
    console.error('Error in getClientMealPlans:', error);
    return [];
  }
};

// Get detailed meal plan with all days and entries
export const getDetailedMealPlan = async (planId: string): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        *,
        nutritionist:profiles!meal_plans_nutritionist_id_fkey(id, full_name, email),
        meal_plan_days(
          *,
          meal_plan_entries(
            *,
            meal_type:meal_types(name, emoji, color)
          )
        )
      `)
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching detailed meal plan:', error);
      return null;
    }

    return {
      ...data,
      nutritionist_name: data.nutritionist?.full_name || 'Unknown Nutritionist'
    };
  } catch (error) {
    console.error('Error in getDetailedMealPlan:', error);
    return null;
  }
};

// Create a new meal item
export const createMealItem = async (mealItemData: {
  name: string;
  description?: string;
  category?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  image_url?: string;
  is_ai_generated?: boolean;
  serving_size?: string;
  preparation_time_minutes?: number;
  cooking_instructions?: string;
  ingredients?: string[];
  allergens?: string[];
  dietary_tags?: string[];
  is_public?: boolean;
}) => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile || profile.role !== 'nutritionist') {
      console.error('User is not a nutritionist');
      return null;
    }

    const { data, error } = await supabase
      .from('meal_items')
      .insert({
        ...mealItemData,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating meal item:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createMealItem:', error);
    return null;
  }
};