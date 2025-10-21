import { useCallback } from 'react';
import { AxiosError, AxiosResponse } from 'axios';
import axiosService from '@/services/axiosConfig';

interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}

interface UseAxiosOptions {
    showError?: boolean;
    showSuccess?: boolean;
}

/**
 * Custom hook for making API calls with Axios
 * Automatically handles auth tokens and token refresh
 */
export const useAxios = (options: UseAxiosOptions = {}) => {
    const { showError = false, showSuccess = false } = options;

    const request = useCallback(
        async <T = any,>(
            method: 'get' | 'post' | 'put' | 'patch' | 'delete',
            url: string,
            data?: any,
            config?: any
        ): Promise<ApiResponse<T>> => {
            try {
                let response: AxiosResponse<ApiResponse<T>>;

                switch (method) {
                    case 'get':
                        response = await axiosService.get<ApiResponse<T>>(url, config);
                        break;
                    case 'post':
                        response = await axiosService.post<ApiResponse<T>>(url, data, config);
                        break;
                    case 'put':
                        response = await axiosService.put<ApiResponse<T>>(url, data, config);
                        break;
                    case 'patch':
                        response = await axiosService.patch<ApiResponse<T>>(url, data, config);
                        break;
                    case 'delete':
                        response = await axiosService.delete<ApiResponse<T>>(url, config);
                        break;
                    default:
                        throw new Error(`Unknown method: ${method}`);
                }

                if (showSuccess && response.data.message) {
                    // You can integrate with your toast notification system here
                    console.log('Success:', response.data.message);
                }

                return response.data;
            } catch (error) {
                const axiosError = error as AxiosError<ApiResponse>;

                let errorMessage = 'An error occurred';

                if (axiosError.response?.data?.message) {
                    errorMessage = axiosError.response.data.message;
                } else if (axiosError.message) {
                    errorMessage = axiosError.message;
                }

                if (showError) {
                    console.error('Error:', errorMessage);
                    // You can integrate with your toast notification system here
                }

                return {
                    success: false,
                    message: errorMessage,
                };
            }
        },
        [showError, showSuccess]
    );

    return {
        // Direct request method
        request,

        // Convenience methods
        get: <T = any,>(url: string, config?: any) =>
            request<T>('get', url, undefined, config),
        post: <T = any,>(url: string, data?: any, config?: any) =>
            request<T>('post', url, data, config),
        put: <T = any,>(url: string, data?: any, config?: any) =>
            request<T>('put', url, data, config),
        patch: <T = any,>(url: string, data?: any, config?: any) =>
            request<T>('patch', url, data, config),
        delete: <T = any,>(url: string, config?: any) =>
            request<T>('delete', url, undefined, config),

        // Direct axios instance access if needed
        axiosInstance: axiosService.getAxiosInstance(),
    };
};
