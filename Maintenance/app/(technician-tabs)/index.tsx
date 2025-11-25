import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApiService } from '@/hooks/useApiService';
import { toast } from 'sonner-native';
import { router } from 'expo-router';

interface ServiceRecord {
  _id: string;
  appointment_id: {
    customer_id: {
      _id: string;
      customerName: string;
      address?: string;
    };
    vehicle_id: {
      _id: string;
      vehicleName: string;
      model: string;
      plateNumber?: string;
    };
    center_id: {
      name: string;
      address: string;
    };
    status: string;
  };
  technician_id: {
    _id: string;
    name: string;
  };
  start_time: string | null;
  end_time: string | null;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceRecordsResponse {
  records: ServiceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type FilterStatus = 'all' | 'pending' | 'in-progress' | 'waiting-for-parts' | 'completed' | 'cancelled';

export default function TechnicianHomeScreen() {
  const api = useApiService();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [technicianId, setTechnicianId] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<FilterStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreRecords, setHasMoreRecords] = useState(true);
  const RECORDS_PER_PAGE = 10;

  const loadServiceRecords = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      console.log('📋 Loading service records... Page:', page);
      
      // First get technician profile to get the ID (only if not cached)
      let techId = technicianId;
      if (!techId) {
        const profileRes = await api.auth.getProfile();
        const profileData = (profileRes as any)?.data?.data || (profileRes as any)?.data;
        techId = profileData?._id;
        if (techId) {
          setTechnicianId(techId);
        }
      }
      
      if (techId) {
        // Get service records with pagination
        const res = await api.raw.get(`/service-records`, {
          params: {
            technician_id: techId,
            page: page,
            limit: RECORDS_PER_PAGE,
          }
        });
        const data: any = (res as any)?.data || res;
        const recordsData: ServiceRecordsResponse = data?.data || data;
        
        console.log('✅ Service records loaded:', recordsData);
        
        if (append) {
          setRecords(prev => [...prev, ...(recordsData.records || [])]);
        } else {
          setRecords(recordsData.records || []);
        }
        
        setTotalRecords(recordsData.total || 0);
        setHasMoreRecords(page < (recordsData.totalPages || 1));
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('❌ Error loading service records:', error);
      toast.error('Failed to load service records');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadServiceRecords();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    setHasMoreRecords(true);
    try {
      await loadServiceRecords(1, false);
      toast.success('Records refreshed!');
    } catch (error) {
      toast.error('Failed to refresh records');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreRecords && !isLoading) {
      const nextPage = currentPage + 1;
      console.log('🔄 Loading more records, page:', nextPage);
      loadServiceRecords(nextPage, true);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Filter records based on selected status
  const filteredRecords = useMemo(() => {
    if (selectedFilter === 'all') return records;
    return records.filter(record => 
      record.status.toLowerCase() === selectedFilter
    );
  }, [records, selectedFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      all: records.length,
      pending: records.filter(r => r.status.toLowerCase() === 'pending').length,
      'in-progress': records.filter(r => r.status.toLowerCase() === 'in-progress').length,
      'waiting-for-parts': records.filter(r => r.status.toLowerCase() === 'waiting-for-parts').length,
      completed: records.filter(r => r.status.toLowerCase() === 'completed').length,
      cancelled: records.filter(r => r.status.toLowerCase() === 'cancelled').length,
    };
  }, [records]);

  const getStatusConfig = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'completed':
        return { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' };
      case 'in-progress':
        return { bg: '#DBEAFE', text: '#1E40AF', icon: 'play-circle' };
      case 'pending':
        return { bg: '#FEF3C7', text: '#92400E', icon: 'time' };
      case 'waiting-for-parts':
        return { bg: '#FED7AA', text: '#9A3412', icon: 'cube' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', icon: 'help-circle' };
    }
  };

  const renderServiceRecord = ({ item }: { item: ServiceRecord }) => {
    const statusConfig = getStatusConfig(item.status);
    const customer = item.appointment_id?.customer_id;
    const vehicle = item.appointment_id?.vehicle_id;
    const center = item.appointment_id?.center_id;

    return (
      <TouchableOpacity 
        style={styles.recordCard} 
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: '/service-record-detail',
            params: { recordId: item._id }
          });
        }}
      >
        {/* Header */}
        <View style={styles.recordHeader}>
          <View style={styles.recordIconBox}>
            <Ionicons name="car-sport" size={24} color="#15803D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName} numberOfLines={1}>
              {vehicle?.vehicleName || 'Unknown Vehicle'}
            </Text>
            <Text style={styles.vehicleModel} numberOfLines={1}>
              {vehicle?.model} • {vehicle?.plateNumber || 'No Plate'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.text} />
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {customer?.customerName || 'Unknown Customer'}
          </Text>
        </View>

