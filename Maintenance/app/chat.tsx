import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConversation, sendMessage, waitForMessages } from '@/apis/chat.api';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatMessageItem {
  _id: string;
  content: string;
  createdAt: string;
  sender?: any;
  senderRole?: string | null;
  systemMessageType?: string | null;
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
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState(false);

  const conversationIdParam = useMemo(() => (params?.conversationId as string) || '', [params]);
  const [conversationId, setConversationId] = useState<string>(conversationIdParam);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  // Helpers to resolve IDs robustly
  const extractUserId = (obj: any): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;
    // Common shapes
    if (typeof obj.userId === 'string') return obj.userId;
    if (typeof obj._id === 'string' && (obj.role || obj.phone)) return obj._id; // user object itself
    if (obj.user && (typeof obj.user._id === 'string' || typeof obj.user.id === 'string')) return obj.user._id || obj.user.id;
    if (obj.userId && typeof obj.userId._id === 'string') return obj.userId._id;
    // customer wrapper -> get userId._id
    if (obj.customer && obj.customer.userId && typeof obj.customer.userId._id === 'string') return obj.customer.userId._id;
    // drill down typical containers
    if (obj.data) return extractUserId(obj.data);
    if (obj.profile) return extractUserId(obj.profile);
    return undefined;
  };

  const sanitizeObjectId = (value: any): string | null => {
    if (typeof value !== 'string') return null;
    const match = value.match(/[0-9a-fA-F]{24}/);
    return match ? match[0] : null;
  };

  const fetchCustomerId = async (): Promise<string | null> => {
    try {
      setResolvingId(true);
      const profile = await apiGet('/auth/profile');
      if (!profile?.success) return null;
      const rawUserId = extractUserId(profile.data);
      const userId = sanitizeObjectId(rawUserId);
      if (!userId) return null;
      const cust = await apiGet(`/customers/user/${userId}`);
      if (cust?.success) {
        const c = (cust.data as any) || {};
        const id = sanitizeObjectId(c._id || c.id);
        if (typeof id === 'string') {
          setCustomerId(id);
          return id;
        }
      }
    } catch {}
    finally { setResolvingId(false); }
    return null;
  };

  // Resolve current user's customerId once on mount
  useEffect(() => {
    fetchCustomerId();
  }, []);


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
            senderRole: m.senderRole || m.role || null,
            systemMessageType: m.systemMessageType || null,
          }))
        );
        setKnownIds(new Set(fetched.map((m: any) => m._id).filter(Boolean)));
        // After initial load, scroll to bottom to show latest
        setTimeout(() => {
          // @ts-ignore
          flatListRef.current?.scrollToEnd?.({ animated: false });
        }, 0);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [conversationId]);

  // Load saved conversationId from storage on mount if not provided via param
  useEffect(() => {
    const loadSavedConv = async () => {
      if (conversationIdParam) return;
      try {
        const saved = await AsyncStorage.getItem('chatConversationId');
        if (saved) setConversationId(saved);
      } catch {}
    };
    loadSavedConv();
  }, []);

  // Long-polling for new messages
  useEffect(() => {
    let isActive = true;
    let polling = false;
    const poll = async () => {
      if (polling) return; // avoid overlap
      polling = true;
      try {
        if (!conversationId) return;
        const res = await waitForMessages();
        if (!isActive || !res?.success) return;
        const newMessages = (res.data?.messages as any[]) || [];
        if (newMessages.length) {
          setMessages(prev => [
            ...prev,
            ...newMessages
              .filter((m) => !knownIds.has(m._id))
              .map((m, idx) => ({
                _id: m._id || `srv-${Date.now()}-${idx}`,
                content: m.content || m.message || '',
                createdAt: m.createdAt || new Date().toISOString(),
                sender: m.sender,
                senderRole: m.senderRole || m.role || null,
                systemMessageType: m.systemMessageType || null,
              })),
          ]);
          setKnownIds(prev => {
            const next = new Set(prev);
            newMessages.forEach((m: any) => m?._id && next.add(m._id));
            return next;
          });
        }
      } catch (e) {
        // ignore network timeouts
      } finally {
        polling = false;
        if (isActive) setTimeout(poll, 400); // small delay to prevent tight loop
      }
    };
    poll();
    return () => { isActive = false; };
  }, [conversationId, knownIds]);

  const handleSend = async () => {
    if (!input.trim()) return;
    // ensure we have a valid customerId; backend expects a Mongo ObjectId string
    let idToUse: string | null = customerId;
    if (!idToUse) idToUse = await fetchCustomerId();
    if (!idToUse) {
      Alert.alert('Không thể gửi', 'Không tìm thấy thông tin khách hàng (customerId). Vui lòng thử lại.');
      return;
    }
    setSending(true);
    const optimistic: ChatMessageItem = {
      _id: `temp-${Date.now()}`,
      content: input,
      createdAt: new Date().toISOString(),
      sender: user ? { id: user.uid } : undefined,
    };
    setMessages(prev => [...prev, optimistic]);
    const toSend = input;
    setInput('');
    try {
      const res = await sendMessage({ customerId: idToUse as string, content: toSend });
      const convIdFromSend: string | undefined = res?.data?.conversation?._id || res?.data?.message?.conversationId;
      if (convIdFromSend && !conversationId) {
        setConversationId(convIdFromSend);
        try { await AsyncStorage.setItem('chatConversationId', convIdFromSend); } catch {}
      }
    } catch (e) {
      // Rollback if needed
    } finally {
      setSending(false);
    }
    requestAnimationFrame(() => {
      // Scroll to bottom where newest message is located
      // @ts-ignore - FlatList proxies scrollToEnd
      flatListRef.current?.scrollToEnd?.({ animated: true });
    });
  };

  const renderItem = ({ item }: { item: ChatMessageItem }) => {
    const isMine = (item.senderRole?.toLowerCase?.() === 'user') || (!!item.sender && (item.sender?.id === user?.uid || item.sender?.email === user?.email));
    const isAgent = !!item.senderRole && item.senderRole.toLowerCase?.() !== 'user';
    return (
      <View style={[styles.messageWrapper, isMine ? styles.mine : styles.theirs]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {isAgent && <Ionicons name="shield-checkmark" size={14} color="#475569" style={{ marginRight: 6, marginTop: 2 }} />}
          <Text style={[styles.messageText, isAgent && { color: '#475569' }]}>{item.content}</Text>
        </View>
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
            inverted={false}
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
          {/* Hidden debug: show if missing customerId */}
          {!customerId && (
            <View style={{ position: 'absolute', left: -10000 }}>
              <Text>Resolving customerId…</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.sendBtn, input.trim() ? styles.sendEnabled : styles.sendDisabled]} onPress={handleSend} disabled={!input.trim() || sending || resolvingId}>
            {sending || resolvingId ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
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


