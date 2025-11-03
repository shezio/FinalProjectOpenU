import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/auditlog.css'; // Special CSS for this page
import axios from '../axiosConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasAllPermissions } from '../components/utils';
import { useTranslation } from 'react-i18next'; // Translation hook
import { showErrorToast } from '../components/toastUtils'; // Toast utility
import { exportAuditToExcel, exportAuditToPDF } from '../components/export_utils'; // Export utilities

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
  const [pageSize] = useState(2);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [actionTranslations, setActionTranslations] = useState({}); // Store action translations

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

  // Handle export to Excel
  const handleExportExcel = () => {
    try {
      // Check if "Select All Rows" was clicked (all filtered logs selected)
      const isSelectingAll = selectedLogs.size === filteredLogs.length;
      
      let selectedData;
      if (isSelectingAll) {
        // Export ALL filtered logs across all pages
        selectedData = filteredLogs.map(log => ({
          [t('Timestamp')]: new Date(log.timestamp).toLocaleString(navigator.language || 'he-IL'),
          [t('Description')]: log.description,
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
            [t('Description')]: log.description,
            [t('Action')]: t(log.action),
            [t('User Roles')]: Array.isArray(log.user_roles) ? log.user_roles.map(role => t(role)).join(', ') : t(log.user_roles),
            [t('User Email')]: log.user_email,
            [t('IP Address')]: log.ip_address,
          }));
      }

      exportAuditToExcel(selectedData, t);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showErrorToast(t, t('Failed to export to Excel'), error);
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
          [t('Description')]: log.description,
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
            [t('Description')]: log.description,
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
    filteredLogs.forEach((log, index) => {
      // Create IDs for all filtered logs across all pages
      const pageNum = Math.floor(index / pageSize) + 1;
      const indexInPage = index % pageSize;
      allLogIds.add(`${pageNum}-${indexInPage}`);
    });
    setSelectedLogs(allLogIds);
    toast.info(`${t('Selected')} ${allLogIds.size} ${t('logs')}`);
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
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        rtl={true}
      />

      {loading ? (
        <div className="audit-log-container">
          <div className="loader">{t('Loading audit logs...')}</div>
        </div>
      ) : (
        <div className="audit-log-container">
          {/* Controls Section - Search and Filters */}
          <div className="filter-create-container">
            <div className="audit-log-actions">
              <button onClick={handleExportExcel} className="export-button excel-button">
                <img src="/assets/excel-icon.png" alt="Excel" />
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
                        <td className="description-column">{log.description}</td>
                        <td className="description-column">
                          {Array.isArray(log.user_roles) 
                            ? log.user_roles.map(role => t(role)).join(', ')
                            : t(log.user_roles)
                          }
                        </td>
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
    </div>
  );
};

export default AuditLog;