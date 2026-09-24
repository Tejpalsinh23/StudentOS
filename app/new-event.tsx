import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { Subject } from '../types';

export default function NewEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [type, setType] = useState<'Class' | 'Study' | 'Event'>('Class');
  const [day, setDay] = useState(1); // 1 = Monday
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('10:00:00');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').eq('user_id', user?.id);
    if (data) setSubjects(data);
  };

  const handleSave = async () => {
    setLoading(true);

    const { error } = await supabase.from('timetable_events').insert({
      user_id: user?.id,
      subject_id: selectedSubjectId,
      day,
      start_time: startTime,
      end_time: endTime,
      location: location.trim(),
      type
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
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
        <Text className="text-lg font-bold text-gray-900">New Event</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#6366f1" /> : <Text className="text-primary-600 font-bold text-lg">Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Event Type</Text>
          <View className="flex-row justify-between bg-gray-50 p-1 rounded-xl border border-gray-200">
            {['Class', 'Study', 'Event'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t as any)}
                className={type === t ? 'flex-1 py-3 items-center rounded-lg bg-white border border-gray-100' : 'flex-1 py-3 items-center rounded-lg'}
              >
                <Text className={`font-semibold ${type === t ? 'text-gray-900' : 'text-gray-500'}`}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {subjects.length === 0 ? (
              <Text className="text-gray-400 italic">No subjects added yet.</Text>
            ) : (
              subjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  onPress={() => setSelectedSubjectId(subject.id === selectedSubjectId ? null : subject.id)}
                  className={selectedSubjectId === subject.id ? 'px-4 py-2 rounded-full mr-2 border bg-primary-500 border-primary-500' : 'px-4 py-2 rounded-full mr-2 border bg-white border-gray-200'}
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
          <Text className="text-sm font-medium text-gray-700 mb-2">Day of Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDay(i + 1)}
                className={day === i + 1 ? 'px-4 py-2 rounded-full mr-2 border bg-primary-500 border-primary-500' : 'px-4 py-2 rounded-full mr-2 border bg-white border-gray-200'}
              >
                <Text className={`font-medium ${day === i + 1 ? 'text-white' : 'text-gray-700'}`}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="flex-row space-x-4 mb-6">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">Start Time (HH:MM)</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
              placeholder="09:00:00"
              value={startTime}
              onChangeText={setStartTime}
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">End Time (HH:MM)</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
              placeholder="10:00:00"
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Location (Optional)</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
            placeholder="Room 101"
            value={location}
            onChangeText={setLocation}
          />
        </View>
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
