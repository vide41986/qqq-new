import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Modal, FlatList } from 'react-native';
// Custom selector will be used instead of Picker
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MealItem, MealPlanTemplate } from '@/types/meal';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useColorScheme, Colors } from '@/hooks/useColorScheme';

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type MealTime = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';

interface MealPlanFormProps {
  clientId: string;
  onSuccess?: () => void;
  initialData?: MealPlanTemplate;
}

export default function MealPlanForm({ clientId, onSuccess, initialData }: MealPlanFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);
  const [showMealSelector, setShowMealSelector] = useState(false);
  
  // Modal for meal selection
  const renderMealItem = ({ item }: { item: MealItem }) => (
    <TouchableOpacity
      style={styles.mealItem}
      onPress={() => {
        setSelectedMeal(item.id);
        setShowMealSelector(false);
      }}
    >
      <Text style={styles.mealItemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: string;
    targetCalories: string;
    targetProtein: string;
    targetCarbs: string;
    targetFat: string;
    durationWeeks: string;
    isPublic: boolean;
    meals: Record<DayOfWeek, Array<{
      mealId: string;
      mealTime: MealTime;
      notes: string;
    }>>;
  }>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || 'General',
    targetCalories: initialData?.target_calories?.toString() || '',
    targetProtein: initialData?.target_protein_g?.toString() || '',
    targetCarbs: initialData?.target_carbs_g?.toString() || '',
    targetFat: initialData?.target_fat_g?.toString() || '',
    durationWeeks: initialData?.duration_weeks?.toString() || '4',
    isPublic: initialData?.is_public || false,
    meals: {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }
  });

  // Load meal items and initial data
  useEffect(() => {
    loadMealItems();
    
    // If editing, populate form with initial data
    if (initialData) {
      const mealsByDay: Record<string, any[]> = {};
      
      initialData.meals.forEach(meal => {
        const day = meal.day_of_week as DayOfWeek;
        if (!mealsByDay[day]) {
          mealsByDay[day] = [];
        }
        mealsByDay[day].push({
          mealId: meal.meal_id,
          mealTime: meal.meal_time as MealTime,
          notes: meal.notes || ''
        });
      });
      
      setFormData(prev => ({
        ...prev,
        meals: {
          ...prev.meals,
          ...mealsByDay
        }
      }));
    }
  }, [initialData]);

  const loadMealItems = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_items')
        .select('*')
        .or(`created_by.eq.${user?.id},is_public.eq.true`)
        .order('name');
      
      if (error) throw error;
      setMealItems(data || []);
      
      // Auto-select first meal if available
      if (data?.length > 0 && !selectedMeal) {
        setSelectedMeal(data[0].id);
      }
    } catch (error) {
      console.error('Error loading meal items:', error);
      setError('Failed to load meal items');
    }
  };

  const handleAddMeal = (day: DayOfWeek, mealTime: MealTime) => {
    if (!selectedMeal) return;
    
    setFormData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [day]: [
          ...(prev.meals[day] || []),
          {
            mealId: selectedMeal,
            mealTime,
            notes: ''
          }
        ]
      }
    }));
  };

  const handleRemoveMeal = (day: DayOfWeek, index: number) => {
    setFormData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [day]: prev.meals[day].filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      setError('Please enter a name for the meal plan');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create or update meal plan template
      const { data: template, error: templateError } = initialData?.id
        ? await supabase
            .from('meal_plan_templates')
            .update({
              name: formData.name,
              description: formData.description,
              category: formData.category,
              target_calories: formData.targetCalories ? Number(formData.targetCalories) : null,
              target_protein_g: formData.targetProtein ? Number(formData.targetProtein) : null,
              target_carbs_g: formData.targetCarbs ? Number(formData.targetCarbs) : null,
              target_fat_g: formData.targetFat ? Number(formData.targetFat) : null,
              duration_weeks: formData.durationWeeks ? Number(formData.durationWeeks) : 4,
              is_public: formData.isPublic,
              updated_at: new Date().toISOString()
            })
            .eq('id', initialData.id)
            .select('*')
            .single()
        : await supabase
            .from('meal_plan_templates')
            .insert([{
              name: formData.name,
              description: formData.description,
              category: formData.category,
              target_calories: formData.targetCalories ? Number(formData.targetCalories) : null,
              target_protein_g: formData.targetProtein ? Number(formData.targetProtein) : null,
              target_carbs_g: formData.targetCarbs ? Number(formData.targetCarbs) : null,
              target_fat_g: formData.targetFat ? Number(formData.targetFat) : null,
              duration_weeks: formData.durationWeeks ? Number(formData.durationWeeks) : 4,
              is_public: formData.isPublic,
              created_by: user?.id
            }])
            .select('*')
            .single();
      
      if (templateError) throw templateError;
      if (!template) throw new Error('Failed to save meal plan');
      
      // Delete existing meals if updating
      if (initialData?.id) {
        const { error: deleteError } = await supabase
          .from('meal_plan_meals')
          .delete()
          .eq('meal_plan_id', template.id);
        
        if (deleteError) throw deleteError;
      }
      
      // Insert new meals
      const mealsToInsert = Object.entries(formData.meals).flatMap(([day, meals]) => 
        meals.map((meal, index) => ({
          meal_plan_id: template.id,
          meal_id: meal.mealId,
          meal_time: meal.mealTime,
          day_of_week: day,
          order_index: index,
          notes: meal.notes
        }))
      );
      
      if (mealsToInsert.length > 0) {
        const { error: mealsError } = await supabase
          .from('meal_plan_meals')
          .insert(mealsToInsert);
        
        if (mealsError) throw mealsError;
      }
      
      // If clientId is provided, assign this meal plan to the client
      if (clientId) {
        const { error: clientPlanError } = await supabase
          .from('client_meal_plans')
          .insert([{
            client_id: clientId,
            nutritionist_id: user?.id || '',
            template_id: template.id,
            name: template.name,
            description: template.description,
            start_date: new Date().toISOString(),
            end_date: new Date(
              new Date().setDate(new Date().getDate() + (Number(formData.durationWeeks) * 7))
            ).toISOString(),
            status: 'active'
          }]);
        
        if (clientPlanError) throw clientPlanError;
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.back();
      }
      
    } catch (error) {
      console.error('Error saving meal plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to save meal plan');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    setExpandedDay(expandedDay === day ? null : day);
  };

  const renderDayMeals = (day: DayOfWeek) => {
    const dayMeals = formData.meals[day] || [];
    
    return (
      <View style={styles.dayContainer} key={day}>
        <TouchableOpacity 
          style={styles.dayHeader}
          onPress={() => toggleDay(day)}
        >
          <Text style={styles.dayTitle}>{day}</Text>
          {expandedDay === day ? (
            <ChevronUp size={20} color={colors.text} />
          ) : (
            <ChevronDown size={20} color={colors.text} />
          )}
        </TouchableOpacity>
        
        {expandedDay === day && (
          <View style={styles.dayContent}>
            {['breakfast', 'lunch', 'dinner', 'morning_snack', 'afternoon_snack', 'evening_snack'].map((mealTime) => (
              <View key={mealTime} style={styles.mealTimeContainer}>
                <Text style={styles.mealTimeLabel}>
                  {mealTime.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Text>
                
                {dayMeals
                  .filter(meal => meal.mealTime === mealTime)
                  .map((meal, index) => {
                    const mealItem = mealItems.find(item => item.id === meal.mealId);
                    return (
                      <View key={index} style={styles.mealItem}>
                        <View style={styles.mealInfo}>
                          <Text style={styles.mealName}>
                            {mealItem?.name || 'Unknown Meal'}
                          </Text>
                          <Text style={styles.mealMacros}>
                            {mealItem ? `${mealItem.calories} cal | P:${mealItem.protein_g}g C:${mealItem.carbs_g}g F:${mealItem.fat_g}g` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleRemoveMeal(day, dayMeals.findIndex(m => m.mealId === meal.mealId && m.mealTime === mealTime))}
                          style={styles.removeButton}
                        >
                          <X size={16} color={Colors.light.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                
                <View style={styles.addMealContainer}>
                  <TouchableOpacity 
                    style={styles.mealSelectorButton}
                    onPress={() => setShowMealSelector(true)}
                  >
                    <Text style={styles.mealSelectorText}>
                      {selectedMeal ? mealItems.find(m => m.id === selectedMeal)?.name || 'Select a meal...' : 'Select a meal...'}
                    </Text>
                    <ChevronDown size={16} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => handleAddMeal(day, mealTime as MealTime)}
                    disabled={!selectedMeal}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Meal Plan Name</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="e.g., Weight Loss Meal Plan"
          placeholderTextColor="#999"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          placeholder="Describe this meal plan..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>
      
      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Category</Text>
          <Picker
            selectedValue={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            style={styles.picker}
          >
            <Picker.Item label="Weight Loss" value="Weight Loss" />
            <Picker.Item label="Muscle Gain" value="Muscle Gain" />
            <Picker.Item label="Maintenance" value="Maintenance" />
            <Picker.Item label="Vegan" value="Vegan" />
            <Picker.Item label="Keto" value="Keto" />
            <Picker.Item label="Low Carb" value="Low Carb" />
            <Picker.Item label="High Protein" value="High Protein" />
            <Picker.Item label="General" value="General" />
          </Picker>
        </View>
        
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Duration (weeks)</Text>
          <TextInput
            style={styles.input}
            value={formData.durationWeeks}
            onChangeText={(text) => setFormData(prev => ({ ...prev, durationWeeks: text }))}
            placeholder="4"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nutritional Targets (optional)</Text>
      </View>
      
      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Calories</Text>
          <TextInput
            style={styles.input}
            value={formData.targetCalories}
            onChangeText={(text) => {
              setFormData(prev => ({
                ...prev,
                targetCalories: text
              }));
            }}
            placeholder="e.g., 2000"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            style={styles.input}
            value={formData.targetProtein}
            onChangeText={(text) => setFormData(prev => ({ ...prev, targetProtein: text }))}
            placeholder="e.g., 150"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>
      
      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput
            style={styles.input}
            value={formData.targetCarbs}
            onChangeText={(text) => setFormData(prev => ({ ...prev, targetCarbs: text }))}
            placeholder="e.g., 200"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput
            style={styles.input}
            value={formData.targetFat}
            onChangeText={(text) => setFormData(prev => ({ ...prev, targetFat: text }))}
            placeholder="e.g., 65"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>
      
      <View style={styles.publicToggleContainer}>
        <Text style={styles.publicToggleLabel}>Make this meal plan public</Text>
        <Switch
          value={formData.isPublic}
          onValueChange={(value) => setFormData(prev => ({ ...prev, isPublic: value }))}
          trackColor={{ false: '#767577', true: colors.primary }}
          thumbColor="#f4f3f4"
        />
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Weekly Meal Schedule</Text>
      </View>
      
      {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as DayOfWeek[]).map(day => 
        renderDayMeals(day)
      )}
      
      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Saving...' : 'Save Meal Plan'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  publicToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  publicToggleLabel: {
    fontSize: 14,
    color: '#555',
  },
  dayContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dayContent: {
    padding: 12,
  },
  mealTimeContainer: {
    marginBottom: 16,
  },
  mealTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  mealMacros: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  addMealContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  mealPicker: {
    flex: 1,
    height: 40,
    marginRight: 8,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
});
