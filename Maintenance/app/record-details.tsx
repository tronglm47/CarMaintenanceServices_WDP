import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useApiService } from '@/hooks/useApiService';

export default function RecordDetailsScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const api = useApiService();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [raw, setRaw] = useState<any>(null);
  const [checklistsByRecord, setChecklistsByRecord] = useState<Record<string, any[]>>({});
  const [vehicleNameById, setVehicleNameById] = useState<Record<string, string>>({});
  const [centerNameById, setCenterNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.serviceRecords.getAll({ appointment_id: appointmentId });
        const payload: any = (res as any)?.data ?? res;
        const list: any[] = Array.isArray(payload?.records)
          ? payload.records
          : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : [];
        if (alive) {
          setRecords(list);
          setRaw(payload);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [appointmentId]);

  useEffect(() => {
    let alive = true;
    const fetchChecklists = async () => {
      try {
        const entries = await Promise.all(
          records.map(async (rec) => {
            const rid = rec?._id || rec?.id || rec?.record_id;
            if (!rid) return [null, []] as const;
            try {
              const res = await api.recordChecklists.getByRecord(String(rid));
              const payload: any = (res as any)?.data ?? res;
              const list: any[] = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
              return [String(rid), list] as const;
            } catch { return [String(rid), []] as const; }
          })
        );
        if (!alive) return;
        const map: Record<string, any[]> = {};
        for (const [rid, list] of entries) {
          if (rid) map[rid] = list || [];
        }
        setChecklistsByRecord(map);
      } catch {}
    };
    if (records.length) fetchChecklists();
    return () => { alive = false; };
  }, [records]);

  // Resolve vehicle and center names by ID if not present in record payloads
  useEffect(() => {
    let alive = true;
    const getId = (val: any): string | undefined => {
      if (!val) return undefined;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        return val._id || val.id;
      }
      return undefined;
    };
    const fetchMissing = async () => {
      const vehicleIds = new Set<string>();
      const centerIds = new Set<string>();

      for (const rec of records) {
        const vId = getId(rec?.vehicle_id) || getId(rec?.vehicle);
        const cId = getId(rec?.center_id) || getId(rec?.center);
        if (vId && !vehicleNameById[vId]) vehicleIds.add(vId);
        if (cId && !centerNameById[cId]) centerIds.add(cId);
      }

      try {
        // Fetch vehicles
        const vEntries = await Promise.all(
          Array.from(vehicleIds).map(async (id) => {
            try {
              const res = await api.vehicles.getById(id);
              const data: any = (res as any)?.data ?? res;
              const name = data?.vehicleName || data?.name || data?.model || '';
              return [id, name] as const;
            } catch { return [id, ''] as const; }
          })
        );
        // Fetch centers
        const cEntries = await Promise.all(
          Array.from(centerIds).map(async (id) => {
            try {
              const res = await api.centers.getById(id);
              const data: any = (res as any)?.data ?? res;
              const name = data?.name || data?.centerName || '';
              return [id, name] as const;
            } catch { return [id, ''] as const; }
          })
        );
        if (!alive) return;
        if (vEntries.length) {
          setVehicleNameById((prev) => {
            const next = { ...prev };
            for (const [id, name] of vEntries) if (name) next[id] = name;
            return next;
          });
        }
        if (cEntries.length) {
          setCenterNameById((prev) => {
            const next = { ...prev };
            for (const [id, name] of cEntries) if (name) next[id] = name;
            return next;
          });
        }
      } catch {}
    };
    if (records.length) fetchMissing();
    return () => { alive = false; };
  }, [records, api, vehicleNameById, centerNameById]);

  const formatVnd = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    try {
      return new Intl.NumberFormat('vi-VN').format(value);
    } catch {
      return String(value);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}>
        {loading ? (
          <Text style={{ textAlign: 'center', color: '#666' }}>Loading...</Text>
        ) : records.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#666' }}>No record data</Text>
        ) : (
          records.map((rec: any, idx: number) => {
            const title = rec?.name || rec?.title || `Record ${idx + 1}`;
            const status = (rec?.status || '').toString().toLowerCase();
            const items: any[] =
              Array.isArray(rec?.items) ? rec.items : Array.isArray(rec?.parts) ? rec.parts : [];

            // Extract entities (tolerant to different shapes)
            const customer = rec?.customer_id || rec?.customer || rec?.appointment?.customer || rec?.appointment_id?.customer_id || {};
            const vehicle = rec?.vehicle_id || rec?.vehicle || rec?.appointment?.vehicle || rec?.appointment_id?.vehicle_id || {};
            let center = rec?.center_id || rec?.center || rec?.appointment?.center || rec?.appointment_id?.center_id || {};
            const technician = rec?.technician_id || rec?.technician || rec?.appointment?.technician || {};
            const email =
              technician?.email ||
              technician?.userId?.email ||
              technician?.user?.email ||
              '';

            // helpers
            const formatDate = (iso?: string) => {
              if (!iso) return '';
              try {
                const d = new Date(iso);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
              } catch {
                return iso;
              }
            };

            const pick = (obj: any, keys: string[]) => {
              for (const k of keys) {
                const v = obj?.[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') return v;
              }
              return undefined;
            };

            // Resolve fields with multiple fallbacks (and deep scan if needed)
            const resolve = (primary: any, fallbacks: any[], keys: string[]) => {
              const firstPass = pick(primary, keys);
              if (firstPass !== undefined) return firstPass;
              for (const fb of fallbacks) {
                const v = pick(fb, keys);
                if (v !== undefined) return v;
              }
              // Deep scan as last resort
              const visited = new Set<any>();
              const stack = [rec];
              while (stack.length) {
                const o = stack.pop();
                if (!o || typeof o !== 'object' || visited.has(o)) continue;
                visited.add(o);
                const val = pick(o, keys);
                if (val !== undefined) return val;
                for (const v of Object.values(o)) if (typeof v === 'object') stack.push(v);
              }
              return undefined;
            };
            return (
              <View key={idx} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  {!!status && (
                    <View
                      style={[
                        styles.badge,
                        status === 'completed'
                          ? { backgroundColor: '#E8F5E8' }
                          : status === 'pending'
                          ? { backgroundColor: '#FEF3C7' }
                          : { backgroundColor: '#E5E7EB' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          status === 'completed'
                            ? { color: '#22C55E' }
                            : status === 'pending'
                            ? { color: '#B45309' }
                            : { color: '#374151' },
                        ]}
                      >
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Customer Section */}
                <Text style={styles.sectionTitle}>Customer</Text>
                <View style={styles.section}>
                  {renderRow('Name', resolve(customer, [rec], ['customerName', 'name']))}
                  {renderRow('Address', resolve(customer, [rec], ['address']))}
                  {renderRow('Date of Birth', formatDate(resolve(customer, [rec], ['dateOfBirth', 'dob']) as string))}
                </View>

                {/* Vehicle Section */}
                <Text style={styles.sectionTitle}>Vehicle</Text>
                <View style={styles.section}>
                  {renderRow('Vehicle Name', resolve(vehicle, [rec], ['vehicleName']) || vehicleNameById[(vehicle as any)?._id || (vehicle as any)?.id || ''])}
                  {renderRow('Model', resolve(vehicle, [rec], ['model']))}
                  {renderRow('Mileage', String(resolve(vehicle, [rec], ['mileage']) ?? ''))}
                  {renderRow('Plate Number', resolve(vehicle, [rec], ['plateNumber', 'licensePlate']))}
                </View>

                {/* Service Center Section */}
                <Text style={styles.sectionTitle}>Service Center</Text>
                <View style={styles.section}>
                  {renderRow('Center Name', resolve(center, [rec], ['name', 'centerName']) || centerNameById[(center as any)?._id || (center as any)?.id || ''])}
                  {renderRow('Address', resolve(center, [rec], ['address']))}
                  {renderRow('Phone Number', resolve(center, [rec], ['phone', 'phoneNumber']))}
                </View>

                {/* Technician Section */}
                <Text style={styles.sectionTitle}>Technician</Text>
                <View style={styles.section}>
                  {renderRow('Name', resolve(technician, [rec], ['name']))}
                  {renderRow('Email', email || resolve(technician, [rec], ['email']))}
                </View>

                {/* Checklist Section */}
                {(() => {
                  const rid = String(rec?._id || rec?.id || rec?.record_id || '');
                  const lists = checklistsByRecord[rid] || [];
                  if (!lists.length) return null;
                  return (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.sectionTitle}>Checklist</Text>
                      {lists.map((it: any, idx2: number) => {
                        const cname = it?.checklist_id?.name || `Checklist ${idx2 + 1}`;
                        const cstatus = String(it?.status || '').toLowerCase();
                        const note = it?.note || '';
                        const suggests: any[] = Array.isArray(it?.suggest) ? it.suggest : [];
                        return (
                          <View key={idx2} style={styles.checkCard}>
                            <View style={styles.checkHeader}>
                              <Text style={styles.checkTitle}>{cname}</Text>
                              {!!cstatus && (
                                <View style={[styles.badge, cstatus === 'completed' ? { backgroundColor: '#E8F5E8' } : cstatus === 'pending' ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#E5E7EB' }]}>
                                  <Text style={[styles.badgeText, cstatus === 'completed' ? { color: '#22C55E' } : cstatus === 'pending' ? { color: '#B45309' } : { color: '#374151' }]}>
                                    {cstatus.toUpperCase()}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {note ? <Text style={styles.noteText}>{note}</Text> : null}
                            {suggests.length > 0 && (
                              <View style={{ marginTop: 6 }}>
                                <Text style={styles.subTitle}>Suggest Parts</Text>
                                {suggests.map((s: any, k: number) => {
                                  const part = s?.part_id?.part_id || s?.part || {};
                                  const pname = part?.name || 'Part';
                                  const q = s?.quantity ?? '';
                                  const price = part?.selling_price ?? part?.price;
                                  return (
                                    <View key={k} style={styles.itemRow}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{pname}</Text>
                                        <Text style={styles.itemMeta}>
                                          {q !== '' ? `Qty: ${q}` : ''}
                                          {price != null ? `  Price: ${formatVnd(Number(price))} VNĐ` : ''}
                                        </Text>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}

                {items.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.sectionTitle}>Parts/Items</Text>
                    {items.map((it: any, j: number) => {
                      const name = it?.name || it?.partName || `Item ${j + 1}`;
                      const qty = it?.quantity || it?.qty || it?.recommended_qty;
                      const price = it?.price || it?.selling_price || it?.cost_price;
                      return (
                        <View key={j} style={styles.itemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{name}</Text>
                            <Text style={styles.itemMeta}>
                              {qty != null ? `Qty: ${qty}` : ''}
                              {price != null ? `  Price: ${formatVnd(Number(price))} VNĐ` : ''}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderRow(label?: string, value?: string) {
  if (!label) return null;
  const display = (value && String(value).trim()) ? String(value) : '-';
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, display === '-' && { color: '#9CA3AF' }]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  section: { marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#6B7280', fontSize: 12 },
  rowValue: { color: '#111827', fontWeight: '600', fontSize: 13, marginLeft: 12, flexShrink: 1, textAlign: 'right' },
  sectionTitle: { color: '#374151', fontWeight: '700', marginTop: 8 },
  checkCard: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 8, marginTop: 6, backgroundColor: '#FFFFFF' },
  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkTitle: { color: '#111827', fontWeight: '700' },
  subTitle: { color: '#374151', fontWeight: '700', marginBottom: 4 },
  noteText: { color: '#4B5563', fontSize: 12, marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemName: { color: '#111827', fontWeight: '600' },
  itemMeta: { color: '#6B7280', fontSize: 12, marginTop: 2 },
});


