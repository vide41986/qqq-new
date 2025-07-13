@@ .. @@
 export async function getWorkoutTemplate(templateId: string): Promise<WorkoutTemplate | null> {
   try {
     console.log('🔍 Fetching template with ID:', templateId);
     
     const { data, error } = await supabase
       .from('workout_templates')
       .select(`
         *,
         exercises:template_exercises(
           order_index,
           sets_config,
           notes,
-          exercise:exercise_id(*)
+          exercise:exercise_id(
+            id,
+            name,
+            category,
+            muscle_groups,
+            instructions,
+            equipment,
+            difficulty_level,
+            image_url,
+            video_url,
+            is_public,
+            created_by,
+            created_at,
+            updated_at
+          )
         )
       `)
       .eq('id', templateId)
       .maybeSingle();
   }
 }