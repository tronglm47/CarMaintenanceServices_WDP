import { useAxios } from './useAxios';

/**
 * Common API endpoints helper
 * Provides type-safe API calls for common operations
 */

export const useApiService = () => {
    const api = useAxios();

    return {
        // Auth endpoints
        auth: {
            // Get current user profile
            getProfile: () => api.get('/auth/profile'),

            // Logout
            logout: () => api.post('/auth/logout', {}),

            // Email/phone + password login
            loginByPassword: (identifier: string, password: string) =>
                api.post('/auth/login-by-password', { identifier, password }, { headers: { 'X-Skip-Auth': 'true' } }),
        },

        // User endpoints
        users: {
            getAll: (params?: any) => api.get('/users', { params }),
            getById: (id: string) => api.get(`/users/${id}`),
            create: (data: any) => api.post('/users', data),
            update: (id: string, data: any) => api.put(`/users/${id}`, data),
            delete: (id: string) => api.delete(`/users/${id}`),
        },

        // Vehicles endpoints
        vehicles: {
            getAll: (params?: any) => api.get('/vehicles', { params }),
            getById: (id: string) => api.get(`/vehicles/${id}`),
            create: (data: any) => api.post('/vehicles', data),
            update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
            delete: (id: string) => api.delete(`/vehicles/${id}`),
            getByCustomer: (customerId: string) => api.get(`/vehicles/customer/${customerId}`),
            getMyVehicles: () => api.get('/vehicles/my-vehicles'),
        },

        // Service packages endpoints
        servicePackages: {
            getAll: (params?: any) => api.get('/service-packages', { params }),
            getById: (id: string) => api.get(`/service-packages/${id}`),
            getPopular: () => api.get('/service-packages/popular'),
            create: (data: any) => api.post('/service-packages', data),
            update: (id: string, data: any) => api.put(`/service-packages/${id}`, data),
            delete: (id: string) => api.delete(`/service-packages/${id}`),
        },

        // Service checklists
        serviceChecklists: {
            getAll: (params?: any) => api.get('/service-checklists', { params }),
            getById: (id: string) => api.get(`/service-checklists/${id}`),
        },

        // Subscriptions endpoints (generic)
        subscriptions: {
            getAll: (params?: any) => api.get('/subscriptions', { params }),
            getById: (id: string) => api.get(`/subscriptions/${id}`),
            getByVehicle: (vehicleId: string) => api.get(`/subscriptions/vehicle/${vehicleId}`),
            getByCustomer: (customerId: string) => api.get(`/subscriptions/customer/${customerId}`),
            getActive: (vehicleId: string) => api.get(`/subscriptions/active/${vehicleId}`),
            create: (data: any) => api.post('/subscriptions', data),
            update: (id: string, data: any) => api.put(`/subscriptions/${id}`, data),
            delete: (id: string) => api.delete(`/subscriptions/${id}`),
        },

        // Vehicle subscriptions endpoints (as per backend path)
        vehicleSubscriptions: {
            create: (data: any) => api.post('/vehicle-subscriptions', data),
            getById: (id: string) => api.get(`/vehicle-subscriptions/${id}`),
            getByVehicle: (vehicleId: string) => api.get(`/vehicle-subscriptions/vehicle/${vehicleId}`),
        },

        // Payments endpoints
        payments: {
            getAll: (params?: any) => api.get('/payments', { params }),
            create: (data: any) => api.post('/payments', data),
            getById: (id: string) => api.get(`/payments/${id}`),
            webhook: (data: any) => api.post('/payments/webhook', data),
        },

        // Auto parts endpoints
        autoParts: {
            getAll: (params?: any) => api.get('/auto-parts', { params }),
            getById: (id: string) => api.get(`/auto-parts/${id}`),
        },

        // Vehicle auto parts endpoints
        vehicleAutoParts: {
            getByVehicle: (vehicleId: string) => api.get(`/vehicle-auto-parts/vehicle/${vehicleId}`),
            getByRecord: (recordId: string) => api.get(`/vehicle-auto-parts/record/${recordId}`),
        },

        // Centers endpoints
        centers: {
            getAll: (params?: any) => api.get('/centers', { params }),
            getById: (id: string) => api.get(`/centers/${id}`),
        },

        // Slots endpoints
        slots: {
            getAll: (params?: { date?: string; center_id?: string }) => api.get('/slots', { params }),
        },

        // Appointments endpoints
        appointments: {
            getAll: (params?: any) => api.get('/appointments', { params }),
            getById: (id: string) => api.get(`/appointments/${id}`),
        },

        // Service records endpoints
        serviceRecords: {
            getAll: (params?: any) => api.get('/service-records', { params }),
            getById: (id: string) => api.get(`/service-records/${id}`),
            getByTechnician: (technicianId: string) => api.get(`/service-records?technician_id=${technicianId}`),
            update: (id: string, data: any) => api.put(`/service-records/${id}`, data),
        },

        // Record checklists
        recordChecklists: {
            getByRecord: async (recordId: string) => {
                console.log('📤 [API] Fetching record checklists for record:', recordId);
                try {
                    const response = await api.get(`/record-checklists/by-record/${recordId}`);
                    console.log('✅ [API] Record checklists response:', {
                        count: Array.isArray(response.data) ? response.data.length : (response.data?.data?.length || 0),
                        data: response.data
                    });
                    return response;
                } catch (error) {
                    console.error('❌ [API] Record checklists error:', error);
                    throw error;
                }
            },
            create: (data: any) => api.post('/record-checklists', data),
            updateStatus: (id: string, data: any) => api.put(`/record-checklists/${id}`, data),
            addDefect: async (id: string, data: any) => {
                const endpoint = `/record-checklists/${id}/defects`;
                const fullUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ev-maintenance-9bd58b96744e.herokuapp.com/api'}${endpoint}`;
                
                console.log('📤 [API] Sending defect data:', {
                    checklistId: id,
                    payload: data,
                    endpoint: endpoint,
                    fullUrl: fullUrl,
                    method: 'POST',
                    payloadString: JSON.stringify(data)
                });
                
                try {
                    const response = await api.post(endpoint, data);
                    console.log('✅ [API] Defect response received:', {
                        success: response.success,
                        message: response.message,
                        data: response.data,
                        fullResponse: response
                    });
                    
                    // If useAxios returned success: false, it means there was an error
                    // but it didn't throw. We need to throw it manually.
                    if (response.success === false) {
                        console.error('❌ [API] Backend returned error:', response.message);
                        throw new Error(response.message || 'Failed to add defect');
                    }
                    
                    return response;
                } catch (error: any) {
                    console.error('❌ [API] Defect error:', {
                        message: error.message,
                        response: error.response,
                        fullError: error
                    });
                    throw error;
                }
            },
            getDefects: (recordChecklistId: string) => api.get(`/record-checklists/${recordChecklistId}/defects`),
            updateDefect: async (defectId: string, data: any) => {
                const endpoint = `/record-checklists/defects/${defectId}`;
                
                console.log('📤 [API] Updating defect:', {
                    defectId,
                    payload: data,
                    endpoint,
                    method: 'PUT'
                });
                
                try {
                    const response = await api.put(endpoint, data);
                    console.log('✅ [API] Defect updated:', response);
                    
                    if (response.success === false) {
                        console.error('❌ [API] Backend returned error:', response.message);
                        throw new Error(response.message || 'Failed to update defect');
                    }
                    
                    return response;
                } catch (error: any) {
                    console.error('❌ [API] Update defect error:', {
                        message: error.message,
                        response: error.response,
                        fullError: error
                    });
                    throw error;
                }
            },
        },

        // Alerts endpoints
        alerts: {
            getAll: (params?: any) => api.get('/alerts', { params }),
            getById: (id: string) => api.get(`/alerts/${id}`),
            getByVehicle: (vehicleId: string) => api.get(`/alerts/vehicle/${vehicleId}`),
            create: (data: any) => api.post('/alerts', data),
            update: (id: string, data: any) => api.put(`/alerts/${id}`, data),
            delete: (id: string) => api.delete(`/alerts/${id}`),
            markAsRead: (id: string) => api.patch(`/alerts/${id}/read`, {}),
        },

        // Raw API access if needed
        raw: api,
    };
};
