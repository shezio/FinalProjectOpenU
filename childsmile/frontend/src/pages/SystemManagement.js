/* dummy page just for navigate to families page */
import React from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';

const SystemManagement = () => {
  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="ניהול מערכת" />
      <div className="page-content">
        <p>כאן יופיע תוכן עבור דף ניהול מערכת</p>
      </div>
    </div>
  );
};

export default SystemManagement;