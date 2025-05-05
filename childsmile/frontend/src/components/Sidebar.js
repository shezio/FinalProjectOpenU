import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/common.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Detects page changes

  return (
    <div className="sidebar">
      <button
        data-path="/tasks"
        className={location.pathname.startsWith('/tasks') ? 'active' : ''}
        onClick={() => navigate('/tasks')}
      >
        לוח משימות
      </button>
      <button
        data-path="/families"
        className={location.pathname.startsWith('/families') ? 'active' : ''}
        onClick={() => navigate('/families')}
      >
        משפחות
      </button>
      <button
        data-path="/volunteers"
        className={location.pathname.startsWith('/volunteers') ? 'active' : ''}
        onClick={() => navigate('/volunteers')}
      >
        מתנדבים
      </button>
      <button
        data-path="/tutorships"
        className={location.pathname.startsWith('/tutorships') ? 'active' : ''}
        onClick={() => navigate('/tutorships')}
      >
        חונכות
      </button>
      <button
        data-path="/reports"
        className={location.pathname.startsWith('/reports') ? 'active' : ''}
        onClick={() => navigate('/reports')}
      >
        דוחות
      </button>
      <button
        data-path="/system-management"
        className={location.pathname.startsWith('/system-management') ? 'active' : ''}
        onClick={() => navigate('/system-management')}
      >
        ניהול מערכת
      </button>
    </div>
  );
};

export default Sidebar;