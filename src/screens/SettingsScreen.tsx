import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearAllLogs } from '../database/crowdRepository';
import { authService } from '../services/authService';
import CrowdLimitSettings from '../components/CrowdLimitSettings';

export default function SettingsScreen() {
    const [isClearing, setIsClearing] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const user = authService.getCurrentUser();

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoggingOut(true);
                        try {
                            await authService.logout();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout');
                        } finally {
                            setIsLoggingOut(false);
                        }
                    }
                }
            ]
        );
    };

    const handleClearLogs = () => {
        Alert.alert(
            'Clear All Data',
            'Are you sure you want to delete all crowd logs and incidents? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsClearing(true);
                        try {
                            await clearAllLogs();
                            Alert.alert('Success', 'All data has been cleared.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to clear data.');
                        } finally {
                            setIsClearing(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Settings</Text>

                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                        <Text style={styles.userEmail}>{user?.email || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Alert Configuration</Text>

                    <CrowdLimitSettings />

                    <View style={styles.settingItem}>
                        <View>
                            <Text style={styles.settingLabel}>Emergency Alerts</Text>
                            <Text style={styles.settingDescription}>Get notified when density is high</Text>
                        </View>
                        <Switch
                            value={true}
                            trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Management</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleClearLogs}
                        disabled={isClearing}
                    >
                        <View>
                            <Text style={[styles.menuLabel, { color: theme.colors.danger }]}>Clear All History</Text>
                            <Text style={styles.settingDescription}>Permanently delete all logs</Text>
                        </View>
                        {isClearing ? <ActivityIndicator color={theme.colors.danger} /> : <Text style={styles.menuChevron}>›</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <View>
                            <Text style={styles.menuLabel}>Sign Out</Text>
                            <Text style={styles.settingDescription}>Exit your session safely</Text>
                        </View>
                        {isLoggingOut ? <ActivityIndicator color={theme.colors.accent} /> : <Text style={styles.menuChevron}>›</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Details</Text>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>Version</Text>
                        <Text style={styles.aboutValue}>1.0.0 (Expo SDK 55)</Text>
                    </View>
                    <View style={styles.aboutRow}>
                        <Text style={styles.aboutLabel}>AI Engine</Text>
                        <Text style={styles.aboutValue}>TensorFlow Lite / BlazeFace</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.primary,
    },
    content: {
        padding: theme.spacing.lg,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xl,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    avatarText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    userEmail: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    section: {
        marginBottom: theme.spacing.xxl,
    },
    sectionTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: theme.spacing.md,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    settingLabel: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.text,
    },
    settingDescription: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    menuLabel: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.text,
    },
    menuChevron: {
        fontSize: theme.fontSize.xl,
        color: theme.colors.textMuted,
    },
    aboutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
    },
    aboutLabel: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
    },
    aboutValue: {
        color: theme.colors.text,
        fontSize: theme.fontSize.md,
    },
});
