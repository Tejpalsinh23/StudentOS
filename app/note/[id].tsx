import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Note } from '../../types';
import { ArrowLeft, Save, Edit3, Eye } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchNote();
  }, [id]);

  const fetchNote = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();
      
    if (data) {
      setNote(data);
      setTitle(data.title);
      setContent(data.content || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({ title, content })
      .eq('id', id);
      
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsEditing(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft color="#374151" size={24} />
        </TouchableOpacity>
        
        <View className="flex-row space-x-2">
          {isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(false)} className="p-2 rounded-full bg-gray-100">
              <Eye color="#6b7280" size={20} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} className="p-2 rounded-full bg-gray-100">
              <Edit3 color="#6b7280" size={20} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={handleSave} disabled={saving} className="p-2 rounded-full bg-primary-100">
            {saving ? <ActivityIndicator size="small" color="#6366f1" /> : <Save color="#6366f1" size={20} />}
          </TouchableOpacity>
        </View>
      </View>

      {isEditing ? (
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          <TextInput
            className="text-2xl font-bold text-gray-900 mb-6"
            value={title}
            onChangeText={setTitle}
            placeholder="Note Title"
          />
          <TextInput
            className="text-base text-gray-700 min-h-[300px]"
            value={content}
            onChangeText={setContent}
            placeholder="Write your markdown here..."
            multiline
            textAlignVertical="top"
          />
          <View className="h-10" />
        </ScrollView>
      ) : (
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          <Text className="text-3xl font-bold text-gray-900 mb-6">{title}</Text>
          <Markdown style={{
            body: { fontSize: 16, color: '#374151', lineHeight: 24 },
            heading1: { fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
            heading2: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
            code_inline: { backgroundColor: '#f3f4f6', padding: 4, borderRadius: 4, fontFamily: 'monospace' },
            code_block: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, fontFamily: 'monospace', marginVertical: 8 },
          }}>
            {content || '*No content*'}
          </Markdown>
          <View className="h-20" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
