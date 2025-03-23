/* dummy page just for navigate to families page */
import React from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';

const Families = () => {
  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="משפחות" />
      <div className="page-content">
        <p>כאן יופיע תוכן עבור דף משפחות</p>
      </div>
    </div>
  );
};

export default Families;