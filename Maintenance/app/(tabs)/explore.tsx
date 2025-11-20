import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApiService } from '@/hooks/useApiService';
import { router } from 'expo-router';
import { toast } from 'sonner-native';

export default function VehiclesScreen() {
  const api = useApiService();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadVehicles = async (isMounted: boolean = true) => {
    try {
      const res = await api.vehicles.getMyVehicles();
      if (isMounted && res?.success) {
        const list = (res.data as any[]) || [];
        setVehicles(list);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        await loadVehicles(isMounted);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadVehicles(true);
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Vehicles</Text>
          </View>
          <TouchableOpacity 
            style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]} 
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Ionicons 
              name="reload" 
              size={22} 
              color={isRefreshing ? "#999" : "#22C55E"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
        {isLoading && (
          <View style={styles.centered}> 
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        )}
        {!isLoading && vehicles.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="car-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No vehicles yet</Text>
            <Text style={styles.emptySubtext}>Add your first vehicle to get started</Text>
            <TouchableOpacity style={styles.addVehicleButton}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addVehicleText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isLoading && vehicles.map((vehicle: any, index: number) => (
          <TouchableOpacity
            key={(vehicle?.id || vehicle?._id || vehicle?.vehicleId || vehicle?.vin || index).toString()}
            style={styles.vehicleCard}
            onPress={() => router.push({ pathname: '/vehicle-details', params: { id: (vehicle?._id || vehicle?.id || '').toString() } })}
            activeOpacity={0.7}
          >
            <View style={styles.vehicleImageContainer}>
              <Image 
                source={{ uri: vehicle.image || vehicle.image_url || 'https://via.placeholder.com/180x140/4A90E2/FFFFFF?text=CAR' }} 
                style={styles.vehicleImage} 
                resizeMode="cover"
              />
            </View>
            
            <View style={styles.vehicleContent}>
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName} numberOfLines={1}>
                    {vehicle.name || vehicle.model || 'Vehicle'}
                  </Text>
                  {(vehicle.year || vehicle.manufactureYear) && (
                    <View style={styles.yearBadge}>
                      <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                      <Text style={styles.vehicleYear}>{vehicle.year || vehicle.manufactureYear}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.vehicleDetails}>
                {(vehicle.plate || vehicle.licensePlate) && (
                  <View style={styles.plateContainer}>
                    <Ionicons name="card-outline" size={14} color="#22C55E" />
                    <Text style={styles.vehiclePlate}>{vehicle.plate || vehicle.licensePlate}</Text>
                  </View>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="speedometer-outline" size={14} color="#6B7280" />
                    <Text style={styles.statText}>{vehicle.mileage || '0'} km</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.statText}>Active</Text>
                  </View>
                </View>
              </View>

              {vehicle.nextService && (
                <View style={styles.nextServiceBox}>
                  <Ionicons name="time-outline" size={14} color="#F59E0B" />
                  <Text style={styles.nextServiceText}>Next: {vehicle.nextService}</Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push({ 
                    pathname: '/book-appointment', 
                    params: { vehicleId: (vehicle?._id || vehicle?.id || '').toString() } 
                  })}
                >
                  <Ionicons name="calendar-outline" size={16} color="#22C55E" />
                  <Text style={styles.actionButtonText}>Book Appointment</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#F0FDF4',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    position: 'absolute',
    right: 20,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  addVehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addVehicleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehicleImageContainer: {
    width: '50%',
    height: 140,
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  vehicleContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  yearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  vehicleYear: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  vehicleDetails: {
    marginBottom: 8,
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  vehiclePlate: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  nextServiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  nextServiceText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  chevronContainer: {
    paddingRight: 12,
    justifyContent: 'center',
  },
});