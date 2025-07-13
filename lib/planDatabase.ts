@@ .. @@
 export async function getWorkoutTemplateById(id: string): Promise<any | null> {
   try {
     const { data, error } = await supabase
       .from('workout_templates')
       .select(`
         *,
         exercises:template_exercises (
           id,
           order_index,
           sets_config,
           notes,
           exercise:exercises (
             id,
             name,
             category,
             muscle_groups,
             instructions,
             equipment,
+            difficulty_level,
             image_url,
             video_url
           )
         )
       `)
       .eq('id', id)
       .maybeSingle();
 
     if (error && error.code !== 'PGRST116') {
       console.error('Error fetching workout template:', error);
     }
     if (!data) {
       return null;
     }
     return data;
   } catch (error) {
     console.error('Error in getWorkoutTemplateById:', error);
     return null;
   }
 }