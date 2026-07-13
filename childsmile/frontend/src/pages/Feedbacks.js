import Select, { components } from "react-select";
import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/reports.css";
import "../styles/feedbacks.css";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import axios from "../axiosConfig";
import { hasAllPermissions, hasViewPermissionForTable, navigateTo } from '../components/utils';
import { feedbackShowErrorToast } from "../components/toastUtils";
import hospitals from "../components/hospitals.json";

// Custom react-select option with a checkbox, used for multi-select fields
const CheckboxOption = (props) => (
  <components.Option {...props}>
    <input
      type="checkbox"
      checked={props.isSelected}
      onChange={() => null}
      className="feedbacks-multiselect-option-checkbox"
    />
    <span>{props.label}</span>
  </components.Option>
);

// Parse a DD/MM/YYYY date string into a Date for sorting.
const parseFeedbackDate = (dateString) => {
  if (!dateString) return new Date(0);
  const [day, month, year] = dateString.split("/");
  return new Date(`${year}-${month}-${day}`);
};

// Default feedback-list ordering: newest first by creation timestamp
// (feedback_id breaks same-day ties so a just-created row appears on top).
const sortByTimestampDesc = (list) =>
  [...list].sort((a, b) => {
    const diff =
      parseFeedbackDate(b.feedback_filled_at) - parseFeedbackDate(a.feedback_filled_at);
    if (diff !== 0) return diff;
    return (b.feedback_id || 0) - (a.feedback_id || 0);
  });

const hospitalsList = hospitals.map((hospital) => hospital.trim()).filter((hospital) => hospital !== "");

const ENABLE_BULK_DELETE = process.env.REACT_APP_ENABLE_BULK_DELETE === 'true';

