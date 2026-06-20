// src/services/audioService.ts
import { Vibration } from 'react-native';

export const audioService = {
    playAlarm: async () => {
        // Audio playback removed per user request. 
        // Always vibrate as the primary alert mechanism.
        Vibration.vibrate([500, 500, 500], true);
    },

    stopAlarm: async () => {
        Vibration.cancel();
    }
};

