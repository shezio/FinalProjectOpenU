/* Index.js*/
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App'; // Import the App component
import './i18n'; // Import i18n configuration
import './styles.css';
import { BrowserRouter, HashRouter } from 'react-router-dom';
//import { HashRouter as Router } from 'react-router-dom'; // Use HashRouter for better compatibility

const isProd = window.location.hostname !== 'localhost';

ReactDOM.render(isProd ? (
  <HashRouter>
    <App />
  </HashRouter>
) : (
  <BrowserRouter>
    <App />
  </BrowserRouter>
),
  document.getElementById('root')
);