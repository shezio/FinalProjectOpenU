import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Tasks from './pages/Tasks'; // Import the Tasks component
import Families from './pages/Families'; // Import the Families component
import Volunteers from './pages/Volunteers'; // Import the Volunteers component
import Tutorships from './pages/Tutorships';  // Import the Tutorships component
import Reports from './pages/Reports'; // Import the Reports component
import SystemManagement from './pages/SystemManagement'; // Import the System Management component

/*
 Add these when ready to implement the components

*/
const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/families" element={<Families />} />
      <Route path="/families" element={<Families />} />
      <Route path="/volunteers" element={<Volunteers />} />
      <Route path="/tutorships" element={<Tutorships />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/system-management" element={<SystemManagement />} />
    </Routes>
  );
};

export default App;
