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
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // Validate input
    if (!trimmedUsername || !trimmedPassword) {
      setError(t('Please enter both username and password.'));
      return;
    }
    // if we have spaces in the username, replace them with '_'
    if (trimmedUsername.includes(' ') || trimmedPassword.includes(' ')) {
      setError(t('Username and password cannot contain spaces.'));
      return;
    }

    try {
      const response = await axios.post('/api/login/', { username: trimmedUsername, password: trimmedPassword });
      console.log('Login successful:', response.data);
      setSuccess(t(response.data.message));
      setError('');
      // store the usernname in local storage without the '_' - replace with space
      localStorage.setItem('username', trimmedUsername.replace(/_/g, ' '));
      localStorage.setItem('origUsername', trimmedUsername); // Store the original username

      // Fetch permissions after successful login
      const permissionsResponse = await axios.get('/api/permissions/');
      console.log('Permissions:', permissionsResponse.data);
      localStorage.setItem('permissions', JSON.stringify(permissionsResponse.data.permissions));

      // Fetch staff options
      const staffResponse = await axios.get('/api/staff/');
      console.log('Staff options:', staffResponse.data);
      const staffs = (staffResponse.data.staff || []).map(s => ({
        id: s.id,
        username: s.username,
        roles: s.roles || [],
      }));
      localStorage.setItem('staff', JSON.stringify(staffs));      // Navigate to tasks page
      navigate('/tasks');

    } catch (err) {
      console.error('Login error:', err);
      setError(t(err.response?.data?.error || 'An error occurred. Please try again.'));
      setSuccess('');
    }
  };

  /* default zoom level for the page */
  return (
    <div className="login-main-content">
      <Header />
      {/* <div className="login-container"> */}
      <span className="amit-title">{t("Amit's Smile")}</span>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder={t("שם משתמש")}
          value={username} // Trim whitespace from username
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
        {error && <p className="login-error">{error}</p>}
        {success && <p className="login-success">{success}</p>}
      </form>
    </div>
    // </div>
  );
};

export default Login;