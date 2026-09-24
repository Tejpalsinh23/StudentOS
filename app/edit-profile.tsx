import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [university, setUniversity] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const [studyGoalHours, setStudyGoalHours] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setFetching(true);
    const { data } = await supabase
      .from('users')
      .select('name, course, university, target_grade, study_goal_hours, profile_image')
      .eq('id', user?.id)
      .single();
    
    if (data) {
      if (data.name) setName(data.name);
      if (data.course) setCourse(data.course);
      if (data.university) setUniversity(data.university);
      if (data.target_grade) setTargetGrade(data.target_grade);
      if (data.study_goal_hours) setStudyGoalHours(data.study_goal_hours.toString());
      if (data.profile_image) setProfileImage(data.profile_image);
    }
    setFetching(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      let finalImageUrl = profileImage;
      
      // Upload if it's a local file
      if (profileImage && !profileImage.startsWith('http')) {
        const res = await fetch(profileImage);
        const blob = await res.blob();
        
        // 1. Validate File Size (Limit to 5MB)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
        if (blob.size > MAX_FILE_SIZE) {
          throw new Error('Image size must be less than 5MB.');
        }

        // 2. Validate MIME Type (Allow only images)
        if (!blob.type.startsWith('image/')) {
          throw new Error('Only image files are allowed.');
        }

        const fileExt = blob.type.split('/')[1] || 'jpg';
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: blob.type
          });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        finalImageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          course: course.trim(),
          university: university.trim(),
          target_grade: targetGrade.trim() || null,
          study_goal_hours: studyGoalHours ? parseInt(studyGoalHours) : null,
          profile_image: finalImageUrl,
        })
        .eq('id', user?.id);

      if (error) throw error;
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-100 bg-white z-10">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-gray-500 text-lg">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading || fetching}>
            {loading ? <ActivityIndicator color="#6366f1" /> : <Text className="text-primary-600 font-bold text-lg">Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {fetching ? (
            <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
          ) : (
            <>
              <View className="items-center mb-8">
                <TouchableOpacity onPress={pickImage} className="relative">
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} className="w-24 h-24 rounded-full bg-gray-200" />
                  ) : (
                    <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center">
                      <Camera color="#9ca3af" size={32} />
                    </View>
                  )}
                  <View className="absolute bottom-0 right-0 bg-primary-500 w-8 h-8 rounded-full items-center justify-center border-2 border-white">
                    <Camera color="white" size={14} />
                  </View>
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">Full Name</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholder="e.g., John Doe"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">Course / Major</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholder="e.g., Computer Science"
                  value={course}
                  onChangeText={setCourse}
                />
              </View>

              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 mb-2">University / School</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholder="e.g., State University"
                  value={university}
                  onChangeText={setUniversity}
                />
              </View>

              <View className="flex-row space-x-4 mb-6">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Target Grade</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                    placeholder="e.g., A or 4.0"
                    value={targetGrade}
                    onChangeText={setTargetGrade}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Study Goal (hrs/week)</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                    placeholder="e.g., 20"
                    value={studyGoalHours}
                    onChangeText={setStudyGoalHours}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View className="h-10" />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
