import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApiService } from '@/hooks/useApiService';

export default function VehicleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useApiService();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [vehicle, setVehicle] = useState<any | null>(null);

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

  const v = vehicle || {};
  const title = (v.vehicleName as string) || [v.year, v.make, v.model].filter(Boolean).join(' ') || v.model || 'Vehicle Details';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageTitleWrap}>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color="#4A90E2" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: v.image || 'https://via.placeholder.com/360x200/EEEEEE/999?text=Vehicle' }} style={styles.image} />
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 30,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  content: {
    padding: 20,
    paddingBottom: 240,
  },
  imageWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#EEE',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoItemFull: {
    width: '100%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#101828',
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#4A90E2',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 64,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


