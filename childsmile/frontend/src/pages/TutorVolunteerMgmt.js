import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/families.css";
import '../styles/systemManagement.css'; // Special CSS for this page
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import axios from "../axiosConfig";
import { showErrorToast } from "../components/toastUtils";

const PAGE_SIZE = 6;

const TutorVolunteerMgmt = () => {
  const { t } = useTranslation();
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

  const startEdit = (entity, field, type) => {
    const rowId = entity.id; // Always use id for tutors and volunteers
    setEditingCell({ rowId, field, type });
    setEditValue(entity[field] || "");
  };

  const confirmEdit = (entity, field) => {
    if (editValue !== entity[field]) {
      const updatedEntity = { ...entity, [field]: editValue };
      if (editingCell.type === "tutor") {
        axios.put(`/api/update_tutor/${editingCell.rowId}/`, updatedEntity)
          .then(() => {
            toast.success(t("Tutor updated successfully"));
            fetchGridData();
          })
          .catch(() => showErrorToast(t("Error updating tutor")));
      } else {
        axios.put(`/api/update_general_volunteer/${editingCell.rowId}/`, updatedEntity)
          .then(() => {
            toast.success(t("Volunteer updated successfully"));
            fetchGridData();
          })
          .catch(() => showErrorToast(t("Error updating volunteer")));
      }
    }
    // Always reset edit state, even if no change
    setEditingCell(null);
    setEditValue("");
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
    setIsRotating(true);
    setTimeout(() => {
      setShowTutors((prev) => !prev);
      setIsRotating(false);
    }, 500); // match animation duration
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
        .catch(() => showErrorToast(t("Error updating tutor")));
    } else {
      axios.put(`/api/update_general_volunteer/${editData.id_id}/`, editData)
        .then(() => {
          toast.success(t("Volunteer updated successfully"));
          fetchGridData();
          closeEditModal();
        })
        .catch(() => showErrorToast(t("Error updating volunteer")));
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
    if (!term) return entities;
    return entities.filter(entity => {
      const name = (entity.name || (entity.first_name + " " + entity.last_name) || "").toLowerCase();
      const email = (entity.tutor_email || entity.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
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

  return (
    <div className="families-main-content">
      <Sidebar />
      <div className="content">
        <InnerPageHeader title={showTutors ? t("Tutors Management") : t("Volunteers Management")} />
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
          <button onClick={toggleGrid} className="toggle-healthy-btn">
            {showTutors ? t("Show Tutors") : t("Show Volunteers")}
          </button>
          <button onClick={refreshGrid} className="refresh-volunteers-tutors-btn">
            {showTutors ? t("Refresh Tutors List") : t("Refresh Volunteers List")}
          </button>
          <input
            className="search-bar"
            type="text"
            placeholder={t("Search by name or email")}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ marginTop: "25px" }}
          />
        </div>
        <div className={`families-grid-container ${isRotating ? "flip-animation" : ""}`}>
          {loading ? (
            <div className="loader">{t("Loading data...")}</div>
          ) : (
            <>
              <table className="families-data-grid">
                <thead>
                  <tr>
                    {showTutors ? (
                      <>
                        <th>{t("Name")}</th>
                        <th>{t("Email")}</th>
                        <th>{t("Tutorship Status")}</th>
                        <th>{t("Preferences")}</th>
                        <th>{t("Relationship Status")}</th>
                        <th>{t("Tutee Wellness")}</th>
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
                    <tr><td colSpan={showTutors ? 8 : 8}>{t("No data to display")}</td></tr>
                  ) : (
                    paginatedEntities.map((entity, idx) => (
                      <tr key={entity.id_id || entity.id || idx}>
                        {showTutors ? (
                          <>
                            <td>{entity.name || entity.first_name + " " + entity.last_name}</td>
                            <td>{entity.tutor_email || entity.email || "-"}</td>
                            <td>
                              {editingCell?.rowId === entity.id && editingCell?.field === "tutorship_status" ? (
                                <select
                                  className="form-column"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => confirmEdit(entity, "tutorship_status")}
                                  style={{ minWidth: "220px", height: "30px", fontSize: "24px" }}
                                >
                                  {tutorshipStatusOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <>
                                  {entity.tutorship_status}
                                  <button className="edit-pencil" onClick={() => startEdit(entity, "tutorship_status", "tutor")}>✏️</button>
                                </>
                              )}
                            </td>
                            <td>
                              {editingCell?.rowId === entity.id && editingCell?.field === "preferences" ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => confirmEdit(entity, "preferences")}
                                  style={{ minWidth: "220px", height: "30px", fontSize: "24px", overflowX: "auto" }}
                                />
                              ) : (
                                <>
                                  {entity.preferences}
                                  <button className="edit-pencil" onClick={() => startEdit(entity, "preferences", "tutor")}>✏️</button>
                                </>
                              )}
                            </td>
                            <td>
                              {entity.relationship_status ? entity.relationship_status : t("no data - see tutorship status")}
                            </td>
                            <td>
                              {entity.tutee_wellness ? entity.tutee_wellness : t("no data - see tutorship status")}
                            </td>
                            <td>
                              {entity.updated ? formatUpdatedDate(entity.updated) : t("No updates yet")}
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{entity.first_name + " " + entity.last_name}</td>
                            <td>{entity.email}</td>
                            <td>
                              {editingCell?.rowId === entity.id && editingCell?.field === "comments" ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => confirmEdit(entity, "comments")}
                                  style={{ minWidth: "220px", height: "30px", fontSize: "24px", overflowX: "auto" }}
                                />
                              ) : (
                                <>
                                  {entity.comments}
                                  <button
                                    className="edit-pencil"
                                    onClick={() => startEdit(entity, "comments", "volunteer")}>✏️</button>
                                </>
                              )}
                            </td>
                            <td>
                              {entity.updated ? formatUpdatedDate(entity.updated) : entity.signupdate ? formatUpdatedDate(entity.signupdate) : t("No updates yet")}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {/* Pagination controls */}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorVolunteerMgmt;
