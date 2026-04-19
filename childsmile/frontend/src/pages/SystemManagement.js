import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/systemManagement.css'; // Special CSS for this page
import axios from '../axiosConfig';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
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

const ENABLE_BULK_DELETE = process.env.REACT_APP_ENABLE_BULK_DELETE === 'true';
const BLOCK_ACCESS_AFTER_APPROVAL = process.env.REACT_APP_BLOCK_ACCESS_AFTER_APPROVAL === 'true';

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
    staff_israel_id: '',
    staff_birth_date: '',
    staff_age: '',
    staff_gender: '',
    staff_phone: '',
    staff_city: '',
  });
  const [showStaffTotpModal, setShowStaffTotpModal] = useState(false);
  const [staffTotpCode, setStaffTotpCode] = useState('');
  const [newUserEmail, setNewUserEmail] = useState(''); // Change from adminEmail
  const [totpLoading, setTotpLoading] = useState(false);
  const [sortOrderCreatedAt, setSortOrderCreatedAt] = useState('desc'); // Default to descending (newest first)
  
  // INACTIVE STAFF FEATURE: State for deactivation/reactivation modals
  const [isDeactivationModalOpen, setIsDeactivationModalOpen] = useState(false);
  const [isReactivationModalOpen, setIsReactivationModalOpen] = useState(false);
  const [staffToModify, setStaffToModify] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isDeactivationLoading, setIsDeactivationLoading] = useState(false);
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [showSuspendedOnly, setShowSuspendedOnly] = useState(false); // For suspended users filter
  const [reactivationUpdateEmail, setReactivationUpdateEmail] = useState(false); // Checkbox for email update
  const [reactivationNewEmail, setReactivationNewEmail] = useState(''); // New email field
  const [selectedStaff, setSelectedStaff] = useState([]); // For bulk delete
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(''); // For role filtering
  const [isThawModalOpen, setIsThawModalOpen] = useState(false); // For thaw suspension confirmation
  const [isThawLoading, setIsThawLoading] = useState(false); // Loading state for thaw operation
  
  // Mail sending feature state
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailData, setMailData] = useState({
    to: '',
    subject: '',
    body: '',
  });
  const [mailAttachments, setMailAttachments] = useState([]);
  const [mailErrors, setMailErrors] = useState({});
  const [isMailSending, setIsMailSending] = useState(false);
  const [mailRecipientEmail, setMailRecipientEmail] = useState('');

  // Staff info modal state
  const [isStaffInfoModalOpen, setIsStaffInfoModalOpen] = useState(false);
  const [staffInfoData, setStaffInfoData] = useState(null);

  // Cities for dropdown
  const [citiesOptions, setCitiesOptions] = useState([]);

  useEffect(() => {
    if (hasPermissionOnSystemManagement) {
      fetchAllStaff();
      fetchCities();
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
    // Allow empty roles in edit mode (for deactivation flow)
    if (modalType === 'add' && (!staffData.roles || staffData.roles.length === 0)) {
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

  // Mail validation functions
  const validateMailData = () => {
    const errors = {};
    
    // Validate TO field
    if (!mailData.to.trim()) {
      errors.to = t("TO field is required");
    } else {
      const emails = mailData.to.split(',').map(e => e.trim()).filter(e => e);
      if (emails.length === 0) {
        errors.to = t("Please enter at least one email address");
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter(e => !emailRegex.test(e));
        if (invalidEmails.length > 0) {
          errors.to = t("Invalid email format") + ": " + invalidEmails.join(", ");
        }
      }
    }
    
    // Validate Subject
    if (!mailData.subject.trim()) {
      errors.subject = t("Subject is required");
    } else if (mailData.subject.length > 50) {
      errors.subject = t("Subject must be maximum 50 characters");
    }
    
    // Validate Body
    if (!mailData.body.trim()) {
      errors.body = t("Body is required");
    } else if (mailData.body.length > 250) {
      errors.body = t("Body must be maximum 250 characters");
    }
    
    // Validate Attachments
    if (mailAttachments.length > 0) {
      const allowedExtensions = ['png', 'jpg', 'jpeg', 'pdf', 'xls', 'xlsx'];
      let totalSize = 0;
      
      for (const file of mailAttachments) {
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
          errors.attachments = t("Invalid file type") + ": " + file.name + " (" + fileExt + ")";
          break;
        }
        
        totalSize += file.size;
        
        if (file.size > 10 * 1024 * 1024) {
          errors.attachments = t("File too large") + ": " + file.name;
          break;
        }
      }
      
      if (totalSize > 10 * 1024 * 1024) {
        errors.attachments = t("Total attachment size exceeds 10MB limit");
      }
    }
    
    setMailErrors(errors);
    return Object.keys(errors).length === 0;
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
      
      // Apply filters after refresh
      let baseList = sortedStaff;
      
      // Apply inactive filter if active
      if (showInactiveOnly) {
        baseList = sortedStaff.filter(user => !user.is_active);
      }
      
      // Apply suspended filter if active
      if (showSuspendedOnly) {
        baseList = sortedStaff.filter(user => user.is_active && user.deactivation_reason === "suspended");
      }
      
      // Apply role filter if selected
      if (selectedRoleFilter) {
        baseList = baseList.filter(user => user.roles.includes(selectedRoleFilter));
      }
      
      setFilteredStaff(baseList);
      setTotalCount(baseList.length); // Total now based on filtered set
      
      const rolesResponse = await axios.get('/api/get_roles/');
      setRoles(rolesResponse.data.roles); // Set roles for the dropdown
    } catch (error) {
      console.error('Error fetching staff:', error);
      showErrorToast(t, 'Failed to fetch staff.', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await axios.get('/api/tutors/');
      setCitiesOptions(response.data.cities_options || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
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
      fetchAllStaff(); // Refresh the data after deletion - filters will be reapplied
      setPage(1); // Reset to page 1 after delete
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

    let baseList = staff;
    
    // Apply inactive filter first
    if (showInactiveOnly) {
      baseList = staff.filter(user => !user.is_active);
    }

    // Apply role filter
    if (selectedRoleFilter) {
      baseList = baseList.filter(user => user.roles.includes(selectedRoleFilter));
    }

    if (!query) {
      setFilteredStaff(baseList);
      setTotalCount(baseList.length);
      return;
    }

    const filtered = baseList.filter((user) => {
      // Check standard fields (email, first_name, last_name)
      const standardFieldsMatch = [user.email, user.first_name, user.last_name]
        .some((field) => field.toLowerCase().includes(query));
      
      // Check username with both underscore and space variations
      const usernameWithUnderscore = user.username.toLowerCase().includes(query);
      const usernameWithSpaces = user.username.toLowerCase().replace(/_/g, ' ').includes(query);
      
      // Check full name (first name + last name combined)
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const fullNameMatch = fullName.includes(query);
      
      // Check roles
      const rolesMatch = user.roles.some((role) => t(role).toLowerCase().includes(query));
      
      return standardFieldsMatch || usernameWithUnderscore || usernameWithSpaces || fullNameMatch || rolesMatch;
    });
    setFilteredStaff(filtered);
    setTotalCount(filtered.length);
  };

  const calculateAgeFromBirthDate = (birthDateStr) => {
    if (!birthDateStr) return '';
    
    // Parse dd/mm/yyyy format
    const parts = birthDateStr.split('/');
    if (parts.length !== 3) return '';
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : '';
  };

  const openStaffInfoModal = async (staff) => {
    // Fetch profile data from the endpoint
    try {
      const response = await axios.get(`/api/get_staff_profile_data/${staff.email}/`);
      const profileData = response.data.profile_data;
      
      // Merge profile data with staff data
      const enrichedStaff = {
        ...staff,
        staff_israel_id: profileData?.staff_israel_id || staff.staff_israel_id,
        staff_birth_date: profileData?.staff_birth_date || staff.staff_birth_date,
        staff_age: profileData?.staff_age || staff.staff_age,
        staff_gender: profileData?.staff_gender !== undefined ? profileData.staff_gender : staff.staff_gender,
        staff_phone: profileData?.staff_phone || staff.staff_phone,
        staff_city: profileData?.staff_city || staff.staff_city,
      };
      
      setStaffInfoData(enrichedStaff);
    } catch (error) {
      console.debug('No additional profile data found, using existing staff data');
      setStaffInfoData(staff);
    }
    setIsStaffInfoModalOpen(true);
  };

  const closeStaffInfoModal = () => {
    setIsStaffInfoModalOpen(false);
    setStaffInfoData(null);
  };

  // Check if profile fields should be enabled based on roles
  const isProfileFieldsEnabled = () => {
    // Disable if user is ONLY Tutor or ONLY General Volunteer
    const hasOnlyTutor = staffData.roles.length === 1 && staffData.roles.includes('Tutor');
    const hasOnlyGeneralVolunteer = staffData.roles.length === 1 && staffData.roles.includes('General Volunteer');
    return !(hasOnlyTutor || hasOnlyGeneralVolunteer);
  };

  const toggleInactiveFilter = () => {
    setShowInactiveOnly(!showInactiveOnly);
    setShowSuspendedOnly(false); // Clear suspended filter when toggling inactive
    setPage(1); // Reset to page 1 when toggling filter
    setSearchQuery(''); // Clear search when toggling filter
    
    // Apply filter
    let filtered = staff;
    if (!showInactiveOnly) {
      // If turning on inactive filter
      filtered = staff.filter(user => !user.is_active);
    } else {
      // If turning off, show all
      filtered = staff;
    }
    
    // Apply role filter if set
    if (selectedRoleFilter) {
      filtered = filtered.filter(user => user.roles.includes(selectedRoleFilter));
    }
    
    setFilteredStaff(filtered);
    setTotalCount(filtered.length);
  };

  const toggleSuspendedFilter = () => {
    setShowSuspendedOnly(!showSuspendedOnly);
    setShowInactiveOnly(false); // Clear inactive filter when toggling suspended
    setPage(1); // Reset to page 1 when toggling filter
    setSearchQuery(''); // Clear search when toggling filter
    
    // Apply filter - show only suspended users (is_active=true but deactivation_reason="suspended")
    let filtered = staff;
    if (!showSuspendedOnly) {
      // If turning on suspended filter
      filtered = staff.filter(user => user.is_active && user.deactivation_reason === "suspended");
    } else {
      // If turning off, show all
      filtered = staff;
    }
    
    // Apply role filter if set
    if (selectedRoleFilter) {
      filtered = filtered.filter(user => user.roles.includes(selectedRoleFilter));
    }
    
    setFilteredStaff(filtered);
    setTotalCount(filtered.length);
  };

  const handleRoleFilterChange = (e) => {
    const selectedRole = e.target.value;
    setSelectedRoleFilter(selectedRole);
    setPage(1); // Reset to page 1 when toggling filter
    setSearchQuery(''); // Clear search when toggling filter
    
    // Apply filters
    let filtered = staff;
    
    // Apply inactive filter
    if (showInactiveOnly) {
      filtered = staff.filter(user => !user.is_active);
    }
    
    // Apply role filter
    if (selectedRole) {
      filtered = filtered.filter(user => user.roles.includes(selectedRole));
    }
    
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
        staff_israel_id: staff.staff_israel_id || '',
        staff_birth_date: staff.staff_birth_date || '',
        staff_age: staff.staff_age || '',
        staff_gender: staff.staff_gender !== null ? (staff.staff_gender ? 'female' : 'male') : '',
        staff_phone: staff.staff_phone || '',
        staff_city: staff.staff_city || '',
      });
      
      // For non-management staff, fetch their profile data from SignedUp table
      fetchProfileDataFromSignUp(staff.id, staff.email);
    } else {
      setStaffData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        roles: [],
        staff_israel_id: '',
        staff_birth_date: '',
        staff_age: '',
        staff_gender: '',
        staff_phone: '',
        staff_city: '',
      });
    }
  };

  // Fetch profile data from SignedUp or Staff model - get data from either table
  const fetchProfileDataFromSignUp = async (staffId, email) => {
    try {
      const response = await axios.get(`/api/get_staff_profile_data/${email}/`);
      if (response.data && response.data.profile_data) {
        const profileData = response.data.profile_data;
        // Update staffData with profile data from SignedUp or Staff
        setStaffData(prev => ({
          ...prev,
          staff_israel_id: profileData.staff_israel_id || prev.staff_israel_id || '',
          staff_birth_date: profileData.staff_birth_date || prev.staff_birth_date || '',
          staff_age: profileData.staff_age || prev.staff_age || '',
          staff_gender: profileData.staff_gender !== null ? (profileData.staff_gender ? 'female' : 'male') : (prev.staff_gender || ''),
          staff_phone: profileData.staff_phone || prev.staff_phone || '',
          staff_city: profileData.staff_city || prev.staff_city || '',
        }));
      }
    } catch (error) {
      // Silently fail - profile data may not exist
      console.debug('No profile data found:', error.message);
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
      staff_israel_id: '',
      staff_birth_date: '',
      staff_age: '',
      staff_gender: '',
      staff_phone: '',
      staff_city: '',
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
      
      // Check if this is for deactivation request
      if (window.isDeactivationRequest && window.deactivatingStaffId) {
        // Staff deactivation flow with TOTP verification
        await axios.put(`/api/update_staff_member/${window.deactivatingStaffId}/`, {
          is_active: false,
          deactivation_reason: deactivationReason,
          totp_code: staffTotpCode
        });
        toast.success(t('Staff member deactivated successfully'));
        window.isDeactivationRequest = false;
        window.deactivatingStaffId = null;
      } else if (window.isReactivationRequest && window.reactivatingStaffId) {
        // Staff reactivation flow with TOTP verification
        const reactivatingStaff = staff.find(u => u.id === window.reactivatingStaffId);
        if (reactivatingStaff) {
          await axios.put(`/api/update_staff_member/${window.reactivatingStaffId}/`, {
            username: reactivatingStaff.username,
            email: reactivatingStaff.email,
            first_name: reactivatingStaff.first_name,
            last_name: reactivatingStaff.last_name,
            is_active: true,
            totp_code: staffTotpCode
          });
          toast.success(t('Staff member reactivated successfully'));
        }
        window.isReactivationRequest = false;
        window.reactivatingStaffId = null;
      } else if (modalType === 'add') {
        // Staff creation flow
        await axios.post('/api/staff-creation-verify-totp/', {
          code: staffTotpCode
        });
        toast.success(t('Staff member created successfully.'));
      } else if (modalType === 'edit') {
        // Staff email update flow (use staffData not staffToModify)
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
      closeDeactivationModal();
      closeReactivationModal();
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

    // If "Inactive" role is selected, show deactivation modal instead
    if (staffData.roles.includes("Inactive")) {
      setStaffToModify(staffData);
      setDeactivationReason('');
      setIsDeactivationModalOpen(true);
      return;
    }

    try {
      setTotpLoading(true);
      
      // Build the update payload with profile fields
      const updatePayload = {
        username: staffData.username,
        email: staffData.email,
        first_name: staffData.first_name,
        last_name: staffData.last_name,
        roles: staffData.roles,
      };

      // Add optional profile fields if they have values
      if (staffData.staff_israel_id) {
        updatePayload.staff_israel_id = staffData.staff_israel_id;
      }
      if (staffData.staff_birth_date) {
        updatePayload.staff_birth_date = staffData.staff_birth_date;
      }
      if (staffData.staff_gender) {
        updatePayload.staff_gender = staffData.staff_gender;
      }
      if (staffData.staff_phone) {
        updatePayload.staff_phone = staffData.staff_phone;
      }
      if (staffData.staff_city) {
        updatePayload.staff_city = staffData.staff_city;
      }
      
      // Call the update API endpoint
      const response = await axios.put(`/api/update_staff_member/${staffData.id}/`, updatePayload);
      
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

  const openDeactivationModal = (user) => {
    setStaffToModify(user);
    setDeactivationReason('');
    setIsDeactivationModalOpen(true);
  };

  const closeDeactivationModal = () => {
    setIsDeactivationModalOpen(false);
    setStaffToModify(null);
    setDeactivationReason('');
    // Don't close the edit modal - allow user to continue editing
  };

  const openReactivationModal = (user) => {
    setStaffToModify(user);
    setIsReactivationModalOpen(true);
  };

  const closeReactivationModal = () => {
    setIsReactivationModalOpen(false);
    setStaffToModify(null);
    setReactivationUpdateEmail(false);
    setReactivationNewEmail('');
  };

  const handleDeactivateStaff = async () => {
    if (!deactivationReason.trim()) {
      toast.error(t('Reason is required'));
      return;
    }

    if (deactivationReason.length > 200) {
      toast.error(t('Reason must be 200 characters or less'));
      return;
    }

    try {
      setIsDeactivationLoading(true);
      // Remove "Inactive" role from the roles array before sending
      const rolesWithoutInactive = staffToModify.roles.filter((r) => r !== "Inactive");
      
      const response = await axios.put(`/api/update_staff_member/${staffToModify.id}/`, {
        username: staffToModify.username,
        email: staffToModify.email,
        first_name: staffToModify.first_name,
        last_name: staffToModify.last_name,
        is_active: false,
        deactivation_reason: deactivationReason,
        roles: rolesWithoutInactive,
      });

      // If admin, check if TOTP verification is needed
      if (response.data.requires_verification) {
        setNewUserEmail(staffToModify.email);
        setShowStaffTotpModal(true);
        // Store flag and staff ID that this is for deactivation
        window.isDeactivationRequest = true;
        window.deactivatingStaffId = staffToModify.id;
        toast.success(t('Verification code sent to your email'));
        closeDeactivationModal();
        setIsDeactivationLoading(false);
        return;
      }

      toast.success(t('Staff member deactivated successfully'));
      fetchAllStaff();
      closeDeactivationModal();
      closeAddStaffModal();
    } catch (error) {
      console.error('Error deactivating staff:', error);
      showErrorToast(t, 'Failed to deactivate staff member', error);
    } finally {
      setIsDeactivationLoading(false);
    }
  };

  const handleReactivateStaff = async () => {
    try {
      setIsDeactivationLoading(true);
      
      // Prepare data - include new email only if checkbox is checked and field has value
      const reactivationData = {
        username: staffToModify.username,
        email: reactivationUpdateEmail && reactivationNewEmail.trim() ? reactivationNewEmail.trim() : staffToModify.email,
        first_name: staffToModify.first_name,
        last_name: staffToModify.last_name,
        is_active: true,
      };
      
      const response = await axios.put(`/api/update_staff_member/${staffToModify.id}/`, reactivationData);

      // Check if TOTP verification is required (always for reactivation)
      if (response.data.requires_verification) {
        // Use the email that TOTP was sent to (could be new email or original)
        setNewUserEmail(response.data.email || staffToModify.email);
        setShowStaffTotpModal(true);
        // Store flag and staff ID that this is for reactivation
        window.isReactivationRequest = true;
        window.reactivatingStaffId = staffToModify.id;
        toast.success(t('Verification code sent to your email'));
        closeReactivationModal();
        setIsDeactivationLoading(false);
        return;
      }

      toast.success(t('Staff member reactivated successfully'));
      fetchAllStaff();
      closeReactivationModal();
    } catch (error) {
      console.error('Error reactivating staff:', error);
      showErrorToast(t, 'Failed to reactivate staff member', error);
    } finally {
      setIsDeactivationLoading(false);
    }
  };

  // New function to handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedStaff.length === 0) {
      toast.error(t('No staff members selected for deletion.'));
      return;
    }

    const confirmed = window.confirm(t('Are you sure you want to delete the selected staff members?'));
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      // Send DELETE request for each selected staff member
      await Promise.all(selectedStaff.map(staffId => axios.delete(`/api/delete_staff_member/${staffId}/`)));
      toast.success(t('Selected staff members deleted successfully.'));
      setSelectedStaff([]); // Clear selection
      fetchAllStaff(); // Refresh the staff list
    } catch (error) {
      console.error('Error deleting staff members:', error);
      showErrorToast(t, 'Failed to delete staff members.', error);
    } finally {
      setLoading(false);
    }
  };

  // New function to grant access to suspended users
  const handleThawSuspendedUsers = async () => {
    if (selectedStaff.length === 0) {
      toast.error(t('No staff members selected.'));
      return;
    }

    // Open the confirmation modal instead of using window.confirm
    setIsThawModalOpen(true);
  };

  // New function to confirm and execute thaw operation
  const confirmThawSuspendedUsers = async () => {
    try {
      setIsThawLoading(true);
      // Use bulk endpoint to clear suspensions for all selected users at once
      // This logs a single audit entry instead of spamming the audit log
      await axios.post('/api/bulk_clear_suspension/', {
        staff_ids: selectedStaff
      });
      toast.success(t('Access granted to selected users.'));
      setSelectedStaff([]); // Clear selection
      fetchAllStaff(); // Refresh the staff list
      setShowSuspendedOnly(false); // Clear the filter
      setIsThawModalOpen(false); // Close the modal
    } catch (error) {
      console.error('Error granting access:', error);
      showErrorToast(t, 'Failed to grant access to users.', error);
    } finally {
      setIsThawLoading(false);
    }
  };

  // Function to close thaw modal
  const closeThawModal = () => {
    setIsThawModalOpen(false);
  };

  // Mail sending functions
  const openMailModal = (email) => {
    setMailRecipientEmail(email);
    setMailData({
      to: email,
      subject: '',
      body: '',
    });
    setMailAttachments([]);
    setMailErrors({});
    setIsMailModalOpen(true);
  };

  const closeMailModal = () => {
    setIsMailModalOpen(false);
    setMailData({
      to: '',
      subject: '',
      body: '',
    });
    setMailAttachments([]);
    setMailErrors({});
    setMailRecipientEmail('');
  };

  const handleMailDataChange = (field, value) => {
    setMailData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    setMailAttachments(files);
  };

  const handleSendMail = async (e) => {
    e.preventDefault();
    
    if (!validateMailData()) {
      return;
    }

    try {
      setIsMailSending(true);
      
      const formData = new FormData();
      formData.append('to', mailData.to);
      formData.append('subject', mailData.subject);
      formData.append('body', mailData.body);
      
      // Add attachments
      for (const file of mailAttachments) {
        formData.append('attachments', file);
      }
      
      await axios.post('/api/send-mail/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success(t('Email sent successfully'));
      closeMailModal();
      
    } catch (error) {
      console.error('Error sending mail:', error);
      showErrorToast(t, 'Failed to send email', error);
    } finally {
      setIsMailSending(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    setMailAttachments(files);
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
        {loading ? (
          // Loader displayed above everything
          <div className="loader-container">
            <div className="loader">{t('Loading data...')}</div>
          </div>
        ) : (
          <>
            <div className="controls">
              <button onClick={handleRefresh} className="refresh-button">
                {t('Refresh')}
              </button>
              <input
                type="text"
                placeholder={t('Search by name, email or role')}
                value={searchQuery}
                onChange={handleSearch}
                className="search-bar"
              />
              <select 
                value={selectedRoleFilter} 
                onChange={handleRoleFilterChange}
                className="role-filter-select"
              >
                <option value="">{t('All Roles')}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.role_name}>
                    {t(role.role_name)}
                  </option>
                ))}
              </select>
              <button onClick={() => openAddStaffModal('add')} className="add-button">
                {t('Add New Staff')}
              </button>
              <button 
                onClick={toggleInactiveFilter}
                className={`filter-inactive-button ${showInactiveOnly ? 'active' : ''}`}
                title={showInactiveOnly ? t('Show all users') : t('Show inactive users only')}
              >
                {showInactiveOnly ? t('Showing Inactive') : t('Show Inactive')}
              </button>
              {BLOCK_ACCESS_AFTER_APPROVAL && (
                <button 
                  onClick={toggleSuspendedFilter}
                  className={`filter-inactive-button ${showSuspendedOnly ? 'active' : ''}`}
                  title={showSuspendedOnly ? t('Show all users') : t('Show suspended users only')}
                >
                  {showSuspendedOnly ? t('Showing Suspended') : t('Show Suspended Users')}
                </button>
              )}
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
            </div>

            <div className="staff-grid-container">
              {filteredStaff.length === 0 ? (
                <div className="no-data">
                  {showInactiveOnly 
                    ? t('No inactive users to display')
                    : t('No staff members to display')
                  }
                </div>
              ) : (
                <table className="staff-data-grid">
                  <thead>
                    <tr>
                      {(ENABLE_BULK_DELETE || showSuspendedOnly) && <th className="bulk-delete-column">
                        <input
                          type="checkbox"
                          style={{ width: '22px', height: '22px' }}
                          className="bulk-delete-checkbox large-checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Add all visible staff IDs to selection, but avoid duplicates
                              setSelectedStaff(prev => Array.from(new Set([...prev, ...filteredStaff.map(user => user.id)])));
                            } else {
                              // Remove only visible staff IDs from selection
                              setSelectedStaff(prev => prev.filter(id => !filteredStaff.map(user => user.id).includes(id)));
                            }
                          }}
                          checked={filteredStaff.length > 0 && filteredStaff.every(user => selectedStaff.includes(user.id))}
                          indeterminate={selectedStaff.length > 0 && !filteredStaff.every(user => selectedStaff.includes(user.id))}
                        />
                      </th>}
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
                      {(showInactiveOnly || showSuspendedOnly) && <th>{t('Deactivation Reason')}</th>}
                      <th>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStaff.map((user) => (
                      <tr 
                        key={user.id}
                        className={user.is_active ? '' : 'inactive-user-row'}
                      >
                        {(ENABLE_BULK_DELETE || showSuspendedOnly) && <td className="bulk-delete-column">
                          <input
                            type="checkbox"
                            style={{ width: '22px', height: '22px' }}
                            className="bulk-delete-checkbox large-checkbox"
                            checked={selectedStaff.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStaff(prev => Array.from(new Set([...prev, user.id])));
                              } else {
                                setSelectedStaff(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </td>}
                        <td>
                          <button
                            onClick={() => openStaffInfoModal(user)}
                            className="info-button"
                            title={t('View staff information')}
                            style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '18px', padding: '0 5px', marginRight: '5px' }}
                          >
                            ℹ️
                          </button>
                          {user.username.replace(/_/g, ' ')}
                        </td>
                        <td>{user.email}</td>
                        <td>{user.first_name}</td>
                        <td>{user.last_name}</td>
                        <td>{user.created_at}</td>
                        <td>{user.roles.map((role) => t(role)).join(', ')}</td>
                        {(showInactiveOnly || showSuspendedOnly) && <td>{user.deactivation_reason ? t(user.deactivation_reason) : '-'}</td>}
                        <td>
                          <button
                            onClick={() => openMailModal(user.email)}
                            className="mail-button"
                            title={t('Send email to this user')}
                          >
                            📧 {t('Send Mail')}
                          </button>
                          {user.is_active ? (
                            <button
                              onClick={() => openAddStaffModal('edit', user)}
                              className="edit-button"
                            >
                              {t('Edit')}
                            </button>
                          ) : (
                            <button
                              onClick={() => openReactivationModal(user)}
                              className="edit-button"
                            >
                              {t('Activate')}
                            </button>
                          )}
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
              
              {/* Grant Access to Suspended Users Button */}
                      {BLOCK_ACCESS_AFTER_APPROVAL && showSuspendedOnly && selectedStaff.length > 0 && (
                      <div className="grant-access-button-container">
                        <button
                        onClick={handleThawSuspendedUsers}
                        className="grant-access-button"
                        >
                        ✓ {t('Grant Access to Selected Users')}
                        </button>
                      </div>
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

              {/* Page Numbers - Show max 5 pages */}
              {(() => {
                const totalPages = Math.ceil(totalCount / pageSize);
                if (totalPages <= 1) {
                  return <button className="active">1</button>;
                }
                
                const maxButtons = 5;
                let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
                let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                
                // Adjust start if we're near the end
                if (endPage - startPage + 1 < maxButtons) {
                  startPage = Math.max(1, endPage - maxButtons + 1);
                }
                
                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => handlePageChange(i)}
                      className={page === i ? 'active' : ''}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}

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

            {ENABLE_BULK_DELETE && (
              <div className="bulk-delete-container">
                <button
                  onClick={handleBulkDelete}
                  className="bulk-delete-button"
                  disabled={selectedStaff.length === 0 || loading}
                >
                  {loading ? t('Deleting...') : t('Delete Selected Staff')}
                </button>
              </div>
            )}
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
                                if (e.target.checked) {
                                  // If checking "Inactive" role, uncheck all others
                                  if (role.role_name === "Inactive") {
                                    updateStaffData('roles', ["Inactive"]);
                                  } else {
                                    // Otherwise, if "Inactive" is checked, remove it
                                    let updatedRoles = staffData.roles.filter((r) => r !== "Inactive");
                                    updatedRoles.push(role.role_name);
                                    updateStaffData('roles', updatedRoles);
                                  }
                                } else {
                                  // Unchecking a role
                                  const updatedRoles = staffData.roles.filter((r) => r !== role.role_name);
                                  updateStaffData('roles', updatedRoles);
                                }
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

              {/* Optional Staff Profile Fields - Only show for management staff */}
              {isProfileFieldsEnabled() && (
                <>
                  <div style={{ gridColumn: '1 / -1', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                    <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>
                      {t('For use of management staff only')}
                    </p>
                  </div>

                  <div className="staff-form-row">
                    <label>{t('Israeli ID')}</label>
                    <input
                      type="text"
                      placeholder="123456789"
                      value={staffData.staff_israel_id || ''}
                      onChange={(e) => updateStaffData('staff_israel_id', e.target.value)}
                      maxLength="20"
                    />
                  </div>

                  <div className="staff-form-row">
                    <label>{t('Birth Date')} {staffData.staff_birth_date && `(${t('Age')}: ${calculateAgeFromBirthDate(staffData.staff_birth_date)})`}</label>
                    <input
                      type="date"
                      value={staffData.staff_birth_date ? staffData.staff_birth_date.split('/').reverse().join('-') : ''}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        if (dateValue) {
                          const [year, month, day] = dateValue.split('-');
                          updateStaffData('staff_birth_date', `${day}/${month}/${year}`);
                        } else {
                          updateStaffData('staff_birth_date', '');
                        }
                      }}
                      style={{ direction: 'rtl' }}
                    />
                  </div>

                  <div className="staff-form-row">
                    <label>{t('Gender')}</label>
                    <select
                      value={staffData.staff_gender || ''}
                      onChange={(e) => updateStaffData('staff_gender', e.target.value)}
                    >
                      <option value="">{t('Select...')}</option>
                      <option value="male">{t('Male')}</option>
                      <option value="female">{t('Female')}</option>
                    </select>
                  </div>

                  <div className="staff-form-row">
                    <label>{t('Phone')}</label>
                    <input
                      type="text"
                      placeholder="0501234567"
                      value={staffData.staff_phone || ''}
                      onChange={(e) => updateStaffData('staff_phone', e.target.value)}
                      maxLength="20"
                    />
                  </div>

                  <div className="staff-form-row">
                    <label>{t('City')}</label>
                    <select
                      placeholder={t('City name')}
                      value={staffData.staff_city || ''}
                      onChange={(e) => updateStaffData('staff_city', e.target.value)}
                    >
                      {!staffData.staff_city && <option value="">{t('Select a city')}</option>}
                      {staffData.staff_city && !citiesOptions.includes(staffData.staff_city) && (
                        <option key="current" value={staffData.staff_city}>{staffData.staff_city}</option>
                      )}
                      {citiesOptions.map((city, idx) => (
                        <option key={idx} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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

      {/* Staff Info Modal */}
      {isStaffInfoModalOpen && staffInfoData && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-content">
            <span className="staff-close" onClick={closeStaffInfoModal}>&times;</span>
            <h2 className="staff-info-modal-title">{t('Staff Information')}</h2>
            <div className="staff-info-modal-container">
              <div className="staff-info-section">
                <div className="staff-info-section-title">{t('Basic Information')}</div>
                <div className="staff-info-content">
                  <div className="staff-info-item">
                    <strong>{t('Username')}:</strong> {staffInfoData.username}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('Email')}:</strong> {staffInfoData.email}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('Name')}:</strong> {staffInfoData.first_name} {staffInfoData.last_name}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('Created At')}:</strong> {staffInfoData.created_at}
                  </div>
                </div>
              </div>

              <div className="staff-info-section">
                <div className="staff-info-section-title">{t('Demographic Information')}</div>
                <div className="staff-info-content">
                  <div className="staff-info-item">
                    <strong>{t('Israeli ID')}:</strong> {staffInfoData.staff_israel_id || '---'}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('Birth Date')}:</strong> {staffInfoData.staff_birth_date || '---'}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('Age')}:</strong> {staffInfoData.staff_age !== null && staffInfoData.staff_age !== undefined ? `${staffInfoData.staff_age} ${t('years')}` : '---'}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('Gender')}:</strong> {staffInfoData.staff_gender !== null && staffInfoData.staff_gender !== undefined ? (staffInfoData.staff_gender ? t('Female') : t('Male')) : '---'}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('Phone')}:</strong> {staffInfoData.staff_phone || '---'}
                  </div>
                  <div className="staff-info-item">
                    <strong>{t('City')}:</strong> {staffInfoData.staff_city || '---'}
                  </div>
                </div>
              </div>

              <div className="staff-info-roles-container">
                <div className="staff-info-section-title">{t('Roles')}:</div>
                <div>
                  {staffInfoData.roles && staffInfoData.roles.length > 0 ? (
                    staffInfoData.roles.map((role, idx) => (
                      <span key={idx} className="staff-info-role-item">
                        {t(role)}
                      </span>
                    ))
                  ) : (
                    <div className="staff-info-item">{t('No roles assigned')}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="staff-info-modal-close-container">
              <button 
                onClick={closeStaffInfoModal}
                className="staff-info-modal-close-button"
              >
                {t('Close')}
              </button>
            </div>
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
          portalClassName="modal-portal"
          shouldCloseOnOverlayClick={true}
          ariaHideApp={false}
        >
          <h2>{t('Are you sure you want to delete this staff member?')}</h2>
          {staffToDelete && (
            <p><strong>{staffToDelete.username.replace(/_/g, ' ')} ({staffToDelete.email})</strong></p>
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

      {/* Deactivation Modal */}
      {isDeactivationModalOpen && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-content">
            <span className="staff-close" onClick={closeDeactivationModal}>&times;</span>
            <h2 className="deactivation-modal-header">{t('Deactivate Staff Member')}</h2>
          <p>{t('Staff')} <strong>{staffToModify?.first_name} {staffToModify?.last_name}</strong></p>
          <p className="deactivation-modal-warning">
            {t('Warning: This action will disable the account and prevent login')}<br />{t('If they were a tutor, their tutorships will be marked as inactive and the student will be available for reassignment.')}
          </p>
          <div className="deactivation-reason-container">
            <label htmlFor="deactivation-reason" className="deactivation-reason-label">
              {t('Reason for Deactivation')} <span>*</span>
            </label>
            <textarea
              id="deactivation-reason"
              value={deactivationReason}
              onChange={(e) => setDeactivationReason(e.target.value.slice(0, 200))}
              placeholder={t('Please provide a reason for deactivating this staff member (max 200 characters)')}
              maxLength={200}
              className="deactivation-reason-textarea"
            />
            <div className="deactivation-reason-counter">
              {t('Characters')}: {deactivationReason.length}/200
            </div>
          </div>
          {deactivationReason.trim().length === 0 && (
            <p className="deactivation-reason-error">
              {t('Reason is required')}
            </p>
          )}
          <div className="modal-actions-deactivation">
            <button
              onClick={handleDeactivateStaff}
              className="deactivation-button"
            >
              {isDeactivationLoading ? t('Deactivating...') : t('Deactivate')}
            </button>
            <button
              onClick={closeDeactivationModal}
              disabled={isDeactivationLoading}
              className="no-button"
            >
              {t('Cancel')}
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Reactivation Modal */}
      {isReactivationModalOpen && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-content">
            <span className="staff-close" onClick={closeReactivationModal}>&times;</span>
            <h2 className="reactivation-modal-header">{t('Reactivate Staff Member')}</h2>
            <p>
              {t('Are you sure you want to reactivate')} <strong>{staffToModify?.first_name} {staffToModify?.last_name}</strong>?
            </p>
            <p className="reactivation-modal-info">
              {t('They will receive an email notification and will be able to log in again')}
            </p>
            
            {/* Optional email update section */}
            <div className="reactivation-email-section">
              <label className="reactivation-email-checkbox">
                <input
                  type="checkbox"
                  checked={reactivationUpdateEmail}
                  onChange={(e) => {
                    setReactivationUpdateEmail(e.target.checked);
                    // Clear email if unchecked
                    if (!e.target.checked) {
                      setReactivationNewEmail('');
                    }
                  }}
                />
                <span>{t('Update email address')}</span>
              </label>
              
              {reactivationUpdateEmail && (
                <input
                  type="email"
                  className="reactivation-email-input"
                  placeholder={t('Enter new email address')}
                  value={reactivationNewEmail}
                  onChange={(e) => setReactivationNewEmail(e.target.value)}
                  disabled={!reactivationUpdateEmail}
                />
              )}
            </div>
            
            <div className="modal-actions-deactivation">
              <button
                onClick={handleReactivateStaff}
                className="reactivation-button"
                disabled={reactivationUpdateEmail && !reactivationNewEmail.trim()}
              >
                {t('Reactivate')}
              </button>
              <button
                onClick={closeReactivationModal}
                className="no-button"
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff TOTP Modal */}
      {showStaffTotpModal && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-content">
            <span className="staff-close" onClick={closeStaffTotpModal}>&times;</span>
            <h2>
              {window.isDeactivationRequest 
                ? t('Deactivation Verification') 
                : window.isReactivationRequest
                ? t('Reactivation Verification')
                : (modalType === 'add' ? t('Staff Creation Verification') : t('Email Change Verification'))
              }
            </h2>
            <p>{t('Please enter the 6-digit code sent to')} {newUserEmail}</p>
            <form onSubmit={handleStaffTotpVerification}>
              {renderStaffTOTPInputBoxes()}
              <div className="staff-form-actions">
                <button type="submit" disabled={totpLoading || staffTotpCode.length !== 6}>
                  {totpLoading ? t('Verifying...') : (modalType === 'add' ? t("Verify & Create Staff") : (window.isDeactivationRequest ? t("Verify & Deactivate") : (window.isReactivationRequest ? t("Verify & Reactivate") : t("Verify & Update Staff"))))}
                </button>
                <button type="button" onClick={closeStaffTotpModal}>
                  {t("Cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thaw Suspension Confirmation Modal */}
      {isThawModalOpen && (
        <Modal
          isOpen={isThawModalOpen}
          onRequestClose={closeThawModal}
          className="delete-modal"
          overlayClassName="delete-modal-overlay"
          portalClassName="modal-portal"
          shouldCloseOnOverlayClick={true}
          ariaHideApp={false}
        >
          <h2>{t('Grant Access to Suspended Users')}</h2>
          <p>
            {t('You are about to grant access to')} <strong>{selectedStaff.length}</strong> {t('suspended user(s)')}
          </p>
          <p style={{ color: '#666', marginTop: '10px' }}>
            {t('These users will be able to log in and access the system.')}
          </p>
          <div className="modal-actions">
            <button 
              onClick={confirmThawSuspendedUsers} 
              className="yes-button"
              disabled={isThawLoading}
            >
              {isThawLoading ? t('Processing...') : t('Grant Access')}
            </button>
            <button 
              onClick={closeThawModal} 
              className="no-button"
              disabled={isThawLoading}
            >
              {t('Cancel')}
            </button>
          </div>
        </Modal>
      )}

      {/* Mail Sending Modal */}
      {isMailModalOpen && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-content mail-modal-content">
            <span className="staff-close" onClick={closeMailModal}>&times;</span>
            <h2>{t('Mail sending')}</h2>
            <form onSubmit={handleSendMail} className="mail-form">
              <div className="mail-form-row">
                <label>{t('TO')} <span>*</span></label>
                <input
                  type="text"
                  value={mailData.to}
                  onChange={(e) => handleMailDataChange('to', e.target.value)}
                  placeholder={t('email@example.com, another@example.com')}
                  className={mailErrors.to ? 'error' : ''}
                />
                {mailErrors.to && <span className="mail-error-message">{mailErrors.to}</span>}
                <small>{t('Separate multiple emails with commas')}</small>
              </div>

              <div className="mail-form-row">
                <label>{t('Subject')} <span>*</span> ({mailData.subject.length}/50)</label>
                <input
                  type="text"
                  value={mailData.subject}
                  onChange={(e) => handleMailDataChange('subject', e.target.value.slice(0, 50))}
                  placeholder={t('Email subject')}
                  maxLength={50}
                  className={mailErrors.subject ? 'error' : ''}
                />
                {mailErrors.subject && <span className="mail-error-message">{mailErrors.subject}</span>}
              </div>

              <div className="mail-form-row">
                <label>{t('Body')} <span>*</span> ({mailData.body.length}/250)</label>
                <textarea
                  value={mailData.body}
                  onChange={(e) => handleMailDataChange('body', e.target.value.slice(0, 250))}
                  placeholder={t('Email body')}
                  maxLength={250}
                  rows="5"
                  className={mailErrors.body ? 'error' : ''}
                />
                {mailErrors.body && <span className="mail-error-message">{mailErrors.body}</span>}
              </div>

              <div className="mail-form-row">
                <label>{t('Attachments')}</label>
                <div
                  className={`mail-drop-zone ${mailAttachments.length > 0 ? 'has-files' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentChange}
                    id="mail-file-input"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="mail-file-input" className="mail-drop-label">
                    {mailAttachments.length > 0
                      ? t('Files selected') + ': ' + mailAttachments.map(f => f.name).join(', ')
                      : t('Drag and drop files here or click to select (PNG, JPG, PDF, XLS - Max 10MB total)')}
                  </label>
                </div>
                {mailErrors.attachments && <span className="mail-error-message">{mailErrors.attachments}</span>}
              </div>

              <div className="mail-form-actions">
                <button type="submit" disabled={isMailSending}>
                  {isMailSending ? t('Sending mail...') : t('Send Email')}
                </button>
                <button type="button" onClick={closeMailModal} disabled={isMailSending}>
                  {t('Cancel')}
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