"use client";

import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import {
  ExportData,
  generateGeoJSON,
  generateJSON,
  generateCSV,
  downloadFile,
  formatTimestamp
} from '@/utils/exportUtils';
import { generatePDFReport } from '@/utils/pdfExport';
import { generateShareableUrl, copyToClipboard, ShareableState } from '@/utils/shareableLink';
import { Panel, Callout, EmptyState } from './ui/primitives';
import {
  DownloadIcon,
  LinkIcon,
  FileTextIcon,
  GlobeIcon,
  BracesIcon,
  TableIcon,
  Spinner,
} from './ui/Icons';

interface ExportResultsProps {
  exportData: ExportData;
  disabled?: boolean;
  shareableState?: ShareableState;
  onShareSuccess?: (message: string) => void;
}

type ExportFormat = 'geojson' | 'json' | 'csv' | 'pdf';

const exportOptions: {
  format: ExportFormat;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  { format: 'pdf', label: 'PDF report', hint: 'Formatted summary', icon: <FileTextIcon size={20} /> },
  { format: 'geojson', label: 'GeoJSON', hint: 'GIS tools', icon: <GlobeIcon size={20} /> },
  { format: 'json', label: 'JSON', hint: 'Complete data', icon: <BracesIcon size={20} /> },
  { format: 'csv', label: 'CSV', hint: 'R / Python', icon: <TableIcon size={20} /> },
];

const ExportResults: React.FC<ExportResultsProps> = ({
  exportData,
  disabled = false,
  shareableState,
  onShareSuccess,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (disabled || isExporting) return;

    setIsExporting(true);

    try {
      if (format === 'pdf') {
        await generatePDFReport(exportData);
      } else {
        const timestamp = formatTimestamp();
        let content: string;
        let filename: string;
        let mimeType: string;

        switch (format) {
          case 'geojson':
            content = generateGeoJSON(exportData);
            filename = `forest-impact-analysis-${timestamp}.geojson`;
            mimeType = 'application/geo+json';
            break;
          case 'json':
            content = generateJSON(exportData);
            filename = `forest-impact-analysis-${timestamp}.json`;
            mimeType = 'application/json';
            break;
          case 'csv':
            content = generateCSV(exportData);
            filename = `forest-impact-analysis-${timestamp}.csv`;
            mimeType = 'text/csv';
            break;
          default:
            throw new Error('Unsupported export format');
        }

        downloadFile(content, filename, mimeType);
      }
    } catch (error) {
      logger.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!shareableState || disabled) return;

    setIsSharing(true);
    try {
      const url = generateShareableUrl(shareableState);
      const success = await copyToClipboard(url);

      if (success && onShareSuccess) {
        onShareSuccess('Link copied to clipboard!');
      } else if (!success) {
        onShareSuccess?.('Failed to copy link. Please try again.');
      }
    } catch (error) {
      logger.error('Share failed:', error);
      onShareSuccess?.('Failed to generate share link.');
    } finally {
      setIsSharing(false);
    }
  };

  if (disabled) {
    return (
      <Panel className="p-5 sm:p-6">
        <EmptyState
          icon={<DownloadIcon size={20} />}
          title="Complete your analysis to enable exports"
          description="Select a location, choose species, and review the impact results to unlock PDF, data exports, and shareable links."
        />
      </Panel>
    );
  }

  const busy = isExporting || isSharing;

  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="font-display text-lg text-ink-900">Export and share</h3>
        <p className="mt-0.5 text-sm text-ink-500">
          Download your results or copy a link that restores this exact scenario.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {exportOptions.map(({ format, label, hint, icon }) => (
          <button
            key={format}
            type="button"
            onClick={() => handleExport(format)}
            disabled={busy}
            className="group flex flex-col items-center rounded-2xl border border-sand-200 bg-white p-4 text-center transition-all hover:border-accent hover:bg-accent-soft/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 text-ink-500 transition-colors group-hover:bg-white group-hover:text-accent">
              {icon}
            </span>
            <span className="text-xs font-semibold text-ink-900">{label}</span>
            <span className="mt-0.5 hidden text-[11px] text-ink-400 sm:block">{hint}</span>
          </button>
        ))}

        {shareableState && (
          <button
            type="button"
            onClick={handleShare}
            disabled={busy}
            className="group flex flex-col items-center rounded-2xl border border-sand-200 bg-white p-4 text-center transition-all hover:border-accent hover:bg-accent-soft/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 text-ink-500 transition-colors group-hover:bg-white group-hover:text-accent">
              <LinkIcon size={20} />
            </span>
            <span className="text-xs font-semibold text-ink-900">Share link</span>
            <span className="mt-0.5 hidden text-[11px] text-ink-400 sm:block">Copy URL</span>
          </button>
        )}
      </div>

      {busy && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Spinner size={18} className="text-accent" />
          {isSharing ? 'Generating share link…' : 'Preparing export…'}
        </div>
      )}

      <Callout tone="accent" title="Export includes" className="mt-5">
        <ul className="space-y-1 text-sm">
          <li>Location coordinates and region boundaries</li>
          <li>Selected tree species and percentage distribution</li>
          <li>Environmental data (soil, climate)</li>
          <li>Impact calculations (carbon, biodiversity, resilience, and more)</li>
          <li>Planting or removal specifications and configuration</li>
          <li>Simulation metadata and timestamp</li>
        </ul>
      </Callout>
    </Panel>
  );
};

export default ExportResults;
