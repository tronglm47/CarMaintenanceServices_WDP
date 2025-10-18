import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function VehiclesScreen() {
  const vehicles = [
    { 
      id: 1, 
      name: 'Honda City', 
      year: '2020', 
      plate: 'MH-01-AB-1234',
      image: 'https://via.placeholder.com/80x60/4A90E2/FFFFFF?text=H',
      nextService: '2024-02-15'
    },
    { 
      id: 2, 
      name: 'Toyota Innova', 
      year: '2019', 
      plate: 'MH-02-CD-5678',
      image: 'https://via.placeholder.com/80x60/FF4444/FFFFFF?text=T',
      nextService: '2024-02-20'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {vehicles.map((vehicle) => (
          <TouchableOpacity key={vehicle.id} style={styles.vehicleItem}>
            <View style={styles.vehicleLeft}>
              <Image source={{ uri: vehicle.image }} style={styles.vehicleImage} />
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{vehicle.name}</Text>
                <Text style={styles.vehicleYear}>{vehicle.year}</Text>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
              </View>
            </View>
            <View style={styles.vehicleRight}>
              <View style={styles.nextServiceContainer}>
                <Text style={styles.nextServiceLabel}>Next Service</Text>
                <Text style={styles.nextServiceDate}>{vehicle.nextService}</Text>
              </View>
              <TouchableOpacity style={styles.serviceButton}>
                <Text style={styles.serviceButtonText}>Book Service</Text>
              </TouchableOpacity>
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
  addButton: {
    backgroundColor: '#4A90E2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  vehicleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vehicleYear: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  vehicleRight: {
    alignItems: 'flex-end',
  },
  nextServiceContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  nextServiceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  nextServiceDate: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: '600',
  },
  serviceButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  serviceButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});