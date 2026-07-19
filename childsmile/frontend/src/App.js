import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import NotificationBell from './components/NotificationBell';
import Login from './Login';
import Tasks from './pages/Tasks'; // Import the Tasks component
import Families from './pages/Families'; // Import the Families component
import Feedbacks from './pages/Feedbacks'; // Import the Feedbacks component
import Tutorships from './pages/Tutorships';  // Import the Tutorships component
import Reports from './pages/Reports'; // Import the Reports component
import SystemManagement from './pages/SystemManagement'; // Import the System Management component
import MeetingManagement from './pages/MeetingManagement'; // Import the Meeting Management component
import ActiveTutorsReport from './pages/report_pages/active_tutors_report';
import FamiliesPerLocationReport from './pages/report_pages/families_per_location_report'; // Import the Families Per Location Report component
import NewFamiliesReport from './pages/report_pages/new_families_report'; // Import the New Families Report component
import FamiliesWaitingForTutorshipReport from './pages/report_pages/families_waiting_for_tutorship_report'; // Import the Families Waiting For Tutorship Report component
import PossibleTutorshipMatchesReport from './pages/report_pages/possible_tutorship_matches_report'; // Import the Possible Tutorship Matches Report component
import FeedbackReport from './pages/report_pages/feedback_report'; // Import the unified Feedback Report component
import FamiliesTutorshipStatsReport from './pages/report_pages/families_tutorship_stats_report'; // Import the Families Tutorship Stats Report component
import RolesSpreadStatsReport from './pages/report_pages/roles_spread_stats_report'; // Import the Roles Spread Stats Report component
import AllVolunteersIRSReport from './pages/report_pages/all_volunteers_irs_report'; // Import the IRS Volunteers Report component
import AllFamiliesExportReport from './pages/report_pages/all_families_export_report'; // Import the All Families Export Report component
import FamiliesMissingDataReport from './pages/report_pages/families_missing_data_report'; // Import the Families Missing Data Report component
import FamiliesDuplicateReport from './pages/report_pages/families_duplicate_report'; // Import the Families Duplicate Report component
import Registration from './pages/Registration'; // Import the Registration component
import InitialFamilyData from './pages/InitialFamilyData'; // Import the Initial Family Data component
import TutorVolunteerMgmt from './pages/TutorVolunteerMgmt'; // Import the Tutor and Volunteer Management component
import GoogleSuccess from './pages/GoogleSuccess';
import AuditLog from './pages/AuditLog'; // Import the Audit Log component
import Dashboard from './pages/Dashboard'; // Import the Dashboard component
import ReviewerPage from './pages/ReviewerPage'; // Import the Reviewer page
import CoordinatorChat from './pages/CoordinatorChat'; // Import the Coordinator Chat component
import NotFound from './pages/NotFound'; // Import the 404 Not Found page
import Refunds from './pages/Refunds'; // Import the Expense Refunds component
import RefundsReport from './pages/report_pages/RefundsReport'; // Import the Expense Refunds Report component
import PettyCash from './pages/PettyCash'; // Import the Petty Cash component (admin-only, desktop-only)
import OngoingExpenses from './pages/OngoingExpenses'; // Import the Ongoing Expenses component (admin-only, desktop-only)
import FinancialAid from './pages/FinancialAid'; // Import the Financial Aid component (admin-only, desktop-only)
import FinanceOverview from './pages/FinanceOverview'; // Import the Finance Overview component (admin-only, desktop-only)
import NotificationMessages from './pages/NotificationMessages'; // Import the Notification Messages management page

// Add this route to your router:

/*import these routes respectively to .pages
    get_families_per_location_report: { name: 'דוח משפחות לפי מיקום', path: '/reports/families_per_location_report' },
    new_families_report: { name: 'דוח משפחות חדשות', path: '/reports/new-families-report' },
    families_waiting_for_tutorship_report: { name: 'דוח משפחות הממתינות לחונכות', path: '/reports/families_waiting_for_tutorship_report' },
    active_tutors_report: { name: 'דוח חונכים פעילים', path: '/reports/active_tutors_report' },
    possible_tutorship_matches_report: { name: 'דוח התאמות חניך חונך אפשריות', path: '/reports/possible_tutorship_matches_report' },
    volunteer_feedback_report: { name: 'דוח משובים', path: '/reports/feedback' },
*/

