import { useAuth } from '@/contexts/AuthContext';

interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    requireAuth?: boolean;
}

interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}

class ApiService {
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    }

    async request<T = any>(
        endpoint: string,
        options: ApiRequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const {
            method = 'GET',
            headers = {},
            body,
            requireAuth = true
        } = options;

        const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        // Add authentication header if required
        if (requireAuth) {
            // This will be set by the hook that uses this service
            // We'll handle auth token injection in the hook
        }

        const fetchOptions: RequestInit = {
            method,
            headers: requestHeaders,
        };

        if (body && method !== 'GET') {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        try {
            const response = await fetch(url, fetchOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return {
                success: true,
                message: data.message || 'Request successful',
                data: data.data || data,
            };
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);

            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error occurred',
            };
        }
    }

    // Convenience methods
    async get<T = any>(endpoint: string, requireAuth = true): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET', requireAuth });
    }

    async post<T = any>(endpoint: string, body?: any, requireAuth = true): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'POST', body, requireAuth });
    }

    async put<T = any>(endpoint: string, body?: any, requireAuth = true): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PUT', body, requireAuth });
    }

    async delete<T = any>(endpoint: string, requireAuth = true): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE', requireAuth });
    }
}

// Custom hook for authenticated API calls
export const useApi = () => {
    const { getAccessToken, refreshAccessToken } = useAuth();
    const apiService = new ApiService();

    const authenticatedRequest = async <T = any>(
        endpoint: string,
        options: ApiRequestOptions = {}
    ): Promise<ApiResponse<T>> => {
        const { requireAuth = true, headers = {}, ...restOptions } = options;

        if (requireAuth) {
            let accessToken = await getAccessToken();

            if (!accessToken) {
                return {
                    success: false,
                    message: 'No access token available',
                };
            }

            // Add Authorization header
            const authHeaders = {
                ...headers,
                'Authorization': `Bearer ${accessToken}`,
            };

            // First attempt with current token
            let result = await apiService.request<T>(endpoint, {
                ...restOptions,
                headers: authHeaders,
                requireAuth: false, // We're handling auth manually
            });

            // If unauthorized, try to refresh token and retry
            if (!result.success && result.message.includes('token')) {
                console.log('Token might be expired, attempting refresh...');

                const newAccessToken = await refreshAccessToken();
                if (newAccessToken) {
                    const refreshedAuthHeaders = {
                        ...headers,
                        'Authorization': `Bearer ${newAccessToken}`,
                    };

                    result = await apiService.request<T>(endpoint, {
                        ...restOptions,
                        headers: refreshedAuthHeaders,
                        requireAuth: false,
                    });
                }
            }

            return result;
        }

        return apiService.request<T>(endpoint, { ...restOptions, requireAuth: false });
    };

    return {
        request: authenticatedRequest,
        get: async <T = any>(endpoint: string, requireAuth = true) =>
            authenticatedRequest<T>(endpoint, { method: 'GET', requireAuth }),
        post: async <T = any>(endpoint: string, body?: any, requireAuth = true) =>
            authenticatedRequest<T>(endpoint, { method: 'POST', body, requireAuth }),
        put: async <T = any>(endpoint: string, body?: any, requireAuth = true) =>
            authenticatedRequest<T>(endpoint, { method: 'PUT', body, requireAuth }),
        delete: async <T = any>(endpoint: string, requireAuth = true) =>
            authenticatedRequest<T>(endpoint, { method: 'DELETE', requireAuth }),
    };
};

export default ApiService;