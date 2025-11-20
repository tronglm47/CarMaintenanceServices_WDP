import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAxios } from '@/hooks/useAxios';
import { useApiService } from '@/hooks/useApiService';
import { toast } from 'sonner-native';

interface CenterItem { _id: string; name?: string; address?: string; image?: string }

export default function BookAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = useMemo(() => (params?.vehicleId as string) || '', [params]);
  const api = useAxios();
  const apiService = useApiService();

  const [centers, setCenters] = useState<CenterItem[]>([]);
  const [centerId, setCenterId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [slots, setSlots] = useState<any[]>([]);
  const [slotId, setSlotId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState<'date' | 'slot' | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiService.centers.getAll();
        const payload: any = (res as any)?.data ?? res;
        const arr: any[] = Array.isArray(payload?.centers) ? payload.centers : (Array.isArray(payload) ? payload : []);
        const normalized: CenterItem[] = arr.map((c: any) => ({ _id: c._id || c.id, name: c.name || c.centerName || 'Center', address: c.address, image: c.image }));
        setCenters(normalized);
        if (normalized.length) setCenterId(normalized[0]._id);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // fetch slots when date or center change
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !centerId) return;
      try {
        const res = await apiService.slots.getAll({ date: selectedDate, center_id: centerId });
        const payload: any = (res as any)?.data ?? res;
        const list: any[] = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.slots) ? payload.slots : (Array.isArray(payload) ? payload : []));
        setSlots(list);
      } catch {}
    };
    fetchSlots();
  }, [selectedDate, centerId]);

  const handleSubmit = async () => {
    if (!centerId || !vehicleId || !slotId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn trung tâm, ngày và slot');
      return;
    }
    try {
      setSaving(true);
      // Resolve customer_id from profile (customer document _id)
      const profile = await api.get('/auth/profile');
      const raw: any = profile || {};
      const payload = raw?.data ?? raw;
      const customerId: string | undefined =
        (typeof payload?._id === 'string' ? payload._id : undefined) ||
        payload?.customer_id ||
        payload?.customerId ||
        payload?.customer?._id;
      if (!customerId) {
        Alert.alert('Thiếu thông tin', 'Không xác định được customer_id'); 
        return;
      }
      const body = { customer_id: customerId, vehicle_id: vehicleId, center_id: centerId, slot_id: slotId };
      const res = await apiService.raw.post('/appointments', body);
      if (res?.success === false) throw new Error(res?.message || 'Không thể đặt lịch');
      
      // Show success toast
      toast.success('Booking placed successfully!');
      
      router.replace('/booking-success');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể đặt lịch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sheetHeader}>
        <Text style={styles.title}>Book Service</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.label}>Select center</Text>
          <View style={styles.centerList}>
            {centers.map((c) => (
              <TouchableOpacity key={c._id} style={[styles.centerItem, centerId === c._id && styles.centerItemActive]} onPress={() => setCenterId(c._id)}>
                <Image source={{ uri: c.image || 'https://via.placeholder.com/48x48?text=C' }} style={styles.centerImage} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.centerName, centerId === c._id && { color: '#fff' }]} numberOfLines={1}>{c.name}</Text>
                  {!!c.address && <Text style={[styles.centerAddr, centerId === c._id && { color: '#E5E7EB' }]} numberOfLines={1}>{c.address}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Select date & time</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={styles.segment} onPress={() => setShowPicker('date')}>
              <Text style={styles.segmentTitle}>Date</Text>
              <Text style={styles.segmentValue}>{selectedDate || 'Select date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.segment} onPress={() => setShowPicker('slot')}>
              <Text style={styles.segmentTitle}>Slot</Text>
              <Text style={styles.segmentValue}>{slotId ? (slots.find(s => (s._id || s.id) === slotId)?.start_time + ' - ' + (slots.find(s => (s._id || s.id) === slotId)?.end_time || '')) : 'Select slot'}</Text>
            </TouchableOpacity>
          </View>

          <Modal transparent visible={!!showPicker} animationType="fade" onRequestClose={() => setShowPicker(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalTabs}>
                  <TouchableOpacity onPress={() => setShowPicker('date')} style={[styles.tabBtn, showPicker==='date' && styles.tabActive]}><Text style={[styles.tabText, showPicker==='date' && styles.tabTextActive]}>Date</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowPicker('slot')} style={[styles.tabBtn, showPicker==='slot' && styles.tabActive]}><Text style={[styles.tabText, showPicker==='slot' && styles.tabTextActive]}>Slot</Text></TouchableOpacity>
                  <Pressable onPress={() => setShowPicker(null)} style={{marginLeft:'auto'}}><Ionicons name="close" size={20} color="#111" /></Pressable>
                </View>
                {showPicker === 'date' ? (
                  <DateGrid onSelect={(d) => { const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; setSelectedDate(iso); setShowPicker('slot'); }} />
                ) : (
                  <SlotGrid slots={slots} selectedId={slotId} onSelect={(id) => setSlotId(id)} />
                )}
                <TouchableOpacity style={styles.checkoutBtn} onPress={() => setShowPicker(null)}>
                  <Text style={styles.checkoutText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Book Now</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  sheetHeader: { paddingTop: 12, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16 },
  label: { fontSize: 14, color: '#374151', marginTop: 12, marginBottom: 6 },
  timeRow: { flexDirection: 'row', gap: 12 },
  segment: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  segmentTitle: { color: '#6B7280', fontSize: 12 },
  segmentValue: { color: '#111827', fontSize: 14, fontWeight: '600', marginTop: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  pillText: { color: '#111827' },
  pillTextActive: { color: '#fff' },
  centerList: { gap: 8 },
  centerItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 10, gap: 10 },
  centerItemActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  centerImage: { width: 48, height: 48, borderRadius: 8 },
  centerName: { color: '#111827', fontWeight: '700' },
  centerAddr: { color: '#6B7280', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  submitBtn: { backgroundColor: '#1E3A8A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalTabs: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#EF4444' },
  tabText: { color: '#111827', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  checkoutBtn: { backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  checkoutText: { color: '#fff', fontWeight: '700' },
});

// Simple date grid (current month)
function DateGrid({ onSelect }: { onSelect: (d: Date) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1); d.setHours(0,0,0,0);
    return d;
  });
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(startWeekday).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
  );
  while (days.length % 7 !== 0) days.push(null);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month - 1, 1))}>
          <Ionicons name="chevron-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month + 1, 1))}>
          <Ionicons name="chevron-forward" size={20} color="#111" />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((d, idx) => {
          const disabled = !d || d < todayStart;
          return (
            <TouchableOpacity key={idx} style={{ width: '14.28%', padding: 6, alignItems: 'center' }} disabled={disabled} onPress={() => d && onSelect(d)}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? 'transparent' : '#F3F4F6' }}>
                <Text style={{ color: disabled ? '#9CA3AF' : '#111827' }}>{d ? d.getDate() : ''}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SlotGrid({ slots, selectedId, onSelect }: { slots: any[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <View>
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Chọn slot</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {slots.map((s: any) => {
          const id = s._id || s.id;
          const label = `${s.start_time || ''} - ${s.end_time || ''}`.trim();
          const isFull = typeof s.capacity === 'number' && typeof s.booked_count === 'number' && s.booked_count >= s.capacity;
          const statusStr = String(s.status || '').toLowerCase();
          const isInactive = (!!statusStr) && statusStr !== 'active';
          const disabled = isFull || isInactive;
          const selected = selectedId === id;
          return (
            <TouchableOpacity key={id} style={{ width: '33.33%', padding: 6 }} onPress={() => !disabled && onSelect(id)} disabled={disabled}>
              <View style={{ paddingVertical: 10, borderRadius: 12, backgroundColor: selected ? '#EF4444' : (disabled ? '#E5E7EB' : '#F3F4F6'), alignItems: 'center' }}>
                <Text style={{ color: selected ? '#fff' : (disabled ? '#9CA3AF' : '#111') }}>{label || '-'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {(!slots || slots.length === 0) && <Text style={{ color: '#6B7280' }}>Vui lòng chọn ngày và trung tâm để xem slot</Text>}
      </View>
    </View>
  );
}


