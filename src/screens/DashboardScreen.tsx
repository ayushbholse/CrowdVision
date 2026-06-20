import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { theme } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    getRecentCrowdLogs,
    getAverageDensity,
    getPeakFaceCount,
    getAllEmergencyIncidents,
    EmergencyIncident
} from '../database/crowdRepository';

export default function DashboardScreen() {
    const navigation = useNavigation<any>();
    const [stats, setStats] = useState({
        currentCount: 0,
        avgDensity: 0,
        peakCount: 0,
    });
    const [recentIncidents, setRecentIncidents] = useState<EmergencyIncident[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        console.log('[Dashboard] Loading data...');
        try {
            const [logs, avg, peak, incidents] = await Promise.all([
                getRecentCrowdLogs(1),
                getAverageDensity(),
                getPeakFaceCount(),
                getAllEmergencyIncidents(),
            ]);
            console.log('[Dashboard] Data loaded found:', logs.length, 'logs,', incidents.length, 'incidents');

            setStats({
                currentCount: logs.length > 0 ? logs[0].face_count : 0,
                avgDensity: avg,
                peakCount: peak,
            });
            setRecentIncidents(incidents.slice(0, 5));
        } catch (error) {
            console.error('[Dashboard] Failed to load data:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />
                }
            >
                <Text style={styles.title}>CrowdVision</Text>
                <Text style={styles.subtitle}>Real-time Analytics Dashboard</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Latest Count</Text>
                        <Text style={styles.statValue}>{stats.currentCount}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Peak Count</Text>
                        <Text style={styles.statValue}>{stats.peakCount}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg Density</Text>
                        <Text style={styles.statValue}>{stats.avgDensity.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Status</Text>
                        <Text style={[
                            styles.statValue,
                            { color: stats.avgDensity > 60 ? theme.colors.danger : stats.avgDensity > 30 ? theme.colors.accent : theme.colors.success }
                        ]}>
                            {stats.avgDensity > 60 ? 'UNSAFE' : stats.avgDensity > 30 ? 'CAUTION' : 'SAFE'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.mainButton}
                    onPress={() => navigation.navigate('Scanner')}
                >
                    <Text style={styles.buttonText}>🚀 Start Detection</Text>
                </TouchableOpacity>

                <View style={styles.recentActivity}>
                    <Text style={styles.sectionTitle}>Recent Incidents</Text>
                    {recentIncidents.length > 0 ? (
                        recentIncidents.map((incident, index) => (
                            <View key={index} style={styles.incidentRow}>
                                <View style={[styles.indicator, { backgroundColor: theme.colors.danger }]} />
                                <View style={styles.incidentDetails}>
                                    <Text style={styles.incidentTitle}>High Density Detected</Text>
                                    <Text style={styles.incidentTime}>{new Date(incident.timestamp).toLocaleTimeString()}</Text>
                                </View>
                                <Text style={styles.incidentCount}>{incident.face_count}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No recent incidents detected</Text>
                        </View>
                    )}
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
        fontSize: theme.fontSize.xxxl,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.accent,
    },
    mainButton: {
        backgroundColor: theme.colors.accent,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        elevation: 4,
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonText: {
        color: theme.colors.white,
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
    },
    sectionTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    recentActivity: {
        marginTop: theme.spacing.md,
    },
    incidentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: theme.spacing.md,
    },
    incidentDetails: {
        flex: 1,
    },
    incidentTitle: {
        color: theme.colors.text,
        fontWeight: theme.fontWeight.semibold,
        fontSize: theme.fontSize.md,
    },
    incidentTime: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.xs,
    },
    incidentCount: {
        color: theme.colors.danger,
        fontWeight: theme.fontWeight.bold,
        fontSize: theme.fontSize.lg,
    },
    emptyState: {
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.md,
    },
});
