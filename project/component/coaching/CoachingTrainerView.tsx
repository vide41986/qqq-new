import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Calendar, TrendingUp, Clock, MessageSquare, Plus, Star, Activity, Search, Filter, Dumbbell, FileText, ChevronRight, Target, Award, Bell, Phone, Video, CreditCard as Edit, MoveHorizontal as MoreHorizontal, X, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Zap, Flame, TrendingDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme, getColors } from '../../hooks/useColorScheme';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const clients = [
  {
    id: 1,
    name: 'Sarah Johnson',
    lastWorkout: '2 days ago',
    progress: 85,
    status: 'active',
    avatar: '👩‍💼',
    nextSession: 'Today 10:00 AM',
    completedWorkouts: 24,
    totalWorkouts: 28,
    streak: 7,
    goals: ['Weight Loss', 'Strength'],
    compliance: 92,
    location: 'Gym A',
    phone: '+1 234 567 8901'
  },
  {
    id: 2,
    name: 'Mike Chen',
    lastWorkout: 'Today',
    progress: 92,
    status: 'active',
    avatar: '👨‍💻',
    nextSession: 'Tomorrow 11:30 AM',
    completedWorkouts: 31,
    totalWorkouts: 32,
    streak: 12,
    goals: ['Muscle Gain', 'Endurance'],
    compliance: 97,
    location: 'Home',
    phone: '+1 234 567 8902'
  },
  {
    id: 3,
    name: 'Emma Wilson',
    lastWorkout: '1 week ago',
    progress: 45,
    status: 'inactive',
    avatar: '👩‍🎨',
    nextSession: 'Not scheduled',
    completedWorkouts: 12,
    totalWorkouts: 28,
    streak: 0,
    goals: ['Flexibility', 'Wellness'],
    compliance: 45,
    location: 'Gym B',
    phone: '+1 234 567 8903'
  },
  {
    id: 4,
    name: 'Alex Rodriguez',
    lastWorkout: 'Yesterday',
    progress: 78,
    status: 'active',
    avatar: '👨‍🎯',
    nextSession: 'Today 3:00 PM',
    completedWorkouts: 18,
    totalWorkouts: 22,
    streak: 5,
    goals: ['Athletic Performance'],
    compliance: 82,
    location: 'Gym A',
    phone: '+1 234 567 8904'
  }
];

const upcomingSessions = [
  { 
    id: 1, 
    client: 'Sarah Johnson', 
    time: '10:00 AM', 
    type: 'Strength Training', 
    status: 'confirmed',
    duration: '60 min',
    location: 'Gym A',
    notes: 'Focus on upper body'
  },
  { 
    id: 2, 
    client: 'Mike Chen', 
    time: '11:30 AM', 
    type: 'HIIT Session', 
    status: 'pending',
    duration: '45 min',
    location: 'Home',
    notes: 'Virtual session'
  },
  { 
    id: 3, 
    client: 'Emma Wilson', 
    time: '2:00 PM', 
    type: 'Personal Training', 
    status: 'confirmed',
    duration: '90 min',
    location: 'Gym B',
    notes: 'Assessment session'
  },
  { 
    id: 4, 
    client: 'Alex Rodriguez', 
    time: '3:00 PM', 
    type: 'Athletic Training', 
    status: 'confirmed',
    duration: '75 min',
    location: 'Gym A',
    notes: 'Sport-specific drills'
  }
];

const recentActivity = [
  { id: 1, client: 'John Doe', action: 'Completed Full Body Strength', time: '30 min ago', type: 'workout', avatar: '👨‍💼' },
  { id: 2, client: 'Lisa Park', action: 'Asked about nutrition plan', time: '1 hour ago', type: 'message', avatar: '👩‍🔬' },
  { id: 3, client: 'Alex Kim', action: 'Updated progress photos', time: '2 hours ago', type: 'progress', avatar: '👨‍🎨' },
  { id: 4, client: 'Sarah Johnson', action: 'Completed HIIT workout', time: '3 hours ago', type: 'workout', avatar: '👩‍💼' },
  { id: 5, client: 'Tom Wilson', action: 'Logged nutrition data', time: '4 hours ago', type: 'nutrition', avatar: '👨‍🍳' },
  { id: 6, client: 'Maria Garcia', action: 'Missed scheduled session', time: '5 hours ago', type: 'missed', avatar: '👩‍🎭' }
];

