import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, CheckSquare, TrendingUp } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Study',
    description: 'Plan your studies and stay consistent.',
    icon: <BookOpen size={64} color="#6366f1" />,
  },
  {
    id: '2',
    title: 'Productivity',
    description: 'Manage tasks, deadlines and your daily routine.',
    icon: <CheckSquare size={64} color="#6366f1" />,
  },
  {
    id: '3',
    title: 'Growth',
    description: 'Track your goals, skills and career progress.',
    icon: <TrendingUp size={64} color="#6366f1" />,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/login');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        <View className="mb-10 items-center justify-center bg-primary-50 w-40 h-40 rounded-full">
          {slides[currentIndex].icon}
        </View>
        
        <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">
          {slides[currentIndex].title}
        </Text>
        <Text className="text-lg text-gray-500 text-center px-4">
          {slides[currentIndex].description}
        </Text>
      </View>

      <View className="px-6 pb-12">
        <View className="flex-row justify-center mb-8 gap-2">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full ${
                index === currentIndex ? 'bg-primary-500 w-8' : 'bg-gray-200 w-2'
              }`}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          className="bg-primary-500 py-4 rounded-2xl items-center "
        >
          <Text className="text-white text-lg font-semibold">
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
        
        {currentIndex === slides.length - 1 && (
          <TouchableOpacity
            onPress={() => router.push('/login')}
            className="mt-4 py-4 rounded-2xl items-center"
          >
            <Text className="text-primary-600 text-base font-semibold">
              I already have an account
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
