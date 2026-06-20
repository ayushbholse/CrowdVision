import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Alert, Image
} from 'react-native';
import { theme } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    getAllCrowdLogs,
} from '../database/crowdRepository';
import { exportPDF, exportCSV } from '../services/reportService';
import { CrowdLog } from '../database/crowdRepository';
import { useFocusEffect } from '@react-navigation/native';
import { formatTimestamp } from '../utils/timeFormatter';

type FilterType = 'TODAY' | 'WEEK' | 'ALL';

export default function ReportScreen() {
    const [logs, setLogs] = useState<CrowdLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<CrowdLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filter, setFilter] = useState<FilterType>('ALL');

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllCrowdLogs();
            setLogs(data);
            applyFilter(data, filter);
        } catch (error) {
            console.error('Failed to load logs', error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useFocusEffect(
        useCallback(() => {
            loadLogs();
        }, [loadLogs])
    );

    const applyFilter = (data: CrowdLog[], currentFilter: FilterType) => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = startOfToday - (7 * 24 * 60 * 60 * 1000);

        const filtered = data.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            if (currentFilter === 'TODAY') return logTime >= startOfToday;
            if (currentFilter === 'WEEK') return logTime >= startOfWeek;
            return true;
        });
        setFilteredLogs(filtered);
    };

    const handleFilterChange = (newFilter: FilterType) => {
        setFilter(newFilter);
        applyFilter(logs, newFilter);
    };

    const handleExport = async (type: 'PDF' | 'CSV') => {
        setExporting(true);
        try {
            if (filteredLogs.length === 0) {
                Alert.alert('No Data', 'No logs matching current filter to export.');
                return;
            }

            if (type === 'PDF') {
                const emergencies = filteredLogs.filter(l => l.is_emergency).length;
                const totalFaces = filteredLogs.reduce((acc, l) => acc + l.face_count, 0);
                const peak = Math.max(...filteredLogs.map(l => l.face_count), 0);
                const avgDensity = filteredLogs.length > 0
                    ? filteredLogs.reduce((acc, l) => acc + l.density, 0) / filteredLogs.length
                    : 0;

                await exportPDF(filteredLogs, {
                    peak,
                    avgDensity: parseFloat(avgDensity.toFixed(1)),
                    total: filteredLogs.length,
                    emergencies
                });
            } else {
                await exportCSV(filteredLogs);
            }
        } catch (error) {
            Alert.alert('Export Failed', 'An error occurred while exporting.');
        } finally {
            setExporting(false);
        }
    };

    const renderLogItem = ({ item }: { item: CrowdLog }) => {
        // Density indicator color
        const color = item.density_level === 'HIGH' ? theme.colors.danger
            : item.density_level === 'MEDIUM' ? theme.colors.warning
                : theme.colors.success;

        return (
            <View style={styles.logCard}>
                <View style={[styles.densityIndicator, { backgroundColor: color }]} />

                {item.image_path ? (
                    <Image source={{ uri: item.image_path }} style={styles.thumbnail} />
                ) : (
                    <View style={styles.thumbnailPlaceholder}>
                        <Text style={styles.placeholderIcon}>📷</Text>
                    </View>
                )}

                <View style={styles.logInfo}>
                    <Text style={styles.logTimestamp}>{formatTimestamp(item.timestamp)}</Text>
                    <Text style={styles.logDetails}>
                        <Text style={styles.logFaceCount}>{item.face_count} faces</Text>
                        {' • '}
                        {item.density.toFixed(1)}% density
                    </Text>
                    {item.is_emergency === 1 && (
                        <View style={styles.emergencyBadge}>
                            <Text style={styles.emergencyText}>⚠ EMERGENCY</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>History & Reports</Text>

                <View style={styles.exportActions}>
                    <TouchableOpacity style={styles.exportIconBtn} onPress={() => handleExport('PDF')} disabled={exporting}>
                        <Text style={styles.exportIcon}>📄</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.exportIconBtn} onPress={() => handleExport('CSV')} disabled={exporting}>
                        <Text style={styles.exportIcon}>📊</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {exporting && (
                <View style={styles.exportingBanner}>
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                    <Text style={styles.exportingText}>Generating report...</Text>
                </View>
            )}

            <View style={styles.filterContainer}>
                {(['TODAY', 'WEEK', 'ALL'] as FilterType[]).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                        onPress={() => handleFilterChange(f)}
                    >
                        <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
                            {f === 'TODAY' ? 'Today' : f === 'WEEK' ? 'This Week' : 'All Time'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.accent} />
                    <Text style={styles.loadingText}>Loading history...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredLogs}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    renderItem={renderLogItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyTitle}>No Detections Found</Text>
                            <Text style={styles.emptySubtitle}>
                                Start scanning to build up your history log.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.text,
    },
    exportActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    exportIconBtn: {
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    exportIcon: {
        fontSize: 18,
    },
    exportingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        padding: theme.spacing.sm,
        marginHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.sm,
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    exportingText: {
        color: theme.colors.accent,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterBtnActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    filterBtnText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    filterBtnTextActive: {
        color: theme.colors.white,
        fontWeight: theme.fontWeight.bold,
    },
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
        gap: theme.spacing.sm,
    },
    logCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        alignItems: 'center',
    },
    densityIndicator: {
        width: 4,
        alignSelf: 'stretch',
    },
    thumbnail: {
        width: 60,
        height: 60,
        backgroundColor: '#1E293B',
    },
    thumbnailPlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderIcon: {
        fontSize: 20,
        opacity: 0.5,
    },
    logInfo: {
        flex: 1,
        padding: theme.spacing.md,
        justifyContent: 'center',
    },
    logTimestamp: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.xs,
        marginBottom: 2,
    },
    logDetails: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
    },
    logFaceCount: {
        color: theme.colors.text,
        fontWeight: theme.fontWeight.bold,
        fontSize: theme.fontSize.md,
    },
    emergencyBadge: {
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    emergencyText: {
        color: theme.colors.danger,
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: theme.spacing.md,
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.md,
    },
    emptyState: {
        marginTop: 60,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.lg,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: theme.spacing.sm,
    },
    emptyTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