const notifications = [
  { id: 1, type: 'session', message: 'Sarah Johnson confirmed today\'s session', time: '10 min ago', read: false },
  { id: 2, type: 'achievement', message: 'Mike Chen reached 12-day streak!', time: '1 hour ago', read: false },
  { id: 3, type: 'alert', message: 'Emma Wilson hasn\'t worked out in 7 days', time: '2 hours ago', read: true },
  { id: 4, type: 'message', message: 'New message from Alex Rodriguez', time: '3 hours ago', read: false }
];

export default function CoachingTrainerView() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);

  const [selectedTab, setSelectedTab] = useState('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showQuickActions, setShowQuickActions] = useState(false);

  const filters = ['all', 'active', 'inactive', 'high-progress'];
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleClientPress = (client: any) => {
    router.push(`/client-detail/${client.id}`);
  };

  const handleCreatePlan = () => {
    router.push('/create-plan');
  };

  const handleCreateTemplate = () => {
    router.push('/create-template');
  };

  const handleViewTemplates = () => {
    router.push('/templates');
  };

  const handleViewPlans = () => {
    router.push('/workout-plans');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCallClient = (client: any) => {
    Alert.alert('Call Client', `Calling ${client.name}...`);
  };

  const handleVideoCall = (client: any) => {
    Alert.alert('Video Call', `Starting video call with ${client.name}...`);
  };

  const handleMessageClient = (client: any) => {
    router.push(`/chat/${client.id}`);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workout':
        return <Dumbbell size={16} color={colors.success} />;
      case 'message':
        return <MessageSquare size={16} color={colors.primary} />;
      case 'progress':
        return <TrendingUp size={16} color={colors.warning} />;
      case 'nutrition':
        return <Target size={16} color={colors.info} />;
      case 'missed':
        return <AlertCircle size={16} color={colors.error} />;
      default:
        return <Activity size={16} color={colors.textSecondary} />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Calendar size={16} color={colors.primary} />;
      case 'achievement':
        return <Award size={16} color={colors.warning} />;
      case 'alert':
        return <AlertCircle size={16} color={colors.error} />;
      case 'message':
        return <MessageSquare size={16} color={colors.info} />;
      default:
        return <Bell size={16} color={colors.textSecondary} />;
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'active' && client.status === 'active') ||
      (selectedFilter === 'inactive' && client.status === 'inactive') ||
      (selectedFilter === 'high-progress' && client.progress >= 80);
    return matchesSearch && matchesFilter;
  });

  const renderClientCard = (client: any) => (
    <TouchableOpacity 
      key={client.id} 
      style={styles.clientCard}
      onPress={() => handleClientPress(client)}
      activeOpacity={0.7}
    >
      <View style={styles.clientHeader}>
        <View style={styles.clientLeft}>
          <View style={styles.clientAvatarContainer}>
            <Text style={styles.clientAvatar}>{client.avatar}</Text>
            {client.streak > 0 && (
              <View style={styles.streakBadge}>
                <Flame size={12} color="#FFFFFF" />
                <Text style={styles.streakText}>{client.streak}</Text>
              </View>
            )}
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientLastWorkout}>Last workout: {client.lastWorkout}</Text>
            <Text style={styles.clientNextSession}>Next: {client.nextSession}</Text>
            <View style={styles.clientGoals}>
              {client.goals.map((goal, index) => (
                <View key={index} style={styles.goalTag}>
                  <Text style={styles.goalText}>{goal}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        
        <View style={styles.clientRight}>
          <View style={styles.clientActions}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => handleMessageClient(client)}
            >
              <MessageSquare size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => handleCallClient(client)}
            >
              <Phone size={16} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => handleVideoCall(client)}
            >
              <Video size={16} color={colors.warning} />
            </TouchableOpacity>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: client.status === 'active' ? colors.success : colors.warning }
          ]}>
            <Text style={styles.statusText}>
              {client.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} />
        </View>
      </View>
      
      <View style={styles.clientProgress}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>Workout Completion</Text>
          <Text style={styles.progressText}>
            {client.completedWorkouts}/{client.totalWorkouts} completed
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${client.progress}%`,
                  backgroundColor: client.status === 'active' ? colors.success : colors.warning
                }
              ]} 
            />
          </View>
          <Text style={styles.progressPercentage}>{client.progress}%</Text>
        </View>
        <Text style={styles.complianceText}>
          Compliance: {client.compliance}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSessionCard = (session: any) => (
    <TouchableOpacity key={session.id} style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionTime}>
          <Clock size={16} color={colors.textSecondary} />
          <Text style={styles.sessionTimeText}>{session.time}</Text>
        </View>
        <View style={[
          styles.sessionStatusBadge,
          { backgroundColor: session.status === 'confirmed' ? colors.success : colors.warning }
        ]}>
          <Text style={styles.sessionStatusText}>
            {session.status === 'confirmed' ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionClient}>{session.client}</Text>
        <Text style={styles.sessionType}>{session.type}</Text>
        <View style={styles.sessionDetails}>
          <Text style={styles.sessionDetail}>📍 {session.location}</Text>
          <Text style={styles.sessionDetail}>⏱️ {session.duration}</Text>
        </View>
        {session.notes && (
          <Text style={styles.sessionNotes}>Notes: {session.notes}</Text>
        )}
      </View>
      
      <View style={styles.sessionActions}>
        <TouchableOpacity style={styles.sessionActionBtn}>
          <Phone size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sessionActionBtn}>
          <Video size={16} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sessionActionBtn}>
          <MessageSquare size={16} color={colors.warning} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sessionActionBtn}>
          <Edit size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Client Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowNotifications(true)}
          >
            <Bell size={20} color={colors.textSecondary} />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Search size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'clients' && styles.activeTab]}
          onPress={() => setSelectedTab('clients')}
        >
          <Text style={[styles.tabText, selectedTab === 'clients' && styles.activeTabText]}>
            Clients
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sessions' && styles.activeTab]}
          onPress={() => setSelectedTab('sessions')}
        >
          <Text style={[styles.tabText, selectedTab === 'sessions' && styles.activeTabText]}>
            Sessions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'activity' && styles.activeTab]}
          onPress={() => setSelectedTab('activity')}
        >
          <Text style={[styles.tabText, selectedTab === 'activity' && styles.activeTabText]}>
            Activity
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTab === 'clients' ? (
          <>
            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Users size={20} color={colors.primary} />
                </View>
                <Text style={styles.statNumber}>24</Text>
                <Text style={styles.statLabel}>Active Clients</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${colors.success}15` }]}>
                  <TrendingUp size={20} color={colors.success} />
                </View>
                <Text style={styles.statNumber}>92%</Text>
                <Text style={styles.statLabel}>Avg Progress</Text>
              </View>
              
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: `${colors.warning}15` }]}>
                  <Calendar size={20} color={colors.warning} />
                </View>
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>Today's Sessions</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={handleViewTemplates}
              >
                <Dumbbell size={20} color={colors.primary} />
                <Text style={styles.quickActionText}>Templates</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={handleViewPlans}
              >
                <Calendar size={20} color={colors.success} />
                <Text style={styles.quickActionText}>Plans</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/trainers/analytics')}
              >
                <TrendingUp size={20} color={colors.warning} />
                <Text style={styles.quickActionText}>Analytics</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/workout-history')}
              >
                <Activity size={20} color={colors.error} />
                <Text style={styles.quickActionText}>History</Text>
              </TouchableOpacity>
            </View>

            {/* Client List */}
            <Text style={styles.sectionTitle}>Your Clients ({filteredClients.length})</Text>
            {filteredClients.map(renderClientCard)}
          </>
        ) : selectedTab === 'sessions' ? (
          <>
            {/* Today's Sessions Overview */}
            <LinearGradient
              colors={colorScheme === 'dark' ? ['#BE185D', '#BE123C'] : ['#F093FB', '#F5576C']}
              style={styles.overviewCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.overviewContent}>
                <Text style={styles.overviewLabel}>TODAY'S SESSIONS</Text>
                <Text style={styles.overviewNumber}>5/8</Text>
                <Text style={styles.overviewMessage}>3 sessions remaining</Text>
              </View>
            </LinearGradient>

            {/* Upcoming Sessions */}
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            {upcomingSessions.map(renderSessionCard)}

            {/* Session Actions */}
            <View style={styles.sessionActionsContainer}>
              <TouchableOpacity style={styles.sessionActionButton}>
                <Plus size={20} color={colors.primary} />
                <Text style={styles.sessionActionText}>Schedule Session</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.sessionActionButton}>
                <Calendar size={20} color={colors.success} />
                <Text style={styles.sessionActionText}>View Calendar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Recent Activity */}
            <Text style={styles.sectionTitle}>Recent Client Activity</Text>
            
            {recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityLeft}>
                  <Text style={styles.activityAvatar}>{activity.avatar}</Text>
                  <View style={styles.activityIconBadge}>
                    {getActivityIcon(activity.type)}
                  </View>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityClient}>{activity.client}</Text>
                  <Text style={styles.activityAction}>{activity.action}</Text>
                </View>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))}

            {/* Activity Summary */}
            <View style={styles.activitySummary}>
              <Text style={styles.activitySummaryTitle}>Today's Activity Summary</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatNumber}>12</Text>
                  <Text style={styles.summaryStatLabel}>Workouts Completed</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatNumber}>8</Text>
                  <Text style={styles.summaryStatLabel}>Messages Sent</Text>
                </View>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatNumber}>3</Text>
                  <Text style={styles.summaryStatLabel}>Progress Updates</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreatePlan}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotifications(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.notificationsList}>
            {notifications.map((notification) => (
              <View key={notification.id} style={[
                styles.notificationItem,
                !notification.read && styles.unreadNotification
              ]}>
                <View style={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Clients</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterOptions}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterOption,
                  selectedFilter === filter && styles.selectedFilter
                ]}
                onPress={() => {
                  setSelectedFilter(filter);
                  setShowFilters(false);
                }}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter && styles.selectedFilterText
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
                </Text>
                {selectedFilter === filter && (
                  <CheckCircle size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  clientCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  clientAvatar: {
    fontSize: 32,
    width: 48,
    height: 48,
    textAlign: 'center',
    lineHeight: 48,
  },
  streakBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  clientLastWorkout: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  clientNextSession: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.primary,
    marginBottom: 6,
  },
  clientGoals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  goalTag: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  goalText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: colors.primary,
  },
  clientRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  clientProgress: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBackground: {
    flex: 1,
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 30,
  },
  complianceText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.textTertiary,
  },
  overviewCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
  },
  overviewContent: {
    alignItems: 'flex-start',
  },
  overviewLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  overviewNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overviewMessage: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sessionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionTimeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  sessionStatusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sessionStatusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  sessionInfo: {
    marginBottom: 12,
  },
  sessionClient: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  sessionType: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sessionDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  sessionDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textTertiary,
  },
  sessionNotes: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  sessionActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  activityLeft: {
    position: 'relative',
    marginRight: 12,
  },
  activityAvatar: {
    fontSize: 24,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
  },
  activityIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    backgroundColor: colors.surface,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  activityInfo: {
    flex: 1,
  },
  activityClient: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  activityAction: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textTertiary,
  },
  activitySummary: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  activitySummaryTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: colors.primary,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: colors.text,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
  },
  unreadNotification: {
    backgroundColor: colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  notificationTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  filterOptions: {
    padding: 20,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  selectedFilter: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  selectedFilterText: {
    color: '#FFFFFF',
  },
});