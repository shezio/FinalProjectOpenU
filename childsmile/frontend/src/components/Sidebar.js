import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasViewPermissionForTable, hasCreatePermissionForTable, hasViewPermissionForReports, hasDeletePermissionForTable } from './utils'; // Import utility functions for fetching data
import '../styles/common.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const hasPermissionToTasks = hasViewPermissionForTable('tasks');
  const hasPermissionToFamilies = hasViewPermissionForTable('children');
  const hasPermissionToFeedbacks = hasViewPermissionForTable('general_v_feedback') || hasViewPermissionForTable('tutor_feedback');
  const hasPermissionToTutorships = hasViewPermissionForTable('tutorships');
  const hasPermissionToSystemManagement = hasDeletePermissionForTable('staff');
  const hasPermissionToAnyReport = hasViewPermissionForReports();
  const hasPermissionToTutorVolunteerMgmt = hasViewPermissionForTable('tutors') || hasViewPermissionForTable('volunteers');

  return (
    <div className="sidebar">
      {hasPermissionToTasks && (
        <button
          data-path="/tasks"
          className={location.pathname.startsWith('/tasks') ? 'active' : ''}
          onClick={() => window.location.href = '/tasks'}
        >
          לוח משימות
        </button>
      )}
      {hasPermissionToFamilies && ( 
        <button
          data-path="/families"
          className={location.pathname.startsWith('/families') ? 'active' : ''}
          onClick={() => window.location.href = '/families'}
        >
          משפחות
        </button>
      )}
      {/* Tutor and Volunteer Management  */}
      {hasPermissionToTutorVolunteerMgmt && (
        <button
          data-path="/tutor-volunteer-mgmt"
          className={location.pathname.startsWith('/tutor-volunteer-mgmt') ? 'active' : ''}
          onClick={() => window.location.href = '/tutor-volunteer-mgmt'}
        >
          ניהול חונכים ומתנדבים
        </button>
      )}
      {/* End Tutor and Volunteer Management  */}
      {hasPermissionToFeedbacks && (
        <button
          data-path="/feedbacks"
          className={location.pathname.startsWith('/feedbacks') ? 'active' : ''}
          onClick={() => window.location.href = '/feedbacks'}
        >
          משובים
        </button>
      )}
      {hasPermissionToTutorships && (
        <button
          data-path="/tutorships"
          className={location.pathname.startsWith('/tutorships') ? 'active' : ''}
          onClick={() => window.location.href = '/tutorships'}
        >
          חונכות
        </button>
      )}
      {hasPermissionToAnyReport && (
        <button
          data-path="/reports"
          className={location.pathname.startsWith('/reports') ? 'active' : ''}
          onClick={() => window.location.href = '/reports'}
        >
          דוחות
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/system-management"
          className={location.pathname.startsWith('/system-management') ? 'active' : ''}
          onClick={() => window.location.href = '/system-management'}
        >
          ניהול מערכת
        </button>
      )}
    </div>
  );
};

export default Sidebar;