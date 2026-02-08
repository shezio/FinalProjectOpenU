import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import '../styles/common.css';
import '../styles/families.css';
import "../i18n";
import { showErrorToast } from '../components/toastUtils';
import Modal from "react-modal";
import { useNavigate } from 'react-router-dom'; // Add this import at the top with others

Modal.setAppElement('#root');

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d)) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function stripTime(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const ENABLE_BULK_DELETE = process.env.REACT_APP_ENABLE_BULK_DELETE === 'true';

const InitialFamilyData = () => {
  const { t } = useTranslation();
  const navigate = useNavigate(); // Add this line
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState([]);
  const [filteredFamilies, setFilteredFamilies] = useState([]);
  const [search, setSearch] = useState('');
  const [filterAdded, setFilterAdded] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(2);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMarkAddedModal, setShowMarkAddedModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);

  // Form state
  const [formData, setFormData] = useState({ names: '', phones: '', other_information: '' });
  const [formErrors, setFormErrors] = useState({});

  // Staff and roles state
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRoles, setCurrentUserRoles] = useState([]);

  // Selected families for bulk actions
  const [selectedFamilies, setSelectedFamilies] = useState([]);

  function parseDate(dateStr) {
    if (!dateStr) return null;
    // Try ISO first
    const iso = Date.parse(dateStr);
    if (!isNaN(iso)) return new Date(iso);
    // Try DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // new Date(year, monthIndex, day)
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return null;
  }
  // Fetch families
  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/get_initial_family_data/');
      setFamilies(response.data.initial_family_data || []);
      setTotalCount(response.data.initial_family_data?.length || 0);
    } catch (error) {
      showErrorToast(t, 'Error fetching initial family data', error);
      setFamilies([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff and roles
  useEffect(() => {
    const fetchStaffAndRoles = async () => {
      try {
        const [staffRes, rolesRes] = await Promise.all([
          axios.get('/api/staff/'),
          axios.get('/api/get_roles/')
        ]);
        setStaff(staffRes.data.staff || []);
        setRoles(rolesRes.data.roles || []);
        // Get current username from localStorage (like in Tutorships.js)
        const username = localStorage.getItem('origUsername');
        const user = staffRes.data.staff.find(u => u.username === username);
        setCurrentUser(user);
        setCurrentUserRoles(user ? user.roles : []);
      } catch (error) {
        // handle error
      }
    };
    fetchStaffAndRoles();
  }, []);

  useEffect(() => {
    fetchFamilies();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setFilteredFamilies(families);
  }, [families]);

  // Add this useEffect to sort whenever sortBy or sortOrder changes
  useEffect(() => {
    let sorted = [...families];
    if (sortBy) {
      sorted.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // For dates, compare as dates
        if (sortBy === 'created_at' || sortBy === 'updated_at') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    setFilteredFamilies(sorted);
    setPage(1); // Optionally reset to first page on sort
  }, [families, sortBy, sortOrder]);

  // Filter and search
  useEffect(() => {
    let filtered = [...families];

    // Search by name or phone
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(f =>
        (f.names && f.names.toLowerCase().includes(searchLower)) ||
        (f.phones && f.phones.toLowerCase().includes(searchLower))
      );
    }

    // Filter by family_added
    if (filterAdded !== '') {
      filtered = filtered.filter(f => String(f.family_added) === filterAdded);
    }

    if (dateFrom) {
      const fromDate = stripTime(new Date(dateFrom));
      filtered = filtered.filter(f => {
        const created = stripTime(parseDate(f.created_at));
        return created && created >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = stripTime(new Date(dateTo));
      filtered = filtered.filter(f => {
        const created = stripTime(parseDate(f.created_at));
        return created && created <= toDate;
      });
    }

    // Sort
    if (sortBy) {
      filtered.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        if (sortBy === 'created_at' || sortBy === 'updated_at') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredFamilies(filtered);
    setPage(1);
  }, [families, search, filterAdded, dateFrom, dateTo, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFamilies.length / pageSize));
  const paginatedFamilies = filteredFamilies.slice((page - 1) * pageSize, page * pageSize);

  // Search handler
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Filter by family_added
  const handleFilterAdded = (e) => {
    setFilterAdded(e.target.value);
    setPage(1);
  };

  // Date range filter
  const handleDateFrom = (e) => {
    setDateFrom(e.target.value);
    setPage(1);
  };
  const handleDateTo = (e) => {
    setDateTo(e.target.value);
    setPage(1);
  };

  // Sort columns
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const openDeleteModal = (family) => {
    setSelectedFamily(family);
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => setShowDeleteModal(false);

  const openMarkAddedModal = (family) => {
    setSelectedFamily(family);
    setShowMarkAddedModal(true);
  };
  const closeMarkAddedModal = () => setShowMarkAddedModal(false);

  // Delete
  const handleDelete = async () => {
    try {
      await axios.delete(`/api/delete_initial_family_data/${selectedFamily.initial_family_data_id}/`);
      toast.success(t('Initial family data deleted!'));
      closeDeleteModal();
      fetchFamilies();
      // Optionally delete related task here if needed
    } catch (error) {
      showErrorToast(t, 'Error deleting initial family data', error);
    }
  };

  // @todo - use this in all refreshes
  const handleRefresh = () => {
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setFilterAdded('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
    fetchFamilies();
  };
  // Mark as added
  const handleMarkAsAdded = async () => {
    try {
      await axios.put(`/api/mark_initial_family_complete/${selectedFamily.initial_family_data_id}/`, { family_added: true });
      toast.success(t('Family marked as added!'));
      closeMarkAddedModal();
      fetchFamilies();
      // Optionally update/delete related task here if needed
    } catch (error) {
      showErrorToast(t, 'Error marking as added', error);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (window.confirm(t('Are you sure you want to delete the selected families? This action cannot be undone.'))) {
      try {
        await Promise.all(selectedFamilies.map(familyId =>
          axios.delete(`/api/delete_initial_family_data/${familyId}/`)
        ));
        toast.success(t('Selected families deleted!'));
        setSelectedFamilies([]);
        fetchFamilies();
      } catch (error) {
        showErrorToast(t, 'Error deleting families', error);
      }
    }
  };

  // Table row color
  const getRowClass = (family) =>
    family.family_added ? "families-row-added" : "";

  const canManage = currentUserRoles.includes('System Administrator') || currentUserRoles.includes('Technical Coordinator');

  return (
    <div className="families-main-content">
      <Sidebar />
      <InnerPageHeader title={t('Initial Family Data')} />
      <div className="filter-create-container">
        <button className="refresh-button" onClick={handleRefresh}>
          {t('Refresh')}
        </button>
        <label htmlFor="date-from">
          {t('Created At From')}
        </label>
        <input
          type="date"
          id="date-from"
          className="init-family-date-input"
          value={dateFrom}
          onChange={handleDateFrom}
        />
        <label htmlFor="date-to">{t('Created At To')}</label>
        <input
          type="date"
          id="date-to"
          className="init-family-date-input"
          value={dateTo}
          onChange={handleDateTo}
        />
        <div className="families-added-filter">
          <label>{t('Family Added')}</label>
          <select
            value={filterAdded}
            onChange={handleFilterAdded}
            style={{ marginRight: '8px' }}
          >
            <option value="">{t('All')}</option>
            <option value="true">{t('Yes')}</option>
            <option value="false">{t('No')}</option>
          </select>
        </div>
        <input
          type="text"
          placeholder={t('Search by name or phone')}
          value={search}
          onChange={handleSearch}
          className="families-search-bar"
        />
      </div>
      {loading ? (
        <div className="loader">{t("Loading data...")}</div>
      ) : (
        <div className="families-grid-container">
          <div className="back-to-families">
            <button
              className="back-button"
              onClick={() => navigate('/families')}
            >
              {t('Back to Families')}
            </button>
          </div>
          <table className="families-data-grid">
            <thead>
              <tr>
                {ENABLE_BULK_DELETE && <th>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedFamilies(checked ? families.map(f => f.initial_family_data_id) : []);
                    }}
                    checked={selectedFamilies.length === families.length && families.length > 0}
                    indeterminate={selectedFamilies.length > 0 && selectedFamilies.length < families.length}
                  />
                </th>}
                <th>{t('Initial Family ID')}</th>
                <th>{t('Names')}</th>
                <th>{t('Phones')}</th>
                <th>{t('Other information')}</th>
                <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                  {t('Created At')} {sortBy === 'created_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('updated_at')} style={{ cursor: 'pointer' }}>
                  {t('Updated At')} {sortBy === 'updated_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>{t('Family Added?')}</th>
                <th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFamilies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">{t('No initial family data to display')}</td>
                </tr>
              ) : (
                paginatedFamilies.map((family) => (
                  <tr key={family.initial_family_id} className={getRowClass(family)}>
                    {ENABLE_BULK_DELETE && <td>
                      <input
                        type="checkbox"
                        checked={selectedFamilies.includes(family.initial_family_data_id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedFamilies(checked ?
                            [...selectedFamilies, family.initial_family_data_id] :
                            selectedFamilies.filter(id => id !== family.initial_family_data_id)
                          );
                        }}
                      />
                    </td>}
                    <td>{family.initial_family_data_id}</td>
                    <td>
                      <div className="td-scrollable">
                        {family.names
                          .split(',')
                          .map((part, idx, arr) => (
                            <React.Fragment key={idx}>
                              {part.trim()}
                              {idx < arr.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                      </div>
                    </td>
                    <td>
                      <div className="td-scrollable">
                        {family.phones
                          .split(',')
                          .map((part, idx, arr) => (
                            <React.Fragment key={idx}>
                              {part.trim()}
                              {idx < arr.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                      </div>
                    </td>
                    <td>
                      <div className="td-x-scrollable">
                        {family.other_information
                          ? family.other_information.split(',').map((part, idx, arr) => (
                            <React.Fragment key={idx}>
                              {part.trim()}
                              {idx < arr.length - 1 && <br />}
                            </React.Fragment>
                          ))
                          : ''}
                      </div>
                    </td>
                    <td>{formatDate(family.created_at)}</td>
                    <td>{formatDate(family.updated_at)}</td>
                    <td>
                      {family.family_added ? (
                        <span className="families-added-yes">{t('Yes')}</span>
                      ) : (
                        <span className="families-added-no">{t('No')}</span>
                      )}
                    </td>
                    <td>
                      <div className="family-actions">
                        <button
                          className={`delete-button${!canManage ? ' button-disabled' : ''}`}
                          onClick={() => openDeleteModal(family)}
                          disabled={!canManage}
                        >
                          {t('Delete')}
                        </button>
                        <button
                          className="mark-added-button"
                          onClick={() => openMarkAddedModal(family)}
                          disabled={family.family_added || !canManage}
                          style={family.family_added ? { cursor: 'not-allowed' } : {}}
                        >
                          {t('Mark as Added')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination Controls */}
          <div className="pagination">
            <button onClick={() => setPage(1)} disabled={page === 1} className="pagination-arrow">&laquo;</button>
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="pagination-arrow">&lsaquo;</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={page === i + 1 ? 'active' : ''}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || totalPages === 1}
              className="pagination-arrow"
            >&rsaquo;</button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 1}
              className="pagination-arrow"
            >&raquo;</button>
          </div>

          {/* Bulk Delete button */}
          {ENABLE_BULK_DELETE && (
            <div className="bulk-delete-container">
              <button
                className="bulk-delete-button"
                onClick={handleBulkDelete}
                disabled={selectedFamilies.length === 0 || !canManage}
              >
                {t('Delete Selected')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onRequestClose={closeDeleteModal}
          contentLabel="Delete Initial Family Data"
          className="delete-modal"
          overlayClassName="delete-modal-overlay"
        >
          <h2>{t('Are you sure you want to delete this initial family data?')}</h2>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            {t('Deleting will remove all associated data and the tasks for tech coordinator will be deleted as well. This action cannot be undone.')}
          </p>
          <div className="modal-actions">
            <button onClick={handleDelete} className="yes-button">
              {t('Yes')}
            </button>
            <button onClick={closeDeleteModal} className="no-button">
              {t('No')}
            </button>
          </div>
        </Modal>
      )}

      {/* Mark as Added Modal */}
      {showMarkAddedModal && (
        <Modal
          isOpen={showMarkAddedModal}
          onRequestClose={closeMarkAddedModal}
          contentLabel="Mark as Added"
          className="delete-modal"
          overlayClassName="delete-modal-overlay"
        >
          <h2>{t('Are you sure you want to mark this initial family data as added?')}</h2>
          <p style={{ color: 'green', fontWeight: 'bold' }}>
            {t('This will auto update the task status to "הושלמה" and delete the task if it was "הושלמה".')}
          </p>
          <div className="modal-actions">
            <button onClick={handleMarkAsAdded} className="yes-button">
              {t('Yes')}
            </button>
            <button onClick={closeMarkAddedModal} className="no-button">
              {t('No')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InitialFamilyData;