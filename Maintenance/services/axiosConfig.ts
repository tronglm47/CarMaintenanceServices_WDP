import axios, {
    AxiosInstance,
    AxiosError,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface RefreshTokenResponse {
    success: boolean;
    data?: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    };
    message: string;
}

class AxiosService {
    private instance: AxiosInstance;
    private isRefreshing: boolean = false;
    private refreshSubscribers: ((token: string) => void)[] = [];

    constructor() {
        const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

        this.instance = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor
        this.instance.interceptors.request.use(
            this.requestInterceptor.bind(this),
            this.requestErrorHandler.bind(this)
        );

        // Response interceptor
        this.instance.interceptors.response.use(
            this.responseInterceptor.bind(this),
            this.responseErrorHandler.bind(this)
        );
    }

    private async requestInterceptor(
        config: CustomAxiosRequestConfig
    ): Promise<CustomAxiosRequestConfig> {
        try {
            // Get access token from AsyncStorage
            const accessToken = await AsyncStorage.getItem('accessToken');

            if (accessToken) {
                config.headers.Authorization = `Bearer ${accessToken}`;
            }

            return config;
        } catch (error) {
            console.error('Error in request interceptor:', error);
            return config;
        }
    }

    private requestErrorHandler(error: AxiosError) {
        return Promise.reject(error);
    }

    private responseInterceptor(response: AxiosResponse) {
        return response;
    }

    private async responseErrorHandler(error: AxiosError) {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Handle 401 Unauthorized - Token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (!this.isRefreshing) {
                this.isRefreshing = true;

                try {
                    // Try to refresh token
                    const tokens = await this.refreshAccessToken();

                    if (tokens) {
                        // Update Authorization header
                        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

                        // Notify all pending requests
                        this.onRefreshed(tokens.accessToken);

                        // Retry original request
                        return this.instance(originalRequest);
                    } else {
                        // Refresh failed, clear auth and redirect to login
                        await this.clearAuth();
                        // You can dispatch a logout action here or redirect
                        throw error;
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    await this.clearAuth();
                    throw error;
                } finally {
                    this.isRefreshing = false;
                    this.refreshSubscribers = [];
                }
            } else {
                // If already refreshing, add request to subscribers
                return new Promise((resolve) => {
                    this.addRefreshSubscriber((token: string) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(this.instance(originalRequest));
                    });
                });
            }
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.error('Access forbidden');
        }

        return Promise.reject(error);
    }

    private async refreshAccessToken(): Promise<AuthTokens | null> {
        try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const baseURL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

            const response = await axios.post<RefreshTokenResponse>(
                `${baseURL}/auth/refresh-token`,
                { refreshToken },
                {
                    timeout: 30000,
                }
            );

            if (response.data.success && response.data.data) {
                const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                // Update stored tokens
                await AsyncStorage.setItem('accessToken', accessToken);
                await AsyncStorage.setItem('refreshToken', newRefreshToken);

                return {
                    accessToken,
                    refreshToken: newRefreshToken,
                };
            }

            return null;
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    }

    private addRefreshSubscriber(callback: (token: string) => void) {
        this.refreshSubscribers.push(callback);
    }

    private onRefreshed(token: string) {
        this.refreshSubscribers.forEach((callback) => callback(token));
    }

    private async clearAuth() {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole']);
    }

    public getAxiosInstance(): AxiosInstance {
        return this.instance;
    }

    // Convenience methods
    public async get<T = any>(url: string, config?: any) {
        return this.instance.get<T>(url, config);
    }

    public async post<T = any>(url: string, data?: any, config?: any) {
        return this.instance.post<T>(url, data, config);
    }

    public async put<T = any>(url: string, data?: any, config?: any) {
        return this.instance.put<T>(url, data, config);
    }

    public async patch<T = any>(url: string, data?: any, config?: any) {
        return this.instance.patch<T>(url, data, config);
    }

    public async delete<T = any>(url: string, config?: any) {
        return this.instance.delete<T>(url, config);
    }
}

// Export singleton instance
const axiosService = new AxiosService();
export default axiosService;
