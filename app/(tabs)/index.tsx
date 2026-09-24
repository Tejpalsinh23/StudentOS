import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Dimensions, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { CheckSquare, BookOpen, Clock, FileText, Bell, ChevronRight, Calendar, BarChart2, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TimetableEvent } from '../../types';
import { BarChart } from 'react-native-chart-kit';
import Animated, { FadeInDown, FadeIn, withRepeat, withSequence, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

// Simple Skeleton Component
const Skeleton = ({ width, height, borderRadius = 8, className = '' }: any) => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.5, { duration: 1000 })
      ),
      -1, // infinite
      true // reverse
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View 
      style={[{ width, height, borderRadius }, style]} 
      className={`bg-gray-200 dark:bg-slate-700 ${className}`} 
    />
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  
  // Dashboard Metrics
  const [tasksCount, setTasksCount] = useState(0);
  const [studyHours, setStudyHours] = useState(0);
  const [deadlinesCount, setDeadlinesCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [todaySchedule, setTodaySchedule] = useState<TimetableEvent[]>([]);
  
  // Task Analytics
  const [totalTasksThisWeek, setTotalTasksThisWeek] = useState(0);
  const [completedTasksThisWeek, setCompletedTasksThisWeek] = useState(0);
  
  // Chart Data
  const [chartLabels, setChartLabels] = useState<string[]>(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const [loading, setLoading] = useState(true);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Platform.OS === 'web' ? Math.min(screenWidth - 48, 452) : screenWidth - 48;

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // 1. Fetch Profile
    const { data: profileData } = await supabase.from('users').select('*').eq('id', user?.id).single();
    if (profileData) setProfile(profileData);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // 2. Fetch Tasks Today
    const { count: tCount } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('completed', false)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString());
    setTasksCount(tCount || 0);

    // 3. Fetch Upcoming Deadlines (next 7 days)
    const { count: dCount } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('completed', false)
      .gte('due_date', today.toISOString())
      .lte('due_date', nextWeek.toISOString());
    setDeadlinesCount(dCount || 0);

    // 4. Fetch Study Hours (This Week) & Chart Data
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    
    // Fetch Task Completion Data (This Week)
    const { count: totalTCount } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .gte('due_date', weekAgo.toISOString())
      .lt('due_date', tomorrow.toISOString());
      
    const { count: compTCount } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('completed', true)
      .gte('due_date', weekAgo.toISOString())
      .lt('due_date', tomorrow.toISOString());

    setTotalTasksThisWeek(totalTCount || 0);
    setCompletedTasksThisWeek(compTCount || 0);

    const { data: sessions } = await supabase.from('study_sessions')
      .select('duration, start_time')
      .eq('user_id', user?.id)
      .gte('start_time', weekAgo.toISOString());
    
    let totalMinutes = 0;
    
    // Prepare Chart Data (Last 7 Days)
    const labels = [];
    const dataPoints = [0, 0, 0, 0, 0, 0, 0];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    
    if (sessions) {
      sessions.forEach(s => {
        totalMinutes += s.duration;
        const sessionDate = new Date(s.start_time);
        // Find which day index this belongs to
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          if (sessionDate.getDate() === d.getDate() && sessionDate.getMonth() === d.getMonth()) {
            dataPoints[i] += (s.duration / 60); // Store in hours
            break;
          }
        }
      });
    }
    
    setStudyHours(Math.round((totalMinutes / 60) * 10) / 10);
    setChartLabels(labels);
    setChartData(dataPoints);

    // 5. Fetch Notes Count
    const { count: nCount } = await supabase.from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id);
    setNotesCount(nCount || 0);

    // 6. Fetch Today's Schedule
    const currentDayOfWeek = new Date().getDay();
    const { data: schedule } = await supabase.from('timetable')
      .select('*')
      .eq('user_id', user?.id)
      .eq('day', currentDayOfWeek)
      .order('start_time', { ascending: true })
      .limit(3);
      
    if (schedule) setTodaySchedule(schedule);

    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} className="px-6 pt-6 pb-4">
          <View className="w-full h-[72px] sm:h-[80px] p-4 rounded-3xl bg-white dark:bg-slate-800  border border-gray-100 dark:border-slate-700 flex-row items-center justify-between">
            <View className="flex-1 mr-4 flex-row items-center flex-nowrap overflow-hidden">
              <View className="h-[28px] bg-indigo-100 dark:bg-indigo-900/30 px-3 rounded-full mr-3 border border-indigo-200 dark:border-indigo-800 justify-center items-center">
                <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest">
                  {getGreeting()}
                </Text>
              </View>
              <Text className="flex-1 text-[24px] sm:text-[30px] font-black text-gray-900 dark:text-white" numberOfLines={1} adjustsFontSizeToFit>
                {profile?.name || user?.email?.split('@')[0] || 'Student'} 👋
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push('/profile')}
              className="w-[48px] h-[48px] bg-indigo-50 dark:bg-slate-700 rounded-full items-center justify-center border-2 border-indigo-100 dark:border-indigo-800 overflow-hidden flex-shrink-0"
            >
               {profile?.profile_image ? (
                  <Image source={{ uri: profile.profile_image }} className="w-full h-full" />
               ) : (
                  <User color="#6366f1" size={24} />
               )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {loading ? (
          <Animated.View entering={FadeIn.duration(400)} className="px-6">
            <View className="flex-row flex-wrap justify-between mb-6">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl w-[48%] mb-4  border border-gray-100 dark:border-slate-700">
                  <Skeleton width={40} height={40} borderRadius={20} className="mb-3" />
                  <Skeleton width={30} height={24} className="mb-2" />
                  <Skeleton width={80} height={14} />
                </View>
              ))}
            </View>
            <View className="mb-8">
              <Skeleton width={150} height={24} className="mb-4" />
              <Skeleton width="100%" height={200} borderRadius={16} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(500).delay(100).springify()}>
            {/* Overview Cards */}
            <View className="px-6 flex-row flex-wrap justify-between mb-6">
              <TouchableOpacity onPress={() => router.push('/tasks')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl w-[48%] mb-4  border border-gray-100 dark:border-slate-700">
                <View className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-3">
                  <CheckSquare color="#6366f1" size={20} />
                </View>
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">{tasksCount}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Tasks Today</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => router.push('/study')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl w-[48%] mb-4  border border-gray-100 dark:border-slate-700">
                <View className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-3">
                  <BookOpen color="#10b981" size={20} />
                </View>
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">{studyHours}h</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Study This Week</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/tasks')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl w-[48%]  border border-gray-100 dark:border-slate-700">
                <View className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-full items-center justify-center mb-3">
                  <Clock color="#f97316" size={20} />
                </View>
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">{deadlinesCount}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Upcoming Deadlines</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/notes')} className="bg-white dark:bg-slate-800 p-4 rounded-2xl w-[48%]  border border-gray-100 dark:border-slate-700">
                <View className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-full items-center justify-center mb-3">
                  <FileText color="#a855f7" size={20} />
                </View>
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">{notesCount}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">Total Notes</Text>
              </TouchableOpacity>
            </View>

            {/* Chart Section */}
            <View className="px-6 mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">Study Analytics</Text>
              </View>
              <View className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700  items-center">
                {chartData.every(item => item === 0) ? (
                  <View className="py-10 items-center">
                    <BarChart2 color="#cbd5e1" size={32} className="mb-2" />
                    <Text className="text-gray-400 font-medium">No study data this week</Text>
                  </View>
                ) : (
                  <View className="flex-row items-end justify-between h-40 w-full mt-4 px-2">
                    {chartData.map((value, index) => {
                      const maxValue = Math.max(...chartData, 1); // Avoid division by zero
                      const heightPercentage = (value / maxValue) * 100;
                      
                      return (
                        <View key={index} className="items-center flex-1">
                          {/* Value Tooltip */}
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {value > 0 ? value.toFixed(1) : ''}
                          </Text>
                          
                          {/* Bar */}
                          <View className="w-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-t-lg items-center justify-end h-28 overflow-hidden">
                            <View 
                              className="w-full bg-indigo-500 rounded-t-lg" 
                              style={{ height: `${heightPercentage}%` }} 
                            />
                          </View>
                          
                          {/* Label */}
                          <Text className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            {chartLabels[index]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Task Completion Analytics */}
            <View className="px-6 mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">Task Completion (This Week)</Text>
              </View>
              <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700  flex-row items-center justify-between">
                <View>
                  <Text className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {totalTasksThisWeek === 0 ? 0 : Math.round((completedTasksThisWeek / totalTasksThisWeek) * 100)}%
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 font-medium mt-1">Completion Rate</Text>
                </View>
                <View className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl">
                  <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{completedTasksThisWeek} / {totalTasksThisWeek}</Text>
                  <Text className="text-indigo-400 dark:text-indigo-300 text-xs">Tasks Done</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View className="px-6 mb-8">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</Text>
              <View className="flex-row justify-between">
                <TouchableOpacity onPress={() => router.push('/new-task')} className="items-center bg-white dark:bg-slate-800 p-4 rounded-xl flex-1 mx-1  border border-gray-100 dark:border-slate-700">
                  <CheckSquare color="#6366f1" size={24} />
                  <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">Add Task</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/study')} className="items-center bg-white dark:bg-slate-800 p-4 rounded-xl flex-1 mx-1  border border-gray-100 dark:border-slate-700">
                  <BookOpen color="#10b981" size={24} />
                  <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">Study</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/notes')} className="items-center bg-white dark:bg-slate-800 p-4 rounded-xl flex-1 mx-1  border border-gray-100 dark:border-slate-700">
                  <FileText color="#a855f7" size={24} />
                  <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">Note</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/reminders')} className="items-center bg-white dark:bg-slate-800 p-4 rounded-xl flex-1 mx-1  border border-gray-100 dark:border-slate-700">
                  <Bell color="#f97316" size={24} />
                  <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">Remind</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Today's Schedule Placeholder */}
            <View className="px-6 mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">Today's Schedule</Text>
                <TouchableOpacity onPress={() => router.push('/timetable')}>
                  <Text className="text-primary-600 dark:text-primary-400 font-medium">See all</Text>
                </TouchableOpacity>
              </View>
              
              {todaySchedule.length === 0 ? (
                <TouchableOpacity onPress={() => router.push('/timetable')} className="bg-white dark:bg-slate-800 rounded-2xl p-6 items-center justify-center border border-gray-100 dark:border-slate-700  border-dashed">
                  <Calendar color="#cbd5e1" size={32} className="mb-2" />
                  <Text className="text-gray-400 dark:text-gray-500 font-medium mb-2">No events scheduled today</Text>
                  <Text className="text-primary-500 dark:text-primary-400 font-bold">Add Event</Text>
                </TouchableOpacity>
              ) : (
                todaySchedule.map(event => (
                  <View key={event.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700  mb-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl items-center justify-center mr-4">
                        <Text className="text-indigo-600 dark:text-indigo-400 font-bold">{event.start_time.substring(0,5)}</Text>
                      </View>
                      <View>
                        <Text className="font-bold text-gray-900 dark:text-white text-base">{event.type || 'Event'}</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-sm">{event.location || 'No Location'}</Text>
                      </View>
                    </View>
                    <ChevronRight color="#d1d5db" size={20} />
                  </View>
                ))
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
