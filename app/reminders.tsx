import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, Platform, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { Reminder } from '../types';
import { Plus, Bell, Trash2, X, ArrowLeft, CheckCircle2, Circle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
// Notifications disabled for Expo Go compatibility

export default function RemindersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const requestPermissions = async () => {
    // Notifications disabled in Expo Go
    return false;
  };

  const fetchReminders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user?.id)
      .order('reminder_time', { ascending: true });
      
    if (data) setReminders(data);
    setLoading(false);
  };

  const saveReminder = async () => {
    if (!title.trim() || !time.trim()) {
      Alert.alert('Error', 'Title and Time are required');
      return;
    }

    setSaving(true);
    try {
      const hasPermission = await requestPermissions();
      
      let reminderDate = new Date();
      // Try to parse time (simple format HH:MM)
      if (time.includes(':')) {
        const [hours, minutes] = time.split(':');
        reminderDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      } else {
        // Just add 1 hour if format is invalid for simple testing
        reminderDate.setHours(reminderDate.getHours() + 1);
      }
      
      // Local notification scheduling disabled in Expo Go

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: description.trim(),
          reminder_time: reminderDate.toISOString(),
          completed: false
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setReminders([...reminders, data].sort((a, b) => a.reminder_time.localeCompare(b.reminder_time)));
        closeModal();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save reminder');
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (id: string, current: boolean) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !current } : r));
    await supabase.from('reminders').update({ completed: !current }).eq('id', id);
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (!error) {
      setReminders(reminders.filter(r => r.id !== id));
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setTitle('');
    setDescription('');
    setTime('');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <View className="px-4 py-3 flex-row justify-between items-center bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft color={isDarkMode ? "#f8fafc" : "#374151"} size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">Reminders</Text>
        <TouchableOpacity onPress={() => setIsModalVisible(true)} className="w-10 h-10 items-center justify-center">
          <Plus color="#f97316" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-6" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#f97316" className="mt-10" />
        ) : reminders.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Bell color="#cbd5e1" size={48} className="mb-4" />
            <Text className="text-gray-400 dark:text-gray-500 font-medium text-lg">No reminders set</Text>
          </View>
        ) : (
          reminders.map(reminder => (
            <View key={reminder.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700  mb-4 flex-row items-center">
              <TouchableOpacity onPress={() => toggleReminder(reminder.id, reminder.completed)} className="mr-4">
                {reminder.completed ? (
                  <CheckCircle2 color="#10b981" size={28} />
                ) : (
                  <Circle color={isDarkMode ? "#475569" : "#cbd5e1"} size={28} />
                )}
              </TouchableOpacity>
              
              <View className="flex-1">
                <Text className={`text-lg font-bold text-gray-900 dark:text-white mb-1 ${reminder.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                  {reminder.title}
                </Text>
                {reminder.description && (
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">{reminder.description}</Text>
                )}
                <View className="flex-row items-center">
                  <View className="bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md flex-row items-center">
                    <Bell color="#f97316" size={12} className="mr-1" />
                    <Text className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                      {new Date(reminder.reminder_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={() => deleteReminder(reminder.id)} className="p-2">
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Reminder Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={closeModal}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 h-[75%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">New Reminder</Text>
              <TouchableOpacity onPress={closeModal} className="bg-gray-100 dark:bg-slate-700 p-2 rounded-full">
                <X color={isDarkMode ? "#e2e8f0" : "#374151"} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white mb-4"
                placeholder="What to remind you about?"
                placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                value={title}
                onChangeText={setTitle}
              />

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time (HH:MM)</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white mb-4"
                placeholder="14:30"
                placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                value={time}
                onChangeText={setTime}
              />

              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white mb-8 min-h-[100px]"
                placeholder="Extra details..."
                placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity onPress={saveReminder} disabled={saving} className="bg-orange-500 py-4 rounded-xl items-center  mb-10">
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Set Reminder</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
