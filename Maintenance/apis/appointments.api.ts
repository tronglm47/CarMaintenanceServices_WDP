import axiosService from '@/services/axiosConfig';

export interface CreateAppointmentBody {
  customer_id: string;
  vehicle_id: string;
  center_id: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  status?: 'scheduled' | 'pending' | 'cancelled' | string;
}

export async function createAppointment(body: CreateAppointmentBody) {
  const res = await axiosService.post('/appointments', body);
  return res.data;
}

export async function listCenters() {
  const res = await axiosService.get('/centers');
  return res.data;
}


