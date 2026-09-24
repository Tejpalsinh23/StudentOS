import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, ArrowLeft } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
    }
    // Success will be handled by the onAuthStateChange in AuthProvider redirecting to /(tabs)
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 pt-4 pb-8 flex-1">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 mb-6"
          >
            <ArrowLeft color="#374151" size={24} />
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</Text>
          <Text className="text-gray-500 mb-10">Sign in to continue to StudentOS</Text>

          <View className="space-y-4 mb-6">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <Mail color="#9CA3AF" size={20} />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-900"
                  onChangeText={setEmail}
                  value={email}
                  placeholder="email@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1 mt-4">Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <Lock color="#9CA3AF" size={20} />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-900"
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry={true}
                  placeholder="••••••••"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity 
            className="self-end mb-8"
            onPress={() => router.push('/forgot-password')}
          >
            <Text className="text-primary-600 font-medium">Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signInWithEmail}
            disabled={loading}
            className={loading ? 'py-4 rounded-2xl items-center  bg-primary-300' : 'py-4 rounded-2xl items-center  bg-primary-500'}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-semibold">Sign In</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text className="text-primary-600 font-bold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
