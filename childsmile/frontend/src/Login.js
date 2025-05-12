import React, { useState } from 'react';
import axios from './axiosConfig';  // Import the configured Axios instance
import Header from './Header';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';  // Use useNavigate instead of useHistory

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    console.log('Username:', username);
    console.log('Password:', password);

    try {
      const response = await axios.post('/api/login/', { username, password });
      console.log('Login successful:', response.data);
      setSuccess(t(response.data.message));
      setError('');
      // store the usernname in local storage without the '_' - replace with space
      localStorage.setItem('username', username.replace(/_/g, ' '));
      localStorage.setItem('origUsername', username); // Store the original username

      // Fetch permissions after successful login
      const permissionsResponse = await axios.get('/api/permissions/');
      console.log('Permissions:', permissionsResponse.data);
      localStorage.setItem('permissions', JSON.stringify(permissionsResponse.data.permissions));

      // Navigate to tasks page
      navigate('/tasks');

    } catch (err) {
      console.error('Login error:', err);
      setError(t(err.response?.data?.error || 'An error occurred. Please try again.'));
      setSuccess('');
    }
  };

  /* default zoom level for the page */
  document.body.style.zoom = "125%"; // Set browser zoom to 125%
  return (
    <div className="login-main-content">
      <Header />
      <div className="login-container">
        {/* <svg width="600" height="200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <path
              id="smilePath"
              d="M 100 80 Q 400 250 600 60"
              fill="transparent"
            />
          </defs>
          <text fontSize="72" fill="#1da821" fontFamily="Rubik" fontWeight="bold" letterSpacing={5}>
            <textPath
              href="#smilePath"
              startOffset="50%"
              textAnchor="middle"
              direction="rtl"
            >
              {t("Amit's Smile")}
            </textPath>
          </text>
        </svg> */}
        <span className="amit-title">{t("Amit's Smile")}</span>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder={t("שם משתמש")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("סיסמה")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">{t("התחבר")}</button>
          <span>{t("או")}</span>
          <button type="button" onClick={() => navigate("/register")}>
            {t("הירשם")}
          </button>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;