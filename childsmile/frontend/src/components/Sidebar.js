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

  // ── Mobile bottom nav + More drawer ───────────────────────────
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    // Clean up any previous render
    ['mobile-bottom-nav', 'mobile-more-drawer', 'mobile-more-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    const currentPath = window.location.pathname || window.location.hash.replace('#', '');

    // All nav items with permission checks — same as desktop sidebar
    const allNavItems = [
      hasPermissionToTasks            && { path: '/tasks',              icon: '📋', label: 'לוח משימות' },
      hasPermissionToFamilies          && { path: '/families',           icon: '🏘️', label: 'משפחות' },
      hasPermissionToTutorVolunteerMgmt && { path: '/tutor-volunteer-mgmt', icon: '👥', label: 'חונכים ומתנדבים' },
      hasPermissionToTutorships        && { path: '/tutorships',         icon: '🤝', label: 'חונכות' },
      hasPermissionToFeedbacks         && { path: '/feedbacks',          icon: '💬', label: 'משובים' },
      hasPermissionToAnyReport         && { path: '/reports',            icon: '📊', label: 'דוחות' },
      hasPermissionToSystemManagement  && { path: '/system-management',  icon: '⚙️', label: 'ניהול מערכת' },
      hasPermissionToSystemManagement  && { path: '/meeting-management', icon: '📅', label: 'ניהול פגישות' },
      hasPermissionToSystemManagement  && { path: '/coordinator-chat',   icon: '📨', label: 'עדכוני צוות' },
      hasPermissionToReviewer          && { path: '/reviewer',           icon: '🔍', label: 'שיחות ביקורת' },
    ].filter(Boolean);

    // ── Bottom nav bar (scrollable, all items) ─────────────────
    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';

    allNavItems.forEach(({ path, icon, label }) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-label">${label}</span>`;
      btn.dataset.path = path;
      if (currentPath.startsWith(path)) btn.classList.add('active');
      btn.onclick = () => goTo(path);
      nav.appendChild(btn);
    });

    // Logout button at the end
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'nav-logout-btn';
    logoutBtn.innerHTML = `<span class="nav-icon">🚪</span><span class="nav-label">יציאה</span>`;
    logoutBtn.onclick = async () => {
      try {
        await axios.post("/api/logout/");
      } catch (e) { /* ignore */ } finally {
        localStorage.clear();
        window.location.href = "/";
      }
    };
    nav.appendChild(logoutBtn);

    document.body.appendChild(nav);

    // Update active button when route changes (hash router or history router)
    const updateActive = () => {
      const path = window.location.pathname || window.location.hash.replace('#', '');
      nav.querySelectorAll('button[data-path]').forEach(btn => {
        btn.classList.toggle('active', path.startsWith(btn.dataset.path));
      });
    };
    window.addEventListener('popstate', updateActive);
    window.addEventListener('hashchange', updateActive);

    return () => {
      const el = document.getElementById('mobile-bottom-nav');
      if (el) el.remove();
      window.removeEventListener('popstate', updateActive);
      window.removeEventListener('hashchange', updateActive);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Collapse Toggle Button */}
      <button className="sidebar-toggle" onClick={toggleSidebar} title={isCollapsed ? 'הרחב סרגל' : 'צמצם סרגל'}>
        {isCollapsed ? '◀' : '▶'}
      </button>

      {/* User Info Section */}
      <div className="sidebar-user-info" title={isCollapsed ? username.replace(/_/g, ' ') : ''}>
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
      <div className="sidebar-clock" title={isCollapsed ? formatDate(currentTime) : ''}>
        <div className="sidebar-time">{isCollapsed ? formatTime(currentTime).split(':')[0] + ':' + formatTime(currentTime).split(':')[1] : formatTime(currentTime)}</div>
        {!isCollapsed && <div className="sidebar-date">{formatDate(currentTime)}</div>}
      </div>

      {/* Logout Button */}
      <button className="sidebar-logout-button" onClick={handleLogout} title="יציאה מהמערכת">
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
          title="לוח משימות"
        >
          {isCollapsed ? '📋' : 'לוח משימות'}
        </button>
      )}
      {hasPermissionToFamilies && ( 
        <button
          data-path="/families"
          className={location.pathname.startsWith('/families') ? 'active' : ''}
          onClick={() => goTo('/families')  }
          title="משפחות"
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
          title="ניהול חונכים ומתנדבים"
        >
          {isCollapsed ? '👥' : 'ניהול חונכים ומתנדבים'}
        </button>
      )}
      {hasPermissionToTutorships && (
        <button
          data-path="/tutorships"
          className={location.pathname.startsWith('/tutorships') ? 'active' : ''}
          onClick={() => goTo('/tutorships')}
          title="חונכות"
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
          title="משובים"
        >
          {isCollapsed ? '💬' : 'משובים'}
        </button>
      )}
      {hasPermissionToAnyReport && (
        <button
          data-path="/reports"
          className={location.pathname.startsWith('/reports') ? 'active' : ''}
          onClick={() => goTo('/reports')}
          title="דוחות"
        >
          {isCollapsed ? '📊' : 'דוחות'}
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/system-management"
          className={location.pathname.startsWith('/system-management') ? 'active' : ''}
          onClick={() => goTo('/system-management')}
          title="ניהול מערכת"
        >
          {isCollapsed ? '⚙️' : 'ניהול מערכת'}
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/meeting-management"
          className={location.pathname.startsWith('/meeting-management') ? 'active' : ''}
          onClick={() => goTo('/meeting-management')}
          title="ניהול פגישות"
        >
          {isCollapsed ? '📅' : 'ניהול פגישות'}
        </button>
      )}
      {hasPermissionToSystemManagement && (
        <button
          data-path="/coordinator-chat"
          className={location.pathname.startsWith('/coordinator-chat') ? 'active' : ''}
          onClick={() => goTo('/coordinator-chat')}
          title="עדכוני צוות"
        >
          {isCollapsed ? '📨' : t('Team Updates')}
        </button>
      )}
      {hasPermissionToReviewer && (
        <button
          data-path="/reviewer"
          className={location.pathname.startsWith('/reviewer') ? 'active' : ''}
          onClick={() => goTo('/reviewer')}
          title="שיחות ביקורת"
        >
          {isCollapsed ? '🔍' : 'שיחות ביקורת'}
        </button>
      )}
    </div>
  );
};

export default Sidebar;