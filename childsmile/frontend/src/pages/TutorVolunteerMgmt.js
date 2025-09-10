import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/families.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTranslation } from "react-i18next";
import axios from "../axiosConfig";

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

  useEffect(() => {
    fetchGridData();
  }, [showTutors]);

  const fetchGridData = () => {
    setLoading(true);
    if (showTutors) {
      axios.get("/api/tutors/")
        .then(res => {
          setTutors(res.data.tutors || []);
          setTotalCount((res.data.tutors || []).length);
          setCurrentPage(1);
        })
        .catch(() => toast.error(t("Error fetching tutors")))
        .finally(() => setLoading(false));
    } else {
      axios.get("/api/get_general_volunteers_not_pending/")
        .then(res => {
          setVolunteers(res.data.volunteers || []);
          setTotalCount((res.data.volunteers || []).length);
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
        .catch(() => toast.error(t("Error updating tutor")));
    } else {
      axios.put(`/api/update_general_volunteer/${editData.id_id}/`, editData)
        .then(() => {
          toast.success(t("Volunteer updated successfully"));
          fetchGridData();
          closeEditModal();
        })
        .catch(() => toast.error(t("Error updating volunteer")));
    }
  };

  // Pagination logic
  const paginatedEntities = showTutors
    ? tutors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : volunteers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Animation CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .flip-animation {
        animation: flipGrid 0.5s linear;
        transform-style: preserve-3d;
      }
      @keyframes flipGrid {
        0% { transform: rotateY(0deg); }
        100% { transform: rotateY(-180deg); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

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
                      </>
                    ) : (
                      <>
                        <th>{t("Name")}</th>
                        <th>{t("Email")}</th>
                        <th>{t("Comments")}</th>
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
                            <td>{entity.tutorship_status}<button className="edit-pencil" onClick={() => openEditModal(entity, "tutor")}>✏️</button></td>
                            <td>{entity.preferences}<button className="edit-pencil" onClick={() => openEditModal(entity, "tutor")}>✏️</button></td>
                            <td>{entity.relationship_status}</td>
                            <td>{entity.tutee_wellness}</td>
                          </>
                        ) : (
                          <>
                            <td>{entity.first_name + " " + entity.last_name}</td>
                            <td>{entity.email}</td>
                            <td>{entity.comments}<button className="edit-pencil" onClick={() => openEditModal(entity, "volunteer")}>✏️</button></td>
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
                    onClick={() => setCurrentPage(i + 1)}
                    className={`pagination-page ${currentPage === i + 1 ? "active" : ""}`}
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
        {editModalOpen && (
          <div className="edit-modal">
            <div className="edit-modal-content">
              <span className="close" onClick={closeEditModal}>&times;</span>
              <h2>{t("Edit")} {editData.type === "tutor" ? t("Tutor") : t("Volunteer")}</h2>
              <div className="edit-form-group">
                <label>{t("Name")}</label>
                <input
                  type="text"
                  value={editData.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="edit-form-group">
                <label>{t("Email")}</label>
                <input
                  type="email"
                  value={editData.tutor_email || editData.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
              {showTutors && (
                <>
                  <div className="edit-form-group">
                    <label>{t("Tutorship Status")}</label>
                    <input
                      type="text"
                      value={editData.tutorship_status || ""}
                      onChange={(e) => setEditData({ ...editData, tutorship_status: e.target.value })}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>{t("Preferences")}</label>
                    <input
                      type="text"
                      value={editData.preferences || ""}
                      onChange={(e) => setEditData({ ...editData, preferences: e.target.value })}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>{t("Relationship Status")}</label>
                    <input
                      type="text"
                      value={editData.relationship_status || ""}
                      onChange={(e) => setEditData({ ...editData, relationship_status: e.target.value })}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>{t("Tutee Wellness")}</label>
                    <input
                      type="text"
                      value={editData.tutee_wellness || ""}
                      onChange={(e) => setEditData({ ...editData, tutee_wellness: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="edit-form-group">
                <label>{t("Comments")}</label>
                <textarea
                  value={editData.comments || ""}
                  onChange={(e) => setEditData({ ...editData, comments: e.target.value })}
                />
              </div>
              <div className="edit-modal-actions">
                <button onClick={handleEditSave} className="save-button">{t("Save Changes")}</button>
                <button onClick={closeEditModal} className="cancel-button">{t("Cancel")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorVolunteerMgmt;
