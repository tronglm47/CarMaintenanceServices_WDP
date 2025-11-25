import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useApiService } from '@/hooks/useApiService';
import { toast } from 'sonner-native';
import { useAuth } from '@/contexts/AuthContext';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

interface ServiceRecordDetail {
  _id: string;
  appointment_id: {
    _id: string;
    customer_id: {
      _id: string;
      customerName: string;
      address?: string;
      dateOfBirth?: string;
    };
    vehicle_id: {
      _id: string;
      vehicleName: string;
      model: string;
      plateNumber?: string;
      mileage?: number;
    };
    center_id: {
      _id: string;
      name: string;
      address: string;
      phone: string;
    };
    slot_id: string;
    status: string;
    createdAt: string;
  };
  technician_id: {
    _id: string;
    name: string;
    userId: {
      email: string;
    };
  };
  start_time: string | null;
  end_time: string | null;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceChecklist {
  _id: string;
  name: string;
  category?: string;
  description?: string;
}

type ChecklistStatus = 'pending' | 'in-progress' | 'completed';

interface RecordChecklist {
  _id: string;
  status: ChecklistStatus;
  checklist_id?: ServiceChecklist | string;
  note?: string;
  defects?: RecordChecklistDefect[];
}

interface RecordChecklistDefect {
  _id: string;
  failureType?: FailureType;
  failure_type?: FailureType;
  failed_part_id?: AutoPart | string;
  failed_auto_part_id?: AutoPart | string;
  failed_component?: AutoPart | string;
  replacement_part_id?: AutoPart | string;
  replacement_auto_part_id?: AutoPart | string;
  replacement_component?: AutoPart | string;
  vehicle_part_id?: string | VehicleAutoPart;
  vehicle_part?: VehicleAutoPart;
  vehiclePart?: VehicleAutoPart;
  suggested_part_id?: string | AutoPart;
  suggested_part?: AutoPart;
  suggestedPart?: AutoPart;
  quantity?: number;
  description?: string;
}

interface AutoPart {
  _id: string;
  name: string;
  category?: string;
  selling_price?: number;
  price?: number;
  warranty_time?: string;
}

interface VehicleAutoPart {
  _id: string;
  autopart_id?: AutoPart | string;
  quantity?: number;
  available_quantity?: number;
  installed_quantity?: number;
  remaining_quantity?: number;
  serial_number?: string;
}

export enum FailureType {
  DAMAGED = 'DAMAGED',
  WORN_OUT = 'WORN_OUT',
  MANUFACTURER_DEFECT = 'MANUFACTURER_DEFECT',
}

const FAILURE_TYPE_OPTIONS = [
  { key: FailureType.DAMAGED, label: 'Damaged' },
  { key: FailureType.WORN_OUT, label: 'Worn out' },
  { key: FailureType.MANUFACTURER_DEFECT, label: 'Manufacturer defect' },
];

const CHECKLIST_STATUSES: ChecklistStatus[] = ['pending', 'in-progress', 'completed'];

export default function ServiceRecordDetailScreen() {
  const { recordId } = useLocalSearchParams();
  const api = useApiService();
  const { userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [record, setRecord] = useState<ServiceRecordDetail | null>(null);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [serviceChecklists, setServiceChecklists] = useState<ServiceChecklist[]>([]);
  const [recordChecklists, setRecordChecklists] = useState<RecordChecklist[]>([]);
  const [autoParts, setAutoParts] = useState<AutoPart[]>([]);
  const [vehicleParts, setVehicleParts] = useState<VehicleAutoPart[]>([]);
  const [addingChecklistId, setAddingChecklistId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [isDefectModalVisible, setIsDefectModalVisible] = useState(false);
  const [activeChecklist, setActiveChecklist] = useState<RecordChecklist | null>(null);
  const [defectForm, setDefectForm] = useState({
    vehiclePartId: '',
    suggestedPartId: '',
    failedPartId: '',
    replacementPartId: '',
    quantity: '1',
    failureType: FailureType.DAMAGED,
    description: '',
  });
  const [submittingDefect, setSubmittingDefect] = useState(false);
  const [selectedPartInfo, setSelectedPartInfo] = useState<{ autopart?: AutoPart; vehiclePart?: VehicleAutoPart } | null>(null);
  
  // Animation refs for swipe
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRecordDetail();
  }, [recordId]);

  useEffect(() => {
    loadChecklistData();
  }, [recordId]);

  const loadRecordDetail = async () => {
    try {
      console.log('📋 Loading record detail:', recordId);
      const res = await api.raw.get(`/service-records/${recordId}`);
      const data: any = (res as any)?.data || res;
      const recordData = data?.data || data;
      
      console.log('✅ Record detail loaded:', recordData);
      setRecord(recordData);
    } catch (error) {
      console.error('❌ Error loading record detail:', error);
      toast.error('Failed to load record detail');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current time (server will handle timezone)
  const getNowVN = () => {
    return new Date().toISOString();
  };

  const unwrapData = (payload: any) => {
    if (!payload) return payload;
    if (payload?.data !== undefined) return payload.data;
    return payload;
  };

  const extractArray = (raw: any): any[] => {
    const data = unwrapData(raw);
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.records)) return data.records;
    if (Array.isArray(data.parts)) return data.parts;
    if (Array.isArray(data.checklists)) return data.checklists;
    if (Array.isArray(data.items)) return data.items;
    return [];
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    try {
      return new Intl.NumberFormat('vi-VN').format(value);
    } catch {
      return String(value);
    }
  };

  const resolveChecklistName = (checklist: RecordChecklist) => {
    if (!checklist) return 'Checklist';
    if (typeof checklist.checklist_id === 'string') {
      const template = serviceChecklists.find((sc) => sc._id === checklist.checklist_id);
      return template?.name || 'Checklist';
    }
    return checklist.checklist_id?.name || 'Checklist';
  };

  const resolvePartName = (part: AutoPart | string | undefined) => {
    if (!part) return 'Auto Part';
    if (typeof part === 'string') {
      const match = autoParts.find((p) => p._id === part);
      if (match) return match.name || 'Auto Part';
      const vehicleMatch = vehicleParts.find((vp) => {
        if (typeof vp.autopart_id === 'string') return vp.autopart_id === part;
        return vp.autopart_id?._id === part;
      });
      if (vehicleMatch) {
        if (typeof vehicleMatch.autopart_id === 'string') return vehicleMatch.autopart_id;
        return vehicleMatch.autopart_id?.name || 'Auto Part';
      }
      return 'Auto Part';
    }
    return part.name || 'Auto Part';
  };

  const getDefectFailedPart = (defect?: RecordChecklistDefect) => {
    if (!defect) return undefined;
    // Check for vehicle_part_id first (new structure)
    if (defect.vehicle_part_id) {
      const vehiclePartId = typeof defect.vehicle_part_id === 'string' 
        ? defect.vehicle_part_id 
        : defect.vehicle_part_id._id;
      
      // Find in vehicleParts array
      const vehiclePart = vehicleParts.find(vp => vp._id === vehiclePartId);
      if (vehiclePart) {
        return vehiclePart.autopart_id; // Return the autopart reference
      }
    }
    
    // Fallback to old structure
    return defect.failed_part_id ||
      (defect as any)?.failedPart ||
      defect.failed_auto_part_id ||
      defect.failed_component ||
      defect.vehicle_part;
  };

  const getDefectReplacementPart = (defect?: RecordChecklistDefect) => {
    if (!defect) return undefined;
    // Check for suggested_part_id first (new structure)
    if (defect.suggested_part_id) {
      return defect.suggested_part_id;
    }
    
    // Fallback to old structure
    return defect.replacement_part_id ||
      (defect as any)?.replacementPart ||
      defect.replacement_auto_part_id ||
      defect.replacement_component;
  };

  const getVehiclePartDisplay = (part: VehicleAutoPart) => {
    const partData = part.autopart_id;
    const name =
      typeof partData === 'string'
        ? resolvePartName(partData)
        : partData?.name || 'Auto Part';
    const serial = part.serial_number ? ` • SN ${part.serial_number.slice(-6)}` : '';
    return `${name}${serial}`;
  };

  const getAutoPartDisplay = (part: AutoPart) => {
    const price = part.selling_price ?? part.price;
    const priceStr = price != null ? ` • ₫${formatCurrency(Number(price))}` : '';
    return `${part.name || 'Auto Part'}${priceStr}`;
  };

  // Update service record status
  const updateRecordStatus = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      const nowVN = getNowVN();
      
      const payload: any = {
        status: newStatus,
      };

      // Add start_time only when going from pending to in-progress
      if (newStatus === 'in-progress' && record?.status === 'pending') {
        payload.start_time = nowVN;
      }

      // Add end_time for completed status
      if (newStatus === 'completed') {
        payload.end_time = nowVN;
      }

      console.log('🔄 Updating record status:', { 
        recordId, 
        recordIdType: typeof recordId,
        payload,
        currentStatus: record?.status
      });
      
      const response = await api.serviceRecords.update(recordId as string, payload);
      console.log('✅ Update response:', response);
      
      toast.success(`Status updated to ${newStatus}!`);
      
      // Reload record detail
      await loadRecordDetail();
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      toast.error(`Failed to update: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const loadChecklistData = async () => {
    if (!recordId) return;
    const rid = String(recordId);
    try {
      setChecklistsLoading(true);
      const [serviceRes, recordChecklistRes, autoPartsRes, vehiclePartsRes] = await Promise.all([
        api.serviceChecklists?.getAll({ record_id: rid, limit: 100 }).catch((error) => {
          console.log('⚠️ service-checklists error:', error);
          return [];
        }),
        api.recordChecklists.getByRecord(rid).catch((error) => {
          console.log('⚠️ record-checklists error:', error);
          return [];
        }),
        api.autoParts.getAll({ limit: 200 }).catch((error) => {
          console.log('⚠️ auto-parts error:', error);
          return [];
        }),
        api.vehicleAutoParts?.getByRecord
          ? api.vehicleAutoParts.getByRecord(rid).catch((error) => {
              console.log('⚠️ vehicle-auto-parts error:', error);
              return [];
            })
          : Promise.resolve([]),
      ]);

      const serviceList = extractArray(serviceRes);
      const recordList = extractArray(recordChecklistRes);
      const autoPartList = extractArray(autoPartsRes);
      const vehiclePartList = extractArray(vehiclePartsRes);

      console.log('✅ Checklist payloads:', {
        serviceTemplates: serviceList.length,
        recordChecklists: recordList.length,
        autoParts: autoPartList.length,
        vehicleParts: vehiclePartList.length,
      });
      
      console.log('🔍 ALL Record Checklists:');
      recordList.forEach((rc: any, index: number) => {
        console.log(`  [${index}] ID: ${rc._id}`);
        console.log(`      Name: ${rc.checklist_id?.name || 'Unknown'}`);
        console.log(`      Status: ${rc.status}`);
      });
      
      if (recordList.length) {
        console.log('📝 Example record checklist:', JSON.stringify(recordList[0], null, 2));
      }

      // Fetch defects for each record checklist
      const recordListWithDefects = await Promise.all(
        recordList.map(async (rc: any) => {
          try {
            const defectsRes = await api.recordChecklists.getDefects(rc._id);
            const defectsList = extractArray(defectsRes);
            return {
              ...rc,
              defects: defectsList as RecordChecklistDefect[],
            };
          } catch (error) {
            console.warn(`⚠️ Error fetching defects for checklist ${rc._id}:`, error);
            return {
              ...rc,
              defects: [],
            };
          }
        })
      );

      console.log('📦 Setting state with recordListWithDefects:', recordListWithDefects.length);
      recordListWithDefects.forEach((rc: any, index: number) => {
        console.log(`  [${index}] ${rc.checklist_id?.name || 'Unknown'} - Defects: ${rc.defects?.length || 0}`);
      });

      setServiceChecklists(serviceList as ServiceChecklist[]);
      setRecordChecklists(recordListWithDefects as RecordChecklist[]);
      setAutoParts(autoPartList as AutoPart[]);
      setVehicleParts(vehiclePartList as VehicleAutoPart[]);
    } catch (error) {
      console.error('❌ Error loading checklist data:', error);
      toast.error('Failed to load checklist data');
    } finally {
      setChecklistsLoading(false);
    }
  };

  // Handle start work (pending -> in-progress)
  const handleStartWork = () => {
    if (isUpdating || record?.status !== 'pending') return;
    updateRecordStatus('in-progress');
  };

  // Handle swipe gesture for in-progress status
  const handleSwipeGesture = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX } = nativeEvent;
      const SWIPE_THRESHOLD = 100;

      // Reset animation
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(swipeOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (isUpdating) {
        return;
      }

      // In-progress status
      if (record?.status === 'in-progress') {
        if (translationX > SWIPE_THRESHOLD) {
          // Swipe right (left to right): Complete
          updateRecordStatus('completed');
        } else if (translationX < -SWIPE_THRESHOLD) {
          // Swipe left (right to left): Waiting for parts
          updateRecordStatus('waiting-for-parts');
        }
      }
      // Waiting-for-parts status
      else if (record?.status === 'waiting-for-parts') {
        if (translationX > SWIPE_THRESHOLD) {
          // Swipe right: Back to in-progress
          updateRecordStatus('in-progress');
        }
      }
    } else if (nativeEvent.state === State.ACTIVE) {
      const { translationX: tx } = nativeEvent;
      translateX.setValue(tx);
      swipeOpacity.setValue(Math.abs(tx) / 150);
    }
  };

  const handleAddChecklist = async (checklistId: string) => {
    if (!recordId || !checklistId) return;
    const rid = String(recordId);
    setAddingChecklistId(checklistId);
    try {
      await api.recordChecklists.create({
        record_id: rid,
        checklist_ids: [checklistId],
        status: 'pending',
      });
      toast.success('Checklist added to record');
      await loadChecklistData();
    } catch (error) {
      console.error('❌ Error adding checklist:', error);
      toast.error('Failed to add checklist');
    } finally {
      setAddingChecklistId(null);
    }
  };

  const handleChecklistStatusChange = async (checklistId: string, status: ChecklistStatus) => {
    if (!checklistId || !status || statusUpdatingId) return;
    setStatusUpdatingId(`${checklistId}-${status}`);
    try {
      await api.recordChecklists.updateStatus(checklistId, { status });
      toast.success('Checklist status updated');
      await loadChecklistData();
    } catch (error) {
      console.error('❌ Error updating checklist status:', error);
      toast.error('Failed to update checklist status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openDefectModal = (checklist: RecordChecklist) => {
    setActiveChecklist(checklist);
    setDefectForm({
      vehiclePartId: '',
      suggestedPartId: '',
      failedPartId: '',
      replacementPartId: '',
      quantity: '1',
      failureType: FailureType.DAMAGED,
      description: '',
    });
    setSelectedPartInfo(null);
    setIsDefectModalVisible(true);
  };

  const closeDefectModal = () => {
    setIsDefectModalVisible(false);
    setActiveChecklist(null);
  };

  const handleSelectReplacementPart = async (partId: string) => {
    // Update form immediately
    setDefectForm((prev) => ({
      ...prev,
      replacementPartId: partId,
      suggestedPartId: partId,
    }));

    // Fetch auto part details
    try {
      const partData = await api.autoParts.getById(partId);
      const part = partData?.data || partData;
      
      // Find corresponding vehicle auto part
      const vehicleAutoPart = vehicleParts.find((vp) => {
        const vpPartId = typeof vp.autopart_id === 'string' ? vp.autopart_id : vp.autopart_id?._id;
        return vpPartId === partId;
      });

      setSelectedPartInfo({
        autopart: part,
        vehiclePart: vehicleAutoPart,
      });

      console.log('✅ Selected autopart:', {
        part,
        vehicleAutoPart,
        availableQty: vehicleAutoPart?.quantity || vehicleAutoPart?.available_quantity,
      });
    } catch (error) {
      console.error('❌ Error fetching autopart:', error);
      toast.error('Failed to load part details');
    }
  };

  const handleSubmitDefect = async () => {
    if (!activeChecklist) return;
    const checklistId = activeChecklist._id;
    
    // Validate: must select failed part (vehicle part)
    if (!defectForm.failedPartId) {
      toast.error('Please select failed component');
      return;
    }
    
    // Validate: must select replacement part (suggested part)
    if (!defectForm.replacementPartId) {
      toast.error('Please select replacement part');
      return;
    }
    
    const quantityNumber = Math.max(1, Number(defectForm.quantity) || 1);

    // Get vehicle part info for validation
    const failedVehiclePart = vehicleParts.find((vp) => vp._id === defectForm.failedPartId);
    
    if (!failedVehiclePart) {
      toast.error('Failed part not found in vehicle inventory');
      return;
    }

    // Validate quantity against available stock
    const availableQty = failedVehiclePart.quantity || failedVehiclePart.available_quantity || 0;
    if (quantityNumber > availableQty) {
      toast.error(
        `Quantity exceeds available stock. Available: ${availableQty}, Requested: ${quantityNumber}`
      );
      return;
    }

    // Build payload with correct field names
    const payload = {
      vehicle_part_id: defectForm.failedPartId,      // ID của vehicle part bị hỏng
      suggested_part_id: defectForm.replacementPartId, // ID của autopart thay thế
      quantity: quantityNumber,
      failure_type: defectForm.failureType || FailureType.WORN_OUT, // Keep UPPERCASE as backend expects
      description: defectForm.description,
    };

    console.log('═══════════════════════════════════════');
    console.log('📤 DEFECT SUBMISSION');
    console.log('═══════════════════════════════════════');
    console.log('Checklist ID:', checklistId);
    console.log('Payload Structure:', {
      vehicle_part_id: payload.vehicle_part_id,
      suggested_part_id: payload.suggested_part_id,
      quantity: payload.quantity,
      failure_type: payload.failure_type,
      description: payload.description
    });
    console.log('Full Payload:', JSON.stringify(payload, null, 2));
    console.log('═══════════════════════════════════════');

    try {
      setSubmittingDefect(true);
      const response = await api.recordChecklists.addDefect(checklistId, payload);
      
      console.log('═══════════════════════════════════════');
      console.log('✅ DEFECT RESPONSE');
      console.log('═══════════════════════════════════════');
      console.log('Response:', response);
      console.log('Response.success:', response?.success);
      console.log('Response.message:', response?.message);
      console.log('Response.data:', response?.data);
      console.log('Response Structure:', {
        hasResponse: !!response,
        hasSuccess: response?.success !== undefined,
        hasData: !!response?.data,
        hasDefect: !!response?.data?.defect,
        hasNewDefect: !!response?.data?.newDefect,
        keys: response ? Object.keys(response) : [],
        dataKeys: response?.data ? Object.keys(response.data) : []
      });
      console.log('Full Response:', JSON.stringify(response, null, 2));
      console.log('═══════════════════════════════════════');
      
      // Check if request was successful
      if (!response) {
        console.error('❌ Response is null or undefined');
        throw new Error('No response received from server');
      }
      
      if (response.success === false) {
        console.error('❌ Response indicates failure:', response.message);
        throw new Error(response.message || 'Failed to add defect');
      }
      
      if (response.success === undefined) {
        console.warn('⚠️ Response.success is undefined - treating as success if status is ok');
        // Backend might return 201 without proper ApiResponse structure
        // Continue if we have any response
      }
      
      console.log('✅ Defect creation assumed successful');
      toast.success(response.message || 'Defect recorded successfully');
      closeDefectModal();
      
      // Reload checklist data to get updated defects list
      console.log('🔄 Reloading checklist data...');
      await loadChecklistData();
      console.log('✅ Checklist data reloaded');
    } catch (error) {
      console.log('═══════════════════════════════════════');
      console.error('❌ DEFECT ERROR');
      console.log('═══════════════════════════════════════');
      console.error('Error Details:', error);
      console.error('Error Message:', (error as any)?.message);
      console.error('Error Response:', (error as any)?.response?.data);
      console.error('Error Stack:', (error as any)?.stack);
      console.log('═══════════════════════════════════════');
      
      const errorMsg = (error as any)?.message || 
                      (error as any)?.response?.data?.message || 
                      'Failed to add defect';
      toast.error(errorMsg);
    } finally {
      setSubmittingDefect(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDateShort = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15803D" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#15803D" />
          </TouchableOpacity>
          <Text style={styles.title}>Record Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#DC2626" />
          <Text style={styles.errorText}>Record not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(record.status);
  const customer = record.appointment_id?.customer_id;
  const vehicle = record.appointment_id?.vehicle_id;
  const center = record.appointment_id?.center_id;
  const addedChecklistIds = new Set(
    recordChecklists.map((item) =>
      typeof item.checklist_id === 'string'
        ? item.checklist_id
        : item.checklist_id?._id || ''
    )
  );
  const availableChecklists = serviceChecklists.filter(
    (item) => item?._id && !addedChecklistIds.has(item._id)
  );

  const normalizeDefects = (source: any): RecordChecklistDefect[] => {
    if (!source) return [];
    if (Array.isArray(source)) {
      console.log(`📋 Normalizing ${source.length} defects:`, source);
      return source as RecordChecklistDefect[];
    }
    if (typeof source === 'object') {
      const values = Object.values(source) as RecordChecklistDefect[];
      console.log(`📋 Normalizing defects from object:`, values);
      return values;
    }
    return [];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Service Record</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Vehicle Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-sport" size={22} color="#15803D" />
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle Name</Text>
              <Text style={styles.infoValue}>{vehicle?.vehicleName || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Model</Text>
              <Text style={styles.infoValue}>{vehicle?.model || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License Plate</Text>
              <Text style={styles.infoValue}>{vehicle?.plateNumber || 'N/A'}</Text>
            </View>
            {vehicle?.mileage !== undefined && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mileage</Text>
                  <Text style={styles.infoValue}>{vehicle.mileage} km</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#15803D" />
            <Text style={styles.sectionTitle}>Customer Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{customer?.customerName || 'N/A'}</Text>
            </View>
            {customer?.address && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                    {customer.address}
                  </Text>
                </View>
              </>
            )}
            {customer?.dateOfBirth && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  <Text style={styles.infoValue}>{formatDateShort(customer.dateOfBirth)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Service Center */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={20} color="#15803D" />
            <Text style={styles.sectionTitle}>Service Center</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Center Name</Text>
              <Text style={styles.infoValue}>{center?.name || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                {center?.address || 'N/A'}
              </Text>
            </View>
            {center?.phone && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{center.phone}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Time Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color="#15803D" />
            <Text style={styles.sectionTitle}>Time Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.timeItem}>
              <View style={styles.timeIconBox}>
                <Ionicons name="play-circle" size={20} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <Text style={styles.timeValue}>{formatDate(record.start_time)}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.timeItem}>
              <View style={styles.timeIconBox}>
                <Ionicons name="stop-circle" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>End Time</Text>
                <Text style={styles.timeValue}>{formatDate(record.end_time)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {record.description && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#15803D" />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.descriptionText}>
                {record.description || 'No description provided'}
              </Text>
            </View>
          </View>
        )}

        {/* Technician Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct" size={20} color="#15803D" />
            <Text style={styles.sectionTitle}>Technician</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{record.technician_id?.name || 'N/A'}</Text>
            </View>
            {record.technician_id?.userId?.email && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{record.technician_id.userId.email}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Checklist Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="clipboard" size={20} color="#15803D" />
            <Text style={styles.sectionTitle}>Inspection Checklist</Text>
          </View>

          {checklistsLoading ? (
            <View style={styles.loadingMini}>
              <ActivityIndicator color="#15803D" />
              <Text style={styles.loadingText}>Loading checklist data...</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionSubHeader}>
                <Text style={styles.sectionSubTitle}>Available categories</Text>
                <TouchableOpacity style={styles.refreshPill} onPress={loadChecklistData}>
                  <Ionicons name="refresh" size={16} color="#15803D" />
                  <Text style={styles.refreshPillText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {serviceChecklists.length === 0 ? (
                <View style={styles.emptyBadge}>
                  <Ionicons name="information-circle" size={18} color="#15803D" />
                  <Text style={styles.emptyBadgeText}>
                    No checklist categories returned for this record. Tap Refresh to retry.
                  </Text>
                </View>
              ) : availableChecklists.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.templateScroll}
                  contentContainerStyle={styles.templateContainer}
                >
                  {availableChecklists.map((checklist) => (
                    <View key={checklist._id} style={styles.templateCard}>
                      <Text style={styles.templateTitle}>{checklist.name}</Text>
                      {checklist.category && (
                        <Text style={styles.templateCategory}>{checklist.category}</Text>
                      )}
                      {checklist.description && (
                        <Text style={styles.templateDescription} numberOfLines={3}>
                          {checklist.description}
                        </Text>
                      )}
                      {userRole === 'TECHNICIAN' && (
                        <TouchableOpacity
                          style={styles.templateButton}
                          onPress={() => handleAddChecklist(checklist._id)}
                          disabled={addingChecklistId === checklist._id}
                        >
                          {addingChecklistId === checklist._id ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                              <Text style={styles.templateButtonText}>Add to record</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                  <Text style={styles.emptyBadgeText}>All categories already added</Text>
                </View>
              )}

              <View style={[styles.sectionSubHeader, { marginTop: 24 }]}>
                <Text style={styles.sectionSubTitle}>Record Checklists</Text>
              </View>

              {(() => {
                console.log('🎨 RENDERING Record Checklists:', recordChecklists.length);
                recordChecklists.forEach((rc: any, idx: number) => {
                  console.log(`  [${idx}] ${resolveChecklistName(rc)}`);
                });
                return null;
              })()}

              {recordChecklists.length === 0 ? (
                <Text style={styles.emptyText}>
                  No checklist has been attached yet. Please add one from the list above.
                </Text>
              ) : (
                recordChecklists.map((checklist) => {
                  const checklistName = resolveChecklistName(checklist);
                  const checklistStatus = checklist.status || 'pending';
                  const rawDefects =
                    (checklist as any)?.defects ??
                    (checklist as any)?.defect_items ??
                    (checklist as any)?.defectItems ??
                    (checklist as any)?.issues ??
                    [];
                  const defects = normalizeDefects(rawDefects);
                  return (
                    <View key={checklist._id} style={styles.recordChecklistCard}>
                      <View style={styles.recordChecklistHeader}>
                        <Text style={styles.recordChecklistTitle}>{checklistName}</Text>
                      </View>

                      {checklist.note && (
                        <Text style={styles.checklistNote}>{checklist.note}</Text>
                      )}

                      {userRole === 'TECHNICIAN' && (
                        <View style={styles.statusChipGroup}>
                          {CHECKLIST_STATUSES.map((status) => {
                            const isActive = status === checklistStatus;
                            const isBusy = statusUpdatingId === `${checklist._id}-${status}`;
                            return (
                              <TouchableOpacity
                                key={status}
                                style={[
                                  styles.statusChip,
                                  isActive && styles.statusChipActive,
                                ]}
                                onPress={() => handleChecklistStatusChange(checklist._id, status)}
                                disabled={isBusy}
                              >
                                {isBusy ? (
                                  <ActivityIndicator size="small" color={isActive ? '#FFFFFF' : '#15803D'} />
                                ) : (
                                  <Text
                                    style={[
                                      styles.statusChipText,
                                      isActive && styles.statusChipTextActive,
                                    ]}
                                  >
                                    {status.replace('-', ' ')}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}

                      <View style={styles.defectHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="bug-outline" size={20} color="#15803D" />
                          <Text style={styles.sectionSubTitle}>Defects</Text>
                        </View>
                        {userRole === 'TECHNICIAN' && (
                          <TouchableOpacity
                            style={styles.addDefectButton}
                            onPress={() => openDefectModal(checklist)}
                          >
                            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.addDefectButtonText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {defects.length === 0 ? (
                        <View style={{ 
                          padding: 16, 
                          backgroundColor: '#F0FDF4', 
                          borderRadius: 10, 
                          marginTop: 12,
                          borderWidth: 1,
                          borderColor: '#BBF7D0',
                          borderStyle: 'dashed'
                        }}>
                          <Text style={[styles.emptyText, { textAlign: 'center', color: '#15803D' }]}>
                            No defects recorded yet
                          </Text>
                        </View>
                      ) : (
                        defects.map((defect, index) => (
                          <View key={defect._id || `defect-${index}`} style={styles.defectCard}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <View style={{ 
                                  width: 32, 
                                  height: 32, 
                                  borderRadius: 16, 
                                  backgroundColor: '#DCFCE7',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Ionicons name="warning" size={18} color="#15803D" />
                                </View>
                                <Text style={styles.defectLabel}>
                                  {defect.failureType || defect.failure_type || 'Unknown Issue'}
                                </Text>
                              </View>
                              <View style={{ 
                                backgroundColor: '#DCFCE7', 
                                paddingHorizontal: 10, 
                                paddingVertical: 4, 
                                borderRadius: 8 
                              }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>
                                  Qty: {defect.quantity || 1}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.defectDetails}>
                              <View style={styles.defectRow}>
                                <Text style={styles.defectLabelSmall}>Failed:</Text>
                                <Text style={styles.defectValueSmall}>
                                  {resolvePartName(getDefectFailedPart(defect))}
                                </Text>
                              </View>

                              <View style={[styles.defectRow, { marginTop: 6 }]}>
                                <Ionicons name="arrow-forward" size={14} color="#15803D" />
                                <Text style={[styles.defectLabelSmall, { color: '#15803D' }]}>Replace with:</Text>
                                <Text style={[styles.defectValueSmall, { color: '#15803D', fontWeight: '600' }]}>
                                  {resolvePartName(getDefectReplacementPart(defect))}
                                </Text>
                              </View>

                              {defect.description && (
                                <Text style={styles.defectDescription}>
                                  {defect.description}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>

        {/* Action Buttons for Technician */}
        {userRole === 'TECHNICIAN' && (
          <View style={styles.actionSection}>
            {/* Pending: Show Start Work Button */}
            {record.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={handleStartWork}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Start Work</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* In-Progress: Show Swipeable Card */}
            {record.status === 'in-progress' && (
              <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.swipeContainer}>
                  {/* Left hint: Complete */}
                  <Animated.View style={[styles.swipeHintLeft, { opacity: swipeOpacity }]}>
                    <Ionicons name="checkmark-circle" size={32} color="#15803D" />
                    <Text style={styles.swipeHintText}>Complete</Text>
                  </Animated.View>

                  {/* Right hint: Waiting for Parts */}
                  <Animated.View style={[styles.swipeHintRight, { opacity: swipeOpacity }]}>
                    <Text style={styles.swipeHintText}>Wait Parts</Text>
                    <Ionicons name="cube" size={32} color="#9A3412" />
                  </Animated.View>

                  {/* Swipeable Card */}
                  <PanGestureHandler onHandlerStateChange={handleSwipeGesture} onGestureEvent={handleSwipeGesture}>
                    <Animated.View style={[styles.swipeCard, { transform: [{ translateX }] }]}>
                      <Ionicons name="swap-horizontal" size={24} color="#1E40AF" />
                      <Text style={styles.swipeCardText}>In Progress</Text>
                      <Text style={styles.swipeCardHint}>← Swipe to change status →</Text>
                    </Animated.View>
                  </PanGestureHandler>
                </View>
              </GestureHandlerRootView>
            )}

            {/* Waiting for Parts: Show Swipeable Card */}
            {record.status === 'waiting-for-parts' && (
              <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.swipeContainer}>
                  {/* Left hint: Resume */}
                  <Animated.View style={[styles.swipeHintLeft, { opacity: swipeOpacity }]}>
                    <Ionicons name="play-circle" size={32} color="#1E40AF" />
                    <Text style={styles.swipeHintText}>Resume</Text>
                  </Animated.View>

                  {/* Swipeable Card */}
                  <PanGestureHandler onHandlerStateChange={handleSwipeGesture} onGestureEvent={handleSwipeGesture}>
                    <Animated.View style={[styles.swipeCard, styles.swipeCardWaiting, { transform: [{ translateX }] }]}>
                      <Ionicons name="cube" size={24} color="#9A3412" />
                      <Text style={[styles.swipeCardText, { color: '#9A3412' }]}>Waiting for Parts</Text>
                      <Text style={styles.swipeCardHint}>Swipe right to resume →</Text>
                    </Animated.View>
                  </PanGestureHandler>
                </View>
              </GestureHandlerRootView>
            )}

            {/* Completed: Show Badge */}
            {record.status === 'completed' && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#15803D" />
                <Text style={styles.completedText}>Service Completed</Text>
              </View>
            )}

            {/* Cancelled: Show Badge */}
            {record.status === 'cancelled' && (
              <View style={styles.cancelledBadge}>
                <Ionicons name="close-circle" size={24} color="#DC2626" />
                <Text style={styles.cancelledText}>Service Cancelled</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Defect Modal */}
      <Modal visible={isDefectModalVisible} animationType="slide" transparent>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={closeDefectModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                {/* Handle bar indicator */}
                <View style={{ alignItems: 'center', paddingBottom: 12 }}>
                  <View style={{ width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3 }} />
                </View>
                
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {activeChecklist ? `Add Defect` : 'Add Defect'}
                  </Text>
                  <TouchableOpacity onPress={closeDefectModal}>
                    <Ionicons name="close-circle" size={28} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                {activeChecklist && (
                  <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16, marginTop: -8 }}>
                    {resolveChecklistName(activeChecklist)}
                  </Text>
                )}

                <ScrollView
                  style={{ maxHeight: 480 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.modalLabel}>Failed component</Text>
                  {vehicleParts.length === 0 ? (
                    <Text style={styles.emptyText}>No installed parts found for this record.</Text>
                  ) : (
                    <View style={styles.selectorWrapper}>
                      {vehicleParts.map((part) => {
                        const id = part._id; // Vehicle part's own ID
                        const isSelected = defectForm.failedPartId === id;
                        return (
                          <TouchableOpacity
                            key={id}
                            style={[styles.selectorPill, isSelected && styles.selectorPillActive]}
                            onPress={() =>
                              setDefectForm((prev) => ({
                                ...prev,
                                failedPartId: id,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.selectorText,
                                isSelected && styles.selectorTextActive,
                              ]}
                            >
                              {getVehiclePartDisplay(part)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>Replacement part</Text>
                {autoParts.length === 0 ? (
                  <Text style={styles.emptyText}>No auto parts available.</Text>
                ) : (
                  <View style={styles.selectorWrapper}>
                    {autoParts.map((part) => {
                      const id = part._id;
                      const isSelected = defectForm.replacementPartId === id;
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.selectorPill, isSelected && styles.selectorPillActive]}
                          onPress={() => handleSelectReplacementPart(id)}
                        >
                          <Text
                            style={[
                              styles.selectorText,
                              isSelected && styles.selectorTextActive,
                            ]}
                          >
                            {getAutoPartDisplay(part)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>Failure type</Text>
                <View style={styles.selectorWrapper}>
                  {FAILURE_TYPE_OPTIONS.map((option) => {
                    const isSelected = defectForm.failureType === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.selectorPill, isSelected && styles.selectorPillActive]}
                        onPress={() =>
                          setDefectForm((prev) => ({ ...prev, failureType: option.key }))
                        }
                      >
                        <Text
                          style={[
                            styles.selectorText,
                            isSelected && styles.selectorTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Quantity</Text>
                    {selectedPartInfo?.vehiclePart && (
                      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                        Available: {selectedPartInfo.vehiclePart.quantity || selectedPartInfo.vehiclePart.available_quantity || 0}
                      </Text>
                    )}
                    <TextInput
                      style={styles.input}
                      inputMode="numeric"
                      placeholder="1"
                      value={defectForm.quantity}
                      onChangeText={(text) =>
                        setDefectForm((prev) => ({ ...prev, quantity: text }))
                      }
                    />
                  </View>
                </View>

                <Text style={styles.modalLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, { height: 100 }]}
                  placeholder="Describe the damage or additional notes"
                  value={defectForm.description}
                  onChangeText={(text) =>
                    setDefectForm((prev) => ({ ...prev, description: text }))
                  }
                  multiline
                />
              </ScrollView>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitDefect}
                disabled={submittingDefect}
              >
                {submittingDefect ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Save defect</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F1F5F9',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  loadingMini: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
    backgroundColor: '#F1F5F9',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionSubTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  refreshPillText: {
    color: '#15803D',
    fontWeight: '600',
    fontSize: 13,
  },
  templateScroll: {
    marginHorizontal: -4,
  },
  templateContainer: {
    paddingHorizontal: 4,
    gap: 12,
  },
  templateCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  templateCategory: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  templateDescription: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  templateButton: {
    marginTop: 12,
    backgroundColor: '#15803D',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  templateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
  },
  emptyBadgeText: {
    color: '#065F46',
    fontWeight: '600',
  },
  recordChecklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recordChecklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recordChecklistTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  checklistNote: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  statusChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statusChipActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'capitalize',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  defectHeader: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addDefectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#15803D',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addDefectButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  defectCard: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F0FDF4',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  defectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  defectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  defectValue: {
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 2,
    fontWeight: '500',
  },
  defectDescription: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    marginTop: 16,
  },
  selectorWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectorPillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#15803D',
  },
  selectorText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectorTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#15803D',
    borderRadius: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  timeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  descriptionText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  startButton: {
    backgroundColor: '#1E40AF',
  },
  completeButton: {
    backgroundColor: '#15803D',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#15803D',
  },
  completedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  cancelledText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  swipeContainer: {
    position: 'relative',
    height: 80,
    marginVertical: 8,
  },
  swipeCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#DBEAFE',
    borderRadius: 20,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  swipeCardWaiting: {
    backgroundColor: '#FED7AA',
    borderColor: '#9A3412',
  },
  swipeCardText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  swipeCardHint: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  swipeHintLeft: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 0,
  },
  swipeHintRight: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 0,
  },
  swipeHintText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  defectBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defectDetails: {
    gap: 0,
  },
  defectLabelSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 110,
  },
  defectValueSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
});

