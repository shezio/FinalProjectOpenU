/* dummy page just for navigate to families page */
import React from 'react';
import Sidebar from '../components/Sidebar';
import InnerPageHeader from '../components/InnerPageHeader';
import '../styles/common.css';

const Feedbacks = () => {
  return (
    <div className="main-content">
      <Sidebar />
      <InnerPageHeader title="משובים" />
      <div className="page-content">
        <p>כאן יופיע תוכן עבור דף משובים</p>
      </div>
    </div>
  );
};

export default Feedbacks;