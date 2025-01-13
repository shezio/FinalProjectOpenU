import React from 'react';
// import logo,amit,qr-code from '../public/assets';
import logo from '../public/assets/logo.png';
import amit from '../public/assets/amit.jpg';
import qrCode from '../public/assets/qr-code.png';

const Login = () => {
  return (
    <div className="login-container">
      <img src={logo} alt="Logo" className="logo" />
      <form className="login-form">
        <input type="text" placeholder="שם משתמש" />
        <input type="password" placeholder="סיסמה" />
        <button type="submit">התחבר</button>
      </form>
      <div className="top-left">
        <img src={amit} alt="Amit" />
        <p>
            הרבה אנשים אומרים שהם רוצים להצליח
            <br />
            אבל לא כולם מוכנים לשלם את המחיר שצריך כדי להצליח
        </p>
        <img src={qrCode} alt="QR Code" />
      </div>
    </div>
  );
};

export default Login; // Ensure this line is present