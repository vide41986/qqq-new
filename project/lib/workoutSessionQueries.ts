import { supabase } from './supabase';
import { WorkoutSession } from '../types/workout';

export async function getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    console.error('Error fetching workout session:', error);
    return null;
  }
  return data as WorkoutSession;
}

export async function updateWorkoutSessionData(
  sessionId: string,
  sessionData: Partial<WorkoutSession>
): Promise<boolean> {
  const { error } = await supabase
    .from('workout_sessions')
    .update(sessionData)
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating workout session data:', error);
    return false;
  }
  return true;
}

export async function completeWorkoutSession(
  sessionId: string,
  completionData: {
    exercises: any[]; // This should match the structure of WorkoutSession.exercises
    notes?: string;
    duration_minutes?: number;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({
      exercises: completionData.exercises,
      notes: completionData.notes,
      duration_minutes: completionData.duration_minutes,
      completed: true,
      end_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error completing workout session:', error);
    return false;
  }
  return true;
}

export async function createWorkoutSession(session: Partial<WorkoutSession>): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert(session)
    .select()
    .single();

  if (error) {
    console.error('Error creating workout session:', error);
    return null;
  }
  return data as WorkoutSession;
}
