import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import OTPAuth from './OTPAuth';
import firebaseAuthService from '../services/firebaseAuth';

const LoginExample: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleAuthSuccess = async (firebaseToken: string, userData: any) => {
    console.log('Firebase Token:', firebaseToken);
    console.log('User Data:', userData);
    
    setIsAuthenticated(true);
    setUser(userData);
    
    // Gửi token về backend để lấy access token
    try {
      const backendResult = await firebaseAuthService.sendTokenToBackend(firebaseToken);
      console.log('Backend Result:', backendResult);
      
      if (backendResult.success) {
        Alert.alert('Thành công', 'Đăng nhập thành công!');
        console.log('Access Token:', backendResult.accessToken);
      } else {
        Alert.alert('Thông báo', backendResult.message);
        if (backendResult.mockResponse) {
          console.log('Mock Response:', backendResult.mockResponse);
        }
      }
    } catch (error) {
      console.error('Error with backend:', error);
    }
  };

  const handleAuthError = (error: string) => {
    console.error('Auth Error:', error);
  };

  const handleLogout = async () => {
    try {
      await firebaseAuthService.signOut();
      setIsAuthenticated(false);
      setUser(null);
      Alert.alert('Thành công', 'Đã đăng xuất');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Lỗi', 'Không thể đăng xuất');
    }
  };

  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Đăng nhập thành công!</Text>
        <Text style={styles.subtitle}>Chào mừng bạn</Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.infoText}>UID: {user.uid}</Text>
          <Text style={styles.infoText}>Phone: {user.phoneNumber}</Text>
          <Text style={styles.infoText}>Email Verified: {user.emailVerified ? 'Có' : 'Không'}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Text style={styles.button} onPress={handleLogout}>
            Đăng xuất
          </Text>
        </View>
      </View>
    );
  }

  return (
    <OTPAuth 
      onAuthSuccess={handleAuthSuccess}
      onAuthError={handleAuthError}
    />
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
  userInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FF3B30',
    color: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginExample;
