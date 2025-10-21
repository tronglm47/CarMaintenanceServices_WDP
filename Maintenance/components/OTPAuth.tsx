import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import firebaseAuthService from '../services/firebaseAuth';

interface OTPAuthProps {
  onAuthSuccess?: (firebaseToken: string, user: any) => void;
  onAuthError?: (error: string) => void;
}

const OTPAuth: React.FC<OTPAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  // Using React Native Firebase exclusively for phone auth

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    setLoading(true);
    try {
      // Sử dụng service React Native Firebase cho cả flow
      const result = await firebaseAuthService.sendOTP(phoneNumber);

      if (result.success) {
        setStep('otp');
        Alert.alert('Thành công', result.message);
      } else {
        Alert.alert('Lỗi', result.message);
        if (onAuthError) onAuthError(result.message);
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi gửi OTP');
      if (onAuthError) onAuthError('Có lỗi xảy ra khi gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await firebaseAuthService.verifyOTP(otpCode);

      if (result.success && result.token) {
        Alert.alert('Thành công', 'Xác thực OTP thành công!');

        // Gửi token về backend (mẫu)
        const backendResult = await firebaseAuthService.sendTokenToBackend(result.token, phoneNumber);

        if (onAuthSuccess) {
          onAuthSuccess(result.token, result.user);
        }
      } else {
        Alert.alert('Lỗi', result.message);
        if (onAuthError) onAuthError(result.message);
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xác thực OTP');
      if (onAuthError) onAuthError('Có lỗi xảy ra khi xác thực OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setStep('phone');
    setOtpCode('');
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtpCode('');
  };

  if (step === 'phone') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Đăng nhập bằng số điện thoại</Text>
        <Text style={styles.subtitle}>
          Nhập số điện thoại để nhận mã OTP
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập số điện thoại (VD: 0123456789)"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          maxLength={15}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSendOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Gửi OTP</Text>
          )}
        </TouchableOpacity>

        {/* Recaptcha không cần cho React Native Firebase */}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nhập mã OTP</Text>
      <Text style={styles.subtitle}>
        Mã OTP đã được gửi đến {phoneNumber}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nhập mã OTP (6 chữ số)"
        value={otpCode}
        onChangeText={setOtpCode}
        keyboardType="number-pad"
        maxLength={6}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Xác thực OTP</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <TouchableOpacity onPress={handleBackToPhone}>
          <Text style={styles.linkText}>← Quay lại</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResendOTP}>
          <Text style={styles.linkText}>Gửi lại OTP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default OTPAuth;
