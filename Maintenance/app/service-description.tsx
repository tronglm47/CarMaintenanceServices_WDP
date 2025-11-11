import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApiService } from '@/hooks/useApiService';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ServiceDescriptionScreen() {
  const { serviceId, serviceName, partId, partName, partPrice, image } = useLocalSearchParams();
  const apiService = useApiService();
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [needsParts, setNeedsParts] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [centers, setCenters] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'date' | 'slot'>('date');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [fetchedPart, setFetchedPart] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fallbackImage = require('../assets/images/react-logo.png');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoadingVehicles(true);
        const res = await apiService.vehicles.getMyVehicles();
        if (isMounted && res?.success) {
          const list = Array.isArray((res as any).data) ? (res as any).data : [];
          setVehicles(list);
        }
        const centersRes = await apiService.centers.getAll();
        const payload: any = (centersRes as any)?.data || {};
        const arr = Array.isArray(payload?.centers) ? payload.centers : (Array.isArray(payload) ? payload : []);
        setCenters(arr);
      } finally {
        if (isMounted) setIsLoadingVehicles(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !selectedCenter?._id) return;
      try {
        const res = await apiService.slots.getAll({ date: selectedDate, center_id: selectedCenter._id || selectedCenter.id });
        const payload: any = (res as any)?.data || {};
        const arr = Array.isArray(payload?.slots) ? payload.slots : (Array.isArray(payload) ? payload : []);
        setSlots(arr);
      } catch {}
    };
    fetchSlots();
  }, [selectedDate, selectedCenter]);

  const formatVnd = (value?: number | string) => {
    const n = typeof value === 'string' ? Number(value) : value;
    if (typeof n !== 'number' || Number.isNaN(n)) return '';
    try {
      return new Intl.NumberFormat('vi-VN').format(n);
    } catch {
      return String(n);
    }
  };

  useEffect(() => {
    let alive = true;
    const loadPart = async () => {
      if (!partId) return;
      try {
        console.log('📦 Fetching part with ID:', partId);
        const res = await apiService.autoParts.getById(String(partId));
        console.log('📦 API Response:', JSON.stringify(res, null, 2));
        const payload: any = (res as any)?.data ?? res;
        // Some APIs return { data: { ...part } } or the object directly
        const part = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
        console.log('📦 Extracted part:', JSON.stringify(part, null, 2));
        if (alive) {
          setFetchedPart(part);
          // DON'T set imageUri here - let the single useEffect below handle it
        }
      } catch (err) {
        console.log('📦 Error fetching part:', err);
      }
    };
    loadPart();
    return () => { alive = false; };
  }, [partId]);

  const serviceData = useMemo(() => {
    const priceRaw = partPrice != null && String(partPrice).trim() !== '' ? Number(partPrice as string) : (fetchedPart?.selling_price ?? fetchedPart?.price ?? 0);
    const nameRaw = (partName as string) || (serviceName as string) || fetchedPart?.name || 'Part';
    const imgRaw = (image as string) || fetchedPart?.image || 'https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Part';
    return {
      id: (partId as string) || (serviceId as string) || '1',
      name: nameRaw,
      price: priceRaw || 0,
      unit: 'Price',
      rating: 4.9,
      description: 'Newest part (2025) with improved reliability and performance.',
      image: imgRaw,
      location: '2972 Westheimer Rd. Santa Ana, Illinois 85488',
    };
  }, [partId, serviceId, partName, serviceName, partPrice, image, fetchedPart]);

  useEffect(() => {
    // Priority 1: image from fetchedPart (from API) - most reliable
    if (fetchedPart?.image && typeof fetchedPart.image === 'string' && fetchedPart.image.trim()) {
      const imgUrl = fetchedPart.image.trim();
      console.log('🖼️ Priority 1 - Using image from API:', imgUrl);
      setImageUri(imgUrl);
      setImageLoadError(false);
      return;
    }
    // Priority 2: image from navigation params (from Home screen)
    if (typeof image === 'string' && image.trim()) {
      const imgUrl = image.trim();
      console.log('🖼️ Priority 2 - Using image from Home params:', imgUrl);
      setImageUri(imgUrl);
      setImageLoadError(false);
      return;
    }
    // Priority 3: fallback - no image
    console.log('🖼️ Priority 3 - No valid image URL, using fallback');
    setImageUri(undefined);
  }, [image, fetchedPart]);

  const handleBookNow = () => {
    setShowDateTimeModal(true);
  };

  const handleCheckout = async () => {
    // Validate required fields: center, vehicle, slot
    if (!selectedCenter?._id) { Alert.alert('Missing center', 'Please select a service center'); return; }
    if (!selectedVehicle?._id && !selectedVehicle?.id) { Alert.alert('Missing vehicle', 'Please select a vehicle'); return; }
    if (!selectedSlotId) { Alert.alert('Missing slot', 'Please select a slot'); return; }
    try {
      setIsBooking(true);
      // Resolve customer_id from vehicle or profile
      let customerId: string | undefined =
        selectedVehicle?.customer_id ||
        selectedVehicle?.customer?._id ||
        selectedVehicle?.customer ||
        selectedVehicle?.ownerCustomerId;
      if (!customerId) {
        try {
          const profile = await apiService.auth.getProfile();
          const raw = (profile as any) || {};
          const payload = raw?.data ?? raw;
          const candidateSources = [payload, payload?.data, payload?.profile, payload?.user, payload?.currentUser];
          let userId: string | undefined;
          let directCustomerId: string | undefined;
          for (const src of candidateSources) {
            if (!src) continue;
            // try customer id directly
            const possCust =
              src.customer_id ||
              src.customerId ||
              (typeof src.customer === 'string' ? src.customer : undefined) ||
              src.customer?._id ||
              src.profile?.customer?._id ||
              // many backends return customer document with _id and userId nested object
              (src.userId && typeof src._id === 'string' ? src._id : undefined);
            if (!directCustomerId && typeof possCust === 'string') directCustomerId = possCust;
            // try user id to resolve later
            let val: any = undefined;
            if (typeof src.userId === 'string') {
              val = src.userId;
            } else if (src.userId && typeof src.userId === 'object' && typeof src.userId._id === 'string') {
              val = src.userId._id;
            } else if (typeof src.user?.id === 'string') {
              val = src.user.id;
            } else if (typeof src.user?._id === 'string') {
              val = src.user._id;
            }
            if (!userId && typeof val === 'string') { userId = val; }
          }
          if (directCustomerId) {
            customerId = directCustomerId;
          }
          if (userId) {
            const cust = await apiService.raw.get(`/customers/user/${userId}`);
            if (cust?.success) {
              const c = (cust.data as any) || {};
              if (typeof c._id === 'string') customerId = c._id;
            }
          }
        } catch {}
      }
      if (!customerId) {
        Alert.alert('Missing information', 'Unable to identify customer_id. Please check your profile.');
        return;
      }
      const body: any = {
        customer_id: customerId,
        vehicle_id: selectedVehicle?._id || selectedVehicle?.id,
        center_id: selectedCenter?._id || selectedCenter?.id,
        slot_id: selectedSlotId,
      };
      const res = await apiService.raw.post('/appointments', body);
      if (res?.success !== false) {
        setShowDateTimeModal(false);
        router.replace('/booking-success');
      } else {
        Alert.alert('Failed to create appointment', (res as any)?.message || 'Booking failed');
      }
    } catch (e: any) {
      Alert.alert('Failed to create appointment', e?.message || 'Booking failed');
    } finally { setIsBooking(false); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{serviceData.name}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Service Image */}
        <View style={styles.imageContainer}>
          {imageUri && !imageLoadError ? (
            <Image
              key={imageUri}
              source={{ uri: imageUri }}
              style={styles.serviceImage}
              resizeMode="cover"
              onLoad={() => {
                console.log('✅ Image loaded successfully');
              }}
              onError={(e) => {
                console.log('❌ Image load error:', e.nativeEvent?.error || 'Unknown error');
                console.log('❌ Failed URL:', imageUri);
                setImageLoadError(true);
              }}
            />
          ) : (
            <Image
              source={fallbackImage}
              style={styles.serviceImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.priceBadge}>
            <Text style={styles.priceUnit}>{serviceData.unit}</Text>
            <View style={styles.priceDivider} />
            <Text style={styles.priceAmount}>{formatVnd(serviceData.price)} VNĐ</Text>
          </View>
        </View>

        {/* Service Description */}
        <View style={styles.descriptionContainer}>
          <View style={styles.descriptionHeader}>
            <Text style={styles.descriptionTitle}>Parts Description</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{serviceData.rating}</Text>
            </View>
          </View>

          <Text style={styles.descriptionText}>{serviceData.description}</Text>

          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setNeedsParts(!needsParts)}
          >
            <View style={[styles.checkbox, needsParts && styles.checkboxChecked]}>
              {needsParts && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxText}>I need Parts for my Vehicle</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Vehicle Information */}
        <View style={styles.vehicleInfoContainer}>
          <Text style={styles.vehicleInfoTitle}>Emergency Vehicle information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666" />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCenterModal(true)}>
                <Text style={styles.infoText}>{selectedCenter?.name || 'Select service center'}</Text>
              </TouchableOpacity>
              <Ionicons name="settings" size={20} color="#666" />
            </View>
            
            <View style={styles.infoRow}>
              <Ionicons name="car" size={20} color="#666" />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVehicleModal(true)}>
                <Text style={styles.infoText}>{selectedVehicle?.model || selectedVehicle?.name || selectedVehicle?.licensePlate || 'Select my vehicle'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <TouchableOpacity
        style={[styles.bookButton, !(needsParts && (selectedCenter?._id || selectedCenter?.id) && (selectedVehicle?._id || selectedVehicle?.id)) && { opacity: 0.5 }]}
        disabled={!(needsParts && (selectedCenter?._id || selectedCenter?.id) && (selectedVehicle?._id || selectedVehicle?.id))}
        onPress={handleBookNow}
      >
        <Text style={styles.bookButtonText}>Book Now</Text>
      </TouchableOpacity>

      {/* Date & Time Modal */}
      <Modal
        visible={showDateTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDateTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Date & Slot</Text>
              <TouchableOpacity onPress={() => setShowDateTimeModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity onPress={() => setActiveTab('date')} style={[styles.tab, activeTab==='date' && styles.activeTab]}>
                <Text style={activeTab==='date' ? styles.activeTabText : styles.tabText}>Date</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('slot')} style={[styles.tab, activeTab==='slot' && styles.activeTab]}>
                <Text style={activeTab==='slot' ? styles.activeTabText : styles.tabText}>Slot</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'date' ? (
              <DateMonthGrid
                selectedDate={selectedDate}
                onSelect={(iso) => { setSelectedDate(iso); setActiveTab('slot'); }}
              />
            ) : (
              <View style={{ paddingVertical: 8 }}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>Select slot</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {slots.map((s: any) => {
                    const id = s._id || s.id;
                    const label = `${s.start_time || s.start || ''} - ${s.end_time || s.end || ''}`.trim();
                    const selected = selectedSlotId === id;
                    const isFull = typeof s.capacity === 'number' && typeof s.booked_count === 'number' && s.booked_count >= s.capacity;
                    const statusStr = String(s.status || '').toLowerCase();
                    const isInactive = (!!statusStr) && statusStr !== 'active';
                    const disabled = isFull || isInactive;
                    return (
                      <TouchableOpacity key={id} style={{ width: '33.33%', padding: 6 }} onPress={() => !disabled && setSelectedSlotId(id)} disabled={disabled}>
                        <View style={{ paddingVertical: 10, borderRadius: 12, backgroundColor: selected ? '#FF4444' : (disabled ? '#E5E7EB' : '#F3F4F6'), alignItems: 'center' }}>
                          <Text style={{ color: selected ? '#fff' : (disabled ? '#9CA3AF' : '#111') }}>{label || '-'}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {(!slots || slots.length === 0) && (
                    <Text style={{ color: '#666' }}>No slots. Please choose date and center.</Text>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout} disabled={isBooking}>
              {isBooking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkoutButtonText}>Book Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vehicle select modal */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {isLoadingVehicles ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text>Loading...</Text>
              </View>
            ) : (
              <ScrollView>
                {vehicles.map((v: any) => (
                  <TouchableOpacity
                    key={(v?._id || v?.id || v?.licensePlate || v?.vin || Math.random()).toString()}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
                    onPress={() => { setSelectedVehicle(v); setShowVehicleModal(false); }}
                  >
                    <Ionicons name="car" size={20} color="#1E3A8A" />
                    <Text style={{ marginLeft: 12, color: '#222', fontWeight: '600' }}>
                      {v?.model || v?.name || v?.licensePlate || 'My Vehicle'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {vehicles.length === 0 && (
                  <Text style={{ textAlign: 'center', color: '#666', paddingVertical: 16 }}>No vehicles</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Center select modal */}
      <Modal
        visible={showCenterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCenterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service Center</Text>
              <TouchableOpacity onPress={() => setShowCenterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {centers.map((c: any) => (
                <TouchableOpacity key={c._id || c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }} onPress={() => { setSelectedCenter(c); setShowCenterModal(false); }}>
                  <Image source={{ uri: c.image || 'https://via.placeholder.com/48x48?text=C' }} style={{ width: 48, height: 48, borderRadius: 8 }} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: '#111', fontWeight: '700' }}>{c.name}</Text>
                    <Text style={{ color: '#6B7280', fontSize: 12 }} numberOfLines={1}>{c.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {centers.length === 0 && <Text style={{ textAlign: 'center', color: '#666', paddingVertical: 16 }}>No centers</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Month-based date picker with month navigation and day grid
function DateMonthGrid({ selectedDate, onSelect }: { selectedDate?: string; onSelect: (iso: string) => void }) {
  const [cursor, setCursor] = useState(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m] = selectedDate.split('-').map((v) => Number(v));
      return new Date(y, (m - 1), 1);
    }
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth(); // 0-based
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startWeekday).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const toIso = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month - 1, 1))}>
          <Ionicons name="chevron-back" size={20} color="#999" />
        </TouchableOpacity>
        <Text style={styles.monthYear}>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month + 1, 1))}>
          <Ionicons name="chevron-forward" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarGrid}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
        {cells.map((d, idx) => {
          const iso = d ? toIso(year, month, d) : '';
          const isSelected = !!d && selectedDate === iso;
          return (
            <TouchableOpacity key={idx} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 6 }} disabled={!d} onPress={() => d && onSelect(iso)}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#FF4444' : '#F3F4F6' }}>
                <Text style={{ color: isSelected ? '#FFFFFF' : '#111' }}>{d ?? ''}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 24,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  serviceImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceUnit: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  priceDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
  },
  priceAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userCountText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
  },
  vehicleInfoContainer: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  vehicleInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  bookButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FF4444',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 8,
  },
  dayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
    paddingVertical: 12,
  },
  selectedDay: {
    backgroundColor: '#FF4444',
    color: '#FFFFFF',
    borderRadius: 20,
  },
  checkoutButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
