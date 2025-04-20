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
  const [showAddModal, setShowAddModal] = useState(false); // State for Add Family modal
  const [newFamily, setNewFamily] = useState({
    childfirstname: '',
    childsurname: '',
    gender: '',
    city: '',
    child_phone_number: '',
    treating_hospital: '',
    date_of_birth: '',
    marital_status: '',
    num_of_siblings: '',
    details_for_tutoring: '',
    tutoring_status: '',
    street_and_apartment_number: '',
  });

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

  const handleAddFamilyChange = (e) => {
    const { name, value } = e.target;
    setNewFamily((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddFamilySubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/create_family/', newFamily);
      toast.success(t('Family added successfully!'));
      setShowAddModal(false);
      fetchFamilies(); // Refresh the families list
    } catch (error) {
      console.error('Error adding family:', error);
      showErrorToast(t('Error adding family'), t('Please try again later.'));
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewFamily({
      childfirstname: '',
      childsurname: '',
      gender: '',
      city: '',
      child_phone_number: '',
      treating_hospital: '',
      date_of_birth: '',
      marital_status: '',
      num_of_siblings: '',
      details_for_tutoring: '',
      tutoring_status: '',
      street_and_apartment_number: '',
    });
  };

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
            <button onClick={() => setShowAddModal(true)}>
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
        {/* Add Family Modal */}
        {showAddModal && (
          <div className="modal show">
            <div className="modal-content">
              <span className="close" onClick={closeAddModal}>&times;</span>
              <h2>{t('Add New Family')}</h2>
              <form onSubmit={handleAddFamilySubmit}>
                <input
                  type="text"
                  name="childfirstname"
                  placeholder={t('First Name')}
                  value={newFamily.childfirstname}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="text"
                  name="childsurname"
                  placeholder={t('Last Name')}
                  value={newFamily.childsurname}
                  onChange={handleAddFamilyChange}
                  required
                />
                <select
                  name="gender"
                  value={newFamily.gender}
                  onChange={handleAddFamilyChange}
                  required
                >
                  <option value="">{t('Select Gender')}</option>
                  <option value="true">{t('נקבה')}</option>
                  <option value="false">{t('זכר')}</option>
                </select>
                <input
                  type="text"
                  name="city"
                  placeholder={t('City')}
                  value={newFamily.city}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="text"
                  name="child_phone_number"
                  placeholder={t('Phone Number')}
                  value={newFamily.child_phone_number}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="text"
                  name="treating_hospital"
                  placeholder={t('Treating Hospital')}
                  value={newFamily.treating_hospital}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="date"
                  name="date_of_birth"
                  value={newFamily.date_of_birth}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="text"
                  name="marital_status"
                  placeholder={t('Marital Status')}
                  value={newFamily.marital_status}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="number"
                  name="num_of_siblings"
                  placeholder={t('Number of Siblings')}
                  value={newFamily.num_of_siblings}
                  onChange={handleAddFamilyChange}
                  required
                />
                <textarea
                  name="details_for_tutoring"
                  placeholder={t('Details for Tutoring')}
                  value={newFamily.details_for_tutoring}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="text"
                  name="tutoring_status"
                  placeholder={t('Tutoring Status')}
                  value={newFamily.tutoring_status}
                  onChange={handleAddFamilyChange}
                  required
                />
                <input
                  type="text"
                  name="street_and_apartment_number"
                  placeholder={t('Street and Apartment Number')}
                  value={newFamily.street_and_apartment_number}
                  onChange={handleAddFamilyChange}
                  required
                />
                <button type="submit">{t('Submit')}</button>
                <button type="button" onClick={closeAddModal}>{t('Cancel')}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Families;