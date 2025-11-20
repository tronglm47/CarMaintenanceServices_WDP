import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useApiService } from '@/hooks/useApiService';

interface VehicleItem {
  _id?: string;
  id?: string;
  model?: string;
  name?: string;
  licensePlate?: string;
  plate?: string;
  image_url?: string;
}

interface SubscriptionItem {
  _id?: string;
  id?: string;
  package_id?: any;
  package?: any;
  start_date?: string;
  end_date?: string;
  status?: string;
}

interface WarrantyItem {
  warranty_id?: string;
  part_id?: string;
  part_name?: string;
  part_image?: string;
  start_date?: string;
  end_date?: string;
  days_remaining?: number;
  status?: string;
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const api = useApiService();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [items, setItems] = useState<Array<{ vehicle: VehicleItem; subscription: SubscriptionItem }>>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const [displayNameState, setDisplayNameState] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');

  const displayName = useMemo(() => {
    return (
      customerName || displayNameState || user?.displayName || user?.email || user?.phoneNumber || 'User'
    );
  }, [customerName, displayNameState, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const resVehicles = await api.vehicles.getMyVehicles();
      const list: VehicleItem[] = Array.isArray((resVehicles as any)?.data) ? (resVehicles as any).data : [];
      setVehicles(list);

      const all: Array<{ vehicle: VehicleItem; subscription: SubscriptionItem }> = [];
      for (const v of list) {
        const id = v._id || v.id;
        if (!id) continue;
        try {
          const subRes = await api.vehicleSubscriptions.getByVehicle(String(id));
          const subs: SubscriptionItem[] = Array.isArray((subRes as any)?.data) ? (subRes as any).data : [];
          subs.forEach((s) => all.push({ vehicle: v, subscription: s }));
        } catch { }
      }
      setItems(all);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  
  // Load warranties when customerId is available
  useEffect(() => {
    const loadWarranties = async () => {
      if (!customerId) {
        console.log('⚠️ No customerId available for warranties');
        return;
      }
      
      try {
        console.log('🔍 Loading warranties for customerId:', customerId);
        const warrantyRes = await api.raw.get(`/warranties/parts?customerId=${customerId}`);
        console.log('📦 Warranty response:', JSON.stringify(warrantyRes, null, 2));
        
        const payload: any = (warrantyRes as any)?.data || warrantyRes || {};
        console.log('📦 Payload:', payload);
        
        const warrantyList: WarrantyItem[] = Array.isArray(payload?.data) 
          ? payload.data 
          : Array.isArray(payload) 
          ? payload 
          : [];
        
        console.log('✅ Warranty list:', warrantyList);
        console.log('✅ Warranty count:', warrantyList.length);
        setWarranties(warrantyList);
      } catch (error) {
        console.log('❌ Error loading warranties:', error);
      }
    };
    
    loadWarranties();
  }, [customerId]);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        console.log('👤 Loading profile...');
        const res = await api.auth.getProfile();
        console.log('📦 Profile response:', JSON.stringify(res, null, 2));
        
        const raw: any = (res as any)?.data || {};
        const profileData = raw?.data || raw;
        console.log('📦 Profile data:', profileData);
        
        // Get customer ID directly from _id field
        if (profileData?._id && typeof profileData._id === 'string') {
          console.log('✅ Setting customerId from profile._id:', profileData._id);
          setCustomerId(profileData._id);
        } else {
          console.log('⚠️ No _id found in profile data');
        }
        
        // Get customer name
        const cName = profileData?.customerName || profileData?.fullName || profileData?.name;
        if (typeof cName === 'string' && cName.trim()) {
          setCustomerName(cName.trim());
          setDisplayNameState(cName.trim());
        }
        
        // Get email from userId or profile
        const emailValue = profileData?.userId?.email || profileData?.email;
        if (typeof emailValue === 'string' && emailValue.trim()) {
          setEmail(emailValue.trim());
        } else {
          setEmail(user?.email ?? '');
        }
        
        // Get phone from userId or profile
        const phoneValue = profileData?.userId?.phone || profileData?.phone || profileData?.phoneNumber;
        if (typeof phoneValue === 'string' && phoneValue.trim()) {
          setPhone(phoneValue.trim());
        } else {
          setPhone(user?.phoneNumber ?? '');
        }
        
        // Get address
        const addrValue = profileData?.address || profileData?.location || profileData?.city;
        if (typeof addrValue === 'string' && addrValue.trim()) {
          setAddress(addrValue.trim());
        }
        
        // Get userId for other purposes
        const userIdValue = profileData?.userId?._id || profileData?.userId;
        if (typeof userIdValue === 'string') {
          setUserId(userIdValue);
        }
        
        console.log('✅ Profile loaded successfully');
      } catch (error) {
        console.log('❌ Error loading profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  const formatDate = (d?: string) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('vi-VN');
    } catch {
      return d;
    }
  };

  const activeCount = useMemo(() => items.filter((i) => String(i.subscription?.status || '').toUpperCase() === 'ACTIVE').length, [items]);
  const pendingCount = useMemo(() => items.filter((i) => String(i.subscription?.status || '').toUpperCase() === 'PENDING').length, [items]);
  const activeWarrantiesCount = useMemo(() => warranties.filter((w) => String(w.status || '').toLowerCase() === 'active').length, [warranties]);

  const renderItem = ({ item }: { item: { vehicle: VehicleItem; subscription: SubscriptionItem } }) => {
    const v = item.vehicle;
    const s = item.subscription;
    const pkg = s.package_id || s.package || {};
    const title = pkg?.name || 'Gói dịch vụ';
    const status = String(s.status || '').toUpperCase();
    const plate = v.licensePlate || v.plate || '';
    const vehicleName = v.model || v.name || plate || (v._id || v.id);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarBox}>
            {v.image_url ? (
              <Image source={{ uri: v.image_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <Ionicons name="car" size={20} color="#1E3A8A" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{vehicleName}</Text>
          </View>
          <View style={[styles.statusPill, status === 'ACTIVE' ? styles.statusActive : styles.statusOther]}>
            <Text style={[styles.statusText, status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextOther]}>
              {status || 'UNKNOWN'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.rowText}>Hiệu lực: {formatDate(s.start_date)} {s.end_date ? `- ${formatDate(s.end_date)}` : ''}</Text>
        </View>
        {plate ? (
          <View style={styles.row}>
            <Ionicons name="pricetag" size={16} color="#666" />
            <Text style={styles.rowText}>Biển số: {plate}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => { loadData(); }} disabled={isLoading}>
            {isLoading ? <ActivityIndicator /> : <Ionicons name="refresh" size={20} color="#1E3A8A" />}
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarHero}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
              ) : (
                <Ionicons name="person" size={56} color="#1E3A8A" />
              )}
            </View>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>
          
          <View style={styles.infoSection}>
            {!!phone && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="call" size={18} color="#1E3A8A" />
                </View>
                <Text style={styles.infoValue}>{phone}</Text>
              </View>
            )}
            {!!email && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail" size={18} color="#1E3A8A" />
                </View>
                <Text style={styles.infoValue} numberOfLines={2}>{email}</Text>
              </View>
            )}
            {!!address && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={18} color="#1E3A8A" />
                </View>
                <Text style={styles.infoValue} numberOfLines={3}>{address}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiNum}>{items.length}</Text>
              <Text style={styles.kpiLabel}>Gói dịch vụ</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBox}>
              <Text style={styles.kpiNum}>{activeCount}</Text>
              <Text style={styles.kpiLabel}>Đang hoạt động</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBox}>
              <Text style={styles.kpiNum}>{pendingCount}</Text>
              <Text style={styles.kpiLabel}>Chờ xử lý</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Các gói dịch vụ của bạn</Text>
            <Text style={styles.sectionSubtitle}>{items.length} gói • {vehicles.length} xe</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : items.length ? (
          <FlatList
            data={items}
            keyExtractor={(it, idx) => String(it.subscription?._id || it.subscription?.id || idx)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="albums-outline" size={32} color="#999" />
            <Text style={styles.emptyText}>Bạn chưa có gói dịch vụ nào</Text>
          </View>
        )}

        {/* Warranties Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Gói bảo hành</Text>
            <Text style={styles.sectionSubtitle}>{warranties.length} bảo hành • {activeWarrantiesCount} đang hoạt động</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : warranties.length ? (
          <FlatList
            data={warranties}
            keyExtractor={(item, idx) => String(item.warranty_id || idx)}
            renderItem={({ item }) => (
              <View style={styles.warrantyCard}>
                <View style={styles.warrantyHeader}>
                  <View style={styles.warrantyImageBox}>
                    {item.part_image ? (
                      <Image source={{ uri: item.part_image }} style={{ width: 48, height: 48, borderRadius: 8 }} resizeMode="contain" />
                    ) : (
                      <Ionicons name="construct" size={24} color="#1E3A8A" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warrantyPartName} numberOfLines={1}>{item.part_name || 'Unknown Part'}</Text>
                    <View style={styles.warrantyDaysRow}>
                      <Ionicons name="time" size={14} color="#666" />
                      <Text style={styles.warrantyDaysText}>{item.days_remaining || 0} ngày còn lại</Text>
                    </View>
                  </View>
                  <View style={[styles.warrantyStatus, item.status?.toLowerCase() === 'active' ? styles.warrantyStatusActive : styles.warrantyStatusInactive]}>
                    <Text style={[styles.warrantyStatusText, item.status?.toLowerCase() === 'active' ? styles.warrantyStatusTextActive : styles.warrantyStatusTextInactive]}>
                      {String(item.status || 'N/A').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.warrantyDateRow}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.warrantyDateText}>
                    {formatDate(item.start_date)} - {formatDate(item.end_date)}
                  </Text>
                </View>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#999" />
            <Text style={styles.emptyText}>Bạn chưa có gói bảo hành nào</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarHero: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  infoSection: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiNum: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusOther: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextOther: {
    color: '#92400E',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: '#666',
  },
  warrantyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  warrantyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warrantyImageBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    padding: 8,
  },
  warrantyPartName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 20,
  },
  warrantyDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  warrantyDaysText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },
  warrantyStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  warrantyStatusActive: {
    backgroundColor: '#D1FAE5',
  },
  warrantyStatusInactive: {
    backgroundColor: '#FEE2E2',
  },
  warrantyStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warrantyStatusTextActive: {
    color: '#065F46',
  },
  warrantyStatusTextInactive: {
    color: '#991B1B',
  },
  warrantyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
  },
  warrantyDateText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});


