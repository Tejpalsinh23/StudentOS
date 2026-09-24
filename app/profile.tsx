import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { LogOut, User as UserIcon, Settings, Bell, Shield, CircleHelp, Camera, ChevronRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const uploadProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled || !result.assets[0].base64) return;
      
      setUploading(true);
      const fileExt = result.assets[0].uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('studentos_files')
        .upload(filePath, decode(result.assets[0].base64), {
          contentType: `image/${fileExt}`
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('studentos_files')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_image: publicUrl });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Profile Header */}
        <View className="bg-white dark:bg-slate-800 p-6 items-center border-b border-gray-100 dark:border-slate-700">
          <TouchableOpacity onPress={uploadProfileImage} disabled={uploading}>
            <View className="w-24 h-24 bg-indigo-100 rounded-full items-center justify-center mb-4 relative overflow-hidden">
              {profile?.profile_image ? (
                <Image source={{ uri: profile.profile_image }} className="w-full h-full" />
              ) : (
                <UserIcon size={40} color="#6366f1" />
              )}
              <View className="absolute bottom-0 w-full bg-black/30 py-1 items-center">
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Camera size={14} color="white" />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {profile?.name || user?.email?.split('@')[0] || 'Student'}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400">{user?.email}</Text>
          
          {(profile?.course || profile?.university) && (
            <View className="mt-3 bg-gray-50 dark:bg-slate-700 px-4 py-2 rounded-full border border-gray-200 dark:border-slate-600">
              <Text className="text-gray-900 dark:text-white font-medium text-sm">
                {profile?.course} {profile?.university ? `at ${profile.university}` : ''}
              </Text>
            </View>
          )}

          {(profile?.target_grade || profile?.study_goal_hours) && (
            <View className="flex-row space-x-4 mt-4 w-full px-6">
              <View className="flex-1 bg-primary-50 dark:bg-primary-900/20 p-4 rounded-2xl border border-primary-100 dark:border-primary-900/30 items-center">
                <Text className="text-xs font-bold uppercase text-primary-500 mb-1">Target Grade</Text>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">{profile?.target_grade || '-'}</Text>
              </View>
              <View className="flex-1 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 items-center">
                <Text className="text-xs font-bold uppercase text-purple-500 mb-1">Study Goal</Text>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">{profile?.study_goal_hours ? `${profile.study_goal_hours}h / wk` : '-'}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            onPress={() => router.push('/edit-profile')}
            className="mt-6 bg-gray-900 dark:bg-white px-6 py-2 rounded-full"
          >
            <Text className="text-white dark:text-gray-900 font-medium">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Options */}
        <View className="px-6 pb-6 pt-2">
          <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Settings</Text>
          
          <View className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700  overflow-hidden mb-6">
            <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-50 dark:border-slate-700">
              <View className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center mr-3">
                <Bell size={16} color="#3b82f6" />
              </View>
              <Text className="flex-1 text-gray-900 dark:text-white font-medium">Notifications</Text>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={toggleColorScheme} className="flex-row items-center p-4 border-b border-gray-50 dark:border-slate-700">
              <View className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 items-center justify-center mr-3">
                <Settings size={16} color="#a855f7" />
              </View>
              <Text className="flex-1 text-gray-900 dark:text-white font-medium">
                Appearance ({colorScheme === 'dark' ? 'Dark' : 'Light'})
              </Text>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center p-4">
              <View className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mr-3">
                <Shield size={16} color="#10b981" />
              </View>
              <Text className="flex-1 text-gray-900 dark:text-white font-medium">Privacy & Security</Text>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Support</Text>
          
          <View className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700  overflow-hidden mb-6">
            <TouchableOpacity className="flex-row items-center p-4">
              <View className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 items-center justify-center mr-3">
                <CircleHelp size={16} color="#f97316" />
              </View>
              <Text className="flex-1 text-gray-900 dark:text-white font-medium">Help & Support</Text>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={handleLogout}
            className="flex-row items-center justify-center p-4 mt-2"
          >
            <LogOut size={18} color="#ef4444" className="mr-2" />
            <Text className="text-red-500 font-semibold text-base">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
