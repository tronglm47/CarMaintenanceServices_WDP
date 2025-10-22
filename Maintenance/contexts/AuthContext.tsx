import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Firebase auth directly
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firebaseAuthService from '@/services/firebaseAuth';
import axiosService from '@/services/axiosConfig';

interface AuthContextType {
    // Authentication state
    isAuthenticated: boolean;
    isLoading: boolean;

    // User information
    user: FirebaseAuthTypes.User | null;
    accessToken: string | null;
    refreshToken: string | null;
    userRole: string | null;

    // Authentication methods
    login: (accessToken: string, refreshToken: string, role: string) => Promise<void>;
    logout: () => Promise<void>;

    // Token management
    getAccessToken: () => Promise<string | null>;
    refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                console.log('🔄 Initializing auth from AsyncStorage...');
                // Load stored tokens
                const storedAccessToken = await AsyncStorage.getItem('accessToken');
                const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
                const storedUserRole = await AsyncStorage.getItem('userRole');

                if (storedAccessToken && storedRefreshToken) {
                    console.log('✅ Tokens found! User is logged in');
                    setAccessToken(storedAccessToken);
                    setRefreshToken(storedRefreshToken);
                    setUserRole(storedUserRole);
                    setIsAuthenticated(true);
                } else {
                    console.log('❌ No tokens found. User is NOT logged in');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Error loading auth state:', error);
                setIsAuthenticated(false);
            } finally {
                console.log('✅ Auth initialization complete');
                setIsLoading(false);
            }
        };

        // Listen to Firebase auth state changes
        const unsubscribe = auth().onAuthStateChanged((firebaseUser: FirebaseAuthTypes.User | null) => {
            console.log('🔥 Firebase auth state changed. User:', firebaseUser?.email || 'none');
            setUser(firebaseUser);
            if (!firebaseUser) {
                // Firebase user signed out, clear local auth state
                console.log('🚪 Firebase user signed out, clearing auth state');
                setIsAuthenticated(false);
                setAccessToken(null);
                setRefreshToken(null);
                setUserRole(null);
                AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole']);
            }
        });

        initializeAuth();

        return () => unsubscribe();
    }, []);

    const login = async (newAccessToken: string, newRefreshToken: string, role: string) => {
        try {
            // Store tokens in AsyncStorage
            await AsyncStorage.setItem('accessToken', newAccessToken);
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
            await AsyncStorage.setItem('userRole', role);

            // Update state
            setAccessToken(newAccessToken);
            setRefreshToken(newRefreshToken);
            setUserRole(role);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Error storing auth tokens:', error);
            throw new Error('Failed to store authentication data');
        }
    };

    const logout = async () => {
        try {
            // Clean up device token before logout
            // Import inside function to avoid circular dependency
            const { removePushToken } = await import('@/apis/notifications.api');

            // Get stored device token if available
            try {
                const token = await AsyncStorage.getItem('deviceToken');
                if (token) {
                    await removePushToken(token);
                    await AsyncStorage.removeItem('deviceToken');
                    console.log('✅ Device token unregistered on logout');
                }
            } catch (error) {
                console.warn('⚠️ Could not unregister device token:', error);
                // Continue with logout even if token cleanup fails
            }

            // Sign out from Firebase and call backend logout endpoint
            // Interceptor will automatically add auth header to the logout request
            await firebaseAuthService.signOut();

            // Clear AsyncStorage
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole']);

            // Clear state
            setIsAuthenticated(false);
            setAccessToken(null);
            setRefreshToken(null);
            setUserRole(null);
            setUser(null);
        } catch (error) {
            console.error('Error during logout:', error);
            throw new Error('Failed to logout');
        }
    };

    const getAccessToken = async (): Promise<string | null> => {
        if (accessToken) {
            return accessToken;
        }

        // Try to get from AsyncStorage
        try {
            const storedToken = await AsyncStorage.getItem('accessToken');
            if (storedToken) {
                setAccessToken(storedToken);
                return storedToken;
            }
        } catch (error) {
            console.error('Error getting access token:', error);
        }

        return null;
    };

    const refreshAccessToken = async (): Promise<string | null> => {
        try {
            const currentRefreshToken = refreshToken || await AsyncStorage.getItem('refreshToken');

            if (!currentRefreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await axiosService.post<any>('/auth/refresh-token', {
                refreshToken: currentRefreshToken,
            });

            if (response.data?.success && response.data.data) {
                const newAccessToken = response.data.data.accessToken;
                const newRefreshToken = response.data.data.refreshToken;

                // Update stored and state tokens
                await AsyncStorage.setItem('accessToken', newAccessToken);
                await AsyncStorage.setItem('refreshToken', newRefreshToken);
                setAccessToken(newAccessToken);
                setRefreshToken(newRefreshToken);

                return newAccessToken;
            } else {
                throw new Error(response.data?.message || 'Failed to refresh token');
            }
        } catch (error) {
            console.error('Error refreshing access token:', error);
            // If refresh fails, logout user
            await logout();
            return null;
        }
    };

    const contextValue: AuthContextType = {
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        refreshToken,
        userRole,
        login,
        logout,
        getAccessToken,
        refreshAccessToken,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;