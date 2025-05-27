import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Tasks from './pages/Tasks'; // Import the Tasks component
import Families from './pages/Families'; // Import the Families component
import Feedbacks from './pages/Feedbacks'; // Import the Feedbacks component
import Tutorships from './pages/Tutorships';  // Import the Tutorships component
import Reports from './pages/Reports'; // Import the Reports component
import SystemManagement from './pages/SystemManagement'; // Import the System Management component
import ActiveTutorsReport from './pages/report_pages/active_tutors_report';
import FamiliesPerLocationReport from './pages/report_pages/families_per_location_report'; // Import the Families Per Location Report component
import NewFamiliesReport from './pages/report_pages/new_families_report'; // Import the New Families Report component
import FamiliesWaitingForTutorshipReport from './pages/report_pages/families_waiting_for_tutorship_report'; // Import the Families Waiting For Tutorship Report component
import PossibleTutorshipMatchesReport from './pages/report_pages/possible_tutorship_matches_report'; // Import the Possible Tutorship Matches Report component
import VolunteerFeedbackReport from './pages/report_pages/volunteer_feedback_report'; // Import the Volunteer Feedback Report component
import TutorFeedbackReport from './pages/report_pages/tutor_feedback_report'; // Import the Tutor Feedback Report component
import FamiliesTutorshipStatsReport from './pages/report_pages/families_tutorship_stats_report'; // Import the Families Tutorship Stats Report component
import PendingTutorsStatsReport from './pages/report_pages/pending_tutors_stats_report'; // Import the Pending Tutors Stats Report component
import RolesSpreadStatsReport from './pages/report_pages/roles_spread_stats_report'; // Import the Roles Spread Stats Report component
import Registration from './pages/Registration'; // Import the Registration component
import VolunteerFeedbacks from './pages/VolunteerFeedbacks'; // Import the Volunteer Feedbacks component
import TutorFeedbacks from './pages/TutorFeedbacks'; // Import the Tutor Feedbacks component
import InitialFamilyData from './pages/InitialFamilyData'; // Import the Initial Family Data component

/*import these routes respectively to .pages
    get_families_per_location_report: { name: 'דוח משפחות לפי מיקום', path: '/reports/families_per_location_report' },
    new_families_report: { name: 'דוח משפחות חדשות', path: '/reports/new-families-report' },
    families_waiting_for_tutorship_report: { name: 'דוח משפחות הממתינות לחונכות', path: '/reports/families_waiting_for_tutorship_report' },
    active_tutors_report: { name: 'דוח חונכים פעילים', path: '/reports/active_tutors_report' },
    possible_tutorship_matches_report: { name: 'דוח התאמות חניך חונך אפשריות', path: '/reports/possible_tutorship_matches_report' },
    volunteer_feedback_report: { name: 'דוח משוב מתנדבים', path: '/reports/volunteer-feedback' },
    tutor_feedback_report: { name: 'דוח משוב חונכים', path: '/reports/tutor-feedback' },
*/

/*
 Add these when ready to implement the components

*/
const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
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
      <Route path="/reports/volunteer-feedback" element={<VolunteerFeedbackReport />} /> {/* Add Volunteer Feedback Report route */}
      <Route path="/reports/tutor-feedback" element={<TutorFeedbackReport />} /> {/* Add Tutor Feedback Report route */}
      <Route path="/reports/families_tutorship_stats_report" element={<FamiliesTutorshipStatsReport />} /> {/* Add Families Tutorship Stats Report route */}
      <Route path="/reports/pending_tutors_stats_report" element={<PendingTutorsStatsReport />} /> {/* Add Pending Tutors Stats Report route */}
      <Route path="/reports/roles_spread_stats_report" element={<RolesSpreadStatsReport />} /> {/* Add Roles Spread Stats Report route */}
      <Route path="/feedbacks/VolunteerFeedbacks" element={<VolunteerFeedbacks />} /> {/* Add Volunteer Feedbacks route */}
      <Route path="/feedbacks/TutorFeedbacks" element={<TutorFeedbacks />} /> {/* Add Tutor Feedbacks route */}
      <Route path="/initial-family-data" element={<InitialFamilyData />} /> {/* Add Initial Family Data route */}
      <Route path="/register" element={<Registration />} />
    </Routes>
  );
};

export default App;
