// Firebase configuration for React Native
// This file exports Firebase auth service
// Uses @react-native-firebase/auth for native iOS/Android support

import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Firebase Auth service - with helper methods
export const FirebaseAuthService = {
    // Get current user
    getCurrentUser: (): FirebaseAuthTypes.User | null => {
        return auth().currentUser;
    },

    // Sign in with phone number
    signInWithPhoneNumber: (phoneNumber: string) => {
        console.log('Signing in with phone number:', phoneNumber);
        return auth().signInWithPhoneNumber(phoneNumber);
    },

    // Sign out
    signOut: async (): Promise<void> => {
        return await auth().signOut();
    },

    // Auth state listener
    onAuthStateChanged: (callback: (user: FirebaseAuthTypes.User | null) => void) => {
        return auth().onAuthStateChanged(callback);
    },

    // Get ID Token
    getIdToken: async (forceRefresh = false): Promise<string | null> => {
        const user = auth().currentUser;
        if (user) {
            return await user.getIdToken(forceRefresh);
        }
        return null;
    }
};

// Export auth for direct use
export default auth;