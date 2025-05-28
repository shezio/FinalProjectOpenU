import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import InnerPageHeader from '../../components/InnerPageHeader';
import '../../styles/common.css';
import '../../styles/reports.css';
import { hasViewPermissionForTable } from '../../components/utils';
import axios from '../../axiosConfig';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { exportToExcel, exportToPDF } from '../../components/export_utils';
import { useTranslation } from 'react-i18next'; // Import the translation hook

const ActiveTutorsReport = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
        <ToastContainer
          position="top-center" // Center the toast
          autoClose={2000} // Auto-close after 3 seconds
          hideProgressBar={false} // Show the progress bar
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
          className="toast-rtl" // Apply the RTL class to all toasts
          rtl={true} // Ensure progress bar moves from left to right
        />
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
            <button
              className="reset-date-button"
              onClick={() => {
                setFromDate("");
                setToDate("");
                // Wait for state to update, then fetch all data
                setTimeout(() => fetchData(), 0);
              }}
            >
              {t("Reset Dates")}
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
              onClick={() => (window.location.href = '/reports')}
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
                  {tutors.map((tutor, index) => (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveTutorsReport;