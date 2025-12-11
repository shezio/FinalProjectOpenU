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
import { useNavigate } from 'react-router-dom'; // Add this line

const requiredPermissions = [
  { resource: 'childsmile_app_staff', action: 'CREATE' },
  { resource: 'childsmile_app_staff', action: 'UPDATE' },
  { resource: 'childsmile_app_staff', action: 'DELETE' },
  { resource: 'childsmile_app_staff', action: 'VIEW' },
];


const SystemManagement = () => {
  const navigate = useNavigate(); // Add this line
  const { t } = useTranslation(); // Initialize translation
  const hasPermissionOnSystemManagement = hasAllPermissions(requiredPermissions);
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]); // For UI filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [totalCount, setTotalCount] = useState(0);
  const [modalType, setModalType] = useState(''); // "add" or "edit"
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [roles, setRoles] = useState([]); // For roles dropdown
  const [showRolesDropdown, setShowRolesDropdown] = useState(false);
  const [errors, setErrors] = useState({}); // For form validation errors
  const [staffData, setStaffData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    roles: [],
  });
  const [showStaffTotpModal, setShowStaffTotpModal] = useState(false);
  const [staffTotpCode, setStaffTotpCode] = useState('');
  const [newUserEmail, setNewUserEmail] = useState(''); // Change from adminEmail
  const [totpLoading, setTotpLoading] = useState(false);
  const [sortOrderCreatedAt, setSortOrderCreatedAt] = useState('desc'); // Default to descending (newest first)

  useEffect(() => {
    if (hasPermissionOnSystemManagement) {
      fetchAllStaff();
    }
    else {
      setLoading(false);
    }
  }, [hasPermissionOnSystemManagement]);


  // Validation logic
  const validate = () => {
    const newErrors = {};
    if (!staffData.username.trim()) {
      newErrors.username = t("Username is required.");
    }
    if (!staffData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffData.email)) {
      newErrors.email = t("A valid email is required.");
    }
    if (!staffData.first_name.trim()) {
      newErrors.first_name = t("First name is required.");
    }
    if (!staffData.last_name.trim()) {
      newErrors.last_name = t("Last name is required.");
    }
    if (!staffData.roles || staffData.roles.length === 0) {
      newErrors.roles = t("At least one role must be selected.");
    }
    if (
      staffData.roles.includes("General Volunteer") &&
      staffData.roles.includes("Tutor")
    ) {
      newErrors.roles = t("Cannot select both General Volunteer and Tutor roles at the same time.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchAllStaff = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/get_all_staff/', {
        params: { page: 1, page_size: 10000 }, // Assumes 10k is "all"
      });
      
      // Filter out guest_demo user
      let staffList = response.data.staff.filter(user => user.username !== 'guest_demo');
      
      // Sort by created_at in descending order (newest first)
      const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      };
      
      const sortedStaff = staffList.sort((a, b) => {
        const dateA = parseDate(a.created_at);
        const dateB = parseDate(b.created_at);
        return dateB - dateA; // Descending order
      });
      
      setStaff(sortedStaff);
      setFilteredStaff(sortedStaff);
      setTotalCount(sortedStaff.length); // Total now based on filtered set
      const rolesResponse = await axios.get('/api/get_roles/');
      setRoles(rolesResponse.data.roles); // Set roles for the dropdown
    } catch (error) {
      console.error('Error fetching staff:', error);
      showErrorToast(t, 'Failed to fetch staff.', error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (user) => {
    console.log('Opening delete modal for user:', user); // Debug log
    setStaffToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setStaffToDelete(null);
  };

  const confirmDelete = async () => {
    try {
      console.log('Attempting to delete staff:', staffToDelete); // Debug log
      const staffId = staffToDelete.id; // Use the correct ID field
      console.log('Staff ID to delete:', staffId); // Debug log
      
      await axios.delete(`/api/delete_staff_member/${staffId}/`);
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
        .some((field) => field.toLowerCase().includes(query)) ||
      // Also search in roles (translate to Hebrew for comparison)
      user.roles.some((role) => t(role).toLowerCase().includes(query))
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

  const toggleSortOrderCreatedAt = () => {
    const newOrder = sortOrderCreatedAt === 'asc' ? 'desc' : 'asc';
    setSortOrderCreatedAt(newOrder);
    const sorted = [...filteredStaff].sort((a, b) => {
      // Parse DD/MM/YYYY format to Date object
      const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      };
      const dateA = parseDate(a.created_at);
      const dateB = parseDate(b.created_at);
      return newOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setFilteredStaff(sorted);
  };

  const openAddStaffModal = (type, staff = null) => {
    setShowAddStaffModal(true);
    setModalType(type);
    if (type === 'edit' && staff) {
      setStaffData({
        id: staff.id,
        username: staff.username,
        email: staff.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        roles: staff.roles,
      });
    } else {
      setStaffData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        roles: [],
      });
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        showRolesDropdown &&
        !event.target.closest('.roles-dropdown-container') // Check if the click is outside the dropdown
      ) {
        setShowRolesDropdown(false); // Close the dropdown
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showRolesDropdown]);

  const closeAddStaffModal = () => {
    setShowAddStaffModal(false);
    setShowRolesDropdown(false);
    setStaffData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      roles: [],
    });
    setErrors({}); // Reset errors when closing the modal
  };

  const handleAddStaffSubmit = async () => {
    try {
      setTotpLoading(true);
      // Step 1: Send TOTP to the new user's email
      const response = await axios.post('/api/staff-creation-send-totp/', staffData);
      setNewUserEmail(staffData.email); // Use the new user's email from form
      setShowStaffTotpModal(true);
      setTotpLoading(false);
      toast.success(t('Verification code sent to the new user\'s email!'));
    } catch (error) {
      console.error('Error sending TOTP:', error);
      setTotpLoading(false);
      showErrorToast(t, 'Failed to send verification code.', error);
    }
  };

  // Add TOTP verification for staff creation
  const handleStaffTotpVerification = async (e) => {
    e.preventDefault();
    if (staffTotpCode.length !== 6) {
      toast.error(t("Please enter a 6-digit code"));
      return;
    }

    try {
      setTotpLoading(true);
      
      // Determine if this is for creation or update based on modal type
      if (modalType === 'add') {
        // Staff creation flow
        await axios.post('/api/staff-creation-verify-totp/', {
          code: staffTotpCode
        });
        toast.success(t('Staff member created successfully.'));
      } else {
        // Staff email update flow
        await axios.put(`/api/update_staff_member/${staffData.id}/`, {
          username: staffData.username,
          email: staffData.email,
          first_name: staffData.first_name,
          last_name: staffData.last_name,
          roles: staffData.roles,
          totp_code: staffTotpCode
        });
        toast.success(t('Staff member updated successfully.'));
      }
      
      fetchAllStaff();
      closeStaffTotpModal();
      closeAddStaffModal();
      setTotpLoading(false);
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      setTotpLoading(false);
      showErrorToast(t, 'Verification failed.', error);
    }
  };

  // Add function to close TOTP modal
  const closeStaffTotpModal = () => {
    setShowStaffTotpModal(false);
    setStaffTotpCode('');
    setNewUserEmail(''); // Clear new user's email instead of admin email
  };

  // Add TOTP input render function for staff
  const renderStaffTOTPInputBoxes = () => {
    const handleTotpChange = (index, value) => {
      if (!/^\d*$/.test(value)) return;
      
      const newCode = staffTotpCode.split('');
      newCode[index] = value;
      const updatedCode = newCode.join('').slice(0, 6);
      setStaffTotpCode(updatedCode);
      
      if (value && index < 5) {
        const nextInput = document.getElementById(`staff-totp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    };

    return (
      <div className="totp-input-container">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            id={`staff-totp-${index}`}
            type="text"
            maxLength="1"
            value={staffTotpCode[index] || ''}
            onChange={(e) => handleTotpChange(index, e.target.value)}
            className="totp-input-box"
          />
        ))}
      </div>
    );
  };

  // Add this function after the closeAddStaffModal function
  const updateStaffData = (field, value) => {
    setStaffData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditStaffSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setTotpLoading(true);
      
      // Call the update API endpoint
      const response = await axios.put(`/api/update_staff_member/${staffData.id}/`, {
        username: staffData.username,
        email: staffData.email,
        first_name: staffData.first_name,
        last_name: staffData.last_name,
        roles: staffData.roles,
      });
      
      // If TOTP verification is required (email changed)
      if (response.data.requires_verification) {
        setNewUserEmail(response.data.email);
        setShowStaffTotpModal(true);
        setTotpLoading(false);
        toast.success(t('Verification code sent to new email address!'));
        return;
      }
      
      toast.success(t('Staff member updated successfully.'));
      fetchAllStaff(); // Refresh the staff list
      closeAddStaffModal(); // Close the modal
      setTotpLoading(false);
      
    } catch (error) {
      console.error('Error updating staff member:', error);
      setTotpLoading(false);
      showErrorToast(t, 'Failed to update staff member.', error);
    }
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
                placeholder={t('Search by name, email or role')}
                value={searchQuery}
                onChange={handleSearch}
                className="search-bar"
              />
              <button onClick={() => openAddStaffModal('add')} className="add-button">
                {t('Add New Staff')}
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="dashboard-button"
              >
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ marginLeft: '8px' }}
                >
                  {/* Bar chart with gradient colors */}
                  <defs>
                    <linearGradient id="barGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#dc2626', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="barGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
                    </linearGradient>
                    <linearGradient id="barGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#2563eb', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  {/* Three colorful bars */}
                  <rect x="3" y="13" width="4" height="8" rx="1" fill="url(#barGradient1)" />
                  <rect x="10" y="8" width="4" height="13" rx="1" fill="url(#barGradient2)" />
                  <rect x="17" y="4" width="4" height="17" rx="1" fill="url(#barGradient3)" />
                  {/* Base line */}
                  <line x1="2" y1="22" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
                </svg>
                {t('dashboard')}
              </button>
              <button 
                onClick={() => navigate('/audit-log')}
                className="audit-log-data-button"
              >
                {t('Audit Log')}
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
                      <th>
                        {t('Created At')}
                        <button
                          className="sort-button"
                          onClick={toggleSortOrderCreatedAt}
                        >
                          {sortOrderCreatedAt === 'asc' ? '▲' : '▼'}
                        </button>
                      </th>
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
                            onClick={() => openDeleteModal(user)}
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
                if (!validate()) {
                  return;
                }

                if (modalType === 'add') {
                  handleAddStaffSubmit();
                } else {
                  handleEditStaffSubmit();
                }
              }}
              className="staff-form-grid"
            >
              <span className="sys-mgmt-mandatory-span">{t("*All fields are mandatory")}</span>
              <div className="staff-form-row">
                <label>{t('Username')}</label>
                <input
                  type="text"
                  value={staffData.username || ''}
                  onChange={(e) => updateStaffData('username', e.target.value)}
                  className={errors.username ? "error" : ""}
                />
                {errors.username && <span className="staff-error-message">{errors.username}</span>}
              </div>

              <div className="staff-form-row">
                <label>{t('Email')}</label>
                <form noValidate>
                  <input
                    type="email"
                    value={staffData.email || ''}
                    onChange={(e) => updateStaffData('email', e.target.value)}
                    className={errors.email ? "error" : ""}
                    title=''
                  />
                </form>
                {errors.email && <span className="staff-error-message">{errors.email}</span>}
              </div>

              <div className="staff-form-row">
                <label>{t('First Name')}</label>
                <input
                  type="text"
                  value={staffData.first_name || ''}
                  onChange={(e) => updateStaffData('first_name', e.target.value)}
                  className={errors.first_name ? "error" : ""}
                />
                {errors.first_name && <span className="staff-error-message">{errors.first_name}</span>}
              </div>

              <div className="staff-form-row">
                <label>{t('Last Name')}</label>
                <input
                  type="text"
                  value={staffData.last_name || ''}
                  onChange={(e) => updateStaffData('last_name', e.target.value)}
                  className={errors.last_name ? "error" : ""}
                />
                {errors.last_name && <span className="staff-error-message">{errors.last_name}</span>}
              </div>

              <div className="staff-form-row">
                <label>{t('Roles')}</label>
                <div className="roles-dropdown-container">
                  <button
                    type="button"
                    className={`roles-dropdown-button ${errors.roles ? 'error' : ''}`}
                    onClick={() => setShowRolesDropdown((prev) => !prev)}
                  >
                    {staffData.roles.length > 0
                      ? staffData.roles.map((role) => t(role)).join(', ')
                      : t('Select Roles')}
                  </button>
                  {showRolesDropdown && (
                    <div className="roles-dropdown">
                      {roles.map((role) => {
                        // Hide "General Volunteer" and "Tutor" in Add mode
                        if (
                          modalType === 'add' &&
                          (role.role_name === "General Volunteer" || role.role_name === "Tutor")
                        ) {
                          return null;
                        }

                        // In Edit mode, show both if the user has either role
                        if (
                          modalType === 'edit' &&
                          (role.role_name === "General Volunteer" || role.role_name === "Tutor")
                        ) {
                          const hasGV = staffData.roles.includes("General Volunteer");
                          const hasTutor = staffData.roles.includes("Tutor");
                          // If the user has neither, hide both
                          if (!hasGV && !hasTutor) {
                            return null;
                          }
                          // Show both, both enabled
                          return (
                            <div key={role.id} className="roles-dropdown-item">
                              <input
                                type="checkbox"
                                id={`role-${role.id}`}
                                checked={staffData.roles.includes(role.role_name)}
                                onChange={(e) => {
                                  // Only allow one of the two at a time
                                  let updatedRoles = staffData.roles.filter(
                                    (r) => r !== "General Volunteer" && r !== "Tutor"
                                  );
                                  if (e.target.checked) {
                                    updatedRoles.push(role.role_name);
                                  }
                                  updateStaffData('roles', updatedRoles);
                                }}
                              />
                              <label htmlFor={`role-${role.id}`}>{t(role.role_name)}</label>
                            </div>
                          );
                        }

                        // For all other roles, normal logic
                        return (
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
                        );
                      })}
                    </div>
                  )}
                </div>
                {errors.roles && <span className="staff-error-message">{errors.roles}</span>}
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
          {staffToDelete && (
            <p><strong>{staffToDelete.username} ({staffToDelete.email})</strong></p>
          )}
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

      {/* Staff TOTP Modal */}
      {showStaffTotpModal && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-content">
            <span className="staff-close" onClick={closeStaffTotpModal}>&times;</span>
            <h2>
              {modalType === 'add' ? t('Staff Creation Verification') : t('Email Change Verification')}
            </h2>
            <p>{t('Please enter the 6-digit code sent to')} {newUserEmail}</p>
            <form onSubmit={handleStaffTotpVerification}>
              {renderStaffTOTPInputBoxes()}
              <div className="staff-form-actions">
                <button type="submit" disabled={totpLoading || staffTotpCode.length !== 6}>
                  {totpLoading ? t('Verifying...') : (modalType === 'add' ? t("Verify & Create Staff") : t("Verify & Update Staff"))}
                </button>
                <button type="button" onClick={closeStaffTotpModal}>
                  {t("Cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemManagement;