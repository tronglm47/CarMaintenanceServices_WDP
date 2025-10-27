import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatFloatingButtonProps {
  conversationId?: string | null;
}

const ChatFloatingButton: React.FC<ChatFloatingButtonProps> = ({ conversationId }) => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isHomeScreen = pathname === '/(tabs)' || pathname === '/(tabs)/index' || pathname === '/';

  if (!isHomeScreen) return null;

  const onPress = () => {
    router.push({
      pathname: '/chat',
      params: conversationId ? { conversationId } : undefined,
    });
  };

  // Always keep the button well above any bottom elements (e.g., tab bar)
  // Using a fixed clearance avoids pathname-based mismatches
  const FIXED_CLEARANCE = 90; // px above the bottom edge (includes typical tab bar height + margin)
  const bottomOffset = insets.bottom + FIXED_CLEARANCE;

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: bottomOffset }]}>
      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="chatbubbles" size={24} color="#fff" />
        <Text style={styles.text}>Chat</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
  button: {
    backgroundColor: '#1E3A8A',
    borderRadius: 28,
    height: 56,
    minWidth: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ChatFloatingButton;


