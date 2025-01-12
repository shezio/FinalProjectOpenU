// src/components/Login.js
import React from 'react';
import '../styles.css'; // Ensure to create a CSS file for RTL and styling

const Login = () => {
  return (
    <div className="login-container">
      <header className="login-header">
        <img src="/assets/logo.png" alt="NPO Logo" className="npo-logo" />
      </header>
      <main className="login-main">
        <img src="/assets/cousin-picture.jpg" alt="Hero" className="hero-image" />
        <form className="login-form">
          <label htmlFor="username">שם משתמש</label>
          <input type="text" id="username" name="username" />
          <label htmlFor="password">סיסמה</label>
          <input type="password" id="password" name="password" />
          <button type="submit">התחבר</button>
        </form>
        <p className="motto">
            "הרבה אנשים אומרים שהם רוצים להצליח אבל לא כולם מוכנים לשלם את המחיר שצריך כדי להצליח
        </p>
      </main>
      <footer className="login-footer">
        <img src="/assets/qr-code.png" alt="QR Code" className="qr-code" />
      </footer>
    </div>
  );
};

export default Login;