const Feedbacks = () => {
  const { t } = useTranslation();
  // Read permission at render time (not module load). Module-level evaluation runs
  // once at app startup — before login — and would stay a stale "no permission"
  // until a manual browser refresh re-imported the module. A user may view the
  // unified feedbacks page with VIEW on EITHER legacy resource.
  const hasFeedbacksViewPermission =
    hasViewPermissionForTable("tutor_feedback") || hasViewPermissionForTable("general_v_feedback");
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [canDelete, setCanDelete] = useState(false);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState([]);
  const tbodyRef = useRef(null);
  const PAGE_SIZE = 3;
  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredFeedbacks.length / PAGE_SIZE));
    if (currentPage > tp) setCurrentPage(tp);
  }, [PAGE_SIZE, filteredFeedbacks.length, currentPage]);


  // Filters
  const [eventFrom, setEventFrom] = useState("");
  const [eventTo, setEventTo] = useState("");
  const [feedbackFrom, setFeedbackFrom] = useState("");
  const [feedbackTo, setFeedbackTo] = useState("");

  // Sorting
  const [sortOrderEventDate, setSortOrderEventDate] = useState('desc');
  const [sortOrderFeedbackDate, setSortOrderFeedbackDate] = useState('desc');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [modalErrors, setModalErrors] = useState({});
  const [infoModalData, setInfoModalData] = useState(null);
  const [showAdditionalVolunteersDropdown, setShowAdditionalVolunteersDropdown] = useState(false);
  const [additionalVolunteersSearch, setAdditionalVolunteersSearch] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  // Free-text volunteer/tutor name entry: tracks the text typed into the filler
  // Select so an unlisted name can be confirmed (✓) straight from the dropdown.
  const [fillerInput, setFillerInput] = useState("");
  const fillerSelectRef = useRef(null);

  // Bulk-edit (admins only): reassign every feedback attributed to volunteer X
  // over to volunteer Y, sending one PUT per matching feedback (no dedicated API).
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkFromName, setBulkFromName] = useState("");
  const [bulkToId, setBulkToId] = useState("");
  const [bulkToName, setBulkToName] = useState("");
  const [bulkToInput, setBulkToInput] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const bulkToSelectRef = useRef(null);

  // data fetching
  const [people, setPeople] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [additionalVolunteers, setAdditionalVolunteers] = useState([]);

  const [staffOptions, setStaffOptions] = useState([]);
  const currentUser = localStorage.getItem('username')?.replace(/ /g, '_');
  const [currentStaffid, setCurrentStaffid] = useState(null);
  const [currentUserRoles, setCurrentUserRoles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  // Name filter + "only tutor/volunteer sees own" restriction (UI-only, like Tutorships)
  const [nameFilter, setNameFilter] = useState("");
  const [restrictToOwn, setRestrictToOwn] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      axios.get("/api/reports/feedback-report/"),
      axios.get("/api/staff/"),
      axios.get("/api/children/"),
    ])
      .then(([feedbackRes, staffRes, childrenRes]) => {
        const allFeedbacks = sortByTimestampDesc(feedbackRes.data.feedback || []);
        setFeedbacks(allFeedbacks);
        setFilteredFeedbacks(allFeedbacks);
        setCurrentPage(1);
        const staffs = (staffRes.data.staff || []).map(s => ({
          id: s.id,
          username: s.username,
          roles: s.roles || [],
          first_name: s.first_name,
          last_name: s.last_name,
        }));
        setStaffOptions(staffs);

        // Every active tutor/volunteer in the system can be selected as the person
        // the feedback is attributed to (the "שם המתנדב/חונך" dropdown) and appears
        // in the Additional Volunteers list. /api/staff/ already returns active staff only.
        const tutorsAndVolunteers = staffs.filter(s =>
          s.roles.some(role => role === "General Volunteer" || role === "Tutor")
        );

        const allPeople = tutorsAndVolunteers
          .map(s => ({ id: s.id, staff_id: s.id, name: `${s.first_name} ${s.last_name}` }))
          .sort((a, b) => a.name.localeCompare(b.name, "he"));
        setPeople(allPeople);

        const additionalStaffInHospitalVisit = tutorsAndVolunteers
          .map(s => `${s.first_name} ${s.last_name}`)
          .sort((a, b) => a.localeCompare(b, "he"));
        setAdditionalVolunteers(additionalStaffInHospitalVisit);

        const currentStaff = staffs.find(s => s.username === currentUser);

        if (currentStaff) {
          setCurrentStaffid(currentStaff.id);
          setCurrentUserRoles(currentStaff.roles || []);
          setIsAdmin((currentStaff.roles || []).includes("System Administrator") || (currentStaff.roles || []).includes("Viewer"));
          // If the user's only roles are Tutor/General Volunteer (no coordinator/admin), show only their own feedbacks
          const roles = currentStaff.roles || [];
          const onlyTutorOrVolunteer = roles.length > 0 && roles.every(r => r === "Tutor" || r === "General Volunteer");
          setRestrictToOwn(onlyTutorOrVolunteer);
          if (onlyTutorOrVolunteer) {
            const ownName = `${currentStaff.first_name} ${currentStaff.last_name}`;
            const own = allFeedbacks.filter(fb => fb.filler_name === ownName);
            setFeedbacks(own);
            setFilteredFeedbacks(own);
          }
        }

        // The subject (tutee/child) dropdown lists all children for every feedback type.
        const allSubjects = (childrenRes.data.children || []).map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`
        }));
        setSubjects(allSubjects);

        setCanDelete(
          hasAllPermissions([{ resource: 'childsmile_app_tutor_feedback', action: 'DELETE' }]) ||
          hasAllPermissions([{ resource: 'childsmile_app_general_v_feedback', action: 'DELETE' }])
        );
      })
      .catch((error) => {
        feedbackShowErrorToast(t, "Error fetching data", error);
        console.error("Error fetching data:", error);
      })
      .finally(() => setLoading(false));
  };


  // Filtering logic
  const applyFilters = () => {
    let filtered = [...feedbacks];
    if (eventFrom && eventTo) {
      const from = new Date(eventFrom);
      const to = new Date(eventTo);
      filtered = filtered.filter(fb => {
        const d = new Date(fb.event_date.split("/").reverse().join("-"));
        return d >= from && d <= to;
      });
    }
    if (feedbackFrom && feedbackTo) {
      const from = new Date(feedbackFrom);
      const to = new Date(feedbackTo);
      filtered = filtered.filter(fb => {
        const d = new Date(fb.feedback_filled_at.split("/").reverse().join("-"));
        return d >= from && d <= to;
      });
    }
    setFilteredFeedbacks(filtered);
    setCurrentPage(1);
  };

  // Sorting logic
  const parseDate = (dateString) => {
    if (!dateString) return new Date(0);
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const toggleSortOrderEventDate = () => {
    setSortOrderEventDate(prev => prev === 'asc' ? 'desc' : 'asc');
    const sorted = [...filteredFeedbacks].sort((a, b) => {
      const dateA = parseDate(a.event_date);
      const dateB = parseDate(b.event_date);
      return sortOrderEventDate === 'asc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredFeedbacks(sorted);
  };

  const toggleSortOrderFeedbackDate = () => {
    setSortOrderFeedbackDate(prev => prev === 'asc' ? 'desc' : 'asc');
    const sorted = [...filteredFeedbacks].sort((a, b) => {
      const dateA = parseDate(a.feedback_filled_at);
      const dateB = parseDate(b.feedback_filled_at);
      return sortOrderFeedbackDate === 'asc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredFeedbacks(sorted);
  };

  // Mobile detection – on phones the subject multi-select renders as the same
  // custom dropdown component used for Additional Volunteers.
  const isMobile = window.innerWidth <= 767;

  // Pagination
  const totalPages = Math.ceil(filteredFeedbacks.length / PAGE_SIZE);
  const paginatedFeedbacks = filteredFeedbacks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Modal logic
  const openModal = (feedback = {}) => {
    // If editing, map names to IDs for Select components
    let modalInit = { ...feedback };
    if (feedback.feedback_id) {
      modalInit.id = feedback.feedback_id;
      // Find the person and subject by name to get their IDs
      const person = people.find(p => p.name === feedback.filler_name);
      const subject = subjects.find(s => s.name === feedback.subject_name);
      modalInit.filler_id = person ? person.id : feedback.filler_staff_id || "";
      modalInit.subject_id = subject ? subject.id : feedback.subject_id || "";
      modalInit.hospital_name = feedback.hospital_name || "";
      modalInit.feedback_type = feedback.feedback_type;
      modalInit.additional_volunteers = feedback.additional_volunteers
        ? typeof feedback.additional_volunteers === "string"
          ? feedback.additional_volunteers.split(",").map(s => s.trim()).filter(Boolean)
          : feedback.additional_volunteers
        : [];
    } else {
      modalInit.feedback_type = "tutor_fun_day";
      modalInit.hospital_name = feedback.hospital_name || "";
      modalInit.additional_volunteers = [];
      modalInit.subject_ids = [];
    }
    if (feedback.event_date && feedback.event_date.includes("/")) {
      // Convert from DD/MM/YYYY to YYYY-MM-DD
      const [day, month, year] = feedback.event_date.split("/");
      modalInit.event_date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    setModalData(modalInit);
    setModalErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData({});
    setModalErrors({});
    setShowAdditionalVolunteersDropdown(false);
    setAdditionalVolunteersSearch("");
    setShowSubjectDropdown(false);
    setSubjectSearch("");
  };

  // ── Bulk edit: reassign every feedback from one volunteer name to another ──
  const openBulkEditModal = () => {
    setBulkFromName("");
    setBulkToId("");
    setBulkToName("");
    setBulkToInput("");
    setShowBulkEditModal(true);
  };

  const closeBulkEditModal = () => {
    setShowBulkEditModal(false);
    setBulkFromName("");
    setBulkToId("");
    setBulkToName("");
    setBulkToInput("");
  };

  // DD/MM/YYYY (feedback-report format) → YYYY-MM-DD (what update_feedback expects).
  const feedbackDateToISO = (value) => {
    if (!value || !value.includes("/")) return value || "";
    const [day, month, year] = value.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  // Rebuild a full update payload for one existing feedback, changing only the
  // volunteer (filler) it is attributed to. update_feedback overwrites the whole
  // row, so every existing field must be resent to avoid clearing data.
  const buildBulkEditPayload = (fb, newFillerStaffId, newFillerName) => {
    const data = {
      id: fb.feedback_id,
      staff_id: currentStaffid,
      filler_staff_id: newFillerStaffId || "",
      filler_name: newFillerName,
      subject_id: "",
      subject_name: fb.subject_name || "",
      event_date: feedbackDateToISO(fb.event_date),
      description: fb.description || "",
      exceptional_events: fb.exceptional_events || "",
      anything_else: fb.anything_else || "",
      comments: fb.comments || "",
      is_it_your_tutee: fb.is_it_your_tutee || false,
      feedback_filled_at: feedbackDateToISO(fb.feedback_filled_at),
      feedback_type: fb.feedback_type,
      hospital_name: fb.hospital_name || "",
      additional_volunteers: fb.additional_volunteers || "",
    };
    if (fb.feedback_type === "general_volunteer_hospital_visit") {
      data.names = fb.names || "";
      data.phones = fb.phones || "";
      data.other_information = fb.other_information || "";
    }
    return data;
  };

  const handleBulkEditSubmit = async () => {
    const person = people.find(p => p.id === bulkToId);
    const newFillerName = person?.name || bulkToName;
    const newFillerStaffId = person?.staff_id || "";

    const errors = [];
    if (!bulkFromName) errors.push(t("Please select the volunteer to reassign from"));
    if (!newFillerName) errors.push(t("Please choose the new volunteer name"));
    const matches = feedbacks.filter(fb => fb.filler_name === bulkFromName);
    if (bulkFromName && matches.length === 0) errors.push(t("No feedbacks found for the selected volunteer"));
    if (errors.length > 0) {
      setValidationPopup(errors);
      return;
    }

    setBulkSubmitting(true);
    let succeeded = 0;
    let failed = 0;
    for (const fb of matches) {
      try {
        await axios.put(`/api/update_feedback/${fb.feedback_id}/`, buildBulkEditPayload(fb, newFillerStaffId, newFillerName));
        succeeded++;
      } catch (error) {
        failed++;
        console.error("Error bulk-updating feedback", fb.feedback_id, error);
      }
    }
    setBulkSubmitting(false);

    if (succeeded > 0) toast.success(`${t("Feedbacks updated successfully")}: ${succeeded}`);
    if (failed > 0) toast.error(`${t("Failed to update feedbacks")}: ${failed}`);

    closeBulkEditModal();
    fetchData();
  };


  const [validationPopup, setValidationPopup] = useState(null);

  const validateModal = () => {
    const errors = {};
    if (!modalData.filler_id && !modalData.filler_name) errors.filler_name = t("Volunteer/Tutor Name is required");
    const hasSubject = (modalData.subject_ids && modalData.subject_ids.length > 0) || !!modalData.subject_name;
    if (!hasSubject && modalData.feedback_type !== "general_volunteer_hospital_visit") errors.subject_name = t("Tutee Name is required");
    if (!modalData.event_date) {
      errors.event_date = t("Event Date is required");
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (modalData.event_date > today) {
        errors.event_date = t("תאריך האירוע לא יכול להיות בעתיד");
      } else if (modalData.event_date < '2024-01-01') {
        errors.event_date = t("תאריך האירוע לא יכול להיות לפני שנת 2024 (הארגון טרם היה קיים)");
      }
    }
    if (!modalData.description) errors.description = t("Description is required");
    if (modalData.feedback_type === "general_volunteer_hospital_visit") {
      if (!modalData.hospital_name) errors.hospital_name = t("Hospital Name is required");
      if (modalData.names && modalData.names.length >= 4 && !modalData.names.includes(",")) {
        errors.names = t("Names must be comma separated if more than one name is entered");
      }
      if (modalData.phones && modalData.phones.length >= 4 && !modalData.phones.includes(",")) {
        errors.phones = t("Phones must be comma separated if more than one phone is entered");
      }
    }
    setModalErrors(errors);

    // Show popup if there are errors
    if (Object.keys(errors).length > 0) {
      setValidationPopup(Object.values(errors));
      return false;
    } else {
      setValidationPopup(null);
      return true;
    }
  };

  const handleModalSubmit = () => {
    if (!validateModal()) return;
    // If modalData has id, it's edit, else create
    if (modalData.id) {
      handleEditFeedbackSubmit();
    } else {
      handleAddFeedbackSubmit();
    }
    closeModal();
    fetchData();
  };

  const handleDelete = (id) => {
    if (!canDelete) return;
    handleDeleteFeedback(id);
    fetchData();
  };

  const handleAddFeedbackSubmit = () => {
    const now = new Date();
    const feedback_filled_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const person = people.find(p => p.id === modalData.filler_id);
    const data = {
      staff_id: currentStaffid,
      filler_staff_id: person?.staff_id,
      filler_name: person?.name || modalData.filler_name || "",
      subject_id: (modalData.subject_ids && modalData.subject_ids[0]) || "",
      subject_name: (modalData.subject_ids || [])
        .map(id => subjects.find(s => s.id === id)?.name)
        .filter(Boolean)
        .join(", "),
      event_date: modalData.event_date,
      description: modalData.description,
      exceptional_events: modalData.exceptional_events || "",
      anything_else: modalData.anything_else || "",
      comments: modalData.comments || "",
      is_it_your_tutee: modalData.is_it_your_tutee || false,
      feedback_filled_at: feedback_filled_date,
      feedback_type: modalData.feedback_type,
      hospital_name: modalData.hospital_name,
      additional_volunteers: Array.isArray(modalData.additional_volunteers)
        ? modalData.additional_volunteers.join(",")
        : "",
    };

    if (modalData.feedback_type === "general_volunteer_hospital_visit") {
      data.names = modalData.names ? modalData.names : "";
      data.phones = modalData.phones ? modalData.phones : "";
      data.other_information = modalData.other_information ? modalData.other_information : "";
    }

    axios.post("/api/create_feedback/", data)
      .then(() => {
        toast.success(t("Feedback created successfully"));
        fetchData();
      })
      .catch((error) => {
        feedbackShowErrorToast(t, "Error creating feedback", error);
        console.error("Error creating feedback:", error);
      });
  };

  const handleEditFeedbackSubmit = () => {
    const now = new Date();
    const feedback_filled_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const person = people.find(p => p.id === modalData.filler_id);

    const data = {
      id: modalData.id,
      staff_id: currentStaffid,
      filler_staff_id: person?.staff_id || modalData.filler_staff_id || "",
      filler_name: modalData.filler_name || person?.name || "",
      subject_id: modalData.subject_id,
      subject_name: modalData.subject_name || subjects.find(s => s.id === modalData.subject_id)?.name || "",
      event_date: modalData.event_date,
      description: modalData.description,
      exceptional_events: modalData.exceptional_events || "",
      anything_else: modalData.anything_else || "",
      comments: modalData.comments || "",
      is_it_your_tutee: modalData.is_it_your_tutee || false,
      feedback_filled_at: feedback_filled_date,
      feedback_type: modalData.feedback_type,
      hospital_name: modalData.hospital_name,
      additional_volunteers: Array.isArray(modalData.additional_volunteers)
        ? modalData.additional_volunteers.join(",")
        : "",
    };

    if (modalData.feedback_type === "general_volunteer_hospital_visit") {
      data.names = modalData.names ? modalData.names : "";
      data.phones = modalData.phones ? modalData.phones : "";
      data.other_information = modalData.other_information ? modalData.other_information : "";
    }

    axios.put(`/api/update_feedback/${modalData.id}/`, data)
      .then(() => {
        toast.success(t("Feedback updated successfully"));
        fetchData();
      })
      .catch((error) => {
        feedbackShowErrorToast(t, "Error updating feedback", error);
        console.error("Error updating feedback:", error);
      });
  };

  const handleRefresh = () => {
    // set the date fields to empty strings
    setEventFrom("");
    setEventTo("");
    setFeedbackFrom("");
    setFeedbackTo("");
    setNameFilter("");
    fetchData();
  };

  const handleDeleteFeedback = (id) => {
    axios.delete(`/api/delete_feedback/${id}/`)
      .then(() => {
        toast.success(t("Feedback deleted successfully"));
        fetchData();
      })
      .catch((error) => {
        feedbackShowErrorToast(t, "Error deleting feedback", error);
        console.error("Error deleting feedback:", error);
      });
  };

  const handleBulkDelete = () => {
    if (selectedFeedbacks.length === 0) {
      toast.warn(t("No feedbacks selected for deletion"));
      return;
    }
    if (window.confirm(t("Are you sure you want to delete the selected feedbacks?"))) {
      Promise.all(selectedFeedbacks.map(id => axios.delete(`/api/delete_feedback/${id}/`)))
        .then(() => {
          toast.success(t("Selected feedbacks deleted successfully"));
          setSelectedFeedbacks([]);
          fetchData();
        })
        .catch((error) => {
          feedbackShowErrorToast(t, "Error deleting feedbacks", error);
          console.error("Error deleting feedbacks:", error);
        });
    }
  };


  /* if user doesn't have permission to view the page, show a message */
  if (!hasFeedbacksViewPermission) {
    return (
      <div className="tutor-feedbacks-main-content volunteer-feedbacks-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Feedbacks")} />
        <div className="no-permission">
          <h2>{t("You do not have permission to view this page")}</h2>
        </div>
      </div>
    );
  }

  // Set zoom level when component mounts
  useEffect(() => {
    document.body.style.zoom = "80%";
    return () => {
      document.body.style.zoom = "";
    };
  }, []);

  return (
    <div className="tutor-feedbacks-main-content volunteer-feedbacks-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Feedbacks")} />
      <div className="feedbacks-page-content">

        {loading && <div className="loader">{t("Loading data...")}</div>}

        <div className="feedbacks-filter-create-container">
          {/* Row 1: action buttons */}
          <div className="feedbacks-toolbar-actions">
            <button className="feedbacks-create-btn" onClick={() => openModal({})}>
              {t("Create Feedback")}
            </button>
            <button className="feedbacks-refund-link-btn" onClick={() => navigateTo('/refunds')}>
              {t("הגש בקשת החזר הוצאות")}
            </button>
            {currentUserRoles.includes("System Administrator") && (
              <button className="feedbacks-bulk-edit-btn" onClick={openBulkEditModal}>
                {t("Bulk Edit Volunteer Name")}
              </button>
            )}
          </div>
          {/* Row 2: filters */}
          <div className="feedbacks-toolbar-filters">
            <div className="feedbacks-filter-item">
              <label>{t("Feedback Type")}:</label>
              <select
                value={modalData.feedback_type || ""}
                onChange={e => {
                  const selectedType = e.target.value;
                  setModalData({ ...modalData, feedback_type: selectedType });
                  if (selectedType) {
                    setFilteredFeedbacks(feedbacks.filter(fb => fb.feedback_type === selectedType));
                    setCurrentPage(1);
                  } else {
                    setFilteredFeedbacks(feedbacks);
                    setCurrentPage(1);
                  }
                }}
              >
                <option value="">{t("All Feedbacks Types")}</option>
                <option value="tutor_fun_day">{t("tutor_fun_day")}</option>
                <option value="general_volunteer_fun_day">{t("general_volunteer_fun_day")}</option>
                <option value="general_volunteer_hospital_visit">{t("general_volunteer_hospital_visit")}</option>
                <option value="tutorship">{t("tutorship")}</option>
              </select>
            </div>
            {!restrictToOwn && (
              <div className="feedbacks-filter-item">
                <label>{t("Volunteer/Tutor Name")}:</label>
                <select
                  value={nameFilter}
                  onChange={e => {
                    const name = e.target.value;
                    setNameFilter(name);
                    setFilteredFeedbacks(name ? feedbacks.filter(fb => fb.filler_name === name) : feedbacks);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t("All")}</option>
                  {[...new Set(feedbacks.map(fb => fb.filler_name).filter(Boolean))].sort().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="feedbacks-filter-item">
              <label>{t("Event Date From")}:</label>
              <input type="date" value={eventFrom} onChange={e => setEventFrom(e.target.value)} className="feedbacks-date-input" />
            </div>
            <div className="feedbacks-filter-item">
              <label>{t("Event Date To")}:</label>
              <input type="date" value={eventTo} onChange={e => setEventTo(e.target.value)} className="feedbacks-date-input" />
            </div>
            <div className="feedbacks-filter-item">
              <label>{t("Feedback Fill Date From")}:</label>
              <input type="date" value={feedbackFrom} onChange={e => setFeedbackFrom(e.target.value)} className="feedbacks-date-input" />
            </div>
            <div className="feedbacks-filter-item">
              <label>{t("Feedback Fill Date To")}:</label>
              <input type="date" value={feedbackTo} onChange={e => setFeedbackTo(e.target.value)} className="feedbacks-date-input" />
            </div>
            <button className="feedbacks-filter-button" onClick={applyFilters}>
              {t("Filter")}
            </button>
            <button className="feedbacks-refresh-button" onClick={handleRefresh}>
              {t("Refresh")}
            </button>
          </div>
        </div>

        {!loading && (
          <div className="feedback-grid-container">
            {paginatedFeedbacks.length === 0 ? (
              <div className="no-data">{t("No data to display")}</div>
            ) : (
              <table className="feedbacks-data-grid">
                <thead>
                  <tr>
                    {ENABLE_BULK_DELETE && <th className="feedbacks-checkbox-column">
                      <input
                        type="checkbox"
                        checked={selectedFeedbacks.length === filteredFeedbacks.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedFeedbacks(filteredFeedbacks.map(fb => fb.feedback_id));
                          } else {
                            setSelectedFeedbacks([]);
                          }
                        }}
                      />
                    </th>}
                    <th>{t("Volunteer/Tutor Name")}</th>
                    <th>{t("Tutee Name / Hospital Name")}</th>
                    <th>{t("Is It Your Tutee?")}</th>
                    <th className="feedbacks-wide-column">
                      {t("Event Date")}
                      <button className="sort-button" onClick={toggleSortOrderEventDate}>
                        {sortOrderEventDate === 'asc' ? '▲' : '▼'}
                      </button>
                    </th>
                    <th className="feedbacks-wide-column">
                      {t("Feedback Filled At")}
                      <button className="sort-button" onClick={toggleSortOrderFeedbackDate}>
                        {sortOrderFeedbackDate === 'asc' ? '▲' : '▼'}
                      </button>
                    </th>
                    <th>{t("Description")}</th>
                    <th>{t("Feedback Type")}</th>
                    <th>{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody ref={tbodyRef}>
                  {paginatedFeedbacks.map((feedback, index) => (
                    <tr key={index}>
                      {ENABLE_BULK_DELETE && <td className="feedbacks-checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedFeedbacks.includes(feedback.feedback_id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedFeedbacks(prev => [...prev, feedback.feedback_id]);
                            } else {
                              setSelectedFeedbacks(prev => prev.filter(id => id !== feedback.feedback_id));
                            }
                          }}
                        />
                      </td>}
                      <td>{feedback.filler_name}</td>
                      <td>{feedback.subject_name}</td>
                      <td>{feedback.is_it_your_tutee ? t("Yes") : t("No")}</td>
                      <td>{feedback.event_date}</td>
                      <td>{feedback.feedback_filled_at}</td>
                      <td><div className="td-scroll">{feedback.description}</div>
                      </td><td>{t(feedback.feedback_type)}</td>
                      <td>
                        <button
                          className="feedbacks-info-button"
                          onClick={() => setInfoModalData(feedback)}
                        >
                          {t("Info")}
                        </button>
                        <button
                          className="feedbacks-edit-button"
                          onClick={() => openModal(feedback)}
                        >
                          {t("Edit")}
                        </button>
                        <button
                          className="feedbacks-delete-button"
                          hidden={!canDelete}
                          onClick={() => handleDelete(feedback.feedback_id)}
                        >
                          {t("Delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {ENABLE_BULK_DELETE && (
              <div className="bulk-delete-container">
                <button
                  className="bulk-delete-button"
                  onClick={handleBulkDelete}
                >
                  {t("Delete Selected Feedbacks")}
                </button>
              </div>
            )}
          </div>
        )}
        {/* Pagination controls */}
        <div className="pagination">
          {/* First Page */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1 || totalPages <= 1}
            className="pagination-arrow"
          >
            &laquo;
          </button>
          {/* Previous Page */}
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1 || totalPages <= 1}
            className="pagination-arrow"
          >
            &lsaquo;
          </button>
          {/* Page Numbers */}
          {totalPages <= 1 ? (
            <button className="active">1</button>
          ) : (
            Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              const maxButtons = 3;
              const halfRange = Math.floor(maxButtons / 2);
              let start = Math.max(1, currentPage - halfRange);
              let end = Math.min(totalPages, start + maxButtons - 1);
              if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
              return pageNum >= start && pageNum <= end ? (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={currentPage === pageNum ? "active" : ""}
                >
                  {pageNum}
                </button>
              ) : null;
            })
          )}
          {/* Next Page */}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages <= 1}
            className="pagination-arrow"
          >
            &rsaquo;
          </button>
          {/* Last Page */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages <= 1}
            className="pagination-arrow"
          >
            &raquo;
          </button>
        </div>
        {/* Info modal */}
        {infoModalData && (
          <div className="feedbacks-modal-overlay">
            <div className="feedbacks-modal-content">
              <span className="feedbacks-close" onClick={() => setInfoModalData(null)}>&times;</span>
              <h2>{t("Feedback Details")}</h2>
              <div className="feedbacks-info-grid">
                <p>{t("Volunteer/Tutor Name")}: {infoModalData.filler_name}</p>
                <p>{t("Tutee Name / Hospital Name")}:{infoModalData.subject_name || infoModalData.hospital_name}</p>
                <p>{t("Is It Your Tutee?")}:{infoModalData.is_it_your_tutee ? t("Yes") : t("No")}</p>
                <p>{t("Event Date")}:{infoModalData.event_date}</p>
                <p>{t("Feedback Filled At")}:{infoModalData.feedback_filled_at}</p>
                <p>{t("Description")}:{infoModalData.description}</p>
                <p>{t("Exceptional Events")}:{infoModalData.exceptional_events}</p>
                <p>{t("Anything Else")}:{infoModalData.anything_else}</p>
                <p>{t("Comments")}:{infoModalData.comments}</p>
                <p>{t("Feedback Type")}:{t(infoModalData.feedback_type)}</p>
                <p>
                  {t("Additional Volunteers")}: {
                    Array.isArray(infoModalData.additional_volunteers)
                      ? infoModalData.additional_volunteers.join(", ")
                      : infoModalData.additional_volunteers
                  }
                </p>
                {infoModalData.feedback_type === "general_volunteer_hospital_visit" && (
                  <>
                    <div>
                      <h3>{t("Initial Family Data")}</h3>
                      <p>{t("Names")}: {infoModalData.names || "-"}</p>
                      <p>{t("Phones")}: {infoModalData.phones || "-"}</p>
                      <p>{t("Other Information")}: {infoModalData.other_information || "-"}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="feedbacks-form-actions">
                <button onClick={() => setInfoModalData(null)}>{t("Close")}</button>
              </div>
            </div>
          </div>
        )}
        {/* Modal: bulk-reassign feedbacks from volunteer X to volunteer Y (admins) */}
        {showBulkEditModal && (
          <div className="feedbacks-modal-overlay">
            <div className="feedbacks-modal-content">
              <span className="feedbacks-close" onClick={closeBulkEditModal}>&times;</span>
              <h2>{t("Bulk Edit Volunteer Name")}</h2>
              <div className="feedbacks-bulk-edit-body">
                {/* FROM: existing volunteer name whose feedbacks will be reassigned */}
                <div className="feedbacks-form-row">
                  <label>{t("From Volunteer")}</label>
                  <Select
                    value={bulkFromName ? { value: bulkFromName, label: bulkFromName } : null}
                    onChange={option => setBulkFromName(option ? option.value : "")}
                    options={[...new Set(feedbacks.map(fb => fb.filler_name).filter(Boolean))]
                      .sort((a, b) => a.localeCompare(b, "he"))
                      .map(name => ({ value: name, label: name }))}
                    placeholder={t("Select Volunteer/Tutor")}
                    isClearable
                    classNamePrefix={"feedbacks-select"}
                    noOptionsMessage={() => t("No options")}
                  />
                  {bulkFromName && (
                    <span className="feedbacks-bulk-edit-count">
                      {`${t("Matching feedbacks")}: ${feedbacks.filter(fb => fb.filler_name === bulkFromName).length}`}
                    </span>
                  )}
                </div>

                {/* TO: target volunteer — an existing person or a free-text name */}
                <div className="feedbacks-form-row">
                  <label>{t("To Volunteer")}</label>
                  <Select
                    ref={bulkToSelectRef}
                    inputValue={bulkToInput}
                    onInputChange={(val, meta) => {
                      if (meta.action === "input-change") {
                        setBulkToInput(val);
                      } else if (meta.action === "menu-close" || meta.action === "input-blur") {
                        setBulkToInput("");
                      }
                    }}
                    value={
                      people.find(p => p.id === bulkToId) ||
                      (bulkToName ? { id: "__custom__", name: bulkToName } : null)
                    }
                    onChange={option => {
                      if (!option) {
                        setBulkToId("");
                        setBulkToName("");
                      } else if (option.id === "__custom__") {
                        setBulkToId("");
                        setBulkToName(option.name);
                      } else {
                        setBulkToId(option.id);
                        setBulkToName("");
                      }
                      setBulkToInput("");
                    }}
                    options={people}
                    getOptionLabel={option => option.name}
                    getOptionValue={option => option.id}
                    placeholder={t("Select Volunteer/Tutor")}
                    isClearable
                    classNamePrefix={"feedbacks-select"}
                    noOptionsMessage={({ inputValue }) =>
                      inputValue && inputValue.trim() ? (
                        <div
                          className="feedbacks-freetext-prompt"
                          onMouseDown={e => e.preventDefault()}
                        >
                          <span className="feedbacks-freetext-question">
                            {t("Use this name?")}
                          </span>
                          <span className="feedbacks-freetext-value">"{inputValue.trim()}"</span>
                          <button
                            type="button"
                            className="feedbacks-freetext-btn feedbacks-freetext-confirm"
                            title={t("Use this name")}
                            onClick={() => {
                              const name = inputValue.trim();
                              setBulkToId("");
                              setBulkToName(name);
                              setBulkToInput("");
                              bulkToSelectRef.current?.blur();
                            }}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="feedbacks-freetext-btn feedbacks-freetext-cancel"
                            title={t("Cancel")}
                            onClick={() => setBulkToInput("")}
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        t("No options")
                      )
                    }
                  />
                </div>
              </div>
              <div className="feedbacks-form-actions">
                <button type="button" disabled={bulkSubmitting} onClick={handleBulkEditSubmit}>
                  {bulkSubmitting ? (
                    <span className="feedbacks-btn-loading">
                      <span className="feedbacks-btn-spinner" />
                      {t("Loading data...")}
                    </span>
                  ) : (
                    t("Update Feedbacks")
                  )}
                </button>
                <button type="button" onClick={closeBulkEditModal}>{t("Cancel")}</button>
              </div>
            </div>
          </div>
        )}
        {/* Modal for create/edit */}
        {showModal && (
          <div className="feedbacks-modal-overlay">
            <div
              className={
                "feedbacks-modal-content" +
                (modalData.feedback_type === "general_volunteer_hospital_visit" ? " feedbacks-modal-content-tall feedbacks-modal-content-wide" : "")
              }
            >
              <span className="feedbacks-close" onClick={closeModal}>&times;</span>
              <h2>{modalData.id ? t("Edit Feedback") : t("Create Feedback")}</h2>
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!validateModal()) return;
                  handleModalSubmit();
                }}
                className={
                  modalData.feedback_type === "general_volunteer_hospital_visit"
                    ? "feedbacks-form-grid-3col"
                    : "feedbacks-form-grid feedbacks-form-grid-2col"
                }
              >

                {/* LEFT COLUMN: Only for hospital visit */}
                {modalData.feedback_type === "general_volunteer_hospital_visit" && (
                  <div className="feedbacks-form-col-initial-family">
                    <h3>{t("Initial Family Data")}</h3>
                    <div className="feedbacks-form-row">
                      <label>{t("Names")}</label>
                      <input
                        type="text"
                        value={modalData.names || ""}
                        onChange={e => setModalData({ ...modalData, names: e.target.value })}
                        placeholder={t("Enter names comma separated")}
                        disabled={!!modalData.id}
                      />
                    </div>
                    <div className="feedbacks-form-row">
                      <label>{t("Phones")}</label>
                      <input
                        type="text"
                        value={modalData.phones || ""}
                        onChange={e => setModalData({ ...modalData, phones: e.target.value })}
                        placeholder={t("Enter phones comma separated")}
                        disabled={!!modalData.id}
                      />
                    </div>
                    <div className="feedbacks-form-row">
                      <label>{t("Other Information")}</label>
                      <input
                        type="text"
                        value={modalData.other_information || ""}
                        onChange={e => setModalData({ ...modalData, other_information: e.target.value })}
                        placeholder={t("Enter other information")}
                        disabled={!!modalData.id}
                      />
                    </div>
                  </div>
                )}

                {/* MAIN FIELDS: Always in 2 columns */}
                <div className="feedbacks-form-col-main">
                  <div className="feedbacks-form-row">
                    <label>{t("Feedback Type")}</label>
                    {modalData.id ? (
                      <input
                        type="text"
                        value={t(modalData.feedback_type)}
                        disabled
                        className="feedbacks-readonly-input"
                      />
                    ) : (
                      <select
                        value={modalData.feedback_type}
                        onChange={e => setModalData({ ...modalData, feedback_type: e.target.value })}
                      >
                        <option value="tutor_fun_day">{t("tutor_fun_day")}</option>
                        <option value="general_volunteer_fun_day">{t("general_volunteer_fun_day")}</option>
                        <option value="general_volunteer_hospital_visit">{t("general_volunteer_hospital_visit")}</option>
                        <option value="tutorship">{t("tutorship")}</option>
                      </select>
                    )}
                  </div>

                  {/* Hospital Name only for hospital visit */}
                  {modalData.feedback_type === "general_volunteer_hospital_visit" && (
                    <div className="feedbacks-form-row">
                      <label hidden={!!modalData.id}>{t("Hospital Name")}</label>
                      {modalData.id ? (
                        <input
                          type="text"
                          value={modalData.hospital_name || ""}
                          disabled
                          className="feedbacks-readonly-input"
                        />
                      ) : (
                        <Select
                          options={hospitalsList.map((hospital) => ({ value: hospital, label: hospital }))}
                          value={hospitalsList.map((hospital) => ({ value: hospital, label: hospital })).find((option) => option.value === modalData.hospital_name)}
                          onChange={(selectedOption) => {
                            setModalData((prev) => ({
                              ...prev,
                              hospital_name: selectedOption ? selectedOption.value : "",
                            }));
                          }}
                          placeholder={t('Select a hospital')}
                          isClearable
                          classNamePrefix={"feedbacks-select"}
                          noOptionsMessage={() => t('No hospital available')}
                        />
                      )}
                    </div>
                  )}

                  {/* Volunteer/Tutor Name (person the feedback is attributed to) */}
                  <div className="feedbacks-form-row">
                    <label>{t("Volunteer/Tutor Name")}</label>
                    {modalData.id ? (
                      <input
                        type="text"
                        value={people.find(p => p.id === modalData.filler_id)?.name || modalData.filler_name || ""}
                        disabled
                        className="feedbacks-readonly-input"
                      />
                    ) : (
                      <Select
                        ref={fillerSelectRef}
                        inputValue={fillerInput}
                        onInputChange={(val, meta) => {
                          if (meta.action === "input-change") {
                            setFillerInput(val);
                          } else if (meta.action === "menu-close" || meta.action === "input-blur") {
                            setFillerInput("");
                          }
                        }}
                        value={
                          people.find(p => p.id === modalData.filler_id) ||
                          (modalData.filler_name
                            ? { id: "__custom__", name: modalData.filler_name }
                            : null)
                        }
                        onChange={option => {
                          if (!option) {
                            setModalData({ ...modalData, filler_id: "", filler_name: "" });
                          } else if (option.id === "__custom__") {
                            setModalData({ ...modalData, filler_id: "", filler_name: option.name });
                          } else {
                            setModalData({ ...modalData, filler_id: option.id, filler_name: "" });
                          }
                          setFillerInput("");
                        }}
                        options={people}
                        getOptionLabel={option => option.name}
                        getOptionValue={option => option.id}
                        placeholder={t("Select Volunteer/Tutor")}
                        isClearable
                        classNamePrefix={"feedbacks-select"}
                        noOptionsMessage={({ inputValue }) =>
                          inputValue && inputValue.trim() ? (
                            <div
                              className="feedbacks-freetext-prompt"
                              onMouseDown={e => e.preventDefault()}
                            >
                              <span className="feedbacks-freetext-question">
                                {t("Use this name?")}
                              </span>
                              <span className="feedbacks-freetext-value">"{inputValue.trim()}"</span>
                              <button
                                type="button"
                                className="feedbacks-freetext-btn feedbacks-freetext-confirm"
                                title={t("Use this name")}
                                onClick={() => {
                                  const name = inputValue.trim();
                                  setModalData(prev => ({ ...prev, filler_id: "", filler_name: name }));
                                  setModalErrors(prev => ({ ...prev, filler_name: undefined }));
                                  setFillerInput("");
                                  fillerSelectRef.current?.blur();
                                }}
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className="feedbacks-freetext-btn feedbacks-freetext-cancel"
                                title={t("Cancel")}
                                onClick={() => setFillerInput("")}
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            t("No options")
                          )
                        }
                      />
                    )}
                  </div>

                  {/* Subject (Tutee/Child) Name, Is It Your Tutee - only for non-hospital visit */}
                  {modalData.feedback_type !== "general_volunteer_hospital_visit" && (
                    <>
                      <div className="feedbacks-form-row">
                        <label>{t("Tutee Name")}</label>
                        {modalData.id ? (
                          <input
                            type="text"
                            value={subjects.find(s => s.id === modalData.subject_id)?.name || modalData.subject_name || ""}
                            disabled
                            className="feedbacks-readonly-input"
                          />
                        ) : isMobile ? (
                          <div className="additional-volunteers-dropdown-container">
                            <button
                              type="button"
                              className={`additional-volunteers-dropdown-button`}
                              onClick={() => {
                                setShowSubjectDropdown(prev => !prev);
                                setSubjectSearch("");
                              }}
                            >
                              {modalData.subject_ids && modalData.subject_ids.length > 0
                                ? subjects.filter(s => modalData.subject_ids.includes(s.id)).map(s => s.name).join(', ')
                                : t('Select Tutee')}
                            </button>
                            {showSubjectDropdown && (
                              <div className="additional-volunteers-dropdown">
                                <input
                                  type="text"
                                  className="additional-volunteers-search"
                                  placeholder={t('Search Tutee')}
                                  value={subjectSearch}
                                  onChange={e => setSubjectSearch(e.target.value)}
                                  autoFocus
                                />
                                {subjects
                                  .filter(subject => subject.name.toLowerCase().includes(subjectSearch.trim().toLowerCase()))
                                  .map((subject) => (
                                  <div key={subject.id} className="additional-volunteers-dropdown-item">
                                    <input
                                      type="checkbox"
                                      id={`subject-${subject.id}`}
                                      checked={(modalData.subject_ids || []).includes(subject.id)}
                                      onChange={e => {
                                        const updated = e.target.checked
                                          ? [...(modalData.subject_ids || []), subject.id]
                                          : (modalData.subject_ids || []).filter(id => id !== subject.id);
                                        setModalData({ ...modalData, subject_ids: updated });
                                      }}
                                    />
                                    <label htmlFor={`subject-${subject.id}`}>{subject.name}</label>
                                  </div>
                                ))}
                                {subjects.filter(subject => subject.name.toLowerCase().includes(subjectSearch.trim().toLowerCase())).length === 0 && (
                                  <div className="additional-volunteers-no-results">{t('No data to display')}</div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Select
                            isMulti
                            closeMenuOnSelect={false}
                            hideSelectedOptions={false}
                            components={{ Option: CheckboxOption }}
                            value={subjects.filter(s => (modalData.subject_ids || []).includes(s.id))}
                            onChange={options => setModalData({ ...modalData, subject_ids: options ? options.map(o => o.id) : [] })}
                            options={subjects}
                            getOptionLabel={option => option.name}
                            getOptionValue={option => option.id}
                            placeholder={t("Select Tutee")}
                            isClearable
                            classNamePrefix={"feedbacks-select"}
                          />
                        )}
                      </div>
                      <div className="feedbacks-form-row">
                        <label>{t("Is It Your Tutee?")}</label>
                        <Select
                          value={modalData.is_it_your_tutee ? { value: true, label: t("Yes") } : { value: false, label: t("No"), default: true }}
                          onChange={option => setModalData({ ...modalData, is_it_your_tutee: option.value })}
                          options={[
                            { value: true, label: t("Yes") },
                            { value: false, label: t("No") }
                          ]}
                          placeholder={t("Select")}
                          isClearable
                          classNamePrefix={"feedbacks-select"}
                        />
                      </div>
                    </>
                  )}

                  {/* All other fields (these are always shown) */}
                  <div className="feedbacks-form-row">
                    <label>{t("Event Date")}</label>
                    <input
                      type="date"
                      className="feedbacks-date-input"
                      value={modalData.event_date || ""}
                      min="2024-01-01"
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setModalData({ ...modalData, event_date: e.target.value })}
                    />
                  </div>
                  <div className="feedbacks-form-row">
                    <label>{t("Meeting Description")}</label>
                    <textarea
                      className="feedbacks-textarea"
                      value={modalData.description || ""}
                      onChange={e => setModalData({ ...modalData, description: e.target.value })}
                    />
                  </div>
                  <div className="feedbacks-form-row">
                    <label>{t("Were there any exceptional events?")}</label>
                    <textarea
                      className="feedbacks-textarea"
                      value={modalData.exceptional_events || ""}
                      onChange={e => setModalData({ ...modalData, exceptional_events: e.target.value })}
                    />
                  </div>
                  <div className="feedbacks-form-row">
                    <label>{t("Anything Else?")}</label>
                    <textarea
                      className="feedbacks-textarea"
                      value={modalData.anything_else || ""}
                      onChange={e => setModalData({ ...modalData, anything_else: e.target.value })}
                    />
                  </div>
                  <div className="feedbacks-form-row">
                    <label>{t("Comments")}</label>
                    <textarea
                      className="feedbacks-textarea"
                      value={modalData.comments || ""}
                      onChange={e => setModalData({ ...modalData, comments: e.target.value })}
                    />
                  </div>
                  {/* Additional Volunteers (available for all feedback types) */}
                  <div className="feedbacks-form-row">
                    <label>{t("Additional Volunteers")}</label>
                    <div className="additional-volunteers-dropdown-container">
                      <button
                        type="button"
                        className={`additional-volunteers-dropdown-button`}
                        onClick={() => {
                          setShowAdditionalVolunteersDropdown(prev => !prev);
                          setAdditionalVolunteersSearch("");
                        }}
                      >
                        {modalData.additional_volunteers && modalData.additional_volunteers.length > 0
                          ? modalData.additional_volunteers.join(', ')
                          : t('Select Additional Volunteers')}
                      </button>
                      {showAdditionalVolunteersDropdown && (
                        <div className="additional-volunteers-dropdown feedbacks-dropdown-open-up">
                          <input
                            type="text"
                            className="additional-volunteers-search"
                            placeholder={t('Search Volunteer')}
                            value={additionalVolunteersSearch}
                            onChange={e => setAdditionalVolunteersSearch(e.target.value)}
                            autoFocus
                          />
                          {additionalVolunteers
                            .filter(vol => vol.toLowerCase().includes(additionalVolunteersSearch.trim().toLowerCase()))
                            .map((vol, idx) => (
                              <div key={idx} className="additional-volunteers-dropdown-item">
                                <input
                                  type="checkbox"
                                  id={`vol-${idx}`}
                                  checked={modalData.additional_volunteers.includes(vol)}
                                  onChange={e => {
                                    const updated = e.target.checked
                                      ? [...modalData.additional_volunteers, vol]
                                      : modalData.additional_volunteers.filter(v => v !== vol);
                                    setModalData({ ...modalData, additional_volunteers: updated });
                                  }}
                                />
                                <label htmlFor={`vol-${idx}`}>{vol}</label>
                              </div>
                            ))}
                          {additionalVolunteers.filter(vol => vol.toLowerCase().includes(additionalVolunteersSearch.trim().toLowerCase())).length === 0 && (
                            <div className="additional-volunteers-no-results">{t('No data to display')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Form actions */}
                  <div className="feedbacks-form-actions">
                    <button type="submit">{t("Save Feedback")}</button>
                    <button type="button" onClick={closeModal}>{t("Cancel")}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
        {validationPopup && (
          <div className="validation-popup">
            <div className="validation-popup-header error-ribbon">
              {t("ERROR")}
            </div>
            <ul>
              {validationPopup.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
            <button className="validation-popup-close" onClick={() => setValidationPopup(null)}>
              {t("Close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedbacks;
