import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/common.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Detects page changes

  React.useEffect(() => {
    const buttons = document.querySelectorAll('.sidebar button');

    buttons.forEach((button) => {
      button.addEventListener('click', function () {
        buttons.forEach((btn) => btn.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // Highlight the active page button based on route
    buttons.forEach((button) => {
      if (button.dataset.path === location.pathname) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });

    return () => {
      // Cleanup event listeners to prevent duplicates
      buttons.forEach((button) => {
        button.replaceWith(button.cloneNode(true));
      });
    };
  }, [location.pathname]); // Runs when the route changes

  return (
    <div className="sidebar">
      <button data-path="/tasks" onClick={() => navigate('/tasks')}>לוח משימות</button>
      <button data-path="/families" onClick={() => navigate('/families')}>משפחות</button>
      <button data-path="/volunteers" onClick={() => navigate('/volunteers')}>מתנדבים</button>
      <button data-path="/tutorships" onClick={() => navigate('/tutorships')}>חונכות</button>
      <button data-path="/reports" onClick={() => navigate('/reports')}>דוחות</button>
      <button data-path="/system-management" onClick={() => navigate('/system-management')}>ניהול מערכת</button>
    </div>
  );
};

export default Sidebar;