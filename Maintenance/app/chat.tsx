import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar, RefreshControl, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConversation, sendMessage /* waitForMessages */ } from '@/apis/chat.api';
import chatSocket from '@/services/chatSocket';
import { useAxios } from '@/hooks/useAxios';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const conversationIdParam = useMemo(() => (params?.conversationId as string) || '', [params]);
  const [conversationId, setConversationId] = useState<string>(conversationIdParam);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const pendingTemps = useRef<Map<string, string>>(new Map());
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
    } catch { }
    finally { setResolvingId(false); }
    return null;
  };

  // Resolve current user's customerId once on mount
  useEffect(() => {
    fetchCustomerId();
  }, []);


  const flatListRef = useRef<FlatList<ChatMessageItem>>(null);

  const fetchMessages = async (showLoading = true) => {
    if (!conversationId) return;
    if (showLoading) setLoading(true);
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
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to refresh messages');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMessages(false);
      toast.success('Messages refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load saved conversationId from storage on mount if not provided via param
  useEffect(() => {
    const loadSavedConv = async () => {
      if (conversationIdParam) return;
      try {
        const saved = await AsyncStorage.getItem('chatConversationId');
        if (saved) setConversationId(saved);
      } catch { }
    };
    loadSavedConv();
  }, []);

  // Long-polling for new messages
  useEffect(() => {
    // Realtime via socket: subscribe to message:new events for current conversation
    let mounted = true;

    const onMessageNew = (msg: any) => {
      if (!mounted) return;
      if (!msg) return;
      const mid = msg._id || msg.id || msg.id || `srv-${Date.now()}`;
      if (knownIds.has(mid)) return;
      // If we have a pending optimistic message with same content, replace it instead of appending
      const msgContent = msg.content || msg.message || msg.text || '';
      // find a temp id whose content matches and is pending
      const existingTempEntry = Array.from(pendingTemps.current.entries()).find(([_tempId, tempContent]) => tempContent === msgContent);
      if (existingTempEntry) {
        const [tempId] = existingTempEntry;
        // replace temp message in list with server message
        setMessages(prev => prev.map(m => m._id === tempId ? ({
          _id: mid,
          content: msgContent,
          createdAt: msg.createdAt || new Date().toISOString(),
          sender: msg.sender || msg.senderId || undefined,
          senderRole: msg.senderRole || msg.role || null,
          systemMessageType: msg.systemMessageType || null,
        }) : m));
        setKnownIds(prev => {
          const next = new Set(prev);
          next.add(mid);
          return next;
        });
        pendingTemps.current.delete(tempId);
        return;
      }
      const mapped = {
        _id: mid,
        content: msg.content || msg.message || msg.text || '',
        createdAt: msg.createdAt || new Date().toISOString(),
        sender: msg.sender || msg.senderId || undefined,
        senderRole: msg.senderRole || msg.role || null,
        systemMessageType: msg.systemMessageType || null,
      };
      setMessages(prev => [...prev, mapped]);
      setKnownIds(prev => {
        const next = new Set(prev);
        next.add(mid);
        return next;
      });
    };

    const start = async () => {
      if (!conversationId) return;
      try {
        await chatSocket.joinConversation(conversationId);
        chatSocket.on('message:new', onMessageNew as any);
      } catch (e) {
        console.warn('chat socket subscribe failed', e);
      }
    };

    start();

    return () => {
      mounted = false;
      try {
        chatSocket.off('message:new', onMessageNew as any);
        if (conversationId) chatSocket.leaveConversation(conversationId);
      } catch { }
    };
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
    // Track pending optimistic message content so incoming socket messages can match and replace it
    pendingTemps.current.set(optimistic._id, input);
    const toSend = input;
    setInput('');
    try {
      const res = await sendMessage({ customerId: idToUse as string, content: toSend });
      const returnedMessage = res?.data?.message || res?.data?.data || null;
      const returnedId: string | undefined = returnedMessage?._id || returnedMessage?.id;
      const convIdFromSend: string | undefined = res?.data?.conversation?._id || returnedMessage?.conversationId;
      if (returnedId) {
        // map any temp messages with same content to returned id to avoid duplicates
        setMessages(prev => prev.map(m => m._id.startsWith('temp-') && m.content === toSend ? ({
          ...m,
          _id: returnedId,
          createdAt: returnedMessage?.createdAt || m.createdAt,
          sender: returnedMessage?.sender || m.sender,
        }) : m));
        setKnownIds(prev => {
          const next = new Set(prev);
          next.add(returnedId);
          return next;
        });
        // clear pending temp entries for this content
        for (const [tempId, content] of Array.from(pendingTemps.current.entries())) {
          if (content === toSend) pendingTemps.current.delete(tempId);
        }
      }
      if (convIdFromSend && !conversationId) {
        setConversationId(convIdFromSend);
        try { await AsyncStorage.setItem('chatConversationId', convIdFromSend); } catch { }
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
          {isAgent && <Ionicons name="shield-checkmark" size={14} color="#10B981" style={{ marginRight: 6, marginTop: 2 }} />}
          <Text style={[styles.messageText, isMine && { color: '#FFFFFF' }]}>{item.content}</Text>
        </View>
        <Text style={[styles.timeText, isMine && { color: '#E0F2FE' }]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    );
  };

  const keyboardVerticalOffset = Platform.select({ ios: insets.top, android: 0 }) || 0;

  const suggestedQuestions = [
    "Is my vehicle service completed?",
    "I need advice on service packages",
    "Show my vehicle information",
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#15803D" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat Support</Text>
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="chatbubbles" size={64} color="#15803D" />
            </View>
            <Text style={styles.emptyTitle}>Start a Conversation</Text>
            <Text style={styles.emptySubtext}>Send us a message to get support</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            contentContainerStyle={styles.listContent}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            inverted={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#22C55E"
                colors={['#22C55E']}
              />
            }
          />
        )}

        {/* Suggested Questions - Always visible near input */}
        <View style={styles.suggestedQuestionsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedQuestionsScrollContent}
            style={styles.suggestedQuestionsScroll}
          >
            {suggestedQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestedQuestionChip}
                onPress={() => handleSuggestedQuestion(question)}
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle-outline" size={16} color="#15803D" style={{ marginRight: 6 }} />
                <Text style={styles.suggestedQuestionChipText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
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
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#15803D' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    height: 56,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  suggestedQuestionsWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  suggestedQuestionsScroll: {
    maxHeight: 50,
  },
  suggestedQuestionsScrollContent: {
    paddingRight: 12,
    gap: 8,
  },
  suggestedQuestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginRight: 8,
  },
  suggestedQuestionChipText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '500',
  },
  listContent: { padding: 16 },
  messageWrapper: {
    maxWidth: '80%',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  mine: { backgroundColor: '#15803D', alignSelf: 'flex-end', borderTopRightRadius: 4 },
  theirs: { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  messageText: { color: '#0F172A', fontSize: 15, lineHeight: 20 },
  timeText: { color: '#64748B', fontSize: 11, marginTop: 4, textAlign: 'right' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  input: { 
    flex: 1, 
    maxHeight: 120, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    color: '#111827',
  },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sendEnabled: { backgroundColor: '#15803D' },
  sendDisabled: { backgroundColor: '#CBD5E1' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});


