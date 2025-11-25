import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApiService } from '@/hooks/useApiService';

interface AutoPart {
  _id: string;
  serial_number: string;
  vehicle_id: any;
  autopart_id: {
    _id: string;
    name: string;
    cost_price: number;
    selling_price: number;
    warranty_time: number;
    category: string;
  };
  quantity: number;
  isWarranty: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function VehicleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApiService();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [autoParts, setAutoParts] = useState<AutoPart[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        // Prefer fetching specific id if API supports it; otherwise use list cache
        const res = await api.vehicles.getById(id as string);
        if (isMounted && res?.success) {
          setVehicle((res.data as any) || null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (id) load();
    return () => { isMounted = false; };
  }, [id]);

  // Load auto parts for the vehicle
  useEffect(() => {
    let isMounted = true;
    const loadAutoParts = async () => {
      if (!id) {
        console.log('❌ No vehicle ID provided for auto parts');
        return;
      }
      console.log('🔍 Loading auto parts for vehicle:', id);
      setIsLoadingParts(true);
      try {
        const res = await api.raw.get(`/vehicle-auto-parts/vehicle/${id}`);
        console.log('📦 Auto parts response:', res);
        const data: any = (res as any)?.data || res;
        console.log('📦 Auto parts data:', data);
        
        if (isMounted) {
          if (data?.success && Array.isArray(data.data)) {
            console.log('✅ Auto parts loaded:', data.data.length, 'parts');
            setAutoParts(data.data);
          } else if (Array.isArray(data)) {
            console.log('✅ Auto parts loaded (direct array):', data.length, 'parts');
            setAutoParts(data);
          } else {
            console.log('⚠️ Unexpected data format:', data);
            setAutoParts([]);
          }
        }
      } catch (error) {
        console.error('❌ Error loading auto parts:', error);
        if (isMounted) setAutoParts([]);
      } finally {
        if (isMounted) setIsLoadingParts(false);
      }
    };
    if (id && !isLoading) {
      loadAutoParts();
    }
    return () => { isMounted = false; };
  }, [id, isLoading]);

  const v = vehicle || {};
  const title = (v.vehicleName as string) || [v.year, v.make, v.model].filter(Boolean).join(' ') || v.model || 'Vehicle Details';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#15803D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#15803D" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Vehicle Image */}
          <View style={styles.imageWrapper}>
            <Image 
              source={{ uri: v.image || 'https://via.placeholder.com/360x200/EEEEEE/999?text=Vehicle' }} 
              style={styles.image} 
            />
          </View>

          {/* Vehicle Info Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color="#15803D" />
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <Info label="Model" value={v.model || '-'} />
            <Info label="Year" value={(v.year ?? '').toString()} />
            <Info label="VIN" value={v.VIN || v.vin || '-'} />
            <Info label="Mileage" value={(v.mileage ?? '-').toString()} />
            <Info label="Price" value={formatCurrency(v.price)} />
            <Info label="Owner" value={v.customerId?.customerName || '-'} />
            <Info label="Address" value={v.customerId?.address || '-'} fullWidth />
          </View>

          {/* Auto Parts Section */}
          <View style={[styles.sectionHeader, { marginTop: 32 }]}>
            <Ionicons name="construct" size={24} color="#15803D" />
            <Text style={styles.sectionTitle}>Installed Auto Parts</Text>
            {autoParts.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{autoParts.length}</Text>
              </View>
            )}
          </View>

          {isLoadingParts ? (
            <View style={styles.loadingParts}>
              <ActivityIndicator color="#15803D" />
              <Text style={styles.loadingText}>Loading auto parts...</Text>
            </View>
          ) : autoParts.length > 0 ? (
            <View style={styles.partsContainer}>
              {autoParts.map((part, index) => (
                <View key={part._id} style={styles.partCard}>
                  {/* Header */}
                  <View style={styles.partHeader}>
                    <View style={styles.partIconBox}>
                      <Ionicons 
                        name={
                          part.autopart_id.category === 'BATTERY' ? 'battery-charging' :
                          part.autopart_id.category === 'ELECTRICAL' ? 'flash' :
                          part.autopart_id.category === 'TIRE' ? 'disc' :
                          'settings'
                        } 
                        size={24} 
                        color="#15803D" 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partName} numberOfLines={2}>
                        {part.autopart_id.name}
                      </Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{part.autopart_id.category}</Text>
                      </View>
                    </View>
                    {part.isWarranty && (
                      <View style={styles.warrantyBadge}>
                        <Ionicons name="shield-checkmark" size={16} color="#059669" />
                        <Text style={styles.warrantyText}>Warranty</Text>
                      </View>
                    )}
                  </View>

                  {/* Details Grid */}
                  <View style={styles.partDetailsGrid}>
                    <View style={styles.partDetailItem}>
                      <Text style={styles.partDetailLabel}>Price</Text>
                      <Text style={styles.partDetailValue}>
                        {formatCurrency(part.autopart_id.selling_price)}
                      </Text>
                    </View>
                    <View style={styles.partDetailItem}>
                      <Text style={styles.partDetailLabel}>Quantity</Text>
                      <Text style={styles.partDetailValue}>{part.quantity}</Text>
                    </View>
                    <View style={styles.partDetailItem}>
                      <Text style={styles.partDetailLabel}>Warranty</Text>
                      <Text style={styles.partDetailValue}>
                        {Math.floor(part.autopart_id.warranty_time / 365)} years
                      </Text>
                    </View>
                  </View>

                  {/* Serial Number - Shortened */}
                  <View style={styles.serialContainer}>
                    <Ionicons name="barcode-outline" size={16} color="#6B7280" />
                    <Text style={styles.serialLabel}>SN:</Text>
                    <Text style={styles.serialText} numberOfLines={1}>
                      {part.serial_number.slice(0, 20)}...{part.serial_number.slice(-8)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyParts}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyPartsText}>No auto parts installed</Text>
            </View>
          )}

        </ScrollView>
      )}
      {!isLoading && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              const vehicleId = (id || v?._id || v?.id || '').toString();
              router.push({ pathname: '/book-appointment', params: { vehicleId } });
            }}
          >
            <Text style={styles.bookText}>Book Service</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Info({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <View style={[styles.infoItem, fullWidth && styles.infoItemFull]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function formatCurrency(n: any) {
  if (typeof n !== 'number') return '-';
  try {
    return Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
  } catch {
    return n.toString();
  }
}

function formatDate(s?: string) {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: -0.5,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  imageWrapper: {
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderRadius: 20,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItemFull: {
    width: '100%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  bookButton: {
    backgroundColor: '#15803D',
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bookText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: '#15803D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingParts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  partsContainer: {
    gap: 16,
  },
  partCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  partHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  partIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  warrantyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  warrantyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  partDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  partDetailItem: {
    flex: 1,
    minWidth: 90,
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  partDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  partDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  serialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginTop: 8,
  },
  serialLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  serialText: {
    flex: 1,
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  emptyParts: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyPartsText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});


