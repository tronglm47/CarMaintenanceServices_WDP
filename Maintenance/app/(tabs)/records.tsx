import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApiService } from '@/hooks/useApiService';
import { router } from 'expo-router';
import { toast } from 'sonner-native';

export default function RecordsScreen() {
  const api = useApiService();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRecords = async (isMounted: boolean = true) => {
    try {
      // Resolve customer_id from profile as per backend structure
      const profile = await api.auth.getProfile();
      const raw = (profile as any) || {};
      const payload = raw?.data ?? raw;
      const custId: string | undefined =
        (typeof payload?._id === 'string' ? payload._id : undefined) ||
        payload?.customer_id ||
        payload?.customerId ||
        payload?.customer?._id;
      const customerId = custId;
      if (!customerId) {
        setRecords([]);
        return;
      }
      const res = await api.appointments.getAll({ customer_id: customerId });
      const data: any = (res as any)?.data ?? res;
      const list: any[] = Array.isArray(data?.appointments)
        ? data.appointments
        : Array.isArray(data)
        ? data
        : [];
      const normalized = list.map((a: any) => {
        const id = a._id || a.id;
        const center = a.center || a.center_id || {};
        const centerName = center?.name || a.centerName || 'Service Center';
        const centerImage = center?.image || center?.image_url || null;
        const centerAddress = center?.address || '';
        const vehicleName = a.vehicle?.model || a.vehicle?.name || a.vehicle_id?.model || a.vehicle_id?.name || a.vehicle_plate || a.licensePlate || '';
        // derive date and time (prefer slot fields, fall back to nested slot object)
        const slotObj = a.slot || a.slot_id || {};
        const slotDate = a.slot_date || slotObj.slot_date || a.date || slotObj.date || a.createdAt;
        const dateStr = slotDate ? new Date(slotDate).toISOString().slice(0, 10) : '';
        const startStr = a.start_time || a.startTime || slotObj.start_time || slotObj.startTime || a.start || slotObj.start || '';
        const endStr = a.end_time || a.endTime || slotObj.end_time || slotObj.endTime || a.end || slotObj.end || '';
        const timeRange = startStr && endStr ? `${startStr} - ${endStr}` : (startStr || '');
        const status = a.status || 'scheduled';
        return { id, centerName, centerImage, centerAddress, vehicleName, dateStr, timeRange, status };
      });
      if (isMounted) setRecords(normalized);
    } catch (error) {
      console.error('Error loading records:', error);
    }
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        await loadRecords(alive);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadRecords(true);
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : records.length === 0 ? (
        <>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Service Records</Text>
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
          <View style={styles.centerContainer}>
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No service records yet</Text>
              <Text style={styles.emptySubtext}>Your service history will appear here</Text>
            </View>
          </View>
        </>
      ) : (
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
              <Text style={styles.headerTitle}>Service Records</Text>
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
          {records.map((record) => {
            const statusColors = {
              completed: { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },
              'in-progress': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
              pending: { bg: '#FEF3C7', text: '#A16207', border: '#FDE68A' },
              cancelled: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
            };
            const statusKey = record.status?.toLowerCase() || 'pending';
            const statusColor = statusColors[statusKey as keyof typeof statusColors] || statusColors.pending;
            
            return (
            <TouchableOpacity
              key={record.id}
              style={styles.recordCard}
              onPress={() => router.push({ pathname: '/record-details', params: { appointmentId: String(record.id) } })}
              activeOpacity={0.7}
            >
              {/* Center Icon */}
              <View style={styles.imageContainer}>
                <View style={styles.placeholderImage}>
                  <Ionicons name="construct" size={32} color="#22C55E" />
                </View>
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                {/* Title and Status */}
                <View style={styles.cardHeader}>
                  <Text style={styles.centerName} numberOfLines={2}>
                    {record.centerName}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
                    <Text style={[styles.statusText, { color: statusColor.text }]}>
                      {String(record.status).toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Vehicle Tag */}
                {!!record.vehicleName && (
                  <View style={styles.vehicleTag}>
                    <Ionicons name="car-sport" size={12} color="#6B7280" />
                    <Text style={styles.vehicleText} numberOfLines={1}>
                      {record.vehicleName}
                    </Text>
                  </View>
                )}

                {/* Date & Time */}
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeItem}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.dateTimeText}>{record.dateStr}</Text>
                  </View>
                  {!!record.timeRange && (
                    <View style={styles.dateTimeItem}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={styles.dateTimeText}>{record.timeRange}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Arrow indicator */}
              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          )})}
          </View>
        </ScrollView>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#F0FDF4',
    position: 'relative',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: -0.5,
    textAlign: 'center',
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
    top: 20,
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageContainer: {
    width: 100,
    height: 120,
  },
  centerImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 8,
  },
  centerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 6,
  },
  vehicleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  vehicleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
  },
});
