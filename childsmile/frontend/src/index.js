/* Index.js*/
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App'; // Import the App component
import './i18n'; // Import i18n configuration
import './styles.css';
import { BrowserRouter as Router } from 'react-router-dom';

ReactDOM.render(
  <Router>
    <App />
  </Router>,
  document.getElementById('root')
);