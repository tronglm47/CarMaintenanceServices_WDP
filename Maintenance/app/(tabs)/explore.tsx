import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApiService } from '@/hooks/useApiService';
import { router } from 'expo-router';

export default function VehiclesScreen() {
  const api = useApiService();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.vehicles.getMyVehicles();
        if (isMounted && res?.success) {
          const list = (res.data as any[]) || [];
          setVehicles(list);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {isLoading && (
          <View style={styles.centered}> 
            <ActivityIndicator size="small" color="#4A90E2" />
          </View>
        )}
        {!isLoading && vehicles.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>Chưa có xe nào</Text>
          </View>
        )}
        {!isLoading && vehicles.map((vehicle: any, index: number) => (
          <TouchableOpacity
            key={(vehicle?.id || vehicle?._id || vehicle?.vehicleId || vehicle?.vin || index).toString()}
            style={styles.vehicleItem}
            onPress={() => router.push({ pathname: '/vehicle-details', params: { id: (vehicle?._id || vehicle?.id || '').toString() } })}
          >
            <View style={styles.vehicleLeft}>
              <Image source={{ uri: vehicle.image || 'https://via.placeholder.com/80x60/4A90E2/FFFFFF?text=V' }} style={styles.vehicleImage} />
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{vehicle.name || vehicle.model || 'Vehicle'}</Text>
                <Text style={styles.vehicleYear}>{vehicle.year || vehicle.manufactureYear || ''}</Text>
                <Text style={styles.vehiclePlate}>{vehicle.plate || vehicle.licensePlate || ''}</Text>
              </View>
            </View>
            <View style={styles.vehicleRight}>
              <View style={styles.nextServiceContainer}>
                <Text style={styles.nextServiceLabel}>Next Service</Text>
                <Text style={styles.nextServiceDate}>{vehicle.nextService || '-'}</Text>
              </View>
              <TouchableOpacity style={styles.serviceButton} onPress={() => router.push({ pathname: '/book-appointment', params: { vehicleId: (vehicle?._id || vehicle?.id || '').toString() } })}>
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