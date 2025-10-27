import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listCenters, createAppointment } from '@/apis/appointments.api';
import { useAxios } from '@/hooks/useAxios';

interface CenterItem { _id: string; name?: string; address?: string }

export default function BookAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = useMemo(() => (params?.vehicleId as string) || '', [params]);
  const api = useAxios();

  const [centers, setCenters] = useState<CenterItem[]>([]);
  const [centerId, setCenterId] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await listCenters();
        const payload: any = res?.data ?? res;
        const arr: any[] = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.centers) ? payload.centers : []));
        const normalized: CenterItem[] = arr.map((c: any) => ({ _id: c._id || c.id, name: c.name || c.centerName || 'Center', address: c.address }));
        setCenters(normalized);
        if (normalized.length) setCenterId(normalized[0]._id);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async () => {
    if (!centerId || !vehicleId || !startTime || !endTime) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn trung tâm và thời gian');
      return;
    }
    // Validate start < end
    try {
      const s = new Date(startTime).getTime();
      const e = new Date(endTime).getTime();
      if (!(e > s)) {
        Alert.alert('Thời gian không hợp lệ', 'Giờ kết thúc phải sau giờ bắt đầu');
        return;
      }
    } catch {}
    try {
      setSaving(true);
      // Resolve customer_id from profile
      const profile = await api.get('/auth/profile');
      const data: any = profile.data || {};
      const customerId = (data._id || data.data?._id) as string;
      const body = {
        customer_id: customerId,
        vehicle_id: vehicleId,
        center_id: centerId,
        startTime,
        endTime,
      };
      const res = await createAppointment(body);
      if (res?.success !== false) {
        Alert.alert('Thành công', 'Đặt lịch hẹn thành công');
        router.back();
      } else {
        Alert.alert('Thất bại', res?.message || 'Không thể đặt lịch');
      }
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
          <Text style={styles.label}>Chọn trung tâm</Text>
          <View style={styles.pillRow}>
            {centers.map((c) => (
              <TouchableOpacity key={c._id} style={[styles.pill, centerId === c._id && styles.pillActive]} onPress={() => setCenterId(c._id)}>
                <Text style={[styles.pillText, centerId === c._id && styles.pillTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Chọn ngày & giờ</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={styles.segment} onPress={() => setShowPicker('date')}>
              <Text style={styles.segmentTitle}>Date</Text>
              <Text style={styles.segmentValue}>{startTime ? new Date(startTime).toDateString() : 'Chọn ngày'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.segment} onPress={() => setShowPicker('time')}>
              <Text style={styles.segmentTitle}>Time</Text>
              <Text style={styles.segmentValue}>{startTime ? new Date(startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : 'Chọn giờ'}</Text>
            </TouchableOpacity>
          </View>

          <Modal transparent visible={!!showPicker} animationType="fade" onRequestClose={() => setShowPicker(null)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalTabs}>
                  <TouchableOpacity onPress={() => setShowPicker('date')} style={[styles.tabBtn, showPicker==='date' && styles.tabActive]}><Text style={[styles.tabText, showPicker==='date' && styles.tabTextActive]}>Date</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowPicker('time')} style={[styles.tabBtn, showPicker==='time' && styles.tabActive]}><Text style={[styles.tabText, showPicker==='time' && styles.tabTextActive]}>Time</Text></TouchableOpacity>
                  <Pressable onPress={() => setShowPicker(null)} style={{marginLeft:'auto'}}><Ionicons name="close" size={20} color="#111" /></Pressable>
                </View>
                {showPicker === 'date' ? (
                  <DateGrid onSelect={(d) => { const base = startTime? new Date(startTime): new Date(); base.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); const end=new Date(base.getTime()+2*60*60*1000); setStartTime(base.toISOString()); setEndTime(end.toISOString()); }} />
                ) : (
                  <TimeGrid onSelect={(h,m) => { const base = startTime? new Date(startTime): new Date(); base.setHours(h,m,0,0); const end=new Date(base.getTime()+2*60*60*1000); setStartTime(base.toISOString()); setEndTime(end.toISOString()); }} />
                )}
                <TouchableOpacity style={styles.checkoutBtn} onPress={() => setShowPicker(null)}>
                  <Text style={styles.checkoutText}>Xong</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Xác nhận đặt lịch</Text>}
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

function TimeGrid({ onSelect }: { onSelect: (h: number, m: number) => void }) {
  const slots = Array.from({ length: 12 }, (_, i) => 8 + i); // 8h -> 19h
  return (
    <View>
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Chọn giờ</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {slots.map((h) => (
          <TouchableOpacity key={h} style={{ width: '25%', padding: 6 }} onPress={() => onSelect(h, 0)}>
            <View style={{ paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' }}>
              <Text>{`${h.toString().padStart(2, '0')}:00`}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}


