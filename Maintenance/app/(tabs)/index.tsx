import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApiService } from '@/hooks/useApiService';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

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

export default function HomeScreen() {
  const { logout } = useAuth();
  const apiService = useApiService();
  const [displayName, setDisplayName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [servicePackages, setServicePackages] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string>('');
  const [userIdState, setUserIdState] = useState<string>('');
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [showPaymentWeb, setShowPaymentWeb] = useState(false);
  const [paymentOrderCode, setPaymentOrderCode] = useState<string>('');
  const [autoParts, setAutoParts] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const WebViewComponent = useMemo(() => {
    try {
      const mod = require('react-native-webview');
      return mod?.WebView || null;
    } catch (e) {
      console.log('WebView module not available, falling back to external browser.');
      return null;
    }
  }, []);

  useEffect(() => {
    // If WebView isn't available (Expo Go or not linked yet), open payment link in browser
    if (showPaymentWeb && paymentUrl && !WebViewComponent) {
      try {
        const { Linking } = require('react-native');
        Linking.openURL(paymentUrl);
      } catch {}
      setShowPaymentWeb(false);
    }
  }, [showPaymentWeb, paymentUrl, WebViewComponent]);

  const loadAllData = async (isMounted: boolean = true) => {
    try {
      // Load profile
      const res = await apiService.auth.getProfile();
      console.log('🔎 Profile response:', JSON.stringify(res, null, 2));
      if (res?.success && isMounted) {
        const raw = res.data as any;
        const candidateSources = [
          raw,
          raw?.data,
          raw?.profile,
          raw?.user,
        ];

        let name: string = '';
        let userId: string | undefined;
        let addr: string | undefined;
        for (const src of candidateSources) {
          if (!src) continue;
          const candidate =
            src.fullName ||
            src.name ||
            src.username ||
            src.userName ||
            src.displayName ||
            src.customerName ||
            src.firstName ||
            src.email;
          if (typeof candidate === 'string' && candidate.trim()) {
            name = candidate.trim();
          }

          const possUserId = src.userId || src._id || src.id;
          if (!userId && typeof possUserId === 'string') {
            userId = possUserId;
          }

          const addrCandidate = src.address || src.location || src.city;
          if (!addr && typeof addrCandidate === 'string' && addrCandidate.trim()) {
            addr = addrCandidate.trim();
          }
        }

        setDisplayName(name);
        if (userId) setUserIdState(userId);

        // Prefer address from profile if present
        if (addr) {
          setAddress(addr);
        } else if (userId) {
          try {
            const cust = await apiService.raw.get(`/customers/user/${userId}`);
            if (cust?.success) {
              const c = (cust.data as any) || {};
              if (typeof c.address === 'string') setAddress(c.address);
              if (typeof c._id === 'string') setCustomerId(c._id);
            }
          } catch (e) {
            // ignore
          }
        }

        // Ensure we have customer id even if address was present
        if (userId && !customerId) {
          try {
            const cust = await apiService.raw.get(`/customers/user/${userId}`);
            if (cust?.success) {
              const c = (cust.data as any) || {};
              if (typeof c._id === 'string') setCustomerId(c._id);
            }
          } catch {}
        }
      }
    } catch (e) {
      // Silently ignore; greeting will fallback
    }

    // Load service packages for banner
    try {
      const res = await apiService.servicePackages.getAll();
      if (res?.success && isMounted) {
        const items = Array.isArray((res as any).data) ? (res as any).data : [];
        setServicePackages(items);
      }
    } catch (e) {
      // ignore banner fetch errors
    }

    // Load auto parts for selection grid
    try {
      const res = await apiService.autoParts.getAll({ page: 1, limit: 12 });
      if (isMounted && res?.success) {
        const payload: any = (res as any).data || {};
        const items = Array.isArray(payload?.parts) ? payload.parts : Array.isArray(payload) ? payload : [];
        setAutoParts(items);
      }
    } catch {}

    // preload my vehicles (lazy on open as fallback)
    try {
      setIsLoadingVehicles(true);
      const res = await apiService.vehicles.getMyVehicles();
      if (isMounted && res?.success) {
        const list = Array.isArray((res as any).data) ? (res as any).data : [];
        setVehicles(list);
      }
    } finally {
      if (isMounted) setIsLoadingVehicles(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadAllData(isMounted);
    return () => {
      isMounted = false;
    };
  }, []);

  const hasMultiplePackages = servicePackages && servicePackages.length > 1;
  const firstPackage = useMemo(() => servicePackages?.[0], [servicePackages]);

  const formatVnd = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    try {
      return new Intl.NumberFormat('vi-VN').format(value);
    } catch {
      return String(value);
    }
  };

  const onPressPackage = async (pkg: any) => {
    setSelectedPackage(pkg);
    if (!vehicles.length && !isLoadingVehicles) {
      try {
        setIsLoadingVehicles(true);
        const res = await apiService.vehicles.getMyVehicles();
        if (res?.success) {
          const list = Array.isArray((res as any).data) ? (res as any).data : [];
          setVehicles(list);
        }
      } finally {
        setIsLoadingVehicles(false);
      }
    }
    setShowVehicleModal(true);
  };

  const resolvePaymentUrl = async (
    subscriptionId?: string,
    effectiveCustomerId?: string
  ): Promise<string | undefined> => {
    // 1) Try by subscription id
    if (subscriptionId) {
      try {
        const listRes = await apiService.payments.getAll({ subscription_id: subscriptionId });
        const payload = (listRes as any)?.data || {};
        const items: any[] = Array.isArray(payload?.payments)
          ? payload.payments
          : Array.isArray(payload)
          ? payload
          : [];
        console.log('Payments by subscription_id count =', items.length);
        const first = items[0];
        const url = first?.payment_url || first?.url || first?.redirectUrl;
        try {
          const oc = first?.order_code || first?.orderCode || first?.code;
          if (typeof oc === 'number' || typeof oc === 'string') setPaymentOrderCode(String(oc));
        } catch {}
        if (url) console.log('Found payment_url by subscription_id:', url);
        if (url) return url;
      } catch {}
    }

    // 2) Fallback by customer id (latest pending)
    if (effectiveCustomerId) {
      try {
        const listRes = await apiService.payments.getAll({ customer_id: effectiveCustomerId, status: 'pending' });
        const payload = (listRes as any)?.data || {};
        let items: any[] = Array.isArray(payload?.payments)
          ? payload.payments
          : Array.isArray(payload)
          ? payload
          : [];
        // sort desc by createdAt if present
        items = items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const candidate = subscriptionId
          ? items.find((p) => (p?.subscription_id?._id || p?.subscription_id || p?.subscriptionId) === subscriptionId) || items[0]
          : items[0];
        console.log('Payments by customer_id count =', items.length);
        const url = candidate?.payment_url || candidate?.url || candidate?.redirectUrl;
        try {
          const oc = candidate?.order_code || candidate?.orderCode || candidate?.code;
          if (typeof oc === 'number' || typeof oc === 'string') setPaymentOrderCode(String(oc));
        } catch {}
        if (url) console.log('Found payment_url by customer_id:', url);
        if (url) return url;
      } catch {}
    }
    return undefined;
  };

  const handleSelectVehicle = async (vehicle: any) => {
    if (!selectedPackage) return;
    try {
      setIsSubmitting(true);
      // Derive customer id from vehicle if available
      let effectiveCustomerId: string | undefined =
        vehicle?.customer_id || vehicle?.customerId || vehicle?.customer?._id || vehicle?.customer || vehicle?.ownerCustomerId;
      if (!effectiveCustomerId) {
        effectiveCustomerId = customerId;
      }
      if (!effectiveCustomerId && userIdState) {
        try {
          const cust = await apiService.raw.get(`/customers/user/${userIdState}`);
          if (cust?.success) {
            const c = (cust.data as any) || {};
            if (typeof c._id === 'string') effectiveCustomerId = c._id;
          }
        } catch {}
      }

      if (!effectiveCustomerId) {
        Alert.alert('Lỗi', 'Không tìm thấy customer_id để tạo thanh toán');
        return;
      }
      // 1) Create vehicle subscription
      const body = {
        vehicleId: vehicle._id || vehicle.id,
        package_id: selectedPackage._id || selectedPackage.id,
        start_date: new Date().toISOString().slice(0, 10),
        status: 'ACTIVE',
      };
      const subRes = await apiService.vehicleSubscriptions.create(body);
      if (!subRes?.success) {
        Alert.alert('Lỗi', subRes?.message || 'Tạo đăng ký không thành công');
        return;
      }
      const subscription = (subRes as any).data || {};
      const subscriptionId = subscription._id || subscription.id;

      // 2) Create payment for this subscription
      const payRes = await apiService.payments.create({
        payment_type: 'subscription',
        subscription_id: subscriptionId,
        customer_id: effectiveCustomerId,
      });
      if (!payRes?.success) {
        Alert.alert('Lỗi', payRes?.message || 'Tạo thanh toán không thành công');
        return;
      }
      const paymentObj = (payRes as any).data || {};
      try {
        const oc = paymentObj.order_code || paymentObj.orderCode || paymentObj.code || paymentObj?.payos?.order_code;
        if (typeof oc === 'string') setPaymentOrderCode(oc);
      } catch {}
      let paymentUrl: string | undefined = await resolvePaymentUrl(subscriptionId, effectiveCustomerId);
      console.log('Resolved payment_url after create:', paymentUrl);

      // Fallback: if still not found, try getById when available
      if (!paymentUrl) {
        const paymentId = paymentObj?._id || paymentObj?.id;
        if (paymentId) {
          try {
            const getPay = await apiService.payments.getById(paymentId);
            const paymentData = (getPay as any)?.data || {};
            paymentUrl = paymentData.payment_url || paymentData.url || paymentData.redirectUrl;
            try {
              const oc = paymentData.order_code || paymentData.orderCode || paymentData.code || paymentData?.payos?.order_code;
              if (typeof oc === 'string') setPaymentOrderCode(oc);
            } catch {}
          } catch {}
        }
      }

      setShowVehicleModal(false);
      setSelectedPackage(null);

      if (paymentUrl) {
        setPaymentUrl(paymentUrl);
        setShowPaymentWeb(true);
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy liên kết thanh toán');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadAllData(true);
      toast.success('Data refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          onPress: () => { },
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể đăng xuất');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };
  const serviceCategories = [
    { id: 1, name: 'Car Service', icon: 'car-sport' },
    { id: 2, name: 'Tyres & Wheel Care', icon: 'disc' },
    { id: 3, name: 'Denting & Painting', icon: 'brush' },
    { id: 4, name: 'AC Service & Repair', icon: 'thermometer' },
    { id: 5, name: 'Car Spa & Cleaning', icon: 'water' },
    { id: 6, name: 'Batteries', icon: 'battery-half' },
    { id: 7, name: 'Insurance Claims', icon: 'shield-checkmark' },
    { id: 8, name: 'Windshield & Lights', icon: 'flashlight' },
    { id: 9, name: 'Clutch & Brakes', icon: 'stop-circle' },
    { id: 10, name: 'Dryclean', icon: 'sparkles' },
    { id: 11, name: 'Car Wash', icon: 'rainy' },
    { id: 12, name: 'Oiling', icon: 'flask' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello {displayName || '...'}</Text>
            <View style={styles.locationContainer}>
              <Text style={styles.location} numberOfLines={1} ellipsizeMode="tail">{address || '...'}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={24} color="#FF4444" />
            </TouchableOpacity>
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
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a car service"
            placeholderTextColor="#999"
          />
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        </View>

        {/* Promotional Banner (Service Packages) */}
        <View style={styles.bannerContainer}>
          {hasMultiplePackages ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
            >
              {servicePackages.map((pkg) => (
                <TouchableOpacity 
                  key={pkg._id} 
                  activeOpacity={0.9} 
                  onPress={() => onPressPackage(pkg)}
                  style={{ width: width - 40, marginRight: 0 }}
                >
                  <Image
                    source={getPackageImage(pkg?.name)}
                    style={styles.packageImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => firstPackage && onPressPackage(firstPackage)}
            >
              <Image
                source={getPackageImage(firstPackage?.name || 'basic')}
                style={styles.packageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Vehicle Select Modal */}
        <Modal
          visible={showVehicleModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowVehicleModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowVehicleModal(false)}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Chọn xe để đăng ký gói</Text>
                  {isLoadingVehicles ? (
                    <View style={styles.modalLoader}><ActivityIndicator /></View>
                  ) : (
                    <FlatList
                      data={vehicles}
                      keyExtractor={(item) => item._id || item.id}
                      ItemSeparatorComponent={() => <View style={styles.separator} />}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.vehicleRow} onPress={() => handleSelectVehicle(item)} disabled={isSubmitting}>
                          <Ionicons name="car" size={20} color="#1E3A8A" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.vehicleTitle}>{item?.model || item?.name || item?.licensePlate || 'My Vehicle'}</Text>
                            <Text style={styles.vehicleSub}>{item?.licensePlate || item?.plate || item?._id}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#666" />
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={<Text style={styles.emptyText}>Không có xe nào</Text>}
                    />
                  )}
                  <TouchableOpacity style={styles.modalClose} onPress={() => setShowVehicleModal(false)} disabled={isSubmitting}>
                    <Text style={styles.modalCloseText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Payment WebView Modal */}
        <Modal
          visible={showPaymentWeb}
          animationType="slide"
          onRequestClose={() => setShowPaymentWeb(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 }}>
              <TouchableOpacity onPress={() => setShowPaymentWeb(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
              <Text style={{ fontWeight: '700', fontSize: 16, marginLeft: 4 }}>Thanh toán</Text>
            </View>
            {paymentUrl && WebViewComponent ? (
              <WebViewComponent
                style={{ flex: 1 }}
                source={{ uri: paymentUrl }}
                originWhitelist={["*"]}
                onShouldStartLoadWithRequest={() => true}
                javaScriptEnabled
                javaScriptCanOpenWindowsAutomatically
                domStorageEnabled
                mixedContentMode="always"
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                setSupportMultipleWindows={true}
                androidLayerType="hardware"
                userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"
                onNavigationStateChange={(nav: any) => {
                  try {
                    const url: string = nav?.url || '';
                    if (/status=success/i.test(url) || /(payment|pay)(-|\/)success/i.test(url) || /paid|success/i.test(url)) {
                      (async () => {
                        try {
                          // Only order_code is required
                          let oc: any = paymentOrderCode;
                          if (!oc) {
                            try {
                              const query = url.split('?')[1] || '';
                              const parts = query.split('&');
                              const map: Record<string, string> = {};
                              parts.forEach((p) => {
                                const [k, v] = p.split('=');
                                if (k) map[decodeURIComponent(k)] = decodeURIComponent(v || '');
                              });
                              oc = map['order_code'] || map['orderCode'] || map['code'];
                            } catch {}
                          }
                          if (oc) await apiService.payments.webhook({ order_code: /^\d+$/.test(String(oc)) ? Number(oc) : oc, status: 'PAID' });
                        } catch {}
                        setShowPaymentWeb(false);
                        setPaymentUrl('');
                        router.replace('/(tabs)/profile');
                      })();
                    }
                  } catch {}
                }}
                injectedJavaScriptBeforeContentLoaded={`(function(){
                  const _open = window.open;
                  window.open = function(url){
                    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'open', url}));}catch(e){}
                    return null;
                  };
                })();`}
                onMessage={(e: any) => {
                  try {
                    const data = JSON.parse(e?.nativeEvent?.data || '{}');
                    if (data?.type === 'open' && typeof data?.url === 'string') {
                      setPaymentUrl(data.url);
                    }
                  } catch {}
                }}
                onCreateWindow={(event: any) => {
                  const target = event?.nativeEvent?.targetUrl;
                  if (typeof target === 'string' && target.startsWith('http')) {
                    setPaymentUrl(target);
                  }
                }}
                startInLoadingState
                renderLoading={() => (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator />
                  </View>
                )}
                onHttpError={(e: any) => {
                  console.log('WebView HTTP error', e?.nativeEvent?.statusCode, e?.nativeEvent?.description);
                }}
                onError={(e: any) => {
                  console.log('WebView error', e?.nativeEvent);
                }}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator />
              </View>
            )}
          </SafeAreaView>
        </Modal>

        {/* Parts Selection */}
        <View style={styles.servicesContainer}>
          <Text style={styles.servicesTitle}>Select Parts</Text>
          <View style={styles.servicesGrid}>
            {(autoParts.length ? autoParts : []).map((part) => (
              <TouchableOpacity
                key={part._id || part.id}
                style={styles.serviceItem}
                onPress={() => router.push({
                  pathname: '/service-description',
                  params: {
                    partId: (part._id || part.id || '').toString(),
                    partName: part.name || 'Part',
                    partPrice: String(part.selling_price ?? ''),
                    image: part.image || ''
                  }
                })}
              >
                <View style={styles.serviceIconContainer}>
                  {part?.image ? (
                    <Image source={{ uri: part.image }} style={{ width: 32, height: 32, borderRadius: 6 }} />
                  ) : (
                    <Ionicons name="cog" size={24} color="#22C55E" />
                  )}
                </View>
                <Text style={styles.serviceText} numberOfLines={1}>{part.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE0E0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#15803D',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchIcon: {
    marginLeft: 8,
  },
  bannerContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  packageImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '65%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111',
  },
  modalLoader: {
    paddingVertical: 24,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  vehicleTitle: {
    color: '#222',
    fontWeight: '600',
  },
  vehicleSub: {
    color: '#666',
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#EEE',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 24,
  },
  modalClose: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
  servicesContainer: {
    paddingHorizontal: 20,
  },
  servicesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: (width - 60) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
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
  serviceIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#F0F8FF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});
