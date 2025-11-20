import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useApiService } from '@/hooks/useApiService';
import { toast } from 'sonner-native';

// Map package names to images
const getPackageImage = (packageName: string) => {
  const name = packageName?.toLowerCase() || '';
  if (name.includes('basic')) return require('@/assets/images/basicpackage.png');
  if (name.includes('standard')) return require('@/assets/images/standardpackage.png');
  if (name.includes('comprehensive') || name.includes('comprehensiv')) return require('@/assets/images/comprehensivpackage.png');
  if (name.includes('premium')) return require('@/assets/images/premiumperiodicpackage.png');
  // Default fallback
  return require('@/assets/images/basicpackage.png');
};

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
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDay, setPickerDay] = useState('1');
  const [pickerMonth, setPickerMonth] = useState('1');
  const [pickerYear, setPickerYear] = useState('1990');
  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

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
        
        // Date of birth
        const dobValue = profileData?.dateOfBirth || profileData?.dob;
        if (typeof dobValue === 'string' && dobValue.trim()) {
          setDateOfBirth(dobValue.trim());
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
      const parsed = new Date(d);
      if (Number.isNaN(parsed.getTime())) return d;
      return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatInputDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const activeCount = useMemo(() => items.filter((i) => String(i.subscription?.status || '').toUpperCase() === 'ACTIVE').length, [items]);
  const pendingCount = useMemo(() => items.filter((i) => String(i.subscription?.status || '').toUpperCase() === 'PENDING').length, [items]);
  const activeWarrantiesCount = useMemo(() => warranties.filter((w) => String(w.status || '').toLowerCase() === 'active').length, [warranties]);

  const openEditModal = () => {
    setEditName(customerName);
    setEditDob(dateOfBirth);
    setEditAddress(address);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!customerId) {
      toast.error('Customer profile not found');
      return;
    }
    const payload: Record<string, string> = {};
    if (editName.trim()) payload.customerName = editName.trim();
    if (editDob.trim()) payload.dateOfBirth = editDob.trim();
    if (editAddress.trim()) payload.address = editAddress.trim();
    if (!Object.keys(payload).length) {
      toast.error('Please fill at least one field');
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await api.raw.patch(`/customers/${customerId}`, payload);
      console.log('✅ Profile update response:', response);
      
      // Update local state
      if (payload.customerName) {
        setCustomerName(payload.customerName);
        setDisplayNameState(payload.customerName);
      }
      if (payload.dateOfBirth) {
        setDateOfBirth(payload.dateOfBirth);
      }
      if (payload.address) {
        setAddress(payload.address);
      }
      
      // Reload profile to get latest data
      try {
        const res = await api.auth.getProfile();
        const raw: any = (res as any)?.data || {};
        const profileData = raw?.data || raw;
        
        const cName = profileData?.customerName || profileData?.fullName || profileData?.name;
        if (typeof cName === 'string' && cName.trim()) {
          setCustomerName(cName.trim());
          setDisplayNameState(cName.trim());
        }
        
        const dobValue = profileData?.dateOfBirth || profileData?.dob;
        if (typeof dobValue === 'string' && dobValue.trim()) {
          setDateOfBirth(dobValue.trim());
        }
        
        const addrValue = profileData?.address || profileData?.location || profileData?.city;
        if (typeof addrValue === 'string' && addrValue.trim()) {
          setAddress(addrValue.trim());
        }
      } catch (reloadError) {
        console.warn('⚠️ Could not reload profile:', reloadError);
      }
      
      toast.success('Profile updated successfully');
      setShowEditModal(false);
    } catch (error) {
      console.log('❌ Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenDatePicker = () => {
    let day = '1', month = '1', year = '1990';
    const dateStr = editDob || dateOfBirth;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        year = parts[0];
        month = String(parseInt(parts[1], 10));
        day = String(parseInt(parts[2], 10));
      } else {
        const parsed = new Date(dateStr);
        if (!Number.isNaN(parsed.getTime())) {
          year = String(parsed.getFullYear());
          month = String(parsed.getMonth() + 1);
          day = String(parsed.getDate());
        }
      }
    }
    setPickerDay(day);
    setPickerMonth(month);
    setPickerYear(year);
    setShowDatePicker(true);
    
    // Scroll to selected values after a short delay
    setTimeout(() => {
      const dayIndex = parseInt(day, 10) - 1;
      const monthIndex = parseInt(month, 10) - 1;
      const currentYear = new Date().getFullYear();
      const yearIndex = currentYear - parseInt(year, 10);
      
      dayScrollRef.current?.scrollTo({ y: dayIndex * 40, animated: true });
      monthScrollRef.current?.scrollTo({ y: monthIndex * 40, animated: true });
      yearScrollRef.current?.scrollTo({ y: yearIndex * 40, animated: true });
    }, 100);
  };

  const handleDateConfirm = () => {
    const day = String(parseInt(pickerDay, 10) || 1).padStart(2, '0');
    const month = String(parseInt(pickerMonth, 10) || 1).padStart(2, '0');
    const year = pickerYear || '1990';
    setEditDob(`${year}-${month}-${day}`);
    setShowDatePicker(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: { vehicle: VehicleItem; subscription: SubscriptionItem } }) => {
    const v = item.vehicle;
    const s = item.subscription;
    const pkg = s.package_id || s.package || {};
    const title = pkg?.name || 'Service Package';
    const status = String(s.status || '').toLowerCase();
    const plate = v.licensePlate || v.plate || '';
    const vehicleName = v.model || v.name || plate || (v._id || v.id);
    
    const statusConfig = {
      active: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' },
      pending: { bg: '#FEF3C7', text: '#92400E', icon: 'time' },
      expired: { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle' },
      cancelled: { bg: '#F3F4F6', text: '#6B7280', icon: 'ban' },
    };
    const statusKey = status as keyof typeof statusConfig;
    const statusStyle = statusConfig[statusKey] || statusConfig.pending;
    
    return (
      <TouchableOpacity 
        style={styles.serviceCard}
        activeOpacity={0.7}
      >
        <View style={styles.serviceImageContainer}>
          <Image
            source={getPackageImage(title)}
            style={styles.servicePackageImage}
            resizeMode="cover"
          />
        </View>
        
        <View style={styles.serviceCardContent}>
          <View style={styles.serviceCardHeader}>
            <Text style={styles.serviceCardTitle} numberOfLines={2}>
              {title}
            </Text>
            <View style={[styles.serviceStatusBadge, { backgroundColor: statusStyle.bg }]}>
              <Ionicons name={statusStyle.icon as any} size={12} color={statusStyle.text} />
              <Text style={[styles.serviceStatusText, { color: statusStyle.text }]}>
                {status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.serviceValidityRow}>
            <Ionicons name="calendar-outline" size={16} color="#15803D" />
            <Text style={styles.serviceValidityText}>
              {formatDate(s.start_date)} {s.end_date ? `- ${formatDate(s.end_date)}` : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#15803D']}
            tintColor="#15803D"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>My Profile</Text>
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

        {/* User Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.editRow}>
            <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
              <Ionicons name="create-outline" size={16} color="#15803D" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileHeader}>
            <View style={styles.avatarHero}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
              ) : (
                <Ionicons name="person" size={56} color="#15803D" />
              )}
            </View>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>
          
          <View style={styles.infoSection}>
            {!!phone && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="call" size={18} color="#15803D" />
                </View>
                <Text style={styles.infoValue}>{phone}</Text>
              </View>
            )}
            {!!email && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail" size={18} color="#15803D" />
                </View>
                <Text style={styles.infoValue} numberOfLines={2}>{email}</Text>
              </View>
            )}
            {!!address && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location" size={18} color="#15803D" />
                </View>
                <Text style={styles.infoValue} numberOfLines={3}>{address}</Text>
              </View>
            )}
            {!!dateOfBirth && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="calendar" size={18} color="#15803D" />
                </View>
                <Text style={styles.infoValue}>{formatDate(dateOfBirth)}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiNum}>{items.length}</Text>
              <Text style={styles.kpiLabel}>Packages</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBox}>
              <Text style={styles.kpiNum}>{activeCount}</Text>
              <Text style={styles.kpiLabel}>Active</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBox}>
              <Text style={styles.kpiNum}>{pendingCount}</Text>
              <Text style={styles.kpiLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My Service Packages</Text>
            <Text style={styles.sectionSubtitle}>{items.length} packages • {vehicles.length} vehicles</Text>
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
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        ) : (
          <View style={styles.serviceEmptyContainer}>
            <View style={styles.serviceEmptyIconWrapper}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.serviceEmptyTitle}>No service packages yet</Text>
            <Text style={styles.serviceEmptySubtext}>Subscribe to a service package to get started</Text>
          </View>
        )}

        {/* Warranties Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Warranty Packages</Text>
            <Text style={styles.sectionSubtitle}>{warranties.length} warranties • {activeWarrantiesCount} active</Text>
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
                      <Text style={styles.warrantyDaysText}>{item.days_remaining || 0} days left</Text>
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
          <View style={styles.serviceEmptyContainer}>
            <View style={styles.serviceEmptyIconWrapper}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.serviceEmptyTitle}>No warranty packages yet</Text>
            <Text style={styles.serviceEmptySubtext}>Your warranty information will appear here</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowEditModal(false);
          setShowDatePicker(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="John Doe"
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Date of Birth (YYYY-MM-DD)</Text>
              <TouchableOpacity style={styles.modalDatePicker} onPress={handleOpenDatePicker}>
                <Text style={[styles.modalDateText, !editDob && { color: '#9CA3AF' }]}>
                  {editDob || 'Select date'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Address</Text>
              <TextInput
                style={[styles.modalInput, { height: 72 }]}
                placeholder="123 Main St, City, State"
                value={editAddress}
                onChangeText={setEditAddress}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowEditModal(false);
                  setShowDatePicker(false);
                }}
                disabled={isSavingProfile}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, isSavingProfile && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={styles.datePickerWrapper}>
                <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Day</Text>
                    <ScrollView 
                      ref={dayScrollRef}
                      style={styles.datePickerScroll} 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.datePickerScrollContent}
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.datePickerItem, pickerDay === String(d) && styles.datePickerItemActive]}
                          onPress={() => setPickerDay(String(d))}
                        >
                          <Text style={[styles.datePickerItemText, pickerDay === String(d) && styles.datePickerItemTextActive]}>
                            {String(d).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Month</Text>
                    <ScrollView 
                      ref={monthScrollRef}
                      style={styles.datePickerScroll} 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.datePickerScrollContent}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.datePickerItem, pickerMonth === String(m) && styles.datePickerItemActive]}
                          onPress={() => setPickerMonth(String(m))}
                        >
                          <Text style={[styles.datePickerItemText, pickerMonth === String(m) && styles.datePickerItemTextActive]}>
                            {String(m).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Year</Text>
                    <ScrollView 
                      ref={yearScrollRef}
                      style={styles.datePickerScroll} 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.datePickerScrollContent}
                    >
                      {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <TouchableOpacity
                          key={y}
                          style={[styles.datePickerItem, pickerYear === String(y) && styles.datePickerItemActive]}
                          onPress={() => setPickerYear(String(y))}
                        >
                          <Text style={[styles.datePickerItemText, pickerYear === String(y) && styles.datePickerItemTextActive]}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <View style={styles.datePickerActions}>
                  <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePickerDone} onPress={handleDateConfirm}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#F0FDF4',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: -0.5,
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
  },
  refreshButtonDisabled: {
    opacity: 0.5,
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
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
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
  editRow: {
    alignItems: 'flex-end',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F7ED',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  editBtnText: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 12,
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#15803D',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  modalField: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  modalSave: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#15803D',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalDatePicker: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalDateText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerWrapper: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  datePickerScroll: {
    maxHeight: 200,
    width: '100%',
  },
  datePickerScrollContent: {
    paddingVertical: 80,
  },
  datePickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
  },
  datePickerItemActive: {
    backgroundColor: '#DCFCE7',
  },
  datePickerItemText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  datePickerItemTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 12,
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  datePickerCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  datePickerDone: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#15803D',
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  // Service Packages Styles
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  serviceImageContainer: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  servicePackageImage: {
    width: '100%',
    height: '100%',
  },
  serviceCardContent: {
    padding: 16,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  serviceCardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  serviceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  serviceStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  serviceValidityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  serviceValidityText: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '600',
  },
  serviceEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  serviceEmptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  serviceEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  serviceEmptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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


