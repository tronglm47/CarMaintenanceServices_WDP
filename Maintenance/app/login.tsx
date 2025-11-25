import React, { useState } from 'react';
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
import { router } from 'expo-router';
import firebaseAuthService from '@/services/firebaseAuth';
import RecaptchaContainer from '@/components/RecaptchaContainer';
import { useApiService } from '@/hooks/useApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const api = useApiService();
  const { login } = useAuth();
  const { requestPushToken } = useNotification();

  const handleSendOTP = async () => {
    // Validate phone number
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    // Basic phone number validation (Vietnamese format)
    const phoneRegex = /^(\+84|84|0)[1-9][0-9]{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }

    setIsLoading(true);

    try {
      // Gửi OTP qua Firebase SMS
      console.log('Formatted Phone Number login:', phoneNumber);
      const result = await firebaseAuthService.sendOTP(phoneNumber);

      if (result.success) {
        // Navigate to verify screen with phone number
        router.push({
          pathname: '/verify',
          params: { phoneNumber: phoneNumber }
        });
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');

    // Format Vietnamese phone number
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 9) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    } else {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 11)}`;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <RecaptchaContainer>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="car" size={60} color="#15803D" />
              </View>
              <Text style={styles.title}>Car Maintenance Services</Text>
              <Text style={styles.subtitle}>Login to continue</Text>
            </View>

            {mode === 'phone' ? (
              <>
                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.phoneInputWrapper}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>+84</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="0123 456 789"
                      value={phoneNumber}
                      onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
                      keyboardType="phone-pad"
                      maxLength={15}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Send OTP Button */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                    onPress={handleSendOTP}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.sendButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Minimal toggle below primary button */}
                <View style={styles.toggleRow}>
                  <TouchableOpacity onPress={() => setMode('phone')} style={[styles.toggleBtn, styles.toggleActive]}>
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={styles.toggleTextActive}>Phone Number</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMode('email')} style={styles.toggleBtn}>
                    <Ionicons name="mail" size={16} color="#666" />
                    <Text style={styles.toggleText}>Email</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Email/Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={identifier}
                    onChangeText={setIdentifier}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                    onPress={async () => {
                      if (!identifier || !password) {
                        Alert.alert('Error', 'Please enter email and password');
                        return;
                      }
                      setIsLoading(true);
                      try {
                        const res = await api.auth.loginByPassword(identifier, password);
                        const data: any = (res as any)?.data ?? res;
                        const payload = data?.data ?? data;
                        const access = payload?.accessToken || payload?.access_token || payload?.token;
                        const refresh = payload?.refreshToken || payload?.refresh_token || payload?.refresh;
                        const role = payload?.role || 'CUSTOMER';
                        if (!access || !refresh) throw new Error(data?.message || 'Đăng nhập thất bại');
                        await login(access, refresh, role);
                        
                        // Only request push token for CUSTOMER role
                        if (role !== 'TECHNICIAN') {
                          try {
                            await requestPushToken();
                          } catch (err) {
                            console.warn('⚠️ Failed to register push token:', err);
                            // Continue anyway
                          }
                        }
                        
                        // Navigate based on role
                        if (role === 'TECHNICIAN') {
                          router.replace('/(technician-tabs)');
                        } else {
                          router.replace('/(tabs)');
                        }
                      } catch (e: any) {
                        // Only show user-friendly error in Alert, not the axios error
                        const errorMsg = e?.response?.data?.message || e?.message || 'Incorrect email or password';
                        Alert.alert('Login Failed', errorMsg);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.sendButtonText}>Login</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Minimal toggle below primary button */}
                <View style={styles.toggleRow}>
                  <TouchableOpacity onPress={() => setMode('phone')} style={styles.toggleBtn}>
                    <Ionicons name="call" size={16} color="#666" />
                    <Text style={styles.toggleText}>Phone Number</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMode('email')} style={[styles.toggleBtn, styles.toggleActive]}>
                    <Ionicons name="mail" size={16} color="#fff" />
                    <Text style={styles.toggleTextActive}>Email</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By continuing, you agree to our{' '}
                <Text style={styles.linkText}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </View>
          </View>
        </RecaptchaContainer>
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
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#F0F8FF',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  sendButton: {
    backgroundColor: '#15803D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: '#15803D',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  switchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  switchBtnActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  switchText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  switchTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  toggleActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  toggleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  toggleTextActive: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
