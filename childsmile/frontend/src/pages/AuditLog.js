import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/auditlog.css'; // Special CSS for this page
import axios from '../axiosConfig';
import { toast } from 'react-toastify';
import { hasAllPermissions } from '../components/utils';
import { useTranslation } from 'react-i18next'; // Translation hook
import { showErrorToast } from '../components/toastUtils'; // Toast utility
import { exportAuditToCSV, exportAuditToPDF } from '../components/export_utils'; // Export utilities
const requiredPermissions = [
  { resource: 'childsmile_app_staff', action: 'VIEW' },
  { resource: 'childsmile_app_staff', action: 'CREATE' },
  { resource: 'childsmile_app_staff', action: 'UPDATE' },
  { resource: 'childsmile_app_staff', action: 'DELETE' },
];

const AuditLog = () => {
  const { t } = useTranslation(); // Initialize translation
  const hasPermissionOnAuditLog = hasAllPermissions(requiredPermissions);

  // State for audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('desc'); // 'asc' or 'desc'
  const [page, setPage] = useState(1);
  const [pageSize] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [actionTranslations, setActionTranslations] = useState({}); // Store action translations
  
  // Purge modal state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeData, setPurgeData] = useState(null);
  const [purgeCheckboxChecked, setPurgeCheckboxChecked] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);

  // Fetch audit logs on component mount
  useEffect(() => {
    if (hasPermissionOnAuditLog) {
      fetchAuditLogs();
    } else {
      setLoading(false);
    }
  }, [hasPermissionOnAuditLog]);

  // Fetch audit logs and extract unique actions
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/audit-logs/');
      const logs = response.data.audit_logs || [];
      const translations = response.data.action_translations || {};
      
      setAuditLogs(logs);
      setFilteredLogs(logs);
      setTotalCount(logs.length);
      setSelectedLogs(new Set()); // Clear selections on refresh
      setActionTranslations(translations); // Store translations
      
      // Extract unique actions from logs
      const uniqueActions = [...new Set(logs.map(log => log.action))].sort();
      setActions(uniqueActions);
      
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      showErrorToast(t, t('Failed to fetch audit logs'), error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to translate description keys
  const translateDescription = (description) => {
    if (!description) return description;
    
    let translated = description;
    const keys = description.match(/\[([^\]]+)\]/g) || [];
    
    keys.forEach(key => {
      const translatedValue = t(key);
      translated = translated.replace(key, translatedValue);
    });
    
    return translated;
  };

  // Apply filters and sorting
  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedAction, startDate, endDate, sortBy, auditLogs]);

  // Apply all filters and sorting
  const applyFilters = () => {
    let filtered = auditLogs;

    // Filter by search query (description)
    if (searchQuery.trim()) {
      filtered = filtered.filter(log =>
        log.description && log.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by action
    if (selectedAction) {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate <= end;
      });
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return sortBy === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredLogs(filtered);
    setTotalCount(filtered.length);
    setPage(1); // Reset to page 1 when filters change
    setSelectedLogs(new Set()); // Clear selections when filtering
  };

  // Handle checkbox change
  const handleCheckboxChange = (logId) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  // Handle select all checkbox
  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      const allLogIds = new Set(paginatedLogs.map((log, index) => `${page}-${index}`));
      setSelectedLogs(allLogIds);
    } else {
      setSelectedLogs(new Set());
    }
  };

  // Handle refresh - reset filters and selections
  const handleRefresh = () => {
    setSearchQuery('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    setSortBy('desc');
    setPage(1);
    setSelectedLogs(new Set());
    fetchAuditLogs();
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    try {
      // Check if this is a Select All click (selected logs match all filtered logs across all pages)
      const isSelectAllClickExport = selectedLogs.size > 0 && selectedLogs.size === filteredLogs.length;
      
      // Get logs to export (can be empty - util will validate and show error toast)
      let logsToExport = [];
      if (selectedLogs.size > 0) {
        if (isSelectAllClickExport) {
          logsToExport = filteredLogs;
        } else {
          logsToExport = paginatedLogs.filter((log, index) => selectedLogs.has(`${page}-${index}`));
        }
      }
      // If no logs selected, logsToExport stays empty and util will validate

      // Generate filename only if we have logs
      let filename = `audit_log_${new Date().getTime()}`;
      if (logsToExport.length > 0) {
        const sortedLogs = [...logsToExport].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        const firstDate = new Date(sortedLogs[0].timestamp);
        const lastDate = new Date(sortedLogs[sortedLogs.length - 1].timestamp);
        
        const now = new Date();
        const timeStamp = now.getHours().toString().padStart(2, '0') + 
                          now.getMinutes().toString().padStart(2, '0') + 
                          now.getSeconds().toString().padStart(2, '0');
        
        const firstDateStr = `${String(firstDate.getMonth() + 1).padStart(2, '0')}_${firstDate.getFullYear()}`;
        const lastDateStr = `${String(lastDate.getMonth() + 1).padStart(2, '0')}_${lastDate.getFullYear()}`;
        
        filename = `audit_log_${firstDateStr}_to_${lastDateStr}_${timeStamp}`;
      }

      // Format logs for export
      const formattedLogs = logsToExport.map(log => ({
        Timestamp: new Date(log.timestamp).toLocaleString('he-IL'),
        Description: translateDescription(log.description),
        'User Email': log.user_email,
        'User Roles': Array.isArray(log.user_roles) ? log.user_roles.join(', ') : log.user_roles,
        Action: log.action,
        'Source IP': log.ip_address,
        Status: log.success ? 'Success' : 'Failed',
      }));

      // Call export utility - ALWAYS show success toast from util (never skip)
      const exportSuccess = await exportAuditToCSV(formattedLogs, t, filename, false);
      
      // ONLY if export was successful AND user clicked "Select all rows", check for purge
      if (exportSuccess && isSelectAllClickExport && selectedLogs.size === filteredLogs.length) {
        // Just get cutoff info to show in the modal, don't actually call purge API yet
        const cutoffDate = new Date(new Date().getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
        const oldLogs = auditLogs.filter(log => new Date(log.timestamp) < cutoffDate);
        
        if (oldLogs.length === 0) {
          // Show info toast ONCE - no purge needed
          setTimeout(() => {
            toast.dismiss('audit-no-old-logs');
            toast.info(
              `ℹ️ אין רשומות ישנות מ-90 ימים למחיקה. תאריך יום סף: ${cutoffDate.toLocaleDateString('he-IL')}`,
              { toastId: 'audit-no-old-logs', autoClose: 4000 }
            );
          }, 100);
        } else {
          // Set purge data and show modal - NO API CALL YET
          setPurgeData({
            record_count: oldLogs.length,
            cutoff_date: cutoffDate.toLocaleDateString('he-IL'),
            first_log_date: oldLogs.length > 0 ? new Date(oldLogs[0].timestamp).toLocaleDateString('he-IL') : 'N/A',
            last_log_date: oldLogs.length > 0 ? new Date(oldLogs[oldLogs.length - 1].timestamp).toLocaleDateString('he-IL') : 'N/A',
            logsToExport: oldLogs,
            filename: filename
          });
          setShowPurgeModal(true);
          setPurgeCheckboxChecked(false);
        }
      }
      
    } catch (error) {
      console.error('Error in handleExportCSV:', error);
      // Don't show error toast here - let export_utils.js handle all error messages
    }
  };

  // Handle export to PDF
  const handleExportPDF = () => {
    try {
      // Check if "Select All Rows" was clicked (all filtered logs selected)
      const isSelectingAll = selectedLogs.size === filteredLogs.length;
      
      let selectedData;
      if (isSelectingAll) {
        // Export ALL filtered logs across all pages
        selectedData = filteredLogs.map(log => ({
          [t('Timestamp')]: new Date(log.timestamp).toLocaleString(navigator.language || 'he-IL'),
          [t('Description')]: translateDescription(log.description),
          [t('Action')]: t(log.action),
          [t('User Roles')]: Array.isArray(log.user_roles) ? log.user_roles.map(role => t(role)).join(', ') : t(log.user_roles),
          [t('User Email')]: log.user_email,
          [t('IP Address')]: log.ip_address,
        }));
      } else {
        // Export only selected logs from current page
        selectedData = paginatedLogs
          .filter((log, index) => selectedLogs.has(`${page}-${index}`))
          .map(log => ({
            [t('Timestamp')]: new Date(log.timestamp).toLocaleString(navigator.language || 'he-IL'),
            [t('Description')]: translateDescription(log.description),
            [t('Action')]: t(log.action),
            [t('User Roles')]: Array.isArray(log.user_roles) ? log.user_roles.map(role => t(role)).join(', ') : t(log.user_roles),
            [t('User Email')]: log.user_email,
            [t('IP Address')]: log.ip_address,
          }));
      }

      exportAuditToPDF(selectedData, t);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      showErrorToast(t, t('Failed to export to PDF'), error);
    }
  };

  // Handle select all rows across all pages
  const handleSelectAllRows = () => {
    const allLogIds = new Set();
    // Iterate through ALL filtered logs and create IDs for each page
    filteredLogs.forEach((log, globalIndex) => {
      // Calculate which page this log would be on
      const pageNum = Math.floor(globalIndex / pageSize) + 1;
      // Calculate the index within that page
      const indexInPage = globalIndex % pageSize;
      allLogIds.add(`${pageNum}-${indexInPage}`);
    });
    setSelectedLogs(allLogIds);
    // Don't show toast here - export will show success toast
  };

  // Handle confirm purge (after checkbox is checked) - performs CSV export + ZIP
  const handleConfirmPurge = async () => {
    if (!purgeCheckboxChecked) {
      toast.warning(t('Please check the safety checkbox to confirm'));
      return;
    }

    try {
      setPurgeLoading(true);
      
      // Step 1: Export logs to CSV/ZIP (skip success toast since purge has its own success message)
      if (purgeData && purgeData.logsToExport && purgeData.logsToExport.length > 0) {
        const formattedLogs = purgeData.logsToExport.map(log => ({
          Timestamp: new Date(log.timestamp).toLocaleString('he-IL'),
          Description: translateDescription(log.description),
          'User Email': log.user_email,
          'User Roles': Array.isArray(log.user_roles) ? log.user_roles.join(', ') : log.user_roles,
          Action: log.action,
          'Source IP': log.ip_address,
          Status: log.success ? 'Success' : 'Failed',
        }));
        
        // Use export utility with custom filename - skip success toast for purge
        const exportSuccess = await exportAuditToCSV(formattedLogs, t, purgeData.filename, true);
        if (!exportSuccess) {
          // Export failed, don't continue with purge
          setPurgeLoading(false);
          return;
        }
      }

      // Step 2: NOW call the backend to DELETE the old logs
      const purgeResponse = await axios.post('/api/purge-old-audit-logs/');
      
      if (purgeResponse.data.success) {
        // Show success message with deletion confirmation
        toast.success(
          <div>
            <div>✅ {purgeResponse.data.deleted_count} {t('audit logs exported and DELETED')}</div>
            <div style={{ marginTop: '8px' }}>📁 {t('Backup file')}: {purgeData.filename}.zip</div>
            <div style={{ marginTop: '8px' }}>�️ {t('Old records permanently removed from database')}</div>
          </div>
        );
      } else {
        showErrorToast(t, t('Purge failed'), new Error(purgeResponse.data.message || 'Unknown error'));
        return; // Don't close modal if purge failed
      }

      // Close modal and refresh
      setShowPurgeModal(false);
      setPurgeCheckboxChecked(false);
      setPurgeData(null);
      fetchAuditLogs();
      
    } catch (error) {
      console.error('Error during purge:', error);
      showErrorToast(t, t('Error during purge process'), error);
    } finally {
      setPurgeLoading(false);
    }
  };

  // Handle cancel purge
  const handleCancelPurge = () => {
    setShowPurgeModal(false);
    setPurgeCheckboxChecked(false);
    setPurgeData(null);
  };

  // Paginate filtered logs
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get page numbers to display (1, 2, 3 or 2, 3, 4, etc.)
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 3;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, page - 1);
      const endPage = Math.min(totalPages, page + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (!hasPermissionOnAuditLog) {
    return (
      <div className="audit-log-main-content">
        <Sidebar />
        <InnerPageHeader title={t('Audit Log')} />
        <div className="no-permission">
          <h2>{t('You do not have permission to view this page')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-log-main-content">
      <Sidebar />
      <InnerPageHeader title={t('Audit Log')} />

      {loading ? (
        <div className="audit-log-container">
          <div className="loader">{t('Loading audit logs...')}</div>
        </div>
      ) : (
        <div className="audit-log-container">
          {/* Controls Section - Search and Filters */}
          <div className="filter-create-container">
            <div className="audit-log-actions">
              <button onClick={handleExportCSV} className="export-button excel-button" title={t('Export to CSV')}>
                <img src="/assets/excel-icon.png" alt="CSV" />
              </button>
              <button onClick={handleExportPDF} className="export-button pdf-button">
                <img src="/assets/pdf-icon.png" alt="PDF" />
              </button>
              <button onClick={handleSelectAllRows} className="select-all-button" title={t('Select all rows across all pages')}>
                {t('Select all rows')} <br/> {t('across all pages')}
              </button>
            </div>
            {/* Search Bar */}
            <div className="audit-log-search-group">
              <input
                type="text"
                placeholder={t('Search in description...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="audit-log-search-bar"
              />
            </div>

            {/* Filters */}
            <div className="audit-log-filters">
              <div className="filter-group">
                <label>{t('Filter by Action')}</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="filter-select"
                >
                  <option value="">{t('All Actions')}</option>
                  {actions.map(action => (
                    <option key={action} value={action}>
                      {actionTranslations[action] || action}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>{t('Start Date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>

              <div className="filter-group">
                <label>{t('End Date')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="audit-log-actions">
              <button onClick={handleRefresh} className="refresh-button">
                {t('Refresh')}
              </button>
            </div>
          </div>

          {/* Data Grid Section */}
          <div className="audit-log-grid-container">
            {filteredLogs.length === 0 ? (
              <div className="no-data">{t('No audit logs to display')}</div>
            ) : (
              <>
                <table className="audit-log-data-grid">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox" className='audit-checkbox'
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={selectedLogs.size > 0 && selectedLogs.size === paginatedLogs.length}
                        />
                      </th>
                      <th>
                        {t('Timestamp')}
                        <button
                          className="sort-button"
                          onClick={() => setSortBy(sortBy === 'desc' ? 'asc' : 'desc')}
                        >
                          {sortBy === 'desc' ? '▼' : '▲'}
                        </button>
                      </th>
                      <th>{t('Description')}</th>
                      <th>{t('User Roles')}</th>
                      <th>{t('Source IP')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="checkbox" className='audit-checkbox'
                            checked={selectedLogs.has(`${page}-${index}`)}
                            onChange={() => handleCheckboxChange(`${page}-${index}`)}
                          />
                        </td>
                        <td className="timestamp-column">
                          {new Date(log.timestamp).toLocaleString(navigator.language || 'he-IL')}
                        </td>
                        <td className="description-column">{translateDescription(log.description)}</td>
                        <td className="description-column">
                          {Array.isArray(log.user_roles) 
                            ? log.user_roles.map(role => t(role)).join(', ')
                            : t(log.user_roles)
                          }
                        </td>
                        <td className="ip-column">{log.ip_address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="pagination">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1 || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1 || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &lsaquo;
                  </button>

                  {getPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={page === pageNum ? 'active' : ''}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &rsaquo;
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages || totalPages <= 1}
                    className="pagination-arrow"
                  >
                    &raquo;
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Purge Modal */}
      {showPurgeModal && purgeData && (
        <div className="modal-overlay">
          <div className="modal-content purge-modal">
            <div className="modal-header">
              <h2>� {t('Export Old Audit Logs')}</h2>
              <button className="modal-close" onClick={handleCancelPurge}>✕</button>
            </div>

            <div className="modal-body">
              <div className="purge-info-section">
                <h3>{t('Data Summary')}</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">{t('Records to Export')}:</span>
                    <span className="value">{purgeData.record_count}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('Date Range')}:</span>
                    <span className="value">{purgeData.first_log_date} → {purgeData.last_log_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('Cutoff Date (90 days)')}:</span>
                    <span className="value highlight">{purgeData.cutoff_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">{t('Export Filename')}:</span>
                    <span className="value filename">{purgeData.filename}</span>
                  </div>
                </div>
              </div>

              <div className="warning-section">
                <h3>⚠️ {t('Important Information')}</h3>
                <ul className="warning-list">
                  <li>{t('All data will be exported to CSV and zipped before deletion')}</li>
                  <li>{t('Check the 1st and last items in the CSV to verify the correct date range')}</li>
                  <li>{t('The exported dates MUST match the filename dates shown above')}</li>
                  <li>{t('Only logs OLDER than 90 days will be affected')}</li>
                  <li>
                    <strong>{t('Upload the exported ZIP to Google Drive immediately for backup')}</strong>
                  </li>
                  <li>{t('The filename includes the exact export timestamp for audit purposes')}</li>
                </ul>
              </div>

              <div className="checkbox-section">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={purgeCheckboxChecked}
                    onChange={(e) => setPurgeCheckboxChecked(e.target.checked)}
                    className="safety-checkbox"
                  />
                  <span className="checkbox-text">
                    {t('I understand that this action will permanently delete')} {purgeData.record_count} {t('audit log records older than 90 days. I have saved the exported CSV as backup.')}
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={handleCancelPurge}
                disabled={purgeLoading}
              >
                {t('Cancel')}
              </button>
              <button 
                className="btn audit-btn-danger"
                onClick={handleConfirmPurge}
                disabled={!purgeCheckboxChecked || purgeLoading}
              >
                {purgeLoading ? t('Processing...') : `✓ ${t('Export & Purge')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;