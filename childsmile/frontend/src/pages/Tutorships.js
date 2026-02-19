import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import ReactSlider from 'react-slider';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/tutorships.css';
import axios from '../axiosConfig';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { hasViewPermissionForTable, hasUpdatePermissionForTable, hasDeletePermissionForTable, hasCreatePermissionForTable, getTutors, isGuestUser } from '../components/utils';
import { useTranslation } from 'react-i18next'; // Import the translation hook
import { showErrorToast, showErrorApprovalToast } from '../components/toastUtils'; // Import the toast utility
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import redMarker from '../assets/markers/custom-marker-icon-2x-red.png';
import yellowMarker from '../assets/markers/custom-marker-icon-2x-yellow.png';
import greenMarker from '../assets/markers/custom-marker-icon-2x-green.png';
import customMarkerShadow from '../assets/markers/custom-marker-shadow.png';

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const hasDeletePermission = hasDeletePermissionForTable('tutorships');
const hasCreatePermission = hasCreatePermissionForTable('tutorships');
const hasUpdatePermission = hasUpdatePermissionForTable('tutorships');
const hasViewPermission = hasViewPermissionForTable('tutorships');

const ENABLE_BULK_DELETE = process.env.REACT_APP_ENABLE_BULK_DELETE === 'true';

const HourglassSpinner = () => {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(r => (r + 180) % 360);
    }, 500); // 300ms for visible effect
    return () => clearInterval(interval);
  }, []);
  return (
    <span
      className="pending-distance"
      style={{
        display: 'inline-block',
        transition: 'transform 0.2s',
        transform: `rotate(${rotation}deg)`,
        fontSize: '1.5em',
      }}
      role="img"
      aria-label="hourglass"
    >
      ⏳
    </span>
  );
};

