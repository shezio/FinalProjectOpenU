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
  const [email, setEmail] = useState(''); // New state for email input
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
      localStorage.setItem('staff', JSON.stringify(staffs));
      // Navigate to tasks page
      navigate('/tasks');

    } catch (err) {
      console.error('Login error:', err);
      setError(t(err.response?.data?.error || 'An error occurred. Please try again.'));
      setSuccess('');
    }
  };

  const handleGoogleLogin = () => {
    // Use window.location.href because we're going to an external Django URL
    // navigate() only works for internal React routes
    window.location.href = 'http://localhost:8000/accounts/google/login/';
  };

  /* default zoom level for the page */
  return (
    <div className="login-main-content">
      <Header />
      {/* <div className="login-container"> */}
      <span className="amit-title">{t("Amit's Smile")}</span>
      <form onSubmit={handleLogin}>
        {/* <input
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
        /> */}
        {/* Input email field - to send TOTP */}
        <input
          type="text"
          placeholder={t("Please enter your email address")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="login-buttons">
        <button type="submit">{t("Login with an email account")}</button>
        <button type="submit" onClick={handleGoogleLogin} className="google-btn" style={{ fontSize: '30px' }}>
        <svg className="google-icon" viewBox="0 0 24 24" width="40" height="40">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>{t("Login with a Google account")}
        </button>
        </div>
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