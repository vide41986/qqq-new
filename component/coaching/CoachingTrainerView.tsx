import { useColorScheme, getColors } from '../../hooks/useColorScheme';
import { router } from 'expo-router';
import { getTrainerClients } from '../../lib/planDatabase';
import { getTrainerTrainingSessions } from '../../lib/trainingSessionQueries';
import { TrainingSession } from '../../types/workout';

const { width } = Dimensions.get('window');

  const renderSessionCard = (session: any) => (
    <TouchableOpacity 
      key={session.id} 
      style={styles.sessionCard}
      onPress={() => router.push(`/workout-detail/${session.id}`)}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTime}>
          <Clock size={16} color={colors.textSecondary} />
          <Text style={styles.sessionTimeText}>
            {session.scheduled_time || 'Time TBD'}
          </Text>
        </View>
        <View style={[
          styles.sessionStatusBadge,
          { backgroundColor: session.status === 'scheduled' ? colors.success : colors.warning }
        ]}>
          <Text style={styles.sessionStatusText}>
            {session.status === 'scheduled' ? 'Scheduled' : session.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionClient}>
          {session.client?.full_name || 'Unknown Client'}
        </Text>
        <Text style={styles.sessionType}>
          {session.session_type || session.type || 'Training Session'}
        </Text>
        <View style={styles.sessionDetails}>
          <Text style={styles.sessionDetail}>
            📍 {session.location || 'Location TBD'}
          </Text>
          <Text style={styles.sessionDetail}>
            ⏱️ {session.duration_minutes || session.duration || 60} min
          </Text>
        </View>
        {(session.notes || session.trainer_notes) && (
          <Text style={styles.sessionNotes}>Notes: {session.notes}</Text>
        )}
      </View>