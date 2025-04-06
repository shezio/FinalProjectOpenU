import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import InnerPageHeader from '../../components/InnerPageHeader';
import '../../styles/common.css';
import '../../styles/reports.css';
import { hasViewPermissionForTable } from '../../components/utils';
import axios from 'axios';

const ActiveTutorsReport = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Check if the user has permission to view the required tables
  const hasPermissionToView =
    hasViewPermissionForTable('tutorships') &&
    hasViewPermissionForTable('children') &&
    hasViewPermissionForTable('tutors');

  const fetchData = () => {
    setLoading(true);
    axios
      .get('/api/reports/active_tutors_report/', {
        params: { from_date: fromDate, to_date: toDate },
      })
      .then((response) => {
        setTutors(response.data.tutors || []);
      })
      .catch((error) => {
        console.error('Error fetching active tutors report:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const exportToExcel = () => {
    // Logic to export data to Excel
    alert('Exporting to Excel...');
  };

  const exportToPDF = () => {
    // Logic to export data to PDF
    alert('Exporting to PDF...');
  };

  useEffect(() => {
    if (hasPermissionToView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasPermissionToView, fromDate, toDate]);

  if (!hasPermissionToView) {
    return (
      <div className="main-content">
        <Sidebar />
        <InnerPageHeader title="דוח חונכים פעילים" />
        <div className="page-content">
          <div className="no-permission">
            <h2>אין לך הרשאה לצפות בדף זה</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="דוח חונכים פעילים" />
      <div className="page-content">
        <div className="filter-create-container">
          <div className="actions">
            <button className="export-button excel-button" onClick={exportToExcel}>
              <img src="/assets/excel-icon.png" alt="Excel" />
            </button>
            <button className="export-button pdf-button" onClick={exportToPDF}>
              <img src="/assets/pdf-icon.png" alt="PDF" />
            </button>
            <label htmlFor="date-from">מתאריך:</label>
            <input
              type="date"
              id="date-from"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <label htmlFor="date-to">עד תאריך:</label>
            <input
              type="date"
              id="date-to"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <button onClick={fetchData}>סנן</button>
          </div>
        </div>
        {loading ? (
          <div className="loader">טוען נתונים...</div>
        ) : (
          <div className="grid-container">
            {tutors.length === 0 ? (
              <div className="no-data">אין נתונים להצגה</div>
            ) : (
              <table className="data-grid">
                <thead>
                  <tr>
                    <th>שם חונך</th>
                    <th>שם חניך</th>
                    <th>בחר</th>
                  </tr>
                </thead>
                <tbody>
                  {tutors.map((tutor, index) => (
                    <tr key={index}>
                      <td>{tutor.name}</td>
                      <td>{tutor.child}</td>
                      <td>
                        <input type="checkbox" />
                      </td>
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