        {/* Center Info */}
        {center && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>
              {center.name}
            </Text>
          </View>
        )}

        {/* Time Info */}
        <View style={styles.timeContainer}>
          {item.start_time && (
            <View style={styles.timeRow}>
              <Ionicons name="play" size={14} color="#15803D" />
              <Text style={styles.timeLabel}>Start:</Text>
              <Text style={styles.timeValue}>{formatDate(item.start_time)}</Text>
            </View>
          )}
          {item.end_time && (
            <View style={styles.timeRow}>
              <Ionicons name="stop" size={14} color="#DC2626" />
              <Text style={styles.timeLabel}>End:</Text>
              <Text style={styles.timeValue}>{formatDate(item.end_time)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {item.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15803D" />
          <Text style={styles.loadingText}>Loading service records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Service Records</Text>
          <Text style={styles.subtitle}>{totalRecords} total • {filteredRecords.length} showing</Text>
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

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
          onPress={() => {
            setSelectedFilter('all');
            setCurrentPage(1);
            setHasMoreRecords(true);
          }}
        >
          <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.filterTabTextActive]} numberOfLines={1}>
            All
          </Text>
          <View style={[styles.filterBadge, selectedFilter === 'all' && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, selectedFilter === 'all' && styles.filterBadgeTextActive]} numberOfLines={1}>
              {statusCounts.all}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'pending' && styles.filterTabActive]}
          onPress={() => {
            setSelectedFilter('pending');
            setCurrentPage(1);
            setHasMoreRecords(true);
          }}
        >
          <Ionicons name="time" size={16} color={selectedFilter === 'pending' ? '#FFFFFF' : '#92400E'} style={{ flexShrink: 0 }} />
          <Text style={[styles.filterTabText, selectedFilter === 'pending' && styles.filterTabTextActive]} numberOfLines={1}>
            Pending
          </Text>
          <View style={[styles.filterBadge, selectedFilter === 'pending' && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, selectedFilter === 'pending' && styles.filterBadgeTextActive]} numberOfLines={1}>
              {statusCounts.pending}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'in-progress' && styles.filterTabActive]}
          onPress={() => {
            setSelectedFilter('in-progress');
            setCurrentPage(1);
            setHasMoreRecords(true);
          }}
        >
          <Ionicons name="play-circle" size={16} color={selectedFilter === 'in-progress' ? '#FFFFFF' : '#1E40AF'} style={{ flexShrink: 0 }} />
          <Text style={[styles.filterTabText, selectedFilter === 'in-progress' && styles.filterTabTextActive]} numberOfLines={1}>
            In Progress
          </Text>
          <View style={[styles.filterBadge, selectedFilter === 'in-progress' && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, selectedFilter === 'in-progress' && styles.filterBadgeTextActive]} numberOfLines={1}>
              {statusCounts['in-progress']}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'waiting-for-parts' && styles.filterTabActive]}
          onPress={() => {
            setSelectedFilter('waiting-for-parts');
            setCurrentPage(1);
            setHasMoreRecords(true);
          }}
        >
          <Ionicons name="cube" size={16} color={selectedFilter === 'waiting-for-parts' ? '#FFFFFF' : '#9A3412'} style={{ flexShrink: 0 }} />
          <Text style={[styles.filterTabText, selectedFilter === 'waiting-for-parts' && styles.filterTabTextActive]} numberOfLines={1}>
            Wait Parts
          </Text>
          <View style={[styles.filterBadge, selectedFilter === 'waiting-for-parts' && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, selectedFilter === 'waiting-for-parts' && styles.filterBadgeTextActive]} numberOfLines={1}>
              {statusCounts['waiting-for-parts']}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'completed' && styles.filterTabActive]}
          onPress={() => {
            setSelectedFilter('completed');
            setCurrentPage(1);
            setHasMoreRecords(true);
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color={selectedFilter === 'completed' ? '#FFFFFF' : '#065F46'} style={{ flexShrink: 0 }} />
          <Text style={[styles.filterTabText, selectedFilter === 'completed' && styles.filterTabTextActive]} numberOfLines={1}>
            Completed
          </Text>
          <View style={[styles.filterBadge, selectedFilter === 'completed' && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, selectedFilter === 'completed' && styles.filterBadgeTextActive]} numberOfLines={1}>
              {statusCounts.completed}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'cancelled' && styles.filterTabActive]}
          onPress={() => {
            setSelectedFilter('cancelled');
            setCurrentPage(1);
            setHasMoreRecords(true);
          }}
        >
          <Ionicons name="close-circle" size={16} color={selectedFilter === 'cancelled' ? '#FFFFFF' : '#991B1B'} style={{ flexShrink: 0 }} />
          <Text style={[styles.filterTabText, selectedFilter === 'cancelled' && styles.filterTabTextActive]} numberOfLines={1}>
            Cancelled
          </Text>
          <View style={[styles.filterBadge, selectedFilter === 'cancelled' && styles.filterBadgeActive]}>
            <Text style={[styles.filterBadgeText, selectedFilter === 'cancelled' && styles.filterBadgeTextActive]} numberOfLines={1}>
              {statusCounts.cancelled}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Records List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item._id}
        renderItem={renderServiceRecord}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#15803D']}
            tintColor="#15803D"
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color="#15803D" />
              <Text style={styles.loadMoreText}>Loading more...</Text>
            </View>
          ) : !hasMoreRecords && records.length > 0 ? (
            <View style={styles.endMessageContainer}>
              <Text style={styles.endMessageText}>No more records</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'all' ? 'No Service Records' : `No ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Records`}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'Your service records will appear here'
                : `No records with ${selectedFilter} status`}
            </Text>
          </View>
        }
      />
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
    paddingBottom: 12,
    backgroundColor: '#F0FDF4',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
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
  filterScrollView: {
    maxHeight: 80,
    backgroundColor: '#F0FDF4',
    paddingTop: 8,
  },
  filterContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 4,
    paddingBottom: 20,
    gap: 10,
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    minHeight: 44,
    flexShrink: 0,
  },
  filterTabActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginHorizontal: 2,
    flexShrink: 0,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  endMessageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endMessageText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  recordIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  timeContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  timeValue: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  descriptionText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

