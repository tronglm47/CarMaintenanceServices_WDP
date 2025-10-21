import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function TestAuthScreen() {
    const {
        isAuthenticated,
        user,
        userRole,
        accessToken,
        logout
    } = useAuth();
    const api = useApi();

    const handleTestApi = async () => {
        try {
            const result = await api.get('/api/auth/profile');
            if (result.success) {
                Alert.alert('API Test Success', JSON.stringify(result.data, null, 2));
            } else {
                Alert.alert('API Test Failed', result.message);
            }
        } catch (error) {
            Alert.alert('API Test Error', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch (error) {
            Alert.alert('Logout Error', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                    <Text style={styles.title}>Authentication Test</Text>
                    <Text style={styles.subtitle}>Firebase OTP + Backend Auth Flow</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Authentication Status</Text>
                    <View style={styles.statusItem}>
                        <Text style={styles.label}>Authenticated:</Text>
                        <Text style={[styles.value, { color: isAuthenticated ? '#4CAF50' : '#F44336' }]}>
                            {isAuthenticated ? 'Yes' : 'No'}
                        </Text>
                    </View>

                    <View style={styles.statusItem}>
                        <Text style={styles.label}>User Role:</Text>
                        <Text style={styles.value}>{userRole || 'N/A'}</Text>
                    </View>

                    <View style={styles.statusItem}>
                        <Text style={styles.label}>Firebase User:</Text>
                        <Text style={styles.value}>{user?.phoneNumber || 'N/A'}</Text>
                    </View>

                    <View style={styles.statusItem}>
                        <Text style={styles.label}>Access Token:</Text>
                        <Text style={styles.value} numberOfLines={3}>
                            {accessToken ? `${accessToken.substring(0, 50)}...` : 'N/A'}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Test Actions</Text>

                    <TouchableOpacity style={styles.button} onPress={handleTestApi}>
                        <Ionicons name="cloud-outline" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Test API Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.logoutButton]}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Flow Summary</Text>
                    <View style={styles.flowItem}>
                        <Ionicons name="call-outline" size={16} color="#666" />
                        <Text style={styles.flowText}>1. User enters phone number</Text>
                    </View>
                    <View style={styles.flowItem}>
                        <Ionicons name="mail-outline" size={16} color="#666" />
                        <Text style={styles.flowText}>2. Firebase sends SMS OTP</Text>
                    </View>
                    <View style={styles.flowItem}>
                        <Ionicons name="keypad-outline" size={16} color="#666" />
                        <Text style={styles.flowText}>3. User enters OTP code</Text>
                    </View>
                    <View style={styles.flowItem}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#666" />
                        <Text style={styles.flowText}>4. Firebase verifies OTP</Text>
                    </View>
                    <View style={styles.flowItem}>
                        <Ionicons name="key-outline" size={16} color="#666" />
                        <Text style={styles.flowText}>5. Get Firebase ID Token</Text>
                    </View>
                    <View style={styles.flowItem}>
                        <Ionicons name="server-outline" size={16} color="#666" />
                        <Text style={styles.flowText}>6. Send token to backend</Text>
                    </View>
                    <View style={styles.flowItem}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
                        <Text style={styles.flowText}>7. Backend validates & returns JWT</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    statusItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        color: '#666',
        flex: 1,
    },
    value: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4A90E2',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
    },
    logoutButton: {
        backgroundColor: '#F44336',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    flowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    flowText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
    },
});