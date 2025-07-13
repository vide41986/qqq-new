@@ .. @@
 export interface Exercise {
   id: string;
   name: string;
   category: string;
   muscle_groups: string[];
   instructions?: string;
   equipment?: string;
+  difficulty_level?: string;
   created_by?: string;
   is_public: boolean;
   created_at: string;
   updated_at: string;
   video_url?: string; // Added video_url
   image_url?: string; // Added image_url
 }