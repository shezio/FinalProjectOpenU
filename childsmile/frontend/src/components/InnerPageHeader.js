import React from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";
import "../styles/innerpageheader.css";
import logo from "../assets/logo.png";
import amitImg from "../assets/amit.jpg";
import qrCode from "../assets/qr-code.png";
import { useTranslation } from "react-i18next";

// use title prop to set the title of the page
const InnerPageHeader = ({ title }) => {
  const { t } = useTranslation();
  const username = localStorage.getItem("username") || "אורח";
  const origUsername = localStorage.getItem("origUsername") || "";
  const staff = JSON.parse(localStorage.getItem("staff") || "[]");
  const currentStaff = staff.find(s => s.username === origUsername);
  const roles = currentStaff?.roles || [];
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      console.log("Sending logout request...");  // Debugging log
      const response = await axios.post("/api/logout/");
      console.log("Logout response:", response);  // Debugging log
      if (response.status === 200) {
        localStorage.clear();  // Clear all local storage
        navigate("/");
      } else {
        console.error("Logout 5555 failed", response.data);
      }
    } catch (error) {
      console.error("Logout 6666 failed", error);
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
          <h1 className="title">{title}</h1>
        </div>
      </div>

      {/* שלום משתמש וכפתור יציאה – מתחת להדר */}
      <div className="user-actions">
        <div className="welcome">
          שלום, <br />
          {username}
          {roles.length > 0 && (
            <div className="user-roles-list">
              {roles.map((role, idx) => (
                <div key={idx} className="user-role">{t(role)}</div>
              ))}
            </div>
          )}
        </div>
        <button className="logout-button" onClick={handleLogout}>
          יציאה
        </button>
      </div>
    </>
  );
};

export default InnerPageHeader;