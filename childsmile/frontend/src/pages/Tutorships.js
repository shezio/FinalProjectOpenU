import React, { useEffect, useRef, useState } from 'react';
import ReactSlider from 'react-slider';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/tutorships.css';
import axios from '../axiosConfig';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasAllPermissions, getTutors } from '../components/utils';
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

const HourglassSpinner = () => {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(r => (r + 180) % 360);
    }, 300); // 300ms for visible effect
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
  const [isMagnifyActive, setIsMagnifyActive] = useState(false);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [enrichedTutorships, setEnrichedTutorships] = useState([]);
  const [wizardFamilies, setWizardFamilies] = useState([]);
  const [wizardTutors, setWizardTutors] = useState([]);

  const toggleMagnify = () => {
    setIsMagnifyActive((prevState) => !prevState);
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
    } catch (error) {
      console.error('Error fetching staff or roles:', error);
      showErrorToast(t, 'Failed to fetch staff or roles.', error);
    }
  };

  const determinePendingCoordinator = (tutorship, rolesData) => {
    // Extract the IDs of the roles that have already approved
    const approvedRoleIds = tutorship.last_approver || [];

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

  const hasPermissionOnTutorships = hasAllPermissions(requiredPermissions);

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
    }
  };

  const sortedAndFilteredMatches = matches
    .filter((match) => match.grade >= filterThreshold)
    .filter((match) => {
      if (!matchSearchQuery.trim()) return true;
      const query = matchSearchQuery.toLowerCase();
      return (
        (match.child_full_name && match.child_full_name.toLowerCase().includes(query)) ||
        (match.tutor_full_name && match.tutor_full_name.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.grade - b.grade;
      } else {
        return b.grade - a.grade;
      }
    });

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

  // Sort the tutorships by created_date
  const sortedTutorships = [...enrichedTutorships].sort((a, b) => {
    const dateA = parseDate(a.created_date); // Parse the date
    const dateB = parseDate(b.created_date); // Parse the date
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA; // Ascending or descending order
  });

  // Paginate the sorted tutorships
  const paginatedTutorships = sortedTutorships.slice((page - 1) * pageSize, page * pageSize);

  // Function to toggle the sorting order
  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };

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
        additional_info: row.additional_info ?? "---",
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
        tutor_city: row.tutor_city ?? "---",
        tutor_age: row.tutor_age ?? "---",
        tutor_gender: row.tutor_gender ?? null,
        phone: row.tutor_phone ?? row.phone ?? "---",
        email: row.tutor_email ?? row.email ?? "---",
        want_tutor: row.want_tutor ?? false,
        comment: row.comment ?? "---",
        tutorship_status: row.tutorship_status ?? "---",
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
          ...tutorship,
          ...family,
          ...tutor,
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

      setEnrichedTutorships(enrichedTutorships);
      setTutorships(tutorshipsRaw);
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

  useEffect(() => {
    if (hasPermissionOnTutorships) {
      fetchFullTutorships();
    } else {
      setLoading(false);
    }
  }, []);

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

  if (!hasPermissionOnTutorships) {
    return (
      <div className="tutorships-main-content">
        <Sidebar />
        <InnerPageHeader title="ניהול חונכויות" />
        <div className="page-content">
          <div className="no-permission">
            <h2>אין לך הרשאה לצפות בדף זה</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorships-main-content">
      <Sidebar />
      <InnerPageHeader title="ניהול חונכויות" />
      <div className="page-content">
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
        <div className="filter-create-container">
          <div className="create-task">
            <button onClick={openAddWizardModal}>
              {t('Open Matching Wizard')}
            </button>
          </div>
          <div className="refresh">
            <button onClick={fetchFullTutorships}>
              {t('Refresh Tutorships')}
            </button>
          </div>
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
                    <tr key={tutorship.id}>
                      <td>
                        <div className="info-icon-container" onClick={() => openInfoModal(tutorship)}>
                          <i className="info-icon" title={t('Press to see full info')}>i</i>
                        </div>
                      </td>
                      <td>{`${tutorship.child_firstname} ${tutorship.child_lastname}`}</td>
                      <td>{`${tutorship.tutor_firstname} ${tutorship.tutor_lastname}`}</td>
                      <td>{tutorship.created_date}</td>
                      <td>
                        <div className="tutorship-actions">
                          <button
                            className="approve-button"
                            disabled={tutorship.approval_counter >= 2}
                            onClick={() => openApprovalModal(tutorship)}
                          >
                            {t('Final Approval')}
                          </button>
                          <button
                            className="delete-button"
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
              {totalCount <= pageSize ? (
                <button className="active">1</button> // Display only "1" if there's only one page
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

              {/* Right Arrows */}
              <button
                onClick={() => setPage(page + 1)} // Go to the next page
                disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= 1}
                className="pagination-arrow"
              >
                &rsaquo; {/* Single right arrow */}
              </button>
              <button
                onClick={() => setPage(Math.ceil(totalCount / pageSize))} // Go to the last page
                disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= 1}
                className="pagination-arrow"
              >
                &raquo; {/* Double right arrow */}
              </button>
            </div>
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
                        <tr><td>{t('Additional Info')}</td><td> {selectedMatchForInfo.additional_info}</td></tr>
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
                    <button className="create-tutorship-button" onClick={createTutorship}>
                      {t('Create Tutorship')}
                    </button>
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
            <button className="close" onClick={() => setIsModalOpen(false)}>
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
              thumbClassName="custom-slider-thumb"
              trackClassName="custom-slider-track"
              min={0}
              max={100}
              value={filterThreshold}
              onChange={(value) => setFilterThreshold(value)}
            />
            <span className="filter-value">{filterThreshold}</span>
            {matches.some(m => m.distance_pending) && (
              <div className="pending-distances-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HourglassSpinner />
                <span>חלק מהמרחקים בין ערים עדיין מחושבים. נא לרענן בעוד מספר שניות.</span>
                <button onClick={fetchMatches} style={{ marginRight: 8 }}>
                  רענן עכשיו
                </button>
              </div>
            )}
          </div>
          <div className="match-modal-content">
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
                        <span className="grade-tooltip-container">
                          <span className="grade-tooltip-icon">?</span>
                          <span className="grade-tooltip-text">
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
                          </span>
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredMatches.map((match, index) => (
                      <tr
                        key={`${match.child_id}-${match.tutor_id}-${index}`} // Ensure the key is unique by appending the index

                        onClick={() => handleRowClick(match)}
                        className={selectedMatch === match ? 'selected' : ''}
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
                        {/* Add this cell for distance */}
                        {/* <td>
                          {match.distance_pending
                            ? <span className="pending-distance">⏳</span>
                            : `${match.distance_between_cities} ק"מ`}
                        </td> */}
                        <td>{match.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <button className="create-tutorship-button" onClick={createTutorship} disabled={!selectedMatch}>
              {t('Create Tutorship')}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};
export default Tutorships;