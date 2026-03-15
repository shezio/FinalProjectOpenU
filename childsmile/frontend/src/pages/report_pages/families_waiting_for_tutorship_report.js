import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import InnerPageHeader from "../../components/InnerPageHeader";
import "../../styles/common.css";
import "../../styles/reports.css";
import "../../styles/tutorship_pending.css";
import { hasViewPermissionForTable, hasCreatePermissionForTable, navigateTo } from "../../components/utils";
import axios from "../../axiosConfig";
import { toast } from "react-toastify";
import { exportTutorshipPendingToExcel, exportTutorshipPendingToPDF } from "../../components/export_utils";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 10;

const FamiliesWaitingForTutorshipReport = () => {
  const navigate = useNavigate();
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();
  const [sortOrderRegistrationDate, setSortOrderRegistrationDate] = useState('asc'); // Default to ascending
  const hasCreatePermission = hasCreatePermissionForTable("tutorships");
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // Search by child name
  const [selectedTutoringStatus, setSelectedTutoringStatus] = useState(""); // Single tutorship status filter
  
  // Hardcoded tutoring statuses supported in the system
  const tutoringStatuses = [
    "למצוא חונך",
    "יש חונך",
    "אין חונך",
    "בוגר",
    "שידוך בסימן שאלה",
    "למצוא חונך בעדיפות גבוהה",
    "למצוא חונך אין באיזור שלו",
    "לא רוצים",
    "לא רלוונטי"
  ];

  // Format status for display (remove underscores)
  const formatStatusDisplay = (status) => {
    if (!status) return status;
    return String(status).replace(/_/g, ' ');
  };

  const parseDate = (dateString) => {
    if (!dateString) return new Date(0); // Handle missing dates
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  // Helper to get gender icon
  const getGenderIcon = (gender) => {
    // Handle Hebrew text values
    if (gender === 'זכר') return '♂️';
    if (gender === 'נקבה') return '♀️';
    // Handle boolean values (true = Female, false = Male)
    if (gender === true) return '♀️';
    if (gender === false) return '♂️';
    // Handle string boolean values
    if (gender === 'true') return '♀️';
    if (gender === 'false') return '♂️';
    return '';
  };

  const toggleSortOrderRegistrationDate = () => {
    setSortOrderRegistrationDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...families].sort((a, b) => {
      const dateA = parseDate(a.registration_date);
      const dateB = parseDate(b.registration_date);
      return sortOrderRegistrationDate === 'asc' ? dateB - dateA : dateA - dateB; // Reverse the logic
    });
    setFamilies(sorted);
  };

  const handleCheckboxChange = (index) => {
    const updatedFamilies = families.map((family, i) => {
      if (i === index) {
        return { ...family, selected: !family.selected };
      }
      return family;
    });
    setFamilies(updatedFamilies);
    
    // Update selectedFamily when checkbox changes
    const selectedCount = updatedFamilies.filter(f => f.selected).length;
    if (selectedCount === 1) {
      setSelectedFamily(updatedFamilies.find(f => f.selected));
    } else {
      setSelectedFamily(null);
    }
  };

  const handleSelectAllCheckbox = (isChecked) => {
    const updatedFamilies = families.map((family) => ({
      ...family,
      selected: isChecked,
    }));
    setFamilies(updatedFamilies);
    setSelectedFamily(isChecked && families.length === 1 ? families[0] : null);
  };

  const handleManualMatch = () => {
    if (!selectedFamily) {
      toast.error(t("Please select exactly one family"));
      return;
    }
    // Navigate to Tutorships page with the selected child ID using React Router
    navigate("/tutorships", { 
      state: {
        manualMatchChildId: selectedFamily.child_id,
        childName: `${selectedFamily.first_name} ${selectedFamily.last_name}`,
        childGender: selectedFamily.gender
      }
    });
  };


  const hasPermissionToView = hasViewPermissionForTable("children");

  const fetchData = () => {
    setLoading(true);
    setSortOrderRegistrationDate('desc');
    setCurrentPage(1);
    axios
      .get("/api/reports/families-waiting-for-tutorship-report/", {
        params: { from_date: fromDate, to_date: toDate },
      })
      .then((response) => {
        setFamilies(response.data.families_waiting_for_tutorship || []);
      })
      .catch((error) => {
        console.error("Error fetching families waiting for tutorship report:", error);
        toast.error(t("Error fetching data"));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const refreshData = () => {
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    fetchData();
  };

  useEffect(() => {
    if (hasPermissionToView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasPermissionToView]);

  // Filter families by search term (child name only) and tutoring status
  const filteredFamilies = families.filter((family) => {
    const matchesSearch = !searchTerm.trim() || 
      `${family.first_name} ${family.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTutoringStatus = !selectedTutoringStatus || 
      formatStatusDisplay(family.tutoring_status) === selectedTutoringStatus;
    
    return matchesSearch && matchesTutoringStatus;
  });

  if (!hasPermissionToView) {
    return (
      <div className="families-waiting-report-main-content">
        <Sidebar />
        <InnerPageHeader title={t("Families Waiting for Tutorship Report")} />
        <div className="page-content">
          <div className="no-permission">
            <h2>{t("You do not have permission to view this page")}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="families-waiting-report-main-content">
      <Sidebar />
      <InnerPageHeader title={t("Families Waiting for Tutorship Report")} />
      <div className="page-content">
        
        <div className="filter-create-container">
          <div className="actions">
            <button
              className="export-button excel-button"
              onClick={() => exportTutorshipPendingToExcel(filteredFamilies, t)}
            >
              <img src="/assets/excel-icon.png" alt="Excel" />
            </button>
            <button
              className="export-button pdf-button"
              onClick={() => exportTutorshipPendingToPDF(filteredFamilies, t)}
            >
              <img src="/assets/pdf-icon.png" alt="PDF" />
            </button>
            <input
              className="search-bar"
              type="text"
              placeholder={t("Search by child name")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="tutorship-status-filter"
              value={selectedTutoringStatus}
              onChange={(e) => {
                setSelectedTutoringStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">{t("All Statuses")}</option>
              {tutoringStatuses.map(status => (
                <option key={status} value={status}>{formatStatusDisplay(status)}</option>
              ))}
            </select>
            {hasCreatePermission && (
              <button
                className="filter-button"
                onClick={handleManualMatch}
                disabled={!selectedFamily}
                title={selectedFamily ? t("Create manual tutorship match for selected family") : t("Select exactly one family to create a manual match")}
              >
                {t("Manual Match")}
              </button>
            )}
            <label htmlFor="date-from">{t("From Date")}:</label>
            <input
              type="date"
              id="date-from"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="date-input"
            />
            <label htmlFor="date-to">{t("To Date")}:</label>
            <input
              type="date"
              id="date-to"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="date-input"
            />
            <button className="filter-button" onClick={fetchData}>
              {t("Filter")}
            </button>
            <button className="refresh-button" onClick={refreshData}>
              {t("Refresh")}
            </button>
          </div>
        </div>
        {!loading && (
          <div className="back-to-reports">
            <button
              className="back-button"
              onClick={() => navigateTo('/reports')}
            >
              → {t('Click to return to Report page')}
            </button>
          </div>
        )}
        {loading ? (
          <div className="loader">{t("Loading data...")}</div>
        ) : (
          <div className="tutorship-pending-grid-container">
            {filteredFamilies.length === 0 ? (
              <div className="no-data">{t("No data to display")}</div>
            ) : (
              <>
              <table className="tutorship-pending-data-grid">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAllCheckbox(e.target.checked)}
                      />
                    </th>
                    <th>{t("Child Full Name")}</th>
                    <th>{t("Father Name")}</th>
                    <th>{t("Father Phone")}</th>
                    <th>{t("Mother Name")}</th>
                    <th>{t("Mother Phone")}</th>
                    <th>{t("Tutoring Status")}</th>
                    <th className="wide-column">
                      {t("Registration Date")}
                      <button
                        className="sort-button"
                        onClick={toggleSortOrderRegistrationDate}
                      >
                        {sortOrderRegistrationDate === 'asc' ? '▲' : '▼'}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFamilies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((family, idx) => {
                    const filteredIndex = (currentPage - 1) * PAGE_SIZE + idx;
                    return (
                      <tr key={filteredIndex}>
                        <td>
                          <input
                            type="checkbox"
                            checked={family.selected || false}
                            onChange={() => handleCheckboxChange(filteredIndex)}
                          />
                        </td>
                        <td>{family.first_name} {family.last_name} {getGenderIcon(family.gender)}</td>
                        <td>{family.father_name}</td>
                        <td>{family.father_phone}</td>
                        <td>{family.mother_name}</td>
                        <td>{family.mother_phone}</td>
                        <td>{formatStatusDisplay(family.tutoring_status)}</td>
                        <td>{family.registration_date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="pagination">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-arrow">&laquo;</button>
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-arrow">&lsaquo;</button>
                {Array.from({ length: Math.ceil(filteredFamilies.length / PAGE_SIZE) }, (_, i) => {
                  const pageNum = i + 1;
                  const totalPages = Math.ceil(filteredFamilies.length / PAGE_SIZE);
                  const maxButtons = 5;
                  const halfRange = Math.floor(maxButtons / 2);
                  let start = Math.max(1, currentPage - halfRange);
                  let end = Math.min(totalPages, start + maxButtons - 1);
                  if (end - start < maxButtons - 1) {
                    start = Math.max(1, end - maxButtons + 1);
                  }
                  return pageNum >= start && pageNum <= end ? (
                    <button
                      key={pageNum}
                      className={currentPage === pageNum ? "active" : ""}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ) : null;
                })}
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(filteredFamilies.length / PAGE_SIZE)} className="pagination-arrow">&rsaquo;</button>
                <button onClick={() => setCurrentPage(Math.ceil(filteredFamilies.length / PAGE_SIZE))} disabled={currentPage === Math.ceil(filteredFamilies.length / PAGE_SIZE)} className="pagination-arrow">&raquo;</button>
              </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FamiliesWaitingForTutorshipReport;