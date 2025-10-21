import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import axiosService from '@/services/axiosConfig';

export interface AuthResult {
    success: boolean;
    message: string;
    token?: string;
    user?: FirebaseAuthTypes.User;
    confirmationResult?: FirebaseAuthTypes.ConfirmationResult;
}

export interface BackendResponse {
    success: boolean;
    message: string;
    data?: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        role: string;
    };
}

class ReactNativeFirebaseAuthService {
    private static instance: ReactNativeFirebaseAuthService;
    private confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

    public static getInstance(): ReactNativeFirebaseAuthService {
        if (!ReactNativeFirebaseAuthService.instance) {
            ReactNativeFirebaseAuthService.instance = new ReactNativeFirebaseAuthService();
        }
        return ReactNativeFirebaseAuthService.instance;
    }

    /**
     * Format Vietnamese phone number to international format
     */
    private formatPhoneNumber(phoneNumber: string): string {
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');

        // If starts with 0, replace with +84
        if (cleaned.startsWith('0')) {
            return '+84' + cleaned.substring(1);
        }

        // If starts with 84, add +
        if (cleaned.startsWith('84')) {
            return '+' + cleaned;
        }

        // If already has +, return as is
        if (phoneNumber.startsWith('+')) {
            return phoneNumber;
        }

        // Default: add +84
        return '+84' + cleaned;
    }

    /**
     * Send OTP to phone number using React Native Firebase
     */
    async sendOTP(phoneNumber: string): Promise<AuthResult> {
        try {
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            console.log('Formatted Phone Number:', formattedPhone);
            console.log('Sending OTP with React Native Firebase to:', formattedPhone);

            // React Native Firebase automatically handles SMS sending
            this.confirmationResult = await auth().signInWithPhoneNumber(formattedPhone);

            return {
                success: true,
                message: 'OTP đã được gửi thành công',
                confirmationResult: this.confirmationResult
            };
        } catch (error: any) {
            console.error('Error sending OTP:', error);

            let errorMessage = 'Không thể gửi OTP. Vui lòng thử lại.';

            if (error.code === 'auth/invalid-phone-number') {
                errorMessage = 'Số điện thoại không hợp lệ';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
            } else if (error.code === 'auth/quota-exceeded') {
                errorMessage = 'Đã vượt quá giới hạn SMS. Vui lòng thử lại sau';
            }

            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Verify OTP and get Firebase ID Token
     */
    async verifyOTP(otp: string): Promise<AuthResult> {
        try {
            if (!this.confirmationResult) {
                throw new Error('No confirmation result available');
            }

            // Confirm the OTP
            const userCredential = await this.confirmationResult.confirm(otp);

            if (!userCredential || !userCredential.user) {
                throw new Error('Verification failed');
            }

            // Get Firebase ID Token
            const idToken = await userCredential.user.getIdToken();

            return {
                success: true,
                message: 'Xác thực OTP thành công',
                token: idToken,
                user: userCredential.user
            };
        } catch (error: any) {
            console.error('Error verifying OTP:', error);

            let errorMessage = 'Mã OTP không đúng. Vui lòng thử lại.';

            if (error.code === 'auth/invalid-verification-code') {
                errorMessage = 'Mã OTP không đúng';
            } else if (error.code === 'auth/code-expired') {
                errorMessage = 'Mã OTP đã hết hạn';
            }

            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Send Firebase ID Token to backend for authentication
     */
    async sendTokenToBackend(idToken: string, phoneNumber?: string): Promise<BackendResponse> {
        try {
            console.log('[Backend Auth] Sending ID Token to backend:', idToken);
            // Ensure phone is in correct format
            const formattedPhone = phoneNumber
                ? this.formatPhoneNumber(phoneNumber)
                : auth().currentUser?.phoneNumber;

            const response = await axiosService.post<BackendResponse>('/auth/login-otp', {
                idToken,
                phoneNumber: formattedPhone
            });

            console.log('Backend authentication successful:', response.data);
            return {
                success: response.data.success,
                message: response.data.message,
                data: response.data.data
            };
        } catch (error: any) {
            console.error('Error sending token to backend:', error);
            return {
                success: false,
                message: error.message || 'Lỗi kết nối đến server'
            };
        }
    }

    /**
     * Complete authentication flow: OTP -> Firebase Token -> Backend Authentication
     */
    async authenticateWithOTP(phoneNumber: string, otp: string): Promise<BackendResponse> {
        try {
            // Step 1: Verify OTP with Firebase
            const otpResult = await this.verifyOTP(otp);
            if (!otpResult.success || !otpResult.token) {
                return {
                    success: false,
                    message: otpResult.message
                };
            }

            // Step 2: Send token to backend
            const backendResult = await this.sendTokenToBackend(otpResult.token, phoneNumber);
            return backendResult;
        } catch (error: any) {
            console.error('Error in complete authentication flow:', error);
            return {
                success: false,
                message: 'Lỗi trong quá trình xác thực'
            };
        }
    }

    /**
     * Sign out
     */
    async signOut(): Promise<void> {
        try {
            // Call backend logout endpoint - interceptor will add auth header automatically
            try {
                await axiosService.post('/auth/logout', {});
                console.log('Backend logout successful');
            } catch (backendError) {
                console.warn('Error calling backend logout:', backendError);
                // Continue with Firebase logout even if backend logout fails
            }

            // Sign out from Firebase
            await auth().signOut();
            this.confirmationResult = null;
        } catch (error) {
            console.error('Error signing out:', error);
            throw new Error('Không thể đăng xuất. Vui lòng thử lại.');
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return auth().currentUser;
    }

    /**
     * Check if user is authenticated (sync check only)
     * Note: This only checks Firebase current user synchronously
     */
    isAuthenticated(): boolean {
        return auth().currentUser !== null;
    }

    /**
     * Check if user is authenticated with async storage tokens
     * Use this for more reliable authentication check
     */
    async isAuthenticatedAsync(): Promise<boolean> {
        try {
            const accessToken = await require('@react-native-async-storage/async-storage').default.getItem('accessToken');
            const refreshToken = await require('@react-native-async-storage/async-storage').default.getItem('refreshToken');
            return !!(accessToken && refreshToken);
        } catch (error) {
            console.error('Error checking async authentication:', error);
            return false;
        }
    }
}

export default ReactNativeFirebaseAuthService.getInstance();