import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
// import Dashboard from './Dashboard'; // Example component
// import Profile from './Profile'; // Example component
// import DefaultPage from './DefaultPage'; // Example component

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      {/* <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/default" element={<DefaultPage />} /> */}
    </Routes>
  );
};

export default App;