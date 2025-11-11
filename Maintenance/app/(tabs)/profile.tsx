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

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const res = await api.auth.getProfile();
        const raw: any = (res as any)?.data || {};
        const candidates = [raw, raw?.data, raw?.profile, raw?.user];
        let dName = '';
        let uid: string | undefined;
        let mail = '';
        let phoneNum = '';
        let addr = '';
        for (const src of candidates) {
          if (!src) continue;
          const possName = src.fullName || src.customerName || src.name || src.username || src.userName || src.displayName || src.firstName;
          if (typeof possName === 'string' && possName.trim()) dName = possName.trim();
          const possId = src.userId || src._id || src.id;
          if (!uid && typeof possId === 'string') uid = possId;
          const possEmail = src.email;
          if (typeof possEmail === 'string' && possEmail.trim()) mail = possEmail.trim();
          const possPhone = src.phone || src.phoneNumber;
          if (typeof possPhone === 'string' && possPhone.trim()) phoneNum = possPhone.trim();
          const possAddr = src.address || src.location || src.city;
          if (typeof possAddr === 'string' && possAddr.trim()) addr = possAddr.trim();
        }
        setDisplayNameState(dName);
        setEmail(mail || (user?.email ?? ''));
        setPhone(phoneNum || (user?.phoneNumber ?? ''));
        setAddress(addr);
        setUserId(uid);

        // Try to load dedicated Customer entity
        if (uid) {
          try {
            const cust = await api.raw.get(`/customers/user/${uid}`);
            const c: any = (cust as any)?.data || {};
            const cName = c.customerName || c.fullName || c.name;
            if (typeof cName === 'string') setCustomerName(cName);
            if (typeof c.address === 'string') setAddress((prev) => prev || c.address);
            if (typeof c.phone === 'string') setPhone((prev) => prev || c.phone);
          } catch {}
        }
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
          <View style={styles.topRow}>
            <View style={styles.leftCol}>
              <Text style={styles.nameText} numberOfLines={1}>{displayName}</Text>
              <View style={styles.infoRows}>
                {!!customerName && (
                  <View style={styles.infoRow}><Ionicons name="person" size={16} color="#666" /><Text style={styles.infoValue} numberOfLines={1}>{customerName}</Text></View>
                )}
                {!!phone && (
                  <View style={styles.infoRow}><Ionicons name="call" size={16} color="#666" /><Text style={styles.infoValue}>{phone}</Text></View>
                )}
                {!!address && (
                  <View style={styles.infoRow}><Ionicons name="location" size={16} color="#666" /><Text style={styles.infoValue} numberOfLines={2}>{address}</Text></View>
                )}
                {!!email && (
                  <View style={styles.infoRow}><Ionicons name="mail" size={16} color="#666" /><Text style={styles.infoValue}>{email}</Text></View>
                )}
              </View>
            </View>
            <View style={styles.rightCol}>
              <View style={styles.avatarHero}>
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                ) : (
                  <Ionicons name="person" size={48} color="#1E3A8A" />
                )}
              </View>
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}><Text style={styles.kpiNum}>{items.length}</Text><Text style={styles.kpiLabel}>Gói</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiNum}>{activeCount}</Text><Text style={styles.kpiLabel}>Active</Text></View>
            <View style={styles.kpiBox}><Text style={styles.kpiNum}>{pendingCount}</Text><Text style={styles.kpiLabel}>Pending</Text></View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Các gói dịch vụ của bạn</Text>
          <Text style={styles.sectionSubtitle}>{items.length} gói • {vehicles.length} xe</Text>
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
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  leftCol: {
    flex: 1,
  },
  rightCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHero: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  customerText: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
  },
  infoRows: {
    gap: 8,
    marginTop: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    color: '#374151',
    flex: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: '#777',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardSub: {
    fontSize: 12,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  rowText: {
    color: '#444',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  statusActive: {
    backgroundColor: '#E8F5E8',
    borderColor: '#C7EAC7',
  },
  statusOther: {
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#2E7D32',
  },
  statusTextOther: {
    color: '#555',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: '#666',
  },
});


