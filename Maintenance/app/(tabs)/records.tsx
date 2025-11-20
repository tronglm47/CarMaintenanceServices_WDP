import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApiService } from '@/hooks/useApiService';
import { router } from 'expo-router';

export default function RecordsScreen() {
  const api = useApiService();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
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
          const centerName = a.center?.name || a.centerName || a.center_id?.name || 'Service Center';
          const vehicleName = a.vehicle?.model || a.vehicle?.name || a.vehicle_id?.model || a.vehicle_id?.name || a.vehicle_plate || a.licensePlate || '';
          // derive date and time (prefer slot fields, fall back to nested slot object)
          const slotObj = a.slot || a.slot_id || {};
          const slotDate = a.slot_date || slotObj.slot_date || a.date || slotObj.date || a.createdAt;
          const dateStr = slotDate ? new Date(slotDate).toISOString().slice(0, 10) : '';
          const startStr = a.start_time || a.startTime || slotObj.start_time || slotObj.startTime || a.start || slotObj.start || '';
          const endStr = a.end_time || a.endTime || slotObj.end_time || slotObj.endTime || a.end || slotObj.end || '';
          const timeRange = startStr && endStr ? `${startStr} - ${endStr}` : (startStr || '');
          const status = a.status || 'scheduled';
          return { id, centerName, vehicleName, dateStr, timeRange, status };
        });
        if (alive) setRecords(normalized);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Records</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No records</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {records.map((record) => (
            <TouchableOpacity
              key={record.id}
              style={styles.recordItem}
              onPress={() => router.push({ pathname: '/record-details', params: { appointmentId: String(record.id) } })}
            >
              <View style={styles.recordLeft}>
                <View style={styles.serviceIcon}>
                  <Ionicons name="calendar" size={20} color="#4A90E2" />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.serviceName}>{record.centerName}</Text>
                  {!!record.vehicleName && <Text style={styles.vehicleName}>{record.vehicleName}</Text>}
                  <Text style={styles.serviceDate}>
                    {record.dateStr} {record.timeRange ? `• ${record.timeRange}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.recordRight}>
                <View style={[styles.statusContainer, record.status === 'cancelled' ? { backgroundColor: '#FEE2E2' } : record.status === 'completed' ? { backgroundColor: '#E8F5E8' } : {}]}>
                  <Text style={[styles.status, record.status === 'cancelled' ? { color: '#DC2626' } : record.status === 'completed' ? { color: '#4CAF50' } : { color: '#1E3A8A' }]}>
                    {String(record.status).toUpperCase()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '500',
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
  vehicleName: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 2,
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
