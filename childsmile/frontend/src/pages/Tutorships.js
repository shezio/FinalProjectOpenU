import React, { use, useEffect, useState } from 'react';
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
import { useRef } from 'react';
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
  const [placeholderRoleName, setPlaceholderRoleName] = useState('');
  const [currentRoleName, setCurrentRoleName] = useState('');
  const [page, setPage] = useState(1); // Current page
  const [pageSize] = useState(5); // Number of tutorships per page
  const [totalCount, setTotalCount] = useState(0); // Total number of tutorships

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

        // Determine the placeholder role name
        const placeholderRole = rolesData.find(
          (role) =>
            !userRoleIds.includes(role.id) && // Exclude the current user's roles
            (role.role_name === 'Tutors Coordinator' || role.role_name === 'Families Coordinator')
        );
        if (placeholderRole) {
          setPlaceholderRoleName(placeholderRole.role_name); // Set the placeholder role name
          console.log('DEBUG: Placeholder Role Name:', placeholderRole.role_name); // Add debug log
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

  const translatedRoleName = t(placeholderRoleName); // Translate the role name
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
      fetchTutorships(); // Refresh the tutorships list
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
    .filter((match) => match.grade >= filterThreshold) // Filter matches based on the threshold
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.grade - b.grade; // Ascending order
      } else {
        return b.grade - a.grade; // Descending order
      }
    });

  const fetchTutorships = () => {
    setLoading(true);
    axios
      .get('/api/get_tutorships/', {
        params: {
          page: page, // Current page
          page_size: pageSize, // Page size
        },
      })
      .then((response) => {
        setTutorships(response.data.tutorships || []);
        setTotalCount(response.data.total_count || 0); // Set the total number of tutorships
        fetchStaffAndRoles(); // Fetch staff and roles data
      })
      .catch((error) => {
        console.error('Error fetching tutorships:', error);
        showErrorToast(t, 'Failed to fetch tutorships.', error); // Use the toast utility for error handling
      })
      .finally(() => {
        setLoading(false);
      });
  };


  const openInfoModal = (match) => {

    // Find the family and tutor data for the selected match
    const family = families.find((f) => f.id === match.child_id) || {}; // Match by child_id
    const tutor = tutors.find((t) => t.id === match.tutor_id) || {}; // Match by tutor_id

    //console.log('Found Family:', family); // Log the found family
    //console.log('Found Tutor:', tutor); // Log the found tutor

    // Combine match, family, and tutor data
    const combinedData = {
      ...match,
      ...family,
      ...tutor,
    };

    //console.log('Combined Data for Info Modal:', combinedData); // Log the combined data for debugging

    setSelectedMatchForInfo(combinedData);
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
      const [matchesResponse, familiesResponse, tutorsResponse, signedUpResponse] = await Promise.all([
        axios.post('/api/calculate_possible_matches/'),
        axios.get('/api/get_complete_family_details/'),
        getTutors(), // Use the imported getTutors function
        axios.get('/api/get_signedup/'), // Fetch all signed-up data
      ]);


      const matchesData = matchesResponse.data.matches || [];
      const familiesData = familiesResponse.data.families || [];
      const signedUpData = signedUpResponse.data.signedup_users || [];

      // Map signed-up data by tutor ID for quick lookup
      const signedUpById = signedUpData.reduce((acc, signedUp) => {
        acc[signedUp.id] = signedUp;
        return acc;
      }, {});

      // Combine tutor data with signed-up data
      const tutorsWithDetails = tutorsResponse.map((tutor) => {
        const signedUpDetails = signedUpById[tutor.value] || {}; // Match by tutor.value (ID)
        const combinedTutor = {
          id: tutor.value,
          tutorship_status: tutor.label.split(' - ')[1], // Extract status from label
          phone: signedUpDetails.phone || '', // Add phone from signed-up data
          email: signedUpDetails.email || '', // Add email from signed-up data
          want_tutor: signedUpDetails.want_tutor || false, // Add want_tutor from signed-up data
          comment: signedUpDetails.comment || '', // Add comment from signed-up data
        };
        return combinedTutor;
      });


      // Combine match data with family and tutor details
      const matchesWithDetails = matchesData.map((match) => {
        const family = familiesData.find((f) => f.id === match.child_id) || {}; // Match by child_id
        const tutor = tutorsWithDetails.find((t) => t.id === match.tutor_id) || {}; // Match by tutor_id

        const combinedMatch = {
          ...match,
          ...family,
          ...tutor,
        };
        return combinedMatch;
      });


      setMatches(matchesWithDetails);
      setFamilies(familiesData);
      setTutors(tutorsWithDetails); // Save the combined tutor data
    } catch (error) {
      console.error('Error fetching matches:', error);
      showErrorToast(t, 'Failed to fetch matches.', error);
    } finally {
      setGridLoading(false); // Ensure gridLoading is set to false
      setMapLoading(false);
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
    console.log('DEBUG: Calculating age from date:', dateString); // Add debug log

    // Parse the date string in DD/MM/YYYY format
    const [day, month, year] = dateString.split('/'); // Split the string into day, month, and year
    const birthDate = new Date(`${year}-${month}-${day}`); // Rearrange into YYYY-MM-DD format

    if (isNaN(birthDate)) {
      console.error('Invalid date format:', dateString); // Log an error if the date is invalid
      return 'Invalid date';
    }

    const today = new Date(); // Get the current date
    const age = today.getFullYear() - birthDate.getFullYear(); // Calculate the age in years
    const monthDifference = today.getMonth() - birthDate.getMonth(); // Calculate the month difference

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
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
      fetchTutorships();
    } else {
      setLoading(false);
    }
  }, []);

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
            <button onClick={fetchTutorships}>
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
                    <th>{t('Tutor Name')}</th>
                    <th>{t('Child Name')}</th>
                    <th>{t('Tutorship create date')}</th>
                    <th>{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tutorships.map((tutorship, index) => (
                    <tr key={tutorship.id || index}>
                      <td>{`${tutorship.tutor_firstname} ${tutorship.tutor_lastname}`}</td>
                      <td>{`${tutorship.child_firstname} ${tutorship.child_lastname}`}</td>
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
                {t('Discuss with a coordinator', { roleName: translatedRoleName })}
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
            <div className="modal-content">
              <span className="close" onClick={closeInfoModal}>&times;</span>
              <div className="info-columns">
                {/* Child Info */}
                <div className="info-column">
                  <h2>{t('Child Information')}</h2>
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

                {/* Tutor Info */}
                <div className="info-column">
                  <h2>{t('Tutor Information')}</h2>
                  <table className="info-table">
                    <tbody>
                      <tr><td>{t('ID')}</td><td> {selectedMatchForInfo.tutor_id}</td></tr>
                      <tr><td>{t('Full Name')}</td><td> {selectedMatchForInfo.tutor_full_name}</td></tr>
                      <tr><td>{t('City')}</td><td> {selectedMatchForInfo.tutor_city}</td></tr>
                      <tr><td>{t('Age')}</td><td> {selectedMatchForInfo.tutor_age}</td></tr>
                      <tr><td>{t('Gender')}</td><td> {selectedMatchForInfo.tutor_gender ? t('Female') : t('Male')}</td></tr>
                      <tr><td>{t('Phone')}</td><td> {selectedMatchForInfo.phone}</td></tr>
                      <tr><td>{t('Email')}</td><td> {selectedMatchForInfo.email}</td></tr>
                      <tr><td>{t('Want to Tutor')}</td><td> {selectedMatchForInfo.want_tutor ? t('Yes') : t('No')}</td></tr>
                      <tr><td>{t('Comment')}</td><td> {selectedMatchForInfo.comment}</td></tr>
                      <tr><td>{t('Tutorship status')}</td><td> {selectedMatchForInfo.tutorship_status}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
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
            <button className="close-matches-modal-button" onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
          </div>
          <div className="filter-controls">
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
          </div>
          <div className="match-modal-content">
            <div className="grid-container">
              {gridLoading ? (
                <div className="grid-loader">{t("Loading data...")}</div>
              ) : (
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th>{t('מידע')}</th>
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
                            <i className="info-icon">i</i>
                            <span className="tooltip">{t('Press to see full info')}</span>
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
                              {`${selectedMatch.distance_between_cities} km`}
                            </Popup>
                          </>
                        )}
                    </>
                  )}
                </MapContainer>
              )}
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