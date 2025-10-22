import axiosService from "@/services/axiosConfig";

/**
 * Update/Register device token with backend
 * Sends device token to backend for push notifications
 * 
 * Pattern: Same as alert-backend
 * - POST /auth/deviceToken
 * - Body: { token: string }
 */
export async function updatePushToken(token: string) {
    try {
        console.log('🌐 Sending deviceToken to backend:', token);
        const res = await axiosService.post("/auth/deviceToken", {
            token: token,
        });
        return res.data;
    } catch (error) {
        console.error('❌ Error sending deviceToken:', error);
    }
}

/**
 * Remove device token from backend
 * Usually called on logout to disable notifications
 * 
 * Pattern: Same as alert-backend
 * - DELETE /auth/deviceToken
 * - Params: { token: string }
 */
export async function removePushToken(token: string) {
    try {
        const res = await axiosService.delete("/auth/deviceToken", {
            params: {
                token: token,
            },
        });
        return res.data;
    } catch (error) {
        console.log(error);
    }
}
