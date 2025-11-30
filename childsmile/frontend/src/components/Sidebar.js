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
  
  const hasPermissionToTasks = isGuest || hasViewPermissionForTable('tasks');
  const hasPermissionToFamilies = isGuest || hasViewPermissionForTable('children');
  const hasPermissionToFeedbacks = isGuest || hasViewPermissionForTable('general_v_feedback') || hasViewPermissionForTable('tutor_feedback');
  const hasPermissionToTutorships = isGuest || hasViewPermissionForTable('tutorships');
  const hasPermissionToSystemManagement = isGuest || hasDeletePermissionForTable('staff');
  const hasPermissionToAnyReport = isGuest || hasViewPermissionForReports();
  const hasPermissionToTutorVolunteerMgmt = isGuest || hasViewPermissionForTable('tutors') || hasViewPermissionForTable('volunteers');

  return (
    <div className="sidebar">
      {/* User Info Section */}
      <div className="sidebar-user-info">
        <div className="sidebar-username">
          {username.replace(/_/g, ' ')}
        </div>
        {roles.length > 0 && (
          <div className="sidebar-roles">
            {roles.map((role, idx) => (
              <div key={idx} className="sidebar-role">{t(role)}</div>
            ))}
          </div>
        )}
      </div>

      {/* Clock Section */}
      <div className="sidebar-clock">
        <div className="sidebar-time">{formatTime(currentTime)}</div>
        <div className="sidebar-date">{formatDate(currentTime)}</div>
      </div>

      {/* Logout Button */}
      <button className="sidebar-logout-button" onClick={handleLogout}>
        יציאה מהמערכת
      </button>

      {/* Navigation Divider */}
      <div className="sidebar-divider"></div>

      {/* Navigation Buttons */}
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