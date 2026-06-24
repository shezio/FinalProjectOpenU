import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasViewPermissionForTable, hasCreatePermissionForTable, hasViewPermissionForReports, hasDeletePermissionForTable, isGuestUser } from './utils';
import { useTranslation } from 'react-i18next';
import axios from '../axiosConfig';
import '../styles/common.css';

const isProd = process.env.NODE_ENV === 'production';

const goTo = (path) => {
  window.location.href = isProd ? `/#${path}` : path;
};

// ── Section header helper — defined OUTSIDE Sidebar to prevent remounting on every render ──
const SectionHeader = ({ sectionKey, icon, label, isCollapsed, isSectionOpen, toggleSection }) => (
  <button
    className="sidebar-section-header"
    onClick={() => !isCollapsed && toggleSection(sectionKey)}
    title={isCollapsed ? label : ''}
  >
    {isCollapsed
      ? <span className="sidebar-section-icon">{icon}</span>
      : (
        <>
          <span className="sidebar-section-label">{label}</span>
          <span className={`sidebar-section-arrow ${isSectionOpen(sectionKey) ? 'open' : ''}`}>›</span>
        </>
      )
    }
  </button>
);

// ── Nav button helper — defined OUTSIDE Sidebar to prevent remounting on every render ──
const NavBtn = ({ path, icon, label, isCollapsed, currentPath, className = '' }) => (
  <button
    data-path={path}
    className={`sidebar-nav-btn ${currentPath.startsWith(path) ? 'active' : ''} ${className}`}
    onClick={() => goTo(path)}
    title={label}
  >
    {isCollapsed
      ? <span className="sidebar-nav-icon">{icon}</span>
      : <span className="sidebar-nav-label">{label}</span>
    }
  </button>
);

const Sidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  // ── Section open/close state ──────────────────────────────────
  const [openSections, setOpenSections] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebarSections') || '{}');
    } catch { return {}; }
  });

  const toggleSection = (key) => {
    setOpenSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('sidebarSections', JSON.stringify(next));
      return next;
    });
  };

  const isSectionOpen = (key) => openSections[key] === true; // default closed

  // Get user info
  const username = localStorage.getItem("username") || "אורח";
  const origUsername = localStorage.getItem("origUsername") || "";
  const staff = JSON.parse(localStorage.getItem("staff") || "[]");
  const currentStaff = staff.find(s => s.username === origUsername);
  const roles = currentStaff?.roles || [];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleLogout = async () => {
    try { await axios.post("/api/logout/"); } catch (e) { console.error("Logout exception:", e); } finally {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const isGuest = isGuestUser();
  const isAdmin = roles.includes('System Administrator');
  const isTutor = roles.includes('Tutor');
  const isGeneralVolunteer = roles.includes('General Volunteer');
  const isReviewer = roles.includes('Reviewer');
  const isCoordinator = roles.some(r => typeof r === 'string' && r.includes('Coordinator'));
  // "only tutor/volunteer" = has tutor or volunteer role but NO coordinator/admin/reviewer
  const isOnlyTutorOrVolunteer = (isTutor || isGeneralVolunteer) && !isAdmin && !isCoordinator && !isReviewer;
  // "only reviewer" = has reviewer role but NO coordinator/admin
  const isOnlyReviewer = isReviewer && !isAdmin && !isCoordinator;

  // ── Permissions ───────────────────────────────────────────────
  const hasPermissionToTasks           = !isOnlyReviewer && (isGuest || hasViewPermissionForTable('tasks'));
  const hasPermissionToFamilies        = !isOnlyReviewer && !isOnlyTutorOrVolunteer && (isGuest || hasViewPermissionForTable('children'));
  const hasPermissionToTutorships      = !isOnlyReviewer && (isGuest || hasViewPermissionForTable('tutorships'));
  const hasPermissionToTutorVolunteerMgmt = !isOnlyReviewer && !isOnlyTutorOrVolunteer && (isGuest || hasViewPermissionForTable('tutors') || hasViewPermissionForTable('volunteers'));
  const hasPermissionToFeedbacks       = !isOnlyReviewer && (isGuest || hasViewPermissionForTable('general_v_feedback') || hasViewPermissionForTable('tutor_feedback'));
  const hasPermissionToRefunds         = isGuest || hasViewPermissionForTable('expenserefund');
  const hasPermissionToAnyReport       = !isOnlyReviewer && !isOnlyTutorOrVolunteer && (isGuest || hasViewPermissionForReports());
  const hasPermissionToSystemManagement = !isOnlyReviewer && (isGuest || hasDeletePermissionForTable('staff'));
  const hasPermissionToAuditLog        = !isOnlyReviewer && (isGuest || hasDeletePermissionForTable('staff'));
  const hasPermissionToReviewer        = isGuest || isAdmin || isReviewer || isCoordinator;

  // Section visibility
  const hasFamiliesSection   = hasPermissionToFamilies || hasPermissionToTutorships;
  const hasVolunteersSection  = hasPermissionToTutorVolunteerMgmt || hasPermissionToFeedbacks;
  const hasManagementSection  = hasPermissionToRefunds || hasPermissionToAnyReport || hasPermissionToSystemManagement || hasPermissionToReviewer || hasPermissionToAuditLog;

  useEffect(() => {
    if (isCollapsed) document.body.classList.add('sidebar-collapsed');
    else document.body.classList.remove('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  // ── Mobile bottom nav (unchanged) ────────────────────────────
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    ['mobile-bottom-nav', 'mobile-more-drawer', 'mobile-more-overlay'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    const currentPath = window.location.pathname || window.location.hash.replace('#', '');
    const allNavItems = [
      hasPermissionToTasks             && { path: '/tasks',              icon: '📋', label: 'לוח משימות' },
      hasPermissionToFamilies          && { path: '/families',           icon: '🏘️', label: 'משפחות' },
      hasPermissionToTutorVolunteerMgmt && { path: '/tutor-volunteer-mgmt', icon: '👥', label: 'חונכים ומתנדבים' },
      hasPermissionToTutorships        && { path: '/tutorships',         icon: '🤝', label: 'חונכות' },
      hasPermissionToFeedbacks         && { path: '/feedbacks',          icon: '💬', label: 'משובים' },
      hasPermissionToRefunds           && { path: '/refunds',            icon: '💰', label: 'החזרי הוצאות' },
      // Reports page intentionally omitted from the MOBILE bottom nav (kept in desktop sidebar).
      hasPermissionToSystemManagement  && { path: '/system-management',  icon: '⚙️', label: 'ניהול מערכת' },
      hasPermissionToSystemManagement  && { path: '/meeting-management', icon: '📅', label: 'ניהול פגישות' },
      hasPermissionToSystemManagement  && { path: '/coordinator-chat',   icon: '📨', label: 'עדכוני צוות' },
      hasPermissionToReviewer          && { path: '/reviewer',           icon: '🔍', label: 'שיחות ביקורת' },
      isAdmin                          && { path: '/notification-messages', icon: '🔔', label: 'מרכז העדכונים' },
    ].filter(Boolean);
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
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'nav-logout-btn';
    logoutBtn.innerHTML = `<span class="nav-icon">🚪</span><span class="nav-label">יציאה</span>`;
    logoutBtn.onclick = async () => {
      try { await axios.post("/api/logout/"); } catch (e) { /* ignore */ } finally {
        localStorage.clear(); window.location.href = "/";
      }
    };
    nav.appendChild(logoutBtn);
    document.body.appendChild(nav);
    // Scroll active button into view on initial load
    const initialActive = nav.querySelector('button.active');
    if (initialActive) {
      requestAnimationFrame(() => {
        initialActive.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'instant' });
      });
    }
    const updateActive = () => {
      const path = window.location.pathname || window.location.hash.replace('#', '');
      nav.querySelectorAll('button[data-path]').forEach(btn => {
        btn.classList.toggle('active', path.startsWith(btn.dataset.path));
      });
      // Keep the active button visible without snapping back to start
      const activeBtn = nav.querySelector('button.active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'instant' });
      }
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

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  // Props shared with helper components
  const sectionProps = { isCollapsed, isSectionOpen, toggleSection };
  const currentPath = location.pathname;
  const navProps = { isCollapsed, currentPath };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Collapse Toggle */}
      <button className="sidebar-toggle" onClick={toggleSidebar} title={isCollapsed ? 'הרחב סרגל' : 'צמצם סרגל'}>
        {isCollapsed ? '◀' : '▶'}
      </button>

      {/* User Info */}
      <div className="sidebar-user-info" title={isCollapsed ? username.replace(/_/g, ' ') : ''}>
        <div className="sidebar-username">
          {isCollapsed ? username.charAt(0) : username.replace(/_/g, ' ')}
        </div>
        {!isCollapsed && roles.length > 0 && (
          <div className="sidebar-roles">
            {roles.map((role, idx) => <div key={idx} className="sidebar-role">{t(role)}</div>)}
          </div>
        )}
      </div>

      {/* Clock */}
      <div className="sidebar-clock" title={isCollapsed ? formatDate(currentTime) : ''}>
        <div className="sidebar-time">{isCollapsed ? formatTime(currentTime).slice(0,5) : formatTime(currentTime)}</div>
        {!isCollapsed && <div className="sidebar-date">{formatDate(currentTime)}</div>}
      </div>

      {/* Logout */}
      <button className="sidebar-logout-button" onClick={handleLogout} title="יציאה מהמערכת">
        {isCollapsed ? '🚪' : 'יציאה מהמערכת'}
      </button>

      <div className="sidebar-divider"></div>

      {/* ── Nav sections ─────────────────────────────────── */}

        {/* ── TASKS ─────────────────────────────────────────── */}
        {hasPermissionToTasks && (
          <NavBtn path="/tasks" icon="📋" label="לוח משימות" className="top-level" {...navProps} />
        )}

        {/* ── FAMILIES section ──────────────────────────────── */}
        {hasFamiliesSection && (
          <>
            <SectionHeader sectionKey="families" icon="🏘️" label="משפחות" {...sectionProps} />
            {isSectionOpen('families') && !isCollapsed && (
              <div className="sidebar-section-items">
                {hasPermissionToFamilies && (
                  <NavBtn path="/families" icon="👨‍👩‍👧" label="משפחות" {...navProps} />
                )}
                {hasPermissionToTutorships && (
                  <NavBtn path="/tutorships" icon="🤝" label="חונכות" {...navProps} />
                )}
              </div>
            )}
            {isCollapsed && (
              <>
                {hasPermissionToFamilies && <NavBtn path="/families" icon="👨‍👩‍👧" label="משפחות" {...navProps} />}
                {hasPermissionToTutorships && <NavBtn path="/tutorships" icon="🤝" label="חונכות" {...navProps} />}
              </>
            )}
          </>
        )}

        {/* ── VOLUNTEERS section ────────────────────────────── */}
        {hasVolunteersSection && (
          <>
            <SectionHeader sectionKey="volunteers" icon="👥" label="מתנדבים" {...sectionProps} />
            {isSectionOpen('volunteers') && !isCollapsed && (
              <div className="sidebar-section-items">
                {hasPermissionToTutorVolunteerMgmt && (
                  <NavBtn path="/tutor-volunteer-mgmt" icon="👤" label="ניהול חונכים ומתנדבים" {...navProps} />
                )}
                {hasPermissionToFeedbacks && (
                  <NavBtn path="/feedbacks" icon="💬" label="משובים" {...navProps} />
                )}
              </div>
            )}
            {isCollapsed && (
              <>
                {hasPermissionToTutorVolunteerMgmt && <NavBtn path="/tutor-volunteer-mgmt" icon="👤" label="ניהול חונכים ומתנדבים" {...navProps} />}
                {hasPermissionToFeedbacks && <NavBtn path="/feedbacks" icon="💬" label="משובים" {...navProps} />}
              </>
            )}
          </>
        )}

        {/* ── MANAGEMENT section ────────────────────────────── */}
        {hasManagementSection && (
          <>
            <SectionHeader sectionKey="management" icon="⚙️" label="ניהול" {...sectionProps} />
            {isSectionOpen('management') && !isCollapsed && (
              <div className="sidebar-section-items">
                {hasPermissionToRefunds && (
                  <NavBtn path="/refunds" icon="💰" label="החזרי הוצאות" {...navProps} />
                )}
                {hasPermissionToAnyReport && (
                  <NavBtn path="/reports" icon="📊" label="דוחות" {...navProps} />
                )}
                {hasPermissionToSystemManagement && (
                  <NavBtn path="/system-management" icon="🛠️" label="ניהול מערכת" {...navProps} />
                )}
                {hasPermissionToSystemManagement && (
                  <NavBtn path="/meeting-management" icon="📅" label="ניהול פגישות" {...navProps} />
                )}
                {hasPermissionToSystemManagement && (
                  <NavBtn path="/coordinator-chat" icon="📨" label={t('Team Updates')} {...navProps} />
                )}
                {hasPermissionToAuditLog && (
                  <NavBtn path="/audit-log" icon="📜" label="יומן ביקורת" {...navProps} />
                )}
                {isAdmin && (
                  <NavBtn path="/notification-messages" icon="🔔" label="מרכז העדכונים" {...navProps} />
                )}
                {hasPermissionToReviewer && (
                  <NavBtn path="/reviewer" icon="🔍" label="שיחות ביקורת" {...navProps} />
                )}
              </div>
            )}
            {isCollapsed && (
              <>
                {hasPermissionToRefunds && <NavBtn path="/refunds" icon="💰" label="החזרי הוצאות" {...navProps} />}
                {hasPermissionToAnyReport && <NavBtn path="/reports" icon="📊" label="דוחות" {...navProps} />}
                {hasPermissionToSystemManagement && <NavBtn path="/system-management" icon="🛠️" label="ניהול מערכת" {...navProps} />}
                {hasPermissionToSystemManagement && <NavBtn path="/meeting-management" icon="📅" label="ניהול פגישות" {...navProps} />}
                {hasPermissionToSystemManagement && <NavBtn path="/coordinator-chat" icon="📨" label={t('Team Updates')} {...navProps} />}
                {hasPermissionToAuditLog && <NavBtn path="/audit-log" icon="📜" label="יומן ביקורת" {...navProps} />}
                {isAdmin && <NavBtn path="/notification-messages" icon="🔔" label="מרכז העדכונים" {...navProps} />}
                {hasPermissionToReviewer && <NavBtn path="/reviewer" icon="🔍" label="שיחות ביקורת" {...navProps} />}
              </>
            )}
          </>
        )}

    </div>
  );
};

export default Sidebar;