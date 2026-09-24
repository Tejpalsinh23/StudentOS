import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { TimetableEvent, Subject } from '../types';
import { Plus, Clock, MapPin, X, ArrowLeft, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TYPES = ['Class', 'Study', 'Break', 'Event'];

export default function TimetableScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<TimetableEvent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [selectedType, setSelectedType] = useState('Class');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: eventsData } = await supabase
      .from('timetable')
      .select('*')
      .eq('user_id', user?.id)
      .order('start_time', { ascending: true });
      
    if (eventsData) setEvents(eventsData);

    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user?.id);
      
    if (subjectsData) setSubjects(subjectsData);
    setLoading(false);
  };

  const saveEvent = async () => {
    if (!startTime || !endTime) {
      Alert.alert('Error', 'Start and end times are required (e.g. 09:00)');
      return;
    }

    const { data, error } = await supabase
      .from('timetable')
      .insert({
        user_id: user?.id,
        subject_id: selectedSubjectId,
        day: selectedDay,
        start_time: startTime.trim(),
        end_time: endTime.trim(),
        location: location.trim(),
        type: selectedType
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setEvents([...events, data].sort((a, b) => a.start_time.localeCompare(b.start_time)));
      closeModal();
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('timetable').delete().eq('id', id);
    if (!error) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setStartTime('');
    setEndTime('');
    setLocation('');
    setSelectedSubjectId(null);
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return 'General';
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'General';
  };

  const dayEvents = events.filter(e => e.day === selectedDay);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3 flex-row justify-between items-center bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft color="#374151" size={24} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Weekly Schedule</Text>
        <TouchableOpacity onPress={() => setIsModalVisible(true)} className="w-10 h-10 items-center justify-center">
          <Plus color="#6366f1" size={24} />
        </TouchableOpacity>
      </View>

      {/* Days Selector */}
      <View className="bg-white border-b border-gray-100 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
          {DAYS.map((day, index) => (
            <TouchableOpacity 
              key={index}
              onPress={() => setSelectedDay(index)}
              className={selectedDay === index ? 'mr-2 px-4 py-2 rounded-full bg-primary-500' : 'mr-2 px-4 py-2 rounded-full bg-gray-100'}
            >
              <Text className={`font-semibold ${selectedDay === index ? 'text-white' : 'text-gray-600'}`}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
          <View className="w-8" />
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
        ) : dayEvents.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Clock color="#cbd5e1" size={48} className="mb-4" />
            <Text className="text-gray-400 font-medium text-lg">No events for {DAYS[selectedDay]}</Text>
          </View>
        ) : (
          dayEvents.map(event => (
            <View key={event.id} className="bg-white p-4 rounded-2xl border border-gray-100  mb-4 flex-row">
              <View className="items-center justify-center pr-4 border-r border-gray-100">
                <Text className="text-lg font-bold text-gray-900">{event.start_time.substring(0,5)}</Text>
                <Text className="text-xs text-gray-400">{event.end_time.substring(0,5)}</Text>
              </View>
              <View className="pl-4 flex-1">
                <View className="flex-row justify-between items-start">
                  <View className="bg-indigo-50 px-2 py-0.5 rounded text-xs mb-2 self-start">
                    <Text className="text-indigo-600 font-semibold text-xs">{event.type || 'Event'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteEvent(event.id)}>
                    <Trash2 color="#ef4444" size={16} />
                  </TouchableOpacity>
                </View>
                <Text className="text-lg font-bold text-gray-900 mb-1">{getSubjectName(event.subject_id)}</Text>
                {event.location && (
                  <View className="flex-row items-center">
                    <MapPin color="#9ca3af" size={14} className="mr-1" />
                    <Text className="text-sm text-gray-500">{event.location}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
        <View className="h-20" />
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={closeModal}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">Add to Schedule</Text>
              <TouchableOpacity onPress={closeModal} className="bg-gray-100 p-2 rounded-full">
                <X color="#374151" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-gray-700 mb-2">Subject</Text>
              <View className="flex-row flex-wrap mb-4">
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject.id}
                    onPress={() => setSelectedSubjectId(subject.id)}
                    className={selectedSubjectId === subject.id ? 'px-4 py-2 rounded-full mr-2 mb-2 border bg-primary-500 border-primary-500' : 'px-4 py-2 rounded-full mr-2 mb-2 border bg-white border-gray-200'}
                  >
                    <Text className={`font-medium ${selectedSubjectId === subject.id ? 'text-white' : 'text-gray-700'}`}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">Type</Text>
              <View className="flex-row flex-wrap mb-4 bg-gray-50 p-1 rounded-xl border border-gray-200">
                {TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSelectedType(t)}
                    className={selectedType === t ? 'flex-1 py-2 items-center rounded-lg bg-white ' : 'flex-1 py-2 items-center rounded-lg'}
                  >
                    <Text className={`font-semibold ${selectedType === t ? 'text-gray-900' : 'text-gray-500'}`}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="flex-row space-x-4 mb-4">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Start Time</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="09:00"
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                <View className="flex-1 pl-2">
                  <Text className="text-sm font-medium text-gray-700 mb-2">End Time</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                    placeholder="10:30"
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">Location (Optional)</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-8"
                placeholder="Room 101"
                value={location}
                onChangeText={setLocation}
              />

              <TouchableOpacity onPress={saveEvent} className="bg-primary-500 py-4 rounded-xl items-center  mb-10">
                <Text className="text-white font-bold text-lg">Save Event</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
