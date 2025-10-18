import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function BookingSuccessScreen() {
  const { serviceId, serviceName, price, location, paymentMethod } = useLocalSearchParams();

  const handleGoTrack = () => {
    router.push({
      pathname: '/tracking',
      params: {
        serviceId: serviceId as string,
        serviceName: serviceName as string,
        price: price as string,
        location: location as string,
        paymentMethod: paymentMethod as string
      }
    });
  };

  const handleBackToHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={{ uri: 'https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=Booking+Success' }}
            style={styles.illustration}
          />
        </View>

        {/* Success Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.successTitle}>Booking placed successfully</Text>
          <Text style={styles.successSubtitle}>
            Please Check your email and enter your 4 digit code
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.goTrackButton} onPress={handleGoTrack}>
            <Text style={styles.goTrackButtonText}>Go Track</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backToHomeButton} onPress={handleBackToHome}>
            <Text style={styles.backToHomeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  illustrationContainer: {
    marginBottom: 40,
  },
  illustration: {
    width: 300,
    height: 200,
    borderRadius: 12,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  goTrackButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  goTrackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToHomeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backToHomeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
