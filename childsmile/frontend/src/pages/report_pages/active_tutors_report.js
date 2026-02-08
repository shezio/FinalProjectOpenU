import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import InnerPageHeader from '../../components/InnerPageHeader';
import '../../styles/common.css';
import '../../styles/reports.css';
import { hasViewPermissionForTable, navigateTo } from '../../components/utils';
import axios from '../../axiosConfig';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../../components/export_utils';
import { useTranslation } from 'react-i18next'; // Import the translation hook

const PAGE_SIZE = 10;

const ActiveTutorsReport = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation(); // Translation hook

  // Check if the user has permission to view the required tables
  const hasPermissionToView =
    hasViewPermissionForTable('tutorships') &&
    hasViewPermissionForTable('children') &&
    hasViewPermissionForTable('tutors');

  const [sortOrderTutorshipCreationDate, setSortOrderTutorshipCreationDate] = useState('desc'); // Default to ascending

  const parseDate = (dateString) => {
    if (!dateString) return new Date(0); // Handle missing dates
    const [day, month, year] = dateString.split('/');
    return new Date(`${year}-${month}-${day}`);
  };

  const toggleSortOrderTutorshipCreationDate = () => {
    setSortOrderTutorshipCreationDate((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
    const sorted = [...tutors].sort((a, b) => {
      const dateA = parseDate(a.created_date);
      const dateB = parseDate(b.created_date);
      return sortOrderTutorshipCreationDate === 'asc' ? dateB - dateA : dateA - dateB; // Reverse the logic
    });
    setTutors(sorted);
  };

  const handleCheckboxChange = (index) => {
    const updatedTutors = tutors.map((tutor, i) => {
      if (i === index) {
        return { ...tutor, selected: !tutor.selected };
      }
      return tutor;
    });
    setTutors(updatedTutors);
  };

  const handleSelectAllCheckbox = (isChecked) => {
    const updatedTutors = tutors.map((tutor) => ({
      ...tutor,
      selected: isChecked,
    }));
    setTutors(updatedTutors);
  };
  const fetchData = () => {
    setLoading(true);
    setSortOrderTutorshipCreationDate('desc'); // Reset sort order when fetching new data
    setCurrentPage(1);
    axios
      .get('/api/reports/active-tutors-report/', {
        params: { from_date: fromDate, to_date: toDate },
      })
      .then((response) => {
        setTutors(response.data.active_tutors || []);
      })
      .catch((error) => {
        console.error('Error fetching active tutors report:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const refreshData = () => {
    // Refresh the data without applying filters
    setFromDate('');
    setToDate('');
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

  if (!hasPermissionToView) {
    return (
      <div className="active-tutors-report-main-content">
        <Sidebar />
        <InnerPageHeader title="דוח חונכויות פעילות" />
        <div className="page-content">
          <div className="no-permission">
            <h2>אין לך הרשאה לצפות בדף זה</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="active-tutors-report-main-content">
      <Sidebar />
      <InnerPageHeader title="דוח חונכויות פעילות" />
      <div className="page-content">
        <div className="filter-create-container">
          <div className="actions">
            <button
              className="export-button excel-button"
              onClick={() => exportToExcel(tutors, t)}
            >
              <img src="/assets/excel-icon.png" alt="Excel" />
            </button>
            <button
              className="export-button pdf-button"
              onClick={() => exportToPDF(tutors, t)}
            >
              <img src="/assets/pdf-icon.png" alt="PDF" />
            </button>
            <label htmlFor="date-from">מתאריך:</label>
            <input
              type="date"
              id="date-from"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="date-input"
            />
            <label htmlFor="date-to">עד תאריך:</label>
            <input
              type="date"
              id="date-to"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="date-input"
            />
            <button className="filter-button" onClick={fetchData}>
              {t('Filter')}
            </button>
            <button className="refresh-button" onClick={refreshData}>
              {t('Refresh')}
            </button>
          </div>
        </div>
        {!loading && (
          <div className="active-tutors-back-to-reports">
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
          <div className="grid-container">
            {tutors.length === 0 ? (
              <div className="no-data">{t("No data to display")}</div>
            ) : (
              <>
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAllCheckbox(e.target.checked)}
                      />
                    </th>
                    <th>{t('Child Name')}</th>
                    <th>{t('Tutor Name')}</th>
                    <th className="wide-column">
                      {t('Tutorship create date')}
                      <button
                        className="sort-button"
                        onClick={toggleSortOrderTutorshipCreationDate}
                      >
                        {sortOrderTutorshipCreationDate === 'asc' ? '▲' : '▼'}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tutors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((tutor, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={tutor.selected || false}
                          onChange={() => handleCheckboxChange(index)}
                        />
                      </td>
                      <td>{tutor.child_firstname} {tutor.child_lastname}</td>
                      <td>{tutor.tutor_firstname} {tutor.tutor_lastname}</td>
                      <td>{tutor.created_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="pagination-arrow">&laquo;</button>
                <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="pagination-arrow">&lsaquo;</button>
                {Array.from({ length: Math.ceil(tutors.length / PAGE_SIZE) }, (_, i) => {
                  const pageNum = i + 1;
                  const totalPages = Math.ceil(tutors.length / PAGE_SIZE);
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
                <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(tutors.length / PAGE_SIZE)} className="pagination-arrow">&rsaquo;</button>
                <button onClick={() => setCurrentPage(Math.ceil(tutors.length / PAGE_SIZE))} disabled={currentPage === Math.ceil(tutors.length / PAGE_SIZE)} className="pagination-arrow">&raquo;</button>
              </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveTutorsReport;