import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';
import firebaseAuthService from '@/services/firebaseAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: (route: string) => void;
}

export default function SplashScreenComponent({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    // Giữ splash screen hiển thị trong khi app đang load
    SplashScreen.preventAutoHideAsync();

    const checkAuthAndNavigate = async () => {
      try {
        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, 2000));

        SplashScreen.hideAsync();

        // Kiểm tra trạng thái đăng nhập bằng AsyncStorage (đáng tin cậy hơn)
        const accessToken = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const isLoggedIn = !!(accessToken && refreshToken);

        if (isLoggedIn) {
          // Nếu đã đăng nhập, chuyển đến trang home
          console.log('User is logged in, navigating to home');
          onFinish?.('(tabs)');
        } else {
          // Nếu chưa đăng nhập, chuyển đến trang login
          console.log('User not logged in, navigating to login');
          onFinish?.('login');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // Nếu có lỗi, chuyển đến trang login
        SplashScreen.hideAsync();
        console.log('Error occurred, navigating to login');
        onFinish?.('login');
      }
    };

    checkAuthAndNavigate();
  }, []); // Bỏ onFinish khỏi dependency array

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          <Image
            source={require('@/assets/images/background-login.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Car Maintenance Services</Text>
        <Text style={styles.subtitle}>Professional Auto Care Solutions</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a', // Xanh nước biển đậm
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.45, // Tăng từ 40% lên 45% chiều cao màn hình
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15, // Giảm từ 30px xuống 15px để chữ gần xe hơn
  },
  logo: {
    width: width * 0.8, // Tăng từ 70% lên 80% chiều rộng màn hình
    height: height * 0.4, // Tăng từ 35% lên 40% chiều cao màn hình
    maxWidth: 400, // Tăng từ 350 lên 400
    maxHeight: 320, // Tăng từ 280 lên 320
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'System',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
});
