import Select from "react-select";
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/reports.css";
import "../styles/feedbacks.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import axios from "../axiosConfig";
import { hasAllPermissions, hasViewPermissionForTable } from '../components/utils';
import { feedbackShowErrorToast } from "../components/toastUtils";

const PAGE_SIZE = 2;

const hasTutorFeedbacksViewPermission = hasViewPermissionForTable("tutor_feedback");

const TutorFeedbacks = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [canDelete, setCanDelete] = useState(false);


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
  // Add at the top with other useState hooks
  const [infoModalData, setInfoModalData] = useState(null);
  const [showAdditionalVolunteersDropdown, setShowAdditionalVolunteersDropdown] = useState(false);

  // data fetching
  const [tutors, setTutors] = useState([]);
  const [tutees, setTutees] = useState([]);
  const [additionalVolunteers, setAdditionalVolunteers] = useState([]);

  const [staffOptions, setStaffOptions] = useState([]);
  const currentUser = localStorage.getItem('username')?.replace(/ /g, '_');
  const [currentStaffid, setCurrentStaffid] = useState(null);
  const [isCurrentUserTutor, setIsCurrentUserTutor] = useState(true);
  const [currentUserRoles, setCurrentUserRoles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      axios.get("/api/reports/tutor-feedback-report/"),
      axios.get("/api/get_tutorships/"),
      axios.get("/api/staff/"),
    ])
      .then(([feedbackRes, tutorshipsRes, staffRes]) => {
        const allFeedbacks = feedbackRes.data.tutor_feedback || [];
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

        //  additionalVolunteers contains the list of first names and last names of all staff members
        // that have at least one role of "General Volunteer" or "Tutor"
        const additionalStaffInHospitalVisit = staffs.filter(s => {
          const hasRole = s.roles.some(role => role === "General Volunteer" || role === "Tutor");
          return hasRole;
        }).map(s => `${s.first_name} ${s.last_name}`);

        setAdditionalVolunteers(additionalStaffInHospitalVisit);

        const currentStaff = staffs.find(s => s.username === currentUser);

        if (currentStaff) {
          setCurrentStaffid(currentStaff.id);
          setCurrentUserRoles(currentStaff.roles || []);
          setIsAdmin((currentStaff.roles || []).includes("System Administrator"));
        }

        // Use tutorshipsRes.data.tutorships as the array
        const tutorshipArray = tutorshipsRes.data.tutorships || [];
        const approvedTutorships = tutorshipArray.filter(
          t => t.approval_counter === 2
        );

        // Build tutors and tutees arrays with full names
        const allTutors = approvedTutorships.map(t => ({
          id: t.id,
          staff_id: t.tutor_staff_id,
          name: `${t.tutor_firstname} ${t.tutor_lastname}`
        }));

        const allTutees = approvedTutorships.map(t => ({
          id: t.id,
          name: `${t.child_firstname} ${t.child_lastname}`
        }));

        setTutors(allTutors);
        setTutees(allTutees);

        // After setTutors(allTutors);
        const isCurrentUserTutor = allTutors.some(t => t.staff_id === currentStaff.id);
        setIsCurrentUserTutor(isCurrentUserTutor);
        setCanDelete(
          hasAllPermissions([
            { resource: 'childsmile_app_tutor_feedback', action: 'DELETE' },
          ])
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

  // Pagination
  const totalPages = Math.ceil(filteredFeedbacks.length / PAGE_SIZE);
  const paginatedFeedbacks = filteredFeedbacks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Modal logic
  const openModal = (feedback = {}) => {
    // If editing, map names to IDs for Select components
    let modalInit = { ...feedback };
    if (feedback.feedback_id) {
      modalInit.id = feedback.feedback_id;
      // Find the tutor and tutee by name to get their IDs
      const tutor = tutors.find(t => t.name === feedback.tutor_name);
      const tutee = tutees.find(t => t.name === feedback.tutee_name);
      modalInit.tutor_id = tutor ? tutor.id : feedback.tutor_id || "";
      modalInit.tutee_id = tutee ? tutee.id : feedback.tutee_id || "";
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
  };


  const [validationPopup, setValidationPopup] = useState(null);

  const validateModal = () => {
    const errors = {};
    if (!modalData.tutor_id) errors.tutor_name = t("Tutor Name is required");
    if (!modalData.tutee_id && modalData.feedback_type !== "general_volunteer_hospital_visit") errors.tutee_name = t("Tutee Name is required");
    if (!modalData.event_date) errors.event_date = t("Event Date is required");
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
    console.log("Deleting feedback with ID:", id);
    handleDeleteFeedback(id);
    fetchData();
  };

  const handleAddFeedbackSubmit = () => {
    // Prepare data as the DB expects: use tutor_id and tutee_id, not names
    const now = new Date();
    const feedback_filled_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    console.log("Feedback type:", modalData.feedback_type);
    const data = {
      tutor_id: modalData.tutor_id,
      tutee_id: modalData.tutee_id,
      staff_id: currentStaffid,
      tutor_name: tutors.find(t => t.id === modalData.tutor_id)?.name,
      tutee_name: tutees.find(t => t.id === modalData.tutee_id)?.name,
      event_date: modalData.event_date,
      description: modalData.description,
      exceptional_events: modalData.exceptional_events || "",
      anything_else: modalData.anything_else || "",
      comments: modalData.comments || "",
      is_it_your_tutee: modalData.is_it_your_tutee || false,
      is_first_visit: modalData.is_first_visit || false,
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

    console.log("Data to be sent:", data);
    axios.post("/api/create_tutor_feedback/", data)
      .then(() => {
        toast.success(t("Feedback created successfully"));
        fetchData();
      })
      .catch((error) => {
        if (error.response && error.response.status === 404) {
          feedbackShowErrorToast(t, "Current user was not found in active tutors, cannot create feedback", error);
        } else {
          feedbackShowErrorToast(t, "Error creating feedback", error);
        }
        console.error("Error creating feedback:", error);
      });
  };

  const handleEditFeedbackSubmit = () => {
    const now = new Date();
    const feedback_filled_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const data = {
      id: modalData.id,
      tutor_id: modalData.tutor_id,
      tutee_id: modalData.tutee_id,
      staff_id: currentStaffid,
      tutor_name: tutors.find(t => t.id === modalData.tutor_id)?.name,
      tutee_name: tutees.find(t => t.id === modalData.tutee_id)?.name,
      event_date: modalData.event_date,
      description: modalData.description,
      exceptional_events: modalData.exceptional_events || "",
      anything_else: modalData.anything_else || "",
      comments: modalData.comments || "",
      is_it_your_tutee: modalData.is_it_your_tutee || false,
      is_first_visit: modalData.is_first_visit || false,
      feedback_filled_at: feedback_filled_date,
      feedback_type: modalData.feedback_type,
      hospital_name: modalData.hospital_name,
      additional_volunteers: Array.isArray(modalData.additional_volunteers)
        ? modalData.additional_volunteers.join(",")
        : "",
    };
    console.log("Update Data to be sent:", data);
    axios.put(`/api/update_tutor_feedback/${modalData.id}/`, data)
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
    fetchData();
  };

  const handleDeleteFeedback = (id) => {
    console.log("Deleting feedback with ID:", id);
    axios.delete(`/api/delete_tutor_feedback/${id}/`)
      .then(() => {
        toast.success(t("Feedback deleted successfully"));
        fetchData();
      })
      .catch((error) => {
        feedbackShowErrorToast(t, "Error deleting feedback", error);
        console.error("Error deleting feedback:", error);
      });
  };


  /* if user doesn't have permission to view the page, show a message */
  if (!hasTutorFeedbacksViewPermission) {
    return (
      <div className="tutor-feedbacks-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Tutor Feedbacks")} />
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
    <div className="tutor-feedbacks-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Tutor Feedbacks")} />
      <div className="feedbacks-page-content">
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
        {loading && <div className="loader">{t("Loading data...")}</div>}

        <div className="feedbacks-filter-create-container">
          <div className="feedbacks-actions">
            <div className="create-feedback">
              <button
                onClick={() => openModal({})}
                disabled={!(isCurrentUserTutor || isAdmin)}

              >
                {t("Create Feedback")}
              </button>
            </div>
            <div className="feedbacks-filter-row">
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
                className="feedbacks-type-filter"
              >
                <option value="">{t("All Feedbacks Types")}</option>
                <option value="tutor_fun_day">{t("tutor_fun_day")}</option>
                <option value="general_volunteer_fun_day">{t("general_volunteer_fun_day")}</option>
                <option value="general_volunteer_hospital_visit">{t("general_volunteer_hospital_visit")}</option>
                <option value="tutorship">{t("tutorship")}</option>
              </select>
            </div>
            <div className="feedbacks-filter-pairs">
              <div className="feedbacks-filter-pair">
                <div className="feedbacks-filter-row">
                  <label>{t("Event Date From")}:</label>
                  <input type="date" value={eventFrom} onChange={e => setEventFrom(e.target.value)} className="feedbacks-date-input" />
                </div>
                <div className="feedbacks-filter-row">
                  <label>{t("Event Date To")}:</label>
                  <input type="date" value={eventTo} onChange={e => setEventTo(e.target.value)} className="feedbacks-date-input" />
                </div>
              </div>
              <div className="feedbacks-filter-pair">
                <div className="feedbacks-filter-row">
                  <label>{t("Feedback Fill Date From")}:</label>
                  <input type="date" value={feedbackFrom} onChange={e => setFeedbackFrom(e.target.value)} className="feedbacks-date-input" />
                </div>
                <div className="feedbacks-filter-row">
                  <label>{t("Feedback Fill Date To")}:</label>
                  <input type="date" value={feedbackTo} onChange={e => setFeedbackTo(e.target.value)} className="feedbacks-date-input" />
                </div>
              </div>
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
            <div className="back-to-feedbacks">
              <button className="feedbacks-back-button" onClick={() => (window.location.href = '/feedbacks')}>{t("Back to Feedbacks")}</button>
            </div>
            {paginatedFeedbacks.length === 0 ? (
              <div className="no-data">{t("No data to display")}</div>
            ) : (
              <table className="feedbacks-data-grid">
                <thead>
                  <tr>
                    <th>{t("Tutor Name")}</th>
                    <th>{t("Tutee Name / Hospital Name")}</th>
                    <th>{t("Is It Your Tutee?")}</th>
                    <th>{t("Is First Visit?")}</th>
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
                <tbody>
                  {paginatedFeedbacks.map((feedback, index) => (
                    <tr key={index}>
                      <td>{feedback.tutor_name}</td>
                      <td>{feedback.tutee_name}</td>
                      <td>{feedback.is_it_your_tutee ? t("Yes") : t("No")}</td>
                      <td>{feedback.is_first_visit ? t("Yes") : t("No")}</td>
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
            Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={currentPage === i + 1 ? "active" : ""}
              >
                {i + 1}
              </button>
            ))
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
        {/* Modal for create/edit */}
        {infoModalData && (
          <div className="feedbacks-modal-overlay">
            <div className="feedbacks-modal-content">
              <span className="feedbacks-close" onClick={() => setInfoModalData(null)}>&times;</span>
              <h2>{t("Feedback Details")}</h2>
              <div className="feedbacks-info-grid">
                <p>{t("Tutor Name")}: {infoModalData.tutor_name}</p>
                <p>{t("Tutee Name / Hospital Name")}:{infoModalData.tutee_name || infoModalData.hospital_name}</p>
                <p>{t("Is It Your Tutee?")}:{infoModalData.is_it_your_tutee ? t("Yes") : t("No")}</p>
                <p>{t("Is First Visit?")}:{infoModalData.is_first_visit ? t("Yes") : t("No")}</p>
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
                        disabled={!!modalData.id} // <-- Add this
                      />
                    </div>
                    <div className="feedbacks-form-row">
                      <label>{t("Phones")}</label>
                      <input
                        type="text"
                        value={modalData.phones || ""}
                        onChange={e => setModalData({ ...modalData, phones: e.target.value })}
                        placeholder={t("Enter phones comma separated")}
                        disabled={!!modalData.id} // <-- Add this
                      />
                    </div>
                    <div className="feedbacks-form-row">
                      <label>{t("Other Information")}</label>
                      <input
                        type="text"
                        value={modalData.other_information || ""}
                        onChange={e => setModalData({ ...modalData, other_information: e.target.value })}
                        placeholder={t("Enter other information")}
                        disabled={!!modalData.id} // <-- Add this
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
                      <input
                        type="text"
                        value={modalData.hospital_name || ""}
                        onChange={e => setModalData({ ...modalData, hospital_name: e.target.value })}
                        hidden={!!modalData.id}
                      />
                    </div>
                  )}

                  {/* Tutor Name */}
                  <div className="feedbacks-form-row">
                    <label>{t("Tutor Name")}</label>
                    {modalData.id ? (
                      <input
                        type="text"
                        value={tutors.find(t => t.id === modalData.tutor_id)?.name || modalData.tutor_name || ""}
                        disabled
                        className="feedbacks-readonly-input"
                      />
                    ) : (
                      <Select
                        value={tutors.find(t => t.id === modalData.tutor_id) || null}
                        onChange={option => setModalData({ ...modalData, tutor_id: option ? option.id : "" })}
                        options={tutors}
                        getOptionLabel={option => option.name}
                        getOptionValue={option => option.id}
                        placeholder={t("Select Tutor")}
                        isClearable
                        classNamePrefix={"feedbacks-select"}
                      />
                    )}
                  </div>

                  {/* Tutee Name, Is It Your Tutee, Is It Your First Visit - only for non-hospital visit */}
                  {modalData.feedback_type !== "general_volunteer_hospital_visit" && (
                    <>
                      <div className="feedbacks-form-row">
                        <label>{t("Tutee Name")}</label>
                        {modalData.id ? (
                          <input
                            type="text"
                            value={tutees.find(t => t.id === modalData.tutee_id)?.name || modalData.tutee_name || ""}
                            disabled
                            className="feedbacks-readonly-input"
                          />
                        ) : (
                          <Select
                            value={tutees.find(t => t.id === modalData.tutee_id) || null}
                            onChange={option => setModalData({ ...modalData, tutee_id: option ? option.id : "" })}
                            options={tutees}
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
                      <div className="feedbacks-form-row">
                        <label>{t("Is It Your First Visit?")}</label>
                        <Select
                          value={modalData.is_first_visit ? { value: true, label: t("Yes") } : { value: false, label: t("No") }}
                          onChange={option => setModalData({ ...modalData, is_first_visit: option.value })}
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
                  {/* Additional Volunteers only for hospital visit */}
                  {modalData.feedback_type === "general_volunteer_hospital_visit" && (
                    <div className="feedbacks-form-row">
                      <label>{t("Additional Volunteers")}</label>
                      <div className="additional-volunteers-dropdown-container">
                        <button
                          type="button"
                          className={`additional-volunteers-dropdown-button`}
                          onClick={() => setShowAdditionalVolunteersDropdown(prev => !prev)}
                        >
                          {modalData.additional_volunteers && modalData.additional_volunteers.length > 0
                            ? modalData.additional_volunteers.join(', ')
                            : t('Select Additional Volunteers')}
                        </button>
                        {showAdditionalVolunteersDropdown && (
                          <div className="additional-volunteers-dropdown">
                            {additionalVolunteers.map((vol, idx) => (
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
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

export default TutorFeedbacks;