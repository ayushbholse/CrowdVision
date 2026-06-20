// src/components/CrowdHeatmapOverlay.tsx
import React, { useMemo } from 'react';
import { View as RNView, StyleSheet, useWindowDimensions } from 'react-native';
import { BoundingBox } from '../services/faceDetectionService';

const View = RNView as any; // Bypass React 19 key typing mismatch

interface HeatmapProps {
    boxes: BoundingBox[];
}

// How many rows and columns for our grid
const GRID_ROWS = 3;
const GRID_COLS = 3;

/**
 * Calculates a dynamic background color based on the number of faces in a grid cell.
 * Green = Low density (0-1)
 * Yellow = Medium density (2-3)
 * Red = High density (4+)
 */
const getCellColor = (count: number): string => {
    if (count === 0) return 'transparent'; // Completely hide empty cells
    if (count <= 1) return 'rgba(34, 197, 94, 0.15)'; // Green
    if (count <= 3) return 'rgba(250, 204, 21, 0.25)'; // Yellow
    return 'rgba(239, 68, 68, 0.4)'; // Red
};

export default function CrowdHeatmapOverlay({ boxes }: HeatmapProps) {
    const { width, height } = useWindowDimensions();

    const grid = useMemo(() => {
        // Initialize an empty 3x3 grid
        const cells = Array(GRID_ROWS).fill(0).map(() => Array(GRID_COLS).fill(0));

        // Tally up faces in each cell based on the center of their bounding box
        boxes.forEach((box) => {
            // Box coordinates are normalized 0-1
            const centerX = box.x + (box.width / 2);
            const centerY = box.y + (box.height / 2);

            // Determine which column and row this falls into (0, 1, or 2)
            const col = Math.floor(Math.min(centerX * GRID_COLS, GRID_COLS - 1));
            const row = Math.floor(Math.min(centerY * GRID_ROWS, GRID_ROWS - 1));

            cells[row][col]++;
        });

        return cells;
    }, [boxes]);

    return (
        <View style={[StyleSheet.absoluteFill, styles.heatmapContainer]} pointerEvents="none">
            {grid.map((row, rIdx) => (
                <View key={`row-${rIdx}`} style={styles.gridRow}>
                    {row.map((count, cIdx) => (
                        <View
                            key={cIdx}
                            style={[
                                styles.gridCell,
                                { backgroundColor: getCellColor(count) },
                            ]}
                        />
                    ))}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    heatmapContainer: {
        flexDirection: 'column',
        zIndex: 5, // Sits above camera, below main UI elements
    },
    gridRow: {
        flex: 1,
        flexDirection: 'row',
    },
    gridCell: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
});
