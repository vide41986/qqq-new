@@ .. @@
   const renderTodaysWorkout = () => {
+    // NEW: Prioritize todaysWorkoutTemplate if available, otherwise use todaysWorkoutSession
+    const workoutToRender = clientData?.todaysWorkoutTemplate || todaysWorkoutSession;
+
-    if (!todaysWorkoutSession) {
+    if (!workoutToRender) {
       return (
         <LinearGradient
           colors={colorScheme === 'dark' ? ['#1E40AF', '#3730A3'] : ['#667EEA', '#764BA2']}
           style={styles.restDayCard}
           start={{ x: 0, y: 0 }}
           end={{ x: 1, y: 1 }}
         >
           <View style={styles.restDayContent}>
             <Text style={styles.restDayLabel}>REST DAY</Text>
             <Text style={styles.restDayMessage}>
               Hoo-ray it's your rest-day 🌴
             </Text>
           </View>
         </LinearGradient>
       );
     }
 
-    // Handle both training sessions and workout sessions
-    const template = todaysWorkoutSession.template;
-    const sessionName = template?.name || todaysWorkoutSession.type || todaysWorkoutSession.session_type || 'Training Session';
-    const sessionDuration = template?.estimated_duration_minutes || todaysWorkoutSession.duration_minutes || todaysWorkoutSession.duration || 60;
-    const sessionExercises = template?.exercises || [];
+    // Use workoutToRender for displaying details
+    // Check if it's a WorkoutTemplate (has exercises directly) or a TrainingSession (has template property)
+    const template = workoutToRender.exercises ? workoutToRender : workoutToRender.template;
+    const sessionName = template?.name || workoutToRender.type || workoutToRender.session_type || 'Training Session';
+    const sessionDuration = template?.estimated_duration_minutes || workoutToRender.duration_minutes || workoutToRender.duration || 60;
+    const sessionExercises = template?.exercises || [];
 
     return (
       <TouchableOpacity
         style={styles.workoutCardContainer}
         onPress={handleWorkoutCardPress}
         activeOpacity={0.9}
       >
         <LinearGradient
           colors={colorScheme === 'dark' ? ['#BE185D', '#BE123C'] : ['#F093FB', '#F5576C']}
           style={styles.workoutCard}
           start={{ x: 0, y: 0 }}
           end={{ x: 1, y: 1 }}
         >
           {/* Hero Image */}
           <View style={styles.workoutHeroContainer}>
             <Image
               source={{ uri: template?.image_url || template?.thumbnail_url || 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=800' }}
               style={styles.workoutHeroImage}
             />
             <View style={styles.workoutOverlay}>
               <View style={styles.workoutInfo}>
                 <Text style={styles.workoutLabel}>TODAY'S WORKOUT</Text>
                 <Text style={styles.workoutName}>{sessionName}</Text>
                 <View style={styles.workoutMeta}>
                   <View style={styles.metaItem}>
                     <Dumbbell size={16} color="rgba(255, 255, 255, 0.8)" />
                     <Text style={styles.metaText}>{sessionExercises.length} exercises</Text>
                   </View>
                   <View style={styles.metaItem}>
                     <Clock size={16} color="rgba(255, 255, 255, 0.8)" />
                     <Text style={styles.metaText}>{sessionDuration} min</Text>
                   </View>
                 </View>
               </View>
               <TouchableOpacity style={styles.playButton} onPress={handleStartWorkout}>
                 <Play size={24} color="#FFFFFF" />
               </TouchableOpacity>
             </View>
           </View>
 
           {/* Exercise Preview */}
           <View style={styles.exercisePreview}>
             <Text style={styles.exercisePreviewTitle}>Exercises Preview</Text>
             {sessionExercises.length > 0 ? (
               <ScrollView
                 horizontal
                 showsHorizontalScrollIndicator={false}
                 style={styles.exerciseScrollView}
                 contentContainerStyle={styles.exerciseScrollContent}
               >
                 {sessionExercises.slice(0, 5).map((exercise, index) => (
                   <View key={exercise.id} style={styles.exercisePreviewItem}>
                     <Image
                       source={{ uri: exercise.exercise.image_url || getExerciseImage(exercise.exercise.name, index) }}
                       style={styles.exercisePreviewImage}
                     />
                     <Text style={styles.exercisePreviewName} numberOfLines={2}>
                       {exercise.exercise.name}
                     </Text>
                     <Text style={styles.exercisePreviewSets}>
                       {exercise.sets_config.length} sets
                     </Text>
                   </View>
                 ))}
                 {sessionExercises.length > 5 && (
                   <View style={styles.moreExercisesItem}>
                     <View style={styles.moreExercisesCircle}>
                       <Text style={styles.moreExercisesText}>
                         +{sessionExercises.length - 5}
                       </Text>
                     </View>
                     <Text style={styles.moreExercisesLabel}>More</Text>
                   </View>
                 )}
               </ScrollView>
             ) : (
               <View style={styles.noExercisesContainer}>
                 <Text style={styles.noExercisesText}>Custom training session</Text>
                 <Text style={styles.noExercisesSubtext}>Details will be provided by your trainer</Text>
               </View>
             )}

             <View style={styles.workoutActions}>
               <TouchableOpacity style={styles.viewDetailsButton} onPress={handleWorkoutCardPress}>
                 <Text style={styles.viewDetailsText}>View Details</Text>
                 <ChevronRight size={16} color="rgba(255, 255, 255, 0.8)" />
               </TouchableOpacity>
               <TouchableOpacity style={styles.startWorkoutButton} onPress={handleStartWorkout}>
                 <Play size={16} color="#FFFFFF" />
                 <Text style={styles.startWorkoutText}>Start Workout</Text>
               </TouchableOpacity>
             </View>
           </View>
         </LinearGradient>
       </TouchableOpacity>
     );
   };
 
   const handleStartWorkout = () => {
-    if (todaysWorkoutSession) {
-      // Handle both training sessions and workout sessions
-      if ('template_id' in todaysWorkoutSession && todaysWorkoutSession.template_id) {
-        router.push(`/start-workout/${todaysWorkoutSession.id}`);
-      } else {
-        // For training sessions without templates, navigate to session detail
-        router.push(`/workout-detail/${todaysWorkoutSession.id}`);
-      }
+    const workoutToStart = clientData?.todaysWorkoutTemplate || todaysWorkoutSession;
+
+    if (workoutToStart) {
+      // If it's a WorkoutTemplate (has exercises directly), navigate with template ID
+      if (workoutToStart.exercises) {
+        router.push(`/start-workout/${workoutToStart.id}`);
+      } else if (workoutToStart.template_id) {
+        // If it's a TrainingSession with a template_id
+        router.push(`/start-workout/${workoutToStart.template_id}`);
+      } else {
+        // Fallback for TrainingSession without a template_id
+        router.push(`/workout-detail/${workoutToStart.id}`);
+      }
     }
   };
 
   const handleWorkoutCardPress = () => {
-    if (todaysWorkoutSession) {
-      // Handle both training sessions and workout sessions
-      if ('template_id' in todaysWorkoutSession && todaysWorkoutSession.template_id) {
-        router.push(`/todays-workout/${todaysWorkoutSession.template_id}` as any);
-      } else {
-        // For training sessions without templates, navigate to session detail
-        router.push(`/workout-detail/${todaysWorkoutSession.id}`);
-      }
+    const workoutToView = clientData?.todaysWorkoutTemplate || todaysWorkoutSession;
+
+    if (workoutToView) {
+      // If it's a WorkoutTemplate (has exercises directly), navigate with template ID
+      if (workoutToView.exercises) {
+        router.push(`/todays-workout/${workoutToView.id}` as any);
+      } else if (workoutToView.template_id) {
+        // If it's a TrainingSession with a template_id
+        router.push(`/todays-workout/${workoutToView.template_id}` as any);
+      } else {
+        // Fallback for TrainingSession without a template_id
+        router.push(`/workout-detail/${workoutToView.id}`);
+      }
     }
   };