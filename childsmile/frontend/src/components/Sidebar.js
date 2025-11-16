import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasViewPermissionForTable, hasCreatePermissionForTable, hasViewPermissionForReports, hasDeletePermissionForTable, isGuestUser } from './utils'; // Import utility functions for fetching data
import '../styles/common.css';

const isProd = !window.location.hostname.includes('localhost');

const goTo = (path) => {
  window.location.href = isProd ? `/#${path}` : path;
};


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
        <button
          data-path="/tasks"
          className={location.pathname.startsWith('/tasks') ? 'active' : ''}
          onClick={() => goTo('/tasks')}
        >
          לוח משימות
        </button>
      )}
      {hasPermissionToFamilies && ( 
        <button
          data-path="/families"
          className={location.pathname.startsWith('/families') ? 'active' : ''}
          onClick={() => goTo('/families')  }
        >
          משפחות
        </button>
      )}
      {/* Tutor and Volunteer Management  */}
      {hasPermissionToTutorVolunteerMgmt && (
        <button
          data-path="/tutor-volunteer-mgmt"
          className={location.pathname.startsWith('/tutor-volunteer-mgmt') ? 'active' : ''}
          onClick={() => goTo('/tutor-volunteer-mgmt')}
        >
          ניהול חונכים ומתנדבים
        </button>
      )}
      {/* End Tutor and Volunteer Management  */}
      {hasPermissionToFeedbacks && (
        <button
          data-path="/feedbacks"
          className={location.pathname.startsWith('/feedbacks') ? 'active' : ''}
          onClick={() => goTo('/feedbacks')}
        >
          משובים
        </button>
      )}
      {hasPermissionToTutorships && (
        <button
          data-path="/tutorships"
          className={location.pathname.startsWith('/tutorships') ? 'active' : ''}
          onClick={() => goTo('/tutorships')}
        >
          חונכות
        </button>
      )}
      {hasPermissionToAnyReport && (
        <button
          data-path="/reports"
          className={location.pathname.startsWith('/reports') ? 'active' : ''}
          onClick={() => goTo('/reports')}
        >
          דוחות
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/system-management"
          className={location.pathname.startsWith('/system-management') ? 'active' : ''}
          onClick={() => goTo('/system-management')}
        >
          ניהול מערכת
        </button>
      )}
    </div>
  );
};

export default Sidebar;