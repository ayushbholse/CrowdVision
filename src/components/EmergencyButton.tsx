import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../styles/theme';

interface EmergencyButtonProps {
    isEmergency: boolean;
    onToggle: (active: boolean) => void;
}

export default function EmergencyButton({ isEmergency, onToggle }: EmergencyButtonProps) {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                isEmergency ? styles.activeButton : styles.idleButton
            ]}
            onPress={() => onToggle(!isEmergency)}
            activeOpacity={0.8}
        >
            <Text style={styles.icon}>🚨</Text>
            <Text style={styles.text}>
                {isEmergency ? 'CANCEL EMERGENCY' : 'EMERGENCY MODE'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.full,
        elevation: 5,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        marginHorizontal: theme.spacing.md,
        marginVertical: theme.spacing.sm,
        borderWidth: 2,
    },
    idleButton: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.danger,
    },
    activeButton: {
        backgroundColor: theme.colors.danger,
        borderColor: theme.colors.white,
    },
    icon: {
        fontSize: theme.fontSize.lg,
        marginRight: theme.spacing.sm,
    },
    text: {
        color: theme.colors.white,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.extrabold,
        letterSpacing: 1,
    }
});
