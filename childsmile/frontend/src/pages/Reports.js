import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';
import '../styles/reports.css';
import { hasSomePermissions } from '../components/utils';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 8;

const Reports = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

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
  const hasPermissionToGetFamiliesPerLocationReport = hasSomePermissions(get_families_per_location_report_permissions);
  const hasPermissionToRolesSpreadStatsReport = hasSomePermissions(roles_spread_stats_report_permissions);
  const hasPermissionToNewFamiliesReport = hasSomePermissions(new_families_report_permissions);
  const hasPermissionToFamiliesWaitingForTutorshipReport = hasSomePermissions(families_waiting_for_tutorship_report_permissions);
  const hasPermissionToActiveTutorsReport = hasSomePermissions(active_tutors_report_permissions);
  const hasPermissionToPossibleTutorshipMatchesReport = hasSomePermissions(possible_tutorship_matches_report_permissions);
  const hasPermissionToVolunteerFeedbackReport = hasSomePermissions(volunteer_feedback_report_permissions);
  const hasPermissionToTutorFeedbackReport = hasSomePermissions(tutor_feedback_report_permissions);
  const hasPermissionToFamiliesTutorshipStatsReport = hasSomePermissions(families_tutorship_stats_report_permissions);

  // IRS Volunteer Report permissions
  const all_volunteers_irs_report_permissions = [
    { resource: staff_resource, action: actions },
  ];
  const hasPermissionToAllVolunteersIRSReport = hasSomePermissions(all_volunteers_irs_report_permissions);

  // All Families Export Report permissions
  const all_families_export_report_permissions = [
    { resource: families_resource, action: actions },
  ];
  const hasPermissionToAllFamiliesExportReport = hasSomePermissions(all_families_export_report_permissions);

  // Families Missing Data Report permissions (coordinator + admin = families CREATE + staff CREATE)
  const families_missing_data_report_permissions = [
    { resource: families_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const hasPermissionToFamiliesMissingDataReport = hasSomePermissions(families_missing_data_report_permissions);

  // Families Duplicate Report permissions (same as missing data — families + staff)
  const families_duplicate_report_permissions = [
    { resource: families_resource, action: actions },
    { resource: staff_resource, action: actions },
  ];
  const hasPermissionToFamiliesDuplicateReport = hasSomePermissions(families_duplicate_report_permissions);

  const reportDetails = {
    get_families_per_location_report:         { name: 'דוח משפחות לפי מיקום',                       path: '/reports/families_per_location_report',              category: 'families' },
    new_families_report:                      { name: 'דוח משפחות חדשות מהחודש האחרון',              path: '/reports/new-families-report',                       category: 'families' },
    families_waiting_for_tutorship_report:    { name: 'דוח משפחות הממתינות לחונכות',                 path: '/reports/families_waiting_for_tutorship_report',     category: 'families' },
    families_tutorship_stats_report:          { name: 'דוח התפלגות משפחות ממתינות לחונכות',          path: '/reports/families_tutorship_stats_report',           category: 'families' },
    all_families_export_report:               { name: 'דוח משפחות כללי',                             path: '/reports/all_families_export_report',                category: 'families' },
    families_missing_data_report:             { name: 'דוח משפחות עם נתונים חסרים',                  path: '/reports/families_missing_data_report',              category: 'families' },
    families_duplicate_report:                { name: 'דוח כפילויות משפחות',                          path: '/reports/families_duplicate_report',                 category: 'families' },
    active_tutors_report:                     { name: 'דוח חונכויות פעילות',                         path: '/reports/active_tutors_report',                      category: 'volunteers' },
    possible_tutorship_matches_report:        { name: 'דוח התאמות חניך חונך אפשריות',               path: '/reports/possible_tutorship_matches_report',         category: 'volunteers' },
    volunteer_feedback_report:                { name: 'דוח משוב מתנדבים',                            path: '/reports/volunteer-feedback',                        category: 'volunteers' },
    tutor_feedback_report:                    { name: 'דוח משוב חונכים',                             path: '/reports/tutor-feedback',                            category: 'volunteers' },
    all_volunteers_irs_report:                { name: 'דוח מתנדבים כללי',                            path: '/reports/all_volunteers_irs_report',                 category: 'volunteers' },
    roles_spread_stats_report:                { name: 'דוח התפלגות הרשאות',                          path: '/reports/roles_spread_stats_report',                 category: 'volunteers' },
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
    all_volunteers_irs_report: hasPermissionToAllVolunteersIRSReport,
    all_families_export_report: hasPermissionToAllFamiliesExportReport,
    families_missing_data_report: hasPermissionToFamiliesMissingDataReport,
    families_duplicate_report: hasPermissionToFamiliesDuplicateReport,
  };

  const categoryLabels = { all: 'הכל', families: 'משפחות', volunteers: 'מתנדבים' };

  const allReports = Object.entries(reportDetails)
    .filter(([key]) => reportPermissions[key])
    .filter(([, r]) => categoryFilter === 'all' || r.category === categoryFilter)
    .filter(([, r]) => r.name.includes(search));

  const totalPages = Math.max(1, Math.ceil(allReports.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = allReports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCategoryFilter = (cat) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="reports-main-content">
      <Sidebar />
      <InnerPageHeader title="דוחות" />
      <div className="page-content">
        <div className="reports-grid-page">
          {/* Search + Filter Row */}
          <div className="reports-toolbar">
            <input
              className="reports-search-input"
              type="text"
              placeholder="חיפוש דוח..."
              value={search}
              onChange={handleSearch}
              dir="rtl"
            />
            <div className="reports-filter-btns">
              {['all', 'families', 'volunteers'].map((cat) => (
                <button
                  key={cat}
                  className={`reports-filter-btn${categoryFilter === cat ? ' reports-filter-btn--active' : ''}`}
                  onClick={() => handleCategoryFilter(cat)}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="reports-table-wrapper">
            <table className="reports-grid-table" dir="rtl">
              <thead>
                <tr>
                  <th className="reports-th reports-th-num">#</th>
                  <th className="reports-th">שם הדוח</th>
                  <th className="reports-th reports-th-cat">קטגוריה</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="reports-empty-row">אין דוחות להצגה</td>
                  </tr>
                ) : (
                  paginated.map(([key, report], idx) => (
                    <tr
                      key={key}
                      className="reports-grid-row"
                      onClick={() => navigate(report.path)}
                    >
                      <td className="reports-td reports-td-num">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="reports-td">{report.name}</td>
                      <td className="reports-td reports-td-cat">
                        <span className={`reports-cat-badge reports-cat-badge--${report.category}`}>
                          {categoryLabels[report.category]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} className="pagination-arrow">&laquo;</button>
            <button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1} className="pagination-arrow">&lsaquo;</button>
            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              const maxButtons = 5;
              const halfRange = Math.floor(maxButtons / 2);
              let start = Math.max(1, safePage - halfRange);
              let end = Math.min(totalPages, start + maxButtons - 1);
              if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
              return pageNum >= start && pageNum <= end ? (
                <button
                  key={pageNum}
                  className={safePage === pageNum ? 'active' : ''}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ) : null;
            })}
            <button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="pagination-arrow">&rsaquo;</button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} className="pagination-arrow">&raquo;</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;