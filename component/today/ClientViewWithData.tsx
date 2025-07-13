import { useColorScheme, getColors } from '../../hooks/useColorScheme';
import { useTodayDataNew } from '../../hooks/useTodayDataNew';
import { TodayClientData } from '../../lib/todayQueries';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getClientTrainingSessions } from '../../lib/trainingSessionQueries';
import { TrainingSession } from '../../types/workout';

export default function TodayClientViewNew() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);
  const { data, loading, error, refreshData } = useTodayDataNew();
  const { user } = useAuth();
  const [showMissedWorkout, setShowMissedWorkout] = useState(true);
  const [todaysTrainingSessions, setTodaysTrainingSessions] = useState<TrainingSession[]>([]);
  
  const clientData = data as TodayClientData;

  useEffect(() => {
    const loadTodaysTrainingSessions = async () => {
      if (!clientData?.profile?.id) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        const sessions = await getClientTrainingSessions(clientData.profile.id, today, today);
        console.log('📅 Today\'s training sessions:', sessions);
        setTodaysTrainingSessions(sessions);
      } catch (error) {
        console.error('Error loading today\'s training sessions:', error);
      }
    };

    if (clientData?.profile?.id) {
      loadTodaysTrainingSessions();
    }
  }, [clientData?.profile?.id]);

          {/* Hero Image */}
          <View style={styles.workoutHeroContainer}>
            <Image 
              source={{ uri: template?.thumbnail_url || template?.image_url || 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800' }}
              style={styles.workoutHeroImage}
            />