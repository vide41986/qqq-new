import { WorkoutTemplate, WorkoutSession, WorkoutSet, DayOfWeek } from '../types/workout';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const calculateTotalVolume = (sets: WorkoutSet[]): number => {
  return sets.reduce((total, set) => {
    if (set.weight && set.reps) {
      return total + (set.weight * set.reps);
    }
    return total;
  }, 0);
};

export const calculateSessionVolume = (session: WorkoutSession): number => {
  const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
  return exercises.reduce((total, exercise) => {
    return total + calculateTotalVolume(exercise.sets);
  }, 0);
};

export const getPersonalRecord = (sessions: WorkoutSession[], exerciseId: string): { weight: number; reps: number } | null => {
  let maxWeight = 0;
  let maxReps = 0;

  sessions.forEach(session => {
    const exercise = session.exercises.find(ex => ex.exercise_id === exerciseId);
    if (exercise) {
      exercise.sets.forEach(set => {
        if (set.weight && set.weight > maxWeight) {
          maxWeight = set.weight;
        }
        if (set.reps && set.reps > maxReps) {
          maxReps = set.reps;
        }
      });
    }
  });

  return maxWeight > 0 || maxReps > 0 ? { weight: maxWeight, reps: maxReps } : null;
};

export const getDayOfWeek = (date: Date): DayOfWeek => {
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()] as DayOfWeek;
};

export const getWeekDates = (startDate: Date): { [key in DayOfWeek]: string } => {
  const week: { [key in DayOfWeek]: string } = {} as any;
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Find Monday of the week
  const monday = new Date(startDate);
  const dayOfWeek = startDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday being 0
  monday.setDate(startDate.getDate() + diff);

  days.forEach((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    week[day] = date && typeof date.toISOString === 'function' ? date.toISOString().split('T')[0] : '';
  });

  return week;
};

export const isToday = (dateString: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return dateString === today;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
};

export const getWeeklyStats = (sessions: WorkoutSession[]): {
  totalSessions: number;
  totalVolume: number;
  averageDuration: number;
} => {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday
  weekEnd.setHours(23, 59, 59, 999);

  const weeklySessions = sessions.filter(session => {
    const sessionDate = new Date(session.date);
    return sessionDate >= weekStart && sessionDate <= weekEnd && session.completed;
  });

  const totalVolume = weeklySessions.reduce((total, session) => {
    return total + calculateSessionVolume(session);
  }, 0);

  const totalDuration = weeklySessions.reduce((total, session) => {
    if (session.start_time && session.end_time) {
      const start = new Date(`${session.date}T${session.start_time}`);
      const end = new Date(`${session.date}T${session.end_time}`);
      return total + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    }
    return total;
  }, 0);

  return {
    totalSessions: weeklySessions.length,
    totalVolume,
    averageDuration: weeklySessions.length > 0 ? totalDuration / weeklySessions.length : 0
  };
};