import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasViewPermissionForTable, hasCreatePermissionForTable, hasViewPermissionForReports, hasDeletePermissionForTable, isGuestUser } from './utils'; // Import utility functions for fetching data
import { useTranslation } from 'react-i18next';
import axios from '../axiosConfig';
import '../styles/common.css';

const isProd = !window.location.hostname.includes('localhost');

const goTo = (path) => {
  window.location.href = isProd ? `/#${path}` : path;
};


const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get user info
  const username = localStorage.getItem("username") || "אורח";
  const origUsername = localStorage.getItem("origUsername") || "";
  const staff = JSON.parse(localStorage.getItem("staff") || "[]");
  const currentStaff = staff.find(s => s.username === origUsername);
  const roles = currentStaff?.roles || [];

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time and date in Israeli format
  const formatTime = (date) => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post("/api/logout/");
      if (response.status !== 200) {
        console.error("Logout failed with status:", response.status);
      }
    } catch (error) {
      console.error("Logout exception:", error);
    } finally {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  // If guest user, show everything
  const isGuest = isGuestUser();
  
  // Check if user has only tutor or volunteer role
  const isOnlyTutorOrVolunteer = roles && roles.length === 1 && (roles[0] === 'General Volunteer' || roles[0] === 'Tutor');
  const isOnlyReviewer = roles && roles.length === 1 && roles[0] === 'Reviewer';

  const hasPermissionToTasks = !isOnlyReviewer && (isGuest || hasViewPermissionForTable('tasks'));
  const hasPermissionToFamilies = !isOnlyReviewer && !isOnlyTutorOrVolunteer && (isGuest || hasViewPermissionForTable('children'));
  const hasPermissionToFeedbacks = !isOnlyReviewer && (isGuest || hasViewPermissionForTable('general_v_feedback') || hasViewPermissionForTable('tutor_feedback'));
  const hasPermissionToTutorships = !isOnlyReviewer && (isGuest || hasViewPermissionForTable('tutorships'));
  const hasPermissionToSystemManagement = !isOnlyReviewer && (isGuest || hasDeletePermissionForTable('staff'));
  const hasPermissionToAnyReport = !isOnlyReviewer && !isOnlyTutorOrVolunteer && (isGuest || hasViewPermissionForReports());
  const hasPermissionToTutorVolunteerMgmt = !isOnlyReviewer && !isOnlyTutorOrVolunteer && (isGuest || hasViewPermissionForTable('tutors') || hasViewPermissionForTable('volunteers'));

  // Reviewer page: accessible to System Administrator, any Coordinator role, or Reviewer role
  const hasPermissionToReviewer = isGuest || roles.some(r =>
    r === 'System Administrator' ||
    r === 'Reviewer' ||
    (typeof r === 'string' && r.includes('Coordinator'))
  );

  useEffect(() => {
    // Update body class for layout adjustment
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Collapse Toggle Button */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isCollapsed ? '◀' : '▶'}
      </button>

      {/* User Info Section */}
      <div className="sidebar-user-info">
        <div className="sidebar-username">
          {isCollapsed ? username.charAt(0) : username.replace(/_/g, ' ')}
        </div>
        {!isCollapsed && roles.length > 0 && (
          <div className="sidebar-roles">
            {roles.map((role, idx) => (
              <div key={idx} className="sidebar-role">{t(role)}</div>
            ))}
          </div>
        )}
      </div>

      {/* Clock Section */}
      <div className="sidebar-clock">
        <div className="sidebar-time">{isCollapsed ? formatTime(currentTime).split(':')[0] + ':' + formatTime(currentTime).split(':')[1] : formatTime(currentTime)}</div>
        {!isCollapsed && <div className="sidebar-date">{formatDate(currentTime)}</div>}
      </div>

      {/* Logout Button */}
      <button className="sidebar-logout-button" onClick={handleLogout}>
        {isCollapsed ? '🚪' : 'יציאה מהמערכת'}
      </button>

      {/* Navigation Divider */}
      <div className="sidebar-divider"></div>

      {/* Navigation Buttons */}
      {hasPermissionToTasks && (
        <button
          data-path="/tasks"
          className={location.pathname.startsWith('/tasks') ? 'active' : ''}
          onClick={() => goTo('/tasks')}
          title={t('Tasks')}
        >
          {isCollapsed ? '📋' : 'לוח משימות'}
        </button>
      )}
      {hasPermissionToFamilies && ( 
        <button
          data-path="/families"
          className={location.pathname.startsWith('/families') ? 'active' : ''}
          onClick={() => goTo('/families')  }
          title={t('Families')}
        >
          {isCollapsed ? '🏘️' : 'משפחות'}
        </button>
      )}
      {/* Tutor and Volunteer Management  */}
      {hasPermissionToTutorVolunteerMgmt && (
        <button
          data-path="/tutor-volunteer-mgmt"
          className={location.pathname.startsWith('/tutor-volunteer-mgmt') ? 'active' : ''}
          onClick={() => goTo('/tutor-volunteer-mgmt')}
          title={t('Tutor and Volunteer Management')}
        >
          {isCollapsed ? '👥' : 'ניהול חונכים ומתנדבים'}
        </button>
      )}
      {hasPermissionToTutorships && (
        <button
          data-path="/tutorships"
          className={location.pathname.startsWith('/tutorships') ? 'active' : ''}
          onClick={() => goTo('/tutorships')}
          title={t('Tutorships')}
        >
          {isCollapsed ? '🤝' : 'חונכות'}
        </button>
      )}
      {/* End Tutor and Volunteer Management  */}
      {hasPermissionToFeedbacks && (
        <button
          data-path="/feedbacks"
          className={location.pathname.startsWith('/feedbacks') ? 'active' : ''}
          onClick={() => goTo('/feedbacks')}
          title={t('Feedbacks')}
        >
          {isCollapsed ? '💬' : 'משובים'}
        </button>
      )}
      {hasPermissionToAnyReport && (
        <button
          data-path="/reports"
          className={location.pathname.startsWith('/reports') ? 'active' : ''}
          onClick={() => goTo('/reports')}
          title={t('Reports')}
        >
          {isCollapsed ? '📊' : 'דוחות'}
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/system-management"
          className={location.pathname.startsWith('/system-management') ? 'active' : ''}
          onClick={() => goTo('/system-management')}
          title={t('System Management')}
        >
          {isCollapsed ? '⚙️' : 'ניהול מערכת'}
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/meeting-management"
          className={location.pathname.startsWith('/meeting-management') ? 'active' : ''}
          onClick={() => goTo('/meeting-management')}
          title={t('Meeting Management')}
        >
          {isCollapsed ? '📅' : 'ניהול פגישות'}
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/coordinator-chat"
          className={location.pathname.startsWith('/coordinator-chat') ? 'active' : ''}
          onClick={() => goTo('/coordinator-chat')}
          title={t('Team Updates')}
        >
          {isCollapsed ? '📨' : t('Team Updates')}
        </button>
      )}
      {hasPermissionToReviewer && (
        <button
          data-path="/reviewer"
          className={location.pathname.startsWith('/reviewer') ? 'active' : ''}
          onClick={() => goTo('/reviewer')}
          title={t('Review Calls')}
        >
          {isCollapsed ? '🔍' : 'שיחות ביקורת'}
        </button>
      )}
    </div>
  );
};

export default Sidebar;