/*
 Add these when ready to implement the components

*/
const App = () => {
  const location = useLocation();
  // Don't show the bell on login / registration / google-success (unauthenticated pages)
  const NO_BELL_PATHS = ['/', '/register', '/google-success'];
  const showBell = !NO_BELL_PATHS.includes(location.pathname);

  return (
    <>
      {showBell && <NotificationBell />}
      <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/families" element={<Families />} />
      <Route path="/feedbacks" element={<Feedbacks />} />
      <Route path="/tutorships" element={<Tutorships />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/system-management" element={<SystemManagement />} />
      <Route path="/reports/families_per_location_report" element={<FamiliesPerLocationReport />} /> {/* Add Families Per Location Report route */}
      <Route path="/reports/new-families-report" element={<NewFamiliesReport />} /> {/* Add New Families Report route */}
      <Route path="/reports/families_waiting_for_tutorship_report" element={<FamiliesWaitingForTutorshipReport />} /> {/* Add Families Waiting For Tutorship Report route */}
      <Route path="/reports/active_tutors_report" element={<ActiveTutorsReport />} /> {/* Add Active Tutors Report route */}
      <Route path="/reports/possible_tutorship_matches_report" element={<PossibleTutorshipMatchesReport />} /> {/* Add Possible Tutorship Matches Report route */}
      <Route path="/reports/feedback" element={<FeedbackReport />} /> {/* Add unified Feedback Report route */}
      <Route path="/reports/families_tutorship_stats_report" element={<FamiliesTutorshipStatsReport />} /> {/* Add Families Tutorship Stats Report route */}
      <Route path="/reports/roles_spread_stats_report" element={<RolesSpreadStatsReport />} /> {/* Add Roles Spread Stats Report route */}
      <Route path="/reports/all_volunteers_irs_report" element={<AllVolunteersIRSReport />} /> {/* Add IRS Volunteers Report route */}
      <Route path="/reports/all_families_export_report" element={<AllFamiliesExportReport />} /> {/* Add All Families Export Report route */}
      <Route path="/reports/families_missing_data_report" element={<FamiliesMissingDataReport />} /> {/* Add Families Missing Data Report route */}
      <Route path="/reports/families_duplicate_report" element={<FamiliesDuplicateReport />} /> {/* Add Families Duplicate Report route */}
      <Route path="/initial-family-data" element={<InitialFamilyData />} /> {/* Add Initial Family Data route */}
      <Route path="/tutor-volunteer-mgmt" element={<TutorVolunteerMgmt />} /> {/* Add Tutor and Volunteer Management route */}
      <Route path="/register" element={<Registration />} />
      <Route path="/google-success" element={<GoogleSuccess />} />
      <Route path="/audit-log" element={<AuditLog />} /> {/* Add Audit Log route */}
      <Route path="/reviewer" element={<ReviewerPage />} /> {/* Add Reviewer page route */}
      <Route path="/meeting-management" element={<MeetingManagement />} /> {/* Staff meeting management */}
      <Route path="/coordinator-chat" element={<CoordinatorChat />} /> {/* Coordinator messaging interface */}
      <Route path="/refunds" element={<Refunds />} /> {/* Expense Refunds (החזרי הוצאות) */}
      <Route path="/reports/refunds-report" element={<RefundsReport />} /> {/* Expense Refunds Report */}
      <Route path="/petty-cash" element={<PettyCash />} /> {/* Petty Cash (קופה קטנה) - admin-only, desktop-only */}
      <Route path="/ongoing-expenses" element={<OngoingExpenses />} /> {/* Ongoing Expenses (הוצאות שוטפות) - admin-only, desktop-only */}
      <Route path="/financial-aid" element={<FinancialAid />} /> {/* Financial Aid (סיוע כספי) - admin-only, desktop-only */}
      <Route path="/finance-overview" element={<FinanceOverview />} /> {/* Finance Overview (סקירה כללית) - admin-only, desktop-only */}
      <Route path="/notification-messages" element={<NotificationMessages />} /> {/* Notification Center management */}
      <Route path="*" element={<NotFound />} /> {/* 404 catch-all */}
    </Routes>
    </>
  );
};

export default App;
