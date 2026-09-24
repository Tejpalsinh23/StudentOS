import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Note, Subject } from '../../types';
import { Plus, FileText, Trash2, X, Paperclip, Star, ChevronRight } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

export default function NotesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: notesData } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (notesData) setNotes(notesData);

    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user?.id);
      
    if (subjectsData) setSubjects(subjectsData);
    
    setLoading(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedFile(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const saveNote = async () => {
    if (!newNoteTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      let file_url = null;

      // Upload file if attached
      if (attachedFile) {
        if (attachedFile.size && attachedFile.size > 10 * 1024 * 1024) {
          Alert.alert('Error', 'File size exceeds the 10MB limit.');
          setSaving(false);
          return;
        }

        const fileExt = attachedFile.name.split('.').pop()?.toLowerCase();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
        const filePath = `notes/${fileName}`;

        // React Native approach to get blob from URI
        const res = await fetch(attachedFile.uri);
        const blob = await res.blob();

        const { error: uploadError } = await supabase.storage
          .from('studentos_files')
          .upload(filePath, blob, {
            contentType: attachedFile.mimeType || 'application/octet-stream'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('studentos_files')
          .getPublicUrl(filePath);
          
        file_url = publicUrl;
      }

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user?.id,
          subject_id: selectedSubjectId,
          title: newNoteTitle.trim(),
          content: newNoteContent.trim(),
          file_url: file_url,
          favorite: false
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setNotes([data, ...notes]);
        closeModal();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = (id: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const previousNotes = [...notes];
            setNotes(notes.filter(n => n.id !== id));
            const { error } = await supabase.from('notes').delete().eq('id', id);
            if (error) {
              setNotes(previousNotes);
              Alert.alert('Error', 'Failed to delete note.');
            }
          }
        }
      ]
    );
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    // Optimistic UI update
    const previousNotes = [...notes];
    setNotes(notes.map(n => n.id === id ? { ...n, favorite: !current } : n));
    
    const { error } = await supabase.from('notes').update({ favorite: !current }).eq('id', id);
    if (error) {
      setNotes(previousNotes);
      Alert.alert('Error', 'Failed to update favorite status.');
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setNewNoteTitle('');
    setNewNoteContent('');
    setSelectedSubjectId(null);
    setAttachedFile(null);
  };

  const getSubjectName = (subjectId: string | null) => {
    if (!subjectId) return 'No Subject';
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'No Subject';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-6 pb-2">
        <Text className="text-3xl font-bold text-gray-900 mb-1">Notes</Text>
        <Text className="text-gray-500 mb-4">Store your study materials and documents</Text>
      </View>

      <ScrollView 
        className="flex-1 px-6" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" className="mt-10" />
        ) : notes.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <FileText color="#cbd5e1" size={48} className="mb-4" />
            <Text className="text-gray-400 font-medium text-lg">No notes found</Text>
            <Text className="text-gray-400 text-sm mt-1">Tap + to create your first note</Text>
          </View>
        ) : (
          notes.map((note) => (
            <TouchableOpacity 
              key={note.id} 
              onPress={() => router.push(`/note/${note.id}` as any)}
              className="bg-white p-5 rounded-2xl  border border-gray-100 mb-4"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-lg font-bold text-gray-900 flex-1 mr-2">{note.title}</Text>
                <View className="flex-row space-x-3 items-center">
                  <TouchableOpacity onPress={() => toggleFavorite(note.id, note.favorite)}>
                    <Star color={note.favorite ? "#f59e0b" : "#cbd5e1"} fill={note.favorite ? "#f59e0b" : "transparent"} size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteNote(note.id)}>
                    <Trash2 color="#ef4444" size={20} />
                  </TouchableOpacity>
                  <ChevronRight color="#9ca3af" size={20} />
                </View>
              </View>

              <Text className="text-xs font-medium text-indigo-500 mb-3">{getSubjectName(note.subject_id)}</Text>

              {note.content ? (
                <Text className="text-gray-600 mb-4" numberOfLines={3}>{note.content}</Text>
              ) : null}

              {note.file_url && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(note.file_url!)}
                  className="bg-indigo-50 flex-row items-center p-3 rounded-xl border border-indigo-100"
                >
                  <Paperclip color="#6366f1" size={16} className="mr-2" />
                  <Text className="text-indigo-600 font-medium">View Attachment</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
        <View className="h-20" />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-500 rounded-full items-center justify-center "
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>

      {/* Add Note Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-[85%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-900">New Note</Text>
              <TouchableOpacity onPress={closeModal} className="bg-gray-100 p-2 rounded-full">
                <X color="#374151" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-medium text-gray-700 mb-2">Title</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                placeholder="Note Title"
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
              />

              <Text className="text-sm font-medium text-gray-700 mb-2">Subject (Optional)</Text>
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

              <Text className="text-sm font-medium text-gray-700 mb-2">Content</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 mb-4 min-h-[120px]"
                placeholder="Type your notes here..."
                multiline
                textAlignVertical="top"
                value={newNoteContent}
                onChangeText={setNewNoteContent}
              />

              <Text className="text-sm font-medium text-gray-700 mb-2">Attachment</Text>
              <TouchableOpacity 
                onPress={pickDocument}
                className="border-2 border-dashed border-gray-300 rounded-xl p-4 items-center mb-8 bg-gray-50 flex-row justify-center"
              >
                <Paperclip color="#6b7280" size={20} className="mr-2" />
                <Text className="text-gray-600 font-medium">
                  {attachedFile ? attachedFile.name : 'Upload File (PDF, Image)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={saveNote} 
                disabled={saving}
                className="bg-primary-500 py-4 rounded-xl items-center  mb-10"
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Save Note</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
