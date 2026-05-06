import React from 'react';
import notFoundImage from '../assets/404page.png';
import '../styles/notfound.css';

const NotFound = () => (
  <div className="notfound-fullscreen">
    <img src={notFoundImage} alt="404" className="notfound-fullscreen-img" />
  </div>
);

export default NotFound;
