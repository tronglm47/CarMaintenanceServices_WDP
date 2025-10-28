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
        },

        // Payments endpoints
        payments: {
            getAll: (params?: any) => api.get('/payments', { params }),
            create: (data: any) => api.post('/payments', data),
            getById: (id: string) => api.get(`/payments/${id}`),
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
