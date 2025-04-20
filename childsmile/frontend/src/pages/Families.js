import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from 'react-i18next';
import '../styles/common.css';
import '../styles/families.css'; // Import the CSS file for families
import "../i18n"; // Import i18n configuration
import { showErrorToast } from '../components/toastUtils'; // Import the toast utility

const Families = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [editFamily, setEditFamily] = useState(null);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/get_complete_family_details/');
      setFamilies(response.data.families); // Use the "families" key from the API response
    } catch (error) {
      console.error('Error fetching families:', error);
      showErrorToast(t('Error fetching families data'), t('Please try again later.'));
      setFamilies([]); // Fallback to an empty array in case of an error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, []);

  const showFamilyDetails = (family) => {
    setSelectedFamily(family);
  };

  const closeFamilyDetails = () => {
    setSelectedFamily(null);
  };

  const openEditModal = (family) => {
    setEditFamily(family);
  };

  const closeEditModal = () => {
    setEditFamily(null);
  };

  const deleteFamily = (familyId) => {
    if (window.confirm(t('Are you sure you want to delete this family?'))) {
      // Placeholder for DELETE API call
      toast.success(t('Family deleted successfully'), 'success');
      setFamilies(families.filter((family) => family.id !== familyId));
    }
  };

  return (
    <div className="main-content">
      <Sidebar />
      <div className="content">
        <InnerPageHeader title={t('Families Management')} />
        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          rtl={true}
        />
        <div className="filter-create-container">
          <div className="create-task">
            <button onClick={() => alert(t('Add new family'))}>
              {t('Add New Family')}
            </button>
          </div>
          <div className="refresh">
            <button onClick={fetchFamilies}>
              {t('Refresh Families List')}
            </button>
          </div>
        </div>
        <div className="families-grid-container">
          {loading ? (
            <div className="loader">{t('Loading data...')}</div>
          ) : families.length > 0 ? (
            <table className="families-data-grid">
              <thead>
                <tr>
                  <th>{t('Last Name')}</th>
                  <th>{t('Address')}</th>
                  <th>{t('Phone')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <tr key={family.id}>
                    <td>{family.last_name}</td>
                    <td>{family.address}</td>
                    <td>{family.child_phone_number || '---'}</td>
                    <td>{family.tutoring_status || '---'}</td>
                    <td>
                    <div className="family-actions">
                        <button className="info-button" onClick={() => showFamilyDetails(family)}>
                          {t('מידע')}
                        </button>
                        <button className="edit-button" onClick={() => openEditModal(family)}>
                          {t('ערוך')}
                        </button>
                        <button className="delete-button" onClick={() => deleteFamily(family.id)}>
                          {t('מחק')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data">{t('No families to display')}</div>
          )}
        </div>
        {selectedFamily && (
          <div className="modal show">
            <div className="modal-content">
              <span className="close" onClick={closeFamilyDetails}>&times;</span>
              <h2>{t('Family Details')} {selectedFamily.last_name}</h2>
              <p>{t('First Name')}: {selectedFamily.first_name}</p>
              <p>{t('Last Name')}: {selectedFamily.last_name}</p>
              <p>{t('Address')}: {selectedFamily.address}</p>
              <p>{t('Phone')}: {selectedFamily.child_phone_number || '---'}</p>
              <p>{t('Gender')}: {selectedFamily.gender ? t('נקבה') : t('זכר')}</p>
              <p>{t('Date of Birth')}: {selectedFamily.date_of_birth}</p>
              <p>{t('Medical Diagnosis')}: {selectedFamily.medical_diagnosis || '---'}</p>
              <p>{t('Diagnosis Date')}: {selectedFamily.diagnosis_date || '---'}</p>
              <p>{t('Marital Status')}: {selectedFamily.marital_status || '---'}</p>
              <p>{t('Number of Siblings')}: {selectedFamily.num_of_siblings}</p>
              <p>{t('Tutoring Status')}: {selectedFamily.tutoring_status || '---'}</p>
              <p>{t('Responsible Coordinator')}: {selectedFamily.responsible_coordinator || '---'}</p>
              <p>{t('Additional Info')}: {selectedFamily.additional_info || '---'}</p>
              <button onClick={closeFamilyDetails}>{t('Close')}</button>
            </div>
          </div>
        )}  
        {editFamily && (
          <div className="modal show">
            <div className="modal-content">
              <span className="close" onClick={closeEditModal}>&times;</span>
              <h2>{t('Edit Family')} {editFamily.last_name}</h2>
              {/* Add form fields for editing family data */}
              <p>{t('Editing functionality will be implemented later.')}</p>
              <button onClick={closeEditModal}>{t('Close')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Families;