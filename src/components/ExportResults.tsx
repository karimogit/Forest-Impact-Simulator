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

interface ExportResultsProps {
  exportData: ExportData;
  disabled?: boolean;
  shareableState?: ShareableState;
  onShareSuccess?: (message: string) => void;
}

const ExportResults: React.FC<ExportResultsProps> = ({ exportData, disabled = false, shareableState, onShareSuccess }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleExport = async (format: 'geojson' | 'json' | 'csv' | 'pdf') => {
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

  if (disabled) {
    return (
      <div className="p-5 md:p-6 bg-gray-50 border-2 border-gray-200 rounded-xl">
        <p className="text-sm text-gray-700 font-medium">Complete your analysis to enable exports</p>
      </div>
    );
  }

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

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-5 md:p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Export and Share Results</h3>
      
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 md:gap-4">
        <button
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="flex flex-col items-center p-4 md:p-5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-primary transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-xl mb-2">📋</div>
          <span className="text-sm md:text-base font-semibold">PDF Report</span>
          <span className="text-xs md:text-sm text-gray-600 hidden sm:block mt-1">Formatted</span>
        </button>

        <button
          onClick={() => handleExport('geojson')}
          disabled={isExporting}
          className="flex flex-col items-center p-4 md:p-5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-primary transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-xl mb-2">🗺️</div>
          <span className="text-sm md:text-base font-semibold">GeoJSON</span>
          <span className="text-xs md:text-sm text-gray-600 hidden sm:block mt-1">GIS tools</span>
        </button>
        
        <button
          onClick={() => handleExport('json')}
          disabled={isExporting}
          className="flex flex-col items-center p-4 md:p-5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-primary transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-xl mb-2">📄</div>
          <span className="text-sm md:text-base font-semibold">JSON</span>
          <span className="text-xs md:text-sm text-gray-600 hidden sm:block mt-1">Complete</span>
        </button>
        
        <button
          onClick={() => handleExport('csv')}
          disabled={isExporting}
          className="flex flex-col items-center p-4 md:p-5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-primary transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-xl mb-2">📊</div>
          <span className="text-sm md:text-base font-semibold">CSV</span>
          <span className="text-xs md:text-sm text-gray-600 hidden sm:block mt-1">R/Python</span>
        </button>

        {shareableState && (
          <button
            onClick={handleShare}
            disabled={disabled || isSharing}
            className="flex flex-col items-center p-4 md:p-5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-primary transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-xl mb-2">🔗</div>
            <span className="text-sm md:text-base font-semibold">Share Link</span>
            <span className="text-xs md:text-sm text-gray-600 hidden sm:block mt-1">Copy URL</span>
          </button>
        )}
      </div>
      
      {(isExporting || isSharing) && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center text-sm text-gray-700">
            <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-primary mr-3"></div>
            {isSharing ? 'Generating share link...' : 'Preparing export...'}
          </div>
        </div>
      )}
      
      <div className="mt-6 p-4 md:p-5 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h4 className="text-sm font-bold text-primary mb-3">Export Includes:</h4>
        <ul className="text-sm md:text-base text-primary space-y-2">
          <li>• Location coordinates and region boundaries</li>
          <li>• Selected tree species/forest types and percentages</li>
          <li>• Environmental data (soil, climate)</li>
          <li>• Impact calculations (carbon sequestration/emissions, biodiversity, etc.)</li>
          <li>• Planting/removal specifications and configuration</li>
          <li>• Simulation metadata and timestamp</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportResults; 