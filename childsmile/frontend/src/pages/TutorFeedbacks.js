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
import { hasAllPermissions, hasViewPermissionForReports, hasViewPermissionForTable } from '../components/utils';
import { feedbackShowErrorToast } from "../components/toastUtils";

const PAGE_SIZE = 5;

const hasTutorFeedbacksViewPermission = hasViewPermissionForReports("tutor_feedback");

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
  const [sortOrderEventDate, setSortOrderEventDate] = useState('asc');
  const [sortOrderFeedbackDate, setSortOrderFeedbackDate] = useState('asc');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({});
  const [modalErrors, setModalErrors] = useState({});

  // data fetching
  const [tutors, setTutors] = useState([]);
  const [tutees, setTutees] = useState([]);

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
        }));
        setStaffOptions(staffs);


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

  const shouldShrinkTextareas =
    modalErrors.tutor_name ||
    modalErrors.tutee_name ||
    modalErrors.event_date ||
    modalErrors.description;


  const validateModal = () => {
    const errors = {};
    if (!modalData.tutor_id) errors.tutor_name = t("Tutor Name is required");
    if (!modalData.tutee_id) errors.tutee_name = t("Tutee Name is required");
    if (!modalData.event_date) errors.event_date = t("Event Date is required");
    if (!modalData.description) errors.description = t("Description is required");
    // Add more validation as needed
    setModalErrors(errors);
    return Object.keys(errors).length === 0;
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

    console.log("Feedback filled date:", feedback_filled_date);
    console.log("staffOptions:", staffOptions);
    console.log("currentUser:", currentUser);
    console.log("currentStaffid:", currentStaffid);
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
      feedback_filled_at: feedback_filled_date
    };

    console.log("Data to be sent:", data);
    axios.post("/api/create_tutor_feedback/", data)
      .then(() => {
        toast.success(t("Feedback created successfully"));
        fetchData();
      })
      .catch((error) => {
        if (error.response && error.response.status === 404) {
          feedbackShowErrorToast(t, "Current user was not found in active tutors, cannot create feedback", error);
        }
        else {
          feedbackShowErrorToast(t, "Error creating feedback", error);
        }
        console.error("Error creating feedback:", error);
      });
  };

  const handleEditFeedbackSubmit = () => {
    const now = new Date();
    const feedback_filled_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    console.log("Feedback filled date:", feedback_filled_date);
    console.log("staffOptions:", staffOptions);
    console.log("currentUser:", currentUser);
    console.log("currentStaffid:", currentStaffid);

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
      feedback_filled_at: feedback_filled_date
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
            <button className="feedbacks-refresh-button" onClick={fetchData}>
              {t("Refresh")}
            </button>
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
                    <th>{t("Tutee Name")}</th>
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
                    <th>{t("Exceptional Events")}</th>
                    <th>{t("Anything Else")}</th>
                    <th>{t("Comments")}</th>
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
                      <td>{feedback.description}</td>
                      <td>{feedback.exceptional_events}</td>
                      <td>{feedback.anything_else}</td>
                      <td>{feedback.comments}</td>
                      <td>
                        <button
                          className="feedbacks-edit-button"
                          onClick={() => openModal(feedback)}
                        >
                          {t("Edit")}
                        </button>
                        <button
                          className="feedbacks-delete-button"
                          disabled={!canDelete}
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
        {showModal && (
          <div className="feedbacks-modal-overlay">
            <div className={`feedbacks-modal-content${shouldShrinkTextareas ? " feedbacks-modal-content-shrink" : ""}`}>
              <span className="feedbacks-close" onClick={closeModal}>&times;</span>
              <h2>{modalData.id ? t("Edit Feedback") : t("Create Feedback")}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!validate()) {
                    return;
                  }
                }}
                className="feedbacks-form-grid"
              >
                <div className="feedbacks-form-row">
                  <label>{t("Tutor Name")}</label>
                  {modalData.id ? (
                    // Show as read-only text when editing
                    <input
                      type="text"
                      value={tutors.find(t => t.id === modalData.tutor_id)?.name || modalData.tutor_name || ""}
                      disabled
                      className="feedbacks-readonly-input"
                    />
                  ) : (
                    // Allow selection when creating
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
                  {modalErrors.tutor_name && <div className="error">{modalErrors.tutor_name}</div>}
                </div>
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
                  {modalErrors.tutee_name && <div className="error">{modalErrors.tutee_name}</div>}
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
                <div className="feedbacks-form-row">
                  <label>{t("Event Date")}</label>
                  <input
                    type="date"
                    className="feedbacks-date-input"
                    value={modalData.event_date || ""}
                    onChange={e => setModalData({ ...modalData, event_date: e.target.value })}
                  />
                  {modalErrors.event_date && <div className="error">{modalErrors.event_date}</div>}
                </div>
                <div className="feedbacks-form-row">
                  <label>{t("Meeting Description")}</label>
                  <textarea
                    className={`feedbacks-textarea${shouldShrinkTextareas ? " feedbacks-textarea-shrink" : ""}`}
                    value={modalData.description || ""}
                    onChange={e => setModalData({ ...modalData, description: e.target.value })}
                    scrollable
                  />
                  {modalErrors.description && <div className="error">{modalErrors.description}</div>}
                </div>
                <div className="feedbacks-form-row">
                  <label>{t("Were there any exceptional events?")}</label>
                  <textarea
                    className={`feedbacks-textarea${shouldShrinkTextareas ? " feedbacks-textarea-shrink" : ""}`}
                    value={modalData.exceptional_events || ""}
                    onChange={e => setModalData({ ...modalData, exceptional_events: e.target.value })}
                    scrollable
                  />
                </div>
                <div className="feedbacks-form-row">
                  <label>{t("Anything Else?")}</label>
                  <textarea
                    className={`feedbacks-textarea${shouldShrinkTextareas ? " feedbacks-textarea-shrink" : ""}`}
                    value={modalData.anything_else || ""}
                    onChange={e => setModalData({ ...modalData, anything_else: e.target.value })}
                    scrollable
                  />
                </div>
                <div className="feedbacks-form-row">
                  <label>{t("Comments")}</label>
                  <textarea
                    className={`feedbacks-textarea${shouldShrinkTextareas ? " feedbacks-textarea-shrink" : ""}`}
                    value={modalData.comments || ""}
                    onChange={e => setModalData({ ...modalData, comments: e.target.value })}
                    scrollable
                  />
                </div>
              </form>
              {/* Add more fields and validation as needed, each in its own row */}
              <div className="feedbacks-form-actions">
                <button onClick={handleModalSubmit}>{t("Save Feedback")}</button>
                <button onClick={closeModal}>{t("Cancel")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorFeedbacks;