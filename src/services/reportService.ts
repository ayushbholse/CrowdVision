// src/services/reportService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { CrowdLog } from '../database/crowdRepository';
import { formatTimestamp } from '../utils/timeFormatter';

/**
 * Generate a CSV string from crowd logs.
 */
export function generateCSV(logs: CrowdLog[]): string {
  const header = 'ID,Timestamp,Face Count,Density (%),Density Level,Emergency,Image Path\n';
  const rows = logs.map((l) =>
    [
      l.id ?? '',
      formatTimestamp(l.timestamp),
      l.face_count,
      l.density.toFixed(1),
      l.density_level,
      l.is_emergency ? 'YES' : 'NO',
      l.image_path ?? '',
    ].join(','),
  );
  return header + rows.join('\n');
}

/**
 * Generate an HTML string for PDF rendering.
 */
export function generatePDFHtml(logs: CrowdLog[], summary: {
  peak: number;
  avgDensity: number;
  total: number;
  emergencies: number;
}): string {
  const rows = logs
    .slice(0, 100)
    .map(
      (l) => `
    <tr style="border-bottom: 1px solid #334155;">
      <td>${formatTimestamp(l.timestamp)}</td>
      <td style="text-align:center">${l.face_count}</td>
      <td style="text-align:center">${l.density.toFixed(1)}%</td>
      <td style="text-align:center; color:${l.density_level === 'HIGH'
          ? '#EF4444'
          : l.density_level === 'MEDIUM'
            ? '#FACC15'
            : '#22C55E'
        }">${l.density_level}</td>
      <td style="text-align:center">${l.is_emergency ? '🚨 YES' : '—'}</td>
    </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CrowdVision Report</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #0F172A; color: #F1F5F9; padding: 24px; }
    h1 { color: #2563EB; margin-bottom: 4px; }
    h2 { color: #94A3B8; font-size: 14px; font-weight: normal; margin-top: 0; }
    .summary { display: flex; gap: 16px; margin: 24px 0; }
    .card { background: #1E293B; border-radius: 12px; padding: 16px 24px; flex: 1; }
    .card .label { color: #64748B; font-size: 12px; margin-bottom: 4px; }
    .card .value { font-size: 28px; font-weight: 700; color: #F1F5F9; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { background: #1E293B; padding: 10px; text-align: left; font-size: 13px; color: #94A3B8; }
    td { padding: 10px; font-size: 13px; }
    .footer { margin-top: 32px; color: #64748B; font-size: 11px; text-align: center; }
  </style>
</head>
<body>
  <h1>🎯 CrowdVision — Crowd Analysis Report</h1>
  <h2>Generated: ${new Date().toLocaleString('en-IN')}</h2>

  <div class="summary">
    <div class="card">
      <div class="label">Total Sessions</div>
      <div class="value">${summary.total}</div>
    </div>
    <div class="card">
      <div class="label">Peak Face Count</div>
      <div class="value">${summary.peak}</div>
    </div>
    <div class="card">
      <div class="label">Avg Density</div>
      <div class="value">${summary.avgDensity}%</div>
    </div>
    <div class="card">
      <div class="label">Emergencies</div>
      <div class="value" style="color:#EF4444">${summary.emergencies}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Faces</th>
        <th>Density</th>
        <th>Level</th>
        <th>Emergency</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    CrowdVision — Mobile Application for Face Detection and Crowd Analysis<br/>
    Confidential Government Monitoring Report
  </div>
</body>
</html>`;
}

/**
 * Export logs as PDF and share.
 */
export async function exportPDF(logs: CrowdLog[], summary: {
  peak: number;
  avgDensity: number;
  total: number;
  emergencies: number;
}): Promise<void> {
  const html = generatePDFHtml(logs, summary);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Crowd Analysis Report',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Export logs as CSV and share.
 */
export async function exportCSV(logs: CrowdLog[]): Promise<void> {
  const csv = generateCSV(logs);
  const filename = `crowdvision_report_${Date.now()}.csv`;
  // @ts-ignore
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Share Crowd Analysis CSV',
    UTI: 'public.comma-separated-values-text',
  });
}

