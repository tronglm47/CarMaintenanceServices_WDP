import { io, type Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const DEFAULT_BACKEND = (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://ev-maintenance-9bd58b96744e.herokuapp.com/api').replace(/\/api\/?$/, '');

class ChatSocketService {
    private socket: Socket | null = null;
    private joinedConversations = new Set<string>();

    async connect() {
        if (this.socket) return this.socket;

        try {
            const accessToken = await AsyncStorage.getItem('accessToken');
            if (!accessToken) return null;

            const s = io(DEFAULT_BACKEND, {
                auth: { token: accessToken },
                transports: ['websocket', 'polling'],
            });

            s.on('connect', () => {
                console.debug('[chatSocket] connected', s.id);
                // re-join any previously joined rooms after connect
                for (const conv of Array.from(this.joinedConversations)) {
                    s.emit('conversation:join', { conversationId: conv });
                }
            });

            s.on('disconnect', (reason) => {
                console.debug('[chatSocket] disconnected', reason);
            });

            s.on('connect_error', (err: any) => {
                console.warn('[chatSocket] connect_error', err?.message || err);
            });

            this.socket = s;

            return s;
        } catch (e) {
            console.warn('[chatSocket] failed to connect', e);
            return null;
        }
    }

    async disconnect() {
        try {
            this.socket?.disconnect();
        } catch { }
        this.socket = null;
    }

    // Ensure socket is connected and join the room
    async joinConversation(conversationId: string) {
        const s = await this.connect();
        if (!s) return;
        s.emit('conversation:join', { conversationId });
        this.joinedConversations.add(conversationId);
    }

    leaveConversation(conversationId: string) {
        try {
            this.socket?.emit('conversation:leave', { conversationId });
        } catch { }
        this.joinedConversations.delete(conversationId);
    }

    on(event: string, cb: (...args: any[]) => void) {
        this.socket?.on(event, cb);
    }

    off(event: string, cb?: (...args: any[]) => void) {
        this.socket?.off(event, cb);
    }

    // Reconnect with a new token (called when axios refreshes tokens)
    async reconnectWithToken(newAccessToken: string) {
        try {
            if (this.socket) {
                try {
                    (this.socket as any).auth = { token: newAccessToken };
                    this.socket.disconnect();
                    // wait small delay
                    setTimeout(() => this.socket?.connect(), 100);
                    return;
                } catch (e) {
                    try { this.socket.disconnect(); } catch { }
                    this.socket = null;
                }
            }
            // create new socket
            const s = io(DEFAULT_BACKEND, { auth: { token: newAccessToken }, transports: ['websocket', 'polling'] });
            this.socket = s;
            s.on('connect', () => {
                console.debug('[chatSocket] (re)connected', s.id);
                for (const conv of Array.from(this.joinedConversations)) {
                    s.emit('conversation:join', { conversationId: conv });
                }
            });
            s.on('connect_error', (err) => console.warn('[chatSocket] reconnect error', err));
        } catch (e) {
            console.warn('[chatSocket] reconnectWithToken error', e);
        }
    }
}

const service = new ChatSocketService();

// Listen for token changes emitted by axiosConfig
DeviceEventEmitter.addListener('ev_tokens_changed', (payload: any) => {
    const accessToken = payload?.accessToken;
    if (!accessToken) {
        service.disconnect();
    } else {
        service.reconnectWithToken(accessToken);
    }
});

export default service;
