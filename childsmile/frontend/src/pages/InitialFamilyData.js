import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  const [pageSize] = useState(4);
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

  // Fetch families
  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const params = {
        search,
        family_added: filterAdded,
        created_at_from: dateFrom,
        created_at_to: dateTo,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      const response = await axios.get('/api/get_initial_family_data/', { params });
      setFamilies(response.data.initial_family_data || []); // <-- fix here
      setTotalCount(response.data.initial_family_data?.length || 0); // <-- and here
    } catch (error) {
      showErrorToast(t, 'Error fetching initial family data', error);
      setFamilies([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
    // eslint-disable-next-line
  }, [search, filterAdded, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    setFilteredFamilies(families);
  }, [families]);

  // Pagination
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

  // Modal open/close
  const openCreateModal = () => {
    setFormData({ names: '', phones: '', other_information: '' });
    setFormErrors({});
    setShowCreateModal(true);
  };
  const closeCreateModal = () => setShowCreateModal(false);

  const openUpdateModal = (family) => {
    setSelectedFamily(family);
    setFormData({
      names: family.names || '',
      phones: family.phones || '',
      other_information: family.other_information || ''
    });
    setFormErrors({});
    setShowUpdateModal(true);
  };
  const closeUpdateModal = () => setShowUpdateModal(false);

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

  // Validation
  const validateCreate = () => {
    const errors = {};
    if (!formData.names || formData.names.length < 10 || !formData.names.includes(',')) {
      errors.names = t('Names must be at least 10 characters and contain a comma.');
    }
    if (!formData.phones || formData.phones.length < 10 || !formData.phones.includes(',')) {
      errors.phones = t('Phones must be at least 10 characters and contain a comma.');
    }
    return errors;
  };
  const validateUpdate = () => {
    const errors = {};
    if (!formData.names) errors.names = t('Names is required.');
    if (!formData.phones) errors.phones = t('Phones is required.');
    return errors;
  };

  // Create
  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateCreate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await axios.post('/api/create_initial_family_data/', formData);
      toast.success(t('Initial family data created!'));
      closeCreateModal();
      fetchFamilies();
    } catch (error) {
      showErrorToast(t, 'Error creating initial family data', error);
    }
  };

  // Update
  const handleUpdate = async (e) => {
    e.preventDefault();
    const errors = validateUpdate();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await axios.put(`/api/update_initial_family_data/${selectedFamily.initial_family_id}/`, formData);
      toast.success(t('Initial family data updated!'));
      closeUpdateModal();
      fetchFamilies();
      // Optionally update related task here if needed
    } catch (error) {
      showErrorToast(t, 'Error updating initial family data', error);
    }
  };

  // Delete
  const handleDelete = async () => {
    try {
      await axios.delete(`/api/delete_initial_family_data/${selectedFamily.initial_family_id}/`);
      toast.success(t('Initial family data deleted!'));
      closeDeleteModal();
      fetchFamilies();
      // Optionally delete related task here if needed
    } catch (error) {
      showErrorToast(t, 'Error deleting initial family data', error);
    }
  };

  // Mark as added
  const handleMarkAsAdded = async () => {
    try {
      await axios.post(`/api/update_initial_family_data/${selectedFamily.initial_family_id}/`, { family_added: true });
      toast.success(t('Family marked as added!'));
      closeMarkAddedModal();
      fetchFamilies();
      // Optionally update/delete related task here if needed
    } catch (error) {
      showErrorToast(t, 'Error marking as added', error);
    }
  };

  // Table row color
  const getRowClass = (family) =>
    family.family_added ? "families-row-added" : "";

  return (
    <div className="families-main-content">
      <Sidebar />
      <InnerPageHeader title={t('Initial Family Data')} />
      <ToastContainer position="top-center" autoClose={5000} rtl={true} />
      <div className="filter-create-container">
        <button className="refresh-button" onClick={fetchFamilies}>
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
          <select value={filterAdded} onChange={handleFilterAdded}>
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
                  <td>
                    {family.names
                      .split(',')
                      .map((part, idx, arr) => (
                        <React.Fragment key={idx}>
                          {part.trim()}
                          {idx < arr.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                  </td>
                  <td>
                    {family.phones
                      .split(',')
                      .map((part, idx, arr) => (
                        <React.Fragment key={idx}>
                          {part.trim()}
                          {idx < arr.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                  </td>
                  <td>
                    {family.other_information
                      ? family.other_information.split(',').map((part, idx, arr) => (
                          <React.Fragment key={idx}>
                            {part.trim()}
                            {idx < arr.length - 1 && <br />}
                          </React.Fragment>
                        ))
                      : ''}
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
                      <button className="delete-button" onClick={() => openDeleteModal(family)}>
                        {t('Delete')}
                      </button>
                      {!family.family_added && (
                        <button className="mark-added-button" onClick={() => openMarkAddedModal(family)}>
                          {t('Mark as Added')}
                        </button>
                      )}
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
          {totalCount <= pageSize ? (
            <button className="active">1</button>
          ) : (
            Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={page === i + 1 ? 'active' : ''}
              >
                {i + 1}
              </button>
            ))
          )}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= 1}
            className="pagination-arrow"
          >&rsaquo;</button>
          <button
            onClick={() => setPage(Math.ceil(totalCount / pageSize))}
            disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= 1}
            className="pagination-arrow"
          >&raquo;</button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onRequestClose={closeCreateModal}
          contentLabel="Create Initial Family Data"
          className="families-modal-content"
          overlayClassName="delete-modal-overlay"
        >
          <h2>{t('Create Initial Family Data')}</h2>
          <form onSubmit={handleCreate} className="form-grid">
            <div className="form-column">
              <label>{t('Names')}</label>
              <input
                type="text"
                name="names"
                placeholder={t("Enter names")}
                value={formData.names}
                onChange={e => setFormData({ ...formData, names: e.target.value })}
                className={formErrors.names ? "error" : ""}
              />
              {formErrors.names && <span className="families-error-message">{formErrors.names}</span>}
              <label>{t('Phones')}</label>
              <input
                type="text"
                name="phones"
                placeholder={t("Enter phones")}
                value={formData.phones}
                onChange={e => setFormData({ ...formData, phones: e.target.value })}
                className={formErrors.phones ? "error" : ""}
              />
              {formErrors.phones && <span className="families-error-message">{formErrors.phones}</span>}
              <label>{t('Other information')}</label>
              <textarea
                name="other_information"
                value={formData.other_information}
                onChange={e => setFormData({ ...formData, other_information: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit">{t('Create')}</button>
              <button type="button" onClick={closeCreateModal}>{t('Cancel')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <Modal
          isOpen={showUpdateModal}
          onRequestClose={closeUpdateModal}
          contentLabel="Update Initial Family Data"
          className="families-modal-content"
          overlayClassName="delete-modal-overlay"
        >
          <h2>{t('Update Initial Family Data')}</h2>
          <form onSubmit={handleUpdate} className="form-grid">
            <div className="form-column">
              <label>{t('Names')}</label>
              <input
                type="text"
                name="names"
                value={formData.names}
                onChange={e => setFormData({ ...formData, names: e.target.value })}
                className={formErrors.names ? "error" : ""}
              />
              {formErrors.names && <span className="families-error-message">{formErrors.names}</span>}
              <label>{t('Phones')}</label>
              <input
                type="text"
                name="phones"
                value={formData.phones}
                onChange={e => setFormData({ ...formData, phones: e.target.value })}
                className={formErrors.phones ? "error" : ""}
              />
              {formErrors.phones && <span className="families-error-message">{formErrors.phones}</span>}
              <label>{t('Other information')}</label>
              <textarea
                name="other_information"
                value={formData.other_information}
                onChange={e => setFormData({ ...formData, other_information: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit">{t('Update')}</button>
              <button type="button" onClick={closeUpdateModal}>{t('Cancel')}</button>
            </div>
          </form>
        </Modal>
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
            {t('Deleting will remove all associated data. This action cannot be undone.')}
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