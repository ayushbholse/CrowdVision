import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { theme } from '../styles/theme';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getRecentCrowdLogs, getAverageDensity, getPeakFaceCount } from '../database/crowdRepository';
import { formatTimestamp } from '../utils/timeFormatter';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
    backgroundGradientFrom: theme.colors.secondary,
    backgroundGradientTo: theme.colors.secondary,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    propsForDots: {
        r: "4",
        strokeWidth: "2",
        stroke: theme.colors.secondary
    }
};

export default function AnalyticsScreen() {
    const [timelineData, setTimelineData] = useState<any>(null);
    const [dailyData, setDailyData] = useState<any>(null);
    const [avgDensity, setAvgDensity] = useState(0);
    const [peakCount, setPeakCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            // Get last 20 logs for timeline
            const logs = await getRecentCrowdLogs(20);
            const avg = await getAverageDensity();
            const peak = await getPeakFaceCount();

            setAvgDensity(avg);
            setPeakCount(peak);

            if (logs.length > 0) {
                // Reversed so oldest is on the left, newest on right
                const reversedLogs = [...logs].reverse();

                // --- LINE CHART (Faces over time) ---
                // ChartKit requires at least 2 points to draw a line
                const displayLogs = reversedLogs.length === 1
                    ? [reversedLogs[0], { ...reversedLogs[0], id: 'dummy', timestamp: new Date(new Date(reversedLogs[0].timestamp).getTime() + 1000).toISOString() }]
                    : reversedLogs;

                // Take evenly spaced samples if there are too many (to fit labels)
                const sampleRate = Math.max(1, Math.floor(displayLogs.length / 6));
                const labels = displayLogs.map((l, i) =>
                    i % sampleRate === 0 || i === displayLogs.length - 1
                        ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''
                );

                setTimelineData({
                    labels: labels,
                    datasets: [{
                        data: displayLogs.map(l => l.face_count),
                        color: (opacity = 1) => theme.colors.accent,
                        strokeWidth: 3,
                    }],
                });

                // --- BAR CHART (Daily / Level stats) ---
                // Group by density level
                const levels = { LOW: 0, MEDIUM: 0, HIGH: 0 };
                logs.forEach(l => {
                    if (l.density_level === 'LOW') levels.LOW++;
                    if (l.density_level === 'MEDIUM') levels.MEDIUM++;
                    if (l.density_level === 'HIGH') levels.HIGH++;
                });

                setDailyData({
                    labels: ['Safe', 'Caution', 'Danger'],
                    datasets: [{
                        data: [levels.LOW, levels.MEDIUM, levels.HIGH] // The counts
                    }]
                });
            } else {
                setTimelineData(null);
                setDailyData(null);
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} tintColor={theme.colors.accent} />}
            >
                <Text style={styles.title}>Data Analytics</Text>

                {/* KPI Cards */}
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Avg Density</Text>
                        <Text style={[styles.kpiValue, { color: avgDensity > 50 ? theme.colors.danger : theme.colors.success }]}>
                            {avgDensity.toFixed(1)}%
                        </Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>Peak Faces</Text>
                        <Text style={styles.kpiValue}>{peakCount}</Text>
                    </View>
                </View>

                {/* Timeline Chart */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Detection Timeline</Text>
                    <Text style={styles.chartSubtitle}>Faces detected over recent sessions</Text>

                    {timelineData ? (
                        <LineChart
                            data={timelineData}
                            width={screenWidth - 48} // Padding
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                            withDots={timelineData.datasets[0].data.length < 15}
                            withInnerLines={true}
                            withOuterLines={false}
                            yAxisLabel=""
                            yAxisSuffix=""
                        />
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyText}>No detection data yet</Text>
                        </View>
                    )}
                </View>

                {/* Bar Chart */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Safety Distribution</Text>
                    <Text style={styles.chartSubtitle}>Frequency of crowd density levels</Text>

                    {dailyData ? (
                        <BarChart
                            data={{
                                labels: dailyData.labels,
                                datasets: [{ data: dailyData.datasets[0].data }]
                            }}
                            width={screenWidth - 48}
                            height={220}
                            chartConfig={{
                                ...chartConfig,
                                color: (opacity = 1) => theme.colors.accent,
                            }}
                            style={styles.chart}
                            yAxisLabel=""
                            yAxisSuffix=""
                            showValuesOnTopOfBars
                            fromZero
                        />
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyText}>No distribution data</Text>
                        </View>
                    )}
                </View>

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Safety Status</Text>
                    <Text style={styles.statusDescription}>
                        The environment is currently averaging {avgDensity.toFixed(1)}% density.
                        {avgDensity > 60 ? " Warning: High density detected frequently." : " Safety levels are acceptable."}
                    </Text>
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
        paddingBottom: theme.spacing.xxl,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.extrabold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    kpiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    kpiCard: {
        flex: 1,
        backgroundColor: theme.colors.secondary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
    },
    kpiLabel: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    kpiValue: {
        color: theme.colors.accent,
        fontSize: theme.fontSize.xxl,
        fontWeight: '900',
    },
    chartContainer: {
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    chartTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    chartSubtitle: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    chart: {
        marginVertical: 4,
        borderRadius: 12,
        marginLeft: -16, // Adjusting for chart kit padding
    },
    emptyChart: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: theme.fontSize.md,
    },
    summaryCard: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(37, 99, 235, 0.3)',
    },
    summaryTitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    statusDescription: {
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        lineHeight: 20,
    },
});
