import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { Subject } from '../types';
// Notifications disabled for Expo Go compatibility
import { Bell, Calendar as CalendarIcon, BookOpen, AlertCircle } from 'lucide-react-native';

export default function NewTaskScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [category, setCategory] = useState<'Homework' | 'Revision' | 'Exam' | 'Personal'>('Homework');
  const [loading, setLoading] = useState(false);
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  
  const [dateOption, setDateOption] = useState<'Today' | 'Tomorrow' | 'Next Week' | 'Custom'>('Today');
  const [customDate, setCustomDate] = useState('');
  
  const [remindMe, setRemindMe] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').eq('user_id', user?.id);
    if (data) setSubjects(data);
  };

  const getDueDate = () => {
    const date = new Date();
    if (dateOption === 'Tomorrow') {
      date.setDate(date.getDate() + 1);
    } else if (dateOption === 'Next Week') {
      date.setDate(date.getDate() + 7);
    } else if (dateOption === 'Custom' && customDate) {
      // Basic parse for MM/DD/YYYY
      const parts = customDate.split('/');
      if (parts.length === 3) {
        date.setMonth(parseInt(parts[0], 10) - 1);
        date.setDate(parseInt(parts[1], 10));
        date.setFullYear(parseInt(parts[2], 10));
      }
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const requestPermissions = async () => {
    // Notifications disabled in Expo Go
    return false;
  };

  const scheduleReminder = async (dueDate: Date, taskTitle: string) => {
    // Local notification scheduling disabled in Expo Go
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setLoading(true);
    const dueDate = getDueDate();

    const { data, error } = await supabase.from('tasks').insert({
      user_id: user?.id,
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      subject_id: selectedSubjectId,
      due_date: dueDate.toISOString(),
      completed: false,
    }).select().single();

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (remindMe) {
        await scheduleReminder(dueDate, title.trim());
      }
      router.back();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-100 bg-white z-10">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-500 text-lg">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">New Task</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#6366f1" /> : <Text className="text-primary-600 font-bold text-lg">Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Task Title</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
            placeholder="e.g., Finish Math Assignment"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Due Date</Text>
          <View className="flex-row flex-wrap bg-gray-50 p-1 rounded-xl border border-gray-200 mb-3">
            <TouchableOpacity
              onPress={() => setDateOption('Today')}
              className={dateOption === 'Today' ? 'flex-1 py-3 items-center rounded-lg min-w-[20%] bg-white ' : 'flex-1 py-3 items-center rounded-lg min-w-[20%]'}
            >
              <Text className={`font-semibold text-xs ${dateOption === 'Today' ? 'text-gray-900' : 'text-gray-500'}`}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDateOption('Tomorrow')}
              className={dateOption === 'Tomorrow' ? 'flex-1 py-3 items-center rounded-lg min-w-[20%] bg-white ' : 'flex-1 py-3 items-center rounded-lg min-w-[20%]'}
            >
              <Text className={`font-semibold text-xs ${dateOption === 'Tomorrow' ? 'text-gray-900' : 'text-gray-500'}`}>Tomorrow</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDateOption('Next Week')}
              className={dateOption === 'Next Week' ? 'flex-1 py-3 items-center rounded-lg min-w-[20%] bg-white ' : 'flex-1 py-3 items-center rounded-lg min-w-[20%]'}
            >
              <Text className={`font-semibold text-xs ${dateOption === 'Next Week' ? 'text-gray-900' : 'text-gray-500'}`}>Next Week</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDateOption('Custom')}
              className={dateOption === 'Custom' ? 'flex-1 py-3 items-center rounded-lg min-w-[20%] bg-white ' : 'flex-1 py-3 items-center rounded-lg min-w-[20%]'}
            >
              <Text className={`font-semibold text-xs ${dateOption === 'Custom' ? 'text-gray-900' : 'text-gray-500'}`}>Custom</Text>
            </TouchableOpacity>
          </View>
          {dateOption === 'Custom' && (
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
              placeholder="MM/DD/YYYY"
              value={customDate}
              onChangeText={setCustomDate}
            />
          )}
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Subject (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {subjects.length === 0 ? (
              <Text className="text-gray-400 italic">No subjects added yet. Add them in Study tab.</Text>
            ) : (
              subjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  onPress={() => setSelectedSubjectId(subject.id === selectedSubjectId ? null : subject.id)}
                  className={`px-4 py-2 rounded-full mr-2 border ${selectedSubjectId === subject.id ? 'bg-primary-500 border-primary-500' : 'bg-white border-gray-200'}`}
                >
                  <Text className={`font-medium ${selectedSubjectId === subject.id ? 'text-white' : 'text-gray-700'}`}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Priority</Text>
          <View className="flex-row justify-between bg-gray-50 p-1 rounded-xl border border-gray-200">
            <TouchableOpacity
              onPress={() => setPriority('Low')}
              className={priority === 'Low' ? 'flex-1 py-3 items-center rounded-lg bg-white ' : 'flex-1 py-3 items-center rounded-lg'}
            >
              <Text className={`font-semibold ${priority === 'Low' ? 'text-gray-900' : 'text-gray-500'}`}>Low</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setPriority('Medium')}
              className={priority === 'Medium' ? 'flex-1 py-3 items-center rounded-lg bg-white ' : 'flex-1 py-3 items-center rounded-lg'}
            >
              <Text className={`font-semibold ${priority === 'Medium' ? 'text-gray-900' : 'text-gray-500'}`}>Medium</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPriority('High')}
              className={priority === 'High' ? 'flex-1 py-3 items-center rounded-lg bg-white ' : 'flex-1 py-3 items-center rounded-lg'}
            >
              <Text className={`font-semibold ${priority === 'High' ? 'text-gray-900' : 'text-gray-500'}`}>High</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
          <View className="flex-row justify-between bg-gray-50 p-1 rounded-xl border border-gray-200">
            <TouchableOpacity
              onPress={() => setCategory('Homework')}
              className={category === 'Homework' ? 'flex-1 py-3 items-center rounded-lg bg-white ' : 'flex-1 py-3 items-center rounded-lg'}
            >
              <Text className={`font-semibold text-xs ${category === 'Homework' ? 'text-gray-900' : 'text-gray-500'}`}>Homework</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setCategory('Revision')}
              className={category === 'Revision' ? 'flex-1 py-3 items-center rounded-lg bg-white ' : 'flex-1 py-3 items-center rounded-lg'}
            >
              <Text className={`font-semibold text-xs ${category === 'Revision' ? 'text-gray-900' : 'text-gray-500'}`}>Revision</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCategory('Exam')}
              className={category === 'Exam' ? 'flex-1 py-3 items-center rounded-lg bg-white ' : 'flex-1 py-3 items-center rounded-lg'}
            >
              <Text className={`font-semibold text-xs ${category === 'Exam' ? 'text-gray-900' : 'text-gray-500'}`}>Exam</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCategory('Personal')}
              className={category === 'Personal' ? 'flex-1 py-3 items-center rounded-lg bg-white ' : 'flex-1 py-3 items-center rounded-lg'}
            >
              <Text className={`font-semibold text-xs ${category === 'Personal' ? 'text-gray-900' : 'text-gray-500'}`}>Personal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Description (Optional)</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
            placeholder="Add any extra details here..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View className="mb-10 bg-gray-50 p-4 rounded-xl border border-gray-200 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="bg-orange-100 p-2 rounded-full mr-3">
              <Bell color="#f97316" size={20} />
            </View>
            <View>
              <Text className="font-bold text-gray-900">Remind Me</Text>
              <Text className="text-xs text-gray-500">Get a push notification at 9:00 AM</Text>
            </View>
          </View>
          <Switch
            value={remindMe}
            onValueChange={setRemindMe}
            trackColor={{ false: '#d1d5db', true: '#818cf8' }}
            thumbColor={remindMe ? '#4f46e5' : '#f3f4f6'}
          />
        </View>
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
