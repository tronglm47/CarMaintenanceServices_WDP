import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useApiService } from '@/hooks/useApiService';
import { toast } from 'sonner-native';
import { router } from 'expo-router';

interface Certificate {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
  credentialUrl: string;
  _id: string;
}

interface TechnicianProfile {
  _id: string;
  userId: {
    _id: string;
    email: string;
    phone: string | null;
    role: string;
  };
  name: string;
  dateOfBirth: string;
  certificates: Certificate[];
  isOnline: boolean;
  centerId: string;
  createdAt: string;
  updatedAt: string;
}

export default function TechnicianProfileScreen() {
  const { logout, user } = useAuth();
  const api = useApiService();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);

  const loadProfile = async () => {
    try {
      console.log('📋 Loading technician profile...');
      const res = await api.auth.getProfile();
      const raw: any = (res as any)?.data || {};
      const profileData = raw?.data || raw;
      
      console.log('✅ Technician profile loaded:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('❌ Error loading technician profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadProfile();
      toast.success('Profile refreshed!');
    } catch (error) {
      toast.error('Failed to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getCertificateStatus = (expirationDate?: string) => {
    if (!expirationDate) return { text: 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
    
    try {
      const expDate = new Date(expirationDate);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        return { text: 'Expired', color: '#DC2626', bg: '#FEE2E2' };
      } else if (daysUntilExpiry < 30) {
        return { text: 'Expiring Soon', color: '#D97706', bg: '#FEF3C7' };
      } else {
        return { text: 'Valid', color: '#059669', bg: '#D1FAE5' };
      }
    } catch {
      return { text: 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15803D" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Header */}
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
              color={isRefreshing ? '#999' : '#15803D'}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="construct" size={48} color="#15803D" />
            </View>
            <Text style={styles.nameText}>{profile?.name || 'Technician'}</Text>
            <View style={[styles.statusBadge, profile?.isOnline ? styles.statusOnline : styles.statusOffline]}>
              <View style={[styles.statusDot, profile?.isOnline ? styles.dotOnline : styles.dotOffline]} />
              <Text style={[styles.statusText, profile?.isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
                {profile?.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Contact Information */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {profile?.userId?.email && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail" size={18} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profile.userId.email}</Text>
                </View>
              </View>
            )}

            {profile?.userId?.phone && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="call" size={18} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{profile.userId.phone}</Text>
                </View>
              </View>
            )}

            {profile?.dateOfBirth && (
              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="calendar" size={18} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{formatDate(profile.dateOfBirth)}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase" size={18} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{profile?.userId?.role || 'TECHNICIAN'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Certificates Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionHeaderTitle}>Certificates & Qualifications</Text>
            <Text style={styles.sectionSubtitle}>
              {profile?.certificates?.length || 0} certificate(s)
            </Text>
          </View>
        </View>

        {profile?.certificates && profile.certificates.length > 0 ? (
          <View style={styles.certificatesContainer}>
            {profile.certificates.map((cert, index) => {
              const status = getCertificateStatus(cert.expirationDate);
              return (
                <View key={cert._id || index} style={styles.certificateCard}>
                  <View style={styles.certificateHeader}>
                    <View style={styles.certificateIconBox}>
                      <Ionicons name="ribbon" size={24} color="#15803D" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.certificateName} numberOfLines={2}>
                        {cert.name}
                      </Text>
                      <Text style={styles.certificateOrg} numberOfLines={1}>
                        {cert.issuingOrganization}
                      </Text>
                    </View>
                    <View style={[styles.certificateStatus, { backgroundColor: status.bg }]}>
                      <Text style={[styles.certificateStatusText, { color: status.color }]}>
                        {status.text}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.certificateDates}>
                    <View style={styles.certificateDateItem}>
                      <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.certificateDateLabel}>Issued:</Text>
                      <Text style={styles.certificateDateValue}>{formatDate(cert.issueDate)}</Text>
                    </View>
                    <View style={styles.certificateDateItem}>
                      <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.certificateDateLabel}>Expires:</Text>
                      <Text style={styles.certificateDateValue}>{formatDate(cert.expirationDate)}</Text>
                    </View>
                  </View>

                  {cert.credentialUrl && (
                    <TouchableOpacity
                      style={styles.viewCredentialBtn}
                      onPress={() => {
                        // Open URL in browser
                        toast.info('Opening credential URL...');
                      }}
                    >
                      <Ionicons name="link" size={16} color="#15803D" />
                      <Text style={styles.viewCredentialText}>View Credential</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No certificates yet</Text>
            <Text style={styles.emptySubtext}>Your certificates will appear here</Text>
          </View>
        )}

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
  profileCard: {
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusOnline: {
    backgroundColor: '#D1FAE5',
  },
  statusOffline: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#059669',
  },
  dotOffline: {
    backgroundColor: '#DC2626',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextOnline: {
    color: '#059669',
  },
  statusTextOffline: {
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  infoSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
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
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  certificatesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  certificateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  certificateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  certificateIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certificateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 20,
  },
  certificateOrg: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  certificateStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  certificateStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  certificateDates: {
    gap: 8,
    marginBottom: 12,
  },
  certificateDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  certificateDateLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  certificateDateValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  viewCredentialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  viewCredentialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803D',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});

