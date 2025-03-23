/* dummy page just for navigate to families page */
import React from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';

const Volunteers = () => {
  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="מתנדבים" />
      <div className="page-content">
        <p>כאן יופיע תוכן עבור דף מתנדבים</p>
      </div>
    </div>
  );
};

export default Volunteers;