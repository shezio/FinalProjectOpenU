import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import '../styles/tutorships.css';
import axios from '../axiosConfig';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasAllPermissions } from '../components/utils';
import { useTranslation } from 'react-i18next'; // Import the translation hook
import { showErrorToast } from '../components/toastUtils'; // Import the toast utility
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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [filterThreshold, setFilterThreshold] = useState(50); // Default filter threshold
  const [sortOrder, setSortOrder] = useState('asc'); // Default sort order
  const [tutorshipToDelete, setTutorshipToDelete] = useState(null);
  const [isTutorshipDeleteModalOpen, setIsTutorshipDeleteModalOpen] = useState(false);
  const { t } = useTranslation(); // Initialize the translation hook
  const mapRef = useRef();

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
    setTutorshipToDelete(tutorshipId);
    setIsTutorshipDeleteModalOpen(true);
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
      .get('/api/get_tutorships/')
      .then((response) => {
        setTutorships(response.data.tutorships || []);
      })
      .catch((error) => {
        console.error('Error fetching tutorships:', error);
        showErrorToast(t, 'Failed to fetch tutorships.', error); // Use the toast utility for error handling
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchMatches = async () => {
    setGridLoading(true);
    setMapLoading(true);
    try {
      const response = await axios.post('/api/calculate_possible_matches/');
      const matchesData = response.data.matches || [];
      setMatches(matchesData); // Directly set matches without geocoding
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
    console.log('Selected Match:', match);
    setSelectedMatch(match);
  };

  const createTutorship = () => {
    if (!selectedMatch) return;
    axios
      .post('/api/create_tutorship/', { match: selectedMatch })
      .then(() => {
        toast.success('Tutorship created successfully!');
        setIsModalOpen(false);
        fetchTutorships(); // Refresh tutorships after creation
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
      <div className="main-content">
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
    <div className="main-content">
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
          <div className="tutorship-matching-grid-container">
            {tutorships.length === 0 ? (
              <div className="no-data">אין נתונים להצגה</div>
            ) : (
              <table className="tutorship-matching-data-grid">
                <thead>
                  <tr>
                    <th>שם חונך</th>
                    <th>שם חניך</th>
                    <th>תאריך יצירת חונכות</th>
                    <th>פעולות</th>
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
                          <button className="delete-button" onClick={() => openTutorshipDeleteModal(tutorship.id)}>
                            {t('מחק')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)} className="matches-modal">
          <div className="matches-modal-header">
            <h2>{t('Matching Wizard')}</h2>
            <button className="close-matches-modal-button" onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
          </div>
          <div className="match-modal-content">
            <div className="grid-container">
              <div className="filter-controls">
                <label htmlFor="filter-input">{t('Filter by Minimum Grade')}:  </label>
                <input
                  id="filter-input"
                  type="number"
                  min="0"
                  value={filterThreshold}
                  onChange={(e) => setFilterThreshold(Number(e.target.value))}
                  placeholder={t('Enter Grade')}
                  className="filter-input"
                />
              </div>
              {gridLoading ? (
                <div className="grid-loader">{t("Loading data...")}</div>
              ) : (
                <table className="data-grid">
                  <thead>
                    <tr>
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
                        key={match.id || index}
                        onClick={() => handleRowClick(match)}
                        className={selectedMatch === match ? 'selected' : ''}
                      >
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