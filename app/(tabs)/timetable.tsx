import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { TimetableEvent, Subject } from '../../types';
import { Plus, Clock, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimetableScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0); // 0 = Monday for UI

  useEffect(() => {
    if (user) {
      fetchSubjects();
      fetchEvents();
    }
  }, [user, selectedDay]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').eq('user_id', user?.id);
    if (data) setSubjects(data);
  };

  const fetchEvents = async () => {
    setLoading(true);
    // Suppress error if table doesn't exist yet (for smooth UI transitions)
    const { data, error } = await supabase
      .from('timetable_events')
      .select('*')
      .eq('user_id', user?.id)
      .eq('day', selectedDay + 1) // Day mapping: assuming DB uses 1=Monday
      .order('start_time', { ascending: true })
      .limit(50);
      
    if (!error && data) {
      setEvents(data);
    } else {
      setEvents([]); // fallback if table not created
    }
    setLoading(false);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return 'General Event';
    const sub = subjects.find(s => s.id === subjectId);
    return sub ? sub.name : 'Unknown Subject';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <View className="px-6 pt-6 pb-4">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Timetable</Text>
        
        {/* Day Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {DAYS.map((day, index) => (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(index)}
              className={
                selectedDay === index ? 'mr-3 items-center justify-center w-14 h-16 rounded-2xl bg-primary-500 ' : 'mr-3 items-center justify-center w-14 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700'
              }
            >
              <Text className={`font-medium mb-1 ${selectedDay === index ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-4" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
        ) : events.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Clock color="#cbd5e1" size={48} className="mb-4" />
            <Text className="text-gray-400 font-medium text-lg">No events for this day</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center px-6">Tap the + button to add your classes, study blocks, and reminders.</Text>
          </View>
        ) : (
          events.map((event, index) => (
            <Animated.View 
              key={event.id}
              entering={FadeInDown.delay(index * 100).springify()}
              className="flex-row mb-4"
            >
              {/* Timeline Time */}
              <View className="w-20 items-end pr-4 pt-1 border-r-2 border-gray-200 dark:border-slate-700">
                <Text className="font-bold text-gray-900 dark:text-white">{formatTime(event.start_time)}</Text>
                <Text className="text-xs text-gray-500 mt-1">{formatTime(event.end_time)}</Text>
              </View>

              {/* Event Card */}
              <View className={
                event.type === 'Class' ? 'flex-1 p-4 ml-4 rounded-2xl bg-blue-50 border border-blue-100' :
                event.type === 'Study' ? 'flex-1 p-4 ml-4 rounded-2xl bg-purple-50 border border-purple-100' :
                'flex-1 p-4 ml-4 rounded-2xl bg-orange-50 border border-orange-100'
              }>
                <Text className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {event.type || 'Event'}
                </Text>
                <Text className="text-lg font-bold text-gray-900 mb-2">
                  {getSubjectName(event.subject_id)}
                </Text>
                
                {event.location && (
                  <View className="flex-row items-center space-x-1 mt-1">
                    <MapPin color="#6b7280" size={14} />
                    <Text className="text-sm text-gray-600">{event.location}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          ))
        )}
        <View className="h-24" />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/new-event')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center "
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
