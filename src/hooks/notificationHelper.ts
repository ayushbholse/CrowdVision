// src/hooks/notificationHelper.ts
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Check if we are in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure how notifications are handled when the app is in the foreground
// Lazy load to avoid crash on import in Expo Go SDK 53+
if (!isExpoGo) {
    try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (error) {
        console.warn('Notifications handler could not be set:', error);
    }
}

export async function sendCrowdNotification(count: number, density: number) {
    const alertMessage = `Detected ${count} people. Density: ${density.toFixed(1)}%. Please take necessary precautions.`;

    // Fallback for Expo Go (where push functionality is restricted)
    if (isExpoGo) {
        Alert.alert('⚠️ High Crowd Density', alertMessage);
        return;
    }

    try {
        // Lazy load for production use
        const Notifications = require('expo-notifications');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '⚠️ High Crowd Density Alert!',
                body: alertMessage,
                data: { count, density },
                sound: Platform.OS === 'ios' ? true : 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // send immediately
        });
    } catch (error) {
        console.error('Error sending local notification:', error);
        Alert.alert('⚠️ Crowd Alert', alertMessage);
    }
}
