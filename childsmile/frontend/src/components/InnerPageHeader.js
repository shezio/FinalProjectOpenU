import React from "react";
import "../styles/innerpageheader.css";
import logo from "../assets/logo.png";
import amitImg from "../assets/amit.jpg";
import qrCode from "../assets/qr-code.jpg";

// use title prop to set the title of the page
const InnerPageHeader = ({ title }) => {

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
          <a
            className="qr-code-link"
            href="https://www.instagram.com/remember.amit.bunzel?igsh=YjFxNDBtaWNxMDdt"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="עמוד ההנצחה של עמית בונצל באינסטגרם"
          >
            <img src={qrCode} alt="QR Code" className="qr-code" />
          </a>
        </div>

        {/* צד ימין – הלוגו והכותרת יחד */}
        <div className="right-header">
          <img src={logo} alt="חיוך של ילד" className="logo" />
          <h1 className="title">{title}</h1>
        </div>
      </div>
    </>
  );
};

export default InnerPageHeader;