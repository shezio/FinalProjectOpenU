import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import InnerPageHeader from "../components/InnerPageHeader";
import "../styles/common.css";
import "../styles/families.css";
import '../styles/systemManagement.css'; // Special CSS for this page
import '../styles/tut_vol_mgmt.css'; // Special CSS for this page
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
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);
  const [tutorshipStatusFilter, setTutorshipStatusFilter] = useState("");

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

  const confirmEdit = (entity, field) => {
    if (editValue !== entity[field]) {
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
      
      const updatedEntity = { ...entity, [field]: editValue };
      if (editingCell.type === "tutor") {
        axios.put(`/api/update_tutor/${editingCell.rowId}/`, updatedEntity)
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
        axios.put(`/api/update_general_volunteer/${editingCell.rowId}/`, updatedEntity)
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
        if (entity.tutorship_status !== tutorshipStatusFilter) {
          return false;
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
        <table className="families-data-grid">
          <thead>
            <tr>
              {showTutors ? (
                <>
                  <th>{t("Israeli ID")}</th>
                  <th>{t("Phone")}</th>
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
                    className="editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "id", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "id" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "id")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "id")}
                        autoFocus
                      />
                    ) : (
                      entity.id
                    )}
                  </td>
                  <td
                    className="editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "phone", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "phone" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "phone")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "phone")}
                        autoFocus
                      />
                    ) : (
                      formatPhoneDisplay(entity.phone) || "-"
                    )}
                  </td>
                  <td>{entity.name || entity.first_name + " " + entity.last_name}</td>
                  <td>{entity.tutor_email || entity.email || "-"}</td>
                  <td
                    className="editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "tutorship_status", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "tutorship_status" ? (
                      <select
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "tutorship_status")}
                        autoFocus
                      >
                        {tutorshipStatusOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      entity.tutorship_status
                    )}
                  </td>
                  <td
                    className="editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "preferences", "tutor")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "preferences" ? (
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "preferences")}
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
                      <span className="text-cell-content">{entity.preferences || "-"}</span>
                    )}
                  </td>
                  <td
                    className={entity.in_tutorship ? "editable-cell" : ""}
                    onClick={() => entity.in_tutorship && !editingCell && startEdit(entity, "relationship_status", "tutor")}
                  >
                    {entity.in_tutorship ? (
                      editingCell?.rowId === entity.id && editingCell?.field === "relationship_status" ? (
                        <select
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => confirmEdit(entity, "relationship_status")}
                          autoFocus
                        >
                          {maritalStatusOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        entity.relationship_status || "-"
                      )
                    ) : (
                      <span className="disabled-cell">{entity.relationship_status || t("no data - see tutorship status")}</span>
                    )}
                  </td>
                  <td
                    className={entity.in_tutorship ? "editable-cell" : ""}
                    onClick={() => entity.in_tutorship && !editingCell && startEdit(entity, "tutee_wellness", "tutor")}
                  >
                    {entity.in_tutorship ? (
                      editingCell?.rowId === entity.id && editingCell?.field === "tutee_wellness" ? (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => confirmEdit(entity, "tutee_wellness")}
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
                        <span className="text-cell-content">{entity.tutee_wellness || "-"}</span>
                      )
                    ) : (
                      <span className="disabled-cell">{entity.tutee_wellness || t("no data - see tutorship status")}</span>
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
        <table className="families-data-grid">
          <thead>
            <tr>
              <th>{t("Israeli ID")}</th>
              <th>{t("Phone")}</th>
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
            </tr>
          </thead>
          <tbody>
            {paginatedEntities.length === 0 ? (
              <tr><td colSpan={6}>{t("No data to display")}</td></tr>
            ) : (
              paginatedEntities.map((entity, idx) => (
                <tr key={entity.id_id || entity.id || idx}>
                  <td
                    className="editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "id", "volunteer")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "id" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "id")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "id")}
                        autoFocus
                      />
                    ) : (
                      entity.id
                    )}
                  </td>
                  <td
                    className="editable-cell"
                    onClick={() => !editingCell && startEdit(entity, "phone", "volunteer")}
                  >
                    {editingCell?.rowId === entity.id && editingCell?.field === "phone" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => confirmEdit(entity, "phone")}
                        onKeyPress={e => e.key === 'Enter' && confirmEdit(entity, "phone")}
                        autoFocus
                      />
                    ) : (
                      formatPhoneDisplay(entity.phone) || "-"
                    )}
                  </td>
                  <td>{entity.first_name + " " + entity.last_name}</td>
                  <td>{entity.email}</td>
                  <td
                    className="editable-cell"
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
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-cell-content">{entity.comments || "-"}</span>
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
              {tutorshipStatusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
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
    </div>
  );
};

export default TutorVolunteerMgmt;
