import React from 'react';
import logo from '../public/assets/logo.png';
import AmitPic from '../public/assets/amit.jpg';
import QRCode from '../public/assets/qr-code.png';

const Header = () => (
  <div>
    <div className="top-left">
      <img src={AmitPic} alt="Amit" className="amit" />
      <div className="quote">
        הרבה אנשים אומרים שהם רוצים להצליח
        <br />
        אבל לא כולם מוכנים לשלם את המחיר שצריך כדי להצליח
      </div>
      <img src={QRCode} alt="QR Code" className="qr-code" />
    </div>
    <div className="header">
      <img src={logo} alt="חיוך של ילד" />
      <h1>חיוך של ילד</h1>
    </div>
  </div>
);

export default Header;