import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { toast } from 'sonner-native';
import firebaseAuthService from '@/services/firebaseAuth';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotification } from '@/contexts/NotificationContext';
import auth from '@react-native-firebase/auth';

export default function VerifyScreen() {
  const { phoneNumber } = useLocalSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const { requestPushToken } = useNotification();
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Listen for Firebase auth state changes because some Android versions
    // auto-retrieve SMS verification and sign the user in in the background.
    // If that happens, proceed to exchange the ID token with the backend
    // so the user is fully logged into the app without showing an expired OTP message.
    const unsubscribeAuth = auth().onAuthStateChanged(async (user) => {
      if (!user) return;
      if (isProcessingAuth) return;

      setIsProcessingAuth(true);
      setIsLoading(true);

      try {
        const idToken = await user.getIdToken();
        const backendResult = await firebaseAuthService.sendTokenToBackend(idToken, phoneNumber as string);

        if (backendResult.success && backendResult.data) {
          await login(backendResult.data.accessToken, backendResult.data.refreshToken, backendResult.data.role);
          await requestPushToken();

          toast.success('Đăng nhập thành công! Chào mừng bạn đến với Car Maintenance Services');

          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error('Error handling auto sign-in:', e);
      } finally {
        setIsProcessingAuth(false);
        setIsLoading(false);
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribeAuth();
    };
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ 6 số OTP');
      return;
    }

    setIsLoading(true);

    try {
      // If the device has already auto-signed-in (Android SMS retrieval), prefer
      // to exchange the current user's ID token with backend instead of re-confirming
      // the OTP which will return expired.
      const currentUser = auth().currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const backendResult = await firebaseAuthService.sendTokenToBackend(idToken, phoneNumber as string);

        if (backendResult.success && backendResult.data) {
          await login(backendResult.data.accessToken, backendResult.data.refreshToken, backendResult.data.role);
          await requestPushToken();

          toast.success('Đăng nhập thành công! Chào mừng bạn đến với Car Maintenance Services');

          setTimeout(() => router.replace('/(tabs)'), 1500);
          return;
        }
      }

      // Complete authentication flow: OTP -> Firebase Token -> Backend Authentication
      const result = await firebaseAuthService.authenticateWithOTP(phoneNumber as string, otpString);

      if (result.success && result.data) {
        // Store authentication tokens using auth context
        await login(result.data.accessToken, result.data.refreshToken, result.data.role);

        // Register device token for push notifications
        console.log('📱 Registering device token after login...');
        // Debug: ensure tokens are persisted before registering device token
        try {
          const a = await AsyncStorage.getItem('accessToken');
          const r = await AsyncStorage.getItem('refreshToken');
          console.log('DEBUG tokens after login (before push):', { hasAccess: !!a, hasRefresh: !!r });
        } catch (e) {
          console.error('Failed to read tokens from AsyncStorage before push registration', e);
        }

        await requestPushToken();

        // Show success toast
        toast.success('Đăng nhập thành công! Chào mừng bạn đến với Car Maintenance Services');

        // Navigate to main app (tabs) after a short delay to show toast
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } else {
        Alert.alert('Lỗi', result.message);
      }

    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Mã OTP không đúng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timeLeft > 0) return;

    setIsLoading(true);
    try {
      // Gửi lại OTP qua Firebase
      const result = await firebaseAuthService.sendOTP(phoneNumber as string);

      if (result.success) {
        setTimeLeft(60);
        setOtp(['', '', '', '', '', '']);

        toast('Mã OTP mới đã được gửi. Vui lòng kiểm tra tin nhắn');
      } else {
        Alert.alert('Lỗi', result.message);
      }
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể gửi lại OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 9) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 11)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={50} color="#4A90E2" />
            </View>
            <Text style={styles.title}>Xác thực OTP</Text>
            <Text style={styles.subtitle}>
              Chúng tôi đã gửi mã xác thực đến số{'\n'}
              <Text style={styles.phoneNumber}> {formatPhoneNumber(phoneNumber as string)}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Nhập mã OTP</Text>
            <View style={styles.otpInputs}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
          </View>

          {/* Verify Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>Xác thực</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Không nhận được mã?{' '}
            </Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={timeLeft > 0 || isLoading}
            >
              <Text style={[
                styles.resendButton,
                (timeLeft > 0 || isLoading) && styles.resendButtonDisabled
              ]}>
                {timeLeft > 0 ? `Gửi lại (${timeLeft}s)` : 'Gửi lại'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#F0F8FF',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneNumber: {
    fontWeight: '600',
    color: '#4A90E2',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  otpInputFilled: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  verifyButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  verifyButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendButton: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#B0B0B0',
  },
});
