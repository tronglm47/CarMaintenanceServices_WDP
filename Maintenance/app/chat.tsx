import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConversation, sendMessage } from '@/apis/chat.api';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatMessageItem {
  _id: string;
  content: string;
  createdAt: string;
  sender?: any;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const { get: apiGet } = useAxios();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const conversationId = useMemo(() => (params?.conversationId as string) || '', [params]);

  const flatListRef = useRef<FlatList<ChatMessageItem>>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      if (!conversationId) return;
      setLoading(true);
      try {
        const res = await getConversation(conversationId, { page: 1, limit: 20 });
        const fetched = (res.data?.messages as any[]) || [];
        setMessages(
          fetched.map((m, idx) => ({
            _id: m._id || String(idx),
            content: m.content || m.message || '',
            createdAt: m.createdAt || new Date().toISOString(),
            sender: m.sender,
          }))
        );
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const optimistic: ChatMessageItem = {
      _id: `temp-${Date.now()}`,
      content: input,
      createdAt: new Date().toISOString(),
      sender: user ? { id: user.uid } : undefined,
    };
    setMessages(prev => [optimistic, ...prev]);
    const toSend = input;
    setInput('');
    try {
      await sendMessage({
        customerId: user?.uid || 'me',
        content: toSend,
      });
    } catch (e) {
      // Rollback if needed
    } finally {
      setSending(false);
    }
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  };

  const renderItem = ({ item }: { item: ChatMessageItem }) => {
    const isMine = !!item.sender && (item.sender?.id === user?.uid || item.sender?.email === user?.email);
    return (
      <View style={[styles.messageWrapper, isMine ? styles.mine : styles.theirs]}>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  };

  const keyboardVerticalOffset = Platform.select({ ios: insets.top, android: 0 }) || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat Support</Text>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
        </View>

        {loading ? (
          <View style={styles.loader}> 
            <ActivityIndicator size="large" color="#1E3A8A" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            contentContainerStyle={styles.listContent}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            inverted
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, input.trim() ? styles.sendEnabled : styles.sendDisabled]} onPress={handleSend} disabled={!input.trim() || sending}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    height: 56,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listContent: { padding: 16 },
  messageWrapper: {
    maxWidth: '80%',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  mine: { backgroundColor: '#DCFCE7', alignSelf: 'flex-end', borderTopRightRadius: 4 },
  theirs: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#EEF2F7' },
  messageText: { color: '#0F172A' },
  timeText: { color: '#64748B', fontSize: 10, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  input: { flex: 1, maxHeight: 120, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendEnabled: { backgroundColor: '#1E3A8A' },
  sendDisabled: { backgroundColor: '#94A3B8' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});


