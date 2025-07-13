@@ .. @@
       const exerciseData = {
         id: isEditing ? (edit as string) : generateUUID(),
         name: exerciseName.trim(),
         category: selectedCategory,
         muscle_groups: selectedMuscleGroups,
         instructions: instructions.trim() || null,
         equipment: selectedEquipment || null,
-        difficulty_level: difficulty.toLowerCase(),
+        difficulty_level: difficulty.toLowerCase(),
+        video_url: videoUrl.trim() || null,
+        image_url: imageUrl.trim() || null,
         created_by: profileData.id, // Use profile UUID
         is_public: false,
-        video_url: videoUrl.trim() || null,
-        image_url: imageUrl.trim() || null,
       };