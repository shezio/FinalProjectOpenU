import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '../axiosConfig';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import { isGuestUser, hasUpdatePermissionForTable, hasDeletePermissionForTable, hasCreatePermissionForTable } from '../components/utils';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import '../styles/common.css';
import '../styles/families.css'; // Import the CSS file for families
import "../i18n"; // Import i18n configuration
import { showErrorToast } from '../components/toastUtils'; // Import the toast utility
import hospitals from "../components/hospitals.json"; // Import the hospitals JSON file
import Select from "react-select";
import Modal from "react-modal";
import { useNavigate } from 'react-router-dom'; // Add this import at the top with other imports
import { RotateCcw, LoaderCircle } from 'lucide-react';
import CelebrationEffect from '../components/CelebrationEffect';

Modal.setAppElement('#root'); // Replace '#root' with the ID of your app's root element
const Families = () => {
  const hospitalsList = hospitals.map((hospital) => hospital.trim()).filter((hospital) => hospital !== "");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [familyToDelete, setFamilyToDelete] = useState(null);
  const [streets, setStreets] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [showMatureOnly, setShowMatureOnly] = useState(false); // State for showing mature families only
  const [totalCount, setTotalCount] = useState(0); // Total number of families after filtering
  const [selectedStatuses, setSelectedStatuses] = useState([]); // State for selected status filters (checkboxes)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false); // State for status filter dropdown visibility
  const [selectedTutoringStatus, setSelectedTutoringStatus] = useState(""); // Single tutorship status filter
  const [dropdownStyle, setDropdownStyle] = useState({}); // State for dropdown positioning
  const statusFilterRef = useRef(null); // Ref for status filter button
  const statusDropdownRef = useRef(null); // Ref for status filter dropdown
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
    is_in_frame: '',
    coordinator_comments: '',
    last_review_talk_conducted: '',
    current_medical_state: '',
    when_completed_treatments: '',
    father_name: '',
    father_phone: '',
    mother_name: '',
    mother_phone: '',
    expected_end_treatment_by_protocol: '',
    has_completed_treatments: false, // Default to false
    status: 'טיפולים', // Default status
    responsible_coordinator: '', // Auto-assigned coordinator
    need_review: true, // Feature #2: Default to true (child needs review tasks)
    is_in_group: true, // Default to true
    why_not_in_group: '', // Empty by default
  });
  const [familiesCoordinators, setFamiliesCoordinators] = useState([]); // For non-tutored families
  const [tutoredCoordinators, setTutoredCoordinators] = useState([]); // For tutored families
  const [availableCoordinators, setAvailableCoordinators] = useState([]); // All coordinators for dropdown
  const [autoAssignedCoordinator, setAutoAssignedCoordinator] = useState(null); // Track auto-assigned coordinator

  // Validation state
  const [errors, setErrors] = useState({});
  const navigate = useNavigate(); // Add this line
  const canDeleteFamily = hasDeletePermissionForTable('children');
  const canEditFamily = hasUpdatePermissionForTable('children');
  // Add sorting state for registration date
  const [sortOrderRegistrationDate, setSortOrderRegistrationDate] = useState('desc'); // Default to descending
  // Age range filter state
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(30);
  // Age sorting state
  const [sortOrderAge, setSortOrderAge] = useState('asc'); // Default to ascending

  // City change modal state for Families
  const [showCityChangeModal, setShowCityChangeModal] = useState(false);
  const [cityChangeData, setCityChangeData] = useState(null);

  // Search state for child name
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk delete feature flag
  const ENABLE_BULK_DELETE = process.env.REACT_APP_ENABLE_BULK_DELETE === 'true';

  // Families import feature flag
  const FAMILIES_IMPORT_ENABLED = process.env.REACT_APP_FAMILIES_IMPORT_ENABLED === 'true';
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importDryRun, setImportDryRun] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  
  // Settlements and streets data from API
  const [settlementsAndStreets, setSettlementsAndStreets] = useState({});

  // Celebration effect state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationFamilyName, setCelebrationFamilyName] = useState('');

  const fetchFamilies = async () => {
    setIsRefreshing(true);
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
      // Don't overwrite statuses from API - use hardcoded values instead
      // setStatuses(response.data.statuses.map((item) => item.status));
    } catch (error) {
      console.error('Error fetching families:', error);
      showErrorToast(t, 'Error fetching families data', error);
      setFamilies([]);
    } finally {
      setLoading(false);
      // Keep spinner spinning for 2 seconds
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  // Format status text: replace underscores with spaces
  const formatStatus = (status) => {
    if (!status) return '---';
    return status.replace(/_/g, ' ');
  };

  let filteredFamilies = families;
  // Apply search filter for child name, ID, and phone
  if (searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    filteredFamilies = filteredFamilies.filter((family) => {
      // Search by name
      const fullName = `${family.first_name || ''} ${family.last_name || ''}`.toLowerCase();
      const firstName = (family.first_name || '').toLowerCase();
      const lastName = (family.last_name || '').toLowerCase();
      const nameMatch = fullName.includes(term) || firstName.includes(term) || lastName.includes(term);
      
      // Search by ID
      const idMatch = family.id && family.id.toString().includes(term);
      
      // Search by any phone field (child phone, father phone, mother phone)
      const phoneMatch = 
        (family.child_phone_number && family.child_phone_number.includes(term)) ||
        (family.father_phone && family.father_phone.includes(term)) ||
        (family.mother_phone && family.mother_phone.includes(term));
      
      return nameMatch || idMatch || phoneMatch;
    });
  }
  if (showMatureOnly) {
    filteredFamilies = filteredFamilies.filter((family) => family.age >= 16);
  }
  if (selectedStatuses.length > 0) {
    filteredFamilies = filteredFamilies.filter((family) => selectedStatuses.includes(family.status));
  }
  // Apply tutorship status filter
  if (selectedTutoringStatus) {
    filteredFamilies = filteredFamilies.filter((family) => family.tutoring_status === selectedTutoringStatus);
  }
  // Apply age range filter
  filteredFamilies = filteredFamilies.filter((family) => family.age >= minAge && family.age <= maxAge);
  const paginatedFamilies = filteredFamilies.slice((page - 1) * pageSize, page * pageSize);


  useEffect(() => {
    fetchFamilies();
    fetchAvailableCoordinators();
    fetchSettlementsAndStreets();
  }, []);

  useEffect(() => {
    setTotalCount(filteredFamilies.length);
    setPage(1); // Reset to page 1 only when filters actually change
  }, [showMatureOnly, selectedStatuses, minAge, maxAge, searchTerm, families, selectedTutoringStatus]);

  // Initialize selectedStatuses with all possible statuses (hardcoded from model)
  useEffect(() => {
    // All possible statuses from the Children model
    const allStatuses = ['טיפולים', 'מעקבים', 'אחזקה', 'ז״ל', 'בריא', 'עזב'];
    setStatuses(allStatuses); // Always set all possible statuses
    
    // Only set selected statuses if not already set
    if (selectedStatuses.length === 0) {
      // Check all statuses except "ז״ל", "בריא", and "עזב"
      const defaultStatuses = allStatuses.filter(status => status !== "ז״ל" && status !== "בריא" && status !== "עזב");
      setSelectedStatuses(defaultStatuses);
    }
  }, []);

  // Position the dropdown when it opens
  useEffect(() => {
    if (showStatusDropdown && statusFilterRef.current) {
      const rect = statusFilterRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: `${rect.bottom + window.scrollY + 8}px`,
        left: `${rect.left + window.scrollX}px`
      });
    }
  }, [showStatusDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showStatusDropdown) return;

    const handleClickOutside = (event) => {
      // Check if click is outside BOTH the button AND the dropdown
      const clickedOnButton = statusFilterRef.current && statusFilterRef.current.contains(event.target);
      const clickedOnDropdown = statusDropdownRef.current && statusDropdownRef.current.contains(event.target);
      
      // Only close if clicked outside both
      if (!clickedOnButton && !clickedOnDropdown) {
        setShowStatusDropdown(false);
      }
    };

    // Add listener on the next tick to avoid immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  const handleAddFamilyChange = (e) => {
    const { name, value } = e.target;

    const TREATMENT_COMPLETION_STATUSES = ['מעקבים', 'אחזקה', 'בריא'];
    const todayStr = new Date().toISOString().split('T')[0];

    setNewFamily((prev) => {
      const updates = { [name]: value };
      if (name === 'status' && TREATMENT_COMPLETION_STATUSES.includes(value) && prev.status === 'טיפולים') {
        updates.when_completed_treatments = todayStr;
      }
      return { ...prev, ...updates };
    });

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
    if (!newFamily.apartment_number || newFamily.apartment_number.toString().trim() === '') {
      newErrors.apartment_number = t("Apartment number is required.");
    }
    // Validate phone number (10 digits) after removing spaces and dashes
    const phoneNumber = newFamily.child_phone_number.replace(/\D/g, ''); // Remove non-digit characters
    if (newFamily.child_phone_number && phoneNumber.length !== 10) {
      newErrors.child_phone_number = t("Phone number must be 10 digits.");
    }
    const fatherPhone = newFamily.father_phone ? newFamily.father_phone.replace(/\D/g, '') : '';
    const motherPhone = newFamily.mother_phone ? newFamily.mother_phone.replace(/\D/g, '') : '';
    if (!fatherPhone && !motherPhone) {
      newErrors.father_phone = t("At least one parent phone number (father or mother) must be provided.");
      newErrors.mother_phone = t("At least one parent phone number (father or mother) must be provided.");
    }
    if (!newFamily.treating_hospital) {
      newErrors.treating_hospital = t("Treating hospital is required.");
    }
    if (!newFamily.date_of_birth) {
      newErrors.date_of_birth = t("Date of birth is required.");
    }
    // need to add validation that the date is valid and that the age doesnt exceed 30 years for the given date
    const today = new Date();
    const birthDate = new Date(newFamily.date_of_birth);
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 0 || age > 30) {
      newErrors.date_of_birth = t("Date of birth must be a valid date and the age must be between 0 and 30.");
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
    if (!newFamily.responsible_coordinator) {
      newErrors.responsible_coordinator = t("Responsible coordinator is required.");
    }

    // Validate registration_date if provided - must be valid date and not in future
    if (newFamily.registration_date) {
      const [year, month, day] = newFamily.registration_date.split('-');
      const regDate = new Date(year, parseInt(month) - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if it's a valid date
      if (isNaN(regDate.getTime()) || regDate.getFullYear() !== parseInt(year) || regDate.getMonth() !== parseInt(month) - 1 || regDate.getDate() !== parseInt(day)) {
        newErrors.registration_date = t("Invalid date. Please use a valid date.");
      }
      // Check if date is in the future
      else if (regDate > today) {
        newErrors.registration_date = t("Registration date cannot be in the future.");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  // Duplicate check state
  const [dupCandidates, setDupCandidates] = useState([]);
  const [showDupModal, setShowDupModal] = useState(false);       // grid of all candidates
  const [showDupDetailModal, setShowDupDetailModal] = useState(false); // side-by-side for one
  const [selectedDupFamily, setSelectedDupFamily] = useState(null);
  const [pendingFamilyData, setPendingFamilyData] = useState(null);

  const handleAddFamilySubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    const combinedStreetAndApartment = `${newFamily.street} ${newFamily.apartment_number}`;
    const familyData = {
      ...newFamily,
      street_and_apartment_number: combinedStreetAndApartment,
    };

    // --- Single call: create_family returns 409 if duplicates found ---
    await doCreateFamily(familyData, false);
  };

  const doCreateFamily = async (familyData, forceCreate = false) => {
    try {
      const payload = forceCreate ? { ...familyData, force_create: true } : familyData;
      await axios.post('/api/create_family/', payload);
      toast.success(t('Family added successfully!'));
      
      // Get the current user's name for celebration
      const currentUsername = localStorage.getItem('origUsername');
      let celebrationUserName = 'User';
      
      // Try to fetch staff data to get the display name
      if (currentUsername) {
        try {
          const staffResponse = await axios.get('/api/get_staff/');
          const currentUser = staffResponse.data.find((user) => user.username === currentUsername);
          if (currentUser) {
            celebrationUserName = currentUser.first_name || currentUsername;
          }
        } catch (error) {
          console.error('Error fetching staff data for celebration:', error);
          celebrationUserName = currentUsername;
        }
      }
      
      // Trigger celebration effect with the creating user's name
      setCelebrationFamilyName(celebrationUserName);
      setShowCelebration(true);
      
      setShowAddModal(false);
      setShowDupModal(false);
      setShowDupDetailModal(false);
      setPendingFamilyData(null);
      setDupCandidates([]);
      setSelectedDupFamily(null);
      fetchFamilies();
    } catch (error) {
      // 409 = possible duplicates found — show comparison modal
      if (error.response?.status === 409) {
        const duplicates = error.response.data?.duplicates || [];
        if (duplicates.length > 0) {
          setDupCandidates(duplicates);
          setSelectedDupFamily(duplicates[0]);
          setPendingFamilyData(familyData);
          setShowDupModal(true);
          return;
        }
      }
      console.error('Error adding family:', error);
      const errorMessage = error.response?.data?.error || error.message || '';
      if (errorMessage.includes('duplicate key') && errorMessage.includes('child_id')) {
        showErrorToast(t, '', { message: t('This child ID already exists in the system. Please use a different ID.') });
      } else {
        showErrorToast(t, 'Error adding family', error);
      }
    }
  };


  const openAddModal = () => {
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
      is_in_frame: '',
      coordinator_comments: '',
      current_medical_state: '',
      when_completed_treatments: '',
      father_name: '',
      father_phone: '',
      mother_name: '',
      mother_phone: '',
      expected_end_treatment_by_protocol: '',
      has_completed_treatments: false,
      status: 'טיפולים',
      responsible_coordinator: '', // Reset coordinator
      need_review: true, // Feature #2: Reset to true
      is_in_group: true,
      why_not_in_group: '',
    });
    setAutoAssignedCoordinator(null); // Reset auto-assigned flag
    setErrors({});
    setShowAddModal(true);
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
      is_in_frame: '',
      coordinator_comments: '',
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
      need_review: true, // Feature #2: Reset to true
      is_in_group: true,
      why_not_in_group: '',
    });
    setErrors({}); // Clear errors when closing the modal
  };

  const handleImportFamilies = async () => {
    if (!importFile) {
      showErrorToast(t, "Please select a file", null);
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('dry_run', importDryRun.toString());

    try {
      const response = await axios.post('/api/import/families/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: importDryRun ? 'blob' : 'json'
      });

      if (importDryRun) {
        // Dry-run: Download the preview file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `import_preview_families_${new Date().getTime()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(t("Preview file downloaded. Review and upload again without dry-run to import."));
      } else {
        // Real import - show success with detailed breakdown
        const data = response.data;
        const { success, error, skipped, total, result_file, result_filename, message } = data;
        
        // Show success toast
        toast.success(message || t("Import completed successfully"), { autoClose: 5000 });
        
        // Download the results file if it exists
        if (result_file && result_filename) {
          const binary = atob(result_file);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          const url = window.URL.createObjectURL(new Blob([array]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', result_filename);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
        
        setImportFile(null);
        setShowImportModal(false);
        setImportDryRun(true);
        fetchFamilies();
      }
    } catch (error) {
      if (error.response?.data?.error) {
        showErrorToast(t, '', error);  // Pass empty key to show only backend message
      } else {
        showErrorToast(t, "Import failed", error);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const showFamilyDetails = (family) => {
    setSelectedFamily(family);
  };

  const closeFamilyDetails = () => {
    setSelectedFamily(null);
  };

  const handleManualMatch = (family) => {
    // Navigate to Tutorships page with the selected child ID for manual matching
    navigate("/tutorships", { 
      state: {
        manualMatchChildId: family.id,
        childName: `${family.first_name} ${family.last_name}`,
        childGender: family.gender
      }
    });
  };

  const openEditModal = (family) => {
    console.log("Editing family:", family);
    const streetAndApartment = family.street_and_apartment_number ? family.street_and_apartment_number.split(' ') : ['', ''];
    const apartmentNumber = streetAndApartment.pop(); // Extract the last part as the apartment number
    const street = streetAndApartment.join(' '); // Join the remaining parts as the street name

    // Format dates to YYYY-MM-DD for the input fields
    // Handles both YYYY-MM-DD (CharField) and DD/MM/YYYY (legacy) formats
    const formatDate = (date) => {
      if (!date) return '';
      
      // If it's already in YYYY-MM-DD format (new CharField storage), return as-is
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // If it's in DD/MM/YYYY format (legacy), convert to YYYY-MM-DD
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
      }
      
      // Fallback: try to parse and format
      return '';
    };

    const newFamily = {
      child_id: family.id.toString() || '',
      childfirstname: family.first_name || '',
      childsurname: family.last_name || '',
      gender: family.gender ? 'נקבה' : 'זכר',
      city: family.city || '',
      street: street || '',
      apartment_number: apartmentNumber || '',
      child_phone_number: family.child_phone_number || '',
      treating_hospital: family.treating_hospital || '',
      date_of_birth: formatDate(family.date_of_birth) || '',
      registration_date: formatDate(family.registration_date) || '',
      marital_status: family.marital_status || '',
      num_of_siblings: family.num_of_siblings !== undefined ? family.num_of_siblings.toString() : '0',
      details_for_tutoring: family.details_for_tutoring || '',
      tutoring_status: family.tutoring_status || '',
      medical_diagnosis: family.medical_diagnosis || '',
      diagnosis_date: formatDate(family.diagnosis_date) || '',
      additional_info: family.additional_info || '',
      is_in_frame: family.is_in_frame || '',
      coordinator_comments: family.coordinator_comments || '',
      last_review_talk_conducted: formatDate(family.last_review_talk_conducted) || '',
      current_medical_state: family.current_medical_state || '',
      when_completed_treatments: family.when_completed_treatments || '',
      father_name: family.father_name || '',
      father_phone: family.father_phone || '',
      mother_name: family.mother_name || '',
      mother_phone: family.mother_phone || '',
      expected_end_treatment_by_protocol: family.expected_end_treatment_by_protocol || '',
      has_completed_treatments: family.has_completed_treatments || false,
      status: family.status || 'טיפולים',
      responsible_coordinator: family.responsible_coordinator || '', // Load current coordinator (can be "ללא" or staff_id)
      need_review: family.need_review !== undefined ? family.need_review : true, // Feature #2: Load need_review (default true)
      is_in_group: family.is_in_group !== undefined ? family.is_in_group : true,
      why_not_in_group: family.why_not_in_group || '',
    };

    const cityKey = family.city ? family.city.trim() : '';
    const cityStreets = processedSettlementsAndStreets[cityKey] || [];
    setStreets(cityStreets);

    setAutoAssignedCoordinator(null); // Clear auto-assigned flag when editing
    console.log("New Family State:", newFamily);
    setNewFamily(newFamily);
    setEditFamily(family);
  };


  const handleEditFamilySubmit = async (e) => {
    e.preventDefault();
    console.log("handleEditFamilySubmit triggered"); // Debugging
    if (!validate()) {
      console.log("Validation failed", errors); // Debugging
      return; // Prevent submission if validation fails
    }
    console.log("Validation passed"); // Debugging
    
    // Check if child_id was changed
    const idChanged = parseInt(newFamily.child_id) !== editFamily.id;
    
    // Check if city was changed
    const cityChanged = newFamily.city !== editFamily.city;
    
    // IMPORTANT: Update family fields FIRST, then change ID LAST
    // This prevents data loss if the ID change fails - the other edits are already saved
    
    // Step 1: Update family fields (all fields except the ID change)
    const combinedStreetAndApartment = `${newFamily.street} ${newFamily.apartment_number}`;
    const familyData = {
      ...newFamily,
      street_and_apartment_number: combinedStreetAndApartment,
    };
    console.log("Family Data to be sent:", familyData); // Debugging
    
    try {
      // First, update all the family fields with the current (or old) ID
      const response = await axios.put(`/api/update_family/${editFamily.id}/`, familyData);
      toast.success(t('Family details updated successfully!'));
      console.log('Family fields updated');
      
      // Step 2: If ID was changed, update the ID LAST (after other fields are saved)
      if (idChanged) {
        // Validate new ID format
        if (!newFamily.child_id || isNaN(newFamily.child_id) || newFamily.child_id.length !== 9) {
          return;
        }
        
        try {
          // Call the dedicated update_child_id endpoint
          await axios.put(`/api/update_child_id/${editFamily.id}/`, { 
            new_id: parseInt(newFamily.child_id) 
          });
          
          console.log('Child ID updated');
        } catch (idError) {
          console.error('Error updating child ID:', idError);
          // Silently log error - ID change is part of family edit flow
        }
      }
      
      // Step 3: Close the edit modal first
      setEditFamily(null);
      
      // Step 4: If city was changed AND child has tutorships, show the city change modal
      if (cityChanged && editFamily.tutors && editFamily.tutors.length > 0) {
        // Add a small delay to ensure edit modal closes first
        setTimeout(() => {
          setCityChangeData({
            family: newFamily,
            oldCity: editFamily.city,
            newCity: newFamily.city,
          });
          setShowCityChangeModal(true);
        }, 100);
      } else {
        // No city change or no tutorships, just refresh the list
        fetchFamilies();
      }
    } catch (error) {
      console.error('Error updating family:', error);
      showErrorToast(t, 'Error updating family details. ID was not changed.', error);
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
      need_review: true, // Feature #2: Reset to true
      is_in_group: true,
      why_not_in_group: '',
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

  // City change modal handlers
  const handleCityChangeYes = () => {
    const tuteeName = `${newFamily.childfirstname} ${newFamily.childsurname}`;
    setShowCityChangeModal(false);
    setEditFamily(null);
    fetchFamilies(); // Refresh the list
    // Navigate to tutorships with tutee name filter
    navigate('/tutorships', { state: { filterByName: tuteeName } });
  };

  const handleCityChangeNo = () => {
    setShowCityChangeModal(false);
    setEditFamily(null);
    fetchFamilies(); // Refresh the list and return to grid
  };

  // Add the parseDate function (if not already present)
  const parseDate = (dateString) => {
    if (!dateString) return new Date(0); // Handle missing dates
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  // Format age display for young children
  // Under 1 year: show "X חודשים"
  // 1-2 years: show "שנה וX חודשים"
  // 2+ years: show age number
  const formatAge = (family) => {
    if (!family.date_of_birth) return family.age || '---';
    
    // Parse date_of_birth (format: dd/mm/yyyy)
    const [day, month, year] = family.date_of_birth.split('/');
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    
    // Calculate total months
    let totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12;
    totalMonths += today.getMonth() - birthDate.getMonth();
    
    // Adjust if day hasn't passed yet this month
    if (today.getDate() < birthDate.getDate()) {
      totalMonths--;
    }
    
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years < 1) {
      // Under 1 year: show months only
      if (months === 0) return 'פחות מחודש';
      if (months === 1) return 'חודש';
      if (months === 2) return 'חודשיים';
      return `${months} חודשים`;
    } else if (years === 1) {
      // 1-2 years: show "שנה וX חודשים"
      if (months === 0) return 'שנה';
      if (months === 1) return 'שנה וחודש';
      if (months === 2) return 'שנה וחודשיים';
      return `שנה ו-${months} חודשים`;
    } else {
      // 2+ years: show the age number
      return family.age || years;
    }
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

  // Add the toggle sort function for age
  const toggleSortOrderAge = () => {
    setSortOrderAge((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...filteredFamilies].sort((a, b) => {
      return sortOrderAge === 'asc' ? b.age - a.age : a.age - b.age; // Reverse the logic
    });
    setFamilies(sorted); // Update the main families array with sorted data
  };

  // Add state for selected rows
  const [selectedFamilies, setSelectedFamilies] = useState([]);

  // Implement handleBulkDelete function to send selected IDs to backend
  const handleBulkDelete = async () => {
    if (selectedFamilies.length === 0) {
      toast.warn(t('No families selected for deletion.'));
      return;
    }
    if (!window.confirm(t('Are you sure you want to delete the selected families?'))) {
      return;
    }
    try {
      // Bulk delete: send individual DELETE requests for each selected family
      await Promise.all(selectedFamilies.map(id => axios.delete(`/api/delete_family/${id}/`)));
      toast.success(t('Selected families deleted successfully!'));
      setFamilies(families.filter(family => !selectedFamilies.includes(family.id)));
      setSelectedFamilies([]);
    } catch (error) {
      showErrorToast(t, 'Error deleting families', error);
    }
  };

  const fetchAvailableCoordinators = async () => {
    try {
      const response = await axios.get('/api/get_available_coordinators/');
      const familiesCoords = response.data.families_coordinators || [];
      const tutoredCoords = response.data.tutored_coordinators || [];
      
      setFamiliesCoordinators(familiesCoords);
      setTutoredCoordinators(tutoredCoords);
      
      // Combine all coordinators for the dropdown display
      const allCoordinators = [...familiesCoords, ...tutoredCoords];
      setAvailableCoordinators(allCoordinators);
      
      console.log('Families Coordinators:', familiesCoords);
      console.log('Tutored Coordinators:', tutoredCoords);
    } catch (error) {
      console.error('Error fetching available coordinators:', error);
      showErrorToast(t, 'Error fetching available coordinators', error);
    }
  };

  // Fetch settlements and streets data from API
  const fetchSettlementsAndStreets = async () => {
    try {
      const response = await axios.get('/api/settlements/');
      // API returns dict format: {city_name: [streets]}
      setSettlementsAndStreets(response.data);
    } catch (error) {
      console.error('Error fetching settlements and streets:', error);
      showErrorToast(t, 'Error fetching settlements data', error);
      setSettlementsAndStreets({});
    }
  };

  useEffect(() => {
    fetchFamilies();
    fetchAvailableCoordinators();
  }, []);

  useEffect(() => {
    setTotalCount(filteredFamilies.length);
    setPage(1);
  }, [showMatureOnly, selectedStatuses, maxAge, searchTerm, families]);

  // Auto-assign coordinator and need_review based on tutoring status AND medical status (בריא/ז״ל/עזב)
  useEffect(() => {
    // Check if child is בריא, ז״ל, or עזב (healthy, deceased, or left)
    const isHealthyOrDeceased = newFamily.status === 'בריא' || newFamily.status === 'ז״ל' || newFamily.status === 'עזב';
    
    if (isHealthyOrDeceased) {
      // For healthy/deceased/left children, auto-assign to "ללא" and set need_review to false
      setAutoAssignedCoordinator('ללא');
      setNewFamily(prev => ({
        ...prev,
        responsible_coordinator: 'ללא',
        need_review: false  // Auto-set to false for בריא/ז״ל/עזב
      }));
    } else if (newFamily.tutoring_status) {
      // For other statuses, assign based on tutoring_status and set need_review to true
      // Define status categories - matching enum definition (with underscores)
      const NON_TUTORED_STATUSES = ['לא_רוצים', 'לא_רלוונטי', 'בוגר'];
      const TUTORED_STATUSES = [
        'למצוא_חונך',
        'יש_חונך',
        'למצוא_חונך_אין_באיזור_שלו',
        'למצוא_חונך_בעדיפות_גבוה',
        'שידוך_בסימן_שאלה'
      ];

      let assignedCoordinator = null;
      
      // Assign the appropriate coordinator based on tutoring status
      if (TUTORED_STATUSES.includes(newFamily.tutoring_status) && tutoredCoordinators.length > 0) {
        assignedCoordinator = tutoredCoordinators[0];
      } else if (NON_TUTORED_STATUSES.includes(newFamily.tutoring_status) && familiesCoordinators.length > 0) {
        assignedCoordinator = familiesCoordinators[0];
      }

      // Force update when status changes
      if (assignedCoordinator) {
        setAutoAssignedCoordinator(assignedCoordinator.staff_id);
        setNewFamily(prev => ({
          ...prev,
          responsible_coordinator: String(assignedCoordinator.staff_id),
          need_review: true  // Auto-set to true for other statuses
        }));
      }
    }
  }, [newFamily.tutoring_status, newFamily.status, familiesCoordinators, tutoredCoordinators]);

  return (
    <div className="families-main-content">
      <Sidebar />
      <div className="content">
        <InnerPageHeader title={t('Families Management')} />
        <div className="filter-create-container">
          <div className="create-task init-family-data-button">
            <button 
              className="refresh-icon-button"
              onClick={fetchFamilies}
              disabled={isRefreshing}
              title={t('Refresh Families List')}
            >
              {isRefreshing ? (
                <LoaderCircle size={20} className="spinning" />
              ) : (
                <RotateCcw size={20} strokeWidth={2} />
              )}
            </button>
            <button
              onClick={() => navigate('/initial-family-data')}
            >
              {t('Initial Family Data')}
            </button>
            {FAMILIES_IMPORT_ENABLED && (
              <button onClick={() => setShowImportModal(true)}>
                {t('Import Families')}
              </button>
            )}
            <button onClick={openAddModal} disabled={isGuestUser()}>
              {t('Add New Family')}
            </button>
            <button
              className={`toggle-mature-btn${showMatureOnly ? " active" : ""}`}
              onClick={() => setShowMatureOnly((prev) => !prev)}
            >
              {showMatureOnly ? t('Show All Ages') : t('Show Matures Only')}
            </button>
            <div className="status-filter">
              <button 
                ref={statusFilterRef}
                className="status-filter-button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                {t('Status Filter')}
                <span className={`status-filter-chevron ${showStatusDropdown ? 'open' : ''}`}>▼</span>
              </button>
              {showStatusDropdown && createPortal(
                <div ref={statusDropdownRef} className="status-checkboxes-dropdown" style={dropdownStyle}>
                  {statuses.map((status, idx) => (
                    <label key={idx} className="status-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                          }
                        }}
                      />
                      {status}
                    </label>
                  ))}
                </div>,
                document.body
              )}
            </div>
            <select
              className="tutorship-status-filter"
              value={selectedTutoringStatus}
              onChange={(e) => {
                setSelectedTutoringStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("All Statuses")}</option>
              {tutoringStatuses.map(status => (
                <option key={status} value={status}>{formatStatus(status)}</option>
              ))}
            </select>
            <div className="age-range-filter">
              <label>{t('Age Range')}: {minAge} - {maxAge}</label>
              <div className="age-sliders">
                <input
                  type="range"
                  name="minAge"
                  min="0"
                  max="30"
                  value={minAge}
                  onChange={(e) => {
                    const newMin = parseInt(e.target.value);
                    if (newMin <= maxAge) {
                      setMinAge(newMin);
                    }
                  }}
                  className="age-slider-input"
                />
                <input
                  type="range"
                  name="maxAge"
                  min="0"
                  max="30"
                  value={maxAge}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value);
                    if (newMax >= minAge) {
                      setMaxAge(newMax);
                    }
                  }}
                  className="age-slider-input"
                />
              </div>
            </div>
            <input
              className="families-search-bar"
              type="text"
              placeholder={t("Search by name, ID, or phone")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                      {ENABLE_BULK_DELETE && <th className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedFamilies.length === families.length}
                          onChange={(e) => {
                            setSelectedFamilies(e.target.checked ? families.map((family) => family.id) : []);
                          }}
                        />
                      </th>}
                      <th>{t('Full Name')}</th>
                      <th>
                        {t('Age')}
                        <button className="sort-button" onClick={toggleSortOrderAge}>
                          {sortOrderAge === 'asc' ? '▲' : '▼'}
                        </button>
                      </th>
                      <th>{t('Address')}</th>
                      <th>{t('Parent Phone')}</th>
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
                        {ENABLE_BULK_DELETE && <td className="checkbox-column">
                          <input
                            type="checkbox"
                            checked={selectedFamilies.includes(family.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFamilies((prev) => [...prev, family.id]);
                              } else {
                                setSelectedFamilies((prev) => prev.filter((id) => id !== family.id));
                              }
                            }}
                          />
                        </td>}
                        <td>{family.first_name} {family.last_name}</td>
                        <td>{formatAge(family)}</td>
                        <td>{family.address}</td>
                        <td>{family.mother_phone || family.father_phone || '---'}</td>
                        <td>{formatStatus(family.tutoring_status)}</td>
                        <td>{formatStatus(family.status)}</td>
                        <td>{(family.responsible_coordinator || '---').replace(/_/g, ' ')}</td>
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
                    disabled={page === 1 || totalCount <= pageSize}
                    className="pagination-arrow"
                  >
                    &laquo; {/* Double left arrow */}
                  </button>
                  <button
                    onClick={() => setPage(page - 1)} // Go to the previous page
                    disabled={page === 1 || totalCount <= pageSize}
                    className="pagination-arrow"
                  >
                    &lsaquo; {/* Single left arrow */}
                  </button>

                  {/* Page Numbers - Show max 5 pages */}
                  {(() => {
                    const totalPages = Math.ceil(totalCount / pageSize);
                    if (totalPages <= 1) {
                      return <button className="active">1</button>;
                    }
                    
                    const maxButtons = 5;
                    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
                    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                    
                    // Adjust start if we're near the end
                    if (endPage - startPage + 1 < maxButtons) {
                      startPage = Math.max(1, endPage - maxButtons + 1);
                    }
                    
                    const pages = [];
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          className={page === i ? 'active' : ''}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}

                  {/* Right Arrows */}
                  <button
                    onClick={() => setPage(page + 1)} // Go to the next page
                    disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= pageSize}
                    className="pagination-arrow"
                  >
                    &rsaquo; {/* Single right arrow */}
                  </button>
                  <button
                    onClick={() => setPage(Math.ceil(totalCount / pageSize))} // Go to the last page
                    disabled={page === Math.ceil(totalCount / pageSize) || totalCount <= pageSize}
                    className="pagination-arrow"
                  >
                    &raquo; {/* Double right arrow */}
                  </button>
                </div>

                {/* Bulk Delete button */}
                {ENABLE_BULK_DELETE && (
                  <div className="bulk-delete-container">
                    <button
                      className="bulk-delete-button"
                      onClick={handleBulkDelete}
                      disabled={selectedFamilies.length === 0}
                    >
                      {t('Delete Selected Families')}
                    </button>
                  </div>
                )}
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
                <p>{t('Age')}: {formatAge(selectedFamily)}</p>
                <p>{t('Registration Date')}: {selectedFamily.registration_date || '---'}</p>
                <p>{t('Status')}: {formatStatus(selectedFamily.status)}</p>
                <p>{t('Address')}: {selectedFamily.address}</p>
                <p>{t('Child Phone')}: {selectedFamily.child_phone_number || '---'}</p>
                <p>{t('Gender')}: {selectedFamily.gender ? t('נקבה') : t('זכר')}</p>
                <p>{t('Date of Birth')}: {selectedFamily.date_of_birth}</p>
                <p>{t('Medical Diagnosis')}: {selectedFamily.medical_diagnosis || '---'}</p>
                <p>{t('Diagnosis Date')}: {selectedFamily.diagnosis_date || '---'}</p>
                <p>{t('Marital Status')}: {selectedFamily.marital_status || '---'}</p>
                <p>{t('Number of Siblings')}: {selectedFamily.num_of_siblings}</p>
                <p>{t('Tutoring Status')}: {formatStatus(selectedFamily.tutoring_status)}</p>
                {/* MULTI-TUTOR SUPPORT: Display list of tutors */}
                {selectedFamily.tutors && selectedFamily.tutors.length > 0 ? (
                  <p>{t('Tutors')}: {selectedFamily.tutors.map((tutor) => tutor.tutor_name).join(', ')}</p>
                ) : (
                  <p>{t('Tutors')}: {t('No tutors assigned')}</p>
                )}
                <p>{t('Responsible Coordinator')}: {selectedFamily.responsible_coordinator || '---'}</p>
                <p>{t('Need Review')}: {selectedFamily.need_review ? t('Yes') : t('No')}</p>
                <p>{t('Is In Frame')}: {selectedFamily.is_in_frame || '---'}</p>
                <p>{t('Coordinator Comments')}: {selectedFamily.coordinator_comments || '---'}</p>
                <p>{t('Additional Info')}: {selectedFamily.additional_info || '---'}</p>
                <p>{t('Current Medical State')}: {selectedFamily.current_medical_state || '---'}</p>
                <p>{t('Treating Hospital')}: {selectedFamily.treating_hospital || '---'}</p>
                <p>{t('When Completed Treatments')}: {selectedFamily.when_completed_treatments || '---'}</p>
                <p>{t('Father Name')}: {selectedFamily.father_name || '---'}</p>
                <p>{t('Father Phone')}: {selectedFamily.father_phone || '---'}</p>
                <p>{t('Mother Name')}: {selectedFamily.mother_name || '---'}</p>
                <p>{t('Mother Phone')}: {selectedFamily.mother_phone || '---'}</p>
                <p>{t('Has Completed Treatments')}: {selectedFamily.has_completed_treatments ? t('Yes') : t('No')}</p>
                <p>{t('Details for Tutoring')}: {selectedFamily.details_for_tutoring || '---'}</p>
                <p>{t('Last Review Talk Conducted')}: {selectedFamily.last_review_talk_conducted || '---'}</p>
                <p>{t('Is In Group')}: {selectedFamily.is_in_group ? t('Yes') : t('No')}</p>
                <p>{t('Why Not In Group')}: {selectedFamily.is_in_group ? '---' : (selectedFamily.why_not_in_group || '---')}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                {hasCreatePermissionForTable("tutorships") && (
                  <button
                    className="filter-button"
                    onClick={() => handleManualMatch(selectedFamily)}
                    title={t("Create manual tutorship match for this family")}
                  >
                    {t("Manual Match")}
                  </button>
                )}
                <button onClick={closeFamilyDetails} style={{ marginLeft: 'auto' }}>{t('Close')}</button>
              </div>
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
                          street: "", // Clear street when city changes
                          apartment_number: "", // Clear apartment when city changes
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
                    value={newFamily.street ? streetOptions.find((option) => option.value === newFamily.street) : null}
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
                    type="text"
                    name="apartment_number"
                    value={newFamily.apartment_number}
                    onChange={handleAddFamilyChange}
                    className={errors.apartment_number ? "error" : ""}
                  />
                  {errors.apartment_number && <span className="families-error-message">{errors.apartment_number}</span>}

                  <label>{t('Child Phone Number')}</label>
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
                    onChange={handleAddFamilyChange}
                    maxLength="9"
                    placeholder="123456789"
                    className={errors.child_id ? "error" : ""}
                  />
                  {errors.child_id && <span className="families-error-message">{errors.child_id}</span>}

                  <label>{t('Registration Date')}</label>
                  <input
                    type="date"
                    name="registration_date"
                    value={newFamily.registration_date}
                    onChange={handleAddFamilyChange}
                    className={errors.registration_date ? "error" : ""}
                  />
                  {errors.registration_date && <span className="families-error-message">{errors.registration_date}</span>}
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

                  <label>{t('Is In Frame')}</label>
                  <textarea
                    name="is_in_frame"
                    value={newFamily.is_in_frame}
                    onChange={handleAddFamilyChange}
                    className="scrollable-textarea"
                  />

                  <label>{t('Coordinator Comments')}</label>
                  <textarea
                    name="coordinator_comments"
                    value={newFamily.coordinator_comments}
                    onChange={handleAddFamilyChange}
                    className="scrollable-textarea"
                  />

                  <label>{t('Is In Group')}</label>
                  <select
                    name="is_in_group"
                    value={newFamily.is_in_group ? "Yes" : "No"}
                    onChange={(e) =>
                      handleAddFamilyChange({
                        target: {
                          name: "is_in_group",
                          value: e.target.value === "Yes",
                        },
                      })
                    }
                  >
                    <option value="Yes">{t('Yes')}</option>
                    <option value="No">{t('No')}</option>
                  </select>

                  {!newFamily.is_in_group && (
                    <>
                      <label>{t('Why Not In Group')}</label>
                      <textarea
                        name="why_not_in_group"
                        value={newFamily.why_not_in_group}
                        onChange={handleAddFamilyChange}
                        placeholder={t('Reason for not being in group')}
                        className="scrollable-textarea"
                      />
                    </>
                  )}

                  <label>{t('Last Review Call Conducted')}</label>
                  <input
                    type="date"
                    name="last_review_talk_conducted"
                    value={newFamily.last_review_talk_conducted}
                    onChange={handleAddFamilyChange}
                    className={errors.last_review_talk_conducted ? "error" : ""}
                  />
                  {errors.last_review_talk_conducted && <span className="families-error-message">{errors.last_review_talk_conducted}</span>}
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

                  <label>{t('Is In Group')}</label>
                  <select
                    name="is_in_group"
                    value={newFamily.is_in_group ? "Yes" : "No"}
                    onChange={(e) =>
                      handleAddFamilyChange({
                        target: { name: "is_in_group", value: e.target.value === "Yes" },
                      })
                    }
                  >
                    <option value="Yes">{t('Yes')}</option>
                    <option value="No">{t('No')}</option>
                  </select>

                  <label>{t('Why Not In Group')}</label>
                  <input
                    type="text"
                    name="why_not_in_group"
                    value={newFamily.why_not_in_group}
                    onChange={handleAddFamilyChange}
                    disabled={newFamily.is_in_group}
                    placeholder={newFamily.is_in_group ? '---' : t('Reason for not being in group')}
                    style={{ opacity: newFamily.is_in_group ? 0.5 : 1 }}
                  />
                </div> {/* End of fifth form-column */}

                {/* Sixth form-column */}
                <div className="form-column">
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

                  <label>{t('Need Review')}</label>
                  <select
                    name="need_review"
                    value={newFamily.need_review ? "Yes" : "No"}
                    onChange={(e) =>
                      handleAddFamilyChange({
                        target: {
                          name: "need_review",
                          value: e.target.value === "Yes",
                        },
                      })
                    }
                  >
                    <option value="Yes">{t('Yes')}</option>
                    <option value="No">{t('No')}</option>
                  </select>

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
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                  {errors.tutoring_status && <span className="families-error-message">{errors.tutoring_status}</span>}

                  <label>{t('Responsible Coordinator')}</label>
                  {autoAssignedCoordinator && (
                    <div className="families-auto-assigned-note">
                      ✨ {t('Auto-assigned based on status')}
                    </div>
                  )}
                  <select
                    name="responsible_coordinator"
                    value={newFamily.responsible_coordinator}
                    onChange={handleAddFamilyChange}
                    className={errors.responsible_coordinator ? "error" : ""}
                    required
                  >
                    {/* Option for "ללא" (no coordinator) - for בריא/ז״ל/עזב children */}
                    <option value="ללא">ללא (אין רכז)</option>
                    {/* Other coordinators from the system */}
                    {availableCoordinators.map((coordinator, index) => (
                      <option key={index} value={coordinator.staff_id}>
                        {coordinator.name}
                      </option>
                    ))}
                  </select>
                  {errors.responsible_coordinator && <span className="families-error-message">{errors.responsible_coordinator}</span>}

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
                    type="text"
                    name="apartment_number"
                    value={newFamily.apartment_number}
                    onChange={handleAddFamilyChange}
                    className={errors.apartment_number ? "error" : ""}
                  />
                  {errors.apartment_number && <span className="families-error-message">{errors.apartment_number}</span>}

                  <label>{t('Child Phone Number')}</label>
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

                  <label>{t('Is In Frame')}</label>
                  <textarea
                    name="is_in_frame"
                    value={newFamily.is_in_frame}
                    onChange={handleAddFamilyChange}
                    className="scrollable-textarea"
                  />

                  <label>{t('Coordinator Comments')}</label>
                  <textarea
                    name="coordinator_comments"
                    value={newFamily.coordinator_comments}
                    onChange={handleAddFamilyChange}
                    className="scrollable-textarea"
                  />

                  <label>{t('Last Review Call Conducted')}</label>
                  <input
                    type="date"
                    name="last_review_talk_conducted"
                    value={newFamily.last_review_talk_conducted}
                    onChange={handleAddFamilyChange}
                    className={errors.last_review_talk_conducted ? "error" : ""}
                  />
                  {errors.last_review_talk_conducted && <span className="families-error-message">{errors.last_review_talk_conducted}</span>}
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

                  <label>{t('Is In Group')}</label>
                  <select
                    name="is_in_group"
                    value={newFamily.is_in_group ? "Yes" : "No"}
                    onChange={(e) =>
                      handleAddFamilyChange({
                        target: { name: "is_in_group", value: e.target.value === "Yes" },
                      })
                    }
                  >
                    <option value="Yes">{t('Yes')}</option>
                    <option value="No">{t('No')}</option>
                  </select>

                  <label>{t('Why Not In Group')}</label>
                  <input
                    type="text"
                    name="why_not_in_group"
                    value={newFamily.why_not_in_group}
                    onChange={handleAddFamilyChange}
                    disabled={newFamily.is_in_group}
                    placeholder={newFamily.is_in_group ? '---' : t('Reason for not being in group')}
                    style={{ opacity: newFamily.is_in_group ? 0.5 : 1 }}
                  />

                </div>
                <div className="form-column">
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

                  <label>{t('Need Review')}</label>
                  <select
                    name="need_review"
                    value={newFamily.need_review ? "Yes" : "No"}
                    onChange={(e) =>
                      handleAddFamilyChange({
                        target: {
                          name: "need_review",
                          value: e.target.value === "Yes",
                        },
                      })
                    }
                  >
                    <option value="Yes">{t('Yes')}</option>
                    <option value="No">{t('No')}</option>
                  </select>

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
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                  {errors.tutoring_status && <span className="families-error-message">{errors.tutoring_status}</span>}

                  <label>{t('Responsible Coordinator')}</label>
                  {autoAssignedCoordinator && (
                    <div className="families-auto-assigned-note">
                      ✨ {t('Auto-assigned based on status')}
                    </div>
                  )}
                  <select
                    name="responsible_coordinator"
                    value={newFamily.responsible_coordinator}
                    onChange={handleAddFamilyChange}
                    className={errors.responsible_coordinator ? "error" : ""}
                    required
                  >
                    {/* Option for "ללא" (no coordinator) - for בריא/ז״ל/עזב children */}
                    <option value="ללא">ללא (אין רכז)</option>
                    {/* Other coordinators from the system */}
                    {availableCoordinators.map((coordinator, index) => (
                      <option key={index} value={coordinator.staff_id}>
                        {coordinator.name}
                      </option>
                    ))}
                  </select>
                  {errors.responsible_coordinator && <span className="families-error-message">{errors.responsible_coordinator}</span>}

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
        {/* Import Families Modal */}
        {showImportModal && (
          <div className="modal show">
            <div className="modal-content">
              <span className="close" onClick={() => setShowImportModal(false)}>&times;</span>
              <h2>{t('Import Families')}</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleImportFamilies(); }}>
                <div className="form-group">
                  <label>{t('Select Excel File')}</label>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={importDryRun}
                      onChange={(e) => setImportDryRun(e.target.checked)}
                    />
                    {t('Dry Run (Preview Only)')}
                  </label>
                </div>
                <div className="modal-buttons">
                  <button type="submit" disabled={isImporting}>
                    {isImporting ? t('Importing...') : t('Import')}
                  </button>
                  <button type="button" onClick={() => setShowImportModal(false)}>
                    {t('Cancel')}
                  </button>
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

        {/* City Change Modal */}
        {showCityChangeModal && cityChangeData && (
          <>
            {console.log("Rendering city change modal with data:", cityChangeData)}
            <div className="tutor-vol-modal-overlay" onClick={handleCityChangeNo}>
              <div className="tutor-vol-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="tutor-vol-modal-header">
                  <h2>{t("City Change")}</h2>
                  <span className="tutor-vol-modal-close" onClick={handleCityChangeNo}>&times;</span>
                </div>
                <div className="tutor-vol-modal-body">
                  <p>{t("Changing a city of residence can have an actual effect on current matches")}</p>
                  <p>{t("Would you like to delete current tutorships for rematching?")}</p>
                </div>
                <div className="tutor-vol-modal-footer">
                  <button className="tutor-vol-btn-cancel" onClick={handleCityChangeNo}>
                    {t("No")}
                  </button>
                  <button className="tutor-vol-btn-confirm" onClick={handleCityChangeYes}>
                    {t("Yes")}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== DUPLICATE FAMILY CHECK MODAL ===== */}
        {/* ── Step 1: Grid of all duplicate candidates ── */}
        {showDupModal && !showDupDetailModal && pendingFamilyData && (
          <div className="tutor-vol-modal-overlay" onClick={() => setShowDupModal(false)}>
            <div className="tutor-vol-modal-content dup-modal-wide" onClick={e => e.stopPropagation()}>
              <div className="tutor-vol-modal-header">
                <h2>⚠️ {t('Possible Duplicate Families Detected')}</h2>
                <span className="tutor-vol-modal-close" onClick={() => setShowDupModal(false)}>&times;</span>
              </div>
              <div className="tutor-vol-modal-body dup-modal-body">
                <p className="dup-warning-text">
                  {t('The following existing families share key details. Click a row to compare side-by-side.')}
                </p>
                <table className="dup-table">
                  <thead>
                    <tr>
                      {[t('ID'), t('First Name'), t('Last Name'), t('Date of Birth'), t('City'), t('Mother Phone'), t('Father Phone'), t('Status')].map(h => (
                        <th key={h} className="dup-grid-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dupCandidates.map((c) => (
                      <tr
                        key={c.id}
                        className="dup-grid-row"
                        onClick={() => { setSelectedDupFamily(c); setShowDupDetailModal(true); }}
                      >
                        <td>{c.id}</td>
                        <td>{c.first_name}</td>
                        <td>{c.last_name}</td>
                        <td>{c.date_of_birth}</td>
                        <td>{c.city}</td>
                        <td>{c.mother_phone || '—'}</td>
                        <td>{c.father_phone || '—'}</td>
                        <td>{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="tutor-vol-modal-footer">
                <button
                  className="tutor-vol-btn-cancel"
                  onClick={() => { setShowDupModal(false); setPendingFamilyData(null); }}
                >
                  {t('Close & Fix')}
                </button>
                <button
                  className="tutor-vol-btn-confirm dup-btn-danger"
                  onClick={() => doCreateFamily(pendingFamilyData, true)}
                >
                  {t('Create Anyway')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Side-by-side comparison for selected candidate ── */}
        {showDupDetailModal && selectedDupFamily && pendingFamilyData && (
          <div className="tutor-vol-modal-overlay" onClick={() => setShowDupDetailModal(false)}>
            <div className="tutor-vol-modal-content dup-modal-medium" onClick={e => e.stopPropagation()}>
              <div className="tutor-vol-modal-header">
                <h2>🔍 {selectedDupFamily.first_name} {selectedDupFamily.last_name} (#{selectedDupFamily.id})</h2>
                <span className="tutor-vol-modal-close" onClick={() => setShowDupDetailModal(false)}>&times;</span>
              </div>
              <div className="tutor-vol-modal-body dup-modal-body">
                {(() => {
                  const fmtDate = (v) => {
                    if (!v) return '';
                    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                      const [y, m, d] = v.split('-');
                      return `${d}/${m}/${y}`;
                    }
                    return v;
                  };

                  const COMPARE_FIELDS = [
                    { key: 'childfirstname',    existingKey: 'first_name',        label: t('First Name') },
                    { key: 'childsurname',       existingKey: 'last_name',         label: t('Last Name') },
                    { key: 'date_of_birth',      existingKey: 'date_of_birth',     label: t('Date of Birth'), fmt: fmtDate },
                    { key: 'gender',             existingKey: 'gender',            label: t('Gender'), newDisplay: pendingFamilyData.gender },
                    { key: 'city',               existingKey: 'city',              label: t('City') },
                    { key: 'child_phone_number', existingKey: 'child_phone_number',label: t('Child Phone') },
                    { key: 'mother_name',        existingKey: 'mother_name',       label: t('Mother Name') },
                    { key: 'mother_phone',       existingKey: 'mother_phone',      label: t('Mother Phone') },
                    { key: 'father_name',        existingKey: 'father_name',       label: t('Father Name') },
                    { key: 'father_phone',       existingKey: 'father_phone',      label: t('Father Phone') },
                    { key: 'treating_hospital',  existingKey: 'treating_hospital', label: t('Treating Hospital') },
                    { key: 'medical_diagnosis',  existingKey: 'medical_diagnosis', label: t('Medical Diagnosis') },
                    { key: 'tutoring_status',    existingKey: 'tutoring_status',   label: t('Tutoring Status') },
                    { key: 'status',             existingKey: 'status',            label: t('Status') },
                  ];

                  const isSimilar = (a, b) => {
                    const na = (a || '').toString().trim().toLowerCase();
                    const nb = (b || '').toString().trim().toLowerCase();
                    return na && nb && na === nb;
                  };

                  return (
                    <table className="dup-table">
                      <thead>
                        <tr>
                          <th className="dup-compare-label-th">{t('Field')}</th>
                          <th className="dup-compare-new-th">🆕 {t('New Family')}</th>
                          <th className="dup-compare-existing-th">📁 {t('Existing')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPARE_FIELDS.map(({ key, existingKey, label, newDisplay, fmt }) => {
                          const rawNew   = newDisplay !== undefined ? newDisplay : (pendingFamilyData[key] || '');
                          const rawExist = selectedDupFamily[existingKey] || '';
                          const newVal   = fmt ? fmt(rawNew)   : rawNew;
                          const existVal = fmt ? fmt(rawExist) : rawExist;
                          const highlight = isSimilar(newVal, existVal);
                          return (
                            <tr key={key}>
                              <td className="dup-compare-label-td">{label}</td>
                              <td className={`dup-compare-cell${highlight ? ' match' : ''}`}>{newVal || '—'}</td>
                              <td className={`dup-compare-cell${highlight ? ' match' : ''}`}>{existVal || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
                <p className="dup-hint-text">
                  {t('If you are sure this is a different family, you can proceed. Otherwise, close this window and correct the highlighted fields.')}
                </p>
              </div>
              <div className="tutor-vol-modal-footer">
                <button
                  className="tutor-vol-btn-cancel dup-footer-back"
                  onClick={() => setShowDupDetailModal(false)}
                >
                  ← {t('Back to List')}
                </button>
                <button
                  className="tutor-vol-btn-cancel"
                  onClick={() => { setShowDupModal(false); setShowDupDetailModal(false); setPendingFamilyData(null); }}
                >
                  {t('Close & Fix')}
                </button>
                <button
                  className="tutor-vol-btn-confirm dup-btn-danger"
                  onClick={() => doCreateFamily(pendingFamilyData, true)}
                >
                  {t('Create Anyway')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Celebration Effect - Paper planes, toy emojis, butterflies */}
        {showCelebration && (
          <CelebrationEffect 
            isActive={showCelebration}
            onComplete={() => setShowCelebration(false)} 
            userName={celebrationFamilyName}
            celebrationType="family"
          />
        )}
      </div>
    </div>
  );
};

export default Families;