import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function TrackingScreen() {
  const { serviceId, serviceName, price, location, paymentMethod } = useLocalSearchParams();

  const timelineSteps = [
    { id: 1, title: 'Start working', time: '00:00', status: 'pending' },
    { id: 2, title: '50% done', time: '16 Jan 2023', status: 'completed' },
    { id: 3, title: 'Complete your work', time: '16 Jan 2023', status: 'completed' },
    { id: 4, title: 'Go for Delivery', time: '00:00', status: 'current' },
  ];

  const handleContinue = () => {
    router.push('/(tabs)');
  };

  const renderTimelineStep = (step: any, index: number) => {
    const isCompleted = step.status === 'completed';
    const isCurrent = step.status === 'current';
    const isPending = step.status === 'pending';

    return (
      <View key={step.id} style={styles.timelineStep}>
        <View style={styles.timelineContent}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepTime}>{step.time}</Text>
        </View>
        <View style={styles.timelineIndicator}>
          <View style={[
            styles.timelineDot,
            isCompleted && styles.timelineDotCompleted,
            isCurrent && styles.timelineDotCurrent,
            isPending && styles.timelineDotPending
          ]}>
            {isCompleted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
          {index < timelineSteps.length - 1 && (
            <View style={[
              styles.timelineLine,
              isCompleted && styles.timelineLineCompleted,
              isCurrent && styles.timelineLineCurrent
            ]} />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tracking</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Track your service */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceTitle}>Track your service</Text>
            <Ionicons name="settings" size={20} color="#FF4444" />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceName || 'Car Repair Service'}</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF4444" />
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          {timelineSteps.map((step, index) => renderTimelineStep(step, index))}
        </View>

        {/* Progress Message */}
        <View style={styles.progressMessage}>
          <Text style={styles.progressText}>
            Your work almost 50% done. You can check this
          </Text>
        </View>

        {/* Visual Evidence */}
        <View style={styles.evidenceContainer}>
          <Text style={styles.evidenceTitle}>Visual Evidence</Text>
          <View style={styles.evidenceImages}>
            <Image 
              source={{ uri: 'https://via.placeholder.com/150x100/4A90E2/FFFFFF?text=Engine' }}
              style={styles.evidenceImage}
            />
            <Image 
              source={{ uri: 'https://via.placeholder.com/150x100/666666/FFFFFF?text=Work' }}
              style={styles.evidenceImage}
            />
          </View>
        </View>

        {/* Ready for Delivery */}
        <View style={styles.deliveryContainer}>
          <Text style={styles.deliveryTitle}>Ready for Delivery</Text>
          <Image 
            source={{ uri: 'https://via.placeholder.com/300x200/4A90E2/FFFFFF?text=Mechanic+Working' }}
            style={styles.deliveryImage}
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>Receive your Vehicle</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
    flex: 1,
  },
  timelineCard: {
    backgroundColor: '#1E3A8A',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  stepTime: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  timelineIndicator: {
    alignItems: 'center',
    marginLeft: 16,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  timelineDotCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timelineDotCurrent: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  timelineDotPending: {
    backgroundColor: 'transparent',
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: '#B0B0B0',
    marginTop: 8,
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineLineCurrent: {
    backgroundColor: '#FF6B35',
  },
  progressMessage: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  evidenceContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  evidenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  evidenceImages: {
    flexDirection: 'row',
    gap: 12,
  },
  evidenceImage: {
    width: 150,
    height: 100,
    borderRadius: 8,
  },
  deliveryContainer: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  deliveryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  deliveryImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  continueButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
