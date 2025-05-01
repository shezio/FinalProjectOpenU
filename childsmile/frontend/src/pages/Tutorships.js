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


const Tutorships = () => {
  const [tutorships, setTutorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [tutorshipToDelete, setTutorshipToDelete] = useState(null);
  const [isTutorshipDeleteModalOpen, setIsTutorshipDeleteModalOpen] = useState(false);
  const { t } = useTranslation(); // Initialize the translation hook

  // Permissions required to access the page
  const requiredPermissions = [
    { resource: 'childsmile_app_tutorships', action: 'CREATE' },
    { resource: 'childsmile_app_tutorships', action: 'UPDATE' },
    { resource: 'childsmile_app_tutorships', action: 'DELETE' },
    { resource: 'childsmile_app_tutorships', action: 'VIEW' },
  ];

  const hasPermissionOnTutorships = hasAllPermissions(requiredPermissions);

  const openAddWizardModal = () => {
    setIsModalOpen(true);
  };

  const openTutorshipDeleteModal = (tutorshipId) => {
    setTutorshipToDelete(tutorshipId);
    setIsTutorshipDeleteModalOpen(true);
  };

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

  const calculateMatches = () => {
    setMapLoading(true);
    axios
      .post('/api/calculate_possible_matches/')
      .then((response) => {
        setMatches(response.data.matches || []);
      })
      .catch((error) => {
        console.error('Error calculating matches:', error);
        showErrorToast(t, 'Failed to calculate matches.', error);
      })
      .finally(() => {
        setMapLoading(false);
      });
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
                  {tutorships.map((tutorship) => (
                    <tr key={tutorship.id}>
                      <td>{tutorship.tutor_firstname} {tutorship.tutor_lastname}</td>
                      <td>{tutorship.child_firstname} {tutorship.child_lastname}</td>
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
          <h2>אשף התאמות</h2>
          <div className="modal-content">
            <div className="grid-container">
              {mapLoading ? (
                <div className="loader">טוען נתונים...</div>
              ) : (
                <table className="data-grid">
                  <thead>
                    <tr>
                      <th>שם חניך</th>
                      <th>עיר חניך</th>
                      <th>שם חונך</th>
                      <th>עיר חונך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match, index) => (
                      <tr
                        key={index}
                        onClick={() => setSelectedMatch(match)}
                        className={selectedMatch === match ? 'selected' : ''}
                      >
                        <td>{match.child_full_name}</td>
                        <td>{match.child_city}</td>
                        <td>{match.tutor_full_name}</td>
                        <td>{match.tutor_city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="map-container">
              {mapLoading ? <div className="loader">טוען מפה...</div> : <div>מפה כאן</div>}
            </div>
          </div>
          <div className="modal-actions">
            <button onClick={calculateMatches}>חשב התאמות</button>
            <button onClick={createTutorship} disabled={!selectedMatch}>
              צור חונכות
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};
export default Tutorships;