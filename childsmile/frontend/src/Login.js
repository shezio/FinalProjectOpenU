import React, { useState } from 'react';
import axios from './axiosConfig';  // Import the configured Axios instance
import Header from './Header';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';  // Use useNavigate instead of useHistory

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();  // Use useNavigate instead of useHistory
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');  // State variable for success message
  const [permissions, setPermissions] = useState([]);  // State variable for permissions

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Form submitted');  // Debugging log
    console.log('Username:', username);  // Debugging log
    console.log('Password:', password);  // Debugging log
    try {
      const response = await axios.post('/api/login/', { username, password });
      console.log('Response:', response);  // Debugging log
      setSuccess(t(response.data.message));  // Set success message
      setError('');  // Clear error message

      // Fetch permissions after successful login
      const permissionsResponse = await axios.get('/api/permissions/');
      setPermissions(permissionsResponse.data.permissions);
      console.log('Permissions:', permissionsResponse.data.permissions);  // Debugging log

      // Redirect based on permissions (if needed in the future)
      // if (permissionsResponse.data.permissions.some(p => p.resource === 'dashboard' && p.action === 'VIEW')) {
      //   navigate('/dashboard');
      // } else if (permissionsResponse.data.permissions.some(p => p.resource === 'profile' && p.action === 'VIEW')) {
      //   navigate('/profile');
      // } else {
      //   navigate('/default');
      // }
    } catch (err) {
      console.log('Error:', err);  // Debugging log
      if (err.response && err.response.data && err.response.data.error) {
        setError(t(err.response.data.error));
        setSuccess('');  // Clear success message
      } else {
        setError(t('An error occurred. Please try again.'));
        setSuccess('');  // Clear success message
      }
    }
  };

  return (
    <div className="main-content">
      <Header />
      <div className="login-container">
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder={t("שם משתמש")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t("סיסמה")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">{t("כניסה")}</button>
          <span>{t("או")}</span>
          <button type="button">{t("הירשם")}</button>
          <button className="google-login">{t("התחבר עם חשבון גוגל")}</button>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}  {/* Display success message */}
        </form>
      </div>
    </div>
  );
};

export default Login;