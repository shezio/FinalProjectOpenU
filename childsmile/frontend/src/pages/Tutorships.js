import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import axios from '../axiosConfig';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasAllPermissions } from '../components/utils';
import { useTranslation } from 'react-i18next'; // Import the translation hook


const Tutorships = () => {
  const [tutorships, setTutorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Permissions required to access the page
  const requiredPermissions = [
    { resource: 'childsmile_app_tutorships', action: 'CREATE' },
    { resource: 'childsmile_app_tutorships', action: 'UPDATE' },
    { resource: 'childsmile_app_tutorships', action: 'DELETE' },
    { resource: 'childsmile_app_tutorships', action: 'VIEW' },
  ];

  const hasPermissionOnTutorships = hasAllPermissions(requiredPermissions);


  const fetchTutorships = () => {
    setLoading(true);
    axios
      .get('/api/get_tutorships/')
      .then((response) => {
        setTutorships(response.data.tutorships || []);
      })
      .catch((error) => {
        console.error('Error fetching tutorships:', error);
        toast.error('Failed to fetch tutorships.');
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
        toast.error('Failed to calculate matches.');
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
        toast.error('Failed to create tutorship.');
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
        <InnerPageHeader title="חונכות" />
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
      <InnerPageHeader title="חונכות" />
      <div className="page-content">
        <ToastContainer />
        <div className="actions">
          <button className="refresh-button" onClick={fetchTutorships}>
            רענן
          </button>
          <button className="open-modal-button" onClick={() => setIsModalOpen(true)}>
            פתח אשף התאמות
          </button>
        </div>
        {loading ? (
          <div className="loader">טוען נתונים...</div>
        ) : (
          <div className="grid-container">
            {tutorships.length === 0 ? (
              <div className="no-data">אין נתונים להצגה</div>
            ) : (
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>שם חונך</th>
                    <th>שם חניך</th>
                    <th>תאריך יצירת חונכות</th>
                  </tr>
                </thead>
                <tbody>
                  {tutorships.map((tutorship, index) => (
                    <tr key={index}>
                      <td>{tutorship.tutor_first_name} {tutorship.tutor_last_name}</td>
                      <td>{tutorship.child_first_name} {tutorship.child_last_name}</td>
                      <td>{tutorship.created_date}</td>
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
            <div className="map-container">
              {mapLoading ? <div className="loader">טוען מפה...</div> : <div>מפה כאן</div>}
            </div>
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