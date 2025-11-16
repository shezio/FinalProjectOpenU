import React from 'react';
import { useNavigate, useLocation ,NavLink} from 'react-router-dom';
import { hasViewPermissionForTable, hasCreatePermissionForTable, hasViewPermissionForReports, hasDeletePermissionForTable, isGuestUser } from './utils'; // Import utility functions for fetching data
import '../styles/common.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // If guest user, show everything
  const isGuest = isGuestUser();
  
  const hasPermissionToTasks = isGuest || hasViewPermissionForTable('tasks');
  const hasPermissionToFamilies = isGuest || hasViewPermissionForTable('children');
  const hasPermissionToFeedbacks = isGuest || hasViewPermissionForTable('general_v_feedback') || hasViewPermissionForTable('tutor_feedback');
  const hasPermissionToTutorships = isGuest || hasViewPermissionForTable('tutorships');
  const hasPermissionToSystemManagement = isGuest || hasDeletePermissionForTable('staff');
  const hasPermissionToAnyReport = isGuest || hasViewPermissionForReports();
  const hasPermissionToTutorVolunteerMgmt = isGuest || hasViewPermissionForTable('tutors') || hasViewPermissionForTable('volunteers');

  return (
    <div className="sidebar">
      {hasPermissionToTasks && (
        <NavLink  to="/tasks"  className={({ isActive }) => isActive ? "active" : ""  }>לוח משימות</NavLink>
      )}
      {hasPermissionToFamilies && ( 
        <NavLink  to="/families"  className={({ isActive }) => isActive ? "active" : ""  }>משפחות</NavLink>
      )}
      {/* Tutor and Volunteer Management  */}
      {hasPermissionToTutorVolunteerMgmt && (
        <NavLink  to="/tutor-volunteer-mgmt"  className={({ isActive }) => isActive ? "active" : ""  }>ניהול חונכים ומתנדבים</NavLink>
      )}
      {/* End Tutor and Volunteer Management  */}
      {hasPermissionToFeedbacks && (
        <NavLink  to="/feedbacks"  className={({ isActive }) => isActive ? "active" : ""  }>משובים</NavLink>
      )}
      {hasPermissionToTutorships && (
        <NavLink  to="/tutorships"  className={({ isActive }) => isActive ? "active" : ""  }>חונכות</NavLink>
      )}
      {hasPermissionToAnyReport && (
        <NavLink  to="/reports"  className={({ isActive }) => isActive ? "active" : ""  }>דוחות</NavLink>
      )}
      {hasPermissionToSystemManagement && (
        <NavLink  to="/system-management"  className={({ isActive }) => isActive ? "active" : ""  }>ניהול מערכת</NavLink>
      )}
    </div>
  );
};

export default Sidebar;