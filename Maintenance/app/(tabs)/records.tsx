import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function RecordsScreen() {
  const records = [
    { id: 1, service: 'Car Service', date: '2024-01-15', amount: '₹2,500', status: 'Completed' },
    { id: 2, service: 'Tire Change', date: '2024-01-10', amount: '₹4,200', status: 'Completed' },
    { id: 3, service: 'AC Repair', date: '2024-01-05', amount: '₹1,800', status: 'Completed' },
    { id: 4, service: 'Car Wash', date: '2024-01-01', amount: '₹300', status: 'Completed' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Records</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {records.map((record) => (
          <TouchableOpacity key={record.id} style={styles.recordItem}>
            <View style={styles.recordLeft}>
              <View style={styles.serviceIcon}>
                <Ionicons name="car" size={20} color="#4A90E2" />
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.serviceName}>{record.service}</Text>
                <Text style={styles.serviceDate}>{record.date}</Text>
              </View>
            </View>
            <View style={styles.recordRight}>
              <Text style={styles.amount}>{record.amount}</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.status}>{record.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F0F8FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 14,
    color: '#666',
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusContainer: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
