import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../styles/theme';

export const CROWD_LIMIT_KEY = '@crowdvision_max_limit';
export const CROWD_LIMIT_ENABLED_KEY = '@crowdvision_limit_enabled';

export default function CrowdLimitSettings() {
    const [limit, setLimit] = useState('50');
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedLimit = await AsyncStorage.getItem(CROWD_LIMIT_KEY);
            const savedEnabled = await AsyncStorage.getItem(CROWD_LIMIT_ENABLED_KEY);
            if (savedLimit !== null) setLimit(savedLimit);
            if (savedEnabled !== null) setEnabled(savedEnabled === 'true');
        } catch (error) {
            console.error('Failed to load crowd limit settings', error);
        }
    };

    const handleLimitChange = async (text: string) => {
        // Only allow numbers
        const numericValue = text.replace(/[^0-9]/g, '');
        setLimit(numericValue);

        // Save if not empty
        if (numericValue) {
            try {
                await AsyncStorage.setItem(CROWD_LIMIT_KEY, numericValue);
            } catch (e) {
                console.error('Failed to save crowd limit', e);
            }
        }
    };

    const handleToggle = async (value: boolean) => {
        setEnabled(value);
        try {
            await AsyncStorage.setItem(CROWD_LIMIT_ENABLED_KEY, value.toString());
        } catch (e) {
            console.error('Failed to save limit toggle status', e);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Crowd Limit Alert</Text>
                    <Text style={styles.description}>Warn when detection exceeds a specific number</Text>
                </View>
                <Switch
                    value={enabled}
                    onValueChange={handleToggle}
                    trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                />
            </View>

            {enabled && (
                <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>Maximum Allowed Faces:</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="number-pad"
                        value={limit}
                        onChangeText={handleLimitChange}
                        placeholderTextColor={theme.colors.textMuted}
                        maxLength={4}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.text,
    },
    description: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: theme.spacing.md,
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
    },
    inputLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
    },
    input: {
        backgroundColor: theme.colors.secondary,
        color: theme.colors.text,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        textAlign: 'center',
        minWidth: 80,
    }
});
