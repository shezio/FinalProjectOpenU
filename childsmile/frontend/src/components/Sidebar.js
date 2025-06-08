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

  return (
    <div className="sidebar">
      {hasPermissionToTasks && (
        <button
          data-path="/tasks"
          className={location.pathname.startsWith('/tasks') ? 'active' : ''}
          onClick={() => navigate('/tasks')}
        >
          לוח משימות
        </button>
      )}
      {hasPermissionToFamilies && ( 
        <button
          data-path="/families"
          className={location.pathname.startsWith('/families') ? 'active' : ''}
          onClick={() => navigate('/families')}
        >
          משפחות
        </button>
      )}
      {hasPermissionToFeedbacks && (
        <button
          data-path="/feedbacks"
          className={location.pathname.startsWith('/feedbacks') ? 'active' : ''}
          onClick={() => navigate('/feedbacks')}
        >
          משובים
        </button>
      )}
      {hasPermissionToTutorships && (
        <button
          data-path="/tutorships"
          className={location.pathname.startsWith('/tutorships') ? 'active' : ''}
          onClick={() => navigate('/tutorships')}
        >
          חונכות
        </button>
      )}
      {hasPermissionToAnyReport && (
        <button
          data-path="/reports"
          className={location.pathname.startsWith('/reports') ? 'active' : ''}
          onClick={() => navigate('/reports')}
        >
          דוחות
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/system-management"
          className={location.pathname.startsWith('/system-management') ? 'active' : ''}
          onClick={() => navigate('/system-management')}
        >
          ניהול מערכת
        </button>
      )}
    </div>
  );
};

export default Sidebar;