import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function PaymentScreen() {
  const { serviceId, serviceName, price, location } = useLocalSearchParams();
  const [selectedPayment, setSelectedPayment] = useState('digital');

  const handlePayment = () => {
    router.push({
      pathname: '/booking-success',
      params: {
        serviceId: serviceId as string,
        serviceName: serviceName as string,
        price: price as string,
        location: location as string,
        paymentMethod: selectedPayment
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Your Current Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Current Location</Text>
          <View style={styles.locationCard}>
            <Ionicons name="business" size={24} color="#666" />
            <Text style={styles.locationText}>{location || '2972 Westheimer Rd. Santa Ana, Illinois 85488'}</Text>
          </View>
        </View>

        {/* Payment System */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment System</Text>
          
          {/* Digital Pay */}
          <TouchableOpacity 
            style={[styles.paymentCard, selectedPayment === 'digital' && styles.paymentCardSelected]}
            onPress={() => setSelectedPayment('digital')}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.paymentIcon}>
                <Ionicons name="card" size={24} color="#666" />
              </View>
              <Text style={styles.paymentText}>Digital Pay</Text>
            </View>
            <View style={[styles.radioButton, selectedPayment === 'digital' && styles.radioButtonSelected]}>
              {selectedPayment === 'digital' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>

          {/* Cash on Pay */}
          <TouchableOpacity 
            style={[styles.paymentCard, selectedPayment === 'cash' && styles.paymentCardSelected]}
            onPress={() => setSelectedPayment('cash')}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.paymentIcon}>
                <Ionicons name="cash" size={24} color="#666" />
              </View>
              <Text style={styles.paymentText}>Cash on Pay</Text>
            </View>
            <View style={[styles.radioButton, selectedPayment === 'cash' && styles.radioButtonSelected]}>
              {selectedPayment === 'cash' && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>${price || '100'}</Text>
        </View>
      </ScrollView>

      {/* Pay Now Button */}
      <TouchableOpacity style={styles.payButton} onPress={handlePayment}>
        <Text style={styles.payButtonText}>Pay Now</Text>
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentCardSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#4A90E2',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 100,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4444',
  },
  payButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
