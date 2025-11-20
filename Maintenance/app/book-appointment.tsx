import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Pressable, Image, ScrollView } from 'react-native';
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
      Alert.alert('Missing Information', 'Please select center, date and time slot');
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
        Alert.alert('Missing Information', 'Unable to determine customer ID'); 
        return;
      }
      const body = { customer_id: customerId, vehicle_id: vehicleId, center_id: centerId, slot_id: slotId };
      const res = await apiService.raw.post('/appointments', body);
      if (res?.success === false) throw new Error(res?.message || 'Unable to book appointment');
      
      // Show success toast
      toast.success('Booking placed successfully!');
      
      router.replace('/booking-success');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to book appointment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.sheetHeader}>
        <Text style={styles.title}>Book Service</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15803D" />
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={20} color="#15803D" />
              <Text style={styles.label}>Select Center</Text>
            </View>
            <View style={styles.centerList}>
              {centers.map((c) => (
                <TouchableOpacity 
                  key={c._id} 
                  style={[styles.centerItem, centerId === c._id && styles.centerItemActive]} 
                  onPress={() => setCenterId(c._id)}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: c.image || 'https://via.placeholder.com/48x48?text=C' }} 
                    style={styles.centerImage} 
                  />
                  <View style={styles.centerInfo}>
                    <Text style={[styles.centerName, centerId === c._id && styles.centerNameActive]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {!!c.address && (
                      <View style={styles.addressRow}>
                        <Ionicons 
                          name="location-outline" 
                          size={14} 
                          color={centerId === c._id ? '#DCFCE7' : '#6B7280'} 
                        />
                        <Text style={[styles.centerAddr, centerId === c._id && styles.centerAddrActive]} numberOfLines={1}>
                          {c.address}
                        </Text>
                      </View>
                    )}
                  </View>
                  {centerId === c._id && (
                    <View style={styles.checkIcon}>
                      <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color="#15803D" />
              <Text style={styles.label}>Select Date & Time</Text>
            </View>
            <View style={styles.timeRow}>
              <TouchableOpacity 
                style={[styles.segment, !selectedDate && styles.segmentEmpty]} 
                onPress={() => setShowPicker('date')}
                activeOpacity={0.7}
              >
                <View style={styles.segmentIconContainer}>
                  <Ionicons name="calendar" size={20} color={selectedDate ? "#15803D" : "#9CA3AF"} />
                </View>
                <Text style={styles.segmentTitle}>Date</Text>
                <Text style={[styles.segmentValue, !selectedDate && styles.segmentValuePlaceholder]}>
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segment, !slotId && styles.segmentEmpty]} 
                onPress={() => setShowPicker('slot')}
                activeOpacity={0.7}
                disabled={!selectedDate}
              >
                <View style={styles.segmentIconContainer}>
                  <Ionicons name="time-outline" size={20} color={slotId ? "#15803D" : "#9CA3AF"} />
                </View>
                <Text style={styles.segmentTitle}>Time Slot</Text>
                <Text style={[styles.segmentValue, !slotId && styles.segmentValuePlaceholder]}>
                  {slotId ? (slots.find(s => (s._id || s.id) === slotId)?.start_time + ' - ' + (slots.find(s => (s._id || s.id) === slotId)?.end_time || '')) : 'Select slot'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Modal transparent visible={!!showPicker} animationType="slide" onRequestClose={() => setShowPicker(null)}>
            <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(null)}>
              <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {showPicker === 'date' ? 'Select Date' : 'Select Time Slot'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowPicker(null)} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={28} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalTabs}>
                  <TouchableOpacity 
                    onPress={() => setShowPicker('date')} 
                    style={[styles.tabBtn, showPicker==='date' && styles.tabActive]}
                  >
                    <Ionicons name="calendar" size={16} color={showPicker==='date' ? '#fff' : '#6B7280'} />
                    <Text style={[styles.tabText, showPicker==='date' && styles.tabTextActive]}>Date</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setShowPicker('slot')} 
                    style={[styles.tabBtn, showPicker==='slot' && styles.tabActive]}
                  >
                    <Ionicons name="time" size={16} color={showPicker==='slot' ? '#fff' : '#6B7280'} />
                    <Text style={[styles.tabText, showPicker==='slot' && styles.tabTextActive]}>Slot</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.modalContent}>
                  {showPicker === 'date' ? (
                    <DateGrid onSelect={(d) => { const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; setSelectedDate(iso); setShowPicker('slot'); }} />
                  ) : (
                    <SlotGrid slots={slots} selectedId={slotId} onSelect={(id) => setSlotId(id)} />
                  )}
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={() => setShowPicker(null)}>
                  <Text style={styles.checkoutText}>Done</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        </ScrollView>
      )}

      {!loading && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, (!centerId || !vehicleId || !slotId || saving) && styles.submitBtnDisabled]} 
            onPress={handleSubmit} 
            disabled={!centerId || !vehicleId || !slotId || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitText}>Book Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0FDF4' 
  },
  sheetHeader: { 
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#15803D' 
  },
  scrollView: {
    flex: 1,
  },
  content: { 
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#15803D',
    marginLeft: 4,
  },
  timeRow: { 
    flexDirection: 'row', 
    gap: 12 
  },
  segment: { 
    flex: 1, 
    borderWidth: 2, 
    borderColor: '#DCFCE7', 
    borderRadius: 16, 
    padding: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentEmpty: {
    borderColor: '#E5E7EB',
  },
  segmentIconContainer: {
    marginBottom: 8,
  },
  segmentTitle: { 
    color: '#6B7280', 
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  segmentValue: { 
    color: '#111827', 
    fontSize: 15, 
    fontWeight: '600',
    marginTop: 4,
  },
  segmentValuePlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  centerList: { 
    gap: 12 
  },
  centerItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#DCFCE7', 
    borderRadius: 16, 
    padding: 14, 
    gap: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  centerItemActive: { 
    backgroundColor: '#15803D', 
    borderColor: '#15803D',
    shadowColor: '#15803D',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  centerImage: { 
    width: 56, 
    height: 56, 
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  centerInfo: {
    flex: 1,
  },
  centerName: { 
    color: '#111827', 
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  centerNameActive: {
    color: '#fff',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  centerAddr: { 
    color: '#6B7280', 
    fontSize: 13,
    flex: 1,
  },
  centerAddrActive: {
    color: '#DCFCE7',
  },
  checkIcon: {
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  submitBtn: { 
    backgroundColor: '#15803D', 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalCard: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803D',
  },
  closeButton: {
    padding: 4,
  },
  modalTabs: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 8,
  },
  tabActive: { 
    backgroundColor: '#15803D',
  },
  tabText: { 
    color: '#6B7280', 
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: { 
    color: '#fff' 
  },
  modalContent: {
    minHeight: 200,
    maxHeight: 400,
  },
  checkoutBtn: { 
    backgroundColor: '#15803D', 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 16,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16,
  },
});

// Simple date grid (current month)
function DateGrid({ onSelect }: { onSelect: (d: Date) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1); d.setHours(0,0,0,0);
    return d;
  });
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(startWeekday).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
  );
  while (days.length % 7 !== 0) days.push(null);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDateSelect = (d: Date) => {
    setSelectedDay(d);
    onSelect(d);
  };

  return (
    <View>
      <View style={dateGridStyles.header}>
        <TouchableOpacity 
          onPress={() => setCursor(new Date(year, month - 1, 1))}
          style={dateGridStyles.navButton}
        >
          <Ionicons name="chevron-back" size={24} color="#15803D" />
        </TouchableOpacity>
        <Text style={dateGridStyles.monthText}>
          {cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity 
          onPress={() => setCursor(new Date(year, month + 1, 1))}
          style={dateGridStyles.navButton}
        >
          <Ionicons name="chevron-forward" size={24} color="#15803D" />
        </TouchableOpacity>
      </View>
      <View style={dateGridStyles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={dateGridStyles.weekDay}>
            <Text style={dateGridStyles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>
      <View style={dateGridStyles.daysGrid}>
        {days.map((d, idx) => {
          const disabled = !d || d < todayStart;
          const isSelected = selectedDay && d && selectedDay.getTime() === d.getTime();
          const isToday = d && d.getTime() === todayStart.getTime();
          return (
            <TouchableOpacity 
              key={idx} 
              style={dateGridStyles.dayCell} 
              disabled={disabled} 
              onPress={() => d && handleDateSelect(d)}
              activeOpacity={0.7}
            >
              <View style={[
                dateGridStyles.dayButton,
                isSelected && dateGridStyles.dayButtonSelected,
                isToday && !isSelected && dateGridStyles.dayButtonToday,
                disabled && dateGridStyles.dayButtonDisabled
              ]}>
                <Text style={[
                  dateGridStyles.dayText,
                  isSelected && dateGridStyles.dayTextSelected,
                  disabled && dateGridStyles.dayTextDisabled
                ]}>
                  {d ? d.getDate() : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const dateGridStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontWeight: '700',
    fontSize: 18,
    color: '#15803D',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    padding: 4,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  dayButtonSelected: {
    backgroundColor: '#15803D',
  },
  dayButtonToday: {
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#15803D',
  },
  dayButtonDisabled: {
    backgroundColor: 'transparent',
  },
  dayText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#D1D5DB',
  },
});

function SlotGrid({ slots, selectedId, onSelect }: { slots: any[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <View>
      <Text style={slotGridStyles.title}>Available Time Slots</Text>
      {(!slots || slots.length === 0) ? (
        <View style={slotGridStyles.emptyContainer}>
          <Ionicons name="time-outline" size={48} color="#9CA3AF" />
          <Text style={slotGridStyles.emptyText}>Please select a date and center to view available slots</Text>
        </View>
      ) : (
        <View style={slotGridStyles.slotsContainer}>
          {slots.map((s: any) => {
            const id = s._id || s.id;
            const label = `${s.start_time || ''} - ${s.end_time || ''}`.trim();
            const isFull = typeof s.capacity === 'number' && typeof s.booked_count === 'number' && s.booked_count >= s.capacity;
            const statusStr = String(s.status || '').toLowerCase();
            const isInactive = (!!statusStr) && statusStr !== 'active';
            const disabled = isFull || isInactive;
            const selected = selectedId === id;
            return (
              <TouchableOpacity 
                key={id} 
                style={slotGridStyles.slotItem} 
                onPress={() => !disabled && onSelect(id)} 
                disabled={disabled}
                activeOpacity={0.7}
              >
                <View style={[
                  slotGridStyles.slotButton,
                  selected && slotGridStyles.slotButtonSelected,
                  disabled && slotGridStyles.slotButtonDisabled
                ]}>
                  <Ionicons 
                    name={selected ? "checkmark-circle" : "time-outline"} 
                    size={16} 
                    color={selected ? '#fff' : (disabled ? '#9CA3AF' : '#15803D')} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[
                    slotGridStyles.slotText,
                    selected && slotGridStyles.slotTextSelected,
                    disabled && slotGridStyles.slotTextDisabled
                  ]}>
                    {label || '-'}
                  </Text>
                </View>
                {isFull && (
                  <Text style={slotGridStyles.fullLabel}>Full</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const slotGridStyles = StyleSheet.create({
  title: {
    fontWeight: '700',
    fontSize: 16,
    color: '#15803D',
    marginBottom: 16,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotItem: {
    width: '31%',
    position: 'relative',
  },
  slotButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotButtonSelected: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  slotButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  slotText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  slotTextSelected: {
    color: '#fff',
  },
  slotTextDisabled: {
    color: '#9CA3AF',
  },
  fullLabel: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
});


