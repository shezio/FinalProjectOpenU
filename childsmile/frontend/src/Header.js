import React from 'react';
import logo from '../public/assets/logo.png';
import AmitPic from '../public/assets/amit.jpg';
import QRCode from '../public/assets/qr-code.jpg';

const Header = () => (
  <div>
    <div className="top-left">
      <img src={AmitPic} alt="Amit" className="amit" />
      <div className="quote">
        הרבה אנשים אומרים שהם רוצים להצליח
        <br />
        אבל לא כולם מוכנים לשלם את המחיר שצריך כדי להצליח
      </div>
      <a
        className="qr-code-link"
        href="https://www.instagram.com/remember.amit.bunzel?igsh=YjFxNDBtaWNxMDdt"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="עמוד ההנצחה של עמית בונצל באינסטגרם"
      >
        <img src={QRCode} alt="QR Code" className="qr-code" />
      </a>
    </div>
    <div className="header">
      <img src={logo} alt="חיוך של ילד" />
    </div>
  </div>
);

export default Header;