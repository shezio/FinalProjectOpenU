import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/families.css";
import '../styles/systemManagement.css'; // Special CSS for this page
import '../styles/tut_vol_mgmt.css'; // Special CSS for this page
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import axios from "../axiosConfig";
import { showErrorToast } from "../components/toastUtils";

const PAGE_SIZE = 8;

const TutorVolunteerMgmt = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showTutors, setShowTutors] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [tutorshipStatusOptions, setTutorshipStatusOptions] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [sortOrderUpdated, setSortOrderUpdated] = useState('desc');
  const [searchTerm, setSearchTerm] = useState("");
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);
  const [citiesOptions, setCitiesOptions] = useState([]);
  const [tutorshipStatusFilter, setTutorshipStatusFilter] = useState("");
  const [showCityChangeModal, setShowCityChangeModal] = useState(false);
  const [cityChangeData, setCityChangeData] = useState(null);
  
  // Tutorship Details Modal state
  const [showTutorshipDetailsModal, setShowTutorshipDetailsModal] = useState(false);
  const [tutorshipDetailsData, setTutorshipDetailsData] = useState(null);

  const startEdit = (entity, field, type) => {
    const rowId = entity.id; // Always use id for tutors and volunteers
    setEditingCell({ rowId, field, type });
    setEditValue(entity[field] || "");
  };

  const validateIsraeliId = (id) => {
    const idStr = String(id).trim();
    if (!/^\d{9}$/.test(idStr)) {
      return false;
    }
    return true;
  };

  const validatePhone = (phone) => {
    // Remove dashes and spaces from phone number before validation
    const phoneStr = String(phone).trim().replace(/[-\s]/g, '');
    if (!/^0\d{9}$/.test(phoneStr)) {
      return false;
    }
    return true;
  };

  // Validate birth date in dd/mm/yyyy format and return { valid, error, date }
  const validateBirthDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === "" || dateStr === "-") {
      return { valid: true, date: null }; // Allow empty/clearing the field
    }
    
    const trimmed = dateStr.trim();
    // Check format dd/mm/yyyy
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = trimmed.match(dateRegex);
    
    if (!match) {
      return { valid: false, error: t("Invalid date format. Please use DD/MM/YYYY") };
    }
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Validate month
    if (month < 1 || month > 12) {
      return { valid: false, error: t("Month must be between 01 and 12") };
    }
    
    // Validate day for month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return { valid: false, error: t("Invalid day for the selected month") };
    }
    
    // Create date object
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Cannot be in the future
    if (date > today) {
      return { valid: false, error: t("Date cannot be in the future") };
    }
    
    // Calculate age - must be between 18 and 120
    const age = Math.floor((today - date) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      return { valid: false, error: t("Age must be at least 18") };
    }
    if (age > 120) {
      return { valid: false, error: t("Date cannot be more than 120 years ago") };
    }
    
    // Return formatted date string dd/mm/yyyy
    const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    return { valid: true, date: formattedDate };
  };

  // Normalize phone number - remove dashes and spaces
  const normalizePhone = (phone) => {
    if (!phone) return '';
    return String(phone).replace(/[-\s]/g, '');
  };

  // Format phone for display: XXX-XXXXXXX
  const formatPhoneDisplay = (phone) => {
    if (!phone) return null;
    const normalized = String(phone).replace(/[-\s]/g, '');
    if (normalized.length === 10) {
      return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
    }
    return phone; // Return as-is if invalid format
  };

  // Format status display: replace underscores with spaces
  const formatStatusDisplay = (status) => {
    if (!status) return status;
    return String(status).replace(/_/g, ' ');
  };

  // Get color for tutorship status
  const getStatusColor = (entity) => {
    if (entity.eligibility === "ממתין לראיון" && entity.tutorship_status === "אין_חניך") {
      return "orange";
    }
    
    switch (entity.tutorship_status) {
      case "יש_חניך":
        return "green";
      case "אין_חניך":
        return "red";
      case "לא_זמין_לשיבוץ":
        return "gray";
      default:
        return "inherit";
    }
  };

  const confirmEdit = (entity, field, valueToSave = null, editingCellData = null) => {
    // Use provided value or the current editValue
    const newValue = valueToSave !== null ? valueToSave : editValue;
    const cellData = editingCellData || editingCell;
    
    if (newValue !== entity[field]) {
      // Handle special case for city update - save first, then show modal only if tutor has active tutorship
      if (field === "city") {
        // First save the city - send only the city field, not the whole entity
        const updatePayload = { city: newValue };
        if (cellData.type === "tutor") {
          axios.put(`/api/update_tutor/${cellData.rowId}/`, updatePayload)
            .then(() => {
              // Only show modal if tutor has active tutorship (יש_חניך)
              if (entity.tutorship_status === "יש_חניך") {
                const updatedEntity = { ...entity, city: newValue };
                setCityChangeData({
                  entity: updatedEntity,
                  field,
                  newValue: newValue,
                  type: cellData.type
                });
                setShowCityChangeModal(true);
              } else {
                // No active tutorship - just show success toast
                toast.success(t("City updated successfully"));
              }
              
              // Then refresh grid
              setTimeout(() => fetchGridData(), 300);
            })
            .catch((error) => {
              if (error.response?.status === 401) {
                showErrorToast(t, "You do not have permission to update tutors.", error);
              } else {
                showErrorToast(t, "Error updating city", error);
              }
            });
        } else {
          // Volunteers don't have tutorships, just save and show toast
          axios.put(`/api/update_general_volunteer/${cellData.rowId}/`, updatePayload)
            .then(() => {
              toast.success(t("Volunteer updated successfully"));
              // Then refresh grid
              setTimeout(() => fetchGridData(), 300);
            })
            .catch((error) => {
              if (error.response?.status === 401) {
                showErrorToast(t, "You do not have permission to update volunteers.", error);
              } else {
                showErrorToast(t, "Error updating volunteer", error);
              }
            });
        }
        setEditingCell(null);
        setEditValue("");
        return;
      }
      
      // Handle special case for ID update
      if (field === "id") {
        if (!validateIsraeliId(editValue)) {
          toast.error(t("Invalid ID format. Israeli ID must be exactly 9 digits."));
          setEditingCell(null);
          setEditValue("");
          return;
        }
        axios.put(`/api/update_volunteer_id/${entity.id}/`, { new_id: editValue })
          .then((response) => {
            toast.success(t("ID updated successfully"));
            fetchGridData();
          })
          .catch((error) => {
            if (error.response?.data?.error) {
              showErrorToast(t, '', error);  // Pass empty key to show only backend message
            } else if (error.response?.status === 401) {
              showErrorToast(t, "You do not have permission to update IDs.", error);
            } else {
              showErrorToast(t, "Error updating ID", error);
            }
          });
        setEditingCell(null);
        setEditValue("");
        return;
      }
      
      // Handle special case for phone update
      if (field === "phone") {
        if (!validatePhone(editValue)) {
          toast.error(t("Invalid phone format. Phone must be exactly 10 digits starting with 0."));
          setEditingCell(null);
          setEditValue("");
          return;
        }
        // Send normalized phone (without dashes)
        const normalizedPhone = normalizePhone(editValue);
        axios.put(`/api/update_volunteer_phone/${entity.id}/`, { phone: normalizedPhone })
          .then((response) => {
            toast.success(t("Phone updated successfully"));
            fetchGridData();
          })
          .catch((error) => {
            if (error.response?.data?.error) {
              showErrorToast(t, '', error);  // Pass empty key to show only backend message
            } else if (error.response?.status === 401) {
              showErrorToast(t, "You do not have permission to update phone numbers.", error);
            } else {
              showErrorToast(t, "Error updating phone", error);
            }
          });
        setEditingCell(null);
        setEditValue("");
        return;
      }
      
      // Handle special case for birth_date update
      if (field === "birth_date") {
        const validation = validateBirthDate(editValue);
        if (!validation.valid) {
          toast.error(validation.error);
          setEditingCell(null);
          setEditValue("");
          return;
        }
        
        // Send birth_date to backend - it will recalculate age
        const updatePayload = { birth_date: validation.date };
        const endpoint = cellData.type === "tutor" 
          ? `/api/update_tutor/${cellData.rowId}/`
          : `/api/update_general_volunteer/${cellData.rowId}/`;
        
        axios.put(endpoint, updatePayload)
          .then(() => {
            toast.success(t("Birth date updated successfully"));
            fetchGridData();
          })
          .catch((error) => {
            if (error.response?.data?.error) {
              showErrorToast(t, '', error);
            } else if (error.response?.status === 401) {
              showErrorToast(t, cellData.type === "tutor" 
                ? "You do not have permission to update tutors." 
                : "You do not have permission to update volunteers.", error);
            } else {
              showErrorToast(t, "Error updating birth date", error);
            }
          });
        setEditingCell(null);
        setEditValue("");
        return;
      }
      
      const updatedEntity = { ...entity, [field]: newValue };
      if (cellData.type === "tutor") {
        axios.put(`/api/update_tutor/${cellData.rowId}/`, updatedEntity)
          .then(() => {
            toast.success(t("Tutor updated successfully"));
            fetchGridData();
          })
          .catch((error) => {
            if (error.response?.status === 401) {
              showErrorToast(t, "You do not have permission to update tutors.", error);
            } else {
              showErrorToast(t, "Error updating tutor", error);
            }
          });
      } else {
        axios.put(`/api/update_general_volunteer/${cellData.rowId}/`, updatedEntity)
          .then(() => {
            toast.success(t("Volunteer updated successfully"));
            fetchGridData();
          })
          .catch((error) => {
            if (error.response?.status === 401) {
              showErrorToast(t, "You do not have permission to update volunteers.", error);
            } else {
              showErrorToast(t, "Error updating volunteer", error);
            }
          });
      }
    }
    // Always reset edit state, even if no change
    setEditingCell(null);
    setEditValue("");
  };

  const handleCityChangeYes = async () => {
    if (!cityChangeData) return;
    
    // City is already saved, now redirect to tutorships page with the name in state
    try {
      const name = cityChangeData.entity.name || 
                  (cityChangeData.entity.first_name + " " + cityChangeData.entity.last_name);
      
      navigate('/tutorships', { state: { filterByName: name } });
    } catch (error) {
      showErrorToast(t, "Error navigating to tutorships", error);
    }
    
    setShowCityChangeModal(false);
    setCityChangeData(null);
  };

  const handleCityChangeNo = () => {
    // User clicked "No" - city is already saved, just close modal and return to grid
    setShowCityChangeModal(false);
    setCityChangeData(null);
  };

  const handleSaveTutorshipDetails = async () => {
    if (!tutorshipDetailsData) return;
    
    try {
      await axios.put(`/api/update_tutor/${tutorshipDetailsData.tutorId}/`, {
        preferences: tutorshipDetailsData.preferences,
        relationship_status: tutorshipDetailsData.relationship_status,
        tutee_wellness: tutorshipDetailsData.tutee_wellness
      });
      toast.success(t("Tutorship details saved successfully"));
      fetchGridData();
      setShowTutorshipDetailsModal(false);
      setTutorshipDetailsData(null);
    } catch (error) {
      if (error.response?.status === 401) {
        showErrorToast(t, "You do not have permission to update tutors.", error);
      } else {
        showErrorToast(t, "Error saving tutorship details", error);
      }
    }
  };

  useEffect(() => {
    fetchGridData();
  }, [showTutors]);

  const fetchGridData = () => {
    setLoading(true);
    if (showTutors) {
      axios.get("/api/tutors/")
        .then(res => {
          setTutors(res.data.tutors || []);
          setTutorshipStatusOptions(res.data.tutorship_status_options || []);
          setMaritalStatusOptions(res.data.marital_status_options || []);
          setCitiesOptions(res.data.cities_options || []);
          setTotalCount((res.data.tutors || []).length);
          setCurrentPage(1);
        })
        .catch(() => toast.error(t("Error fetching tutors")))
        .finally(() => setLoading(false));
    } else {
      axios.get("/api/get_general_volunteers_not_pending/")
        .then(res => {
          setVolunteers(res.data.general_volunteers || []); // <-- fix here
          setTotalCount((res.data.general_volunteers || []).length); // <-- fix here
          setCurrentPage(1);
        })
        .catch(() => toast.error(t("Error fetching volunteers")))
        .finally(() => setLoading(false));
    }
  };

  const toggleGrid = () => {
    setLoading(false);      // Hide loader during flip
    setIsRotating(true);
    setTimeout(() => {
      setShowTutors((prev) => !prev);
      setIsRotating(false);
      fetchGridData();      // This will set loading=true after flip
    }, 500); // match your animation duration
  };

  const refreshGrid = () => {
    fetchGridData();
  };

  const openEditModal = (entity, type) => {
    setEditData({ ...entity, type });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditData({});
  };

  const handleEditSave = () => {
    if (editData.type === "tutor") {
      axios.put(`/api/update_tutor/${editData.id_id}/`, editData)
        .then(() => {
          toast.success(t("Tutor updated successfully"));
          fetchGridData();
          closeEditModal();
        })
        .catch((error) => {
          if (error.response?.status === 401) {
            showErrorToast(t, "You do not have permission to update tutors.", error);
          } else {
            showErrorToast(t, "Error updating tutor", error);
          }
        });
    } else {
      axios.put(`/api/update_general_volunteer/${editData.id_id}/`, editData)
        .then(() => {
          toast.success(t("Volunteer updated successfully"));
          fetchGridData();
          closeEditModal();
        })
        .catch((error) => {
          if (error.response?.status === 401) {
            showErrorToast(t, "You do not have permission to update volunteers.", error);
          } else {
            showErrorToast(t, "Error updating volunteer", error);
          }
        });
    }
  };

  const sortEntitiesByUpdated = (entities) => {
    return [...entities].sort((a, b) => {
      const dateA = new Date(a.updated || a.signupdate || 0);
      const dateB = new Date(b.updated || b.signupdate || 0);
      return sortOrderUpdated === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const filterEntities = (entities) => {
    const term = searchTerm.trim().toLowerCase();
    // Normalize search term for phone matching (remove dashes and spaces)
    const normalizedTerm = term.replace(/[-\s]/g, '');
    
    return entities.filter(entity => {
      // Apply search term filter
      if (term) {
        const name = (entity.name || (entity.first_name + " " + entity.last_name) || "").toLowerCase();
        const email = (entity.tutor_email || entity.email || "").toLowerCase();
        const phone = (entity.phone || "").toLowerCase();
        // Normalize phone for comparison (remove dashes and spaces)
        const normalizedPhone = phone.replace(/[-\s]/g, '');
        const id = String(entity.id || "").toLowerCase();
        
        // Check if term matches any field - for phone, check both with and without dashes
        if (!name.includes(term) && 
            !email.includes(term) && 
            !phone.includes(term) && 
            !normalizedPhone.includes(normalizedTerm) &&
            !id.includes(term)) {
          return false;
        }
      }
      
      // Apply tutorship status filter (only for tutors)
      if (showTutors && tutorshipStatusFilter) {
        // Special case: "ממתין לראיון" filters by eligibility field
        if (tutorshipStatusFilter === "ממתין לראיון") {
          // Show only tutors with eligibility="ממתין לראיון" AND tutorship_status="אין_חניך"
          if (entity.eligibility !== "ממתין לראיון" || entity.tutorship_status !== "אין_חניך") {
            return false;
          }
        } else {
          // Regular tutorship status filter - exclude "ממתין לראיון" tutors
          if (entity.tutorship_status !== tutorshipStatusFilter || entity.eligibility === "ממתין לראיון") {
            return false;
          }
        }
      }
      
      return true;
    });
  };

  const filteredTutors = filterEntities(tutors);
  const filteredVolunteers = filterEntities(volunteers);

  // Pagination logic
  const paginatedEntities = showTutors
    ? sortEntitiesByUpdated(filteredTutors).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : sortEntitiesByUpdated(filteredVolunteers).slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil((showTutors ? filteredTutors.length : filteredVolunteers.length) / PAGE_SIZE));

  // Animation CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .flip-animation {
        animation: flipGrid 1s linear;
        transform-style: preserve-3d;
      }
      @keyframes flipGrid {
        0% { transform: rotateY(0deg); }
        100% { transform: rotateY(-360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const formatUpdatedDate = (dateStr) => {
    if (!dateStr) return t("No updates yet");
    const dateObj = new Date(dateStr);
    const today = new Date();
    const isToday =
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear();

    if (isToday) {
      // Show 24H format: HH:mm
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } else {
      // Show dd/mm/yyyy
      return dateObj.toLocaleDateString('en-GB');
    }
  };

  // Helper render functions
  const renderTutorsGrid = () => (
    showTutors && !loading && (
      <>
        <table className="tutor-vol-data-grid">
          <thead>
            <tr>
              {showTutors ? (
                <>
                  <th>{t("Israeli ID")}</th>
                  <th>{t("Birth Date")}</th>
                  <th>{t("Age")}</th>
                  <th>{t("Phone")}</th>
                  <th>{t("Name")}</th>
                  <th>{t("Email")}</th>
                  <th>{t("City")}</th>
                  <th>{t("Tutorship Status")}</th>
                  <th>{t("Tutorship")}</th>
                  <th>
                    {t("Updated")}
                    <button
                      className="sort-button"
                      onClick={() => setSortOrderUpdated((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      style={{ marginLeft: "4px" }}
                    >
                      {sortOrderUpdated === 'asc' ? '▲' : '▼'}
                    </button>
                  </th>
                </>
              ) : (
                <>
                  <th>{t("ID")}</th>
                  <th>{t("Name")}</th>
                  <th>{t("Email")}</th>
                  <th>{t("Comments")}</th>
                  <th>
                    {t("Updated")}
                    <button
                      className="sort-button"
                      onClick={() => setSortOrderUpdated((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      style={{ marginLeft: "4px" }}
                    >
                      {sortOrderUpdated === 'asc' ? '▲' : '▼'}
                    </button>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedEntities.length === 0 ? (
              <tr><td colSpan={showTutors ? 10 : 10}>{t("No data to display")}</td></tr>
            ) : (
              paginatedEntities.map((entity, idx) => (
                <tr key={entity.id_id || entity.id || idx}>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "id", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "id" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "id")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "id")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      entity.id
                    )}
                  </td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "birth_date", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "birth_date" ? (
                      <input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "birth_date")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "birth_date")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      entity.birth_date || "-"
                    )}
                  </td>
                  <td>{entity.age || "-"}</td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "phone", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "phone" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "phone")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "phone")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      formatPhoneDisplay(entity.phone) || "-"
                    )}
                  </td>
                  <td>{entity.name || entity.first_name + " " + entity.last_name}</td>
                  <td>{entity.tutor_email || entity.email || "-"}</td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "city", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "city" ? (
                      <select
                        value={editValue}
                        onChange={e => {
                          setEditValue(e.target.value);
                        }}
                        onBlur={(e) => confirmEdit(entity, "city", e.currentTarget.value, { rowId: entity.id, field: "city", type: "tutor" })}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmEdit(entity, "city", e.currentTarget.value, { rowId: entity.id, field: "city", type: "tutor" });
                          }
                        }}
                        autoFocus
                      >
                        <option value="">{t("Select a city")}</option>
                        {citiesOptions.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    ) : (
                      entity.city || "-"
                    )}
                  </td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "tutorship_status", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "tutorship_status" ? (
                      <select
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "tutorship_status")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      >
                        {tutorshipStatusOptions.map(opt => (
                          <option key={opt} value={opt}>{formatStatusDisplay(opt)}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        color: getStatusColor(entity),
                        fontWeight: "bold"
                      }}>
                        {/* Show "ממתין לראיון" instead of "אין_חניך" if tutor is pending interview */}
                        {entity.eligibility === "ממתין לראיון" && entity.tutorship_status === "אין_חניך" 
                          ? "ממתין לראיון" 
                          : formatStatusDisplay(entity.tutorship_status)}
                      </span>
                    )}
                  </td>
                  <td>
                    {/* Show Details button only for tutors with active/pending tutorship */}
                    {(entity.tutorship_status === "יש_חניך") && (
                      <button
                        className="details-button"
                        onClick={() => {
                          setTutorshipDetailsData({
                            tutorId: entity.id,
                            entity: entity,
                            preferences: entity.preferences || "",
                            relationship_status: entity.relationship_status || "",
                            tutee_wellness: entity.tutee_wellness || "",
                          });
                          setShowTutorshipDetailsModal(true);
                        }}
                      >
                        {t("Show Details")}
                      </button>
                    )}
                  </td>
                  <td>
                    {entity.updated ? formatUpdatedDate(entity.updated) : t("No updates yet")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="pagination">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-arrow">&laquo;</button>
          <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-arrow">&lsaquo;</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={currentPage === i + 1 ? "active" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-arrow">&rsaquo;</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="pagination-arrow">&raquo;</button>
        </div>
      </>
    )
  );

  const renderVolunteersGrid = () => (
    !showTutors && !loading && (
      <>
        <table className="tutor-vol-data-grid">
          <thead>
            <tr>
              <th>{t("Israeli ID")}</th>
              <th>{t("Phone")}</th>
              <th>{t("Name")}</th>
              <th>{t("Birth Date")}</th>
              <th>{t("Age")}</th>
              <th>{t("Email")}</th>
              <th>{t("City")}</th>
              <th>{t("Comments")}</th>
              <th>
                {t("Updated")}
                <button
                  className="sort-button"
                  onClick={() => setSortOrderUpdated((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  style={{ marginLeft: "4px" }}
                >
                  {sortOrderUpdated === 'asc' ? '▲' : '▼'}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedEntities.length === 0 ? (
              <tr><td colSpan={9}>{t("No data to display")}</td></tr>
            ) : (
              paginatedEntities.map((entity, idx) => (
                <tr key={entity.id_id || entity.id || idx}>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "id", "volunteer")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "id" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "id")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "id")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      entity.id
                    )}
                  </td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "phone", "volunteer")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "phone" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "phone")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "phone")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      formatPhoneDisplay(entity.phone) || "-"
                    )}
                  </td>
                  <td>{entity.first_name + " " + entity.last_name}</td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "birth_date", "volunteer")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "birth_date" ? (
                      <input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "birth_date")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "birth_date")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      entity.birth_date || "-"
                    )}
                  </td>
                  <td>{entity.age || "-"}</td>
                  <td>{entity.email}</td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "city", "volunteer")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "city" ? (
                      <select
                        value={editValue}
                        onChange={e => {
                          setEditValue(e.target.value);
                        }}
                        onBlur={(e) => confirmEdit(entity, "city", e.currentTarget.value, { rowId: entity.id, field: "city", type: "volunteer" })}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmEdit(entity, "city", e.currentTarget.value, { rowId: entity.id, field: "city", type: "volunteer" });
                          }
                        }}
                        autoFocus
                      >
                        <option value="">{t("Select a city")}</option>
                        {citiesOptions.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    ) : (
                      entity.city || "-"
                    )}
                  </td>
                  <td
                    className="tutor-vol-editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "comments", "volunteer")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "comments" ? (
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "comments")}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingCell(null);
                            setEditValue("");
                          } else if (e.key === 'Enter' && (e.altKey || e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            setEditValue(editValue + '\n');
                          } else if (e.key === 'Enter' && !e.altKey && !e.metaKey && !e.ctrlKey) {
                            e.preventDefault();
                            confirmEdit(entity, "comments");
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="tutor-vol-text-cell-content">{entity.comments || "-"}</span>
                    )}
                  </td>
                  <td>
                    {entity.updated ? formatUpdatedDate(entity.updated) : entity.signupdate ? formatUpdatedDate(entity.signupdate) : t("No updates yet")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="pagination">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-arrow">&laquo;</button>
          <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-arrow">&lsaquo;</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={currentPage === i + 1 ? "active" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className="pagination-arrow">&rsaquo;</button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="pagination-arrow">&raquo;</button>
        </div>
      </>
    )
  );

  // Determine which face is active (controls .active CSS)
  const activeSide = showTutors ? "front" : "back";

  return (
    <div className="families-main-content">
      <Sidebar />
      <div className="content">
        <InnerPageHeader title={showTutors ? t("Tutors Management") : t("Volunteers Management")} />
        <div className="filter-create-container">
          <button onClick={toggleGrid} className="toggle-healthy-btn">
            {showTutors ? t("Show Tutors") : t("Show Volunteers")}
          </button>
          <button onClick={refreshGrid} className="refresh-volunteers-tutors-btn">
            {showTutors ? t("Refresh Tutors List") : t("Refresh Volunteers List")}
          </button>
          {showTutors && (
            <select
              className="tutorship-status-filter"
              value={tutorshipStatusFilter}
              onChange={(e) => {
                setTutorshipStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">{t("All Tutorship Statuses")}</option>
              <option value="ממתין לראיון">ממתין לראיון</option>
              {tutorshipStatusOptions.map(status => (
                <option key={status} value={status}>{formatStatusDisplay(status)}</option>
              ))}
            </select>
          )}
          <input
            className="search-bar"
            type="text"
            placeholder={t("Search by name, email, phone or ID")}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="families-grid-wrapper">
          {/* Replace the cube grid with the new flip structure */}
          <div className="flip-wrapper">
            <div className={`flip-inner${isRotating ? ' rotating' : ''}`}>
              <div className={`flip-front ${activeSide === 'front' ? 'active' : ''}`}>
                {/* Tutors table */}
                {renderTutorsGrid()}
              </div>
              <div className={`flip-back ${activeSide === 'back' ? 'active' : ''}`}>
                {/* Volunteers table */}
                {renderVolunteersGrid()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tutorship Details Modal */}
      {showTutorshipDetailsModal && tutorshipDetailsData && (
        <div className="tutor-vol-modal-overlay" onClick={() => setShowTutorshipDetailsModal(false)}>
          <div className="tutor-vol-modal-content tutorship-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tutor-vol-modal-header tutorship-details-header">
              <h2>{t("Tutorship Details")}</h2>
              <span className="tutor-vol-modal-close" onClick={() => setShowTutorshipDetailsModal(false)}>&times;</span>
            </div>
            <div className="tutor-vol-modal-body tutorship-details-body">
              <div className="tutorship-detail-row">
                <h3>{t("Preferences")}</h3>
                <textarea
                  className="tutorship-detail-textarea"
                  value={tutorshipDetailsData.preferences}
                  onChange={(e) => setTutorshipDetailsData({
                    ...tutorshipDetailsData,
                    preferences: e.target.value
                  })}
                  placeholder={t("Enter preferences...")}
                />
              </div>
              <div className="tutorship-detail-row">
                <h3>{t("Relationship Status")}</h3>
                <select
                  className="tutorship-detail-select"
                  value={tutorshipDetailsData.relationship_status}
                  onChange={(e) => setTutorshipDetailsData({
                    ...tutorshipDetailsData,
                    relationship_status: e.target.value
                  })}
                >
                  <option value="">{t("Select a marital status")}</option>
                  {maritalStatusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="tutorship-detail-row">
                <h3>{t("Tutee Wellness")}</h3>
                <textarea
                  className="tutorship-detail-textarea"
                  value={tutorshipDetailsData.tutee_wellness}
                  onChange={(e) => setTutorshipDetailsData({
                    ...tutorshipDetailsData,
                    tutee_wellness: e.target.value
                  })}
                  placeholder={t("Enter tutee wellness info...")}
                />
              </div>
            </div>
            <div className="tutor-vol-modal-footer">
              <button className="tutor-vol-btn-cancel" onClick={() => setShowTutorshipDetailsModal(false)}>
                {t("Close")}
              </button>
              <button className="tutor-vol-btn-save" onClick={handleSaveTutorshipDetails}>
                {t("Save and Close")}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* City Change Modal - MOVED OUTSIDE content div */}
      {showCityChangeModal && cityChangeData && (
        <>
          {console.log("Rendering modal with data:", cityChangeData)}
          <div className="tutor-vol-modal-overlay" onClick={handleCityChangeNo}>
            <div className="tutor-vol-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="tutor-vol-modal-header">
                <h2>{t("City Change")}</h2>
                <span className="tutor-vol-modal-close" onClick={handleCityChangeNo}>&times;
                </span>
              </div>
              <div className="tutor-vol-modal-body">
                <p>{t("Changing a city of residence can have an actual effect on current matches")}
                </p> 
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
    </div>
  );
};

export default TutorVolunteerMgmt;
