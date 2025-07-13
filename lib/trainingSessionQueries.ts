@@ .. @@
 // Fetch all training sessions for a client and plan
 export const getTrainingSessionsForPlanSessions = async (
   clientId: string,
   planId: string
 ): Promise<TrainingSession[]> => {
   try {
    // If trainerId is empty, get it from current user
    let actualTrainerId = trainerId;
    if (!trainerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return [];
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) {
        console.error('No profile found for user');
        return [];
      }
      
      actualTrainerId = profile.id;
    }
    
     const { data: sessions, error } = await supabase
       .from('training_sessions')
       .select('*')
      .eq('trainer_id', actualTrainerId)
       .eq('plan_id', planId);
 
     if (error) {
       console.error('Error fetching training sessions for plan sessions:', error);
       return [];
     }
     return sessions || [];
   } catch (error) {
     console.error('Error in getTrainingSessionsForPlanSessions:', error);
     return [];
   }
 };
 
+// Get workout template with proper error handling
+const getWorkoutTemplate = async (templateId: string): Promise<any | null> => {
+  try {
+    const { data, error } = await supabase
+      .from('workout_templates')
+      .select(`
+        *,
+        exercises:template_exercises (
+          id,
+          order_index,
+          sets_config,
+          notes,
+          exercise:exercises (
+            id,
+            name,
+            category,
+            muscle_groups,
+            instructions,
+            equipment,
+            image_url,
+            video_url,
+            difficulty_level
+          )
+        )
+      `)
+      .eq('id', templateId)
+      .maybeSingle();
+
+    if (error && error.code !== 'PGRST116') {
+      console.error('Error fetching workout template:', error);
+    }
+    if (!data) {
+      return null;
+    }
+    return data;
+  } catch (error) {
+    console.error('Error in getWorkoutTemplate:', error);
+    return null;
+  }
+};
+
 // Mark past scheduled sessions as missed
 export const markPastSessionsAsMissed = async (clientId: string): Promise<void> => {
   try {
     console.log('🔍 Checking for past scheduled sessions to mark as missed...');
     
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const todayStr = today.toISOString().split('T')[0];
     
     // Find all scheduled sessions that are in the past
     const { data: pastSessions, error } = await supabase
       .from('training_sessions')
       .select('id, scheduled_date, status')
       .eq('client_id', clientId)
       .eq('status', 'scheduled')
       .lt('scheduled_date', todayStr);
 
     if (error) {
       console.error('❌ Error fetching past sessions:', error);
       return;
     }
 
     if (!pastSessions || pastSessions.length === 0) {
       console.log('✅ No past scheduled sessions found');
       return;
     }
 
     console.log(`📊 Found ${pastSessions.length} past scheduled sessions to mark as missed`);
 
     // Update all past sessions to missed status
     const sessionIds = pastSessions.map(s => s.id);
     const { error: updateError } = await supabase
       .from('training_sessions')
       .update({ 
         status: 'no_show',
         updated_at: new Date().toISOString()
       })
       .in('id', sessionIds);
 
     if (updateError) {
       console.error('❌ Error updating past sessions to missed:', updateError);
     } else {
       console.log(`✅ Successfully marked ${sessionIds.length} sessions as missed`);
     }
   } catch (error) {
     console.error('❌ Error in markPastSessionsAsMissed:', error);
   }
 };