import React from 'react';
import { useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <div className="sidebar">
      <button onClick={() => navigate('/tasks')}>משימות</button>
      <button onClick={() => navigate('/families')}>משפחות</button>
      <button onClick={() => navigate('/volunteers')}>מתנדבים</button>
      <button onClick={() => navigate('/tutorships')}>חונכות</button>
      <button onClick={() => navigate('/reports')}>הפקת דוחות</button>
      <button onClick={() => navigate('/system-management')}>ניהול מערכת</button>
    </div>
  );
};

export default Sidebar;