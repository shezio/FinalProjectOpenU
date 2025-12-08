import React, { useState, useEffect } from 'react';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { isGuestUser, hasUpdatePermissionForTable, hasDeletePermissionForTable } from '../components/utils';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from 'react-i18next';
import '../styles/common.css';
import '../styles/families.css'; // Import the CSS file for families
import "../i18n"; // Import i18n configuration
import { showErrorToast } from '../components/toastUtils'; // Import the toast utility
import hospitals from "../components/hospitals.json"; // Import the hospitals JSON file
import settlementsAndStreets from "../components/settlements_n_streets.json";
import Select from "react-select";
import Modal from "react-modal";
import { useNavigate } from 'react-router-dom'; // Add this import at the top with other imports

Modal.setAppElement('#root'); // Replace '#root' with the ID of your app's root element
const Families = () => {
  const hospitalsList = hospitals.map((hospital) => hospital.trim()).filter((hospital) => hospital !== "");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [familyToDelete, setFamilyToDelete] = useState(null);
  const [streets, setStreets] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [editFamily, setEditFamily] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false); // State for Add Family modal
  const [maritalStatuses, setMaritalStatuses] = useState([]);
  const [tutoringStatuses, setTutoringStatuses] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5); // Number of families per page
  const [showHealthyOnly, setShowHealthyOnly] = useState(false);
  const [showMatureOnly, setShowMatureOnly] = useState(false); // State for showing mature families only
  const [totalCount, setTotalCount] = useState(0); // Total number of families after filtering
  const [selectedStatus, setSelectedStatus] = useState(''); // State for selected status filter
  const [newFamily, setNewFamily] = useState({
    child_id: '',
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
    status: 'טיפולים', // Default status
  });

  // Validation state
  const [errors, setErrors] = useState({});
  const navigate = useNavigate(); // Add this line
  const canDeleteFamily = hasDeletePermissionForTable('children');
  const canEditFamily = hasUpdatePermissionForTable('children');
  // Add sorting state for registration date
  const [sortOrderRegistrationDate, setSortOrderRegistrationDate] = useState('desc'); // Default to descending

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/get_complete_family_details/');
      
      // Sort families by registration date (descending) by default
      const sortedFamilies = response.data.families.sort((a, b) => {
        const dateA = parseDate(a.registration_date);
        const dateB = parseDate(b.registration_date);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setFamilies(sortedFamilies); // Use sorted data
      setMaritalStatuses(response.data.marital_statuses.map((item) => item.status));
      setTutoringStatuses(response.data.tutoring_statuses.map((item) => item.status));
      setStatuses(response.data.statuses.map((item) => item.status));
    } catch (error) {
      console.error('Error fetching families:', error);
      showErrorToast(t, 'Error fetching families data', error);
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  };

  let filteredFamilies = families;
  if (showHealthyOnly) {
    filteredFamilies = filteredFamilies.filter((family) => family.status === "בריא");
  }
  if (showMatureOnly) {
    filteredFamilies = filteredFamilies.filter((family) => family.age >= 16);
  }
  if (selectedStatus) {
    filteredFamilies = filteredFamilies.filter((family) => family.status === selectedStatus);
  }
  const paginatedFamilies = filteredFamilies.slice((page - 1) * pageSize, page * pageSize);


  useEffect(() => {
    fetchFamilies();
  }, []);

  useEffect(() => {
    setTotalCount(filteredFamilies.length);
    setPage(1); // Reset to page 1 whenever filters change
  }, [filteredFamilies]);

  const handleAddFamilyChange = (e) => {
    const { name, value } = e.target;

    setNewFamily((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If the city is selected, update the streets
    if (name === "city") {
      const cityKey = value.trim();
      const cityStreets = processedSettlementsAndStreets[cityKey] || [];
      setStreets(cityStreets);
    }
  };

  const preprocessSettlementsAndStreets = (data) => {
    if (!data || typeof data !== "object") {
      console.error("Invalid settlementsAndStreets data:", data);
      return {}; // Return an empty object if data is invalid
    }

    const processedData = {};
    Object.keys(data).forEach((key) => {
      processedData[key.trim()] = data[key];
    });
    return processedData;
  };

  const processedSettlementsAndStreets = preprocessSettlementsAndStreets(settlementsAndStreets);

  const cityOptions = processedSettlementsAndStreets
    ? Object.keys(processedSettlementsAndStreets).map((city) => ({
      value: city.trim(),
      label: city.trim(),
    }))
    : [];

  const streetOptions = streets.map((street) => ({
    value: street,
    label: street,
  }));

  // Validation logic
  const validate = () => {
    const newErrors = {};
    // need to verify ID is inserted and is numeric and 9 digits long
    console.log("new ID:", newFamily.child_id); // Debugging
    console.log("new ID length:", newFamily.child_id.length); // Debugging
    if (!newFamily.child_id || isNaN(newFamily.child_id) || newFamily.child_id.length !== 9) {
      newErrors.child_id = t("ID must be 9 digits long.");
    }
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
    // Validate phone number (10 digits) after removing spaces and dashes
    const phoneNumber = newFamily.child_phone_number.replace(/\D/g, ''); // Remove non-digit characters
    if (!newFamily.child_phone_number || phoneNumber.length !== 10) {
      newErrors.child_phone_number = t("Phone number must be 10 digits.");
    }
    if (!newFamily.treating_hospital) {
      newErrors.treating_hospital = t("Treating hospital is required.");
    }
    if (!newFamily.date_of_birth) {
      newErrors.date_of_birth = t("Date of birth is required.");
    }
    // need to add validation that the date is valid and that the age doesnt exceed 100 years for the given date
    const today = new Date();
    const birthDate = new Date(newFamily.date_of_birth);
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 0 || age > 100) {
      newErrors.date_of_birth = t("Date of birth must be a valid date and the age must be between 0 and 100.");
    }
    if (!newFamily.marital_status) {
      newErrors.marital_status = t("Marital status is required.");
    }
    if (!newFamily.num_of_siblings || isNaN(newFamily.num_of_siblings)) {
      newErrors.num_of_siblings = t("Number of siblings must be a valid number.");
    }
    if (!newFamily.tutoring_status) {
      newErrors.tutoring_status = t("Tutoring status is required.");
    }
    if (!newFamily.status) {
      newErrors.status = t("Status is required.");
    }

    console.log("Validation errors:", newErrors); // Debugging
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
      showErrorToast(t, 'Error adding family', error); // Use the toast utility for error messages);
    }
  };


  const openAddModal = () => {
    setNewFamily({
      child_id: '',
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
      status: 'טיפולים', // Default status
    });
    setErrors({}); // Clear any previous validation errors
    setShowAddModal(true); // Open the modal
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewFamily({
      child_id: '',
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
      status: 'טיפולים', // Reset to default status
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
    console.log("Editing family:", family);
    const streetAndApartment = family.street_and_apartment_number ? family.street_and_apartment_number.split(' ') : ['', ''];
    const apartmentNumber = streetAndApartment.pop(); // Extract the last part as the apartment number
    const street = streetAndApartment.join(' '); // Join the remaining parts as the street name

    // Format dates to YYYY-MM-DD for the input fields
    const formatDate = (date) => {
      if (!date) return '';
      const [day, month, year] = date.split('/');
      return `${year}-${month}-${day}`;
    };

    const newFamily = {
      child_id: family.id.toString() || '', // Convert ID to string
      childfirstname: family.first_name || '',
      childsurname: family.last_name || '',
      gender: family.gender ? 'נקבה' : 'זכר',
      city: family.city || '',
      // Extract street and apartment number
      street: street || '',
      apartment_number: apartmentNumber || '',
      child_phone_number: family.child_phone_number || '',
      treating_hospital: family.treating_hospital || '',
      date_of_birth: formatDate(family.date_of_birth) || '',
      marital_status: family.marital_status || '',
      num_of_siblings: family.num_of_siblings || '',
      details_for_tutoring: family.details_for_tutoring || '',
      tutoring_status: family.tutoring_status || '',
      medical_diagnosis: family.medical_diagnosis || '',
      diagnosis_date: formatDate(family.diagnosis_date) || '',
      additional_info: family.additional_info || '',
      current_medical_state: family.current_medical_state || '',
      when_completed_treatments: formatDate(family.when_completed_treatments) || '',
      father_name: family.father_name || '',
      father_phone: family.father_phone || '',
      mother_name: family.mother_name || '',
      mother_phone: family.mother_phone || '',
      expected_end_treatment_by_protocol: formatDate(family.expected_end_treatment_by_protocol) || '',
      has_completed_treatments: family.has_completed_treatments || false,
      status: family.status || 'טיפולים', // Default to 'טיפולים' if not provided
    };

    const cityKey = family.city ? family.city.trim() : '';
    const cityStreets = processedSettlementsAndStreets[cityKey] || [];
    setStreets(cityStreets);


    console.log("New Family State:", newFamily);
    setNewFamily(newFamily);
    setEditFamily(family); // Set the family being edited
  };


  const handleEditFamilySubmit = async (e) => {
    e.preventDefault();
    console.log("handleEditFamilySubmit triggered"); // Debugging
    if (!validate()) {
      console.log("Validation failed", errors); // Debugging
      return; // Prevent submission if validation fails
    }
    console.log("Validation passed"); // Debugging
    const combinedStreetAndApartment = `${newFamily.street} ${newFamily.apartment_number}`;
    const familyData = {
      ...newFamily,
      street_and_apartment_number: combinedStreetAndApartment,
    };
    console.log("Family Data to be sent:", familyData); // Debugging
    try {
      const response = await axios.put(`/api/update_family/${editFamily.id}/`, familyData); // Use PUT API
      toast.success(t('Family updated successfully!'));
      setEditFamily(null); // Close the edit modal
      fetchFamilies(); // Refresh the families list
    } catch (error) {
      console.error('Error updating family:', error);
      showErrorToast(t, 'Error updating family', error); // Use the toast utility for error messages
    }
  };

  const closeEditModal = () => {
    setEditFamily(null);
    setNewFamily({
      child_id: '',
      childfirstname: '',
      childsurname: '',
      gender: 'נקבה',
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
      has_completed_treatments: false,
      status: 'טיפולים', // Reset to default status
    });
    setErrors({});
  };

  const openDeleteModal = (familyId) => {
    setFamilyToDelete(familyId);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setFamilyToDelete(null);
  };

  const confirmDeleteFamily = async () => {
    try {
      await axios.delete(`/api/delete_family/${familyToDelete}/`); // Replace with your DELETE API endpoint
      toast.success(t('Family deleted successfully!'));
      setFamilies(families.filter((family) => family.id !== familyToDelete));
    } catch (error) {
      console.error('Error deleting family:', error);
      showErrorToast(t, 'Error deleting family', error); // Use the toast utility for error messages
    } finally {
      closeDeleteModal();
    }
  };

  // Add the parseDate function (if not already present)
  const parseDate = (dateString) => {
    if (!dateString) return new Date(0); // Handle missing dates
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  // Add the toggle sort function for registration date
  const toggleSortOrderRegistrationDate = () => {
    setSortOrderRegistrationDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...filteredFamilies].sort((a, b) => {
      const dateA = parseDate(a.registration_date);
      const dateB = parseDate(b.registration_date);
      return sortOrderRegistrationDate === 'asc' ? dateB - dateA : dateA - dateB; // Reverse the logic
    });
    setFamilies(sorted); // Update the main families array with sorted data
  };

  return (
    <div className="families-main-content">
      <Sidebar />
      <div className="content">
        <InnerPageHeader title={t('Families Management')} />
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
          <div className="create-task init-family-data-button">
            <button
              onClick={() => navigate('/initial-family-data')}
            >
              {t('Initial Family Data')}
            </button>
            <button onClick={openAddModal} disabled={isGuestUser()}>
              {t('Add New Family')}
            </button>
            <button
              className={`toggle-healthy-btn${showHealthyOnly ? " active" : ""}`}
              onClick={() => setShowHealthyOnly((prev) => !prev)}
            >
              {showHealthyOnly ? t('Show All Statuses') : t('Show Healthy Only')}
            </button>
            <button
              className={`toggle-mature-btn${showMatureOnly ? " active" : ""}`}
              onClick={() => setShowMatureOnly((prev) => !prev)}
            >
              {showMatureOnly ? t('Show All Ages') : t('Show Matures Only')}
            </button>
          </div>
          <div className="status-filter">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="families-status-filter-label"
            >
              <option value="" >סנן לפי סטטוס</option>
              {statuses.map((status, idx) => (
                <option key={idx} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="refresh">
            <button onClick={fetchFamilies}>
              {t('Refresh Families List')}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loader">{t('Loading data...')}</div>
        ) : (
          <div className="families-grid-container">
            {filteredFamilies.length > 0 ? (
              <>
                <table className="families-data-grid">
                  <thead>
                    <tr>
                      <th>{t('Full Name')}</th>
                      <th>{t('Age')}</th>
                      <th>{t('Address')}</th>
                      <th>{t('Phone')}</th>
                      <th>{t('Tutorship Status')}</th>
                      <th>{t('Status')}</th>
                      <th>{t('Responsible Coordinator')}</th>
                      <th>{t('Registration Date')}
                        <button
                          className="sort-button"
                          onClick={toggleSortOrderRegistrationDate}
                        >
                          {sortOrderRegistrationDate === 'asc' ? '▲' : '▼'}
                        </button>
                      </th>
                      <th>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFamilies.map((family) => (
                      <tr key={family.id}>
                        <td>{family.first_name} {family.last_name}</td>
                        <td>{family.age}</td>
                        <td>{family.address}</td>
                        <td>{family.child_phone_number || '---'}</td>
                        <td>{family.tutoring_status || '---'}</td>
                        <td>{family.status}</td>
                        <td>{family.responsible_coordinator || '---'}</td>
                        <td>{family.registration_date}</td>
                        <td>
                          <div className="family-actions">
                            <button className="info-button" onClick={() => showFamilyDetails(family)}>
                              {t('מידע')}
                            </button>
                            <button className="edit-button" onClick={() => openEditModal(family)} disabled={!canEditFamily}>
                              {t('ערוך')}
                            </button>
                            <button className="delete-button" onClick={() => openDeleteModal(family.id)} disabled={!canDeleteFamily}>
                              {t('מחק')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
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
            ) : (
              <div className="no-data">
                {t('No matching results found. Adjust the filters to see data.')}
              </div>
            )}
          </div>
        )}

        {selectedFamily && (
          <div className="modal show">
            <div className="modal-content">
              <span className="close" onClick={closeFamilyDetails}>&times;</span>
              <h2>{t('Family Details')} {selectedFamily.last_name}</h2>
              <div className="family-details-grid">
                <p>{t('ID')}: {selectedFamily.id}</p>
                <p>{t('Full Name')}: {selectedFamily.first_name} {selectedFamily.last_name}</p>
                <p>{t('Age')}: {selectedFamily.age || '---'}</p>
                <p>{t('Status')}: {selectedFamily.status || 'טיפולים'}</p>
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
                <p>{t('Treating Hospital')}: {selectedFamily.treating_hospital || '---'}</p>
                <p>{t('When Completed Treatments')}: {selectedFamily.when_completed_treatments || '---'}</p>
                <p>{t('Father Name')}: {selectedFamily.father_name || '---'}</p>
                <p>{t('Father Phone')}: {selectedFamily.father_phone || '---'}</p>
                <p>{t('Mother Name')}: {selectedFamily.mother_name || '---'}</p>
                <p>{t('Mother Phone')}: {selectedFamily.mother_phone || '---'}</p>
                <p>{t('Expected End Treatment by Protocol')}: {selectedFamily.expected_end_treatment_by_protocol || '---'}</p>
                <p>{t('Has Completed Treatments')}: {selectedFamily.has_completed_treatments ? t('Yes') : t('No')}</p>
                <p>{t('Details for Tutoring')}: {selectedFamily.details_for_tutoring || '---'}</p>
                <p>{t('Status')}: {selectedFamily.status || 'טיפולים'}</p>
              </div>
              <button onClick={closeFamilyDetails}>{t('Close')}</button>
            </div>
          </div>
        )}
        {editFamily && (
          <div className="modal show">
            <div className="modal-content">
              <span className="close" onClick={closeEditModal}>&times;</span>
              <h2>{t('Edit Family')} {editFamily.last_name}</h2>
              <form onSubmit={handleEditFamilySubmit} className="form-grid">
                <div className="form-column">
                  <label>{t('First Name')}</label>
                  <input
                    type="text"
                    name="childfirstname"
                    value={newFamily.childfirstname}
                    onChange={handleAddFamilyChange}
                    className={errors.childfirstname ? "error" : ""}
                  />
                  {errors.childfirstname && <span className="families-error-message">{errors.childfirstname}</span>}

                  <label>{t('Last Name')}</label>
                  <input
                    type="text"
                    name="childsurname"
                    value={newFamily.childsurname}
                    onChange={handleAddFamilyChange}
                    className={errors.childsurname ? "error" : ""}
                  />
                  {errors.childsurname && <span className="families-error-message">{errors.childsurname}</span>}


                  <label>{t("City")}</label>
                  <Select
                    options={cityOptions}
                    value={cityOptions.find((option) => option.value === newFamily.city)}
                    onChange={(selectedOption) => {
                      const city = selectedOption ? selectedOption.value : "";
                      setNewFamily((prev) => {
                        const cityStreets = processedSettlementsAndStreets[city] || [];
                        setStreets(cityStreets); // Update streets based on selected city
                        return {
                          ...prev,
                          city,
                          street: prev.street, // Keep the current street when city changes
                        };
                      });
                    }}
                    placeholder={t("Select a city")}
                    className={errors.city ? "error" : ""}
                    isClearable
                    noOptionsMessage={() => t("No city available")}
                  />
                  {errors.city && <span className="families-error-message">{errors.city}</span>}


                  <label>{t("Street")}</label>
                  <Select
                    options={streetOptions}
                    value={streetOptions.find((option) => option.value === newFamily.street)}
                    onChange={(selectedOption) => {
                      const street = selectedOption ? selectedOption.value : "";
                      setNewFamily((prev) => ({
                        ...prev,
                        street,
                      }));
                    }}
                    placeholder={t("Select a street")}
                    className={errors.street ? "error" : ""}
                    isClearable
                    noOptionsMessage={() => t("No street available")}
                  />
                  {errors.street && <span className="families-error-message">{errors.street}</span>}

                </div>  {/* End of first form-column */}

                {/* Second form-column */}
                <div className="form-column">
                  <label>{t('Apartment Number')}</label>
                  <input
                    type="number"
                    name="apartment_number"
                    min="1"
                    max="50000"
                    value={newFamily.apartment_number}
                    onChange={handleAddFamilyChange}
                    className={errors.apartment_number ? "error" : ""}
                  />
                  {errors.apartment_number && <span className="families-error-message">{errors.apartment_number}</span>}

                  <label>{t('Phone Number')}</label>
                  <input
                    type="text"
                    name="child_phone_number"
                    value={newFamily.child_phone_number}
                    onChange={handleAddFamilyChange}
                    maxLength="10"
                    className={errors.child_phone_number ? "error" : ""}
                  />
                  {errors.child_phone_number && <span className="families-error-message">{errors.child_phone_number}</span>}

                  <label>{t('Treating Hospital')}</label>
                  <Select
                    options={hospitalsList.map((hospital) => ({
                      value: hospital,
                      label: hospital,
                    }))}
                    value={
                      hospitalsList
                        .map((hospital) => ({ value: hospital, label: hospital }))
                        .find((option) => option.value === newFamily.treating_hospital)
                    }
                    onChange={(selectedOption) => {
                      setNewFamily((prev) => ({
                        ...prev,
                        treating_hospital: selectedOption ? selectedOption.value : "",
                      }));
                    }}
                    placeholder={t('Select a hospital')}
                    className={errors.treating_hospital ? "error" : ""}
                    isClearable
                    noOptionsMessage={() => t('No hospital available')}
                  />
                  {errors.treating_hospital && (
                    <span className="families-error-message">{errors.treating_hospital}</span>
                  )}

                  <label>{t('Date of Birth')}</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={newFamily.date_of_birth}
                    onChange={handleAddFamilyChange}
                    className={errors.date_of_birth ? "error" : ""}
                  />
                  {errors.date_of_birth && <span className="families-error-message">{errors.date_of_birth}</span>}
                </div> {/* End of second form-column */}

                {/* Third form-column */}
                <div className="form-column">
                  <label>{t('Marital Status')}</label>
                  <select
                    name="marital_status"
                    value={newFamily.marital_status}
                    onChange={handleAddFamilyChange}
                    className={errors.marital_status ? "error" : ""}
                  >
                    <option value="">{t('Select a marital status')}</option>
                    {maritalStatuses.map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {errors.marital_status && <span className="families-error-message">{errors.marital_status}</span>}

                  <label>{t('Number of Siblings')}</label>
                  <input
                    type="number"
                    name="num_of_siblings"
                    min="0"
                    value={newFamily.num_of_siblings}
                    onChange={handleAddFamilyChange}
                    className={errors.num_of_siblings ? "error" : ""}
                  />
                  {errors.num_of_siblings && <span className="families-error-message">{errors.num_of_siblings}</span>}

                  <label>{t('Gender')}</label>
                  <select
                    name="gender"
                    value={newFamily.gender}
                    onChange={handleAddFamilyChange}
                    className={errors.gender ? "error" : ""}
                  >
                    <option value="נקבה">{t('Female')}</option>
                    <option value="זכר">{t('Male')}</option>
                  </select>
                  {errors.gender && <span className="families-error-message">{errors.gender}</span>}

                  <label>{t('ID')}</label>
                  <input
                    type="text"
                    name="child_id"
                    value={newFamily.child_id?.toString() || ""}
                    className=""
                    disabled
                  />
                </div> {/* End of third form-column */}

                {/* Fourth form-column */}
                <div className="form-column">
                  <label>{t('Medical Diagnosis')}</label>
                  <input
                    type="text"
                    name="medical_diagnosis"
                    value={newFamily.medical_diagnosis}
                    onChange={handleAddFamilyChange}
                    className={errors.medical_diagnosis ? "error" : ""}
                  />
                  {errors.medical_diagnosis && <span className="families-error-message">{errors.medical_diagnosis}</span>}

                  <label>{t('Diagnosis Date')}</label>
                  <input
                    type="date"
                    name="diagnosis_date"
                    value={newFamily.diagnosis_date}
                    onChange={handleAddFamilyChange}
                    className={errors.diagnosis_date ? "error" : ""}
                  />
                  {errors.diagnosis_date && <span className="families-error-message">{errors.diagnosis_date}</span>}

                  <label>{t('Current Medical State')}</label>
                  <textarea
                    name="current_medical_state"
                    value={newFamily.current_medical_state}
                    onChange={handleAddFamilyChange}
                    className={`scrollable-textarea ${errors.current_medical_state ? "error" : ""}`}
                  />
                  {errors.current_medical_state && <span className="families-error-message">{errors.current_medical_state}</span>}

                  <label>{t('When Completed Treatments')}</label>
                  <input
                    type="date"
                    name="when_completed_treatments"
                    value={newFamily.when_completed_treatments}
                    onChange={handleAddFamilyChange}
                    className={errors.when_completed_treatments ? "error" : ""}
                  />
                  {errors.when_completed_treatments && <span className="families-error-message">{errors.when_completed_treatments}</span>}

                  <label>{t('Additional Info')}</label>
                  <textarea
                    name="additional_info"
                    value={newFamily.additional_info}
                    onChange={handleAddFamilyChange}
                    className="scrollable-textarea"
                  />
                </div> {/* End of fourth form-column */}

                {/* Fifth form-column */}
                <div className="form-column">
                  <label>{t('Father Name')}</label>
                  <input
                    type="text"
                    name="father_name"
                    value={newFamily.father_name}
                    onChange={handleAddFamilyChange}
                    className={errors.father_name ? "error" : ""}
                  />
                  {errors.father_name && <span className="families-error-message">{errors.father_name}</span>}

                  <label>{t('Father Phone')}</label>
                  <input
                    type="text"
                    name="father_phone"
                    value={newFamily.father_phone}
                    onChange={handleAddFamilyChange}
                    maxLength="10"
                    className={errors.father_phone ? "error" : ""}
                  />
                  {errors.father_phone && <span className="families-error-message">{errors.father_phone}</span>}

                  <label>{t('Mother Name')}</label>
                  <input
                    type="text"
                    name="mother_name"
                    value={newFamily.mother_name}
                    onChange={handleAddFamilyChange}
                    className={errors.mother_name ? "error" : ""}
                  />
                  {errors.mother_name && <span className="families-error-message">{errors.mother_name}</span>}

                  <label>{t('Mother Phone')}</label>
                  <input
                    type="text"
                    name="mother_phone"
                    value={newFamily.mother_phone}
                    onChange={handleAddFamilyChange}
                    maxLength="10"
                    className={errors.mother_phone ? "error" : ""}
                  />
                  {errors.mother_phone && <span className="families-error-message">{errors.mother_phone}</span>}
                </div> {/* End of fifth form-column */}

                {/* Sixth form-column */}
                <div className="form-column">
                  <label>{t('Expected End Treatment by Protocol')}</label>
                  <input
                    type="date"
                    name="expected_end_treatment_by_protocol"
                    value={newFamily.expected_end_treatment_by_protocol}
                    onChange={handleAddFamilyChange}
                    className={errors.expected_end_treatment_by_protocol ? "error" : ""}
                  />
                  {errors.expected_end_treatment_by_protocol && <span className="families-error-message">{errors.expected_end_treatment_by_protocol}</span>}

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
                    className={errors.has_completed_treatments ? "error" : ""}
                  >
                    <option value="No">{t('No')}</option>
                    <option value="Yes">{t('Yes')}</option>
                  </select>
                  {errors.has_completed_treatments && <span className="families-error-message">{errors.has_completed_treatments}</span>}

                  <label>{t('Details for Tutoring')}</label>
                  <textarea
                    name="details_for_tutoring"
                    value={newFamily.details_for_tutoring}
                    onChange={handleAddFamilyChange}
                    className={`scrollable-textarea ${errors.details_for_tutoring ? "error" : ""}`}
                  />
                  {errors.details_for_tutoring && <span className="families-error-message">{errors.details_for_tutoring}</span>}

                  <label>{t('Tutoring Status')}</label>
                  <select
                    name="tutoring_status"
                    value={newFamily.tutoring_status}
                    onChange={handleAddFamilyChange}
                    className={errors.tutoring_status ? "error" : ""}
                  >
                    <option value="">{t('Select a tutoring status')}</option>
                    {tutoringStatuses.map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {errors.tutoring_status && <span className="families-error-message">{errors.tutoring_status}</span>}

                  <label>{t('Status')}</label>
                  <select
                    name="status"
                    value={newFamily.status}
                    onChange={handleAddFamilyChange}
                    className={errors.status ? "error" : ""}
                  >
                    {statuses.map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {errors.status && <span className="families-error-message">{errors.status}</span>}
                </div>



                <div className="form-actions">
                  <button type="submit">{t('Update Family')}</button>
                  <button type="button" onClick={closeEditModal}>{t('Cancel')}</button>
                </div>
              </form>
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
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <input
                    type="text"
                    name="childfirstname"
                    value={newFamily.childfirstname}
                    onChange={handleAddFamilyChange}
                    className={errors.childfirstname ? "error" : ""}
                  />
                  {errors.childfirstname && <span className="families-error-message">{errors.childfirstname}</span>}

                  <label>{t('Last Name')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <input
                    type="text"
                    name="childsurname"
                    value={newFamily.childsurname}
                    onChange={handleAddFamilyChange}
                    className={errors.childsurname ? "error" : ""}
                  />
                  {errors.childsurname && <span className="families-error-message">{errors.childsurname}</span>}

                  <label>{t("City")}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <Select
                    options={cityOptions}
                    value={cityOptions.find((option) => option.value === newFamily.city)}
                    onChange={(selectedOption) => {
                      const city = selectedOption ? selectedOption.value : "";
                      setNewFamily((prev) => ({
                        ...prev,
                        city,
                        street: "", // Reset street when city changes
                      }));
                      const cityStreets = processedSettlementsAndStreets[city] || [];
                      setStreets(cityStreets); // Update streets based on selected city
                    }}
                    placeholder={t("Select a city")}
                    className={errors.city ? "error" : ""}
                    isClearable
                    noOptionsMessage={() => t("No city available")} // Add this line
                  />
                  {errors.city && <span className="families-error-message">{errors.city}</span>}

                  <label>{t("Street")}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <Select
                    options={streetOptions}
                    value={streetOptions.find((option) => option.value === newFamily.street)}
                    onChange={(selectedOption) => {
                      const street = selectedOption ? selectedOption.value : "";
                      setNewFamily((prev) => ({
                        ...prev,
                        street,
                      }));
                    }}
                    placeholder={t("Select a street")}
                    className={errors.street ? "error" : ""}
                    isClearable
                    noOptionsMessage={() => t("No street available")} // Add this line
                  />
                  {errors.street && <span className="families-error-message">{errors.street}</span>}
                </div>

                <div className="form-column">
                  <label>{t('Apartment Number')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <input
                    type="number"
                    name="apartment_number"
                    min="1"
                    max="50000"
                    value={newFamily.apartment_number}
                    onChange={handleAddFamilyChange}
                    className={errors.apartment_number ? "error" : ""}
                  />
                  {errors.apartment_number && <span className="families-error-message">{errors.apartment_number}</span>}

                  <label>{t('Phone Number')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <input
                    type="text"
                    name="child_phone_number"
                    value={newFamily.child_phone_number}
                    onChange={handleAddFamilyChange}
                    maxLength="10"
                    className={errors.child_phone_number ? "error" : ""}
                  />
                  {errors.child_phone_number && <span className="families-error-message">{errors.child_phone_number}</span>}

                  <label>{t('Treating Hospital')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <Select
                    options={hospitalsList.map((hospital) => ({
                      value: hospital,
                      label: hospital,
                    }))}
                    value={
                      hospitalsList
                        .map((hospital) => ({ value: hospital, label: hospital }))
                        .find((option) => option.value === newFamily.treating_hospital)
                    }
                    onChange={(selectedOption) => {
                      setNewFamily((prev) => ({
                        ...prev,
                        treating_hospital: selectedOption ? selectedOption.value : "",
                      }));
                    }}
                    placeholder={t('Select a hospital')}
                    className={errors.treating_hospital ? "error" : ""}
                    isClearable
                    noOptionsMessage={() => t('No hospital available')}
                  />
                  {errors.treating_hospital && (
                    <span className="families-error-message">{errors.treating_hospital}</span>
                  )}

                  <label>{t('Date of Birth')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={newFamily.date_of_birth}
                    onChange={handleAddFamilyChange}
                    className={errors.date_of_birth ? "error" : ""}
                  />
                  {errors.date_of_birth && <span className="families-error-message">{errors.date_of_birth}</span>}
                </div>

                <div className="form-column">
                  <label>{t('Marital Status')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <select
                    name="marital_status"
                    value={newFamily.marital_status}
                    onChange={handleAddFamilyChange}
                    className={errors.marital_status ? "error" : ""}
                  >
                    <option value="">{t('Select a marital status')}</option>
                    {maritalStatuses.map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {errors.marital_status && <span className="families-error-message">{errors.marital_status}</span>}


                  <label>{t('Number of Siblings')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <input
                    type="number"
                    name="num_of_siblings"
                    min="0"
                    value={newFamily.num_of_siblings}
                    onChange={handleAddFamilyChange}
                    className={errors.num_of_siblings ? "error" : ""}
                  />
                  {errors.num_of_siblings && <span className="families-error-message">{errors.num_of_siblings}</span>}

                  <label>{t('Gender')}</label>
                  <select
                    name="gender"
                    value={newFamily.gender}
                    onChange={handleAddFamilyChange}
                    className={errors.gender ? "error" : ""}
                  >
                    <option value="נקבה">{t('Female')}</option>
                    <option value="זכר">{t('Male')}</option>
                  </select>
                  {errors.gender && <span className="families-error-message">{errors.gender}</span>}

                  <label>{t('ID')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <input
                    type="text"
                    name="child_id"
                    value={newFamily.child_id}
                    onChange={handleAddFamilyChange}
                    maxLength="9"
                    className={errors.child_id ? "error" : ""}
                  />
                  {errors.child_id && <span className="families-error-message">{errors.child_id}</span>}

                </div>
                <div className="form-column">
                  <label>{t('Medical Diagnosis')}</label>
                  <input
                    type="text"
                    name="medical_diagnosis"
                    value={newFamily.medical_diagnosis}
                    onChange={handleAddFamilyChange}
                    className={errors.medical_diagnosis ? "error" : ""}
                  />
                  {errors.medical_diagnosis && <span className="families-error-message">{errors.medical_diagnosis}</span>}

                  <label>{t('Diagnosis Date')}</label>
                  <input
                    type="date"
                    name="diagnosis_date"
                    value={newFamily.diagnosis_date}
                    onChange={handleAddFamilyChange}
                    className={errors.diagnosis_date ? "error" : ""}
                  />
                  {errors.diagnosis_date && <span className="families-error-message">{errors.diagnosis_date}</span>}

                  <label>{t('Current Medical State')}</label>
                  <textarea
                    name="current_medical_state"
                    value={newFamily.current_medical_state}
                    onChange={handleAddFamilyChange}
                    className={`scrollable-textarea ${errors.current_medical_state ? "error" : ""}`}
                  />
                  {errors.current_medical_state && <span className="families-error-message">{errors.current_medical_state}</span>}

                  <label>{t('When Completed Treatments')}</label>
                  <input
                    type="date"
                    name="when_completed_treatments"
                    value={newFamily.when_completed_treatments}
                    onChange={handleAddFamilyChange}
                    className={errors.when_completed_treatments ? "error" : ""}
                  />
                  {errors.when_completed_treatments && <span className="families-error-message">{errors.when_completed_treatments}</span>}

                  <label>{t('Additional Info')}</label>
                  <textarea
                    name="additional_info"
                    value={newFamily.additional_info}
                    onChange={handleAddFamilyChange}
                    className="scrollable-textarea"
                  />
                </div>

                <div className="form-column">
                  <label>{t('Father Name')}</label>
                  <input
                    type="text"
                    name="father_name"
                    value={newFamily.father_name}
                    onChange={handleAddFamilyChange}
                    className={errors.father_name ? "error" : ""}
                  />
                  {errors.father_name && <span className="families-error-message">{errors.father_name}</span>}

                  <label>{t('Father Phone')}</label>
                  <input
                    type="text"
                    name="father_phone"
                    value={newFamily.father_phone}
                    onChange={handleAddFamilyChange}
                    maxLength="10"
                    className={errors.father_phone ? "error" : ""}
                  />
                  {errors.father_phone && <span className="families-error-message">{errors.father_phone}</span>}

                  <label>{t('Mother Name')}</label>
                  <input
                    type="text"
                    name="mother_name"
                    value={newFamily.mother_name}
                    onChange={handleAddFamilyChange}
                    className={errors.mother_name ? "error" : ""}
                  />
                  {errors.mother_name && <span className="families-error-message">{errors.mother_name}</span>}

                  <label>{t('Mother Phone')}</label>
                  <input
                    type="text"
                    name="mother_phone"
                    value={newFamily.mother_phone}
                    onChange={handleAddFamilyChange}
                    maxLength="10"
                    className={errors.mother_phone ? "error" : ""}
                  />
                  {errors.mother_phone && <span className="families-error-message">{errors.mother_phone}</span>}

                </div>
                <div className="form-column">
                  <label>{t('Expected End Treatment by Protocol')}</label>
                  <input
                    type="date"
                    name="expected_end_treatment_by_protocol"
                    value={newFamily.expected_end_treatment_by_protocol}
                    onChange={handleAddFamilyChange}
                    className={errors.expected_end_treatment_by_protocol ? "error" : ""}
                  />
                  {errors.expected_end_treatment_by_protocol && <span className="families-error-message">{errors.expected_end_treatment_by_protocol}</span>}

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
                    className={errors.has_completed_treatments ? "error" : ""}
                  >
                    <option value="No">{t('No')}</option>
                    <option value="Yes">{t('Yes')}</option>
                  </select>
                  {errors.has_completed_treatments && <span className="families-error-message">{errors.has_completed_treatments}</span>}

                  <label>{t('Details for Tutoring')}</label>
                  <textarea
                    name="details_for_tutoring"
                    value={newFamily.details_for_tutoring}
                    onChange={handleAddFamilyChange}
                    className={`scrollable-textarea ${errors.details_for_tutoring ? "error" : ""}`}
                  />
                  {errors.details_for_tutoring && <span className="families-error-message">{errors.details_for_tutoring}</span>}

                  <label>{t('Tutoring Status')}</label>
                  <span className="families-mandatory-span">{t("*This is a mandatory field")}</span>
                  <select
                    name="tutoring_status"
                    value={newFamily.tutoring_status}
                    onChange={handleAddFamilyChange}
                    className={errors.tutoring_status ? "error" : ""}
                  >
                    <option value="">{t('Select a tutoring status')}</option>
                    {tutoringStatuses.map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {errors.tutoring_status && <span className="families-error-message">{errors.tutoring_status}</span>}

                  <label>{t('Status')}</label>
                  <select
                    name="status"
                    value={newFamily.status}
                    onChange={handleAddFamilyChange}
                    className={errors.status ? "error" : ""}
                  >
                    {statuses.map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {errors.status && <span className="families-error-message">{errors.status}</span>}
                </div>

                <div className="form-actions">
                  <button type="submit">{t('Add Family')}</button>
                  <button type="button" onClick={closeAddModal}>{t('Cancel')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onRequestClose={closeDeleteModal}
          contentLabel="Delete Confirmation"
          className="delete-modal"
          overlayClassName="delete-modal-overlay"
        >
          <h2>{t('Are you sure you want to delete this family?')}</h2>
          <p style={{ color: 'red', fontWeight: 'bold' }}>
            {t('Deleting a family will remove all associated data')}
            <br />
            {t('This action cannot be undone')}
          </p>
          <div className="modal-actions">
            <button onClick={confirmDeleteFamily} className="yes-button">
              {t('Yes')}
            </button>
            <button onClick={closeDeleteModal} className="no-button">
              {t('No')}
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Families;