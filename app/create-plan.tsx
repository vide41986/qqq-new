@@ .. @@
         // 2) ALSO mirror the same rows into the training_sessions table so that
         //    the client dashboard (which queries training_sessions) can see them.
         //    We build the minimal fields required by training_sessions.
         try {
-          const trainingSessionRows = sessions.map(s => ({
+          const trainingSessionRows = await Promise.all(sessions.map(async (s) => {
+            // Get template details if template_id exists
+            let templateDetails = null;
+            if (s.template_id) {
+              const { data: template } = await supabase
+                .from('workout_templates')
+                .select('estimated_duration_minutes, category')
+                .eq('id', s.template_id)
+                .single();
+              templateDetails = template;
+            }
+
+            return {
             client_id: plan.client_id,
             trainer_id: plan.trainer_id,
             template_id: s.template_id ?? null,
             plan_id: plan.id,
             scheduled_date: s.scheduled_date,
-            scheduled_time: null,
-            duration: 0,
-            session_type: 'workout',
+            scheduled_time: s.scheduled_time || null,
+            duration_minutes: templateDetails?.estimated_duration_minutes || 60,
+            session_type: templateDetails?.category || 'workout',
             status: s.status, // scheduled
             session_data: {},
             completion_data: {},
-          }));
+            location: null, // Can be set later by trainer
+            notes: s.notes || null,
+            };
+          }));
 
           if (trainingSessionRows.length > 0) {
             const { error } = await supabase
               .from('training_sessions')
               .insert(trainingSessionRows);
             if (error) {
               console.error('Error mirroring sessions into training_sessions:', error);
             }
           }
         } catch (mirrorErr) {
           console.error('Unexpected error while mirroring training sessions:', mirrorErr);
         }