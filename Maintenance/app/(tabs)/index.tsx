import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApiService } from '@/hooks/useApiService';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { logout } = useAuth();
  const apiService = useApiService();
  const [displayName, setDisplayName] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
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

          // Prefer address from profile if present
          if (addr) {
            setAddress(addr);
          } else if (userId) {
            try {
              const cust = await apiService.raw.get(`/customers/user/${userId}`);
              if (cust?.success) {
                const c = (cust.data as any) || {};
                if (typeof c.address === 'string') setAddress(c.address);
              }
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (e) {
        // Silently ignore; greeting will fallback
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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
            <Image
              source={{ uri: 'https://via.placeholder.com/50x50/4A90E2/FFFFFF?text=K' }}
              style={styles.profileImage}
            />
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

        {/* Promotional Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.banner}>
            <View style={styles.bannerLeft}>
              <Text style={styles.bannerTitle}>BASIC SERVICE & MAINTENANCE</Text>
              <Text style={styles.bannerPrice}>START FROM ₹199</Text>
              <TouchableOpacity style={styles.bookButton}>
                <Text style={styles.bookButtonText}>BOOK NOW</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bannerRight}>
              <View style={styles.carIllustration}>
                <Ionicons name="car" size={60} color="#FF4444" />
                <View style={styles.serviceIcons}>
                  <View style={styles.serviceIcon}>
                    <Ionicons name="water" size={16} color="#4A90E2" />
                  </View>
                  <View style={styles.serviceIcon}>
                    <Ionicons name="disc" size={16} color="#4A90E2" />
                  </View>
                  <View style={styles.serviceIcon}>
                    <Ionicons name="flask" size={16} color="#4A90E2" />
                  </View>
                  <View style={styles.serviceIcon}>
                    <Ionicons name="brush" size={16} color="#4A90E2" />
                  </View>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.carouselDots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Service Categories */}
        <View style={styles.servicesContainer}>
          <Text style={styles.servicesTitle}>Select Service</Text>
          <View style={styles.servicesGrid}>
            {serviceCategories.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceItem}
                onPress={() => router.push({
                  pathname: '/service-description',
                  params: {
                    serviceId: service.id.toString(),
                    serviceName: service.name
                  }
                })}
              >
                <View style={styles.serviceIconContainer}>
                  <Ionicons name={service.icon as any} size={24} color="#4A90E2" />
                </View>
                <Text style={styles.serviceText}>{service.name}</Text>
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
    backgroundColor: '#FFFFFF',
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
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    color: '#333',
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
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  banner: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 140,
  },
  bannerLeft: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4444',
    marginBottom: 12,
  },
  bookButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bannerRight: {
    flex: 1,
    alignItems: 'center',
  },
  carIllustration: {
    alignItems: 'center',
    position: 'relative',
  },
  serviceIcons: {
    position: 'absolute',
    top: -20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 80,
    justifyContent: 'space-around',
  },
  serviceIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DDD',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#1E3A8A',
    width: 8,
    height: 8,
    borderRadius: 4,
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
