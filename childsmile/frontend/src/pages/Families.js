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
import settlements from "../components/settlements.json"; // Import the settlements JSON file


const Families = () => {
  const cities = settlements.map((city) => city.trim()).filter((city) => city !== "");
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [editFamily, setEditFamily] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false); // State for Add Family modal
  const [newFamily, setNewFamily] = useState({
    childfirstname: '',
    childsurname: '',
    gender: 'נקבה', // Default to נקבה
    city: '',
    street: '',
    apartment_number: '',
    child_phone_number: '',
    treating_hospital: '',
    date_of_birth: '',
    marital_status: '',
    num_of_siblings: '',
    details_for_tutoring: '',
    tutoring_status: '',
    medical_diagnosis: '',
    diagnosis_date: '',
    additional_info: '',
    current_medical_state: '',
    when_completed_treatments: '',
    father_name: '',
    father_phone: '',
    mother_name: '',
    mother_phone: '',
    expected_end_treatment_by_protocol: '',
    has_completed_treatments: false, // Default to false
  });

  // Validation state
  const [errors, setErrors] = useState({});

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
    const { name, value, type, checked } = e.target;
    setNewFamily((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Validation logic
  const validate = () => {
    const newErrors = {};

    if (!newFamily.childfirstname) {
      newErrors.childfirstname = t("First name is required.");
    }
    if (!newFamily.childsurname) {
      newErrors.childsurname = t("Last name is required.");
    }
    if (!newFamily.city) {
      newErrors.city = t("City is required.");
    }
    if (!newFamily.street) {
      newErrors.street = t("Street is required.");
    }
    if (!newFamily.apartment_number || isNaN(newFamily.apartment_number)) {
      newErrors.apartment_number = t("Apartment number must be a valid number.");
    }
    if (!newFamily.child_phone_number || newFamily.child_phone_number.length !== 10) {
      newErrors.child_phone_number = t("Phone number must be 10 digits.");
    }
    if (!newFamily.treating_hospital) {
      newErrors.treating_hospital = t("Treating hospital is required.");
    }
    if (!newFamily.date_of_birth) {
      newErrors.date_of_birth = t("Date of birth is required.");
    }
    if (!newFamily.marital_status) {
      newErrors.marital_status = t("Marital status is required.");
    }
    if (!newFamily.num_of_siblings || isNaN(newFamily.num_of_siblings)) {
      newErrors.num_of_siblings = t("Number of siblings must be a valid number.");
    }
    if (!newFamily.details_for_tutoring) {
      newErrors.details_for_tutoring = t("Details for tutoring are required.");
    }
    if (!newFamily.tutoring_status) {
      newErrors.tutoring_status = t("Tutoring status is required.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const handleAddFamilySubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return; // Prevent submission if validation fails
    }
    const combinedStreetAndApartment = `${newFamily.street} ${newFamily.apartment_number}`;
    const familyData = {
      ...newFamily,
      street_and_apartment_number: combinedStreetAndApartment,
    };
    try {
      const response = await axios.post('/api/create_family/', familyData);
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
      gender: 'נקבה',
      city: '',
      street: '',
      apartment_number: '',
      child_phone_number: '',
      treating_hospital: '',
      date_of_birth: '',
      medical_diagnosis: '',
      diagnosis_date: '',
      marital_status: '',
      num_of_siblings: '',
      details_for_tutoring: '',
      additional_info: '',
      tutoring_status: '',
      current_medical_state: '',
      when_completed_treatments: '',
      father_name: '',
      father_phone: '',
      mother_name: '',
      mother_phone: '',
      expected_end_treatment_by_protocol: '',
      has_completed_treatments: false,
    });
    setErrors({}); // Clear errors when closing the modal
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
              <p>{t('Current Medical State')}: {selectedFamily.current_medical_state || '---'}</p>
              <p>{t('When Completed Treatments')}: {selectedFamily.when_completed_treatments || '---'}</p>
              <p>{t('Father Name')}: {selectedFamily.father_name || '---'}</p>
              <p>{t('Father Phone')}: {selectedFamily.father_phone || '---'}</p>
              <p>{t('Mother Name')}: {selectedFamily.mother_name || '---'}</p>
              <p>{t('Mother Phone')}: {selectedFamily.mother_phone || '---'}</p>
              <p>{t('Expected End Treatment by Protocol')}: {selectedFamily.expected_end_treatment_by_protocol || '---'}</p>
              <p>{t('Has Completed Treatments')}: {selectedFamily.has_completed_treatments ? t('Yes') : t('No')}</p>
              <p>{t('Details for Tutoring')}: {selectedFamily.details_for_tutoring || '---'}</p>
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
              <form onSubmit={handleAddFamilySubmit} className="form-grid">
                <div className="form-column">
                  <label>{t('First Name')}</label>
                  <input
                    type="text"
                    name="childfirstname"
                    value={newFamily.childfirstname}
                    onChange={handleAddFamilyChange}
                    className={errors.childfirstname ? "error" : ""}
                  />
                  {errors.childfirstname && <span className="error-message">{errors.childfirstname}</span>}

                  <label>{t('Last Name')}</label>
                  <input
                    type="text"
                    name="childsurname"
                    value={newFamily.childsurname}
                    onChange={handleAddFamilyChange}
                    className={errors.childsurname ? "error" : ""}
                  />
                  {errors.childsurname && <span className="error-message">{errors.childsurname}</span>}

                  <label>{t('City')}</label>
                  <select
                    name="city"
                    value={newFamily.city}
                    onChange={handleAddFamilyChange}
                    className={errors.city ? "error" : ""}
                  >
                    <option value="">{t('Select a city')}</option>
                    {cities.map((city, index) => (
                      <option key={index} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {errors.city && <span className="error-message">{errors.city}</span>}

                  <label>{t('Street')}</label>
                  <input
                    type="text"
                    name="street"
                    value={newFamily.street}
                    onChange={handleAddFamilyChange}
                    className={errors.street ? "error" : ""}
                  />
                  {errors.street && <span className="error-message">{errors.street}</span>}

                  <label>{t('Apartment Number')}</label>
                  <input
                    type="number"
                    name="apartment_number"
                    min="1"
                    max="500"
                    value={newFamily.apartment_number}
                    onChange={handleAddFamilyChange}
                    className={errors.apartment_number ? "error" : ""}
                  />
                  {errors.apartment_number && <span className="error-message">{errors.apartment_number}</span>}
                </div>

                <div className="form-column">
                  <label>{t('Phone Number')}</label>
                  <input
                    type="text"
                    name="child_phone_number"
                    value={newFamily.child_phone_number}
                    onChange={handleAddFamilyChange}
                    className={errors.child_phone_number ? "error" : ""}
                  />
                  {errors.child_phone_number && <span className="error-message">{errors.child_phone_number}</span>}

                  <label>{t('Treating Hospital')}</label>
                  <input
                    type="text"
                    name="treating_hospital"
                    value={newFamily.treating_hospital}
                    onChange={handleAddFamilyChange}
                    className={errors.treating_hospital ? "error" : ""}
                  />
                  {errors.treating_hospital && <span className="error-message">{errors.treating_hospital}</span>}

                  <label>{t('Date of Birth')}</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={newFamily.date_of_birth}
                    onChange={handleAddFamilyChange}
                    className={errors.date_of_birth ? "error" : ""}
                  />
                  {errors.date_of_birth && <span className="error-message">{errors.date_of_birth}</span>}

                  <label>{t('Marital Status')}</label>
                  <input
                    type="text"
                    name="marital_status"
                    value={newFamily.marital_status}
                    onChange={handleAddFamilyChange}
                    className={errors.marital_status ? "error" : ""}
                  />
                  {errors.marital_status && <span className="error-message">{errors.marital_status}</span>}

                  <label>{t('Number of Siblings')}</label>
                  <input
                    type="number"
                    name="num_of_siblings"
                    min="0"
                    value={newFamily.num_of_siblings}
                    onChange={handleAddFamilyChange}
                    className={errors.num_of_siblings ? "error" : ""}
                  />
                  {errors.num_of_siblings && <span className="error-message">{errors.num_of_siblings}</span>}

                  <label>{t('Details for Tutoring')}</label>
                  <textarea
                    name="details_for_tutoring"
                    value={newFamily.details_for_tutoring}
                    onChange={handleAddFamilyChange}
                    className={`scrollable-textarea ${errors.details_for_tutoring ? "error" : ""}`}
                  />
                  {errors.details_for_tutoring && <span className="error-message">{errors.details_for_tutoring}</span>}

                  <label>{t('Tutoring Status')}</label>
                  <input
                    type="text"
                    name="tutoring_status"
                    value={newFamily.tutoring_status}
                    onChange={handleAddFamilyChange}
                    className={errors.tutoring_status ? "error" : ""}
                  />
                  {errors.tutoring_status && <span className="error-message">{errors.tutoring_status}</span>}
                </div>
                <div className="form-column">
                  <label>{t('Medical Diagnosis')}</label>
                  <input
                    type="text"
                    name="medical_diagnosis"
                    value={newFamily.medical_diagnosis}
                    onChange={handleAddFamilyChange}
                  />

                  <label>{t('Diagnosis Date')}</label>
                  <input
                    type="date"
                    name="diagnosis_date"
                    value={newFamily.diagnosis_date}
                    onChange={handleAddFamilyChange}
                  />

                  <label>{t('Current Medical State')}</label>
                  <textarea
                    name="current_medical_state"
                    value={newFamily.current_medical_state}
                    onChange={handleAddFamilyChange}
                    className={`scrollable-textarea`}
                  />

                  <label>{t('When Completed Treatments')}</label>
                  <input
                    type="text"
                    name="when_completed_treatments"
                    value={newFamily.when_completed_treatments}
                    onChange={handleAddFamilyChange}
                  />

                  <label>{t('Father Name')}</label>
                  <input
                    type="text"
                    name="father_name"
                    value={newFamily.father_name}
                    onChange={handleAddFamilyChange}
                  />

                  <label>{t('Father Phone')}</label>
                  <input
                    type="text"
                    name="father_phone"
                    value={newFamily.father_phone}
                    onChange={handleAddFamilyChange}
                  />

                  <label>{t('Mother Name')}</label>
                  <input
                    type="text"
                    name="mother_name"
                    value={newFamily.mother_name}
                    onChange={handleAddFamilyChange}
                  />

                  <label>{t('Mother Phone')}</label>
                  <input
                    type="text"
                    name="mother_phone"
                    value={newFamily.mother_phone}
                    onChange={handleAddFamilyChange}
                  />

                  <label>{t('Expected End Treatment by Protocol')}</label>
                  <input
                    type="date"
                    name="expected_end_treatment_by_protocol"
                    value={newFamily.expected_end_treatment_by_protocol}
                    onChange={handleAddFamilyChange}
                  />
                  <label>{t('Has Completed Treatments')}</label>
                  <select
                    name="has_completed_treatments"
                    value={newFamily.has_completed_treatments ? "Yes" : "No"}
                    onChange={(e) =>
                      handleAddFamilyChange({
                        target: {
                          name: "has_completed_treatments",
                          value: e.target.value === "Yes",
                        },
                      })
                    }
                  >
                    <option value="No">{t('No')}</option>
                    <option value="Yes">{t('Yes')}</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit">{t('Submit')}</button>
                  <button type="button" onClick={closeAddModal}>{t('Cancel')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Families;