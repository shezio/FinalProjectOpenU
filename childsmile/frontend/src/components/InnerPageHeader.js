import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/innerpageheader.css";
import logo from "../assets/logo.png";
import amitImg from "../assets/amit.jpg";
import qrCode from "../assets/qr-code.png";

const InnerPageHeader = () => {
  const username = localStorage.getItem("username") || "אורח";
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post("/api/logout/");
      localStorage.removeItem("username");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <>
      {/* פס ירוק עליון */}
      <div className="header">
        {/* צד שמאל – תמונת עמית, הציטוט, וה-QR Code */}
        <div className="top-left">
          <img src={amitImg} alt="Amit" className="amit-img" />
          <div className="quote">
            הרבה אנשים אומרים שהם רוצים להצליח אבל לא כולם מוכנים לשלם את המחיר  
            <br />
            שצריך כדי להצליח
          </div>
          <img src={qrCode} alt="QR Code" className="qr-code" />
        </div>

        {/* צד ימין – הלוגו והכותרת יחד */}
        <div className="right-header">
          <img src={logo} alt="חיוך של ילד" className="logo" />
          <h1 className="title">חיוך של ילד</h1>
        </div>
      </div>

      {/* שלום משתמש וכפתור יציאה – מתחת להדר */}
      <div className="user-actions">
        <div className="welcome">שלום, {username}</div>
        <button className="logout-button" onClick={handleLogout}>
          יציאה
        </button>
      </div>
    </>
  );
};

export default InnerPageHeader;
