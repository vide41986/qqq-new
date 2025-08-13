import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  User,
  ChevronDown,
  X,
  Save,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Trash2,
  ChefHat,
  Target,
  Zap,
} from 'lucide-react-native';
import { useColorScheme, getColors } from '@/hooks/useColorScheme';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { MealPlan, MealType } from '@/types/workout';
import { 
  getNutritionistClients, 
  createMealPlan, 
  updateMealPlan, 
  getMealPlanById,
  getMealTypes 
} from '@/lib/mealPlanQueries';
import { supabase, uploadImageWithRetry } from '@/lib/supabase';

interface ClientProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface MealEntry {
  id: string;
  meal_type_id: string;
  title: string;
  description: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  image_url: string;
  is_ai_generated: boolean;
  quantity: string;
  notes: string;
}

interface DayPlan {
  date: string;
  meals: MealEntry[];
  notes: string;
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function CreateMealPlanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = getColors(colorScheme);
  const styles = createStyles(colors);
  const { edit } = useLocalSearchParams();

  // Form state
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  });
  const [titleImage, setTitleImage] = useState('');
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);

  // Data state
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Modal state
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showMealItemPicker, setShowMealItemPicker] = useState(false);
  const [editingMeal, setEditingMeal] = useState<{ dayIndex: number; mealIndex: number } | null>(null);

  const isEditing = !!edit;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    generateDayPlans();
  }, [startDate, endDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const [clientsData, mealTypesData] = await Promise.all([
        getNutritionistClients(),
        getMealTypes(),
      ]);

      setClients(clientsData);
      setMealTypes(mealTypesData);

      if (isEditing && typeof edit === 'string') {
        await loadExistingPlan(edit);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingPlan = async (planId: string) => {
    try {
      const plan = await getMealPlanById(planId);
      if (plan) {
        setPlanName(plan.name);
        setPlanDescription(plan.description || '');
        setStartDate(new Date(plan.start_date));
        setEndDate(new Date(plan.end_date));
        setTitleImage(plan.title_image_url || '');

        const client = clients.find(c => c.id === plan.client_id);
        if (client) {
          setSelectedClient(client);
        }
      }
    } catch (error) {
      console.error('Error loading existing plan:', error);
      Alert.alert('Error', 'Failed to load meal plan data');
    }
  };

  const generateDayPlans = () => {
    const days: DayPlan[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      days.push({
        date: current.toISOString().split('T')[0],
        meals: [],
        notes: '',
      });
      current.setDate(current.getDate() + 1);
    }

    setDayPlans(days);
  };

  const handleImageUpload = async (isForMeal = false, dayIndex?: number, mealIndex?: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission required', 'Please grant photo library access to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        
        try {
          // Get the current user ID to create a user-specific folder
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          // Create a unique filename with timestamp
          const timestamp = new Date().getTime();
          const fileExt = imageUri.split('.').pop();
          const fileName = `${user.id}/${timestamp}.${fileExt}`;
          
          // Upload the file to the meal-plans bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('meal-plans')
            .upload(fileName, {
              uri: imageUri,
              type: `image/${fileExt}`,
              name: fileName,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          // Get the public URL of the uploaded file
          const { data: { publicUrl } } = supabase.storage
            .from('meal-plans')
            .getPublicUrl(fileName);

          if (publicUrl) {
            if (isForMeal && dayIndex !== undefined && mealIndex !== undefined) {
              updateMealImage(dayIndex, mealIndex, publicUrl, false);
            } else {
              setTitleImage(publicUrl);
            }
          } else {
            throw new Error('Failed to get public URL');
          }
        } catch (error) {
          console.error('Upload error:', error);
          Alert.alert(
            'Upload Failed', 
            error.message || 'Failed to upload image. Please try again.'
          );
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error in handleImageUpload:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setUploadingImage(false);
    }
  };

  const handleAIImageGeneration = async (isForMeal = false, dayIndex?: number, mealIndex?: number, prompt?: string) => {
    try {
      setGeneratingAI(true);
      
      // Get current user ID for storage path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Mock AI image generation - replace with actual AI service integration
      const mockAIImages = [
        'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800',
        'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=800',
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would call your AI image generation API here
      // For now, we'll use a mock image URL
      const aiImageUrl = mockAIImages[Math.floor(Math.random() * mockAIImages.length)];
      
      // Download the AI-generated image
      const response = await fetch(aiImageUrl);
      const blob = await response.blob();
      
      // Create a unique filename with timestamp
      const timestamp = new Date().getTime();
      const fileExt = 'jpg'; // Assuming JPG for AI-generated images
      const fileName = `${user.id}/ai_${timestamp}.${fileExt}`;
      
      // Upload the AI-generated image to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('meal-plans')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('AI image upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('meal-plans')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for AI-generated image');
      }
      
      // Update the UI with the new image
      if (isForMeal && dayIndex !== undefined && mealIndex !== undefined) {
        updateMealImage(dayIndex, mealIndex, publicUrl, true);
      } else {
        setTitleImage(publicUrl);
      }
      
      Alert.alert('Success', 'AI image generated and saved successfully!');
    } catch (error) {
      console.error('Error in AI image generation:', error);
      Alert.alert(
        'Generation Failed', 
        error.message || 'Failed to generate AI image. Please try again.'
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const updateMealImage = (dayIndex: number, mealIndex: number, imageUrl: string, isAI: boolean) => {
    setDayPlans(prev => {
      const updated = [...prev];
      if (updated[dayIndex] && updated[dayIndex].meals[mealIndex]) {
        updated[dayIndex].meals[mealIndex].image_url = imageUrl;
        updated[dayIndex].meals[mealIndex].is_ai_generated = isAI;
      }
      return updated;
    });
  };

  const addMealToDay = (dayIndex: number) => {
    const newMeal: MealEntry = {
      id: generateUUID(),
      meal_type_id: mealTypes[0]?.id || '',
      title: '',
      description: '',
      time: '12:00',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      image_url: '',
      is_ai_generated: false,
      quantity: '',
      notes: '',
    };

    setDayPlans(prev => {
      const updated = [...prev];
      updated[dayIndex].meals.push(newMeal);
      return updated;
    });
  };

  const removeMealFromDay = (dayIndex: number, mealIndex: number) => {
    setDayPlans(prev => {
      const updated = [...prev];
      updated[dayIndex].meals.splice(mealIndex, 1);
      return updated;
    });
  };

  const editMeal = (dayIndex: number, mealIndex: number) => {
    const meal = dayPlans[dayIndex].meals[mealIndex];
    setTempMeal({ ...meal });
    setEditingMeal({ dayIndex, mealIndex });
  };

  const saveMealEdit = () => {
    if (editingMeal && tempMeal) {
      setDayPlans(prev => {
        const updated = [...prev];
        updated[editingMeal.dayIndex].meals[editingMeal.mealIndex] = { ...tempMeal };
        return updated;
      });
      setEditingMeal(null);
      setTempMeal(null);
    }
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }

    if (!selectedClient) {
      Alert.alert('Error', 'Please select a client');
      return;
    }

    if (startDate >= endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      setSaving(true);

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        Alert.alert('Error', 'User profile not found');
        return;
      }

      const planData = {
        client_id: selectedClient.id,
        nutritionist_id: profile.id,
        name: planName.trim(),
        description: planDescription.trim() || undefined,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'draft' as const,
        title_image_url: titleImage || undefined,
      };

      let savedPlan: MealPlan | null = null;

      if (isEditing && typeof edit === 'string') {
        savedPlan = await updateMealPlan(edit, planData);
      } else {
        savedPlan = await createMealPlan(planData);
      }

      if (savedPlan) {
        // TODO: Save day plans and meal entries
        // This would involve creating meal_plan_days and meal_plan_entries records
        
        Alert.alert(
          'Success',
          `Meal plan ${isEditing ? 'updated' : 'created'} successfully!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'Failed to save meal plan');
      }
    } catch (error) {
      console.error('Error saving meal plan:', error);
      Alert.alert('Error', 'Failed to save meal plan');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMealTypeName = (mealTypeId: string) => {
    const mealType = mealTypes.find(mt => mt.id === mealTypeId);
    return mealType ? `${mealType.emoji} ${mealType.name}` : 'Unknown Meal';
  };

  const renderDayPlan = (dayPlan: DayPlan, dayIndex: number) => {
    const dayDate = new Date(dayPlan.date);
    
    return (
      <View key={dayPlan.date} style={styles.dayPlanCard}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDate(dayDate)}</Text>
          <TouchableOpacity
            style={styles.addMealButton}
            onPress={() => addMealToDay(dayIndex)}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={styles.addMealText}>Add Meal</Text>
          </TouchableOpacity>
        </View>

        {dayPlan.meals.length === 0 ? (
          <View style={styles.emptyMealsContainer}>
            <ChefHat size={32} color={colors.textTertiary} />
            <Text style={styles.emptyMealsText}>No meals planned for this day</Text>
            <TouchableOpacity
              style={styles.addFirstMealButton}
              onPress={() => addMealToDay(dayIndex)}
            >
              <Text style={styles.addFirstMealText}>Add First Meal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mealsContainer}>
            {dayPlan.meals.map((meal, mealIndex) => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealTypeContainer}>
                    <Text style={styles.mealType}>{getMealTypeName(meal.meal_type_id)}</Text>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                  </View>
                  <View style={styles.mealActions}>
                    <TouchableOpacity
                      style={styles.mealActionButton}
                      onPress={() => editMeal(dayIndex, mealIndex)}
                    >
                      <Text style={styles.mealActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.mealActionButton}
                      onPress={() => removeMealFromDay(dayIndex, mealIndex)}
                    >
                      <Trash2 size={14} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {meal.image_url && (
                  <View style={styles.mealImageContainer}>
                    <Image source={{ uri: meal.image_url }} style={styles.mealImage} />
                    {meal.is_ai_generated && (
                      <View style={styles.aiGeneratedBadge}>
                        <Sparkles size={12} color="#FFFFFF" />
                        <Text style={styles.aiGeneratedText}>AI</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.mealContent}>
                  <Text style={styles.mealTitle}>{meal.title || 'Untitled Meal'}</Text>
                  {meal.description && (
                    <Text style={styles.mealDescription}>{meal.description}</Text>
                  )}
                  
                  <View style={styles.nutritionInfo}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{meal.calories}</Text>
                      <Text style={styles.nutritionLabel}>cal</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{meal.protein_g}g</Text>
                      <Text style={styles.nutritionLabel}>protein</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{meal.carbs_g}g</Text>
                      <Text style={styles.nutritionLabel}>carbs</Text>
                    </View>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionValue}>{meal.fat_g}g</Text>
                      <Text style={styles.nutritionLabel}>fat</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading meal plan data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? 'Edit Meal Plan' : 'Create Meal Plan'}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSavePlan}
          disabled={saving}
        >
          <Save size={16} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Information</Text>
          
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Plan Name *</Text>
            <TextInput
              style={styles.textInput}
              value={planName}
              onChangeText={setPlanName}
              placeholder="Enter meal plan name"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={planDescription}
              onChangeText={setPlanDescription}
              placeholder="Describe this meal plan..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Title Image */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Plan Cover Image</Text>
            <View style={styles.imageUploadContainer}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginRight: 12 }]}
                value={titleImage}
                onChangeText={setTitleImage}
                placeholder="Enter image URL or upload/generate"
                placeholderTextColor={colors.textTertiary}
              />
              <View style={styles.imageActions}>
                <TouchableOpacity 
                  style={[styles.imageActionButton, uploadingImage && styles.disabledButton]}
                  onPress={() => handleImageUpload(false)}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Upload size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.aiButton, generatingAI && styles.disabledButton]}
                  onPress={() => handleAIImageGeneration(false)}
                  disabled={generatingAI}
                >
                  {generatingAI ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Sparkles size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {titleImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: titleImage }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setTitleImage('')}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Client Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Assignment *</Text>
          
          {clients.length === 0 ? (
            <View style={styles.noClientsContainer}>
              <Text style={styles.noClientsText}>No clients assigned to you</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowClientPicker(true)}
            >
              <User size={20} color={colors.textSecondary} />
              <Text style={[
                styles.pickerText,
                !selectedClient && styles.placeholderText
              ]}>
                {selectedClient ? selectedClient.full_name : 'Select a client'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range *</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.dateButtonText}>
                  {startDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.dateButtonText}>
                  {endDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Daily Meal Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Meal Plans</Text>
          <Text style={styles.sectionSubtitle}>
            Plan meals for each day. You can add multiple meals per day and customize nutrition details.
          </Text>
          
          {dayPlans.map(renderDayPlan)}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Client Picker Modal */}
      <Modal
        visible={showClientPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClientPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Client</Text>
            <TouchableOpacity onPress={() => setShowClientPicker(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.clientList}>
            {clients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={[
                  styles.clientOption,
                  selectedClient?.id === client.id && styles.selectedClientOption
                ]}
                onPress={() => {
                  setSelectedClient(client);
                  setShowClientPicker(false);
                }}
              >
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.full_name}</Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                </View>
                {selectedClient?.id === client.id && (
                  <Text style={styles.selectedIndicator}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Meal Edit Modal */}
      <Modal
        visible={!!editingMeal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingMeal(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingMeal(null)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Meal</Text>
            <TouchableOpacity onPress={saveMealEdit}>
              <Save size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {tempMeal && (
            <ScrollView style={styles.mealEditContent}>
              {/* Meal Image */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Meal Image</Text>
                <View style={styles.imageUploadContainer}>
                  <TextInput
                    style={[styles.textInput, { flex: 1, marginRight: 12 }]}
                    value={tempMeal.image_url}
                    onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, image_url: text } : null)}
                    placeholder="Enter image URL"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <View style={styles.imageActions}>
                    <TouchableOpacity 
                      style={styles.imageActionButton}
                      onPress={() => handleImageUpload(true, editingMeal?.dayIndex, editingMeal?.mealIndex)}
                    >
                      <Upload size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.aiButton}
                      onPress={() => handleAIImageGeneration(true, editingMeal?.dayIndex, editingMeal?.mealIndex, tempMeal.title)}
                    >
                      <Sparkles size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.aiToggleContainer}>
                  <Text style={styles.aiToggleLabel}>AI Generated</Text>
                  <Switch
                    value={tempMeal.is_ai_generated}
                    onValueChange={(value) => setTempMeal(prev => prev ? { ...prev, is_ai_generated: value } : null)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>

                {tempMeal.image_url && (
                  <Image source={{ uri: tempMeal.image_url }} style={styles.mealEditImagePreview} />
                )}
              </View>

              {/* Basic Info */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Meal Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={tempMeal.title}
                  onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, title: text } : null)}
                  placeholder="Enter meal title"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tempMeal.description}
                  onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, description: text } : null)}
                  placeholder="Describe the meal..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempMeal.time}
                    onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, time: text } : null)}
                    placeholder="12:00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.fieldLabel}>Quantity</Text>
                  <TextInput
                    style={styles.textInput}
                    value={tempMeal.quantity}
                    onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, quantity: text } : null)}
                    placeholder="1 serving"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>

              {/* Nutrition Info */}
              <Text style={styles.sectionTitle}>Nutrition Information</Text>
              
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionInputField}>
                  <Text style={styles.fieldLabel}>Calories</Text>
                  <View style={styles.nutritionInputContainer}>
                    <Zap size={16} color={colors.warning} />
                    <TextInput
                      style={styles.nutritionInput}
                      value={tempMeal.calories.toString()}
                      onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, calories: parseInt(text) || 0 } : null)}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.nutritionInputField}>
                  <Text style={styles.fieldLabel}>Protein (g)</Text>
                  <View style={styles.nutritionInputContainer}>
                    <Target size={16} color={colors.error} />
                    <TextInput
                      style={styles.nutritionInput}
                      value={tempMeal.protein_g.toString()}
                      onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, protein_g: parseFloat(text) || 0 } : null)}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.nutritionInputField}>
                  <Text style={styles.fieldLabel}>Carbs (g)</Text>
                  <View style={styles.nutritionInputContainer}>
                    <Target size={16} color={colors.primary} />
                    <TextInput
                      style={styles.nutritionInput}
                      value={tempMeal.carbs_g.toString()}
                      onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, carbs_g: parseFloat(text) || 0 } : null)}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.nutritionInputField}>
                  <Text style={styles.fieldLabel}>Fat (g)</Text>
                  <View style={styles.nutritionInputContainer}>
                    <Target size={16} color={colors.success} />
                    <TextInput
                      style={styles.nutritionInput}
                      value={tempMeal.fat_g.toString()}
                      onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, fat_g: parseFloat(text) || 0 } : null)}
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={tempMeal.notes}
                  onChangeText={(text) => setTempMeal(prev => prev ? { ...prev, notes: text } : null)}
                  placeholder="Add any special notes..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  formField: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formFieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imageUploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  imageActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButton: {
    backgroundColor: colors.warning,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 12,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  pickerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textTertiary,
  },
  noClientsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noClientsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text,
  },
  dayPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: colors.text,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addMealText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  emptyMealsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMealsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  addFirstMealButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addFirstMealText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  mealsContainer: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTypeContainer: {
    flex: 1,
  },
  mealType: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  mealTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  mealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mealActionButton: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mealActionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.primary,
  },
  mealImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  mealImage: {
    width: '100%',
    height: 80,
    borderRadius: 6,
  },
  aiGeneratedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  aiGeneratedText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  mealContent: {
    gap: 4,
  },
  mealTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  mealDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: colors.text,
  },
  nutritionLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: colors.textTertiary,
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
  clientList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
  },
  selectedClientOption: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
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
  clientEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedIndicator: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.primary,
  },
  mealEditContent: {
    flex: 1,
    padding: 20,
  },
  aiToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  aiToggleLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.text,
  },
  mealEditImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  nutritionInputField: {
    flex: 1,
    minWidth: '45%',
  },
  nutritionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  nutritionInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.text,
  },
});