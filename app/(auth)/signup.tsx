import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User, ArrowLeft, BookOpen } from 'lucide-react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        console.error('Sign Up error:', error);
        Alert.alert('Sign Up Failed', 'An error occurred during sign up. Please try again or use a different email.');
      } else if (!session) {
        Alert.alert('Success', 'Please check your inbox for email verification!');
        router.back();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-4 pb-8">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 mb-6"
            >
              <ArrowLeft color="#374151" size={24} />
            </TouchableOpacity>

            <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
            <Text className="text-gray-500 mb-8">Join StudentOS to organize your student life</Text>

            <View className="space-y-4 mb-8">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Full Name</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <User color="#9CA3AF" size={20} />
                  <TextInput
                    className="flex-1 ml-3 text-base text-gray-900"
                    onChangeText={setName}
                    value={name}
                    placeholder="John Doe"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1 mt-4">Email</Text>
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
              onPress={signUpWithEmail}
              disabled={loading}
              className={loading ? 'py-4 rounded-2xl items-center  mt-4 bg-primary-300' : 'py-4 rounded-2xl items-center  mt-4 bg-primary-500'}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-semibold">Sign Up</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-8">
              <Text className="text-gray-500">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text className="text-primary-600 font-bold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
