import React from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css'; // Import specific styles for the Reports page
import { hasSomePermissions } from '../components/utils'; // Import utility functions for fetching data
import { useNavigate } from 'react-router-dom';

const Reports = () => {
  const navigate = useNavigate();

  // need to show report card only if the user has permission to the resources the report is based on
  // for each report, check if the user has permission to the resources it is based on
  
  // get_families_per_location_report uses families - check for CREATE permission
  // roles_spread_stats_report uses staff - check for CREATE permission
  // new_families_report uses families - check for CREATE permission
  // families_waiting_for_tutorship_report uses families - check for CREATE permission
  // active_tutors_report uses tutorships - check for CREATE permission
  // possible_tutorship_matches_report uses  tutorships - check for CREATE permission
  // volunteer_feedback_report uses general_v_feedback - check for CREATE permission
  // tutor_feedback_report uses tutor_feedback - check for CREATE permission or STAFF create permission
  // families_tutorship_stats_report uses families - check for CREATE permission
  // pending_tutors_stats_report uses tutors pending_tutor - check for CREATE permission or STAFF create permission

  const families_resource = 'childsmile_app_children';
  const staff_resource = 'childsmile_app_staff';
  const general_v_feedback_resource = 'childsmile_app_general_v_feedback';
  const tutor_feedback_resource = 'childsmile_app_tutor_feedback';
  const pending_tutor_resource = 'childsmile_app_pending_tutors';
  const tutorships_resource = 'childsmile_app_tutorships';
  const tutor_resource = 'childsmile_app_tutors';
  const pending_tutors_resource = 'childsmile_app_pending_tutors';
  
  const actions = 'CREATE';

  const get_families_per_location_report_permissions = [
    { resource: families_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const roles_spread_stats_report_permissions = [
    { resource: staff_resource, action: actions },
  ];
  const new_families_report_permissions = [
    { resource: families_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const families_waiting_for_tutorship_report_permissions = [
    { resource: families_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const active_tutors_report_permissions = [
    { resource: tutorships_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const possible_tutorship_matches_report_permissions = [
    { resource: tutorships_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const volunteer_feedback_report_permissions = [
    { resource: general_v_feedback_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const tutor_feedback_report_permissions = [
    { resource: tutor_feedback_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const families_tutorship_stats_report_permissions = [
    { resource: families_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const pending_tutors_stats_report_permissions = [
    { resource: pending_tutor_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const hasPermissionToGetFamiliesPerLocationReport = hasSomePermissions(get_families_per_location_report_permissions);
  const hasPermissionToRolesSpreadStatsReport = hasSomePermissions(roles_spread_stats_report_permissions);
  const hasPermissionToNewFamiliesReport = hasSomePermissions(new_families_report_permissions);
  const hasPermissionToFamiliesWaitingForTutorshipReport = hasSomePermissions(families_waiting_for_tutorship_report_permissions);
  const hasPermissionToActiveTutorsReport = hasSomePermissions(active_tutors_report_permissions);
  const hasPermissionToPossibleTutorshipMatchesReport = hasSomePermissions(possible_tutorship_matches_report_permissions);
  const hasPermissionToVolunteerFeedbackReport = hasSomePermissions(volunteer_feedback_report_permissions);
  const hasPermissionToTutorFeedbackReport = hasSomePermissions(tutor_feedback_report_permissions);
  const hasPermissionToFamiliesTutorshipStatsReport = hasSomePermissions(families_tutorship_stats_report_permissions);
  const hasPermissionToPendingTutorsStatsReport = hasSomePermissions(pending_tutors_stats_report_permissions);

  const reportDetails = {
    get_families_per_location_report: { name: 'דוח משפחות לפי מיקום', path: '/reports/families_per_location_report' },
    roles_spread_stats_report: { name: 'דוח התפלגות הרשאות', path: '/reports/roles_spread_stats_report' },
    new_families_report: { name: 'דוח משפחות חדשות מהחודש האחרון', path: '/reports/new-families-report' },
    families_waiting_for_tutorship_report: { name: 'דוח משפחות הממתינות לחונכות', path: '/reports/families_waiting_for_tutorship_report' },
    active_tutors_report: { name: 'דוח חונכויות פעילות', path: '/reports/active_tutors_report' },
    possible_tutorship_matches_report: { name: 'דוח התאמות חניך חונך אפשריות', path: '/reports/possible_tutorship_matches_report' },
    volunteer_feedback_report: { name: 'דוח משוב מתנדבים', path: '/reports/volunteer-feedback' },
    tutor_feedback_report: { name: 'דוח משוב חונכים', path: '/reports/tutor-feedback' },
    families_tutorship_stats_report: { name: 'דוח התפלגות משפחות ממתינות לחונכות', path: '/reports/families_tutorship_stats_report' },
    pending_tutors_stats_report: { name: 'דוח התפלגות חונכים ממתינים לראיון', path: '/reports/pending_tutors_stats_report' },
  };

  const reportPermissions = {
    get_families_per_location_report: hasPermissionToGetFamiliesPerLocationReport,
    roles_spread_stats_report: hasPermissionToRolesSpreadStatsReport,
    new_families_report: hasPermissionToNewFamiliesReport,
    families_waiting_for_tutorship_report: hasPermissionToFamiliesWaitingForTutorshipReport,
    active_tutors_report: hasPermissionToActiveTutorsReport,
    possible_tutorship_matches_report: hasPermissionToPossibleTutorshipMatchesReport,
    volunteer_feedback_report: hasPermissionToVolunteerFeedbackReport,
    tutor_feedback_report: hasPermissionToTutorFeedbackReport,
    families_tutorship_stats_report: hasPermissionToFamiliesTutorshipStatsReport,
    pending_tutors_stats_report: hasPermissionToPendingTutorsStatsReport,
  };

  return (
    <div className="reports-main-content">
      <Sidebar />
      <InnerPageHeader title="דוחות" />
      <div className="page-content">
        <div className="reports-layout">
          <div className="reports-container-wrapper">
            <div className="reports-container">
              {Object.keys(reportDetails).map((key) => {
                const report = reportDetails[key];
                if (!reportPermissions[key]) return null; // Only show if has permission
                return (
                  <div
                    key={key}
                    className="report-card"
                    onClick={() => navigate(report.path)}
                  >
                    <h2>{report.name}</h2>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;