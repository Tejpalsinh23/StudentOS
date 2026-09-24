import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Plus, CheckCircle2, Circle, Calendar, AlertCircle, CheckSquare, Trash2, BookOpen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Task, Subject } from '../../types';
import Animated, { FadeInDown, Layout, FadeOutDown } from 'react-native-reanimated';

export default function TasksScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Today' | 'Upcoming' | 'Completed'>('Today');

  useEffect(() => {
    if (user) {
      fetchSubjects();
      fetchTasks();
    }
  }, [user, filter]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').eq('user_id', user?.id);
    if (data) setSubjects(data);
  };

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase.from('tasks').select('*').eq('user_id', user?.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (filter === 'Today') {
      query = query
        .eq('completed', false)
        .gte('due_date', today.toISOString())
        .lt('due_date', tomorrow.toISOString());
    } else if (filter === 'Upcoming') {
      query = query
        .eq('completed', false)
        .gte('due_date', tomorrow.toISOString());
    } else if (filter === 'Completed') {
      query = query.eq('completed', true);
    }

    const { data, error } = await query.order('due_date', { ascending: true }).limit(50);
    
    if (data) setTasks(data);
    setLoading(false);
  };

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t).filter(t => filter === 'Completed' ? !currentStatus : currentStatus === false));
    
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !currentStatus })
      .eq('id', taskId);
      
    if (error) {
      setTasks(previousTasks);
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  const deleteTask = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to permanently delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          const previousTasks = [...tasks];
          setTasks(tasks.filter(t => t.id !== taskId));
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) {
            setTasks(previousTasks);
            Alert.alert('Error', 'Failed to delete task.');
          }
        }
      }
    ]);
  };

  const getPriorityClasses = (priority: string) => {
    if (priority === 'High') return { text: 'text-[10px] font-bold uppercase text-red-500', bg: 'px-2 py-0.5 rounded flex-row items-center space-x-1 bg-red-50', color: '#ef4444' };
    if (priority === 'Medium') return { text: 'text-[10px] font-bold uppercase text-orange-500', bg: 'px-2 py-0.5 rounded flex-row items-center space-x-1 bg-orange-50', color: '#f97316' };
    return { text: 'text-[10px] font-bold uppercase text-green-500', bg: 'px-2 py-0.5 rounded flex-row items-center space-x-1 bg-green-50', color: '#22c55e' };
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return null;
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : null;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Tasks</Text>
        
        {/* Filters */}
        <View className="flex-row space-x-2 mb-4 bg-gray-200 dark:bg-slate-800 p-1 rounded-xl">
          {['Today', 'Upcoming', 'Completed'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f as any)}
              className={filter === f ? 'flex-1 py-2 items-center rounded-lg bg-white dark:bg-slate-700 ' : 'flex-1 py-2 items-center rounded-lg'}
            >
              <Text className={`font-semibold ${filter === f ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
        ) : tasks.length === 0 ? (
          <Animated.View entering={FadeInDown} className="items-center justify-center mt-20">
            <CheckSquare color="#cbd5e1" size={48} className="mb-4" />
            <Text className="text-gray-400 font-medium text-lg">No tasks found</Text>
            <Text className="text-gray-400 text-sm mt-1">Enjoy your free time!</Text>
          </Animated.View>
        ) : (
          tasks.map((task, index) => (
            <Animated.View 
              key={task.id} 
              entering={FadeInDown.delay(index * 100).springify()}
              exiting={FadeOutDown}
              layout={Layout.springify()}
              className="bg-white dark:bg-slate-800 p-4 rounded-2xl  border border-gray-100 dark:border-slate-700 mb-3 flex-row items-center"
            >
              <TouchableOpacity onPress={() => toggleTaskCompletion(task.id, task.completed)} className="mr-4">
                {task.completed ? (
                  <CheckCircle2 color="#10b981" size={28} />
                ) : (
                  <Circle color="#cbd5e1" size={28} />
                )}
              </TouchableOpacity>
              
              <View className="flex-1">
                <Text className={`text-base font-semibold ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                  {task.title}
                </Text>
                
                <View className="flex-row flex-wrap items-center mt-2 gap-2">
                  {task.due_date && (
                    <View className="flex-row items-center space-x-1">
                      <Calendar color="#9ca3af" size={14} />
                      <Text className="text-xs text-gray-500">
                        {new Date(task.due_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {getSubjectName(task.subject_id) && (
                    <View className="px-2 py-0.5 rounded bg-indigo-50 flex-row items-center space-x-1">
                      <BookOpen color="#6366f1" size={12} />
                      <Text className="text-[10px] font-bold uppercase text-indigo-600">
                        {getSubjectName(task.subject_id)}
                      </Text>
                    </View>
                  )}

                  <View className={getPriorityClasses(task.priority).bg}>
                    <AlertCircle color={getPriorityClasses(task.priority).color} size={12} />
                    <Text className={getPriorityClasses(task.priority).text}>
                      {task.priority}
                    </Text>
                  </View>

                  {task.category && (
                    <View className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 flex-row items-center space-x-1">
                      <Text className="text-[10px] font-bold uppercase text-gray-600 dark:text-gray-300">
                        {task.category}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity onPress={() => deleteTask(task.id)} className="ml-2 p-2 rounded-full bg-red-50">
                <Trash2 color="#ef4444" size={20} />
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
        <View className="h-20" />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/new-task')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center "
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}


