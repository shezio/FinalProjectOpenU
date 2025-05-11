import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/systemManagement.css'; // Special CSS for this page
import axios from '../axiosConfig';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasAllPermissions } from '../components/utils';
import { useTranslation } from 'react-i18next'; // Translation hook
import { showErrorToast } from '../components/toastUtils'; // Toast utility
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Or your preferred icon lib

const requiredPermissions = [
  { resource: 'childsmile_app_staff', action: 'CREATE' },
  { resource: 'childsmile_app_staff', action: 'UPDATE' },
  { resource: 'childsmile_app_staff', action: 'DELETE' },
  { resource: 'childsmile_app_staff', action: 'VIEW' },
];


const SystemManagement = () => {
  const { t } = useTranslation(); // Initialize translation
  const hasPermissionOnSystemManagement = hasAllPermissions(requiredPermissions);
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]); // For UI filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [modalType, setModalType] = useState(''); // "add" or "edit"
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [roles, setRoles] = useState([]); // For roles dropdown
  const [showRolesDropdown, setShowRolesDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staffData, setStaffData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    roles: [],
  });

  useEffect(() => {
    if (hasPermissionOnSystemManagement) {
      fetchAllStaff();
    }
    else {
      setLoading(false);
    }
  }, [hasPermissionOnSystemManagement]);

  const fetchAllStaff = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/get_all_staff/', {
        params: { page: 1, page_size: 10000 }, // Assumes 10k is "all"
      });
      setStaff(response.data.staff);
      setFilteredStaff(response.data.staff);
      setTotalCount(response.data.staff.length); // Total now based on filtered set
      const rolesResponse = await axios.get('/api/get_roles/');
      setRoles(rolesResponse.data.roles); // Set roles for the dropdown
    } catch (error) {
      console.error('Error fetching staff:', error);
      showErrorToast(t, 'Failed to fetch staff.', error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (staffId) => {
    setStaffToDelete(staffId);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setStaffToDelete(null);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/delete_staff_member/${staffToDelete}/`);
      toast.success(t('Staff member deleted successfully.'));
      fetchAllStaff(); // Refresh the data after deletion
    } catch (error) {
      console.error('Error deleting staff member:', error);
      showErrorToast(t, 'Failed to delete staff member.', error);
    } finally {
      closeDeleteModal();
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setPage(1); // reset to page 1

    if (!query) {
      setFilteredStaff(staff);
      setTotalCount(staff.length);
      return;
    }

    const filtered = staff.filter((user) =>
      [user.username, user.email, user.first_name, user.last_name]
        .some((field) => field.toLowerCase().includes(query))
    );
    setFilteredStaff(filtered);
    setTotalCount(filtered.length);
  };

  const paginatedStaff = filteredStaff.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleRefresh = () => {
    fetchAllStaff();
  };

  const openAddStaffModal = (type, staff = null) => {
    setShowAddStaffModal(true);
    setModalType(type);
    if (type === 'edit' && staff) {
      setStaffData({
        id: staff.id,
        username: staff.username,
        password: '', // Password is not pre-filled for security
        email: staff.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        roles: staff.roles,
      });
    } else {
      setStaffData({
        username: '',
        password: '',
        email: '',
        first_name: '',
        last_name: '',
        roles: [],
      });
    }
  };

  const closeAddStaffModal = () => {
    setShowAddStaffModal(false);
    setStaffData({
      username: '',
      password: '',
      email: '',
      first_name: '',
      last_name: '',
      roles: [],
    });
  };

  const handleAddStaffSubmit = async () => {
    try {
      await axios.post('/api/create_staff_member/', staffData);
      toast.success(t('Staff member added successfully.'));
      fetchAllStaff(); // Refresh the staff list
      closeAddStaffModal();
    } catch (error) {
      console.error('Error adding staff member:', error);
      showErrorToast(t, 'Failed to add staff member.', error);
    }
  };

  const handleEditStaffSubmit = async () => {
    try {
      console.log('Staff Data being sent:', staffData); // Debug log
      console.log('Staff ID:', staffData.id); // Specifically log the ID

      await axios.put(`/api/update_staff_member/${staffData.id}/`, staffData);
      toast.success(t('Staff member updated successfully.'));
      fetchAllStaff(); // Refresh the staff list
      closeAddStaffModal();
    } catch (error) {
      console.error('Error updating staff member:', error);
      showErrorToast(t, 'Failed to update staff member.', error);
    }
  };

  const updateStaffData = (field, value) => {
    setStaffData((prev) => ({ ...prev, [field]: value }));
  };

  if (!hasPermissionOnSystemManagement) {
    return (
      <div className="sys-mgmt-main-content">
        <Sidebar />
        <InnerPageHeader title={t('System Management')} />
        <div className="no-permission">
          <h2>{t('This page is allowed for system administrator only')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="sys-mgmt-main-content">
      <Sidebar />
      <InnerPageHeader title={t('System Management')} />
      <div className="staff-page-content">
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
          // Loader displayed above everything
          <div className="loader-container">
            <div className="loader">{t('Loading data...')}</div>
          </div>
        ) : (
          <>
            <div className="controls">
              <input
                type="text"
                placeholder={t('Search by name or email')}
                value={searchQuery}
                onChange={handleSearch}
                className="search-bar"
              />
              <button onClick={() => openAddStaffModal('add')} className="add-button">
                {t('Add New Staff')}
              </button>
              <button onClick={handleRefresh} className="refresh-button">
                {t('Refresh')}
              </button>
            </div>

            <div className="staff-grid-container">
              {filteredStaff.length === 0 ? (
                <div className="no-data">{t('No staff members to display')}</div>
              ) : (
                <table className="staff-data-grid">
                  <thead>
                    <tr>
                      <th>{t('Username')}</th>
                      <th>{t('Email')}</th>
                      <th>{t('First Name')}</th>
                      <th>{t('Last Name')}</th>
                      <th>{t('Created At')}</th>
                      <th>{t('Roles')}</th>
                      <th>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStaff.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.first_name}</td>
                        <td>{user.last_name}</td>
                        <td>{user.created_at}</td>
                        <td>{user.roles.map((role) => t(role)).join(', ')}</td>
                        <td>
                          <button
                            onClick={() => openAddStaffModal('edit', user)}
                            className="edit-button"
                          >
                            {t('Edit')}
                          </button>
                          <button
                            onClick={() => openDeleteModal(user.id)}
                            className="delete-button"
                          >
                            {t('Delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pagination">
              {/* Left Arrows */}
              <button
                onClick={() => handlePageChange(1)} // Go to the first page
                disabled={page === 1 || totalCount <= 1} // Disable if on the first page or only one page exists
                className="pagination-arrow"
              >
                &laquo; {/* Double left arrow */}
              </button>
              <button
                onClick={() => handlePageChange(page - 1)} // Go to the previous page
                disabled={page === 1 || totalCount <= 1} // Disable if on the first page or only one page exists
                className="pagination-arrow"
              >
                &lsaquo; {/* Single left arrow */}
              </button>

              {/* Page Numbers */}
              {totalCount <= pageSize ? (
                <button className="active">1</button> // Display only "1" if there's only one page
              ) : (
                Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={page === i + 1 ? 'active' : ''}
                  >
                    {i + 1}
                  </button>
                ))
              )}

              {/* Right Arrows */}
              <button
                onClick={() => handlePageChange(page + 1)} // Go to the next page
                disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= 1} // Disable if on the last page or only one page exists
                className="pagination-arrow"
              >
                &rsaquo; {/* Single right arrow */}
              </button>
              <button
                onClick={() => handlePageChange(Math.ceil(totalCount / pageSize))} // Go to the last page
                disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= 1} // Disable if on the last page or only one page exists
                className="pagination-arrow"
              >
                &raquo; {/* Double right arrow */}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal for Add/Edit */}
      {showAddStaffModal && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-content">
            <span className="staff-close" onClick={closeAddStaffModal}>&times;</span>
            <h2>{modalType === 'add' ? t('Add New Staff Member') : t('Edit Staff Member')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modalType === 'add') {
                  handleAddStaffSubmit();
                } else {
                  handleEditStaffSubmit();
                }
              }}
              className="staff-form-grid"
            >
              <div className="staff-form-row">
                <label>{t('Username')}</label>
                <input
                  type="text"
                  value={staffData.username || ''}
                  onChange={(e) => updateStaffData('username', e.target.value)}
                />
              </div>

              <div className="staff-form-row">
                <label>{t('Password')}</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={staffData.password || ''}
                    onClick={() => updateStaffData('password', '')}
                    onChange={(e) => updateStaffData('password', e.target.value)}
                    className="password-input"
                  />
                  <span
                    className={`eye-icon ${showPassword ? 'open' : ''}`}
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <div className="staff-form-row">
                <label>{t('Email')}</label>
                <input
                  type="email"
                  value={staffData.email || ''}
                  onChange={(e) => updateStaffData('email', e.target.value)}
                />
              </div>

              <div className="staff-form-row">
                <label>{t('First Name')}</label>
                <input
                  type="text"
                  value={staffData.first_name || ''}
                  onChange={(e) => updateStaffData('first_name', e.target.value)}
                />
              </div>

              <div className="staff-form-row">
                <label>{t('Last Name')}</label>
                <input
                  type="text"
                  value={staffData.last_name || ''}
                  onChange={(e) => updateStaffData('last_name', e.target.value)}
                />
              </div>

              <div className="staff-form-row">
                <label>{t('Roles')}</label>
                <div className="roles-dropdown-container">
                  <button
                    type="button"
                    className="roles-dropdown-button"
                    onClick={() => setShowRolesDropdown((prev) => !prev)}
                  >
                    {t('Select Roles')}
                  </button>
                  {showRolesDropdown && (
                    <div className="roles-dropdown">
                      {roles.map((role) => (
                        <div key={role.id} className="roles-dropdown-item">
                          <input
                            type="checkbox"
                            id={`role-${role.id}`}
                            checked={staffData.roles.includes(role.role_name)}
                            onChange={(e) => {
                              const updatedRoles = e.target.checked
                                ? [...staffData.roles, role.role_name]
                                : staffData.roles.filter((r) => r !== role.role_name);
                              updateStaffData('roles', updatedRoles);
                            }}
                          />
                          <label htmlFor={`role-${role.id}`}>{t(role.role_name)}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="staff-form-actions">
                <button type="submit">{modalType === 'edit' ? t('Edit Staff') : t('Add Staff Member')}</button>
                <button type="button" onClick={closeAddStaffModal}>
                  {t('Cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onRequestClose={closeDeleteModal}
          className="delete-modal"
          overlayClassName="delete-modal-overlay"
        >
          <h2>{t('Are you sure you want to delete this staff member?')}</h2>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            {t('Deleting a staff member will remove all associated data')}
            <br />
            {t('This action cannot be undone')}
          </p>
          <div className="modal-actions">
            <button onClick={confirmDelete} className="yes-button">
              {t('Yes')}
            </button>
            <button onClick={closeDeleteModal} className="no-button">
              {t('No')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SystemManagement;