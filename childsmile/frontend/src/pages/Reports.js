import React from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css'; // Import specific styles for the Reports page
import { hasViewPermissionForReports } from '../components/utils'; // Import utility functions for fetching data
import { useNavigate } from 'react-router-dom';

const Reports = () => {
  const navigate = useNavigate();
  const hasPermissionToAnyReport = hasViewPermissionForReports(); // Renamed for clarity

  const reportDetails = {
    get_families_per_location_report: { name: 'דוח משפחות לפי מיקום', path: '/reports/families_per_location_report' },
    new_families_report: { name: 'דוח משפחות חדשות', path: '/reports/new-families-report' },
    families_waiting_for_tutorship_report: { name: 'דוח משפחות הממתינות לחונכות', path: '/reports/families_waiting_for_tutorship_report' },
    active_tutors_report: { name: 'דוח חונכים פעילים', path: '/reports/active_tutors_report' },
    possible_tutorship_matches_report: { name: 'דוח התאמות חניך חונך אפשריות', path: '/reports/possible_tutorship_matches_report' },
    volunteer_feedback_report: { name: 'דוח משוב מתנדבים', path: '/reports/volunteer-feedback' },
    tutor_feedback_report: { name: 'דוח משוב חונכים', path: '/reports/tutor-feedback' },
  };

  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="דוחות" />
      <div className="page-content">
        <div className="reports-layout">
          <div className="reports-container-wrapper">
            <div className="reports-container">
              {!hasPermissionToAnyReport ? (
                <div className="no-permission">
                  <h2>אין לך הרשאה לצפות בדף זה</h2>
                </div>
              ) : (
                Object.keys(reportDetails).map((key) => {
                  const report = reportDetails[key];
                  return (
                    <div
                      key={key}
                      className="report-card"
                      onClick={() => navigate(report.path)}
                    >
                      <h2>{report.name}</h2>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;