const Tutorships = () => {
  const [tutorships, setTutorships] = useState([]);
  const [families, setFamilies] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [filterThreshold, setFilterThreshold] = useState(50); // Default filter threshold
  const [sortOrder, setSortOrder] = useState('desc'); // Default sort order
  const [tutorshipToDelete, setTutorshipToDelete] = useState(null);
  const [isTutorshipDeleteModalOpen, setIsTutorshipDeleteModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedMatchForInfo, setSelectedMatchForInfo] = useState(null);
  const [selectedTutorship, setSelectedTutorship] = useState(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const { t } = useTranslation(); // Initialize the translation hook
  const mapRef = useRef();
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentUserRoleId, setCurrentUserRoleId] = useState(null);
  const [currentRoleName, setCurrentRoleName] = useState('');
  const [page, setPage] = useState(1); // Current page
  const [pageSize] = useState(5); // Number of tutorships per page
  const [totalCount, setTotalCount] = useState(0); // Total number of tutorships
  const [matchesPage, setMatchesPage] = useState(1); // Current page for matches
  const [matchesPageSize] = useState(7); // Number of matches per page
  const [isMagnifyActive, setIsMagnifyActive] = useState(false);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [tutorshipSearchQuery, setTutorshipSearchQuery] = useState('');
  const [enrichedTutorships, setEnrichedTutorships] = useState([]);
  const [wizardFamilies, setWizardFamilies] = useState([]);
  const [wizardTutors, setWizardTutors] = useState([]);
  const showPendingDistancesWarning = matches.some(m => m.distance_pending);
  //const showPendingDistancesWarning = true; // Always show the warning for now
  const [CoordinatorOrAdmin, setCoordinatorOrAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusFilterRef = useRef();
  const [tutorshipActivationFilters, setTutorshipActivationFilters] = useState({
    'pending_first_approval': true,
    'active': true,
    'inactive': false
  });
  const [showTutorshipActivationDropdown, setShowTutorshipActivationDropdown] = useState(false);
  const tutorshipActivationFilterRef = useRef();
  const [selectedTutorships, setSelectedTutorships] = useState([]);
  const location = useLocation();
  const [isManualMatchMode, setIsManualMatchMode] = useState(false);
  const [manualMatchChildId, setManualMatchChildId] = useState(null);
  const [manualMatchChildName, setManualMatchChildName] = useState(null);
  const [availableTutors, setAvailableTutors] = useState([]);
  const [selectedTutorForMatch, setSelectedTutorForMatch] = useState(null);
  const [isCalculatingManualMatch, setIsCalculatingManualMatch] = useState(false);
  const [manualMatchResult, setManualMatchResult] = useState(null);
  const [isManualMatchModalOpen, setIsManualMatchModalOpen] = useState(false);
  const [isManualMatchConfirmationOpen, setIsManualMatchConfirmationOpen] = useState(false);
  const [editingDateId, setEditingDateId] = useState(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const dateInputRef = useRef(null);
  const [showGradeTooltip, setShowGradeTooltip] = useState(false);
  const tooltipRef = useRef(null);

  const toggleMagnify = () => {
    setIsMagnifyActive((prevState) => !prevState);
  };

  const validateDate = (dateStr) => {
    // Validate DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 2 || parts[2].length !== 4) {
      return { valid: false, error: t('Invalid date format. Please use DD/MM/YYYY') };
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Validate month range
    if (month < 1 || month > 12) {
      return { valid: false, error: t('Month must be between 01 and 12') };
    }

    // Validate day range based on month
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Check for leap year
    if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
      daysInMonth[1] = 29;
    }

    if (day < 1 || day > daysInMonth[month - 1]) {
      return { valid: false, error: t('Invalid day for the selected month') };
    }

    // Create date object
    const inputDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for fair comparison

    // Check if date is in the future
    if (inputDate > today) {
      return { valid: false, error: t('Date cannot be in the future') };
    }

    // Check if date is too old (more than 20 years ago)
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    if (inputDate < twentyYearsAgo) {
      return { valid: false, error: t('Date cannot be more than 20 years ago') };
    }

    return { valid: true, error: null };
  };

  const handleDateClick = (tutorship) => {
    setEditingDateId(tutorship.id);
    // Ensure we're working with the date in DD/MM/YYYY format
    const dateStr = tutorship.created_date;
    setEditingDateValue(dateStr);
  };

  const handleDateChange = (e) => {
    // Allow free typing without validation
    setEditingDateValue(e.target.value);
  };

  const handleDateSave = async (tutorshipId) => {
    if (!editingDateValue.trim()) {
      setEditingDateId(null);
      setEditingDateValue('');
      return;
    }

    // Validate date format and value
    const validation = validateDate(editingDateValue);
    if (!validation.valid) {
      showErrorToast(t, validation.error, '');
      return;
    }

    try {
      // Convert DD/MM/YYYY to YYYY-MM-DD format for backend
      const parts = editingDateValue.split('/');
      let dateToSend = editingDateValue;
      
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        // It's DD/MM/YYYY format, convert to YYYY-MM-DD
        dateToSend = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      const response = await axios.patch(
        `/api/update_tutorship_created_date/${tutorshipId}/`,
        { created_date: dateToSend }
      );

      // Update the local state with the new date
      setEnrichedTutorships(prevTutorships =>
        prevTutorships.map(t =>
          t.id === tutorshipId ? { ...t, created_date: editingDateValue } : t
        )
      );

      toast.success(t('Tutorship updated successfully'));
      setEditingDateId(null);
      setEditingDateValue('');
    } catch (error) {
      console.error('Error updating tutorship date:', error);
      const errorMsg = error.response?.data?.error || t('Failed to update tutorship');
      showErrorToast(t, errorMsg, '');
    }
  };

  const handleDateKeyPress = (e, tutorshipId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDateSave(tutorshipId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingDateId(null);
      setEditingDateValue('');
    }
  };

  const fetchStaffAndRoles = async () => {
    console.log('DEBUG: Fetching staff and roles data...'); // Add debug log
    try {
      const [staffResponse, rolesResponse] = await Promise.all([
        axios.get('/api/staff/'), // Fetch staff data
        axios.get('/api/get_roles/'), // Fetch roles data
      ]);

      const staffData = staffResponse.data.staff || [];
      const rolesData = rolesResponse.data.roles || [];

      setStaff(staffData);
      setRoles(rolesData);

      // Get the current user's username from localStorage
      const currentUsername = localStorage.getItem('origUsername');
      console.log('DEBUG: Current Username from localStorage:', currentUsername); // Add debug log

      // Find the current user in the staff data
      const currentUser = staffData.find((user) => user.username === currentUsername);
      console.log('DEBUG: Current User:', currentUser); // Add debug log

      if (currentUser) {
        // Map the user's roles to role IDs
        const userRoleIds = currentUser.roles.map((roleName) => {
          const role = rolesData.find((r) => r.role_name === roleName);
          return role ? role.id : null;
        }).filter((id) => id !== null);

        if (userRoleIds.length > 0) {
          setCurrentUserRoleId(userRoleIds[0]); // Use the first role ID
          console.log('DEBUG: Current User Role ID:', userRoleIds[0]); // Add debug log
        } else {
          console.error('No matching role ID found for the current user.');
          showErrorToast(t, 'No matching role ID found. Please contact support.');
        }

        // Get the current role name
        const currentRole = rolesData.find((role) => role.id === userRoleIds[0]);
        if (currentRole) {
          const currentRoleName = currentRole.role_name; // Create the currentRoleName variable
          setCurrentRoleName(currentRoleName); // Set the current role name
          console.log('DEBUG: Current Role Name:', currentRoleName); // Add debug log
        }
        else {
          console.error('No matching role ID found for the current user.');
          showErrorToast(t, 'No matching role ID found. Please contact support.');
        }

      } else {
        console.error('Current user not found in staff data.');
        showErrorToast(t, 'Current user not found. Please contact support.');
      }
      // Helper to check if user is coordinator or admin
      const isCoordinatorOrAdmin = rolesData.some(
        (role) =>
          role.role_name === 'Tutors Coordinator' ||
          role.role_name === 'Families Coordinator' ||
          role.role_name === 'System Administrator'
      );
      console.log('DEBUG: Is Coordinator or Admin:', isCoordinatorOrAdmin); // Add debug log
      setCoordinatorOrAdmin(isCoordinatorOrAdmin);
    } catch (error) {
      console.error('Error fetching staff or roles:', error);
      showErrorToast(t, 'Failed to fetch staff or roles.', error);
    }
  };

  const determinePendingCoordinator = (tutorship, rolesData) => {
    console.log('Tutorship last_approver:', tutorship.last_approver, 'Roles:', rolesData);
    // Extract the IDs of the roles that have already approved
    const approvedRoleIds = Array.isArray(tutorship.last_approver)
      ? tutorship.last_approver
      : tutorship.last_approver
        ? [tutorship.last_approver]
        : [];

    // Find the coordinator whose role ID is NOT in the approvedRoleIds list
    const pendingRole = rolesData.find(
      (role) =>
        !approvedRoleIds.includes(role.id) && // Role ID is not in the approved list
        (role.role_name === 'Tutors Coordinator' || role.role_name === 'Families Coordinator') // Must be a coordinator role
    );

    return pendingRole ? pendingRole.role_name : null; // Return the role name if found
  };

  // Permissions required to access the page
  const requiredPermissions = [
    { resource: 'childsmile_app_tutorships', action: 'CREATE' },
    { resource: 'childsmile_app_tutorships', action: 'UPDATE' },
    { resource: 'childsmile_app_tutorships', action: 'DELETE' },
    { resource: 'childsmile_app_tutorships', action: 'VIEW' },
  ];


  // Function to get a custom marker icon based on the distance
  const getColoredMarkerIcon = (grade) => {
    let markerIcon;

    if (grade > 50) {
      markerIcon = greenMarker; // Green for grade > 50
    } else if (grade >= 25 && grade < 50) {
      markerIcon = yellowMarker; // Yellow for grade between 25 and 50
    } else {
      markerIcon = redMarker; // Red for grade < 25
    }

    return L.icon({
      iconUrl: markerIcon,
      shadowUrl: customMarkerShadow,
      iconSize: [25, 41], // Default size for Leaflet markers
      iconAnchor: [12, 41], // Anchor point of the marker
      popupAnchor: [1, -34], // Position of the popup relative to the marker
      shadowSize: [41, 41], // Size of the shadow
    });
  };

  const openAddWizardModal = () => {
    fetchStaffAndRoles(); // Ensure roles are loaded
    setIsModalOpen(true);
    fetchMatches(); // Fetch matches when opening the modal
  };

  const openTutorshipDeleteModal = (tutorshipId) => {
    console.log('DEBUG: Opening delete modal for tutorship ID:', tutorshipId); // Add debug log
    setTutorshipToDelete(tutorshipId);
    setIsTutorshipDeleteModalOpen(true);
  };

  const closeTutorshipDeleteModal = () => {
    setIsTutorshipDeleteModalOpen(false);
    setTutorshipToDelete(null);
  };

  const openApprovalModal = (tutorship) => {
    setSelectedTutorship(tutorship); // Set the selected tutorship
    setIsApprovalModalOpen(true); // Open the approval modal
  };

  const closeApprovalModal = () => {
    setSelectedTutorship(null); // Clear the selected tutorship
    setIsApprovalModalOpen(false); // Close the approval modal
  };

  const confirmApproval = async () => {
    if (!selectedTutorship || !currentUserRoleId) return;

    try {
      const response = await axios.post(`/api/update_tutorship/${selectedTutorship.id}/`, {
        staff_role_id: currentUserRoleId, // Use dynamically fetched role ID
      });
      toast.success(t('Tutorship approved successfully!'));
      fetchFullTutorships(); // Refresh the tutorships list
      closeApprovalModal();
    } catch (error) {
      console.error('Error approving tutorship:', error);
      const userRoleName = t(currentRoleName); // Translate the user's role name
      showErrorApprovalToast(t, error, userRoleName); // Pass the role name
    }
  };

  const confirmDeleteTutorship = async () => {
    if (!tutorshipToDelete) {
      console.error('No tutorship ID provided for deletion.'); // Add error log
      return;
    }
    try {
      await axios.delete(`/api/delete_tutorship/${tutorshipToDelete}/`); // Use the DELETE API endpoint
      toast.success(t('Tutorship deleted successfully!'));
      // Optionally, update the state to remove the deleted tutorship from the list
      setTutorships(tutorships.filter((tutorship) => tutorship.id !== tutorshipToDelete));
    } catch (error) {
      console.error('Error deleting tutorship:', error);
      showErrorToast(t, 'Error deleting tutorship', error); // Use the toast utility for error messages
    } finally {
      closeTutorshipDeleteModal();
      setTutorshipToDelete(null); // Clear the tutorship ID after deletion
      fetchFullTutorships(); // Refresh the tutorships list
    }
  };

  const sortedAndFilteredMatches = matches
    .filter((match) => {
      // Exclude matches that have existing tutorships
      const hasExistingTutorship = enrichedTutorships.some(tutorship => 
        tutorship.child_id === match.child_id && 
        tutorship.tutor_id === match.tutor_id
      );
      
      // Include only if no existing tutorship, OR if the existing one is inactive
      if (hasExistingTutorship) {
        const inactiveTutorship = enrichedTutorships.find(tutorship => 
          tutorship.child_id === match.child_id && 
          tutorship.tutor_id === match.tutor_id &&
          tutorship.tutorship_activation === 'inactive'
        );
        return inactiveTutorship !== undefined; // Only include if the tutorship is inactive
      }
      return true; // No existing tutorship, include it
    })
    .filter((match) => match.grade >= filterThreshold)
    .filter((match) => {
      if (!matchSearchQuery.trim()) return true;
      const query = matchSearchQuery.toLowerCase();
      return (
        (match.child_full_name && match.child_full_name.toLowerCase().includes(query)) ||
        (match.tutor_full_name && match.tutor_full_name.toLowerCase().includes(query))
      );
    })
    .filter((match) => !statusFilter || match.tutoring_status === statusFilter) // <-- Add this line
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.grade - b.grade;
      } else {
        return b.grade - a.grade;
      }
    });

  // Helper function to get visible page numbers (max 4 buttons)
  const getVisibleMatchPageNumbers = () => {
    const maxVisible = 4;
    const halfVisible = Math.floor(maxVisible / 2);
    const totalMatchPages = Math.max(1, Math.ceil(sortedAndFilteredMatches.length / matchesPageSize));
    
    let startPage = Math.max(1, matchesPage - halfVisible);
    let endPage = Math.min(totalMatchPages, startPage + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Paginate matches for display
  const totalMatchPages = Math.max(1, Math.ceil(sortedAndFilteredMatches.length / matchesPageSize));
  const paginatedMatches = sortedAndFilteredMatches.slice(
    (matchesPage - 1) * matchesPageSize,
    matchesPage * matchesPageSize
  );

  // const fetchTutorships = () => {
  //   setLoading(true);
  //   axios
  //     .get('/api/get_tutorships/')
  //     .then((response) => {
  //       const fetchedTutorships = response.data.tutorships || [];
  //       setTutorships(fetchedTutorships);
  //       setTotalCount(fetchedTutorships.length); // 
  //       fetchStaffAndRoles(); // Fetch staff and roles data
  //     })
  //     .catch((error) => {
  //       console.error('Error fetching tutorships:', error);
  //       showErrorToast(t, 'Failed to fetch tutorships.', error); // Use the toast utility for error handling
  //     })
  //     .finally(() => {
  //       setLoading(false);
  //     });
  // };

  const parseDate = (dateString) => {
    if (!dateString) return new Date(0); // Handle missing dates
    const [day, month, year] = dateString.split('/'); // Split the date string
    return new Date(`${year}-${month}-${day}`); // Convert to a valid Date object
  };

  // Filter and sort the tutorships by created_date
  const filteredTutorships = enrichedTutorships.filter(tutorship => {
    // Filter by activation status
    if (tutorshipActivationFilters[tutorship.tutorship_activation] !== true) {
      return false;
    }
    
    // Filter by search query
    if (tutorshipSearchQuery.trim()) {
      const query = tutorshipSearchQuery.toLowerCase();
      return (
        (tutorship.child_full_name && tutorship.child_full_name.toLowerCase().includes(query)) ||
        (tutorship.tutor_full_name && tutorship.tutor_full_name.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const sortedTutorships = [...filteredTutorships].sort((a, b) => {
    const dateA = parseDate(a.created_date); // Parse the date
    const dateB = parseDate(b.created_date); // Parse the date
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA; // Ascending or descending order
  });

  // Paginate the sorted tutorships
  const paginatedTutorships = sortedTutorships.slice((page - 1) * pageSize, page * pageSize);
  const displayTotalCount = filteredTutorships.length; // Use filtered count for pagination

  // Function to toggle the sorting order
  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };
  // Add near the top of Tutorships.js
  const TUTORING_STATUS_ROW_COLORS = {
    "בוגר": "#e6f7ff",                     // light blue
    "שידוך_בסימן_שאלה": "#f9e6ff",         // light purple
    "למצוא_חונך_בעדיפות_גבוה": "#e53935", // strong red (urgent)
    "למצוא_חונך_אין_באיזור_שלו": "#fff0e6", // light orange
    "יש_חונך": "#e6ffe6",                  // light green
    "למצוא_חונך": "#fffbe6",               // light yellow (default)
  };
  // NOTE: לא_רוצים and לא_רלוונטי are EXCLUDED - no point matching if they don't want tutoring or are not relevant

  function getTutoringStatusRowColor(status) {
    return TUTORING_STATUS_ROW_COLORS[status] || "#fff";
  }

  const openInfoModal = (row) => {
    // If it's a tutorship (from the grid), build the expected structure
    if (row.child_firstname && row.tutor_firstname) {
      setSelectedMatchForInfo({
        ...row,
        child_full_name: `${row.child_firstname ?? "---"} ${row.child_lastname ?? "---"}`,
        tutor_full_name: `${row.tutor_firstname ?? "---"} ${row.tutor_lastname ?? "---"}`,
        child_id: row.child_id ?? "---",
        tutor_id: row.tutor_id ?? "---",
        address: row.address ?? "---",
        child_phone_number: row.child_phone_number ?? "---",
        date_of_birth: row.date_of_birth ?? "---",
        gender: row.gender ?? null,
        medical_diagnosis: row.medical_diagnosis ?? "---",
        diagnosis_date: row.diagnosis_date ?? "---",
        marital_status: row.marital_status ?? "---",
        num_of_siblings: row.num_of_siblings ?? "---",
        tutoring_status: row.tutoring_status ?? "---",
        responsible_coordinator: row.responsible_coordinator ?? "---",
        need_review: row.need_review ?? true,
        additional_info: row.additional_info ?? "---",
        is_in_frame: row.is_in_frame ?? "---",
        coordinator_comments: row.coordinator_comments ?? "---",
        current_medical_state: row.current_medical_state ?? "---",
        treating_hospital: row.treating_hospital ?? "---",
        when_completed_treatments: row.when_completed_treatments ?? "---",
        father_name: row.father_name ?? "---",
        father_phone: row.father_phone ?? "---",
        mother_name: row.mother_name ?? "---",
        mother_phone: row.mother_phone ?? "---",
        expected_end_treatment_by_protocol: row.expected_end_treatment_by_protocol ?? "---",
        has_completed_treatments: row.has_completed_treatments ?? false,
        details_for_tutoring: row.details_for_tutoring ?? "---",
        last_review_talk_conducted: row.last_review_talk_conducted ?? "---",
        tutor_city: row.tutor_city ?? "---",
        tutor_age: row.tutor_age ?? "---",
        tutor_gender: row.tutor_gender ?? null,
        phone: row.tutor_phone ?? row.phone ?? "---",
        email: row.tutor_email ?? row.email ?? "---",
        want_tutor: row.want_tutor ?? false,
        comment: row.comment ?? "---",
        tutorship_status: row.tutorship_status ?? "---",
        status: row.status ?? "---",
      });
    } else {
      // It's a match from the wizard, use as is
      setSelectedMatchForInfo(row);
    }
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedMatchForInfo(null);
  };


  const handleRefreshMatches = async () => {
    try {
      await fetchMatches();
    } catch (error) {
      toast.warn(
        t("The calculations hadn't finished yet. Please try again in several seconds."),
        { position: "top-center", autoClose: 4000 }
      );
    }
  };

  const fetchMatches = async () => {
    setGridLoading(true);
    setMapLoading(true);
    try {
      const [matchesResponse, familiesData, tutorsWithDetails] = await Promise.all([
        axios.post('/api/calculate_possible_matches/'),
        fetchAllFamilies(),
        fetchAllTutorsWithDetails()
      ]);

      const matchesData = matchesResponse.data.matches || [];

      const matchesWithDetails = matchesData.map((match) => {
        const family = familiesData.find((f) => f.id === match.child_id) || {};
        const tutor = tutorsWithDetails.find((t) => t.id === match.tutor_id) || {};
        return {
          ...match,
          ...family,
          ...tutor,
        };
      });

      setMatches(matchesWithDetails);
      setWizardFamilies(familiesData);
      setWizardTutors(tutorsWithDetails);
    } catch (error) {
      console.error('Error fetching matches:', error);
      showErrorToast(t, 'Failed to fetch matches.', error);
    } finally {
      setGridLoading(false);
      setMapLoading(false);
    }
  };


  const fetchFullTutorships = async () => {
    setLoading(true);
    try {
      await fetchStaffAndRoles(); // <-- Ensure staff and roles are loaded first

      const [tutorshipsResponse, familiesData, tutorsWithDetails] = await Promise.all([
        axios.get('/api/get_tutorships/'),
        fetchAllFamilies(),
        fetchAllTutorsWithDetails()
      ]);

      const tutorshipsRaw = tutorshipsResponse.data.tutorships || [];

      const enrichedTutorships = tutorshipsRaw.map(tutorship => {
        // Use the correct field for family (if you only have one family, just use families[0])
        const family = familiesData.find(f => f.id === tutorship.child_id) || {};
        // Use the correct field for tutor
        const tutor = tutorsWithDetails.find(t => t.id === tutorship.tutor_id) || {};
        return {
          ...family,
          ...tutor,
          ...tutorship,
          // Child fields
          child_full_name: `${tutorship.child_firstname ?? family.first_name ?? "---"} ${tutorship.child_lastname ?? family.last_name ?? "---"}`,
          child_id: family.id ?? "---",
          address: family.address ?? "---",
          child_phone_number: family.child_phone_number ?? "---",
          date_of_birth: family.date_of_birth ?? "---",
          gender: family.gender ?? null,
          medical_diagnosis: family.medical_diagnosis ?? "---",
          diagnosis_date: family.diagnosis_date ?? "---",
          marital_status: family.marital_status ?? "---",
          num_of_siblings: family.num_of_siblings ?? "---",
          tutoring_status: family.tutoring_status ?? "---",
          responsible_coordinator: family.responsible_coordinator ?? "---",
          additional_info: family.additional_info ?? "---",
          is_in_frame: family.is_in_frame ?? "---",
          coordinator_comments: family.coordinator_comments ?? "---",
          current_medical_state: family.current_medical_state ?? "---",
          treating_hospital: family.treating_hospital ?? "---",
          when_completed_treatments: family.when_completed_treatments ?? "---",
          father_name: family.father_name ?? "---",
          father_phone: family.father_phone ?? "---",
          mother_name: family.mother_name ?? "---",
          mother_phone: family.mother_phone ?? "---",
          expected_end_treatment_by_protocol: family.expected_end_treatment_by_protocol ?? "---",
          has_completed_treatments: family.has_completed_treatments ?? false,
          details_for_tutoring: family.details_for_tutoring ?? "---",
          last_review_talk_conducted: family.last_review_talk_conducted ?? "---",
          status: family.status ?? "---",
          // Tutor fields
          tutor_full_name: `${tutorship.tutor_firstname ?? tutor.first_name ?? "---"} ${tutorship.tutor_lastname ?? tutor.last_name ?? "---"}`,
          tutor_id: tutor.id ?? "---",
          tutor_city: tutor.city ?? "---",
          tutor_age: tutor.age ?? "---",
          tutor_gender: tutor.gender ?? null,
          phone: tutor.phone ?? "---",
          email: tutor.email ?? "---",
          want_tutor: tutor.want_tutor ?? false,
          comment: tutor.comment ?? "---",
          tutorship_status: tutor.tutorship_status ?? "---",
        };
      });

      console.log('Enriched Tutorships:', enrichedTutorships); // Log the enriched tutorships for debugging
      console.log('Tutorships Raw:', tutorshipsRaw); // Log the raw tutorships for debugging

      setEnrichedTutorships(enrichedTutorships);
      setTutorships(tutorshipsRaw);
      setTotalCount(filteredTutorships.length); // Set the total count for pagination with filtered data
      // Do NOT overwrite families/tutors here if you want to keep CRUD-safe originals!
      // setFamilies(familiesData);
      // setTutors(tutorsWithDetails);
    } catch (error) {
      console.error('Error fetching full tutorships:', error);
      showErrorToast(t, 'Failed to fetch full tutorships.', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapError = () => {
    setMapError(true);
    setMapLoading(false);
  };

  const handleRowClick = (match) => {
    //console.log('Selected Match:', match);
    setSelectedMatch(match);

    // Check if the map instance is available
    if (
      mapRef.current &&
      match.child_latitude &&
      match.child_longitude &&
      match.tutor_latitude &&
      match.tutor_longitude
    ) {
      // Define the bounds to include both child and tutor locations
      const bounds = [
        [match.child_latitude, match.child_longitude], // Child's location
        [match.tutor_latitude, match.tutor_longitude], // Tutor's location
      ];

      // Fit the map to the bounds
      mapRef.current.fitBounds(bounds, { padding: [50, 50] }); // Add padding for better visibility
    }
  };

  const calculateAgeFromDate = (dateString) => {
    if (!dateString || typeof dateString !== "string") {
      return "---";
    }
    const [day, month, year] = dateString.split('/');
    if (!day || !month || !year) return "---";
    const birthDate = new Date(`${year}-${month}-${day}`);
    if (isNaN(birthDate)) return "---";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const createTutorship = () => {
    console.log('DEBUG: Creating tutorship with selected match:', selectedMatch); // Add debug log
    console.log('DEBUG: Current user role ID:', currentUserRoleId); // Add debug log
    if (!selectedMatch || !currentUserRoleId) return;

    axios
      .post('/api/create_tutorship/', {
        match: selectedMatch,
        staff_role_id: currentUserRoleId, // Use dynamically fetched role ID
      })
      .then(() => {
        toast.success(t('Tutorship created successfully!'));
        setSelectedMatch(null); // Clear the selected match after creation
        setSelectedMatchForInfo(null); // Clear the selected match for info
        setIsInfoModalOpen(false); // Close the info modal
        fetchMatches(); // Refresh the matches after creation
      })
      .catch((error) => {
        console.error('Error creating tutorship:', error);
        showErrorToast(t, 'Failed to create tutorship.', error);
      });
  };

  const fetchAvailableTutors = async () => {
    try {
      const response = await axios.get(`/api/get_available_tutors/?child_id=${manualMatchChildId}`);
      setAvailableTutors(response.data.tutors || []);
    } catch (error) {
      console.error('Error fetching available tutors:', error);
      showErrorToast(t, 'Failed to fetch available tutors', error);
    }
  };

  const calculateManualMatch = async () => {
    if (!manualMatchChildId || !selectedTutorForMatch) {
      toast.error(t('Please select a tutor'));
      return;
    }

    setIsCalculatingManualMatch(true);
    try {
      const response = await axios.post('/api/calculate_manual_match/', {
        child_id: manualMatchChildId,
        tutor_id: selectedTutorForMatch.tutor_id,
      });
      
      const matchData = response.data.match;
      setManualMatchResult(matchData);
      console.log('Manual match calculated:', matchData);
    } catch (error) {
      console.error('Error calculating manual match:', error);
      showErrorToast(t, 'Failed to calculate match', error);
    } finally {
      setIsCalculatingManualMatch(false);
    }
  };

  const confirmManualMatch = () => {
    if (!manualMatchResult || !currentUserRoleId) {
      toast.error(t('Unable to create tutorship'));
      return;
    }

    // Show confirmation dialog before creating
    setIsManualMatchConfirmationOpen(true);
  };

  const proceedWithManualMatch = () => {
    if (!manualMatchResult || !currentUserRoleId) {
      toast.error(t('Unable to create tutorship'));
      return;
    }

    setIsManualMatchConfirmationOpen(false);

    axios
      .post('/api/create_tutorship/', {
        match: manualMatchResult,
        staff_role_id: currentUserRoleId,
      })
      .then(() => {
        toast.success(t('Tutorship created successfully!'));
        setIsManualMatchModalOpen(false);
        setIsManualMatchMode(false);
        setManualMatchChildId(null);
        setManualMatchChildName(null);
        setSelectedTutorForMatch(null);
        setManualMatchResult(null);
        fetchFullTutorships();
      })
      .catch((error) => {
        console.error('Error creating tutorship:', error);
        showErrorToast(t, 'Failed to create tutorship', error);
      });
  };

  const closeManualMatchModal = () => {
    setIsManualMatchModalOpen(false);
    setIsManualMatchMode(false);
    setManualMatchChildId(null);
    setManualMatchChildName(null);
    setSelectedTutorForMatch(null);
    setManualMatchResult(null);
  };

  useEffect(() => {
      fetchFullTutorships();
  }, []);

  // Check if coming from manual match flow or city change
  useEffect(() => {
    if (location.state && location.state.manualMatchChildId) {
      console.log('DEBUG: Detected manual match navigation with child ID:', location.state.manualMatchChildId);
      setIsManualMatchMode(true);
      setManualMatchChildId(location.state.manualMatchChildId);
      setManualMatchChildName(location.state.childName || `Child ID: ${location.state.manualMatchChildId}`);
      
      // Fetch tutors and then open modal - pass child_id to the API
      axios.get(`/api/get_available_tutors/?child_id=${location.state.manualMatchChildId}`)
        .then((response) => {
          console.log('DEBUG: Available tutors fetched:', response.data.tutors);
          setAvailableTutors(response.data.tutors || []);
          // Open modal after fetching tutors
          setIsManualMatchModalOpen(true);
        })
        .catch((error) => {
          console.error('Error fetching available tutors:', error);
          showErrorToast(t, 'Failed to fetch available tutors', error);
          // Still open modal even if tutors fail to load
          setIsManualMatchModalOpen(true);
        });
      
      // Clear location state to prevent reactivation
      window.history.replaceState({}, document.title);
    }
    
    // Check if coming from city change in TutorVolunteerMgmt
    if (location.state && location.state.filterByName) {
      setTutorshipSearchQuery(location.state.filterByName);
    }
  }, [location, t]);

  // Helper: Fetch all families
  const fetchAllFamilies = async () => {
    const response = await axios.get('/api/get_complete_family_details/');
    return response.data.families || [];
  };

  // Helper: Fetch all signed-up users
  const fetchAllSignedUp = async () => {
    const response = await axios.get('/api/get_signedup/');
    return response.data.signedup_users || [];
  };

  // Helper: Fetch all tutors and merge with signed-up data
  const fetchAllTutorsWithDetails = async () => {
    const [tutorsResponse, signedUpData] = await Promise.all([
      getTutors(),
      fetchAllSignedUp()
    ]);
    const signedUpById = signedUpData.reduce((acc, signedUp) => {
      acc[signedUp.id] = signedUp;
      return acc;
    }, {});
    return tutorsResponse.map((tutor) => {
      const signedUpDetails = signedUpById[tutor.value] || {};
      return {
        ...tutor,
        id: tutor.value,
        tutorship_status: tutor.label?.split(' - ')[1] || '',
        phone: signedUpDetails.phone || '',
        email: signedUpDetails.email || '',
        want_tutor: signedUpDetails.want_tutor || false,
        comment: signedUpDetails.comment || '',
        city: signedUpDetails.city || '',
        age: signedUpDetails.age || '',
      };
    });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(event.target)
      ) {
        setShowStatusDropdown(false);
      }
      if (
        tutorshipActivationFilterRef.current &&
        !tutorshipActivationFilterRef.current.contains(event.target)
      ) {
        setShowTutorshipActivationDropdown(false);
      }
    }
    if (showStatusDropdown || showTutorshipActivationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusDropdown, showTutorshipActivationDropdown]);

  // Handle click-outside to close grade tooltip
  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowGradeTooltip(false);
      }
    }
    if (showGradeTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showGradeTooltip]);

  // Reset matches page when filters or search changes
  useEffect(() => {
    setMatchesPage(1);
  }, [matchSearchQuery, filterThreshold, sortOrder, statusFilter]);

  const handleBulkDelete = async () => {
    if (selectedTutorships.length === 0) {
      toast.warn(t('No tutorships selected for deletion.'));
      return;
    }
    const confirmed = window.confirm(t('Are you sure you want to delete the selected tutorships?'));
    if (!confirmed) return;

    try {
      await Promise.all(selectedTutorships.map(tutorshipId => 
        axios.delete(`/api/delete_tutorship/${tutorshipId}/`)
      ));
      toast.success(t('Selected tutorships deleted successfully!'));
      setTutorships(tutorships.filter(tutorship => !selectedTutorships.includes(tutorship.id)));
      setSelectedTutorships([]); // Clear selection after deletion
    } catch (error) {
      console.error('Error deleting tutorships:', error);
      showErrorToast(t, 'Error deleting tutorships', error);
    }
  };

  return (
    <div className="tutorships-main-content">
      <Sidebar />
      <InnerPageHeader title="ניהול חונכויות" />
      <div className="page-content">
        <div className="filter-create-container">
          <div className="create-task">
            <button onClick={openAddWizardModal} disabled={isGuestUser()}>
              {t('Open Matching Wizard')}
            </button>
          </div>
          
          {/* Tutorship Activation Status Filter - Dropdown Style */}
          <div className="tutorship-activation-filter-container" ref={tutorshipActivationFilterRef}>
            <button
              className="tutorship-activation-filter-button"
              onClick={() => setShowTutorshipActivationDropdown(!showTutorshipActivationDropdown)}
            >
              {t('Filter by Activation Status')}
            </button>
            {showTutorshipActivationDropdown && (
              <div className="tutorship-activation-filter-dropdown">
                <div className="tutorship-activation-filter-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tutorshipActivationFilters['pending_first_approval']}
                      onChange={(e) => setTutorshipActivationFilters({
                        ...tutorshipActivationFilters,
                        'pending_first_approval': e.target.checked
                      })}
                    />
                    {t('Pending Approval')}
                  </label>
                </div>
                <div className="tutorship-activation-filter-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tutorshipActivationFilters['active']}
                      onChange={(e) => setTutorshipActivationFilters({
                        ...tutorshipActivationFilters,
                        'active': e.target.checked
                      })}
                    />
                    {t('Active')}
                  </label>
                </div>
                <div className="tutorship-activation-filter-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={tutorshipActivationFilters['inactive']}
                      onChange={(e) => setTutorshipActivationFilters({
                        ...tutorshipActivationFilters,
                        'inactive': e.target.checked
                      })}
                    />
                    {t('Not Active')}
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <div className="refresh">
            <button onClick={fetchFullTutorships}>
              {t('Refresh Tutorships')}
            </button>
          </div>
          
          <div className="tutorship-search-container">
            <input
              type="text"
              className="tutorship-search-bar"
              placeholder={t('Search by tutor or tutee name')}
              value={tutorshipSearchQuery}
              onChange={e => setTutorshipSearchQuery(e.target.value)}
            />
          </div>
          
          {tutorshipSearchQuery && (
            <div className="filter-chip-container">
              <span className="filter-chip">
                {t('Filtering by')}: <strong>{tutorshipSearchQuery}</strong>
                <button 
                  className="filter-chip-close"
                  onClick={() => setTutorshipSearchQuery('')}
                  title={t('Clear filter')}
                >
                  ×
                </button>
              </span>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="loader">{t('Loading data...')}</div>
        ) : (
          <>
            {tutorships.length === 0 ? (
              <div className="no-data">{t('No tutorships to display')}</div>
            ) : (
              <table className="tutorship-matching-data-grid">
                <thead>
                  <tr>
                    {ENABLE_BULK_DELETE && <th>
                      <input
                        type="checkbox"
                        checked={selectedTutorships.length === tutorships.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTutorships(tutorships.map(t => t.id));
                          } else {
                            setSelectedTutorships([]);
                          }
                        }}
                      />
                    </th>}
                    <th>{t('Info')}</th>
                    <th>{t('Child Name')}</th>
                    <th>{t('Tutor Name')}</th>
                    <th>
                      {t('Tutorship create date')}
                      <button
                        className="sort-button"
                        onClick={toggleSortOrder} // Toggle the sort order
                      >
                        {sortOrder === 'asc' ? '▲' : '▼'} {/* Show the sort direction */}
                      </button>
                    </th>
                    <th>{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTutorships.map((tutorship, index) => (
                    <tr 
                      key={tutorship.id}
                      className={tutorship.tutorship_activation === 'inactive' ? 'inactive-tutorship-row' : ''}
                    >
                      {ENABLE_BULK_DELETE && <td>
                        <input
                          type="checkbox"
                          checked={selectedTutorships.includes(tutorship.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTutorships([...selectedTutorships, tutorship.id]);
                            } else {
                              setSelectedTutorships(selectedTutorships.filter(id => id !== tutorship.id));
                            }
                          }}
                        />
                      </td>}
                      <td>
                        <div className="info-icon-container" onClick={() => openInfoModal(tutorship)}>
                          <i className="info-icon" title={t('Press to see full info')}>i</i>
                        </div>
                      </td>
                      <td>{`${tutorship.child_firstname} ${tutorship.child_lastname}`}</td>
                      <td>{`${tutorship.tutor_firstname} ${tutorship.tutor_lastname}`}</td>
                      <td
                        className={editingDateId === tutorship.id ? 'editing-date-cell' : 'editable-date-cell'}
                        onClick={(e) => {
                          // Prevent click handler if already in edit mode or click is on the input
                          if (editingDateId !== tutorship.id && hasUpdatePermission) {
                            handleDateClick(tutorship);
                          }
                        }}
                        style={{ cursor: hasUpdatePermission && editingDateId !== tutorship.id ? 'pointer' : editingDateId === tutorship.id ? 'text' : 'default' }}
                      >
                        {editingDateId === tutorship.id ? (
                          <input
                            ref={dateInputRef}
                            type="text"
                            value={editingDateValue}
                            onChange={(e) => setEditingDateValue(e.target.value)}
                            onKeyDown={(e) => handleDateKeyPress(e, tutorship.id)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="DD/MM/YYYY"
                            autoFocus
                            className="date-input"
                          />
                        ) : (
                          tutorship.created_date
                        )}
                      </td>
                      <td>
                        <div className="tutorship-actions">
                          <button
                            className="approve-button"
                            disabled={tutorship.approval_counter >= 2 || !CoordinatorOrAdmin || !hasUpdatePermission}
                            onClick={() => openApprovalModal(tutorship)}
                          >
                            {t('Final Approval')}
                          </button>
                          <button
                            className="delete-button"
                            hidden={!hasDeletePermission}
                            onClick={() => openTutorshipDeleteModal(tutorship.id)}
                          >
                            {t('Delete')}
                          </button>
                        </div>
                        {tutorship.approval_counter >= 2 ? (
                          <span className="approval-span">
                            {t('Approved by Families and Tutors coordinators')}
                          </span>
                        ) : (
                          <span className="approval-span">
                            {t('Pending approval of', { roleName: t(determinePendingCoordinator(tutorship, roles)) })}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && (
              <div className="pagination">
                {/* Left Arrows */}
                <button
                  onClick={() => setPage(1)} // Go to the first page
                  disabled={page === 1}
                  className="pagination-arrow"
                >
                  &laquo; {/* Double left arrow */}
                </button>
                <button
                  onClick={() => setPage(page - 1)} // Go to the previous page
                  disabled={page === 1}
                  className="pagination-arrow"
                >
                  &lsaquo; {/* Single left arrow */}
                </button>

                {/* Page Numbers */}
                {displayTotalCount <= pageSize ? (
                  <button className="active">1</button> // Display only "1" if there's only one page
                ) : (
                  Array.from({ length: Math.ceil(displayTotalCount / pageSize) }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={page === i + 1 ? 'active' : ''}
                    >
                      {i + 1}
                    </button>
                  ))
                )}

                {/* Right Arrows */}
                <button
                  onClick={() => setPage(page + 1)} // Go to the next page
                  disabled={page === Math.ceil(displayTotalCount / pageSize) || displayTotalCount <= 1}
                  className="pagination-arrow"
                >
                  &rsaquo; {/* Single right arrow */}
                </button>
                <button
                  onClick={() => setPage(Math.ceil(displayTotalCount / pageSize))} // Go to the last page
                  disabled={page === Math.ceil(displayTotalCount / pageSize) || displayTotalCount <= 1}
                  className="pagination-arrow"
                >
                  &raquo; {/* Double right arrow */}
                </button>
              </div>
            )}
            {ENABLE_BULK_DELETE && (
              <div className="bulk-delete-container">
                <button
                  className="bulk-delete-button"
                  onClick={handleBulkDelete}
                  disabled={selectedTutorships.length === 0 || isGuestUser()}
                >
                  {t('Delete Selected Tutorships')}
                </button>
              </div>
            )}
          </>
        )}
        {isApprovalModalOpen && selectedTutorship && (
          <Modal
            isOpen={isApprovalModalOpen}
            onRequestClose={closeApprovalModal}
            className="approval-modal"
            overlayClassName="approval-modal-overlay"
          >
            <h2>{t('Are you sure you want to approve this tutorship?')}</h2>
            <p>
              <p>
                {t('Discuss with a coordinator', { roleName: t(determinePendingCoordinator(selectedTutorship, roles)) })}
              </p>
            </p>
            <div className="modal-actions">
              <button onClick={confirmApproval} className="yes-button">
                {t('Approve')}
              </button>
              <button onClick={closeApprovalModal} className="no-button">
                {t('Cancel')}
              </button>
            </div>
          </Modal>
        )}
        {isInfoModalOpen && selectedMatchForInfo && (
          <div className="modal show">
            <div className="info-modal-content">
              {/* <button className="magnify-button" onClick={toggleMagnify}>
                🔍 {isMagnifyActive ? t('Disable Magnify') : t('Enable Magnify')}
              </button> */}
              {/* <div className={`info-columns ${isMagnifyActive ? 'magnify-active' : ''}`}> */}
              <div className="info-columns">
                {/* Child Info */}
                <div className="info-column">
                  <h2>{t('Child Information')}</h2>
                  <div className="info-table-scroll">
                    <table className="info-table">
                      <tbody>
                        <tr>
                          <td>{t('ID')}</td>
                          <td>{selectedMatchForInfo.child_id}</td>
                        </tr>
                        <tr>
                          <td>{t('Full Name')}</td>
                          <td>{selectedMatchForInfo.child_full_name}</td>
                        </tr>
                        <tr>
                          <td>{t('Address')}</td>
                          <td> {selectedMatchForInfo.address}</td>
                        </tr>
                        <tr>
                          <td>{t('Phone')}</td><td> {selectedMatchForInfo.child_phone_number}
                          </td>
                        </tr>
                        <tr>
                          <td>{t('Age')}</td>
                          <td> {calculateAgeFromDate(selectedMatchForInfo.date_of_birth)}</td>
                        </tr>
                        <tr><td>{t('Gender')}</td><td> {selectedMatchForInfo.gender ? t('Female') : t('Male')}</td></tr>
                        <tr><td>{t('Medical Diagnosis')}</td><td> {selectedMatchForInfo.medical_diagnosis}</td></tr>
                        <tr><td>{t('Diagnosis Date')}</td><td> {selectedMatchForInfo.diagnosis_date}</td></tr>
                        <tr><td>{t('Marital Status')}</td><td> {selectedMatchForInfo.marital_status}</td></tr>
                        <tr><td>{t('Number of Siblings')}</td><td> {selectedMatchForInfo.num_of_siblings}</td></tr>
                        <tr><td>{t('Tutoring Status')}</td><td> {selectedMatchForInfo.tutoring_status}</td></tr>
                        <tr><td>{t('Responsible Coordinator')}</td><td> {selectedMatchForInfo.responsible_coordinator}</td></tr>
                        <tr><td>{t('Need Review')}</td><td> {selectedMatchForInfo.need_review ? t('Yes') : t('No')}</td></tr>
                        <tr><td>{t('Additional Info')}</td><td> {selectedMatchForInfo.additional_info}</td></tr>
                        <tr><td>{t('Is In Frame')}</td><td> {selectedMatchForInfo.is_in_frame || '---'}</td></tr>
                        <tr><td>{t('Coordinator Comments')}</td><td> {selectedMatchForInfo.coordinator_comments || '---'}</td></tr>
                        <tr><td>{t('Current Medical State')}</td><td> {selectedMatchForInfo.current_medical_state}</td></tr>
                        <tr><td>{t('Treating Hospital')}</td><td> {selectedMatchForInfo.treating_hospital}</td></tr>
                        <tr><td>{t('When Completed Treatments')}</td><td> {selectedMatchForInfo.when_completed_treatments}</td></tr>
                        <tr><td>{t('Father Name')}</td><td> {selectedMatchForInfo.father_name || '---'}</td></tr>
                        <tr><td>{t('Father Phone')}</td><td> {selectedMatchForInfo.father_phone || '---'}</td></tr>
                        <tr><td>{t('Mother Name')}</td><td> {selectedMatchForInfo.mother_name || '---'}</td></tr>
                        <tr><td>{t('Mother Phone')}</td><td> {selectedMatchForInfo.mother_phone || '---'}</td></tr>
                        <tr><td>{t('Expected End Treatment by Protocol')}</td><td> {selectedMatchForInfo.expected_end_treatment_by_protocol || '---'}</td></tr>
                        <tr><td>{t('Has Completed Treatments')}</td><td> {selectedMatchForInfo.has_completed_treatments ? t('Yes') : t('No')}</td></tr>
                        <tr><td>{t('Details for Tutoring')}</td><td> {selectedMatchForInfo.details_for_tutoring || '---'}</td></tr>
                        <tr><td>{t('Last Review Talk Conducted')}</td><td> {selectedMatchForInfo.last_review_talk_conducted || '---'}</td></tr>
                        <tr><td>{t('Status')}</td><td> {selectedMatchForInfo.status}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tutor Info */}
                <div className="info-column">
                  <h2>{t('Tutor Information')}</h2>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td>{t('ID')}</td>
                        <td> {selectedMatchForInfo.tutor_id}</td>
                      </tr>
                      <tr>
                        <td>{t('Full Name')}</td>
                        <td> {selectedMatchForInfo.tutor_full_name}</td>
                      </tr>
                      <tr>
                        <td>{t('City')}</td>
                        <td> {selectedMatchForInfo.tutor_city}</td>
                      </tr>
                      <tr>
                        <td>{t('Age')}</td>
                        <td> {selectedMatchForInfo.tutor_age}</td>
                      </tr>
                      <tr>
                        <td>{t('Gender')}</td>
                        <td> {selectedMatchForInfo.tutor_gender ? t('Female') : t('Male')}</td>
                      </tr>
                      <tr>
                        <td>{t('Phone')}</td>
                        <td> {selectedMatchForInfo.phone}</td>
                      </tr>
                      <tr>
                        <td>{t('Email')}</td>
                        <td> {selectedMatchForInfo.email}</td>
                      </tr>
                      <tr>
                        <td>{t('Want to Tutor')}</td>
                        <td> {selectedMatchForInfo.want_tutor ? t('Yes') : t('No')}</td>
                      </tr>
                      <tr>
                        <td>{t('Comment')}</td>
                        <td> {selectedMatchForInfo.comment}</td>
                      </tr>
                      <tr>
                        <td>{t('Tutorship status')}</td>
                        <td> {selectedMatchForInfo.tutorship_status}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="modal-actions">
                    {isModalOpen && hasCreatePermission && (
                      <button className="create-tutorship-button" onClick={createTutorship} disabled={isGuestUser()}>
                        {t('Create Tutorship')}
                      </button>
                    )}
                    <button className="close-info-button" onClick={closeInfoModal}>
                      {t('Close')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <Modal
          isOpen={isTutorshipDeleteModalOpen}
          onRequestClose={closeTutorshipDeleteModal}
          contentLabel="Delete Confirmation"
          className="delete-modal"
          overlayClassName="delete-modal-overlay"
        >
          <h2>{t('Are you sure you want to delete this tutorship?')}</h2>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            {t('Deleting a tutorship will remove all associated data')}
            <br />
            {t('This action cannot be undone')}
          </p>
          <div className="modal-actions">
            <button onClick={confirmDeleteTutorship} className="yes-button">
              {t('Yes')}
            </button>
            <button onClick={closeTutorshipDeleteModal} className="no-button">
              {t('No')}
            </button>
          </div>
        </Modal>
        <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} className="matches-modal">
          <div className="matches-modal-header">
            <h2>{t('Matching Wizard')}</h2>
            <button className="matches-close" onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
          </div>
          <div className="filter-controls">
            <input
              type="text"
              className="matches-search-bar"
              placeholder={t('Search by tutor or tutee name')}
              value={matchSearchQuery}
              onChange={e => setMatchSearchQuery(e.target.value)}
              style={{ marginLeft: 16, minWidth: 220 }}
            />
            <label htmlFor="filter-slider">{t('Filter by Minimum Grade')}:</label>
            <ReactSlider
              id="filter-slider"
              className="custom-slider"
              thumbClassName="custom-slider-threshold-thumb"
              trackClassName="custom-slider-track"
              min={0}
              max={100}
              value={filterThreshold}
              onChange={setFilterThreshold}
              renderThumb={(props, state) => (
                <div {...props}>{state.valueNow}</div>
              )}
            />
            <div className="status-filter-container" ref={statusFilterRef}>
              <label className="status-filter-label">
                {statusFilter
                  ? t(statusFilter.replace(/_/g, ' '))
                  : t('Filter by Urgency')}
              </label>
              <span
                className="funnel-icon"
                tabIndex={0}
                onClick={() => setShowStatusDropdown(v => !v)}
              >
                <svg className="funnel-icon-svg" viewBox="0 0 24 24" fill="none">
                  <path d="M3 5h18l-7 9v5l-4 2v-7l-7-9z" fill="#555" />
                </svg>
              </span>
              {showStatusDropdown && (
                <div className="status-filter-dropdown">
                  <div
                    className={`status-filter-option${statusFilter === '' ? ' selected' : ''}`}
                    onClick={() => {
                      setStatusFilter('');
                      setShowStatusDropdown(false);
                    }}
                    style={{ backgroundColor: '#fff' }}
                  >
                    {t('All Urgencies')}
                  </div>
                  {Object.entries(TUTORING_STATUS_ROW_COLORS).map(([status, color]) => (
                    <div
                      key={status}
                      className={`status-filter-option${statusFilter === status ? ' selected' : ''}`}
                      onClick={() => {
                        setStatusFilter(status);
                        setShowStatusDropdown(false);
                      }}
                      style={{
                        backgroundColor: color,
                        color: status === "למצוא_חונך_בעדיפות_גבוה" ? "#fff" : "#000",
                        fontWeight: status === "למצוא_חונך_בעדיפות_גבוה" ? "bold" : "normal"
                      }}
                    >
                      {t(status.replace(/_/g, ' '))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {showPendingDistancesWarning && (
              <div className="pending-distances-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HourglassSpinner />
                <span>{t("Some distances between cities are still being calculated. Please refresh in a few seconds.")}</span>
                {/* {distancesReady && ( */}
                <button onClick={handleRefreshMatches} className="refresh-now-btn visible">
                  {t("Refresh Now")}
                </button>
                {/* )} */}
              </div>
            )}
          </div>
          <div
            className={
              showPendingDistancesWarning
                ? "match-modal-content short-match-modal-content"
                : "match-modal-content"
            }
          >
            <div className="grid-container">
              {gridLoading ? (
                <div className="grid-loader">{t("Loading data...")}</div>
              ) : (
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th>{t('Info')}</th>
                      <th>{t('Child Name')}</th>
                      <th>{t('Tutor Name')}</th>
                      <th>{t('Child City')}</th>
                      <th>{t('Tutor City')}</th>
                      <th>
                        {t('Matching')} <br /> {t('Grades')}
                        <button
                          className="sort-button"
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                        <span className="grade-tooltip-container" ref={tooltipRef}>
                          <button 
                            className="grade-tooltip-icon" 
                            onClick={() => setShowGradeTooltip(!showGradeTooltip)}
                            type="button"
                            aria-label="Grade explanation"
                          >
                            ?
                          </button>
                        </span>
                        {showGradeTooltip && ReactDOM.createPortal(
                          <span className="grade-tooltip-text visible">
                            {t(`Each tutor-child match receives a grade based on:`)}<br /><br />
                            <b><u>{t('Base Score')}</u>:</b> {t('Starts from 0 to 100 depending on the match\'s position in the list.')}<br />
                            <b>{t('with a base grade spreading linearly across matches')}.</b><br /><br />
                            <b>{t('Then, the grade is adjusted based on:')}</b><br />
                            <b><u>{t('Age Difference Bonus')}</u>:</b><br />
                            {t('Less than 5 years')} ← 20+ {t('points')}<br />
                            5–10 {t('years')} ← 10+ {t('points')}<br />
                            10–15 {t('years')} ← 5+ {t('points')}<br /><br />
                            <b><u>{t('Distance Bonus (based on how close they live)')}</u>:</b><br />
                            {t('Less than 10 km')} ← 20+ {t('points')}<br />
                            10–20 {t('km')} ← 10+ {t('points')}<br />
                            20–30 {t('km')} ← 5+ {t('points')}<br /><br />
                            <b><u>{t('Distance Penalty')}</u>:</b><br />
                            {t('More than 50 km')} → {t('Grade set to')} 5-<br /><br />
                            <b><u>{t('Final Grade')}</u>:</b><br />
                            {t('Rounded up to the nearest whole number')}<br />
                            {t('Always kept between -5 and 100')}
                          </span>,
                          document.body
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMatches.map((match, index) => (
                      <tr
                        key={`${match.child_id}-${match.tutor_id}-${index}`}
                        onClick={() => handleRowClick(match)}
                        className={
                          (selectedMatch === match ? 'selected-row ' : '') +
                          (match.tutoring_status === "למצוא_חונך_בעדיפות_גבוה" ? "urgent-row" : "")
                        }
                        style={{
                          backgroundColor: selectedMatch === match
                            ? '#add8e6'
                            : getTutoringStatusRowColor(match.tutoring_status),
                          color: selectedMatch === match ? '#111' : undefined
                        }}
                      >
                        <td>
                          <div className="info-icon-container" onClick={() => openInfoModal(match)}>
                            <i className="info-icon" title={t('Press to see full info')}>i</i>
                          </div>
                        </td>
                        <td>{match.child_full_name}</td>
                        <td>{match.tutor_full_name}</td>
                        <td>{match.child_city}</td>
                        <td>{match.tutor_city}</td>
                        <td>{match.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
                {/* Pagination controls for matches */}
                {!gridLoading && totalMatchPages > 1 && (
                  <div className="pagination" style={{ marginTop: '20px' }}>
                    <button 
                      onClick={() => setMatchesPage(1)} 
                      disabled={matchesPage === 1} 
                      className="pagination-arrow"
                    >
                      &laquo;
                    </button>
                    <button 
                      onClick={() => setMatchesPage(matchesPage - 1)} 
                      disabled={matchesPage === 1} 
                      className="pagination-arrow"
                    >
                      &lsaquo;
                    </button>
                    {getVisibleMatchPageNumbers().map(pageNum => (
                      <button
                        key={pageNum}
                        className={matchesPage === pageNum ? "active" : ""}
                        onClick={() => setMatchesPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button 
                      onClick={() => setMatchesPage(matchesPage + 1)} 
                      disabled={matchesPage === totalMatchPages} 
                      className="pagination-arrow"
                    >
                      &rsaquo;
                    </button>
                    <button 
                      onClick={() => setMatchesPage(totalMatchPages)} 
                      disabled={matchesPage === totalMatchPages} 
                      className="pagination-arrow"
                    >
                      &raquo;
                    </button>
                  </div>
                )}
            </div>
            <div className="map-match-container">
              {mapError ? (
                <div className="map-error">{t('Failed to load the map.')}</div>
              ) : mapLoading ? (
                <div className="map-match-loader">{t('Loading map...')}</div>
              ) : (
                <MapContainer
                  center={[31.5, 35.0]}
                  zoom={8}
                  style={{ height: '100%', width: '100%' }}
                  whenCreated={(mapInstance) => {
                    mapRef.current = mapInstance;
                  }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    onError={handleMapError}
                  />
                  {selectedMatch && (
                    <>
                      {/* Child Marker */}
                      {selectedMatch.child_latitude && selectedMatch.child_longitude && (
                        <Marker
                          position={[selectedMatch.child_latitude, selectedMatch.child_longitude]}
                          icon={getColoredMarkerIcon(selectedMatch.grade)}
                        >
                          <Popup>{`${selectedMatch.child_full_name} - ${selectedMatch.child_city}`}</Popup>
                        </Marker>
                      )}

                      {/* Tutor Marker */}
                      {selectedMatch.tutor_latitude && selectedMatch.tutor_longitude && (
                        <Marker
                          position={[selectedMatch.tutor_latitude, selectedMatch.tutor_longitude]}
                          icon={getColoredMarkerIcon(selectedMatch.grade)}
                        >
                          <Popup>{`${selectedMatch.tutor_full_name} - ${selectedMatch.tutor_city}`}</Popup>
                        </Marker>
                      )}

                      {/* Dashed Line and Distance */}
                      {selectedMatch.child_latitude &&
                        selectedMatch.child_longitude &&
                        selectedMatch.tutor_latitude &&
                        selectedMatch.tutor_longitude && (
                          <>
                            {/* Dashed Line */}
                            <Polyline
                              positions={[
                                [selectedMatch.child_latitude, selectedMatch.child_longitude],
                                [selectedMatch.tutor_latitude, selectedMatch.tutor_longitude],
                              ]}
                              pathOptions={{ color: 'blue', dashArray: '5, 10' }} // Dashed line
                            />

                            {/* Distance Popup */}
                            <Popup
                              position={[
                                (selectedMatch.child_latitude + selectedMatch.tutor_latitude) / 2,
                                (selectedMatch.child_longitude + selectedMatch.tutor_longitude) / 2,
                              ]}
                            >
                              {`${selectedMatch.distance_between_cities} ק"מ`}
                            </Popup>
                          </>
                        )}
                    </>
                  )}
                </MapContainer>
              )}
              <div className="map-legend">
                <span>
                  <span className="legend-dot legend-dot-green"></span>
                  {t('Grade above 50 ')}
                </span>
                <span>
                  <span className="legend-dot legend-dot-yellow"></span>
                  {t('Grade between 25 and 50 ')}
                </span>
                <span>
                  <span className="legend-dot legend-dot-red"></span>
                  {t('Grade below 25 ')}
                </span>
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="calc-match-button" onClick={fetchMatches}>{t('Calculate Matches')}</button>
            {hasCreatePermission && (
              <button className="create-tutorship-button" onClick={createTutorship} disabled={!selectedMatch || isGuestUser()}>
                {t('Create Tutorship')}
              </button>
            )}
          </div>
        </Modal>

        {/* Manual Match Modal */}
        <Modal
          isOpen={isManualMatchModalOpen}
          onRequestClose={closeManualMatchModal}
          className="modal-content"
          overlayClassName="modal-overlay"
        >
          <div className="modal-header">
            <h2>{t('Create Manual Tutorship Match')}</h2>
            <button className="close-button" onClick={closeManualMatchModal}>✕</button>
          </div>

          {!manualMatchResult ? (
            // Step 1: Select tutor
            <div className="modal-body">
              <div className="manual-match-info">
                <p>{manualMatchChildName}</p>
              </div>

              <div className="tutor-selection">
                <label htmlFor="tutor-select">{t('Select Tutor')}:</label>
                <select
                  id="tutor-select"
                  value={selectedTutorForMatch ? selectedTutorForMatch.tutor_id : ''}
                  onChange={(e) => {
                    const tutorId = parseInt(e.target.value);
                    const tutor = availableTutors.find(t => t.tutor_id === tutorId);
                    setSelectedTutorForMatch(tutor);
                  }}
                  className="tutor-dropdown"
                >
                  <option value="">{t('Choose a tutor...')}</option>
                  {availableTutors.map((tutor) => (
                    <option key={tutor.tutor_id} value={tutor.tutor_id}>
                      {tutor.tutor_full_name}, {tutor.tutor_city}, {t('age')} {tutor.tutor_age}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTutorForMatch && (
                <div className="selected-tutor-info">
                  <h4>{t('Selected Tutor')}:</h4>
                  <p>{selectedTutorForMatch.tutor_full_name}, {selectedTutorForMatch.tutor_city}, {t('age')} {selectedTutorForMatch.tutor_age}</p>
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="calc-match-button"
                  onClick={calculateManualMatch}
                  disabled={!selectedTutorForMatch || isCalculatingManualMatch}
                >
                  {isCalculatingManualMatch ? t('Calculating...') : t('Calculate Match')}
                </button>
                <button className="cancel-button" onClick={closeManualMatchModal}>
                  {t('Cancel')}
                </button>
              </div>
            </div>
          ) : (
            // Step 2: Review match and create tutorship
            <div className="modal-body">
              <div className="match-preview">
                <h4>{t('Match Preview')}:</h4>
                <table className="match-details-table">
                  <tbody>
                    <tr>
                      <td><strong>{t('Child')}:</strong></td>
                      <td>{manualMatchResult.child_full_name}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('Tutor')}:</strong></td>
                      <td>{manualMatchResult.tutor_full_name}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('Grade')}:</strong></td>
                      <td>{manualMatchResult.grade}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('Distance')}:</strong></td>
                      <td>{manualMatchResult.distance_between_cities} {t('km')}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('Child City')}:</strong></td>
                      <td>{manualMatchResult.child_city}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('Tutor City')}:</strong></td>
                      <td>{manualMatchResult.tutor_city}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('Child Age')}:</strong></td>
                      <td>{manualMatchResult.child_age}</td>
                    </tr>
                    <tr>
                      <td><strong>{t('Tutor Age')}:</strong></td>
                      <td>{manualMatchResult.tutor_age}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button
                  className="create-tutorship-button"
                  onClick={confirmManualMatch}
                  disabled={!currentUserRoleId}
                >
                  {t('Create Tutorship')}
                </button>
                <button
                  className="calc-match-button"
                  onClick={() => setManualMatchResult(null)}
                >
                  {t('Back')}
                </button>
                <button className="cancel-button" onClick={closeManualMatchModal}>
                  {t('Cancel')}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Manual Match Confirmation Modal */}
        <Modal
          isOpen={isManualMatchConfirmationOpen}
          onRequestClose={() => setIsManualMatchConfirmationOpen(false)}
          className="modal-content"
          overlayClassName="modal-overlay"
          style={{
            content: {
              width: '85%',
              maxWidth: '600px',
              height: 'auto',
              margin: 'auto',
            }
          }}
        >
          <div className="modal-header">
            <h2>{t('Confirm Manual Match')}</h2>
            <button className="close-button" onClick={() => setIsManualMatchConfirmationOpen(false)}>✕</button>
          </div>

          <div className="modal-body" style={{ textAlign: 'center', padding: '30px' }}>
            <p style={{ fontSize: '24px', marginBottom: '20px', lineHeight: '1.6' }}>
              {t('Creating this tutorship will remove any pending tutorship this tutor has with another child. Do you want to proceed?')}
            </p>
            
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '15px' }}>
              <button
                className="create-tutorship-button"
                onClick={proceedWithManualMatch}
              >
                {t('Yes, Create Tutorship')}
              </button>
              <button
                className="cancel-button"
                onClick={() => setIsManualMatchConfirmationOpen(false)}
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};
export default Tutorships;