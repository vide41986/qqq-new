@@ .. @@
       const templateData = {
         id: templateId,
         name: templateName.trim(),
         description: templateDescription.trim() || null,
         category: selectedCategory,
         estimated_duration_minutes: parseInt(estimatedDuration) || 60,
         created_by: profileData.id,
         is_public: false,
-        thumbnail_url: thumbnailImage, // Save image_url
+        thumbnail_url: thumbnailImage, // Save thumbnail_url
       };