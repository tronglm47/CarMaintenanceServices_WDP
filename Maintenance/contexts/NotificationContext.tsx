import { removePushToken, updatePushToken } from "@/apis/notifications.api";
import { registerForPushNotificationsAsync } from "@/utils/register-for-push-notification";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

interface NotificationContextType {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    requestPushToken: () => Promise<void>;
    deletePushToken: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error(
            "useNotification must be used within a NotificationProvider"
        );
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
    children,
}) => {
    const [pushToken, setPushToken] = useState<string | null>(null);
    const [notification, setNotification] =
        useState<Notifications.Notification | null>(null);

    const notificationListener = useRef<Notifications.EventSubscription>(null);
    const responseListener = useRef<Notifications.EventSubscription>(null);

    const requestPushToken = async () => {
        try {

            const token = await registerForPushNotificationsAsync();
            if (token) {

                setPushToken(token);
                // Store token to AsyncStorage for later cleanup on logout
                await AsyncStorage.setItem('deviceToken', token);
                await updatePushToken(token);
                console.log('✅ Token sent to backend successfully');
            } else {
                console.warn('⚠️ No token received from registerForPushNotificationsAsync');
            }
        } catch (error) {
            console.error('❌ Error requesting push token:', error);
        }
    };

    const deletePushToken = async () => {
        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                setPushToken(null);
                await removePushToken(token);
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        let isMounted = true;
        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification: any) => {
                console.log(
                    "🔔 Notification Received while user in the app: ",
                    notification
                );
                setNotification(notification);
            });

        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response: any) => {
                console.log(
                    "👆 Notification Response when user interact with notification: "
                );
                // Handle the notification response here
                const data = response.notification.request.content.data;

                // If notification is an alert, go to tabs index
                if (data?.type && data.type === "alert") {
                    router.replace("/(tabs)");
                }

                // If notification is a push (chat), open the chat screen
                if (data?.type && data.type === "push") {
                    // Assumption: chat screen is at '/(tabs)/chat'.
                    // If your chat route differs, replace this path accordingly.
                    router.replace("/(tabs)");
                }
            });

        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (!isMounted || !response?.notification) {
                console.log("No last notification response or component unmounted.");
                return;
            }
            console.log(
                "🔔 Last Notification Response when app was closed: ",
                response.notification
            );
            const data = response.notification.request.content.data;

            if (data?.type && data.type === "alert") {
                router.replace("/(tabs)");
            }

            if (data?.type && data.type === "push") {
                // Assumption: chat screen is at '/(tabs)/chat'.
                router.replace("/(tabs)/chat" as any);
            }
        });

        return () => {
            isMounted = false;
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    return (
        <NotificationContext.Provider
            value={{
                expoPushToken: pushToken,
                notification,
                requestPushToken,
                deletePushToken,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
