import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Subject, StudySession } from '../../types';
import { Plus, BookOpen, Clock, Trash2, Play, X, Pause, Square } from 'lucide-react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';
export default function StudyScreen() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  
  // Log Session Modal State
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  
  // Manual Log State
  const [sessionDuration, setSessionDuration] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  
  // Timer State
  const [isTimerMode, setIsTimerMode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [initialTimerMinutes, setInitialTimerMinutes] = useState(25);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    let interval: any = null;
    if (isActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(seconds => seconds - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isActive) {
      clearInterval(interval);
      setIsActive(false);
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timerSeconds]);

  const handleTimerComplete = () => {
    deactivateKeepAwake();
    Alert.alert(
      "Session Complete! 🎉",
      "Great job focusing! Do you want to log this session?",
      [
        { text: "Discard", style: "cancel", onPress: resetTimer },
        { text: "Log Session", onPress: () => {
            logSession(initialTimerMinutes);
            resetTimer();
        }}
      ]
    );
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimerSeconds(initialTimerMinutes * 60);
    deactivateKeepAwake();
  };

  const toggleTimer = () => {
    if (!selectedSubjectId) {
      Alert.alert('Error', 'Please select a subject first.');
      return;
    }
    
    if (!isActive) {
      Alert.alert(
        "Focus Mode 🧘‍♂️",
        "To maximize your study session, please turn on 'Do Not Disturb' or 'Focus Mode' in your phone's control center to silence calls and notifications.\n\nKeep the app open; the screen will stay awake while the timer runs.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Start Focusing", 
            onPress: () => {
              setIsActive(true);
              activateKeepAwakeAsync();
            }
          }
        ]
      );
    } else {
      setIsActive(false);
      deactivateKeepAwake();
    }
  };

  const setTimerDuration = (minutes: number) => {
    if (isActive) return;
    setInitialTimerMinutes(minutes);
    setTimerSeconds(minutes * 60);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (subjectsData) setSubjects(subjectsData);

    // Fetch Study Sessions
    const { data: sessionsData } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user?.id)
      .order('start_time', { ascending: false })
      .limit(50);
      
    if (sessionsData) setSessions(sessionsData);
    
    setLoading(false);
  };

  const addSubject = async () => {
    if (!newSubjectName.trim()) return;

    // Uniqueness validation check
    const isDuplicate = subjects.some(
      (s) => s.name.toLowerCase() === newSubjectName.trim().toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert('Error', 'A subject with this name already exists.');
      return;
    }
    
    const { data, error } = await supabase
      .from('subjects')
      .insert({ user_id: user?.id, name: newSubjectName.trim() })
      .select()
      .single();
      
    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setSubjects([data, ...subjects]);
      setNewSubjectName('');
      setIsAddingSubject(false);
    }
  };

  const deleteSubject = (id: string) => {
    Alert.alert(
      "Delete Subject",
      "Are you sure you want to delete this subject? All associated study sessions will also be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from('subjects').delete().eq('id', id);
            if (!error) {
              setSubjects(subjects.filter(s => s.id !== id));
              setSessions(sessions.filter(s => s.subject_id !== id));
            } else {
              Alert.alert('Error', 'Failed to delete subject.');
            }
          }
        }
      ]
    );
  };

  const logSession = async (duration?: number) => {
    if (isLogging) return;
    const durationNum = duration || parseInt(sessionDuration, 10);
    
    if (!selectedSubjectId) {
      Alert.alert('Error', 'Please select a subject.');
      return;
    }

    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 1440) {
      Alert.alert('Error', 'Please enter a valid duration between 1 and 1440 minutes.');
      return;
    }

    setIsLogging(true);
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user?.id,
        subject_id: selectedSubjectId,
        duration: durationNum,
        start_time: new Date().toISOString(),
        completed: true
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setSessions([data, ...sessions]);
      setIsLogModalVisible(false);
      setSessionDuration('');
      setSelectedSubjectId(null);
    }
    setIsLogging(false);
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return 'Unknown Subject';
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Unknown Subject';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-bold text-gray-900 mb-1">Study</Text>
        <Text className="text-gray-500 mb-4">Manage subjects & track study time</Text>
      </View>

      <ScrollView 
        className="flex-1 px-6" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
        ) : (
          <>
            {/* Subjects Section */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">Your Subjects</Text>
                <TouchableOpacity onPress={() => setIsAddingSubject(!isAddingSubject)}>
                  <Plus color="#6366f1" size={24} />
                </TouchableOpacity>
              </View>

              {isAddingSubject && (
                <View className="flex-row items-center mb-4 bg-white p-2 rounded-xl border border-gray-200">
                  <TextInput
                    className="flex-1 px-3 py-2 text-gray-900"
                    placeholder="E.g., Computer Science 101"
                    value={newSubjectName}
                    onChangeText={setNewSubjectName}
                    autoFocus
                  />
                  <TouchableOpacity onPress={addSubject} className="bg-primary-500 px-4 py-2 rounded-lg">
                    <Text className="text-white font-bold">Add</Text>
                  </TouchableOpacity>
                </View>
              )}

              {subjects.length === 0 && !isAddingSubject ? (
                <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center justify-center border-dashed">
                  <BookOpen color="#cbd5e1" size={32} className="mb-2" />
                  <Text className="text-gray-400 font-medium">No subjects yet</Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap justify-between">
                  {subjects.map(subject => (
                    <View key={subject.id} className="bg-white w-[48%] p-4 rounded-xl border border-gray-100  mb-3 relative">
                      <TouchableOpacity 
                        className="absolute top-3 right-3 p-2 z-10"
                        onPress={() => deleteSubject(subject.id)}
                      >
                        <Trash2 color="#ef4444" size={16} />
                      </TouchableOpacity>
                      <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center mb-2">
                        <BookOpen color="#6366f1" size={20} />
                      </View>
                      <Text className="font-bold text-gray-900" numberOfLines={2}>{subject.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Study Sessions Section */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">Recent Sessions</Text>
              </View>

              {sessions.length === 0 ? (
                <View className="bg-white p-6 rounded-2xl border border-gray-100 items-center justify-center border-dashed mb-4">
                  <Clock color="#cbd5e1" size={32} className="mb-2" />
                  <Text className="text-gray-400 font-medium">No study sessions logged</Text>
                </View>
              ) : (
                sessions.map(session => (
                  <View key={session.id} className="bg-white p-4 rounded-2xl border border-gray-100  mb-3 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-12 h-12 bg-emerald-50 rounded-full items-center justify-center mr-4">
                        <Clock color="#10b981" size={24} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-gray-900 text-base">{getSubjectName(session.subject_id)}</Text>
                        <Text className="text-gray-500 text-sm">{new Date(session.start_time).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                      <Text className="font-bold text-gray-700">{session.duration} min</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Start Session Button */}
              <TouchableOpacity
                onPress={() => setIsLogModalVisible(true)}
                className="mt-4 flex-row items-center justify-center bg-primary-500 px-4 py-4 rounded-xl "
              >
                <Play color="white" size={20} className="mr-2" />
                <Text className="text-white font-bold text-lg">Start Session</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <View className="h-20" />
      </ScrollView>

      {/* Log Session Modal */}
      <Modal
        visible={isLogModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (isActive) {
            Alert.alert("Timer Running", "Please stop the timer before closing.");
            return;
          }
          setIsLogModalVisible(false);
        }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">Study Session</Text>
              <TouchableOpacity 
                onPress={() => {
                  if (isActive) {
                    Alert.alert("Timer Running", "Please stop the timer before closing.");
                    return;
                  }
                  setIsLogModalVisible(false);
                }} 
                className="bg-gray-100 p-2 rounded-full"
              >
                <X color="#374151" size={20} />
              </TouchableOpacity>
            </View>

            {/* Mode Toggle */}
            {!isActive && (
              <View className="flex-row bg-gray-100 p-1 rounded-xl mb-6">
                <TouchableOpacity
                  onPress={() => setIsTimerMode(false)}
                  className={`flex-1 py-2 items-center rounded-lg ${!isTimerMode ? 'bg-white ' : ''}`}
                >
                  <Text className={`font-semibold ${!isTimerMode ? 'text-gray-900' : 'text-gray-500'}`}>Manual Log</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsTimerMode(true)}
                  className={`flex-1 py-2 items-center rounded-lg ${isTimerMode ? 'bg-white ' : ''}`}
                >
                  <Text className={`font-semibold ${isTimerMode ? 'text-gray-900' : 'text-gray-500'}`}>Pomodoro Timer</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-2">Select Subject</Text>
            <View className="flex-row flex-wrap mb-4">
              {subjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  onPress={() => {
                    if (!isActive) setSelectedSubjectId(subject.id);
                  }}
                  disabled={isActive}
                  className={selectedSubjectId === subject.id ? 'px-4 py-2 rounded-full mr-2 mb-2 border bg-primary-500 border-primary-500' : 'px-4 py-2 rounded-full mr-2 mb-2 border bg-white border-gray-200'}
                >
                  <Text className={`font-medium ${selectedSubjectId === subject.id ? 'text-white' : 'text-gray-700'}`}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {isTimerMode ? (
              <View className="items-center py-4">
                {!isActive && timerSeconds === initialTimerMinutes * 60 && (
                  <View className="flex-row space-x-2 mb-6">
                    {[15, 25, 50, 90].map(mins => (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => setTimerDuration(mins)}
                        className={initialTimerMinutes === mins ? 'px-4 py-2 mx-1 rounded-lg border bg-indigo-50 border-indigo-200' : 'px-4 py-2 mx-1 rounded-lg border bg-white border-gray-200'}
                      >
                        <Text className={`font-semibold ${initialTimerMinutes === mins ? 'text-indigo-600' : 'text-gray-600'}`}>{mins}m</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <Text className="text-6xl font-black text-gray-900 tracking-wider mb-8 tabular-nums">
                  {formatTime(timerSeconds)}
                </Text>

                <View className="flex-row justify-center space-x-4 mb-4">
                  <TouchableOpacity 
                    onPress={toggleTimer} 
                    className={isActive ? 'w-16 h-16 rounded-full items-center justify-center mx-2 bg-orange-100' : 'w-16 h-16 rounded-full items-center justify-center mx-2 bg-primary-500'}
                  >
                    {isActive ? <Pause color="#f97316" size={32} /> : <Play color="white" size={32} className="ml-1" />}
                  </TouchableOpacity>
                  
                  {(!isActive && timerSeconds !== initialTimerMinutes * 60) && (
                    <TouchableOpacity 
                      onPress={resetTimer} 
                      className="w-16 h-16 rounded-full items-center justify-center bg-gray-100 mx-2"
                    >
                      <Square color="#4b5563" size={24} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <>
                <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">Duration (Minutes)</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 mb-8"
                  placeholder="E.g., 45"
                  keyboardType="number-pad"
                  value={sessionDuration}
                  onChangeText={setSessionDuration}
                />

                <TouchableOpacity onPress={() => logSession()} disabled={isLogging} className="bg-primary-500 py-4 rounded-xl items-center  mb-4">
                  {isLogging ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Save Session</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
